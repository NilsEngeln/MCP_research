# Banking & Finance MCP Research Dashboard

This repository is the implementation workspace for a VERUN Q coding task:
research existing Model Context Protocol (MCP) servers for banking and finance,
test their connections safely, document what they cover, and build a public
dashboard that makes the findings easy to compare.

The implementation brief and acceptance criteria are in [TASK.md](TASK.md).
The required evidence and connection-test procedure are in
[docs/RESEARCH_METHOD.md](docs/RESEARCH_METHOD.md). Findings must conform to
[data/mcps.schema.json](data/mcps.schema.json).

## Repository status

The repository starts as a documentation-first scaffold. Q should choose and
document the smallest maintainable web stack that can satisfy `TASK.md`, then
add the application, tests, and generated dashboard artifacts.

## Safety boundary

- Use only public information, sandbox credentials, or explicitly supplied
  test credentials.
- Never commit secrets, tokens, account identifiers, or unsanitized responses.
- Never initiate a payment, trade, transfer, account change, or other financial
  write operation.
- Treat connection testing as capability discovery plus harmless read-only
  validation.

## License

Code and original repository content are licensed under the MIT License.
Third-party MCP names, documentation, code, screenshots, and response samples
remain subject to their respective owners' licenses and terms.
