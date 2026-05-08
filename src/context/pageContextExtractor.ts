import type { PageContext } from "../types";
import { detectPageType } from "./pageTypeDetector";
import { isWebUrl, normalizeUrl } from "./urlNormalizer";

export function getClassifiableUrl(tab: Pick<chrome.tabs.Tab, "url" | "pendingUrl">): string {
  const url = tab.url || "";
  const pendingUrl = tab.pendingUrl || "";
  if (isWebUrl(pendingUrl) && !isWebUrl(url)) return pendingUrl;
  return url || pendingUrl;
}

export function extractPageContext(tab: chrome.tabs.Tab, now = Date.now()): PageContext {
  const rawUrl = getClassifiableUrl(tab);
  const normalized = normalizeUrl(rawUrl);
  const pageType = detectPageType(normalized, tab.title || "");

  const context: PageContext = {
    tabId: tab.id ?? -1,
    windowId: tab.windowId ?? -1,
    url: rawUrl,
    normalizedUrl: normalized.normalizedUrl,
    origin: normalized.origin,
    domain: normalized.domain,
    hostname: normalized.hostname,
    path: normalized.path,
    pathPattern: normalized.pathPattern,
    searchParams: normalized.searchParams,
    pageType: pageType.pageType,
    isSystemPage: pageType.isSystemPage,
    isTemporaryPage: pageType.isTemporaryPage,
    isSensitivePage: pageType.isSensitivePage,
    isEligibleForLearning: pageType.isEligibleForLearning,
    updatedAt: now
  };

  if (tab.pendingUrl) context.pendingUrl = tab.pendingUrl;
  if (tab.title) context.title = tab.title;
  if (typeof tab.groupId === "number") context.groupId = tab.groupId;
  if (typeof tab.openerTabId === "number") context.openerTabId = tab.openerTabId;
  if (normalized.hash) context.hash = normalized.hash;

  return context;
}
