import { lookup } from "node:dns/promises";
import { dbPool } from "../db/connection.ts";

// ---------------------------------------------------------------------------
// REAL AGENT TOOLS — executors shared by every goblin agent job
// Model-facing declarations live in openRouter.ts (openRouterTools).
// ---------------------------------------------------------------------------

// --- SSRF guardrails for http_request ---------------------------------------

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

    return JSON.stringify({
      url: parsed.toString(),
      method,
      status: resp.status,
      statusText: resp.statusText,
      elapsedMs,
      headers: headerSubset,
      bodySnippet: bodySnippet || "(no body captured)"
    }, null, 2).slice(0, 4000);
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return `ERROR: Request to '${parsed.hostname}' timed out after 10s.`;
    }
    return `ERROR: HTTP request failed: ${err?.message || err}`;
  } finally {
    clearTimeout(watchdog);
  }
}

// --- Read-only SQL tool ------------------------------------------------------

async function executeSqlTool(args: any): Promise<string> {
  const sql = String(args?.sql || "").trim().replace(/;+\s*$/, "");
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

// --- run_code via E2B cloud sandbox ------------------------------------------

async function executeRunCodeTool(args: any): Promise<string> {
  const apiKey = process.env.E2B_API_KEY;
  if (!apiKey) {
    return "ERROR: E2B_API_KEY is not configured on the server. Code execution offline — state that honestly and reason about the code by hand instead.";
  }

  const code = String(args?.code || "");
  if (!code.trim()) return "ERROR: 'code' argument is required.";

  const lang = String(args?.language || "python").toLowerCase();
  const template = lang === "javascript" || lang === "js" || lang === "node" ? "nodejs" : "python3";

  try {
    const { Sandbox } = await import("@e2b/code-interpreter");
    const sandbox: any = await Sandbox.create(template, { apiKey, timeoutMs: 60000 });
    try {
      const execution: any = await sandbox.runCode(code, { timeoutMs: 60000 });
      const stdout = execution.logs?.stdout?.join("\n") || "";
      const stderr = execution.logs?.stderr?.join("\n") || "";
      const runtimeError = execution.error
        ? `${execution.error.name}: ${execution.error.value}\n${execution.error.traceback || ""}`
        : "";

      return JSON.stringify({
        language: template,
        stdout: stdout.slice(0, 2000),
        stderr: stderr.slice(0, 2000),
        error: runtimeError.slice(0, 1000) || null,
        exitOk: !execution.error
      }, null, 2);
    } finally {
      await sandbox.kill().catch(() => {});
    }
  } catch (err: any) {
    return `ERROR: Sandbox execution failed: ${err?.message || err}`;
  }
}

function executeTimeTool(): string {
  const now = new Date();
  return JSON.stringify({ utc: now.toISOString(), epochMs: now.getTime() });
}

// Real tool dispatcher used by the agent loop
export async function executeAgentTool(name: string, args: any): Promise<string> {
  switch (name) {
    case "http_request":
      return executeHttpRequestTool(args);
    case "query_jobs_db":
      return executeSqlTool(args);
    case "run_code":
      return executeRunCodeTool(args);
    case "get_current_time":
      return executeTimeTool();
    default:
      return `ERROR: Unknown tool '${name}'.`;
  }
}

// Human-readable one-liner for SSE logs when a tool fires
export function describeToolCall(name: string, args: any): string {
  if (name === "http_request") return `${(args?.method || "GET").toUpperCase()} ${args?.url}`;
  if (name === "query_jobs_db") return String(args?.sql || "").slice(0, 120);
  if (name === "run_code") return `sandbox ${(args?.language || "python")} — ${String(args?.code || "").length} chars`;
  return "executing instrument...";
}