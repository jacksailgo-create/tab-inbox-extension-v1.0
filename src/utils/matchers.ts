export interface DomainMatchOptions {
  allowBareLabel?: boolean;
}

const MAX_REGEX_PATTERN_LENGTH = 160;
const MAX_REGEX_INPUT_LENGTH = 2000;
const BACKREFERENCE_RE = /\\[1-9]/;
const NESTED_QUANTIFIER_RE = /\((?:[^()\\]|\\.)*[*+{](?:[^()\\]|\\.)*\)\s*[*+{?]/;
const REPEATED_WILDCARD_RE = /\.\*.*\.\*/;

export function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}

export function domainMatches(hostname: string, pattern: string, options: DomainMatchOptions = {}): boolean {
  const host = normalizeDomain(hostname);
  const target = normalizeDomain(pattern);
  if (!host || !target) return false;
  if (target === "localhost" || target === "127.0.0.1") return host === target;
  if (options.allowBareLabel && !target.includes(".")) return host.split(".").includes(target);
  return host === target || host.endsWith(`.${target}`);
}

export function safeRegexTest(pattern: string, value: string): boolean {
  if (!isSafeRegexPattern(pattern)) return false;
  try {
    return new RegExp(pattern, "i").test(value.slice(0, MAX_REGEX_INPUT_LENGTH));
  } catch {
    return false;
  }
}

export function isSafeRegexPattern(pattern: string): boolean {
  const trimmed = pattern.trim();
  if (!trimmed || trimmed.length > MAX_REGEX_PATTERN_LENGTH) return false;
  if (BACKREFERENCE_RE.test(trimmed)) return false;
  if (NESTED_QUANTIFIER_RE.test(trimmed)) return false;
  if (REPEATED_WILDCARD_RE.test(trimmed)) return false;
  return true;
}
