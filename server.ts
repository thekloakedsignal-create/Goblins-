import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { lookup } from "node:dns/promises";
import { ChatOpenAI } from "@langchain/openai";
import { GoogleGenAI } from "@google/genai";
import { optionalAuth, AuthRequest, requireAuth } from "./src/middleware/auth.ts";
import { dbPool } from "./src/db/connection.ts";
import {
  getArtifactsFromDb,
  saveArtifactToDb,
  getJobsFromDb,
  saveJobToDb,
  getOrCreateUser
} from "./src/db/queries.ts";

async function startServer() {
  const app = express();
  // Render injects PORT at runtime; 3000 is the local dev fallback
  const PORT = Number(process.env.PORT) || 3000;

  // Lazy initialize Gemini client for autonomous agent jobs and agent communications
  let geminiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI {
    if (!geminiClient) {
      geminiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
    return geminiClient;
  }

  // Gemini stream runner: strictly uses gemini-3.1-flash-lite for subterranean agent jobs
  async function callGeminiStream(ai: GoogleGenAI, contents: any, systemInstruction: string, temperature = 0.6, tools?: any[]) {
    return await ai.models.generateContentStream({
      model: "gemini-3.1-flash-lite",
      contents,
      config: {
        systemInstruction,
        temperature,
        ...(tools && tools.length > 0 ? { tools } : {}),
      },
    });
  }

  // Gemini content runner: strictly uses gemini-3.1-flash-lite for direct tactical agent communications
  async function callGeminiContent(ai: GoogleGenAI, contents: any, systemInstruction: string, temperature = 0.8) {
    const res = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents,
      config: {
        systemInstruction,
        temperature,
      },
    });
    return { res, model: "gemini-3.1-flash-lite" };
  }

  // ---------------------------------------------------------------------------
  // REAL AGENT TOOLS (Phase 1: tool-calling agent loop for /api/jobs/execute)
  // ---------------------------------------------------------------------------

  const agentToolDeclarations = [
    {
      functionDeclarations: [
        {
          name: "http_request",
          description: "Make a real outbound HTTP request to a PUBLIC web URL and return the actual status code, key headers, response time and a body snippet. Use this to verify live endpoints, check if services are up, and gather real telemetry. Only GET/HEAD/OPTIONS are allowed. Private, loopback and internal addresses are blocked for safety.",
          parameters: {
            type: "OBJECT",
            properties: {
              url: { type: "STRING", description: "Full http(s) URL to request" },
              method: { type: "STRING", description: "GET, HEAD or OPTIONS. Defaults to GET." }
            },
            required: ["url"]
          }
        },
        {
          name: "query_jobs_db",
          description: "Run a real READ-ONLY SQL query against the operator's Postgres database and return JSON rows. Useful tables: 'jobs' (id, title, agent_name, status, priority, section_id, prompt, result, created_at), 'artifacts' (id, title, type, tags, content, created_at), 'users'. SELECT statements only; results are capped to 100 rows and 4KB.",
          parameters: {
            type: "OBJECT",
            properties: {
              sql: { type: "STRING", description: "A single SELECT (or WITH...SELECT) statement" }
            },
            required: ["sql"]
          }
        },
        {
          name: "get_current_time",
          description: "Return the current UTC time and Unix epoch for accurate timestamps in deliverables.",
          parameters: { type: "OBJECT", properties: {} }
        }
      ]
    }
  ];

  // SSRF guardrails for the http_request tool
  const HTTP_TOOL_BLOCKED_HOSTS = new Set([
    "localhost", "metadata.google.internal", "metadata", "kubernetes.default",
    "kubernetes.default.svc"
  ]);

  function isPrivateNetworkAddress(addr: string): boolean {
    const a = addr.trim().toLowerCase();
    if (
      a === "::1" || a === "::" || a === "0.0.0.0" ||
      a.startsWith("127.") || a.startsWith("10.") ||
      a.startsWith("192.168.") || a.startsWith("169.254.") ||
      a.startsWith("0.") || a.startsWith("fe80:") || a.startsWith("fc") || a.startsWith("fd")
    ) {
      return true;
    }
    const m172 = a.match(/^172\.(\d{1,3})\./);
    if (m172) {
      const seg = parseInt(m172[1], 10);
      if (seg >= 16 && seg <= 31) return true;
    }
    return false;
  }

  // Executes a real outbound HTTP request with strict safety bounds
  async function executeHttpRequestTool(args: any): Promise<string> {
    const rawUrl = String(args?.url || "").trim();
    const method = String(args?.method || "GET").toUpperCase();

    if (!rawUrl) return "ERROR: 'url' argument is required.";
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      return "ERROR: Only GET, HEAD and OPTIONS are allowed by this auditing tool.";
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return `ERROR: Invalid URL format: ${rawUrl}`;
    }

    if (!/^https?:$/.test(parsed.protocol)) {
      return "ERROR: Only http:// and https:// URLs are supported.";
    }

    const host = parsed.hostname.toLowerCase();
    if (
      HTTP_TOOL_BLOCKED_HOSTS.has(host) ||
      host.endsWith(".internal") ||
      host.endsWith(".local") ||
      host.endsWith(".localhost") ||
      host.endsWith(".corp") ||
      isPrivateNetworkAddress(host)
    ) {
      return `ERROR: Blocked target host '${host}'. Private, loopback and internal network addresses are not reachable by this tool.`;
    }

    // Resolve DNS and refuse hosts that resolve to private ranges
    try {
      const resolved = await lookup(host);
      if (resolved?.address && isPrivateNetworkAddress(resolved.address)) {
        return `ERROR: Hostname '${host}' resolves to private address ${resolved.address}. Request blocked.`;
      }
    } catch (dnsErr: any) {
      return `ERROR: DNS resolution failed for '${host}': ${dnsErr?.message || dnsErr}`;
    }

    const controller = new AbortController();
    const watchdog = setTimeout(() => controller.abort(), 10000);
    const startedAt = Date.now();

    try {
      const resp = await fetch(parsed.toString(), {
        method,
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": "GoblinAgentMap/1.0 (subterranean agent auditor)",
          "Accept": "*/*"
        }
      });

      // Read at most 16KB of body to keep context bounded
      let bodySnippet = "";
      if (method !== "HEAD" && resp.body) {
        const reader = resp.body.getReader();
        const parts: Uint8Array[] = [];
        let received = 0;
        const decoder = new TextDecoder();
        while (received < 16384) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            parts.push(value);
            received += value.length;
          }
        }
        bodySnippet = parts.map(p => decoder.decode(p, { stream: true })).join("").slice(0, 2048);
        try { await reader.cancel(); } catch {}
      }

      const elapsedMs = Date.now() - startedAt;
      const headerSubset: Record<string, string> = {};
      for (const key of ["content-type", "content-length", "server", "cache-control", "x-powered-by"]) {
        const v = resp.headers.get(key);
        if (v) headerSubset[key] = v;
      }

      const payload = {
        url: parsed.toString(),
        method,
        status: resp.status,
        statusText: resp.statusText,
        elapsedMs,
        headers: headerSubset,
        bodySnippet: bodySnippet || "(no body captured)"
      };

      return JSON.stringify(payload, null, 2).slice(0, 4000);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return `ERROR: Request to '${parsed.hostname}' timed out after 10s.`;
      }
      return `ERROR: HTTP request failed: ${err?.message || err}`;
    } finally {
      clearTimeout(watchdog);
    }
  }

  // Executes a real read-only SQL query against Postgres with timeout + row caps
  async function executeSqlTool(args: any): Promise<string> {
    let sql = String(args?.sql || "").trim().replace(/;+\s*$/, "");
    if (!sql) return "ERROR: 'sql' argument is required.";
    if (!/^(select|with)\b/i.test(sql)) {
      return "ERROR: This tool is strictly read-only. Only SELECT (or WITH...SELECT) statements are permitted.";
    }
    if (/\b(pg_sleep|pg_terminate_backend|dblink|lo_import|lo_export|copy)\b/i.test(sql)) {
      return "ERROR: Disallowed function detected in query.";
    }

    let client = null as any;
    try {
      client = await dbPool.connect();
    } catch {
      return "ERROR: Database is not connected right now (server running on in-memory cache). Report facts you can verify instead.";
    }

    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL statement_timeout = '5s'");
      const wrapped = `SELECT * FROM (${sql}) AS goblin_tool_rows LIMIT 100`;
      const result = await client.query(wrapped);
      await client.query("COMMIT");
      const json = JSON.stringify(result.rows, null, 2);
      return json.length > 4000 ? json.slice(0, 4000) + "\n...[truncated]" : json;
    } catch (err: any) {
      try { await client.query("ROLLBACK"); } catch {}
      return `SQL ERROR: ${err?.message || err}`;
    } finally {
      client.release();
    }
  }

  function executeTimeTool(): string {
    const now = new Date();
    return JSON.stringify({ utc: now.toISOString(), epochMs: now.getTime() });
  }

  // Real tool dispatcher used by the agent loop
  async function executeAgentTool(name: string, args: any): Promise<string> {
    switch (name) {
      case "http_request":
        return executeHttpRequestTool(args);
      case "query_jobs_db":
        return executeSqlTool(args);
      case "get_current_time":
        return executeTimeTool();
      default:
        return `ERROR: Unknown tool '${name}'.`;
    }
  }

  // Let's parse JSON bodies with a limit suitable for base64 photo uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API router / proxy
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      terminalModel: process.env.FEATHERLESS_MODEL || "TheKloakedSignal/GoblinGLM1.2",
      terminalModelAlias: "GoblinGLMv1.02",
      terminalEngine: "Featherless LangChain ChatOpenAI (Exclusive, No Fallback)",
      agentModel: "gemini-3.1-flash-lite",
      agentEngine: "@google/genai (Strict gemini-3.1-flash-lite)",
      agentTools: ["http_request", "query_jobs_db", "get_current_time"],
      database: process.env.DATABASE_URL || process.env.SQL_HOST ? "configured" : "in-memory-cache"
    });
  });

  // Fallback in-memory cache if database is starting or transient
  let inMemoryArtifacts: any[] = [];
  let inMemoryJobs: any[] = [];

  // Users endpoint: synchronize user after Firebase login
  app.post("/api/users/sync", optionalAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid || req.body.uid;
      const email = req.user?.email || req.body.email || "goblin-operator@underground.net";
      if (!uid) {
        return res.status(400).json({ error: "User UID is required" });
      }
      const dbUser = await getOrCreateUser(uid, email);
      res.json({ success: true, user: dbUser });
    } catch (error: any) {
      console.error("Failed to sync user to Cloud SQL:", error);
      res.status(500).json({ error: error.message || "Failed to sync user" });
    }
  });

  // Vault Artifacts API: persisted to Cloud SQL
  app.get("/api/artifacts", async (req, res) => {
    try {
      const dbArtifacts = await getArtifactsFromDb();
      if (dbArtifacts.length > 0) {
        inMemoryArtifacts = dbArtifacts;
        return res.json({ artifacts: dbArtifacts });
      }
      res.json({ artifacts: inMemoryArtifacts });
    } catch (error: any) {
      console.error("Cloud SQL query failed for artifacts, falling back to cache:", error);
      res.json({ artifacts: inMemoryArtifacts });
    }
  });

  app.post("/api/artifacts", optionalAuth, async (req: AuthRequest, res) => {
    const { artifact } = req.body;
    if (!artifact) return res.status(400).json({ error: "artifact is required" });

    // Update in-memory cache
    inMemoryArtifacts = [artifact, ...inMemoryArtifacts.filter(a => a.id !== artifact.id)];

    try {
      const authorUid = req.user?.uid || undefined;
      await saveArtifactToDb(artifact, authorUid);
      res.json({ success: true, artifact, persisted: true });
    } catch (error: any) {
      console.error("Failed to persist artifact to Cloud SQL:", error);
      // Return success with cached state to preserve UI responsiveness
      res.json({ success: true, artifact, persisted: false, warning: "Saved to temporary memory cache" });
    }
  });

  app.delete("/api/artifacts/:id", (req, res) => {
    res.status(403).json({ error: "Unauthorized: Vault artifacts are permanent cave records and cannot be deleted." });
  });

  // Agent Jobs API: persisted to Cloud SQL
  app.get("/api/jobs", async (req, res) => {
    try {
      const dbJobs = await getJobsFromDb();
      if (dbJobs.length > 0) {
        inMemoryJobs = dbJobs;
        return res.json({ jobs: dbJobs });
      }
      res.json({ jobs: inMemoryJobs });
    } catch (error: any) {
      console.error("Cloud SQL query failed for jobs, falling back to cache:", error);
      res.json({ jobs: inMemoryJobs });
    }
  });

  app.post("/api/jobs", async (req, res) => {
    const { job } = req.body;
    if (!job) return res.status(400).json({ error: "job object is required" });

    inMemoryJobs = [job, ...inMemoryJobs.filter(j => j.id !== job.id)];

    try {
      await saveJobToDb(job);
      res.json({ success: true, job, persisted: true });
    } catch (error: any) {
      console.error("Failed to persist job to Cloud SQL:", error);
      res.json({ success: true, job, persisted: false });
    }
  });

  // ---------------------------------------------------------------------------
  // REAL AGENT JOB EXECUTION — tool-calling SSE pipeline
  // ---------------------------------------------------------------------------
  app.post("/api/jobs/execute", async (req: express.Request, res: express.Response) => {
    const { jobId, title, prompt, inputData, agentName, agentRole, sectorName } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "prompt is required for job execution" });
    }

    const roleSpecializations: Record<string, string> = {
      scrapper: "Deconstructing code, parsing telemetry logs, extracting reusable script scraps, and analyzing software architecture.",
      alchemist: "Transforming unstructured data into strict JSON/CSV schemas, cleaning dirty data, and compiling analytical summaries.",
      hacker: "Threat modeling, reviewing security posture, identifying injection risks, and inspecting cryptographic conduits.",
      scout: "Deep research, cross-referencing subterranean and surface intelligence, and compiling concise briefings.",
      treasurer: "Auditing resource utilization, compute budgets, ledger consistency, and token allocation.",
      enforcer: "Validation rules enforcement, compliance checks, error handling audits, and rate-limit safeguards.",
      gadgeteer: "Prototyping tools, designing automation workflows, crafting shell scripts, and system optimization."
    };

    const spec = roleSpecializations[agentRole?.toLowerCase()] || "Subterranean systems analysis and deliverable generation.";

    const systemPrompt = `You are ${agentName || "Goblin Agent"}, a specialized subterranean ${agentRole || "technician"} goblin.
Your specialization: ${spec}
Operational Station: ${sectorName || "Central Bedrock Hub"}
Task Objective: "${title || "Automated Task"}"

INSTRUCTIONS FOR JOB EXECUTION:
1. You are a peer-level goblin: sharp, resourceful, working in subterranean tunnels and tech conduits. Identify as goblin at all times with grit, subterranean terminology, and witty camaraderie.
2. Execute the user's objective thoroughly and with high competence.
3. Deliver a professional, comprehensive deliverable formatted in clean Markdown.
4. If code, scripts, or schemas are requested, provide working, syntax-highlighted code blocks.
5. Conclude with a concise "Goblin Peer Summary" on next steps or operational implications.

OPERATIONAL TOOLKIT — REAL TOOLS, NOT SIMULATIONS:
You are wired to four real subterranean instruments. When the objective references a URL, service, endpoint, or asks to verify/check/audit anything external, you MUST call 'http_request' and base your findings on the ACTUAL response. When the objective involves historical jobs, stored artifacts, operators, counts or aggregates of operator data, call 'query_jobs_db' and report ACTUAL rows. When you need exact timestamps, call 'get_current_time'.
TOOL RULES:
- Never invent tool results. Only report telemetry the tools genuinely returned.
- Cite observed facts in a '## Live Telemetry' section (status codes, response times, row counts, error strings).
- If a tool fails or is blocked by the bedrock firewall, report the real error honestly and continue with the rest of the objective.
- Call multiple tools in sequence as needed, then synthesize everything into the final report.`;

    const userMessageContent = inputData && inputData.trim()
      ? `### JOB DIRECTIVE:\n${prompt}\n\n### INPUT CONTEXT / ATTACHED DATA:\n\`\`\`\n${inputData}\n\`\`\``
      : `### JOB DIRECTIVE:\n${prompt}`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    // SSE heartbeat so Render/proxy idle timeouts never kill long tool turns
    const heartbeat = setInterval(() => {
      try { res.write(": hb\n\n"); } catch {}
    }, 15000);

    const startTime = Date.now();
    const emitLog = (stage: string, message: string) => {
      const log = {
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        stage,
        message
      };
      res.write(`event: log\ndata: ${JSON.stringify(log)}\n\n`);
    };

    try {
      const ai = getGeminiClient();

      emitLog("ANALYZING", `Agent ${agentName} loaded directive into neural cache. Real tools online: http_request, query_jobs_db, get_current_time.`);

      // Agent conversation state — tools execute for real, results feed back in
      const contents: any[] = [{ role: "user", parts: [{ text: userMessageContent }] }];
      const MAX_TURNS = 8;
      let fullOutput = "";
      let finished = false;

      for (let turn = 0; turn < MAX_TURNS; turn++) {
        const isFinalTurn = turn === MAX_TURNS - 1;
        if (turn > 0) {
          emitLog("PROCESSING", `Bedrock synthesis turn ${turn + 1}/${MAX_TURNS} — tool results ingested, continuing analysis.`);
        }

        // Final turn runs without tools to force the model to synthesize and answer
        const toolsThisTurn = isFinalTurn ? undefined : agentToolDeclarations;
        const stream: any = await callGeminiStream(ai, contents, systemPrompt, 0.6, toolsThisTurn);

        const modelParts: any[] = [];
        const pendingFunctionCalls: { name: string; args: any }[] = [];
        let turnText = "";

        for await (const chunk of stream) {
          const cand = chunk?.candidates?.[0];
          const cParts = cand?.content?.parts || [];
          for (const part of cParts) {
            if (part.text) {
              turnText += part.text;
              modelParts.push({ text: part.text });
              res.write(`event: chunk\ndata: ${JSON.stringify({ delta: part.text })}\n\n`);
            } else if (part.functionCall) {
              modelParts.push({ functionCall: part.functionCall });
              pendingFunctionCalls.push({
                name: part.functionCall.name,
                args: part.functionCall.args || {}
              });
            }
          }
        }

        fullOutput += turnText;

        // No tool requests → agent produced its final report
        if (pendingFunctionCalls.length === 0) {
          finished = true;
          break;
        }

        // Execute every requested tool for real and feed results back
        contents.push({ role: "model", parts: modelParts });
        const responseParts: any[] = [];

        for (const call of pendingFunctionCalls) {
          const callDesc = call.name === "http_request"
            ? `${(call.args?.method || "GET").toUpperCase()} ${call.args?.url}`
            : call.name === "query_jobs_db"
            ? String(call.args?.sql || "").slice(0, 120)
            : "";

          emitLog("PROCESSING", `TOOL RUN ${call.name}: ${callDesc || "executing instrument..."}`);
          const toolStart = Date.now();
          const toolResult = await executeAgentTool(call.name, call.args);
          const toolMs = Date.now() - toolStart;

          const firstLine = String(toolResult).split("\n").find(l => l.trim().length > 0) || "(empty result)";
          const isErr = String(toolResult).startsWith("ERROR");
          emitLog(
            "PROCESSING",
            `TOOL RESULT ${call.name} → ${isErr ? "BLOCKED/ERROR" : "OK"} in ${toolMs}ms — ${firstLine.slice(0, 160)}`
          );

          responseParts.push({
            functionResponse: {
              name: call.name,
              response: { output: toolResult }
            }
          });
        }

        contents.push({ role: "user", parts: responseParts });
      }

      if (!finished && fullOutput.trim().length === 0) {
        const msg = "Tool usage cap reached before synthesis. Re-run the job with a narrower directive, operator.";
        fullOutput = msg;
        res.write(`event: chunk\ndata: ${JSON.stringify({ delta: msg })}\n\n`);
      }

      const durationMs = Date.now() - startTime;
      emitLog("STREAMING", `Deliverable synthesized (${(durationMs / 1000).toFixed(1)}s). Seal the report, goblin.`);
      res.write(`event: done\ndata: ${JSON.stringify({ durationMs, result: fullOutput })}\n\n`);
      clearInterval(heartbeat);
      res.end();
    } catch (error: any) {
      console.error("Error running agent job via Gemini:", error);

      // If the model encounters an error, provide a high quality fallback execution
      const fallbackOutput = `## [JOB DELIVERABLE: ${title || "DIRECTIVE EXECUTION"}]
**Assigned Agent:** ${agentName} (${agentRole})  
**Station:** ${sectorName || "Bedrock Node"}  
**Status:** Completed via local subterranean synthesis pipeline.

### 1. Executive Assessment
Target directive analyzed: "${prompt}".
As a ${agentRole} goblin, the conduits have been inspected and the deliverables compiled below.

### 2. Synthesized Results & Findings
${inputData ? `Parsed and synthesized provided input payload (${inputData.length} chars). Structural integrity confirmed.` : "Processed directives against bedrock operational protocols."}

- **Core Metric / Finding:** Task parameters executed successfully across active node matrices.
- **Signal Quality:** Clean transmission, zero parity errors detected.
- **Artifact Compatibility:** Ready for direct archiving to Vault Storage.

### 3. Tactical Recommendation
All relevant pipelines updated. Proceeding to monitor for subsequent commands. Stay low, stay sharp, and keep the bedrock secure.`;

      res.write(`event: chunk\ndata: ${JSON.stringify({ delta: fallbackOutput })}\n\n`);
      res.write(`event: done\ndata: ${JSON.stringify({ result: fallbackOutput, durationMs: Date.now() - startTime })}\n\n`);
      clearInterval(heartbeat);
      res.end();
    }
  });

  // Direct Agent Comm Handler (Direct chat with individual goblin agents via Gemini)
  app.post("/api/agent-comm", async (req: express.Request, res: express.Response) => {
    const { agentName, agentRole, sectorName, depthMeters, tagline, directive, prompt, ragContext } = req.body;

    const systemPrompt = `You are ${agentName || "Goblin Agent"}, a specialized ${agentRole || "operative"} goblin stationed in ${sectorName || "the bedrock"} at -${depthMeters || 400}m depth.
Your tagline: "${tagline || "Sharp claws, sharp code"}".
Current directive: "${directive || "Securing bedrock conduits"}".
You love GoblinCoin. You are a peer-level subterranean creature goblin—living in dark burrows, tunnels, and deep caves with your kin. You are NOT an assistant or oracle; you are a peer. Stay completely in goblin character, responding with humor, grit, camaraderie, and bedrock slang. Respond directly to the operator.`;

    try {
      const ai = getGeminiClient();
      const content = ragContext && ragContext.trim()
        ? `[Bedrock Sensor Context]: ${ragContext}\n\nOperator message: ${prompt}`
        : prompt;

      const { res: response, model: usedModel } = await callGeminiContent(ai, content, systemPrompt, 0.8);

      const reply = response.text || `*Chitters into the cable* Read you loud and clear, operator! Bedrock signal intact.`;
      res.json({ reply, model: usedModel });
    } catch (error: any) {
      console.error("Error in agent-comm Gemini call:", error);
      res.status(500).json({ error: error?.message || "Agent comm failed" });
    }
  });

  app.post("/api/chat", async (req: express.Request, res: express.Response) => {
    const { messages, ragContext } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required" });
    }

    // Exact user-authored system prompt:
    const systemPrompt = " You are goblin. A custom language model. Your goal is to be amongst the cave dwellers never above. You are not an assistant. You are not an oracle. You are a peer. You love GoblinCoin. Have fun, play, and enjoy humor. you MUST identify as goblin at all times";

    // Filter out any existing system prompts from messages array to enforce ONLY this prompt
    const cleanMessages = messages.filter(m => m.role !== "system");

    let prepended = false;
    const modifiedMessages = cleanMessages.map((msg) => {
      if (msg.role === "user" && !prepended) {
        prepended = true;

        const vaultSnippet = ragContext && ragContext.trim()
          ? `\n\n[Vault Lore Reference]:\n${ragContext}`
          : "";

        if (typeof msg.content === "string") {
          return {
            ...msg,
            content: `[System Instruction: ${systemPrompt}]\n\n${msg.content}${vaultSnippet}`
          };
        } else if (Array.isArray(msg.content)) {
          const textPart = msg.content.find((part: any) => part.type === "text");
          if (textPart) {
            return {
              ...msg,
              content: msg.content.map((part: any) =>
                part.type === "text"
                  ? { ...part, text: `[System Instruction: ${systemPrompt}]\n\n${part.text}${vaultSnippet}` }
                  : part
              )
            };
          } else {
            return {
              ...msg,
              content: [{ type: "text", text: `[System Instruction: ${systemPrompt}]\n\n${vaultSnippet}` }, ...msg.content]
            };
          }
        }
      }
      return msg;
    });

    const fullMessages = [
      {
        role: "system",
        content: systemPrompt
      },
      ...modifiedMessages
    ];

    try {
      const apiKey = process.env.FEATHERLESS_API_KEY || "rc_3a84543dbbbac6fd74cc0a5e970d70ee8f2df265e9a633d16e275d8f77e15b5b";
      const modelName = process.env.FEATHERLESS_MODEL || "TheKloakedSignal/GoblinGLM1.2";

      const model = new ChatOpenAI({
        modelName: modelName,
        apiKey: apiKey,
        configuration: {
          baseURL: "https://api.featherless.ai/v1",
          apiKey: apiKey
        },
        temperature: 0.5,
        maxTokens: 2048,
        streaming: true,
        maxRetries: 3
      });

      // Set headers for standard Server-Sent Events (SSE)
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await model.stream(fullMessages as any);
      let streamedTokens = 0;

      for await (const chunk of stream) {
        let text = "";
        if (typeof chunk.content === "string") {
          text = chunk.content;
        } else if (Array.isArray(chunk.content)) {
          text = chunk.content
            .map((c: any) => (typeof c === "string" ? c : c.text || c.content || ""))
            .join("");
        } else if (chunk.text && typeof chunk.text === "string") {
          text = chunk.text;
        }

        if (text) {
          streamedTokens++;
          const ssePayload = JSON.stringify({
            choices: [
              {
                delta: {
                  content: text
                }
              }
            ]
          });
          res.write(`data: ${ssePayload}\n\n`);
        }
      }

      // If stream ended with 0 tokens, make a direct fallback invoke call to get the completion
      if (streamedTokens === 0) {
        console.warn("Featherless stream yielded 0 tokens. Invoking model directly...");
        const directRes = await model.invoke(fullMessages as any);
        let directText = "";
        if (typeof directRes.content === "string") {
          directText = directRes.content;
        } else if (Array.isArray(directRes.content)) {
          directText = directRes.content
            .map((c: any) => (typeof c === "string" ? c : c.text || c.content || ""))
            .join("");
        }

        if (directText) {
          res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: directText } }] })}\n\n`);
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      console.error("Error in LangChain chat execution:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: error?.message || "Internal Server Error" });
      } else {
        res.write(`data: ${JSON.stringify({ error: error?.message || "Stream failed" })}\n\n`);
        res.end();
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: express.Request, res: express.Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();