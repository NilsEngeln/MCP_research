const SENSITIVE_NAME = /(?:api[_-]?key|access[_-]?token|refresh[_-]?token|token|secret|auth(?:entication|orization)?|password|passwd|private[_-]?key|client[_-]?secret|cookie)/i;
const SENSITIVE_FLAG = /^--?(?:api[_-]?key|access[_-]?token|refresh[_-]?token|token|secret|auth(?:entication|orization)?|password|passwd|private[_-]?key|client[_-]?secret|cookie)$/i;

export function sanitizeUrlForEvidence(value) {
  try {
    const url = new URL(String(value));
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, (match) => (url.pathname === "/" ? match : ""));
  } catch {
    return sanitizeEvidenceText(value);
  }
}

export function sanitizeEvidenceText(value) {
  const home = process.env.HOME;
  let output = String(value ?? "");
  if (home) output = output.replaceAll(home, "~");
  output = output
    .replace(/-----BEGIN [^-]*(?:PRIVATE KEY|CREDENTIAL)[\s\S]*?-----END [^-]*(?:PRIVATE KEY|CREDENTIAL)-----/gi, "[REDACTED-PEM]")
    .replace(/\bBearer\s+[^\s,;"']+/gi, "Bearer [REDACTED]")
    .replace(/\b(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/g, "[REDACTED-JWT]")
    .replace(/\b(sk_(?:live|test|restricted)_[A-Za-z0-9_-]+|gh[opusr]_[A-Za-z0-9_]+)\b/gi, "[REDACTED-TOKEN]")
    .replace(/\b(api[_-]?key|access[_-]?token|refresh[_-]?token|token|secret|auth(?:entication|orization)?|password|passwd|private[_-]?key|client[_-]?secret|cookie)\s*([=:])\s*(?!\[REDACTED\])(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, "$1$2[REDACTED]")
    .slice(0, 2_000);
  return output;
}

export function sanitizeCommandForEvidence(command, args = []) {
  const safeArgs = [];
  let redactNext = false;
  for (const rawArg of args) {
    const arg = String(rawArg);
    if (redactNext) {
      safeArgs.push("[REDACTED]");
      redactNext = false;
      continue;
    }
    if (SENSITIVE_FLAG.test(arg)) {
      safeArgs.push(arg);
      redactNext = true;
      continue;
    }
    const assignment = arg.match(/^(--?[^=]+)=(.*)$/);
    if (assignment && SENSITIVE_FLAG.test(assignment[1])) {
      safeArgs.push(`${assignment[1]}=[REDACTED]`);
      continue;
    }
    safeArgs.push(sanitizeEvidenceText(arg));
  }
  return [sanitizeEvidenceText(command), ...safeArgs].join(" ");
}

export function redactEvidence(value, key = "") {
  if (SENSITIVE_NAME.test(key)) return "[REDACTED]";
  if (Array.isArray(value)) return value.map((item) => redactEvidence(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, redactEvidence(item, name)]));
  }
  if (typeof value !== "string") return value;
  if (/^https?:\/\//i.test(value)) return sanitizeUrlForEvidence(value);
  return sanitizeEvidenceText(value);
}
