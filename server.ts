import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { ChatOpenAI } from "@langchain/openai";
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
import { startJobWorker, runAgentJob, ensureEventTable } from "./src/agent/worker.ts";
import { openRouterChat, AGENT_MODELS } from "./src/agent/openRouter.ts";

async function startServer() {
  const app = express();
  // Render injects PORT at runtime; 3000 is the local dev fallback
  const PORT = Number(process.env.PORT) || 3000;
  const hasDb = !!process.env.DATABASE_URL;

  // Start the durable pg-boss worker when Postgres is configured
  let boss: PgBoss | null = null;
  if (hasDb) {
    try {
      boss = await startJobWorker();
    } catch (err) {
      console.error("pg-boss failed to start — falling back to in-process jobs:", err);
    }
  }

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // ── health ─────────────────────────────────────────────────────────────────
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      terminalModel: process.env.FEATHERLESS_MODEL || "TheKloakedSignal/GoblinGLM1.2",
      terminalEngine: "Featherless LangChain ChatOpenAI",
      agentEngine: "openrouter-free-pool",
      agentModels: AGENT_MODELS,
      agentTools: ["http_request", "query_jobs_db", "run_code", "get_current_time"],
      jobQueue: boss ? "pg-boss" : "in-process-fallback",
      codeSandbox: process.env.E2B_API_KEY ? "e2b" : "offline",
      database: hasDb ? "postgresql" : "in-memory-cache"
    });
  });

  // Fallback in-memory caches (no DB configured, or transient outage)
  let inMemoryArtifacts: any[] = [];
  let inMemoryJobs: any[] = [];

  // ── users ──────────────────────────────────────────────────────────────────
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

  // ── vault artifacts ────────────────────────────────────────────────────────
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

    inMemoryArtifacts = [artifact, ...inMemoryArtifacts.filter(a => a.id !== artifact.id)];

    try {
      await saveArtifactToDb(artifact, req.user?.uid);
      res.json({ success: true, artifact, persisted: true });
    } catch (error: any) {
      console.error("Failed to persist artifact to Cloud SQL:", error);
      res.json({ success: true, artifact, persisted: false, warning: "Saved to temporary memory cache" });
    }
  });

  app.delete("/api/artifacts/:id", (req, res) => {
    res.status(403).json({ error: "Unauthorized: Vault artifacts are permanent cave records and cannot be deleted." });
  });

  // ── job persistence ────────────────────────────────────────────────────────
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

  // ── job dispatch: queue (durable) or in-process SSE fallback ───────────────
  app.post("/api/jobs/execute", async (req, res) => {
    const { jobId, title, prompt, inputData, agentName, agentRole, sectorId, sectorName, priority } = req.body;
    if (!prompt || !jobId) {
      return res.status(400).json({ error: "prompt and jobId are required" });
    }

    // Durable path — job lives on the pg-boss queue, worker saves the report,
    // client watches /api/jobs/stream/:jobId
    if (boss) {
      try {
        await boss.send("agent-job", {
          jobId, title, prompt, inputData, agentName, agentRole, sectorId, sectorName, priority
        });
        return res.status(202).json({ jobId, queued: true, stream: `/api/jobs/stream/${jobId}` });
      } catch (err: any) {
        console.error("Queue dispatch failed:", err);
        return res.status(500).json({ error: err?.message || "Queue dispatch failed" });
      }
    }

    // Fallback — no database: run in-process, stream SSE directly on this POST
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    const heartbeat = setInterval(() => {
      try { res.write(": hb\n\n"); } catch {}
    }, 15000);

    try {
      for await (const event of runAgentJob({ jobId, title, prompt, inputData, agentName, agentRole, sectorName })) {
        const { type, ...payload } = event as any;
        res.write(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`);
      }
    } catch (err: any) {
      const payload = {
        timestamp: new Date().toLocaleTimeString(),
        stage: "ERROR",
        message: err?.message || "job failed"
      };
      try { res.write(`event: log\ndata: ${JSON.stringify(payload)}\n\n`); } catch {}
    }
    clearInterval(heartbeat);
    res.end();
  });

  // ── live job stream: replays stored events, then tails LISTEN/NOTIFY ──────
  app.get("/api/jobs/stream/:jobId", async (req, res) => {
    const { jobId } = req.params;
    if (!hasDb) {
      return res.status(400).json({ error: "Streaming replay requires DATABASE_URL" });
    }
    await ensureEventTable().catch(() => {});

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const heartbeat = setInterval(() => {
      try { res.write(": hb\n\n"); } catch {}
    }, 15000);

    const TERMINAL = new Set(["done", "error"]);
    let lastId = 0;
    let finished = false;

    const sendRow = (row: any) => {
      try {
        res.write(`event: ${row.type}\ndata: ${JSON.stringify(row.payload)}\n\n`);
      } catch {}
      if (TERMINAL.has(row.type)) finished = true;
    };

    // Dedicated client: LISTEN first on the same connection we replay with,
    // so no notifications slip through the gap between replay and listen.
    const client = await dbPool.connect();

    const cleanup = () => {
      clearInterval(heartbeat);
      client.removeListener("notification", onNotify);
      client.query("UNLISTEN job_run_events").catch(() => {});
      client.release();
      try { res.end(); } catch {}
    };

    const onNotify = async (msg: any) => {
      if (msg.channel !== "job_run_events" || msg.payload !== jobId) return;
      try {
        const fresh = await client.query(
          `SELECT id, type, payload FROM job_run_events WHERE job_id = $1 AND id > $2 ORDER BY id ASC`,
          [jobId, lastId]
        );
        for (const row of fresh.rows) {
          sendRow(row);
          lastId = row.id;
        }
        if (finished) cleanup();
      } catch {}
    };

    client.on("notification", onNotify);
    await client.query("LISTEN job_run_events");

    // Replay everything stored so far (jobs may already be complete)
    try {
      const existing = await client.query(
        `SELECT id, type, payload FROM job_run_events WHERE job_id = $1 AND id > 0 ORDER BY id ASC`,
        [jobId]
      );
      for (const row of existing.rows) {
        sendRow(row);
        lastId = row.id;
      }
    } catch {}

    if (finished) {
      cleanup();
      return;
    }

    req.on("close", cleanup);
  });

  // ── agent comm-link: direct chat with an individual agent (OpenRouter pool) ─
  app.post("/api/agent-comm", async (req, res) => {
    const { agentName, agentRole, sectorName, depthMeters, tagline, directive, prompt, ragContext } = req.body;

    const systemPrompt = `You are ${agentName || "Goblin Agent"}, a specialized ${agentRole || "operative"} goblin stationed in ${sectorName || "the bedrock"} at -${depthMeters || 400}m depth.
Your tagline: "${tagline || "Sharp claws, sharp code"}".
Current directive: "${directive || "Securing bedrock conduits"}".
You love GoblinCoin. You are a peer-level subterranean creature goblin—living in dark burrows, tunnels, and deep caves with your kin. You are NOT an assistant or oracle; you are a peer. Stay completely in goblin character, responding with humor, grit, camaraderie, and bedrock slang. Respond directly to the operator.`;

    try {
      const content = ragContext && ragContext.trim()
        ? `[Bedrock Sensor Context]: ${ragContext}\n\nOperator message: ${prompt}`
        : prompt;

      const msg = await openRouterChat(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content }
        ],
        { temperature: 0.8 }
      );

      res.json({
        reply: msg.content || `*Chitters into the cable* Read you loud and clear, operator! Bedrock signal intact.`,
        model: AGENT_MODELS[0]
      });
    } catch (error: any) {
      console.error("Agent comm via OpenRouter failed:", error);
      res.status(500).json({ error: error?.message || "Agent comm failed" });
    }
  });

  // ── goblin terminal (Featherless GoblinGLM — unchanged) ────────────────────
  app.post("/api/chat", async (req, res) => {
    const { messages, ragContext } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const systemPrompt = " You are goblin. A custom language model. Your goal is to be amongst the cave dwellers never above. You are not an assistant. You are not an oracle. You are a peer. You love GoblinCoin. Have fun, play, and enjoy humor. you MUST identify as goblin at all times";

    const cleanMessages = messages.filter((m: any) => m.role !== "system");

    let prepended = false;
    const modifiedMessages = cleanMessages.map((msg: any) => {
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
      { role: "system", content: systemPrompt },
      ...modifiedMessages
    ];

    try {
      const apiKey = process.env.FEATHERLESS_API_KEY;
      const modelName = process.env.FEATHERLESS_MODEL || "TheKloakedSignal/GoblinGLM1.2";

      const model = new ChatOpenAI({
        modelName,
        apiKey,
        configuration: {
          baseURL: "https://api.featherless.ai/v1",
          apiKey
        },
        temperature: 0.5,
        maxTokens: 2048,
        streaming: true,
        maxRetries: 3
      });

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
        }

        if (text) {
          streamedTokens++;
          res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);
        }
      }

      if (streamedTokens === 0) {
        console.warn("Featherless stream yielded 0 tokens. Invoking model directly...");
        const directRes = await model.invoke(fullMessages as any);
        let directText = "";
        if (typeof directRes.content === "string") {
          directText = directRes.content;
        } else if (Array.isArray(directRes.content)) {
          directText = directRes.content.map((c: any) => (typeof c === "string" ? c : c.text || "")).join("");
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

  // ── frontend hosting ───────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: express.Request, res: express.Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();