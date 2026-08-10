export const labels = {
  open_banking: "Open banking",
  payments: "Payments",
  market_data: "Market data",
  investments: "Investments",
  crypto_defi: "Crypto & DeFi",
  accounting_treasury: "Accounting & treasury",
  regulatory_risk: "Regulatory & risk",
  personal_finance: "Personal finance",
  verified: "Verified",
  documentation_only: "Documentation only",
  blocked: "Blocked",
  failed: "Failed",
  not_tested: "Not tested",
  stale: "Stale",
  read_only: "Read only",
  state_changing: "State changing",
  mixed: "Mixed",
  unknown: "Unknown",
  none: "No credential",
  required: "Credential required",
  streamable_http: "Streamable HTTP",
  stdio: "stdio",
  sse: "SSE",
  websocket: "WebSocket",
  provider: "Provider",
  foundation: "Foundation",
  community: "Community",
  individual: "Individual",
};

export function label(value) {
  return labels[value] ?? value?.replaceAll("_", " ") ?? "Unknown";
}

function normalizeSearch(value) {
  return String(value ?? "").toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function filterCandidates(candidates, filters) {
  const query = normalizeSearch(filters.search);
  return candidates.filter((candidate) => {
    const haystack = normalizeSearch([
      candidate.name,
      candidate.summary,
      candidate.maintainer,
      ...candidate.categories.map(label),
      ...candidate.capabilities.flatMap(({ name, summary }) => [name, summary]),
      ...candidate.upstreamProviders,
    ].join(" "));
    return (!query || haystack.includes(query))
      && (!filters.category || candidate.categories.includes(filters.category))
      && (!filters.maintainerType || candidate.maintainerType === filters.maintainerType)
      && (!filters.status || candidate.test.status === filters.status)
      && (!filters.transport || candidate.transports.includes(filters.transport))
      && (!filters.license || candidate.license === filters.license)
      && (!filters.risk || candidate.readWriteRisk === filters.risk)
      && (!filters.auth || candidate.authenticationClass === filters.auth);
  });
}

const statusOrder = ["verified", "documentation_only", "blocked", "failed", "not_tested", "stale"];
const riskOrder = ["read_only", "unknown", "mixed", "state_changing"];

export function sortCandidates(candidates, sort = "name") {
  return [...candidates].sort((left, right) => {
    if (sort === "status") return statusOrder.indexOf(left.test.status) - statusOrder.indexOf(right.test.status) || left.name.localeCompare(right.name);
    if (sort === "freshness") return Date.parse(right.verifiedAt) - Date.parse(left.verifiedAt) || left.name.localeCompare(right.name);
    if (sort === "risk") return riskOrder.indexOf(left.readWriteRisk) - riskOrder.indexOf(right.readWriteRisk) || left.name.localeCompare(right.name);
    return left.name.localeCompare(right.name);
  });
}

export function summarize(candidates) {
  const attempted = candidates.filter(({ test }) => test.testedAt && test.initialize !== "not_attempted");
  return {
    total: candidates.length,
    attempted: attempted.length,
    verified: candidates.filter(({ test }) => test.status === "verified").length,
    safeReads: candidates.filter(({ test }) => test.readCall === "passed").length,
    categories: new Set(candidates.flatMap(({ categories }) => categories)).size,
    mixedRisk: candidates.filter(({ readWriteRisk }) => readWriteRisk === "mixed" || readWriteRisk === "state_changing").length,
  };
}

export function formatDate(value, options = { year: "numeric", month: "short", day: "numeric" }) {
  return value ? new Intl.DateTimeFormat("en", { ...options, timeZone: "UTC" }).format(new Date(value)) : "Not tested";
}
