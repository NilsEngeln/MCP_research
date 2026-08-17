# Research and connection-test method

## 1. Candidate discovery

Find candidates through official provider documentation, canonical GitHub
organizations, package registries, the official MCP ecosystem, and maintained
source repositories. Confirm that each candidate is an MCP server or exposes a
documented MCP interface. Record forks only when they add distinct capability
or active maintenance.

## 2. Source verification

For each candidate, collect the canonical documentation and source/package URL.
Prefer primary sources. Classify each cited source as `repository` or
`documentation`, record the access date in UTC, and retain a visible mapping
from each source to the claims it supports. Provider, pricing, authentication,
capabilities, deployment model, financial workflows, and limitations all
require a source mapping. Runtime claims remain a separate capability/evidence
class backed by a sanitized probe artifact. Do not copy marketing claims into
the dashboard without attribution or promote repository examples to observed
runtime behavior.

## 3. Pre-test safety review

Before running a server:

1. Inspect its installation instructions, manifest, dependencies, permissions,
   and requested environment variables.
2. Identify all tools that may create or mutate financial/account state.
3. Confirm that testing can use public data, fixtures, or an isolated sandbox.
4. Do not install software that requests suspicious privileges or opaque binary
   execution. Record `blocked` with the reason instead.
5. Keep credentials outside the repository and redact command output.

## 4. Connection test

Use an isolated temporary environment or container where practical. Record the
OS/runtime and MCP client or inspector version. A standards-level attempt is:

1. Install and start the documented server entry point.
2. Connect over its supported transport (`stdio`, Streamable HTTP, SSE, or
   another documented transport).
3. Send `initialize` and record the negotiated protocol version and server info.
4. Send the initialized notification.
5. Request `tools/list`, `resources/list`, and `prompts/list`; record explicit
   unsupported responses as such.
6. If safe and permitted, invoke one harmless public or sandbox read-only tool.
7. Stop the server and remove temporary credentials/artifacts.

Never invoke a tool that creates payments, transfers, trades, orders, refunds,
invoices, beneficiaries, subscriptions, account changes, approvals, or any
other financial write.

## 5. Test-state vocabulary

- `verified`: MCP initialization and capability discovery succeeded during this
  research; any claimed read call is backed by sanitized evidence.
- `documentation_only`: canonical documentation/source was checked, but no
  runtime connection was attempted or permitted.
- `blocked`: a test was attempted or prepared but could not proceed for a named
  external reason such as credentials, geography, provider approval, or an
  unavailable dependency.
- `failed`: a permitted connection attempt ran and failed technically; record
  the exact stage and sanitized error.
- `not_tested`: no sufficiently verified runtime or documentation assessment is
  yet available.
- `stale`: previously gathered evidence is outside the dashboard's defined
  freshness window or the underlying project has materially changed.

## 6. Evidence format

Store one Markdown or JSON evidence file per attempted MCP under
`research/evidence/`. Include:

- candidate ID and version/commit
- UTC verification time
- source URLs
- environment and transport
- sanitized commands
- protocol version and server metadata
- counts and names from capability discovery
- harmless read-call summary, if any
- final state and blocker/error
- explicit redaction note

Do not retain tokens, headers, cookies, account identifiers, wallet addresses,
customer data, full bank/portfolio records, or unreviewed raw responses.

## 7. Dashboard scoring

If the dashboard includes a score, make it transparent and reproducible. Use
only fields present in the dataset, show the scoring method, penalize unknowns,
and do not collapse security risk or write capability into a single optimistic
ranking. Qualitative labels with evidence are preferable when the data does not
support a defensible numeric score.

## 8. Snapshot-specific choices

The August 14, 2026 dashboard uses qualitative comparison only; it does not
rank or score candidates. `verified` means that initialization and capability
discovery passed at the recorded time. It is not an endorsement, reliability
claim, or security assessment.

This snapshot contains 22 candidates. Ten additions were selected from
official provider repositories or maintained community implementations with a
distinct finance workflow boundary. Nine additions received primary-source
review but no credentialed connection attempt, so their status is
`documentation_only` and their capabilities are labelled `repository` or
`documentation`, never `runtime`. The credential-free Pipeworx Banking
Regulations endpoint passed initialization and standards-level discovery; no
tool was invoked, and its broader shared-gateway surface is recorded as a
limitation. Tax and invoicing workflows are represented through the existing
`regulatory_risk` and `accounting_treasury` categories rather than adding
one-off taxonomy values.

Connection attempts use `scripts/probe-mcp.mjs`. The probe inherits only a
small runtime environment allowlist, stores capability names rather than full
financial responses, and refuses read calls unless the exact tool name is in a
source-reviewed public-read allowlist. Before writing, it recursively sanitizes
all evidence strings, strips URL credentials/query strings/fragments, and
redacts sensitive command arguments, assignments, headers, and token forms.
The dataset validator rejects any evidence value that this sanitizer would
change. The allowlisted snapshot calls were
limited to public currency metadata, SEC ticker mapping, public market or asset
metadata, and provider documentation. A failed read does not erase successful
initialization evidence; both outcomes are shown.

Candidates were selected to avoid near-identical forks and to cover distinct
provider or workflow boundaries. Recent package publication is treated only as
a maintenance signal, not evidence of quality. Hosted gateways are represented
as their provider-specific adapters even when runtime discovery also exposes
shared gateway tools; that shared surface is called out as a limitation.

Credential-gated candidates remain `blocked` or `documentation_only` when a
safe connection would require a real payment account, bank identity, accounting
organization, API key tied to an account, or wallet material. Missing local
runtime support is recorded as `failed`, not reclassified as a provider
restriction. No privileged host package installation was performed to turn a
failed attempt into a pass.

Authentication filtering uses the schema-controlled `authenticationClass`
field (`none`, `required`, `mixed`, or `unknown`); it does not infer access from
free-form authentication prose. Probe failures likewise default to `failed`.
Researchers may explicitly pass `--failure-class blocked` only after the
pre-test review establishes an external credential, consent, geography, or
provider-approval blocker; stderr text is not used to guess this state.
