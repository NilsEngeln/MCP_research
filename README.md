# Banking & Finance MCP Research Dashboard

A source-cited comparison of 12 banking and finance Model Context Protocol (MCP) candidates across open banking, payments, market data, investments, crypto/DeFi, accounting, regulatory data, and personal finance.

The canonical findings are in [`data/mcps.json`](data/mcps.json), validated by [`data/mcps.schema.json`](data/mcps.schema.json). The public dashboard renders that dataset; research claims are not hard-coded only in UI components.

## Safety boundary

- Use only public information, sandbox material, or public credential-free reads.
- Never commit credentials, tokens, account identifiers, wallets, or unsanitized responses.
- Never invoke a payment, trade, transfer, refund, invoice, signing, broadcast, account-change, or other financial write tool.
- Treat `verified` as protocol initialization and capability discovery—not a security audit or product endorsement.

The connection probe contains a hard-coded allowlist of harmless public reads. It refuses other tool names. Normal lint, tests, validation, and builds are deterministic and do not contact MCP or finance services.

## Local development

Requirements: Node.js 22 or newer and npm.

```bash
npm install
npm run dev
```

Vite prints the local development URL. The dashboard supports current mobile and desktop browsers and uses semantic HTML, native controls, keyboard-operable dialogs, visible focus styles, and non-color status labels.

## Quality checks

```bash
npm run lint
npm test
npm run validate:data
npm run build
npx playwright install --with-deps chromium
npm run smoke
```

`npm run build` produces a self-contained static `dist/` artifact and copies the methodology, canonical JSON/schema, and sanitized connection artifacts so dashboard evidence links work in production. `npm run smoke` starts that exact artifact locally and exercises 360×800 mobile and 1440×900 desktop layouts in headless Chromium. `npm run verify` runs the full sequence after Chromium has been installed once.

## Human deployment

No deployment is performed by this repository's build or verification commands. A human release owner can publish the static artifact to GitHub Pages, Netlify, Cloudflare Pages, an object store, or another static host:

1. Check out the reviewed commit in a clean environment with Node.js 22+.
2. Run `npm ci` and `npx playwright install --with-deps chromium`.
3. Run `npm run verify`; do not publish if any check fails.
4. Review `dist/`, especially `data/mcps.json` and `research/evidence/`, for release suitability.
5. Configure the host to publish the contents of `dist/` (not the repository root) over HTTPS. Preserve the directory hierarchy and serve `index.html` at the chosen root or subpath.
6. After the human-controlled upload, check the dashboard, methodology, dataset, schema, and one evidence link on mobile and desktop.

Vite emits relative asset and evidence URLs, so the same `dist/` works at a domain root or a repository subpath without rebuilding. The app has no server runtime, credential, environment variable, or writable backend. For a public host, add platform-native security headers such as `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin` in that host's configuration; header syntax is provider-specific and intentionally not coupled to this artifact.

## Dataset validation

`npm run validate:data` checks JSON Schema conformance plus task-level invariants:

- at least 12 candidates
- unique candidate IDs
- at least four represented categories
- at least eight recorded standards-level attempts
- non-empty claim lists for every source
- resolvable evidence paths
- exact agreement between dataset test results and evidence artifacts
- every runtime-labelled capability appearing in the recorded discovery catalog
- evidence source URLs appearing in the candidate's cited sources
- evidence containing no value that the probe sanitizer would redact

## Opt-in live connection testing

Live probes are never part of the normal test suite. Review the candidate first, then run only in an isolated environment:

```bash
npm run probe:mcp -- \
  --id easy-finance \
  --output research/evidence/easy-finance.json \
  --command npx \
  --arg -y \
  --arg @easysolutions906/mcp-finance@1.1.3 \
  --version 1.1.3 \
  --source https://www.npmjs.com/package/@easysolutions906/mcp-finance \
  --read-tool currency_list
```

For a hosted Streamable HTTP endpoint, replace `--command` and `--arg` with `--url URL`. The probe:

1. starts with a reduced environment that does not inherit arbitrary credential variables;
2. negotiates MCP initialization;
3. requests `tools/list`, `resources/list`, and `prompts/list`;
4. optionally calls one tool only if its name is in the source-code allowlist;
5. stores capability names and a result summary, not financial response values;
6. recursively sanitizes every string before writing, including nested server metadata;
7. removes URL credentials, query strings, and fragments and redacts sensitive command arguments, headers, assignments, tokens, and home paths.

A non-allowlisted `--read-tool` fails closed. Do not add a state-changing tool to the allowlist.
Connection failures default to `failed`; use `--failure-class blocked` only when the pre-test review has already established an external credential, consent, geography, or provider-approval blocker. This explicit classification replaces error-message guessing.

## Research snapshot

The August 10, 2026 snapshot records 12 candidates and 10 connection attempts. Six initialized successfully; five harmless public reads passed. Credential-gated servers were allowed to fail before initialization rather than supplying production or personal financial credentials.

See:

- [Task and acceptance criteria](TASK.md)
- [Research and connection-test method](docs/RESEARCH_METHOD.md)
- [Sanitized evidence](research/evidence/)

## Known limitations

- This is a time-bounded technical snapshot, not legal, investment, security, or procurement advice.
- Runtime verification confirms protocol behavior only at the recorded version and time.
- Public hosted gateways can change independently of package versions.
- A source link supports the claims listed beside it; source availability and terms can change.
- Credential-gated bank, accounting, and payment integrations were not connected to real accounts.
- No write-path correctness or authorization boundary was exercised.

## License

Code and original repository content are licensed under the MIT License. Third-party names, documentation, code, and APIs remain subject to their respective owners' licenses and terms.
