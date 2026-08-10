#!/usr/bin/env node
import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

await mkdir("dist/docs", { recursive: true });
await mkdir("dist/research", { recursive: true });
await mkdir("dist/data", { recursive: true });
await cp(resolve("docs/RESEARCH_METHOD.md"), resolve("dist/docs/RESEARCH_METHOD.md"));
await cp(resolve("research/evidence"), resolve("dist/research/evidence"), { recursive: true });
await cp(resolve("data/mcps.json"), resolve("dist/data/mcps.json"));
await cp(resolve("data/mcps.schema.json"), resolve("dist/data/mcps.schema.json"));
console.log("Copied methodology, dataset, schema, and sanitized evidence to dist.");
