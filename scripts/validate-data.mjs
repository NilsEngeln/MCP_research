#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

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
const categories = new Set(dataset.mcps.flatMap(({ categories: values }) => values));
if (categories.size < 4) throw new Error(`Expected at least 4 categories, found ${categories.size}`);
const attempts = dataset.mcps.filter(({ test }) => test.testedAt && test.initialize !== "not_attempted");
if (attempts.length < 8) throw new Error(`Expected at least 8 connection attempts, found ${attempts.length}`);
for (const candidate of dataset.mcps) {
  if (candidate.sources.some(({ supports }) => supports.length === 0)) throw new Error(`${candidate.id} has an empty source claim list`);
  if (candidate.test.evidencePath) await access(resolve(root, "data", candidate.test.evidencePath));
}

console.log(`Dataset valid: ${dataset.mcps.length} candidates, ${categories.size} categories, ${attempts.length} connection attempts.`);
