import type { GroupCandidate, PageContext } from "../types";
import { UNGROUPED_TAB_GROUP_ID } from "../utils/constants";
import { getDomain, normalizeUrl } from "./urlNormalizer";
import { detectPageType } from "./pageTypeDetector";

export interface RecentTabSnapshot {
  tabId: number;
  windowId: number;
  groupId: number;
  groupName?: string;
  url?: string;
  title?: string;
  pageType?: PageContext["pageType"];
  origin?: string;
  domain?: string;
  hostname?: string;
  updatedAt: number;
}

export interface OpenerContextState {
  recentActiveTabsByWindow: Record<number, RecentTabSnapshot>;
  tabSnapshots: Record<number, RecentTabSnapshot>;
}

export interface OpenerResolveOptions {
  now?: number;
  recentActiveWindowMs?: number;
  searchInheritancePenalty?: number;
}

export interface TabGroupReader {
  getTab(tabId: number): Promise<chrome.tabs.Tab>;
  getGroup(groupId: number): Promise<chrome.tabGroups.TabGroup>;
}

const DEFAULT_RECENT_ACTIVE_WINDOW_MS = 3500;
const DEFAULT_SEARCH_INHERITANCE_PENALTY = 0.18;
const DISCOVERY_PAGE_TYPES = new Set<PageContext["pageType"]>(["search", "social", "video", "article"]);

export function createEmptyOpenerContextState(): OpenerContextState {
  return {
    recentActiveTabsByWindow: {},
    tabSnapshots: {}
  };
}

export async function resolveOpenerGroup(
  context: PageContext,
  state: OpenerContextState,
  reader: TabGroupReader,
  options: OpenerResolveOptions = {}
): Promise<GroupCandidate | null> {
  const now = options.now ?? Date.now();
  const direct = await resolveDirectOpener(context, reader);
  const fallback = direct && canInheritFromSnapshot(context, direct, "direct")
    ? direct
    : resolveRecentActiveOpener(context, state, now, options);

  if (!fallback || fallback.groupId === UNGROUPED_TAB_GROUP_ID || !fallback.groupName) return null;

  const penalty = fallback.pageType === "search"
    ? options.searchInheritancePenalty ?? DEFAULT_SEARCH_INHERITANCE_PENALTY
    : 0;
  const confidence = Math.max(0.55, 0.86 - penalty);
  const shouldLearn = context.isEligibleForLearning && !context.isTemporaryPage && !context.isSensitivePage;

  return {
    groupName: fallback.groupName,
    confidence,
    source: "opener_inheritance",
    reason: fallback.tabId === context.openerTabId
      ? `新标签与来源标签属于同站或流程链路，继承「${fallback.groupName}」。`
      : `openerTabId 不可用，最近活跃标签与当前页面同站，继承「${fallback.groupName}」。`,
    allowCreate: false,
    shouldLearn
  };
}

export function recordActiveTabSnapshot(
  state: OpenerContextState,
  snapshot: RecentTabSnapshot
): OpenerContextState {
  const normalized = snapshot.url ? normalizeUrl(snapshot.url) : null;
  const enriched: RecentTabSnapshot = {
    ...snapshot
  };
  if (normalized?.origin) enriched.origin = normalized.origin;
  if (normalized?.domain) enriched.domain = normalized.domain;
  if (normalized?.hostname) enriched.hostname = normalized.hostname;

  return {
    recentActiveTabsByWindow: {
      ...state.recentActiveTabsByWindow,
      [snapshot.windowId]: enriched
    },
    tabSnapshots: {
      ...state.tabSnapshots,
      [snapshot.tabId]: enriched
    }
  };
}

export function removeTabSnapshot(state: OpenerContextState, tabId: number): OpenerContextState {
  const tabSnapshots = { ...state.tabSnapshots };
  delete tabSnapshots[tabId];

  const recentActiveTabsByWindow = Object.fromEntries(
    Object.entries(state.recentActiveTabsByWindow).filter(([, snapshot]) => snapshot.tabId !== tabId)
  ) as Record<number, RecentTabSnapshot>;

  return { recentActiveTabsByWindow, tabSnapshots };
}

async function resolveDirectOpener(
  context: PageContext,
  reader: TabGroupReader
): Promise<RecentTabSnapshot | null> {
  if (typeof context.openerTabId !== "number") return null;

  try {
    const openerTab = await reader.getTab(context.openerTabId);
    if (openerTab.windowId !== context.windowId) return null;
    if (typeof openerTab.groupId !== "number" || openerTab.groupId === UNGROUPED_TAB_GROUP_ID) return null;

    const group = await reader.getGroup(openerTab.groupId);
    const snapshot: RecentTabSnapshot = {
      tabId: openerTab.id ?? context.openerTabId,
      windowId: openerTab.windowId ?? context.windowId,
      groupId: openerTab.groupId,
      updatedAt: Date.now()
    };
    if (group.title) snapshot.groupName = group.title;
    if (openerTab.url) snapshot.url = openerTab.url;
    if (openerTab.title) snapshot.title = openerTab.title;
    return enrichSnapshot(snapshot);
  } catch {
    return null;
  }
}

function resolveRecentActiveOpener(
  context: PageContext,
  state: OpenerContextState,
  now: number,
  options: OpenerResolveOptions
): RecentTabSnapshot | null {
  const recent = state.recentActiveTabsByWindow[context.windowId];
  if (!recent) return null;
  if (recent.tabId === context.tabId) return null;
  if (recent.groupId === UNGROUPED_TAB_GROUP_ID) return null;

  const maxAge = options.recentActiveWindowMs ?? DEFAULT_RECENT_ACTIVE_WINDOW_MS;
  if (now - recent.updatedAt > maxAge) return null;
  if (!canInheritFromSnapshot(context, recent, "recent")) return null;

  return recent;
}

function canInheritFromSnapshot(
  context: PageContext,
  snapshot: RecentTabSnapshot,
  mode: "direct" | "recent"
): boolean {
  if (isFlowPage(context)) {
    return mode === "direct" || isSameOrigin(context, snapshot) || isSameDomain(context, snapshot);
  }
  if (snapshot.pageType && DISCOVERY_PAGE_TYPES.has(snapshot.pageType)) return false;
  if (isSameOrigin(context, snapshot)) return true;
  if (isSameDomain(context, snapshot)) return true;
  return mode === "direct" && isWorkflowLikePath(context);
}

function isFlowPage(context: PageContext): boolean {
  return context.isTemporaryPage || context.isSensitivePage;
}

function isSameOrigin(context: PageContext, snapshot: RecentTabSnapshot): boolean {
  return Boolean(context.origin && snapshot.origin && context.origin === snapshot.origin);
}

function isSameDomain(context: PageContext, snapshot: RecentTabSnapshot): boolean {
  const snapshotDomain = snapshot.domain || (snapshot.hostname ? getDomain(snapshot.hostname) : "");
  return Boolean(context.domain && snapshotDomain && context.domain === snapshotDomain);
}

function isWorkflowLikePath(context: PageContext): boolean {
  return ["login", "oauth", "redirect", "payment", "checkout", "captcha", "download", "error"].includes(context.pageType);
}

function enrichSnapshot(snapshot: RecentTabSnapshot): RecentTabSnapshot {
  if (!snapshot.url) return snapshot;
  const normalized = normalizeUrl(snapshot.url);
  const pageType = snapshot.pageType ?? detectPageType(normalized, snapshot.title || "").pageType;
  const enriched: RecentTabSnapshot = {
    ...snapshot,
    pageType
  };
  if (normalized.origin) enriched.origin = normalized.origin;
  if (normalized.domain) enriched.domain = normalized.domain;
  if (normalized.hostname) enriched.hostname = normalized.hostname;
  return enriched;
}
