#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { redactEvidence } from "./probe-safety.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schema = JSON.parse(await readFile(resolve(root, "data/mcps.schema.json"), "utf8"));
const dataset = JSON.parse(await readFile(resolve(root, "data/mcps.json"), "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);

if (!validate(dataset)) {
  console.error(ajv.errorsText(validate.errors, { separator: "\n" }));
  process.exit(1);
}

const ids = new Set(dataset.mcps.map(({ id }) => id));
if (ids.size !== dataset.mcps.length) throw new Error("Candidate IDs must be unique");
if (dataset.mcps.length !== 22) throw new Error(`Expected the reviewed 22-candidate inventory, found ${dataset.mcps.length}`);
const categories = new Set(dataset.mcps.flatMap(({ categories: values }) => values));
if (categories.size < 4) throw new Error(`Expected at least 4 categories, found ${categories.size}`);
const attempts = dataset.mcps.filter(({ test }) => test.testedAt && test.initialize !== "not_attempted");
if (attempts.length < 8) throw new Error(`Expected at least 8 connection attempts, found ${attempts.length}`);
const requiredMaterialClaims = [
  "provider",
  "pricing",
  "authentication",
  "capabilities",
  "deployment model",
  "financial workflows",
  "limitations",
];
for (const candidate of dataset.mcps) {
  if (candidate.sources.some(({ supports }) => supports.length === 0)) throw new Error(`${candidate.id} has an empty source claim list`);

  const mappedClaims = new Set(candidate.sources.flatMap(({ supports }) => supports));
  for (const claim of requiredMaterialClaims) {
    if (!mappedClaims.has(claim)) throw new Error(`${candidate.id} lacks source mapping for material claim: ${claim}`);
  }
  if (candidate.repositoryUrl && !candidate.sources.some(({ evidenceType }) => evidenceType === "repository")) {
    throw new Error(`${candidate.id} has a repository URL but no repository evidence source`);
  }
  if (candidate.test.status === "verified" && !candidate.capabilities.some(({ evidence }) => evidence === "runtime")) {
    throw new Error(`${candidate.id} is verified but has no runtime-evidenced capability`);
  }
  if (candidate.test.status === "documentation_only" && candidate.capabilities.some(({ evidence }) => evidence === "runtime")) {
    throw new Error(`${candidate.id} is documentation-only but claims a runtime-evidenced capability`);
  }
  if (!candidate.test.evidencePath) continue;

  const evidencePath = resolve(root, "data", candidate.test.evidencePath);
  await access(evidencePath);
  const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
  if (JSON.stringify(evidence) !== JSON.stringify(redactEvidence(evidence))) {
    throw new Error(`${candidate.id} evidence contains a value that the probe sanitizer would redact`);
  }
  if (evidence.candidateId !== candidate.id) throw new Error(`${candidate.id} evidence candidateId mismatch`);
  if (evidence.testedAt !== candidate.test.testedAt) throw new Error(`${candidate.id} evidence timestamp mismatch`);
  if (evidence.versionOrCommit !== candidate.test.versionOrCommit) throw new Error(`${candidate.id} evidence version mismatch`);
  if (evidence.transport !== candidate.test.transport) throw new Error(`${candidate.id} evidence transport mismatch`);
  if (evidence.finalState !== candidate.test.status) throw new Error(`${candidate.id} evidence final state mismatch`);

  const resultPairs = [
    ["initialize", "initialize"],
    ["toolsList", "toolsList"],
    ["resourcesList", "resourcesList"],
    ["promptsList", "promptsList"],
    ["readCall", "readCall"],
  ];
  for (const [testKey, evidenceKey] of resultPairs) {
    if (candidate.test[testKey] !== evidence[evidenceKey]?.result) {
      throw new Error(`${candidate.id} ${testKey} claim does not match evidence`);
    }
  }

  const discoveredNames = new Set([
    ...(evidence.toolsList?.names ?? []),
    ...(evidence.resourcesList?.names ?? []),
    ...(evidence.promptsList?.names ?? []),
  ]);
  for (const capability of candidate.capabilities.filter(({ evidence: kind }) => kind === "runtime")) {
    if (!discoveredNames.has(capability.name)) {
      throw new Error(`${candidate.id} runtime capability ${capability.name} is absent from its evidence catalog`);
    }
  }

  const citedUrls = new Set(candidate.sources.map(({ url }) => url));
  for (const sourceUrl of evidence.sourceUrls ?? []) {
    if (!citedUrls.has(sourceUrl)) throw new Error(`${candidate.id} evidence source is missing from dataset sources: ${sourceUrl}`);
  }
}

console.log(`Dataset valid: ${dataset.mcps.length} candidates, ${categories.size} categories, ${attempts.length} connection attempts.`);
