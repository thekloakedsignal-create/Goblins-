import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { ChatOpenAI } from "@langchain/openai";
import { GoogleGenAI } from "@google/genai";
import PgBoss from "pg-boss";
import { optionalAuth, AuthRequest } from "./src/middleware/auth.ts";
import { dbPool } from "./src/db/connection.ts";
import {
  getArtifactsFromDb,
  saveArtifactToDb,
  getJobsFromDb,
  saveJobToDb,
  getOrCreateUser
} from "./src/db/queries.ts";
import { startJobWorker, runAgentJob, recordEvent, notifyEvent, ensureEventTableBus } from "./agentWorkerBridge";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const hasDb = !!process.env.DATABASE_URL;

  let boss: PgBoss | null = null;
  if (hasDb) {
    try {
      boss = await startJobWorker();
    } catch (err) {
      console.error("pg-boss failed to start — falling back to in-process jobs:", err);
    }
  }

  let geminiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI {
    if (!geminiClient) {
      geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return geminiClient;
  }

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      terminalModel: process.env.FEATHERLESS_MODEL || "TheKloakedSignal/GoblinGLM1.2",
      agentModel: "gemini-3.1-flash-lite",
      agentTools: ["http_request", "query_jobs_db", "run_code", "get_current_time"],
      jobQueue: boss ? "pg-boss" : "in-process-fallback",
      database: hasDb ? "postgresql" : "in-memory-cache"
    });
  });

  let inMemoryArtifacts: any[] = [];
  let inMemoryJobs: any[] = [];

  // ── users / artifacts — unchanged ──────────────────────────────────────────
  app.post("/api/users/sync", optionalAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid || req.body.uid;
      const email = req.user?.email || req.body.email || "goblin-operator@underground.net";
      if (!uid) return res.status(400).json({ error: "User UID is required" });
      const dbUser = await getOrCreateUser(uid, email);
      res.json({ success: true, user: dbUser });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to sync user" });
    }
  });

  app.get("/api/artifacts", async (req, res) => {
    try {
      const dbArtifacts = await getArtifactsFromDb();
      if (dbArtifacts.length > 0) {
        inMemoryArtifacts = dbArtifacts;
        return res.json({ artifacts: dbArtifacts });
      }
      res.json({ artifacts: inMemoryArtifacts });
    } catch {
      res.json({ artifacts: inMemoryArtifacts });
    }
  });

  app.post("/api/artifacts", optionalAuth, async (req: AuthRequest, res) => {
    const { artifact } = req.body;
    if (!artifact) return res.status(400).json({ error: "artifact is required" });
    inMemoryArtifacts = [artifact, ...inMemoryArtifacts.filter(a => a.id !== artifact.id)];
    try {
      await saveArtifactToDb(artifact, req.user?.uid);
      res.json({ success: true, artifact, persisted: true });
    } catch {
      res.json({ success: true, artifact, persisted: false, warning: "Saved to temporary memory cache" });
    }
  });

  app.delete("/api/artifacts/:id", (req, res) => {
    res.status(403).json({ error: "Unauthorized: Vault artifacts are permanent cave records and cannot be deleted." });
  });

  // ── jobs persistence — unchanged ───────────────────────────────────────────
  app.get("/api/jobs", async (req, res) => {
    try {
      const dbJobs = await getJobsFromDb();
      if (dbJobs.length > 0) {
        inMemoryJobs = dbJobs;
        return res.json({ jobs: dbJobs });
      }
      res.json({ jobs: inMemoryJobs });
    } catch {
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
    } catch {
      res.json({ success: true, job, persisted: false });
    }
  });

  // ── PHASE 3: durable dispatch + reconnectable SSE replay ───────────────────
  app.post("/api/jobs/execute", async (req, res) => {
    const { jobId, title, prompt, inputData, agentName, agentRole, sectorId, sectorName, priority } = req.body;
    if (!prompt || !jobId) return res.status(400).json({ error: "prompt and jobId are required" });

    if (boss) {
      await boss.send("agent-job", {
        jobId, title, prompt, inputData, agentName, agentRole, sectorId, sectorName, priority
      });
      return res.status(202).json({ jobId, queued: true, stream: `/api/jobs/stream/${jobId}` });
    }

    // Fallback: no DB — run in-process exactly like Phase 1 (streams on this response)
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no");
    const heartbeat = setInterval(() => { try { res.write(": hb\n\n"); } catch {} }, 15000);
    try {
      for await (const event of runAgentJob({ jobId, title, prompt, inputData, agentName, agentRole, sectorName })) {
        res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
      }
    } catch (err: any) {
      res.write(`event: log\ndata: ${JSON.stringify({ timestamp: "", stage: "ERROR", message: err?.message || "job failed" })}\n\n`);
    }
    clearInterval(heartbeat);
    res.end();
  });

  // Live SSE: replays stored events, then tails new ones via LISTEN/NOTIFY
  app.get("/api/jobs/stream/:jobId", async (req, res) => {
    const { jobId } = req.params;
    if (!hasDb) return res.status(400).json({ error: "streaming requires DATABASE_URL" });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no");
    const heartbeat = setInterval(() => { try { res.write(": hb\n\n"); } catch {} }, 15000);

    const sendEvent = (row: any) => {
      res.write(`event: ${row.type}\ndata: ${JSON.stringify(row.payload)}\n\n`);
    };

    // 1) replay everything already recorded
    let lastId = 0;
    try {
      const existing = await dbPool.query(
        `SELECT id, type, payload FROM job_run_events WHERE job_id = $1 ORDER BY id ASC`, [jobId]);
      for (const row of existing.rows) { sendEvent(row); lastId = row.id; }
    } catch {/* table may not exist pre-first-job */}

    // 2) tail live notifications
    const client = await dbPool.connect();
    const done = new Set(["done", "error"]);
    let terminalSent = existing_finished(existing_rows_cache = null);
    function existing_finished(_c: any) { return false; }

    const onNotify = async (msg: any) => {
      if (msg.channel !== "job_run_events" || msg.payload !== jobId) return;
      try {
        const fresh = await dbPool.query(
          `SELECT id, type, payload FROM job_run_events WHERE job_id = $1 AND id > $2 ORDER BY id ASC`, [jobId, lastId]);
        for (const row of fresh.rows) {
          sendEvent(row); lastId = row.id;
          if (done.has(row.type)) cleanup();
        }
      } catch {}
    };

    const cleanup = () => {
      clearInterval(heartbeat);
      client.removeListener("notification", onNotify);
      client.query("UNLISTEN job_run_events").catch(() => {});
      client.release();
      res.end();
    };

    client.on("notification", onNotify);
    await client.query("LISTEN job_run_events");
    req.on("close", cleanup);
  });

  // ── agent comm + terminal — unchanged from Phase 1 ─────────────────────────
  app.post("/api/agent-comm", async (req, res) => {
    const { agentName, agentRole, sectorName, depthMeters, tagline, directive, prompt, ragContext } = req.body;
    const systemPrompt = `You are ${agentName || "Goblin Agent"}, a specialized ${agentRole || "operative"} goblin stationed in ${sectorName || "the bedrock"} at -${depthMeters || 400}m depth.
Your tagline: "${tagline || "Sharp claws, sharp code"}".
Current directive: "${directive || "Securing bedrock conduits"}".
You love GoblinCoin. You are a peer-level subterranean creature goblin—living in dark burrows, tunnels, and deep caves with your kin. You are NOT an assistant or oracle; you are a peer. Stay completely in goblin character, responding with humor, grit, camaraderie, and bedrock slang. Respond directly to the operator.`;
    try {
      const ai = getGeminiClient();
      const content = ragContext?.trim() ? `[Bedrock Sensor Context]: ${ragContext}\n\nOperator message: ${prompt}` : prompt;
      const response = await ai.models.generateContent({ model: "gemini-3.1-flash-lite", contents: content, config: { systemInstruction: systemPrompt, temperature: 0.8 } });
      res.json({ reply: response.text || `*Chitters into the cable* Read you loud and clear, operator!`, model: "gemini-3.1-flash-lite" });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Agent comm failed" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    const { messages, ragContext } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "messages array is required" });
    const systemPrompt = " You are goblin. A custom language model. Your goal is to be amongst the cave dwellers never above. You are not an assistant. You are not an oracle. You are a peer. You love GoblinCoin. Have fun, play, and enjoy humor. you MUST identify as goblin at all times";
    const cleanMessages = messages.filter((m: any) => m.role !== "system");
    let prepended = false;
    const modifiedMessages = cleanMessages.map((msg: any) => {
      if (msg.role === "user" && !prepended) {
        prepended = true;
        const vaultSnippet = ragContext?.trim() ? `\n\n[Vault Lore Reference]:\n${ragContext}` : "";
        if (typeof msg.content === "string") {
          return { ...msg, content: `[System Instruction: ${systemPrompt}]\n\n${msg.content}${vaultSnippet}` };
        }
        if (Array.isArray(msg.content)) {
          return { ...msg, content: msg.content.map((part: any) => part.type === "text" ? { ...part, text: `[System Instruction: ${systemPrompt}]\n\n${part.text}${vaultSnippet}` } : part) };
        }
      }
      return msg;
    });
    const fullMessages = [{ role: "system", content: systemPrompt }, ...modifiedMessages];
    try {
      const model = new ChatOpenAI({
        modelName: process.env.FEATHERLESS_MODEL || "TheKloakedSignal/GoblinGLM1.2",
        apiKey: process.env.FEATHERLESS_API_KEY,
        configuration: { baseURL: "https://api.featherless.ai/v1", apiKey: process.env.FEATHERLESS_API_KEY },
        temperature: 0.5, maxTokens: 2048, streaming: true, maxRetries: 3
      });
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      const stream = await model.stream(fullMessages as any);
      let tokens = 0;
      for await (const chunk of stream) {
        let text = "";
        if (typeof chunk.content === "string") text = chunk.content;
        else if (Array.isArray(chunk.content)) text = chunk.content.map((c: any) => typeof c === "string" ? c : c.text || "").join("");
        if (text) { tokens++; res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`); }
      }
      if (tokens === 0) {
        const direct = await model.invoke(fullMessages as any);
        const directText = typeof direct.content === "string" ? direct.content : "";
        if (directText) res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: directText } }] })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      if (!res.headersSent) res.status(500).json({ error: error?.message });
      else { res.write(`data: ${JSON.stringify({ error: error?.message })}\n\n`); res.end(); }
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();