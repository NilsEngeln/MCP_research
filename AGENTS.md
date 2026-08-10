# Repository instructions for coding agents

Read `TASK.md` and `docs/RESEARCH_METHOD.md` before editing code or collecting
evidence. They define the task, safety boundary, and acceptance criteria.

## Working rules

- Inspect the repository before choosing the implementation stack.
- Keep findings in structured data validated by `data/mcps.schema.json`; do not
  hard-code research claims only in UI components.
- Prefer primary sources and include a source URL for every material claim.
- Separate documentation-derived claims from runtime-tested observations.
- Record unknown values as unknown rather than guessing.
- Never commit credentials, session material, personal financial data, real
  account identifiers, or raw responses that may contain them.
- Never execute a financial write operation. Connection testing is limited to
  protocol discovery and harmless public/sandbox read operations.
- Keep live network tests opt-in. CI and the normal test suite must be
  deterministic and must not require external credentials.
- Preserve sanitized evidence needed to reproduce conclusions.
- Run the repository's lint, test, data-validation, and build commands before
  creating the final local commit.

If a candidate cannot be tested safely or legally, record the blocker and move
on. A transparent `blocked` result is preferable to unsafe testing or an
unsupported claim.
