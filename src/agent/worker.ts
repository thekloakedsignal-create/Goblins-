import PgBoss from "pg-boss";
import pg from "pg";
import { executeAgentTool, describeToolCall } from "./agentTools.ts";
import { openRouterChat, openRouterChatStream, AGENT_MODELS } from "./openRouter.ts";
import { saveJobToDb } from "../db/queries.ts";

const { Pool } = pg;

// Dedicated event bus — SSE endpoints LISTEN here; workers NOTIFY after storing events.
const listenPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 4,
});

let busClient: pg.PoolClient | null = null;

export async function connectEventBus() {
  if (busClient) return;
  busClient = await listenPool.connect();
  await busClient.query("LISTEN job_run_events");
  busClient.on("notification", () => {});
}

export async function notifyEvent(jobId: string) {
  try {
    await listenPool.query("SELECT pg_notify('job_run_events', $1)", [jobId]);
  } catch {}
}

// Store one execution event durably. SSE readers replay these; reconnects see full history.
export async function recordEvent(jobId: string, type: string, payload: any) {
  try {
    await listenPool.query(
      `INSERT INTO job_run_events (job_id, type, payload) VALUES ($1, $2, $3::jsonb)`,
      [jobId, type, JSON.stringify(payload)]
    );
  } catch (err: any) {
    if (String(err?.message).includes("job_run_events")) {
      await ensureEventTable();
      try {
        await listenPool.query(
          `INSERT INTO job_run_events (job_id, type, payload) VALUES ($1, $2, $3::jsonb)`,
          [jobId, type, JSON.stringify(payload)]
        );
      } catch {}
    }
  }
}

let eventTableReady = false;
export async function ensureEventTable() {
  if (eventTableReady) return;
  await listenPool.query(`
    CREATE TABLE IF NOT EXISTS job_run_events (
      id BIGSERIAL PRIMARY KEY,
      job_id TEXT NOT NULL,
      type TEXT NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_job_run_events_job_id ON job_run_events (job_id, id);
  `);
  eventTableReady = true;
}

function parseToolArgs(raw: string | undefined): any {
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
}

// Thin async emitter the agent loop calls for every observable step
export async function* runAgentJob(params: {
  jobId: string;
  prompt: string;
  inputData?: string;
  agentName?: string;
  agentRole?: string;
  sectorName?: string;
  title?: string;
}) {
  const { jobId, prompt, inputData, agentName, agentRole, sectorName, title } = params;
  const startTime = Date.now();

  const roleSpecializations: Record<string, string> = {
    scrapper: "Deconstructing code, parsing telemetry logs, extracting reusable script scraps, and analyzing software architecture.",
    alchemist: "Transforming unstructured data into strict JSON/CSV schemas, cleaning dirty data, and compiling analytical summaries.",
    hacker: "Threat modeling, reviewing security posture, identifying injection risks, and inspecting cryptographic conduits.",
    scout: "Deep research, cross-referencing subterranean and surface intelligence, and compiling concise briefings.",
    treasurer: "Auditing resource utilization, compute budgets, ledger consistency, and token allocation.",
    enforcer: "Validation rules enforcement, compliance checks, error handling audits, and rate-limit safeguards.",
    gadgeteer: "Prototyping tools, designing automation workflows, crafting shell scripts, and system optimization."
  };
  const spec = roleSpecializations[(agentRole || "").toLowerCase()] || "Subterranean systems analysis and deliverable generation.";

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
You are wired to real subterranean instruments. When the objective references a URL/service/endpoint or asks to verify/check/audit anything external, you MUST call 'http_request' and base findings on the ACTUAL response. When the objective involves historical jobs, artifacts, operators, counts, or aggregates of operator data, call 'query_jobs_db' and report ACTUAL rows. When you write or are given code that should be verified, executed, or debugged, call 'run_code' and report the REAL stdout/stderr — never claim code works without running it. When you need exact timestamps, call 'get_current_time'.
TOOL RULES:
- Never invent tool results. Only report telemetry the tools genuinely returned.
- Cite observed facts in a '## Live Telemetry' section (status codes, response times, run outputs, row counts, error strings).
- If a tool fails or is blocked by the bedrock firewall, report the real error honestly and continue.
- Call multiple tools in sequence as needed, then synthesize everything into the final report.`;

  const userMessageContent = inputData && inputData.trim()
    ? `### JOB DIRECTIVE:\n${prompt}\n\n### INPUT CONTEXT / ATTACHED DATA:\n\`\`\`\n${inputData}\n\`\`\``
    : `### JOB DIRECTIVE:\n${prompt}`;

  const stamp = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const log = async (stage: string, message: string) => {
    const payload = { timestamp: stamp(), stage, message };
    await recordEvent(jobId, "log", payload);
    await notifyEvent(jobId);
    return payload;
  };

  yield { type: "log", ...(await log("ANALYZING", `Agent ${agentName} loaded directive into neural cache. OpenRouter pool: ${AGENT_MODELS.join(", ")}. Tools online: http_request, query_jobs_db, run_code, get_current_time.`)) };

  const contents: any[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessageContent }
  ];
  const MAX_TURNS = 10;
  let fullOutput = "";

  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const isFinalTurn = turn === MAX_TURNS - 1;

      if (isFinalTurn) {
        // Final turn: stream synthesis, no tools — forced to write the report
        yield { type: "log", ...(await log("PROCESSING", `Bedrock synthesis turn ${turn + 1}/${MAX_TURNS} — composing final deliverable.`)) };
        let turnText = "";
        for await (const delta of openRouterChatStream(contents, { temperature: 0.6 })) {
          turnText += delta;
          const p = { delta };
          await recordEvent(jobId, "chunk", p);
          await notifyEvent(jobId);
          yield { type: "chunk", ...p };
        }
        fullOutput += turnText;
        break;
      }

      if (turn > 0) {
        yield { type: "log", ...(await log("PROCESSING", `Bedrock synthesis turn ${turn + 1}/${MAX_TURNS} — tool results ingested, continuing.`)) };
      }

      // Tool turns: non-streaming decision call
      const msg = await openRouterChat(contents, { tools: true, temperature: 0.6 });

      if (msg.content && msg.content.trim()) {
        const p = { delta: msg.content + "\n" };
        await recordEvent(jobId, "chunk", p);
        await notifyEvent(jobId);
        yield { type: "chunk", ...p };
        fullOutput += p.delta;
      }

      if (msg.tool_calls.length === 0) break; // model answered directly — done

      contents.push({ role: "assistant", content: msg.content || "", tool_calls: msg.tool_calls });

      for (const call of msg.tool_calls) {
        const name = call?.function?.name || "";
        const args = parseToolArgs(call?.function?.arguments);
        yield { type: "log", ...(await log("PROCESSING", `TOOL RUN ${name}: ${describeToolCall(name, args)}`)) };
        const t0 = Date.now();
        const result = await executeAgentTool(name, args);
        const firstLine = String(result).split("\n").find((l: string) => l.trim()) || "(empty result)";
        const isErr = String(result).startsWith("ERROR");
        yield { type: "log", ...(await log("PROCESSING", `TOOL RESULT ${name} → ${isErr ? "BLOCKED/ERROR" : "OK"} in ${Date.now() - t0}ms — ${firstLine.slice(0, 160)}`)) };
        contents.push({ role: "tool", tool_call_id: call.id, name, content: String(result).slice(0, 6000) });
      }
    }

    const durationMs = Date.now() - startTime;
    yield { type: "log", ...(await log("STREAMING", `Deliverable synthesized (${(durationMs / 1000).toFixed(1)}s). Seal the report, goblin.`)) };

    const donePayload = { durationMs, result: fullOutput.trim() };
    await recordEvent(jobId, "done", donePayload);
    await notifyEvent(jobId);
    yield { type: "done", ...donePayload };
  } catch (err: any) {
    const msg = err?.message || String(err);
    yield { type: "log", ...(await log("ERROR", `Bedrock fault: ${msg.slice(0, 240)}`)) };
    throw err;
  }
}

// ---------------------------------------------------------------------------
// pg-boss worker — runs jobs durably, survives restarts and closed tabs
// ---------------------------------------------------------------------------

export async function startJobWorker() {
  await ensureEventTable();
  await connectEventBus();

  const boss = new PgBoss({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    schema: "pgboss",
  });

  boss.on("error", (err) => console.error("[pg-boss]", err));
  await boss.start();
  await boss.createQueue("agent-job");
  await boss.work("agent-job", { localConcurrency: 3 }, async ([job]) => {
    const data = (job?.data || {}) as any;

    try {
      let finalResult = "";
      for await (const event of runAgentJob(data)) {
        if (event.type === "chunk" && "delta" in event) finalResult += (event as any).delta;
        if (event.type === "done" && "result" in event) finalResult = (event as any).result || finalResult;
      }

      await saveJobToDb({
        id: data.jobId,
        title: data.title || "Agent Job",
        prompt: data.prompt,
        result: finalResult,
        status: "COMPLETED",
        agentName: data.agentName,
        agentRole: data.agentRole,
        section: data.sectorId || data.sectorName,
        priority: data.priority || "NORMAL",
        createdAt: new Date(),
        completedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }).catch(() => {});
    } catch (err: any) {
      await saveJobToDb({
        id: data.jobId,
        title: data.title || "Agent Job",
        prompt: data.prompt,
        result: `Bedrock fault — job failed: ${err?.message || err}`,
        status: "FAILED",
        agentName: data.agentName,
        agentRole: data.agentRole,
        section: data.sectorId || data.sectorName,
        priority: data.priority || "NORMAL",
        createdAt: new Date(),
        completedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }).catch(() => {});
      throw err; // pg-boss retries on throw
    }
  });

  console.log("[goblin-worker] pg-boss online — queue 'agent-job', concurrency 3");
  return boss;
}