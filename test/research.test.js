import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { filterCandidates, hasCredential, sortCandidates, summarize } from "../src/research.js";

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

test("authentication classification separates public starts from credential gates", () => {
  assert.equal(hasCredential(candidates.find(({ id }) => id === "stripe")), true);
  assert.equal(hasCredential(candidates.find(({ id }) => id === "easy-finance")), false);
  assert.equal(hasCredential(candidates.find(({ id }) => id === "pipeworx-edgar")), false);
  const publicCandidates = filterCandidates(candidates, { auth: "none" });
  assert(publicCandidates.some(({ id }) => id === "arcadia-finance"));
  assert(!publicCandidates.some(({ id }) => id === "xero"));
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
