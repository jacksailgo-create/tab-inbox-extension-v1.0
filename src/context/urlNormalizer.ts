export const TRACKING_QUERY_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "utm_name",
  "fbclid",
  "gclid",
  "dclid",
  "gbraid",
  "wbraid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "mkt_tok",
  "ref",
  "ref_src",
  "spm",
  "scm",
  "from",
  "share",
  "share_source"
]);

const HASH_ROUTE_PREFIXES = ["#/", "#!", "#/!", "#~"];
const SHORT_HASH_RE = /^#[a-z0-9_-]{1,80}$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LONG_HEX_RE = /^[0-9a-f]{12,}$/i;
const NUMERIC_RE = /^\d+$/;
const MIXED_ID_RE = /^(?=.*\d)[a-z0-9_-]{10,}$/i;
const COUNTRY_CODE_SECOND_LEVEL_LABELS = new Set([
  "ac",
  "asn",
  "co",
  "com",
  "edu",
  "firm",
  "gen",
  "go",
  "gob",
  "gov",
  "id",
  "ind",
  "law",
  "ltd",
  "me",
  "med",
  "mil",
  "ne",
  "net",
  "nom",
  "or",
  "org",
  "plc",
  "sch",
  "web"
]);
const PRIVATE_REGISTRY_SUFFIXES = new Set([
  "github.io"
]);

export interface NormalizedUrlParts {
  rawUrl: string;
  url: URL | null;
  normalizedUrl: string;
  origin: string;
  hostname: string;
  domain: string;
  path: string;
  pathPattern: string;
  searchParams: Record<string, string>;
  hash?: string;
  isWebUrl: boolean;
}

export function parseUrl(rawUrl: string | undefined): URL | null {
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl);
  } catch {
    return null;
  }
}

export function isWebUrl(rawUrl: string | undefined): boolean {
  return /^https?:\/\//i.test(rawUrl || "");
}

export function stripWww(hostname: string): string {
  return hostname.replace(/^www\./i, "").toLowerCase();
}

export function getDomain(hostname: string): string {
  const host = stripWww(hostname);
  if (!host || host === "localhost") return host;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return host;

  const parts = host.split(".").filter(Boolean);
  if (parts.length <= 2) return host;

  const twoPartSuffix = parts.slice(-2).join(".");
  if (PRIVATE_REGISTRY_SUFFIXES.has(twoPartSuffix) && parts.length >= 3) {
    return parts.slice(-3).join(".");
  }

  const secondLevel = parts.at(-2) || "";
  const topLevel = parts.at(-1) || "";
  if (topLevel.length === 2 && COUNTRY_CODE_SECOND_LEVEL_LABELS.has(secondLevel) && parts.length >= 3) {
    return parts.slice(-3).join(".");
  }

  return parts.slice(-2).join(".");
}

export function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  const collapsed = pathname.replace(/\/{2,}/g, "/");
  return collapsed.length > 1 ? collapsed.replace(/\/+$/, "") : collapsed;
}

export function createPathPattern(pathname: string): string {
  const path = normalizePath(pathname);
  if (path === "/") return "/";

  const segments = path.split("/").filter(Boolean).map((segment) => {
    const decoded = safeDecode(segment).toLowerCase();
    if (UUID_RE.test(decoded)) return ":uuid";
    if (LONG_HEX_RE.test(decoded)) return ":hash";
    if (NUMERIC_RE.test(decoded)) return ":id";
    if (MIXED_ID_RE.test(decoded)) return ":slug_id";
    return decoded;
  });

  return `/${segments.join("/")}`;
}

export function shouldKeepHash(hash: string): boolean {
  if (!hash) return false;
  if (HASH_ROUTE_PREFIXES.some((prefix) => hash.startsWith(prefix))) return true;
  return SHORT_HASH_RE.test(hash) && hash.includes("/");
}

export function normalizeUrl(rawUrl: string | undefined): NormalizedUrlParts {
  const source = rawUrl || "";
  const parsed = parseUrl(source);

  if (!parsed) {
    return {
      rawUrl: source,
      url: null,
      normalizedUrl: source,
      origin: "",
      hostname: "",
      domain: "",
      path: "",
      pathPattern: "",
      searchParams: {},
      isWebUrl: false
    };
  }

  const url = new URL(parsed.toString());
  const searchParams: Record<string, string> = {};

  for (const key of Array.from(url.searchParams.keys())) {
    if (TRACKING_QUERY_PARAMS.has(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }

  for (const [key, value] of url.searchParams.entries()) {
    searchParams[key] = value;
  }

  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();
  url.pathname = normalizePath(url.pathname);

  const keptHash = shouldKeepHash(url.hash) ? url.hash : "";
  url.hash = keptHash;

  const path = normalizePath(url.pathname);
  const normalizedUrl = `${url.origin}${path}${url.search}${keptHash}`;
  const result: NormalizedUrlParts = {
    rawUrl: source,
    url,
    normalizedUrl: normalizedUrl.endsWith("/") && path !== "/" ? normalizedUrl.slice(0, -1) : normalizedUrl,
    origin: url.origin,
    hostname: url.hostname,
    domain: getDomain(url.hostname),
    path,
    pathPattern: createPathPattern(path),
    searchParams,
    isWebUrl: isWebUrl(url.toString())
  };

  if (keptHash) result.hash = keptHash;
  return result;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
