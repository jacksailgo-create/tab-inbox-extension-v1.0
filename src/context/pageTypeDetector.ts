import type { PageType } from "../types";
import type { NormalizedUrlParts } from "./urlNormalizer";

const SYSTEM_PROTOCOL_RE = /^(chrome|edge|about|chrome-extension|moz-extension|devtools):/i;
const NEWTAB_RE = /^(chrome|edge):\/\/newtab\/?$|^about:(newtab|blank)$/i;
const OAUTH_STRONG_PATH_RE = /(^|\/)(oauth|oauth2|authorize|authorization|sso|saml)(\/|$)/i;
const OAUTH_CALLBACK_PATH_RE = /(^|\/)callback(\/|$)/i;
const OAUTH_QUERY_STRONG_KEYS = ["state", "client_id", "redirect_uri", "scope", "response_type", "grant_type"];

const PAGE_TYPE_ORDER: PageType[] = [
  "newtab",
  "system",
  "captcha",
  "oauth",
  "login",
  "redirect",
  "payment",
  "checkout",
  "cart",
  "order",
  "invoice",
  "download",
  "error",
  "product",
  "dashboard",
  "email",
  "document",
  "code",
  "video",
  "audio",
  "search",
  "social",
  "article"
];

const PAGE_TYPE_PATTERNS: Partial<Record<PageType, RegExp[]>> = {
  login: [
    /(^|\/)(login|log-in|signin|sign-in|auth|session|account\/login)(\/|$)/i,
    /[?&](login|signin|auth)=/i
  ],
  oauth: [
    OAUTH_STRONG_PATH_RE
  ],
  redirect: [
    /(^|\/)(redirect|redir|out|jump)(\/|$)/i,
    /[?&](redirect|redirect_url|redirect_uri|return|return_to|next|target|url)=/i
  ],
  payment: [
    /(^|\/)(pay|payment|payments|billing|stripe|paypal|alipay|wechatpay)(\/|$)/i,
    /[?&](payment|pay|checkout_session_id|session_id)=/i
  ],
  checkout: [/(^|\/)(checkout|checkouts|cashier|place-order|confirm-order)(\/|$)/i],
  cart: [/(^|\/)(cart|basket|bag|shopping-cart)(\/|$)/i],
  product: [/(^|\/)(product|products|item|items|p|dp|goods|sku)(\/|$)/i],
  order: [/(^|\/)(orders|order|purchases|purchase-history|transactions)(\/|$)/i],
  invoice: [/(^|\/)(invoice|invoices|receipt|receipts|bill|bills)(\/|$)/i],
  document: [/(^|\/)(docs|document|documents|file|files|wiki|page|pages|notion)(\/|$)/i],
  code: [/(^|\/)(repo|repos|pull|pulls|issues|commit|commits|tree|blob|merge_requests)(\/|$)/i],
  video: [/(^|\/)(watch|video|videos|live|shorts|player)(\/|$)/i, /[?&]v=/i],
  audio: [/(^|\/)(podcast|podcasts|audio|music|track|album|playlist)(\/|$)/i],
  search: [/(^|\/)(search|s)(\/|$)/i, /[?&](q|query|keyword|wd|word)=/i],
  social: [/(^|\/)(status|post|posts|tweet|profile|user|users|community)(\/|$)/i],
  email: [/(^|\/)(mail|inbox|sent|calendar|compose)(\/|$)/i],
  dashboard: [/(^|\/)(dashboard|admin|console|app|workspace|projects|settings)(\/|$)/i],
  article: [/(^|\/)(article|articles|blog|news|story|stories|post|posts)(\/|$)/i],
  download: [/(^|\/)(download|downloads|attachment|export)(\/|$)/i, /[?&](download|attachment)=/i],
  error: [/(^|\/)(404|500|error|not-found|not_found|unavailable)(\/|$)/i],
  captcha: [/(^|\/)(captcha|recaptcha|hcaptcha|challenge|verify|verification)(\/|$)/i]
};

const DOMAIN_TYPE_HINTS: Partial<Record<PageType, string[]>> = {
  email: ["mail.google.com", "outlook.live.com", "outlook.office.com", "mail.qq.com", "mail.163.com"],
  document: ["docs.google.com", "notion.so", "confluence", "feishu.cn", "larksuite.com", "kdocs.cn"],
  code: ["github.com", "gitlab.com", "bitbucket.org", "gitee.com", "stackoverflow.com"],
  video: ["youtube.com", "youtu.be", "bilibili.com", "netflix.com", "twitch.tv"],
  audio: ["open.spotify.com", "music.163.com", "podcasts.apple.com", "xiaoyuzhoufm.com"],
  social: ["x.com", "twitter.com", "reddit.com", "facebook.com", "instagram.com", "linkedin.com"],
  payment: ["paypal.com", "stripe.com", "alipay.com"],
  search: ["google.com", "google.com.hk", "bing.com", "baidu.com", "duckduckgo.com"]
};

export interface PageTypeResult {
  pageType: PageType;
  isSystemPage: boolean;
  isTemporaryPage: boolean;
  isSensitivePage: boolean;
  isEligibleForLearning: boolean;
  reason: string;
}

export function detectPageType(parts: NormalizedUrlParts, title = ""): PageTypeResult {
  const rawUrl = parts.rawUrl || "";
  const pathWithBoundary = parts.path && parts.path !== "/" ? `${parts.path}/` : parts.path;
  const normalizedUrlWithBoundary = parts.normalizedUrl && !parts.normalizedUrl.endsWith("/")
    ? `${parts.normalizedUrl}/`
    : parts.normalizedUrl;
  const text = `${parts.hostname} ${parts.path} ${pathWithBoundary} ${parts.normalizedUrl} ${normalizedUrlWithBoundary} ${title}`.toLowerCase();

  if (!rawUrl || NEWTAB_RE.test(rawUrl)) {
    return makeResult("newtab", "这是浏览器新标签页。");
  }

  if (SYSTEM_PROTOCOL_RE.test(rawUrl) || (!parts.isWebUrl && Boolean(parts.url))) {
    return makeResult("system", "这是浏览器、扩展或开发者工具系统页面。");
  }

  const domainType = detectByDomain(parts.hostname);
  const pathType = detectOAuthPageType(parts) ?? detectByPattern(text);
  const pageType = pathType ?? domainType ?? "unknown";
  const reason = pageType === "unknown"
    ? "没有命中页面类型规则。"
    : `页面 URL、路径或域名命中 ${pageType} 类型特征。`;

  return makeResult(pageType, reason);
}

export function isTemporaryPageType(pageType: PageType): boolean {
  return ["login", "oauth", "redirect", "payment", "captcha", "download", "error"].includes(pageType);
}

export function isSensitivePageType(pageType: PageType): boolean {
  return ["login", "oauth", "payment", "checkout", "invoice", "captcha"].includes(pageType);
}

function detectByPattern(text: string): PageType | null {
  for (const type of PAGE_TYPE_ORDER) {
    const patterns = PAGE_TYPE_PATTERNS[type] || [];
    if (patterns.some((pattern) => pattern.test(text))) return type;
  }
  return null;
}

function detectOAuthPageType(parts: NormalizedUrlParts): PageType | null {
  if (OAUTH_STRONG_PATH_RE.test(parts.path)) return "oauth";
  if (!parts.searchParams.code) return null;
  const hasStrongOAuthQuery = OAUTH_QUERY_STRONG_KEYS.some((key) => Boolean(parts.searchParams[key]));
  if (!hasStrongOAuthQuery) return null;
  return OAUTH_CALLBACK_PATH_RE.test(parts.path) || Boolean(parts.searchParams.state) ? "oauth" : null;
}

function detectByDomain(hostname: string): PageType | null {
  const host = hostname.toLowerCase();
  for (const [type, domains] of Object.entries(DOMAIN_TYPE_HINTS) as Array<[PageType, string[]]>) {
    if (domains.some((domain) => domainTypeMatches(host, domain, type))) return type;
  }
  return null;
}

function domainTypeMatches(host: string, domain: string, type: PageType): boolean {
  const normalizedDomain = domain.toLowerCase();
  if (host === normalizedDomain) return true;
  if (type === "search" && normalizedDomain.startsWith("google.")) {
    return host === `www.${normalizedDomain}`;
  }
  return host.endsWith(`.${normalizedDomain}`);
}

function makeResult(pageType: PageType, reason: string): PageTypeResult {
  const isSystemPage = pageType === "system" || pageType === "newtab";
  const isTemporaryPage = isTemporaryPageType(pageType);
  const isSensitivePage = isSensitivePageType(pageType);

  return {
    pageType,
    isSystemPage,
    isTemporaryPage,
    isSensitivePage,
    isEligibleForLearning: !isSystemPage && !isTemporaryPage && !isSensitivePage,
    reason
  };
}
