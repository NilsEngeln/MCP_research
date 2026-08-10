# Q Task: Research Banking and Finance MCPs

## Objective

Research existing banking and finance MCP servers, safely test their
connections, document the capabilities they expose, and create a polished
dashboard that showcases and compares the findings.

The result must let a technical or product stakeholder quickly answer:

- Which MCPs exist and who maintains them?
- Which banking or finance workflows does each MCP cover?
- Which MCPs are actually connectable today?
- What authentication, data providers, transports, and setup steps are needed?
- Which tools, resources, and prompts are exposed?
- Which capabilities are read-only and which could cause financial or account
  changes?
- How trustworthy, maintained, and integration-ready is each option?

## Scope

Research MCP servers and MCP-capable products in these categories:

1. Open banking and bank-account connectivity
2. Payments, billing, cards, and payment operations
3. Market data, securities, funds, and investment research
4. Crypto, digital assets, and DeFi data
5. Accounting, bookkeeping, treasury, and financial reporting
6. Regulatory, filings, risk, compliance, and fraud data
7. Personal-finance or portfolio tooling

Include both official provider MCPs and credible open-source community MCPs,
but label them clearly. Do not count a conventional REST API as an MCP unless
there is a working MCP adapter/server or a documented MCP interface.

## Research requirements

Use current primary sources wherever possible: the provider's documentation,
the canonical source repository, package registries, release notes, and the MCP
server's own capability response. Record a verification date for every entry.

Research at least 12 viable MCP candidates across at least four of the
categories above. Do not pad the list with abandoned forks or near-identical
clones. For every candidate, capture all fields required by
`data/mcps.schema.json`, including:

- canonical URLs and maintainer type
- license and commercial-use clarity
- supported MCP transport and installation method
- required runtime and authentication
- upstream financial data providers or services
- supported geographies, institutions, markets, and asset classes
- tools, resources, prompts, and important parameters
- read-only versus state-changing capabilities
- maintenance signals and known limitations
- documentation status, connection-test status, and sanitized evidence

Every factual dashboard claim must link to a source. Unknown information must
remain `unknown`; do not infer favorable coverage or reliability.

## Connection testing

Follow `docs/RESEARCH_METHOD.md`. Attempt a standards-level connection test for
at least eight candidates when their terms and setup permit it. Prioritize
servers that can run without paid credentials or that offer a sandbox/demo.

At minimum, a connection attempt should capture:

- installation/start result
- MCP initialization result and negotiated protocol version
- transport used
- `tools/list`, `resources/list`, and `prompts/list` results or explicit
  unsupported responses
- one harmless read-only call when public or sandbox access permits it
- failure stage and actionable blocker when a test cannot complete
- UTC timestamp, environment summary, and sanitized evidence path

Do not use live bank accounts, production payment credentials, real wallets, or
real customer data. Do not invoke tools that create payments, trades, transfers,
refunds, invoices, beneficiaries, orders, or account changes.

## Dashboard requirements

Build a responsive public dashboard backed by source-controlled structured data.
It must include:

- an executive summary with key findings, strongest options, and coverage gaps
- searchable and sortable MCP inventory
- filters for category, maintainer type, test status, authentication, transport,
  license, and read/write risk
- at-a-glance comparison cards or table
- a coverage matrix for major finance capabilities
- a detail view for each MCP with setup, coverage, exposed capabilities,
  connection evidence, limitations, and source links
- a clear legend distinguishing `verified`, `documentation only`, `blocked`,
  `failed`, `not tested`, and `stale`
- visible research freshness dates
- accessible keyboard navigation, semantic HTML, readable contrast, and useful
  empty/error states
- mobile and desktop layouts

The design should feel like a credible technical research product, not a generic
admin template. Avoid invented metrics and decorative charts that do not help a
reader compare MCPs.

## Reproducibility and quality

- Keep canonical findings in JSON that validates against
  `data/mcps.schema.json`.
- Add a documented command or script for validating the dataset.
- Keep sanitized test artifacts under `research/evidence/`; never store secrets
  or full sensitive payloads.
- Document local setup, development, testing, and build commands in `README.md`.
- Add appropriate lint, unit/data-validation, and production-build checks.
- If live tests are automated, make them opt-in and ensure normal CI does not
  require secrets or contact financial services.
- Document material methodology choices and known limitations.

## Acceptance criteria

The task is complete when:

1. At least 12 non-duplicative MCP candidates across four or more categories
   are documented with cited primary sources.
2. At least eight standards-level connection attempts are recorded, or every
   shortfall has a specific, evidenced blocker such as unavailable credentials,
   discontinued code, incompatible runtime, or provider restrictions.
3. Capability claims distinguish documentation evidence from runtime evidence.
4. No live financial write is performed and no secret or sensitive payload is
   committed.
5. The structured dataset validates successfully.
6. The dashboard provides summary, inventory/filtering, comparison/coverage,
   MCP detail views, source links, test states, and freshness information.
7. The dashboard is usable on current mobile and desktop browsers and meets the
   accessibility requirements above.
8. Lint, tests, dataset validation, and production build pass.
9. The final Q handoff lists tested commands, changed files, key decisions,
   limitations, and suggested follow-ups.

## Suggested Q invocation

```text
@Q implement Research banking and finance MCPs and build comparison dashboard | Follow TASK.md and docs/RESEARCH_METHOD.md. Research at least 12 candidates, safely attempt at least 8 MCP connections, store cited findings in schema-valid JSON, and build the accessible responsive dashboard. Never use production financial credentials or invoke state-changing financial tools. Run lint, tests, dataset validation, and production build. | repo: mcp-research | model: auto | priority: 80
```
