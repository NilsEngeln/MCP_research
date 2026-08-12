import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { redactEvidence, sanitizeCommandForEvidence, sanitizeUrlForEvidence } from "../scripts/probe-safety.mjs";
import { filterCandidates, sortCandidates, summarize } from "../src/research.js";

const dataset = JSON.parse(await readFile(new URL("../data/mcps.json", import.meta.url), "utf8"));
const candidates = dataset.mcps;

test("research summary reflects the canonical dataset", () => {
  assert.deepEqual(summarize(candidates), {
    total: 12,
    attempted: 10,
    verified: 6,
    safeReads: 5,
    categories: 8,
    mixedRisk: 5,
  });
});

test("search includes capability text and combines filters", () => {
  const result = filterCandidates(candidates, {
    search: "balance sheet",
    category: "accounting_treasury",
    status: "documentation_only",
  });
  assert.deepEqual(result.map(({ id }) => id), ["quickbooks-community"]);
});

test("authentication filtering uses explicit dataset classifications", () => {
  assert.equal(candidates.find(({ id }) => id === "stripe").authenticationClass, "required");
  assert.equal(candidates.find(({ id }) => id === "easy-finance").authenticationClass, "none");
  assert.equal(candidates.find(({ id }) => id === "arcadia-finance").authenticationClass, "mixed");
  const publicCandidates = filterCandidates(candidates, { auth: "none" });
  assert(publicCandidates.some(({ id }) => id === "easy-finance"));
  assert(!publicCandidates.some(({ id }) => id === "xero"));
  assert.deepEqual(
    filterCandidates(candidates, { auth: "mixed" }).map(({ id }) => id).sort(),
    ["arcadia-finance", "octagon"],
  );
});

test("probe evidence strips credentials from commands, URLs, and nested output", () => {
  assert.equal(
    sanitizeCommandForEvidence("mcp", ["--api-key=sk_live_sensitive", "--mode", "public"]),
    "mcp --api-key=[REDACTED] --mode public",
  );
  assert.equal(
    sanitizeUrlForEvidence("https://user:pass@example.test/mcp?token=secret#fragment"),
    "https://example.test/mcp",
  );
  assert.deepEqual(
    redactEvidence({ authorization: "Bearer abc.def.ghi", nested: ["client_secret=visible"] }),
    { authorization: "[REDACTED]", nested: ["client_secret=[REDACTED]"] },
  );
});

test("status sorting is deterministic and puts verified entries first", () => {
  const sorted = sortCandidates(candidates, "status");
  assert.equal(sorted[0].test.status, "verified");
  assert.equal(sorted.at(-1).test.status, "failed");
  assert.deepEqual(
    sorted.filter(({ test: connection }) => connection.status === "verified").map(({ name }) => name),
    [...sorted.filter(({ test: connection }) => connection.status === "verified").map(({ name }) => name)].sort(),
  );
});

test("every dashboard capability has a risk and evidence class", () => {
  for (const candidate of candidates) {
    assert(candidate.capabilities.length > 0, candidate.id);
    for (const capability of candidate.capabilities) {
      assert(["read_only", "state_changing", "mixed", "unknown"].includes(capability.risk));
      assert(["runtime", "documentation"].includes(capability.evidence));
    }
  }
});
