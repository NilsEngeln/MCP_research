#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

function parseArgs(values) {
  const options = { args: [], sources: [], timeout: 45_000 };
  for (let index = 0; index < values.length; index += 1) {
    const key = values[index];
    if (key === "--arg") options.args.push(values[++index]);
    else if (key === "--source") options.sources.push(values[++index]);
    else if (key === "--timeout") options.timeout = Number(values[++index]) * 1000;
    else if (key.startsWith("--")) options[key.slice(2)] = values[++index];
  }
  return options;
}

function sanitize(value) {
  return String(value ?? "")
    .replaceAll(process.env.HOME ?? "__NO_HOME__", "~")
    .replace(/(api[_-]?key|token|secret|authorization)[=:]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .replace(/[A-Za-z0-9_-]{40,}/g, "[REDACTED-LONG-VALUE]")
    .slice(0, 2_000);
}

function safeEnvironment() {
  const names = ["PATH", "HOME", "TMPDIR", "LANG", "LC_ALL", "NODE_EXTRA_CA_CERTS"];
  return Object.fromEntries(names.filter((name) => process.env[name]).map((name) => [name, process.env[name]]));
}

const SAFE_READ_TOOLS = new Set([
  "currency_list",
  "edgar_ticker_to_cik",
  "av_quote",
  "listings_latest",
  "read.asset.list",
  "octagon-docs-list",
]);

async function safeRead(client, options) {
  if (!options["read-tool"]) {
    return { result: "not_attempted", note: "No financial tool was invoked; this probe is capability-discovery only." };
  }
  if (!SAFE_READ_TOOLS.has(options["read-tool"])) {
    throw new Error(`Refusing non-allowlisted read tool: ${options["read-tool"]}`);
  }
  const toolArgs = options["read-args"] ? JSON.parse(options["read-args"]) : {};
  try {
    const result = await client.callTool({ name: options["read-tool"], arguments: toolArgs });
    return {
      result: result.isError ? "failed" : "passed",
      note: `${options["read-tool"]} returned ${result.content?.length ?? 0} sanitized content block(s); payload values were not retained.`,
    };
  } catch (error) {
    return { result: "failed", note: `${options["read-tool"]} failed safely: ${sanitize(error?.message)}` };
  }
}

async function discover(client, method, capability) {
  try {
    const result = await client[method]();
    const values = result[capability] ?? [];
    return { result: "passed", count: values.length, names: values.map(({ name, uri }) => name ?? uri).filter(Boolean) };
  } catch (error) {
    const message = sanitize(error?.message);
    const unsupported = /not supported|method not found|does not support/i.test(message);
    return { result: unsupported ? "unsupported" : "failed", count: 0, names: [], error: message };
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.id || !options.output || (!options.command && !options.url)) {
    throw new Error("Usage: probe-mcp --id ID --output PATH (--command COMMAND [--arg ARG] | --url URL)");
  }

  let stderr = "";
  const transport = options.url
    ? new StreamableHTTPClientTransport(new URL(options.url))
    : new StdioClientTransport({
        command: options.command,
        args: options.args,
        env: safeEnvironment(),
        stderr: "pipe",
        cwd: process.cwd(),
      });
  if ("stderr" in transport && transport.stderr) {
    transport.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  }

  const client = new Client({ name: "verun-finance-mcp-research", version: "1.0.0" });
  let initializeResult;
  const originalRequest = client.request.bind(client);
  client.request = async (...args) => {
    const result = await originalRequest(...args);
    if (args[0]?.method === "initialize") initializeResult = result;
    return result;
  };

  const evidence = {
    candidateId: options.id,
    versionOrCommit: options.version ?? "unknown",
    testedAt: new Date().toISOString(),
    sourceUrls: options.sources,
    environment: `Linux; Node ${process.version}; @modelcontextprotocol/sdk 1.x`,
    transport: options.url ? "streamable_http" : "stdio",
    sanitizedCommand: options.url ? `connect ${options.url}` : [options.command, ...options.args].join(" "),
    initialize: { result: "failed", protocolVersion: null, serverInfo: null },
    toolsList: { result: "not_attempted", count: 0, names: [] },
    resourcesList: { result: "not_attempted", count: 0, names: [] },
    promptsList: { result: "not_attempted", count: 0, names: [] },
    readCall: { result: "not_attempted", note: "No financial tool was invoked; this probe is capability-discovery only." },
    finalState: "failed",
    notes: "",
    redaction: "No credentials were supplied. Output is truncated and token-like values are redacted.",
  };

  let timer;
  try {
    await Promise.race([
      client.connect(transport),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`Timed out after ${options.timeout / 1000}s`)), options.timeout); }),
    ]);
    clearTimeout(timer);
    evidence.initialize = {
      result: "passed",
      protocolVersion: initializeResult?.protocolVersion ?? "unknown",
      serverInfo: initializeResult?.serverInfo ?? client.getServerVersion() ?? null,
      capabilities: client.getServerCapabilities() ?? {},
    };
    evidence.toolsList = await discover(client, "listTools", "tools");
    evidence.resourcesList = await discover(client, "listResources", "resources");
    evidence.promptsList = await discover(client, "listPrompts", "prompts");
    evidence.readCall = await safeRead(client, options);
    evidence.finalState = "verified";
    evidence.notes = evidence.readCall.result === "passed"
      ? "Initialization, standards-level capability discovery, and an allowlisted public read completed."
      : evidence.readCall.result === "failed"
        ? "Initialization and capability discovery completed; the allowlisted read failed safely."
        : "Initialization and standards-level capability discovery completed. No tool was invoked.";
  } catch (error) {
    clearTimeout(timer);
    evidence.notes = sanitize(error?.message);
    evidence.stderr = sanitize(stderr);
    evidence.finalState = /api key|credential|oauth|authentication|required env|environment variables not set|configure/i.test(`${evidence.notes} ${stderr}`)
      ? "blocked"
      : "failed";
  } finally {
    try { await client.close(); } catch { /* process may already be closed */ }
  }

  await mkdir(dirname(options.output), { recursive: true });
  await writeFile(options.output, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`${options.id}: ${evidence.finalState}; initialize=${evidence.initialize.result}; tools=${evidence.toolsList.result}`);
  if (evidence.notes) console.log(evidence.notes);
  if (evidence.finalState === "failed") process.exitCode = 2;
}

await main();
