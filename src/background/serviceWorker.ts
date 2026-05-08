import { applyGroupDecision } from "../actions/groupActionExecutor";
import { type AiCategoryContext, requestAiClassification, requestAiConnectionTest } from "../classifier/aiClassifier";
import { requestAiWindowOrganization, type AiWindowLanguage } from "../classifier/aiWindowOrganizer";
import { SYSTEM_CATEGORY_NAMES, UNCATEGORIZED_CATEGORY_NAME } from "../classifier/systemCategories";
import { extractPageContext, getClassifiableUrl } from "../context/pageContextExtractor";
import { normalizeUrl } from "../context/urlNormalizer";
import { createEmptyOpenerContextState, recordActiveTabSnapshot, removeTabSnapshot, type RecentTabSnapshot } from "../context/openerContext";
import { decideGroup } from "../engine/decisionEngine";
import { appendActionLog } from "../feedback/explanationLog";
import { handleFeedback, learnFromManualMove } from "../feedback/feedbackHandler";
import { applyMemoryCorrectionsForContext, recordGroupMemory } from "../memory/groupMemoryStore";
import {
  createDefaultAiSettings,
  createDefaultAiUsage,
  createDefaultSettings,
  STORAGE_KEYS
} from "../storage/schema";
import { migrateStorageIfNeeded } from "../storage/migrations";
import type {
  AiSettings,
  AiClassificationRecord,
  AiSuggestion,
  AiWindowAction,
  AiWindowAppliedSummary,
  AiWindowLocalSignals,
  AiWindowManualResolution,
  AiWindowPlan,
  AiWindowTabSnapshot,
  AiWindowWorkspaceCandidate,
  CurrentGroupContext,
  AiUsage,
  CustomGroupConfig,
  GroupFeedback,
  GroupActionLog,
  GroupDecision,
  GroupMemory,
  PageContext,
  PluginSettings,
  UserRule,
  WorkspaceTask
} from "../types";
import { domainMatches, isSafeRegexPattern } from "../utils/matchers";
import { makeId } from "../utils/id";
import { classifyManualGroupChange, ProgrammaticMoveLockStore } from "../feedback/manualMoveDetector";
import { registerTabEventRouter } from "./eventRouter";
import { findCanonicalGroupByTitle, withGroupTitleLock } from "../actions/groupFinder";
import { UNGROUPED_TAB_GROUP_ID } from "../utils/constants";

let openerState = createEmptyOpenerContextState();
const programmaticMoveLocks = new ProgrammaticMoveLockStore();
const knownTabGroupIds = new Map<number, number>();
const aiRequestInFlightByScope = new Map<string, Promise<AiFallbackResult | null>>();
const WORKSPACE_GROUP_NAME = "工作台";
const WORKSPACE_ITEMS_KEY = "workspaceItems";
const WORKSPACE_TASK_KEY = "workspaceTask";
const LATER_ITEMS_KEY = "laterItems";
const WORKSPACE_LIMIT = 50;
const QUICK_FEEDBACK_KEY = "quickFeedback";
const PAGE_SEEN_THROTTLE_MS = 2_000;
const USER_RULE_TYPES = new Set<UserRule["type"]>(["exact_url", "normalized_url", "path_pattern", "origin", "domain", "keyword", "regex"]);
const USER_RULE_ACTIONS = new Set<UserRule["action"]>(["group", "never_group", "exclude_group"]);
const pageSeenClassifiedAt = new Map<number, number>();

interface AiDecisionCandidate {
  groupName: string;
  groupColor?: chrome.tabGroups.ColorEnum;
  siteCategory?: string;
  siteCategoryName?: string;
  pageCategory?: string;
  pageCategoryName?: string;
  displayCategory?: string;
  displayCategoryName?: string;
  classificationMode?: "site" | "page" | "user_rule" | "review";
  intent?: "read" | "search" | "edit" | "communicate" | "buy" | "watch" | "manage" | "login" | "unknown";
  suggestedNewCategory?: string | null;
  confidence: number;
  reason: string;
}

interface AiFallbackResult {
  decision: GroupDecision;
  autoApply?: {
    candidate: AiDecisionCandidate;
    usage: { promptTokens: number; completionTokens: number; totalTokens: number };
    now: number;
  };
}

export function registerAutoGroupingServiceWorker(): void {
  chrome.runtime.onInstalled.addListener((details) => {
    void handleInstalled(details);
  });

  chrome.runtime.onStartup.addListener(() => {
    void handleStartup();
  });

  registerTabEventRouter({
    classifyTab: classifyTabById,
    recordActiveTab: recordActiveTabById,
    removeTab: async (tabId) => {
      openerState = removeTabSnapshot(openerState, tabId);
      knownTabGroupIds.delete(tabId);
      pageSeenClassifiedAt.delete(tabId);
    }
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    const url = changeInfo.url || tab.url;
    if (typeof changeInfo.groupId === "number") {
      void handleTabGroupChange(tabId, changeInfo.groupId);
    }
    if (changeInfo.url || changeInfo.status === "complete") {
      void ensureWorkspaceFabInjected(tabId, url);
    }
  });

  chrome.tabs.onActivated.addListener((activeInfo) => {
    void chrome.tabs.get(activeInfo.tabId)
      .then((tab) => ensureWorkspaceFabInjected(activeInfo.tabId, tab.url))
      .catch(() => undefined);
  });

  chrome.action.onClicked.addListener(() => {
    void openDashboard({ active: true, focusWindow: true });
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    void handleRuntimeMessage(message, sender)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) => sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      }));
    return true;
  });
}

async function handleInstalled(details?: { reason?: string }): Promise<void> {
  await migrateStorageIfNeeded();
  if (details?.reason === "install") {
    await classifyExistingOpenTabs("install_existing_tabs");
  }
}

async function handleStartup(): Promise<void> {
  await migrateStorageIfNeeded();
  await classifyExistingOpenTabs("startup_existing_tabs");
}

async function ensureWorkspaceFabInjected(tabId: number, url?: string): Promise<void> {
  if (!isOrdinaryWebPageUrl(url) || !chrome.scripting?.executeScript) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["workspace_fab.js"]
    });
  } catch {
    // Some pages reject extension injection even with host permissions.
  }
}

function isOrdinaryWebPageUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const protocol = new URL(url).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

async function recordActiveTabById(tabId: number, windowId: number): Promise<void> {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab || typeof tab.id !== "number") return;

  const groupId = typeof tab.groupId === "number" ? tab.groupId : UNGROUPED_TAB_GROUP_ID;
  knownTabGroupIds.set(tab.id, groupId);
  const context = extractPageContext(tab);
  const snapshot: RecentTabSnapshot = {
    tabId: tab.id,
    windowId: tab.windowId ?? windowId,
    groupId,
    pageType: context.pageType,
    updatedAt: Date.now()
  };
  if (tab.url) snapshot.url = tab.url;
  if (tab.title) snapshot.title = tab.title;

  if (groupId !== UNGROUPED_TAB_GROUP_ID) {
    const group = await chrome.tabGroups.get(groupId).catch(() => null);
    if (group?.title) snapshot.groupName = group.title;
  }

  openerState = recordActiveTabSnapshot(openerState, snapshot);
}

async function handleTabGroupChange(tabId: number, newGroupId: number): Promise<void> {
  const oldGroupId = knownTabGroupIds.get(tabId) ?? UNGROUPED_TAB_GROUP_ID;
  knownTabGroupIds.set(tabId, newGroupId);
  if (oldGroupId === newGroupId) return;

  const timestamp = Date.now();
  const changeType = classifyManualGroupChange({ tabId, oldGroupId, newGroupId, timestamp }, programmaticMoveLocks);
  if (changeType === "programmatic") return;

  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab) return;
  const context = extractPageContext(tab, timestamp);
  const settings = await getSettings();
  const memories = await getLocalArray<GroupMemory>(STORAGE_KEYS.groupMemories);
  let nextMemories = memories;

  if (changeType === "manual_remove_from_group" || changeType === "manual_group_change") {
    nextMemories = applyMemoryCorrectionsForContext(context, nextMemories, timestamp);
  }

  if (changeType === "manual_move_to_group" || changeType === "manual_group_change") {
    const group = await chrome.tabGroups.get(newGroupId).catch(() => null);
    const groupName = (group?.title || "").trim();
    if (groupName) {
      nextMemories = learnFromManualMove(context, groupName, settings, nextMemories, group?.color);
    }
  }

  await chrome.storage.local.set({ [STORAGE_KEYS.groupMemories]: nextMemories });
}

async function classifyTabById(tabId: number, reason: string): Promise<void> {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab || typeof tab.id !== "number") {
    openerState = removeTabSnapshot(openerState, tabId);
    knownTabGroupIds.delete(tabId);
    pageSeenClassifiedAt.delete(tabId);
    return;
  }
  if (reason !== "workspace_clear" && await isTabInWorkspaceGroup(tab)) return;
  const context = extractPageContext(tab);
  if (reason === "workspace_clear") delete context.groupId;
  const settings = await getSettings();
  const userRules = await getLocalArray<UserRule>(STORAGE_KEYS.userRules);
  const memories = await getLocalArray<GroupMemory>(STORAGE_KEYS.groupMemories);
  const customGroups = await getLocalArray<CustomGroupConfig>(STORAGE_KEYS.customGroups);
  const currentGroup = await getCurrentGroupContext(tab);

  const decision = await decideGroup({
    context,
    settings,
    userRules,
    memories,
    customGroups,
    openerState,
    currentGroup,
    tabGroupReader: {
      getTab: (id) => chrome.tabs.get(id),
      getGroup: (id) => chrome.tabGroups.get(id)
    }
  });

  const fallback = decision.source === "no_match"
    ? await decideWithAiFallback(context, settings, userRules, customGroups)
    : null;
  const finalDecision = fallback?.decision ?? decision;

  if (willMoveTab(finalDecision) && typeof tab.id === "number") {
    programmaticMoveLocks.lock([tab.id]);
  }
  const result = await applyGroupDecision(tab, context, finalDecision);
  if (typeof tab.id === "number") {
    knownTabGroupIds.set(tab.id, result.groupId ?? tab.groupId ?? context.groupId ?? UNGROUPED_TAB_GROUP_ID);
  }
  const logs = await getLocalArray<GroupActionLog>(STORAGE_KEYS.groupActionLogs);
  await chrome.storage.local.set({
    [STORAGE_KEYS.groupActionLogs]: appendActionLog(logs, result.log, settings)
  });

  const memoryOptions = getMemoryWriteOptions(finalDecision);
  if (result.success && memoryOptions && didMoveTabAction(result.log.action)) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.groupMemories]: recordGroupMemory(context, finalDecision, memories, settings, memoryOptions)
    });
  }
  if (fallback?.autoApply) {
    if (result.success && didMoveTabAction(result.log.action) && !result.error) {
      const latestRules = await getLocalArray<UserRule>(STORAGE_KEYS.userRules);
      await recordAiAutoAppliedRule(context, fallback.autoApply.candidate, latestRules, fallback.autoApply.now);
      await appendAiClassificationRecord(createAiClassificationRecord(
        context,
        fallback.autoApply.candidate,
        "auto_applied",
        fallback.autoApply.candidate.reason,
        fallback.autoApply.usage,
        fallback.autoApply.now
      ));
    } else {
      await appendAiClassificationRecord(createAiClassificationRecord(
        context,
        fallback.autoApply.candidate,
        "failed",
        result.error ? `AI 自动分组执行失败：${result.error}` : "AI 自动分组未执行，未写入可复用规则。",
        fallback.autoApply.usage,
        fallback.autoApply.now
      ));
    }
  }

  void reason;
}

async function classifyExistingOpenTabs(reason: string): Promise<number> {
  const tabs = await chrome.tabs.query({});
  let count = 0;
  for (const tab of tabs) {
    if (typeof tab.id !== "number") continue;
    if (typeof tab.groupId === "number" && tab.groupId !== UNGROUPED_TAB_GROUP_ID) continue;
    if (!isOrdinaryWebPageUrl(getClassifiableUrl(tab))) continue;
    await classifyTabById(tab.id, reason);
    count += 1;
  }
  return count;
}

function willMoveTab(decision: GroupDecision): boolean {
  return decision.action === "create_group" || decision.action === "move_to_existing_group";
}

function didMoveTabAction(action: GroupDecision["action"]): boolean {
  return action === "create_group" || action === "move_to_existing_group";
}

function getMemoryWriteOptions(decision: GroupDecision): { source: GroupMemory["source"] } | null {
  if (!willMoveTab(decision) || !decision.shouldLearn) return null;
  if (decision.source === "user_rule") return { source: "rule_promotion" };
  if (decision.source === "custom_group") return { source: "custom_group" };
  if (decision.source === "ai_classifier") return { source: "ai" };
  return null;
}

async function getSettings(): Promise<PluginSettings> {
  const result = await chrome.storage.sync.get(STORAGE_KEYS.settings);
  return (result[STORAGE_KEYS.settings] as PluginSettings | undefined) ?? createDefaultSettings();
}

async function getAiSettings(): Promise<AiSettings> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.aiSettings);
  return normalizeAiSettings(result[STORAGE_KEYS.aiSettings]);
}

function normalizeAiSettings(value: unknown): AiSettings {
  const defaults = createDefaultAiSettings();
  const input = value && typeof value === "object" ? value as Partial<AiSettings> : {};
  return {
    ...defaults,
    ...input,
    enabled: Boolean(input.enabled),
    baseUrl: typeof input.baseUrl === "string" ? input.baseUrl.trim() : defaults.baseUrl,
    model: typeof input.model === "string" ? input.model.trim() : defaults.model,
    apiKey: typeof input.apiKey === "string" ? input.apiKey.trim() : defaults.apiKey,
    autoApplyThreshold: clampNumber(input.autoApplyThreshold, 0.5, 1, defaults.autoApplyThreshold),
    suggestThreshold: clampNumber(input.suggestThreshold, 0.1, 1, defaults.suggestThreshold),
    dailyLimit: Math.max(0, Math.floor(Number(input.dailyLimit ?? defaults.dailyLimit))),
    cooldownHours: Math.max(1, Math.floor(Number(input.cooldownHours ?? defaults.cooldownHours))),
    updatedAt: typeof input.updatedAt === "number" ? input.updatedAt : defaults.updatedAt
  };
}

async function decideWithAiFallback(
  context: PageContext,
  settings: PluginSettings,
  userRules: UserRule[],
  customGroups: CustomGroupConfig[]
): Promise<AiFallbackResult | null> {
  if (!context.isEligibleForLearning || context.isTemporaryPage || context.isSensitivePage || context.isSystemPage) {
    return null;
  }

  const aiSettings = await getAiSettings();
  if (!aiSettings.enabled || !aiSettings.baseUrl || !aiSettings.model || !aiSettings.apiKey) return null;
  if (hasDomainRule(context, userRules)) return null;

  const scopeKey = createAiScopeKey(context);
  const existingRequest = aiRequestInFlightByScope.get(scopeKey);
  if (existingRequest) {
    return {
      decision: createAiNoneDecision(context, "同一页面的 AI 分类正在进行中，跳过重复请求。", Date.now())
    };
  }

  const request = decideWithAiFallbackRequest(context, settings, customGroups, aiSettings);
  aiRequestInFlightByScope.set(scopeKey, request);
  try {
    return await request;
  } finally {
    if (aiRequestInFlightByScope.get(scopeKey) === request) {
      aiRequestInFlightByScope.delete(scopeKey);
    }
  }
}

async function decideWithAiFallbackRequest(
  context: PageContext,
  settings: PluginSettings,
  customGroups: CustomGroupConfig[],
  aiSettings: AiSettings
): Promise<AiFallbackResult | null> {
  const suggestions = await getLocalArray<AiSuggestion>(STORAGE_KEYS.aiSuggestions);
  const cooldown = getSuggestionForScope(context, suggestions);
  const now = Date.now();
  if (cooldown && now - cooldown.lastAskedAt < aiSettings.cooldownHours * 60 * 60 * 1000) {
    return null;
  }
  const recentRecord = await getRecentAiRecordForScope(context, now);
  if (recentRecord && now - recentRecord.createdAt < aiSettings.cooldownHours * 60 * 60 * 1000) {
    return null;
  }

  const usage = await getAiUsage(now);
  if (usage.count >= aiSettings.dailyLimit) {
    return {
      decision: createAiNoneDecision(context, "AI 每日请求上限已达到，跳过未知分类。", now)
    };
  }

  const countedUsage = { ...usage, count: usage.count + 1 };
  await chrome.storage.local.set({
    [STORAGE_KEYS.aiUsage]: countedUsage
  });

  try {
    const categoryContext = createAiCategoryContext(customGroups);
    const aiResponse = await requestAiClassification(context, aiSettings, categoryContext);
    const candidate = aiResponse.candidate;
    const usageWithTokens = addAiTokenUsage(countedUsage, aiResponse.usage);
    await chrome.storage.local.set({
      [STORAGE_KEYS.aiUsage]: usageWithTokens
    });
    if (!candidate || candidate.confidence < aiSettings.suggestThreshold) {
      await appendAiClassificationRecord(createAiClassificationRecord(
        context,
        candidate,
        "unusable",
        candidate?.reason || "AI 未返回可用分类。",
        aiResponse.usage,
        now
      ));
      return {
        decision: createAiNoneDecision(context, "AI 未返回可用分类，保持未分组。", now)
      };
    }

    if (isUncategorizedAiCandidate(candidate)) {
      await chrome.storage.local.set({
        [STORAGE_KEYS.aiSuggestions]: upsertAiSuggestion(suggestions, context, candidate, now)
      });
      await appendAiClassificationRecord(createAiClassificationRecord(
        context,
        candidate,
        "suggested",
        candidate.reason,
        aiResponse.usage,
        now
      ));
      return {
        decision: createAiSuggestionDecision(context, candidate, now)
      };
    }

    if (candidate.status === "categorized" && candidate.isExistingCategory && candidate.confidence >= aiSettings.autoApplyThreshold) {
      const decision = createAiGroupDecision(context, candidate, settings, now);
      if (!willMoveTab(decision)) {
        await chrome.storage.local.set({
          [STORAGE_KEYS.aiSuggestions]: upsertAiSuggestion(suggestions, context, candidate, now)
        });
        await appendAiClassificationRecord(createAiClassificationRecord(
          context,
          candidate,
          "suggested",
          decision.reason,
          aiResponse.usage,
          now
        ));
        return {
          decision
        };
      }
      return {
        decision,
        autoApply: {
          candidate,
          usage: aiResponse.usage,
          now
        }
      };
    }

    await chrome.storage.local.set({
      [STORAGE_KEYS.aiSuggestions]: upsertAiSuggestion(suggestions, context, candidate, now)
    });
    await appendAiClassificationRecord(createAiClassificationRecord(
      context,
      candidate,
      "suggested",
      candidate.reason,
      aiResponse.usage,
      now
    ));
    return {
      decision: createAiSuggestionDecision(context, candidate, now)
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await appendAiClassificationRecord(createAiClassificationRecord(
      context,
      null,
      "failed",
      `AI 分类失败：${message}`,
      null,
      now
    ));
    return {
      decision: createAiNoneDecision(context, `AI 分类失败：${message}`, now)
    };
  }
}

function createAiCategoryContext(customGroups: CustomGroupConfig[]): AiCategoryContext {
  const customCategories = customGroups
    .filter((group) => group.enabled !== false)
    .map((group) => group.groupName.trim())
    .filter(Boolean)
    .map((name) => ({ name, kind: "custom" as const }));
  return {
    customCategories,
    systemCategories: SYSTEM_CATEGORY_NAMES.map((name) => ({ name, kind: "system" as const }))
  };
}

function isUncategorizedAiCandidate(candidate: { groupName: string }): boolean {
  return normalizeCategoryName(candidate.groupName) === normalizeCategoryName(UNCATEGORIZED_CATEGORY_NAME);
}

function normalizeCategoryName(value: string): string {
  return value.trim().toLowerCase();
}

async function getAiUsage(now: number): Promise<AiUsage> {
  const today = new Date(now).toISOString().slice(0, 10);
  const result = await chrome.storage.local.get(STORAGE_KEYS.aiUsage);
  const usage = result[STORAGE_KEYS.aiUsage] as AiUsage | undefined;
  const defaults = createDefaultAiUsage(now);
  return usage?.date === today
    ? {
      ...defaults,
      ...usage,
      count: Math.max(0, Math.floor(Number(usage.count || 0))),
      promptTokens: Math.max(0, Math.floor(Number(usage.promptTokens || 0))),
      completionTokens: Math.max(0, Math.floor(Number(usage.completionTokens || 0))),
      totalTokens: Math.max(0, Math.floor(Number(usage.totalTokens || 0)))
    }
    : defaults;
}

function addAiTokenUsage(usage: AiUsage, tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | null): AiUsage {
  if (!tokenUsage) return usage;
  return {
    ...usage,
    promptTokens: usage.promptTokens + tokenUsage.promptTokens,
    completionTokens: usage.completionTokens + tokenUsage.completionTokens,
    totalTokens: usage.totalTokens + tokenUsage.totalTokens
  };
}

function createAiClassificationRecord(
  context: PageContext,
  candidate: AiDecisionCandidate | null,
  status: AiClassificationRecord["status"],
  reason: string,
  usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null,
  now: number
): AiClassificationRecord {
  const record: AiClassificationRecord = {
    id: makeId("ai_history"),
    tabId: context.tabId,
    windowId: context.windowId,
    url: context.url,
    normalizedUrl: context.normalizedUrl,
    domain: context.domain || context.hostname,
    hostname: context.hostname,
    pageType: context.pageType,
    confidence: candidate?.confidence || 0,
    reason,
    status,
    promptTokens: usage?.promptTokens || 0,
    completionTokens: usage?.completionTokens || 0,
    totalTokens: usage?.totalTokens || 0,
    createdAt: now
  };
  if (context.title) record.title = context.title;
  if (candidate?.groupName) record.groupName = candidate.groupName;
  if (candidate?.groupColor) record.groupColor = candidate.groupColor;
  if (candidate?.siteCategory) record.siteCategory = candidate.siteCategory;
  if (candidate?.siteCategoryName) record.siteCategoryName = candidate.siteCategoryName;
  if (candidate?.pageCategory) record.pageCategory = candidate.pageCategory;
  if (candidate?.pageCategoryName) record.pageCategoryName = candidate.pageCategoryName;
  if (candidate?.displayCategory) record.displayCategory = candidate.displayCategory;
  if (candidate?.displayCategoryName) record.displayCategoryName = candidate.displayCategoryName;
  if (candidate?.classificationMode) record.classificationMode = candidate.classificationMode;
  if (candidate?.intent) record.intent = candidate.intent;
  if (candidate?.suggestedNewCategory !== undefined) record.suggestedNewCategory = candidate.suggestedNewCategory;
  return record;
}

async function appendAiClassificationRecord(record: AiClassificationRecord, maxCount = 500): Promise<void> {
  const history = await getLocalArray<AiClassificationRecord>(STORAGE_KEYS.aiClassificationHistory);
  await chrome.storage.local.set({
    [STORAGE_KEYS.aiClassificationHistory]: [record, ...history]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, maxCount)
  });
}

async function getLocalArray<T>(key: string): Promise<T[]> {
  const result = await chrome.storage.local.get(key);
  return Array.isArray(result[key]) ? (result[key] as T[]) : [];
}

function createAiGroupDecision(
  context: PageContext,
  candidate: AiDecisionCandidate,
  settings: PluginSettings,
  now: number
): GroupDecision {
  const isAlreadyGrouped = typeof context.groupId === "number" && context.groupId !== UNGROUPED_TAB_GROUP_ID;
  const canMoveExistingGroupedTab = !isAlreadyGrouped ||
    candidate.confidence >= settings.thresholds.moveExistingGroupedTab;
  const allowCreate = !context.isTemporaryPage &&
    !context.isSensitivePage &&
    candidate.confidence >= settings.thresholds.createNewGroup;
  const action = candidate.confidence >= settings.thresholds.joinExistingGroup && canMoveExistingGroupedTab
    ? allowCreate
      ? "create_group"
      : "move_to_existing_group"
    : "none";
  const reason = candidate.confidence >= settings.thresholds.joinExistingGroup && !canMoveExistingGroupedTab
    ? `${candidate.reason}；标签已在其他分组中，候选置信度 ${candidate.confidence.toFixed(2)} 未达到移动已分组标签阈值 ${settings.thresholds.moveExistingGroupedTab.toFixed(2)}。`
    : candidate.reason;
  const decision: GroupDecision = {
    action,
    groupName: candidate.groupName,
    confidence: candidate.confidence,
    source: "ai_classifier",
    reason,
    shouldLearn: action !== "none",
    allowCreate,
    temporaryPage: context.isTemporaryPage,
    sensitivePage: context.isSensitivePage,
    createdAt: now
  };
  if (candidate.groupColor) decision.groupColor = candidate.groupColor;
  return decision;
}

function createAiSuggestionDecision(
  context: PageContext,
  candidate: AiDecisionCandidate,
  now: number
): GroupDecision {
  const decision: GroupDecision = {
    action: "none",
    groupName: candidate.groupName,
    confidence: candidate.confidence,
    source: "ai_classifier",
    reason: `${candidate.reason}；置信度未达到自动分组阈值，已加入待确认建议。`,
    shouldLearn: false,
    allowCreate: false,
    temporaryPage: context.isTemporaryPage,
    sensitivePage: context.isSensitivePage,
    createdAt: now
  };
  if (candidate.groupColor) decision.groupColor = candidate.groupColor;
  return decision;
}

function createAiNoneDecision(context: PageContext, reason: string, now: number): GroupDecision {
  return {
    action: "none",
    confidence: 0,
    source: "ai_classifier",
    reason,
    shouldLearn: false,
    allowCreate: false,
    temporaryPage: context.isTemporaryPage,
    sensitivePage: context.isSensitivePage,
    createdAt: now
  };
}

function upsertUserRule(rules: UserRule[], rule: UserRule): UserRule[] {
  const duplicate = rules.some((item) =>
    item.type === rule.type &&
    item.action === rule.action &&
    item.value === rule.value &&
    item.groupName === rule.groupName
  );
  return duplicate ? rules : [...rules, rule];
}

function createUserRuleFromInput(input: unknown, now = Date.now()): UserRule {
  const patch = input && typeof input === "object" ? input as Partial<UserRule> : {};
  const type = USER_RULE_TYPES.has(patch.type as UserRule["type"])
    ? patch.type as UserRule["type"]
    : "domain";
  const action = USER_RULE_ACTIONS.has(patch.action as UserRule["action"])
    ? patch.action as UserRule["action"]
    : "group";
  const value = normalizeRuleValue(type, patch.value);
  if (!value) throw new Error("rule value is required");

  const groupName = typeof patch.groupName === "string" ? patch.groupName.trim() : "";
  if (action === "group" && !groupName) throw new Error("groupName is required for group rules");

  const rule: UserRule = {
    id: typeof patch.id === "string" && patch.id ? patch.id : makeId("rule"),
    type,
    action,
    value,
    enabled: patch.enabled ?? true,
    priority: typeof patch.priority === "number" ? patch.priority : defaultRulePriority(action),
    createdAt: typeof patch.createdAt === "number" ? patch.createdAt : now,
    updatedAt: typeof patch.updatedAt === "number" ? patch.updatedAt : now,
    source: patch.source ?? "user"
  };
  if (groupName) rule.groupName = groupName;
  if (patch.groupColor) rule.groupColor = patch.groupColor;
  if (typeof patch.description === "string" && patch.description.trim()) {
    rule.description = patch.description.trim();
  }
  return rule;
}

function normalizeRuleValue(type: UserRule["type"], value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "";

  if (type === "domain") {
    return text.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "").toLowerCase();
  }

  if (type === "origin") {
    try {
      return new URL(text).origin.toLowerCase();
    } catch {
      return text.replace(/\/+$/, "").toLowerCase();
    }
  }

  if (type === "exact_url") {
    return text;
  }

  if (type === "normalized_url") {
    return normalizeUrl(text).normalizedUrl || text;
  }

  if (type === "regex") {
    if (!isSafeRegexPattern(text)) {
      throw new Error("regex rule is too complex or too long");
    }
    try {
      void new RegExp(text);
    } catch {
      throw new Error("regex rule is invalid");
    }
  }

  return text;
}

function defaultRulePriority(action: UserRule["action"]): number {
  return action === "never_group" ? 1000 : action === "exclude_group" ? 900 : 100;
}

async function recordAiAutoAppliedRule(
  context: PageContext,
  candidate: AiDecisionCandidate,
  rules: UserRule[],
  now: number
): Promise<UserRule[]> {
  const rule = createAiAutoAppliedRule(context, candidate, now);
  const next = upsertUserRule(rules, rule);
  if (next === rules) return rules;
  await chrome.storage.local.set({ [STORAGE_KEYS.userRules]: next });
  return next;
}

function createAiAutoAppliedRule(
  context: PageContext,
  candidate: AiDecisionCandidate,
  now: number
): UserRule {
  const value = createAiScopeKey(context);
  const rule: UserRule = {
    id: makeId("rule"),
    type: "path_pattern",
    action: "group",
    value,
    groupName: candidate.groupName,
    enabled: true,
    priority: 90,
    createdAt: now,
    updatedAt: now,
    source: "ai",
    description: `AI 高置信自动分类生成：${candidate.reason}`
  };
  if (candidate.groupColor) rule.groupColor = candidate.groupColor;
  return rule;
}

function mergeSettingsPatch(current: PluginSettings, patch: Partial<PluginSettings>): PluginSettings {
  const automationLevel = normalizeAutomationLevel(patch.automationLevel, current.automationLevel);
  const levelThresholds = patch.automationLevel
    ? thresholdsForAutomationLevel(automationLevel)
    : {};
  return {
    ...current,
    ...patch,
    automationLevel,
    thresholds: {
      ...current.thresholds,
      ...levelThresholds,
      ...(patch.thresholds ?? {})
    },
    behavior: {
      ...current.behavior,
      ...(patch.behavior ?? {})
    },
    privacy: {
      ...current.privacy,
      ...(patch.privacy ?? {})
    },
    neverGroupDomains: patch.neverGroupDomains ?? current.neverGroupDomains,
    neverGroupUrlPatterns: patch.neverGroupUrlPatterns ?? current.neverGroupUrlPatterns,
    updatedAt: Date.now()
  };
}

function normalizeAutomationLevel(
  value: unknown,
  fallback: PluginSettings["automationLevel"]
): PluginSettings["automationLevel"] {
  return value === "conservative" || value === "balanced" || value === "aggressive"
    ? value
    : fallback;
}

function thresholdsForAutomationLevel(level: PluginSettings["automationLevel"]): Partial<PluginSettings["thresholds"]> {
  if (level === "conservative") {
    return {
      joinExistingGroup: 0.72,
      createNewGroup: 0.9,
      moveExistingGroupedTab: 0.95,
      memoryWrite: 0.85
    };
  }
  if (level === "aggressive") {
    return {
      joinExistingGroup: 0.45,
      createNewGroup: 0.68,
      moveExistingGroupedTab: 0.78,
      memoryWrite: 0.62
    };
  }
  return {
    joinExistingGroup: 0.55,
    createNewGroup: 0.8,
    moveExistingGroupedTab: 0.88,
    memoryWrite: 0.75
  };
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

function createCustomGroup(input: unknown): CustomGroupConfig {
  const patch = input && typeof input === "object"
    ? input as Partial<CustomGroupConfig>
    : {};
  const groupName = String(patch.groupName || "").trim();
  if (!groupName) throw new Error("groupName is required");

  const now = Date.now();
  const group: CustomGroupConfig = {
    id: makeId("custom_group"),
    groupName,
    keywords: toStringArray(patch.keywords),
    domains: toStringArray(patch.domains).map((domain) => domain.replace(/^https?:\/\//i, "").replace(/\/.*$/, "")),
    urlPatterns: toStringArray(patch.urlPatterns),
    pathPatterns: toStringArray(patch.pathPatterns),
    excludeKeywords: toStringArray(patch.excludeKeywords),
    autoCreate: patch.autoCreate ?? true,
    enabled: patch.enabled ?? true,
    priority: typeof patch.priority === "number" ? patch.priority : now,
    createdAt: now,
    updatedAt: now
  };
  if (patch.color) group.color = patch.color;
  return group;
}

function upsertCustomGroup(groups: CustomGroupConfig[], group: CustomGroupConfig): CustomGroupConfig[] {
  const normalizedName = group.groupName.trim().toLowerCase();
  const existing = groups.find((item) => item.groupName.trim().toLowerCase() === normalizedName);
  if (!existing) return [group, ...groups];
  return [
    { ...existing, ...group, id: existing.id, createdAt: existing.createdAt, updatedAt: Date.now() },
    ...groups.filter((item) => item.id !== existing.id)
  ];
}

function updateCustomGroup(groups: CustomGroupConfig[], groupId: string, input: unknown): CustomGroupConfig[] {
  const existing = groups.find((group) => group.id === groupId);
  if (!existing) throw new Error("Custom group not found");

  const patch = createCustomGroup(input);
  const normalizedName = patch.groupName.trim().toLowerCase();
  const duplicate = groups.some((group) =>
    group.id !== groupId &&
    group.groupName.trim().toLowerCase() === normalizedName
  );
  if (duplicate) throw new Error("Custom group name already exists");

  const updated: CustomGroupConfig = {
    ...existing,
    ...patch,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: Date.now()
  };
  return groups.map((group) => group.id === groupId ? updated : group);
}

async function previewTabClassifications(tabIds: number[]): Promise<Array<{
  tabId: number;
  groupName?: string;
  source: GroupDecision["source"];
  confidence: number;
}>> {
  const settings = await getSettings();
  const userRules = await getLocalArray<UserRule>(STORAGE_KEYS.userRules);
  const memories = await getLocalArray<GroupMemory>(STORAGE_KEYS.groupMemories);
  const customGroups = await getLocalArray<CustomGroupConfig>(STORAGE_KEYS.customGroups);
  const previews: Array<{
    tabId: number;
    groupName?: string;
    source: GroupDecision["source"];
    confidence: number;
  }> = [];

  for (const tabId of Array.from(new Set(tabIds))) {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab) continue;
    const context = extractPageContext(tab);
    const currentGroup = await getCurrentGroupContext(tab);
    const decision = await decideGroup({
      context,
      settings,
      userRules,
      memories,
      customGroups,
      openerState,
      currentGroup,
      tabGroupReader: {
        getTab: (id) => chrome.tabs.get(id),
        getGroup: (id) => chrome.tabGroups.get(id)
      }
    });
    const preview: {
      tabId: number;
      groupName?: string;
      source: GroupDecision["source"];
      confidence: number;
    } = {
      tabId,
      source: decision.source,
      confidence: decision.confidence
    };
    if (decision.action !== "none" && decision.groupName) preview.groupName = decision.groupName;
    previews.push(preview);
  }

  return previews;
}

async function getCurrentGroupContext(tab: chrome.tabs.Tab): Promise<CurrentGroupContext | undefined> {
  if (typeof tab.groupId !== "number" || tab.groupId === UNGROUPED_TAB_GROUP_ID) return undefined;
  const group = await chrome.tabGroups.get(tab.groupId).catch(() => null);
  if (!group) return { id: tab.groupId };
  const currentGroup: CurrentGroupContext = { id: tab.groupId };
  if (group.title) currentGroup.title = group.title;
  if (group.color) currentGroup.color = group.color;
  return currentGroup;
}

function hasDomainRule(context: PageContext, rules: UserRule[]): boolean {
  return rules.some((rule) =>
    rule.enabled &&
    rule.type === "domain" &&
    domainMatches(context.hostname, rule.value)
  );
}

function createAiScopeKey(context: PageContext): string {
  return `${context.origin}${context.pathPattern || "/"}`;
}

function getSuggestionScopeKey(suggestion: AiSuggestion): string {
  if (suggestion.scopeKey) return suggestion.scopeKey;
  if (suggestion.origin && suggestion.pathPattern) return `${suggestion.origin}${suggestion.pathPattern}`;
  return "";
}

function getSuggestionForScope(context: PageContext, suggestions: AiSuggestion[]): AiSuggestion | undefined {
  const scopeKey = createAiScopeKey(context);
  return suggestions
    .filter((suggestion) => {
      const suggestionScope = getSuggestionScopeKey(suggestion);
      if (suggestionScope) return suggestionScope === scopeKey;
      return suggestion.domain === context.domain || suggestion.hostname === context.hostname;
    })
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

async function getRecentAiRecordForScope(context: PageContext, now: number): Promise<AiClassificationRecord | undefined> {
  const scopeKey = createAiScopeKey(context);
  const records = await getLocalArray<AiClassificationRecord>(STORAGE_KEYS.aiClassificationHistory);
  return records
    .filter((record) => record.createdAt <= now && createAiRecordScopeKey(record) === scopeKey)
    .sort((a, b) => b.createdAt - a.createdAt)[0];
}

function createAiRecordScopeKey(record: AiClassificationRecord): string {
  const normalized = normalizeUrl(record.normalizedUrl || record.url);
  return `${normalized.origin}${normalized.pathPattern || "/"}`;
}

function upsertAiSuggestion(
  suggestions: AiSuggestion[],
  context: PageContext,
  candidate: {
    groupName: string;
    groupColor?: chrome.tabGroups.ColorEnum;
    siteCategory?: string;
    siteCategoryName?: string;
    pageCategory?: string;
    pageCategoryName?: string;
    displayCategory?: string;
    displayCategoryName?: string;
    classificationMode?: "site" | "page" | "user_rule" | "review";
    intent?: "read" | "search" | "edit" | "communicate" | "buy" | "watch" | "manage" | "login" | "unknown";
    suggestedNewCategory?: string | null;
    confidence: number;
    reason: string;
  },
  now: number
): AiSuggestion[] {
  const scopeKey = createAiScopeKey(context);
  const existing = getSuggestionForScope(context, suggestions);
  const suggestion: AiSuggestion = {
    id: existing?.id || makeId("ai_suggestion"),
    domain: context.domain || context.hostname,
    hostname: context.hostname,
    origin: context.origin,
    pathPattern: context.pathPattern,
    scopeKey,
    pageType: context.pageType,
    groupName: candidate.groupName,
    confidence: candidate.confidence,
    reason: candidate.reason,
    status: "pending",
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    lastAskedAt: now
  };
  if (context.title) suggestion.sampleTitle = context.title;
  if (candidate.groupColor) suggestion.groupColor = candidate.groupColor;
  if (candidate.siteCategory) suggestion.siteCategory = candidate.siteCategory;
  if (candidate.siteCategoryName) suggestion.siteCategoryName = candidate.siteCategoryName;
  if (candidate.pageCategory) suggestion.pageCategory = candidate.pageCategory;
  if (candidate.pageCategoryName) suggestion.pageCategoryName = candidate.pageCategoryName;
  if (candidate.displayCategory) suggestion.displayCategory = candidate.displayCategory;
  if (candidate.displayCategoryName) suggestion.displayCategoryName = candidate.displayCategoryName;
  if (candidate.classificationMode) suggestion.classificationMode = candidate.classificationMode;
  if (candidate.intent) suggestion.intent = candidate.intent;
  if (candidate.suggestedNewCategory !== undefined) suggestion.suggestedNewCategory = candidate.suggestedNewCategory;
  return [
    suggestion,
    ...suggestions.filter((item) => item.id !== suggestion.id)
  ].slice(0, 200);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

async function openDashboard(options: { active: boolean; focusWindow: boolean }): Promise<void> {
  const dashboardUrl = chrome.runtime.getURL("dashboard.html");
  const existing = await chrome.tabs.query({ url: dashboardUrl });
  const tab = existing[0];

  if (tab?.id) {
    await chrome.tabs.update(tab.id, { active: options.active });
    if (options.focusWindow && tab.windowId) await chrome.windows.update(tab.windowId, { focused: true });
    return;
  }

  await chrome.tabs.create({ url: dashboardUrl, active: options.active });
}

async function handleRuntimeMessage(message: unknown, sender?: chrome.runtime.MessageSender): Promise<unknown> {
  if (!message || typeof message !== "object" || !("type" in message)) return null;
  const typed = message as { type: string; [key: string]: unknown };

  switch (typed.type) {
    case "dashboard:open":
      await openDashboard({ active: true, focusWindow: true });
      return true;
    case "page-seen":
      return handlePageSeen(sender?.tab);
    case "workspace:add-current-tab":
      return addCurrentTabToWorkspace(await resolveCurrentTab(sender?.tab));
    case "workspace:task-get":
      return getWorkspaceTask();
    case "workspace:task-clear":
      await clearWorkspaceTask();
      return true;
    case "feedback:quick":
      return saveQuickFeedback(typed.feedback);
    case "manual-category:remember": {
      const groupName = typeof typed.groupName === "string" ? typed.groupName.trim() : "";
      if (!groupName) throw new Error("groupName is required");
      const tabIds = Array.isArray(typed.tabIds) ? typed.tabIds.map(Number).filter(Number.isInteger) : [];
      const rules = await getLocalArray<UserRule>(STORAGE_KEYS.userRules);
      const next = await rememberManualCategoryRules(rules, tabIds, groupName);
      await chrome.storage.local.set({ [STORAGE_KEYS.userRules]: next });
      return next;
    }
    case "workspace:classify-tabs": {
      const urls = Array.isArray(typed.urls) ? typed.urls.filter((url): url is string => typeof url === "string") : [];
      const items = Array.isArray(typed.items) ? typed.items.filter(isWorkspaceItemLike) : [];
      return classifyOpenWorkspaceTabs(urls, items);
    }
    case "workspace:group-tabs": {
      const tabIds = Array.isArray(typed.tabIds) ? typed.tabIds.map(Number).filter(Number.isInteger) : [];
      await groupTabsIntoWorkspace(tabIds);
      return true;
    }
    case "programmatic-group-lock": {
      const tabIds = Array.isArray(typed.tabIds) ? typed.tabIds.map(Number).filter(Boolean) : [];
      programmaticMoveLocks.lock(tabIds, typeof typed.ttlMs === "number" ? typed.ttlMs : undefined);
      return true;
    }
    case "clear-drag-group-override":
      return true;
    case "rules:list":
      return getLocalArray<UserRule>(STORAGE_KEYS.userRules);
    case "rules:add": {
      const rules = await getLocalArray<UserRule>(STORAGE_KEYS.userRules);
      const next = upsertUserRule(rules, createUserRuleFromInput(typed.rule));
      await chrome.storage.local.set({ [STORAGE_KEYS.userRules]: next });
      return next;
    }
    case "rules:delete": {
      const rules = await getLocalArray<UserRule>(STORAGE_KEYS.userRules);
      const next = rules.filter((rule) => rule.id !== typed.ruleId);
      await chrome.storage.local.set({ [STORAGE_KEYS.userRules]: next });
      return next;
    }
    case "custom-groups:list":
      return getLocalArray<CustomGroupConfig>(STORAGE_KEYS.customGroups);
    case "custom-groups:add": {
      const groups = await getLocalArray<CustomGroupConfig>(STORAGE_KEYS.customGroups);
      const next = upsertCustomGroup(groups, createCustomGroup(typed.group));
      await chrome.storage.local.set({ [STORAGE_KEYS.customGroups]: next });
      return next;
    }
    case "custom-groups:update": {
      if (typeof typed.groupId !== "string") throw new Error("groupId is required");
      const groups = await getLocalArray<CustomGroupConfig>(STORAGE_KEYS.customGroups);
      const next = updateCustomGroup(groups, typed.groupId, typed.group);
      await chrome.storage.local.set({ [STORAGE_KEYS.customGroups]: next });
      return next;
    }
    case "custom-groups:delete": {
      if (typeof typed.groupId !== "string") throw new Error("groupId is required");
      const groups = await getLocalArray<CustomGroupConfig>(STORAGE_KEYS.customGroups);
      const next = groups.filter((group) => group.id !== typed.groupId);
      await chrome.storage.local.set({ [STORAGE_KEYS.customGroups]: next });
      return next;
    }
    case "classification:preview-tabs": {
      const tabIds = Array.isArray(typed.tabIds) ? typed.tabIds.map(Number).filter(Number.isInteger) : [];
      return previewTabClassifications(tabIds);
    }
    case "logs:list": {
      const logs = await getLocalArray<GroupActionLog>(STORAGE_KEYS.groupActionLogs);
      const limit = typeof typed.limit === "number" ? typed.limit : 100;
      return logs.slice(0, limit);
    }
    case "memories:list": {
      const memories = await getLocalArray<GroupMemory>(STORAGE_KEYS.groupMemories);
      const limit = typeof typed.limit === "number" ? typed.limit : 100;
      return memories
        .slice()
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, limit);
    }
    case "memories:delete": {
      if (typeof typed.memoryId !== "string") throw new Error("memoryId is required");
      const memories = await getLocalArray<GroupMemory>(STORAGE_KEYS.groupMemories);
      const next = memories.filter((memory) => memory.id !== typed.memoryId);
      await chrome.storage.local.set({ [STORAGE_KEYS.groupMemories]: next });
      return next.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    case "settings:get":
      return getSettings();
    case "settings:update": {
      const current = await getSettings();
      const patch = typed.patch as Partial<PluginSettings>;
      const next = mergeSettingsPatch(current, patch);
      await chrome.storage.sync.set({ [STORAGE_KEYS.settings]: next });
      return next;
    }
    case "ai-settings:get":
      return getAiSettings();
    case "ai-settings:update": {
      const current = await getAiSettings();
      const patch = typed.patch as Partial<AiSettings>;
      const next = normalizeAiSettings({ ...current, ...patch, updatedAt: Date.now() });
      await chrome.storage.local.set({ [STORAGE_KEYS.aiSettings]: next });
      return next;
    }
    case "ai-settings:test": {
      const current = await getAiSettings();
      const patch = typed.patch as Partial<AiSettings> | undefined;
      const settings = normalizeAiSettings({ ...current, ...patch, enabled: true, updatedAt: Date.now() });
      const aiResponse = await requestAiConnectionTest(settings);
      const usage = await getAiUsage(Date.now());
      await chrome.storage.local.set({
        [STORAGE_KEYS.aiUsage]: addAiTokenUsage({ ...usage, count: usage.count + 1 }, aiResponse.usage)
      });
      return {
        model: aiResponse.model,
        message: aiResponse.message,
        totalTokens: aiResponse.usage.totalTokens
      };
    }
    case "ai-suggestions:list": {
      const suggestions = await getLocalArray<AiSuggestion>(STORAGE_KEYS.aiSuggestions);
      return suggestions
        .filter((suggestion) => suggestion.status === "pending")
        .sort((a, b) => b.updatedAt - a.updatedAt);
    }
    case "ai-history:list": {
      const history = await getLocalArray<AiClassificationRecord>(STORAGE_KEYS.aiClassificationHistory);
      const limit = typeof typed.limit === "number" ? typed.limit : 100;
      return history
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);
    }
    case "ai-window:analyze-current":
      return analyzeCurrentWindow(sender?.tab, parseUiLanguage(typed.language));
    case "ai-window:local-preview":
      return previewCurrentWindowLocally(sender?.tab, parseUiLanguage(typed.language));
    case "ai-window:apply": {
      const planId = typeof typed.planId === "string" ? typed.planId : "";
      const actionIds = Array.isArray(typed.actionIds)
        ? typed.actionIds.filter((id): id is string => typeof id === "string")
        : [];
      return applyAiWindowPlan(planId, actionIds);
    }
    case "ai-window:feedback": {
      const planId = typeof typed.planId === "string" ? typed.planId : "";
      const actionId = typeof typed.actionId === "string" ? typed.actionId : "";
      return recordAiWindowFeedback(planId, actionId, typed.feedback);
    }
    case "ai-window:resolve-action": {
      const planId = typeof typed.planId === "string" ? typed.planId : "";
      const actionId = typeof typed.actionId === "string" ? typed.actionId : "";
      const resolution = typeof typed.resolution === "string" ? typed.resolution : "";
      return resolveAiWindowAction(planId, actionId, resolution);
    }
    case "ai-window:enter-workspace": {
      const planId = typeof typed.planId === "string" ? typed.planId : "";
      const candidateId = typeof typed.candidateId === "string" ? typed.candidateId : "";
      const selectedTabIds = Array.isArray(typed.selectedTabIds)
        ? typed.selectedTabIds.filter((id): id is number => Number.isInteger(id))
        : undefined;
      return enterAiWindowWorkspace(planId, candidateId, selectedTabIds);
    }
    case "ai-window:history": {
      const plans = await getLocalArray<AiWindowPlan>(STORAGE_KEYS.aiWindowPlans);
      const limit = typeof typed.limit === "number" ? typed.limit : 50;
      return plans
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);
    }
    case "ai-suggestions:accept": {
      if (typeof typed.suggestionId !== "string") throw new Error("suggestionId is required");
      return acceptAiSuggestion(typed.suggestionId);
    }
    case "ai-suggestions:ignore": {
      if (typeof typed.suggestionId !== "string") throw new Error("suggestionId is required");
      return updateAiSuggestionStatus(typed.suggestionId, "ignored");
    }
    case "feedback:from-log": {
      if (typeof typed.logId !== "string") throw new Error("logId is required");
      if (typeof typed.action !== "string") throw new Error("action is required");
      return applyFeedbackFromLog(typed.logId, typed.action, typed.targetGroupName);
    }
    case "debug:decide-tab": {
      if (typeof typed.tabId !== "number") throw new Error("tabId is required");
      await classifyTabById(typed.tabId, "debug:decide-tab");
      return true;
    }
    default:
      return null;
  }
}

async function handlePageSeen(senderTab?: chrome.tabs.Tab): Promise<boolean> {
  const tab = await resolveCurrentTab(senderTab);
  if (!tab || typeof tab.id !== "number" || !isOrdinaryWebPageUrl(tab.url)) return false;

  await recordActiveTabById(tab.id, tab.windowId ?? -1);

  const now = Date.now();
  const lastClassifiedAt = pageSeenClassifiedAt.get(tab.id) ?? 0;
  if (now - lastClassifiedAt < PAGE_SEEN_THROTTLE_MS) return false;

  pageSeenClassifiedAt.set(tab.id, now);
  await classifyTabById(tab.id, "page_seen");
  return true;
}

function parseUiLanguage(language: unknown): AiWindowLanguage {
  return language === "en" ? "en" : "zh";
}

function uiText(language: AiWindowLanguage, key: string, values: Record<string, number | string> = {}): string {
  const messages: Record<AiWindowLanguage, Record<string, string>> = {
    zh: {
      dailyLimit: "{summary} AI 每日请求上限已达到，仅显示本地建议。",
      aiFailed: "{summary} AI 请求失败，仅显示本地建议：{error}",
      noWindow: "无法识别这个窗口",
      noTabs: "这个窗口没有可整理的网页标签页",
      localDuplicatesSummary: "本地发现 {count} 个可关闭重复页。",
      localNoActionsSummary: "本地未发现明确可执行的重复页，等待 AI 进一步判断。",
      localDuplicateTitle: "本地重复页",
      localDuplicateDescription: "这些建议只来自 URL 去重，不依赖 AI。",
      closeLocalDuplicates: "关闭本地识别的重复页",
      closeLocalDuplicatesReason: "URL 完全重复，保留每组一个页面。{preview}",
      duplicatePreview: "重复页包括：{preview}",
      currentTaskWorkspace: "当前任务工作台",
      workspaceSummary: "这些页面可作为同一任务继续处理。",
      aiSameTaskReason: "AI 判断这些页面属于同一任务语境。",
      aiCurrentTaskSummary: "AI 建议把这些页面作为同一任务继续处理。",
      aiCurrentTaskReason: "AI 判断这些页面属于当前任务。",
      taskWorkspaceIndexed: "任务工作台 {index}",
      workspaceCandidateFallback: "建议作为同一任务语境继续处理。",
      workspaceReasonFallback: "这些页面看起来属于同一个可继续处理的任务。"
    },
    en: {
      dailyLimit: "{summary} The AI daily request limit has been reached, so only local suggestions are shown.",
      aiFailed: "{summary} AI request failed, so only local suggestions are shown: {error}",
      noWindow: "Could not identify this window",
      noTabs: "This window has no organizeable web tabs",
      localDuplicatesSummary: "Found {count} duplicate tabs that can be closed locally.",
      localNoActionsSummary: "No clear local duplicate actions were found; waiting for AI to evaluate further.",
      localDuplicateTitle: "Local duplicates",
      localDuplicateDescription: "These suggestions come only from URL deduplication and do not use AI.",
      closeLocalDuplicates: "Close locally detected duplicates",
      closeLocalDuplicatesReason: "The URLs are exact duplicates. Keep one page from each set.{preview}",
      duplicatePreview: " Duplicate tabs include: {preview}",
      currentTaskWorkspace: "Current task workspace",
      workspaceSummary: "These pages can continue as one task.",
      aiSameTaskReason: "AI judged that these pages share one task context.",
      aiCurrentTaskSummary: "AI suggests continuing these pages as one task.",
      aiCurrentTaskReason: "AI judged that these pages belong to the current task.",
      taskWorkspaceIndexed: "Task workspace {index}",
      workspaceCandidateFallback: "Recommended as one task context to continue.",
      workspaceReasonFallback: "These pages look like one task you can continue."
    }
  };
  return (messages[language][key] || key).replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ""));
}

async function analyzeCurrentWindow(senderTab?: chrome.tabs.Tab, language: AiWindowLanguage = "zh"): Promise<AiWindowPlan> {
  const basePlan = await createLocalAiWindowPlan(senderTab, language);
  const aiSettings = await getAiSettings();
  if (!aiSettings.enabled || !aiSettings.baseUrl || !aiSettings.model || !aiSettings.apiKey) {
    await appendAiWindowPlan(basePlan);
    return basePlan;
  }

  const now = basePlan.createdAt;
  const usage = await getAiUsage(now);
  if (usage.count >= aiSettings.dailyLimit) {
    const limitedPlan = {
      ...basePlan,
      summary: uiText(language, "dailyLimit", { summary: basePlan.summary })
    };
    await appendAiWindowPlan(limitedPlan);
    return limitedPlan;
  }

  let plan = basePlan;
  const countedUsage = { ...usage, count: usage.count + 1 };
  await chrome.storage.local.set({ [STORAGE_KEYS.aiUsage]: countedUsage });
  try {
    const draft = await requestAiWindowOrganization(basePlan.windowId, basePlan.tabs, aiSettings, { language });
    await chrome.storage.local.set({
      [STORAGE_KEYS.aiUsage]: addAiTokenUsage(countedUsage, draft.usage)
    });
    plan = {
      ...basePlan,
      summary: draft.summary || basePlan.summary,
      workspaceCandidates: mergeAiWindowWorkspaceCandidates(draft.workspaceCandidates, draft.contexts, draft.actions, basePlan.tabs, language),
      contexts: mergeAiWindowContexts(basePlan.contexts, draft.contexts),
      actions: mergeAiWindowActions(basePlan.actions, draft.actions),
      promptTokens: draft.usage.promptTokens,
      completionTokens: draft.usage.completionTokens,
      totalTokens: draft.usage.totalTokens
    };
  } catch (error) {
    plan = {
      ...basePlan,
      summary: uiText(language, "aiFailed", {
        summary: basePlan.summary,
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
  await appendAiWindowPlan(plan);
  return plan;
}

async function previewCurrentWindowLocally(senderTab?: chrome.tabs.Tab, language: AiWindowLanguage = "zh"): Promise<AiWindowPlan> {
  return createLocalAiWindowPlan(senderTab, language);
}

async function createLocalAiWindowPlan(senderTab?: chrome.tabs.Tab, language: AiWindowLanguage = "zh"): Promise<AiWindowPlan> {
  const sourceTab = await resolveCurrentTab(senderTab);
  const windowId = sourceTab?.windowId;
  if (typeof windowId !== "number") throw new Error(uiText(language, "noWindow"));

  const tabs = (await chrome.tabs.query({ windowId }))
    .filter((tab): tab is chrome.tabs.Tab & { id: number; windowId: number; url: string } =>
      typeof tab.id === "number" &&
      typeof tab.windowId === "number" &&
      typeof tab.url === "string" &&
      isOrdinaryWebPageUrl(tab.url)
    );
  if (!tabs.length) throw new Error(uiText(language, "noTabs"));

  const now = Date.now();
  const snapshots = await createAiWindowTabSnapshots(tabs);
  const localSignals = createAiWindowLocalSignals(snapshots);
  const actions = createLocalAiWindowActions(localSignals, snapshots, language);
  return {
    id: makeId("ai_window"),
    windowId,
    summary: actions.length
      ? uiText(language, "localDuplicatesSummary", { count: localSignals.duplicateTabIds.length })
      : uiText(language, "localNoActionsSummary"),
    localSignals,
    workspaceCandidates: [],
    contexts: actions.length ? [{
      id: "ctx_local_duplicates",
      title: uiText(language, "localDuplicateTitle"),
      description: uiText(language, "localDuplicateDescription"),
      tabIds: localSignals.duplicateTabIds
    }] : [],
    actions,
    tabs: snapshots,
    status: "suggested",
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    createdAt: now,
    updatedAt: now
  };
}

async function createAiWindowTabSnapshots(
  tabs: Array<chrome.tabs.Tab & { id: number; windowId: number; url: string }>
): Promise<AiWindowTabSnapshot[]> {
  const [workspaceItems, laterItems] = await Promise.all([
    getLocalArray<WorkspaceItem>(WORKSPACE_ITEMS_KEY),
    getLocalArray<LaterItem>(LATER_ITEMS_KEY)
  ]);
  const workspaceUrls = new Set(workspaceItems.map((item) => normalizeUrl(item.url).normalizedUrl).filter(Boolean));
  const laterUrls = new Set(laterItems.map((item) => normalizeUrl(item.url).normalizedUrl).filter(Boolean));
  const groupNames = await getTabGroupNameMap(tabs);
  const duplicateCounts = new Map<string, number>();
  const contexts = tabs.map((tab) => extractPageContext(tab));
  for (const context of contexts) {
    if (!context.normalizedUrl) continue;
    duplicateCounts.set(context.normalizedUrl, (duplicateCounts.get(context.normalizedUrl) || 0) + 1);
  }

  return tabs.map((tab, index) => {
    const context = contexts[index] ?? extractPageContext(tab);
    const snapshot: AiWindowTabSnapshot = {
      tabId: tab.id,
      windowId: tab.windowId,
      url: context.url,
      normalizedUrl: context.normalizedUrl,
      title: context.title || context.hostname || context.url,
      domain: context.domain || context.hostname,
      hostname: context.hostname,
      pageType: context.pageType,
      pinned: Boolean(tab.pinned),
      audible: Boolean(tab.audible),
      active: Boolean(tab.active),
      inWorkspace: workspaceUrls.has(context.normalizedUrl),
      inLater: laterUrls.has(context.normalizedUrl)
    };
    const groupName = typeof tab.groupId === "number" ? groupNames.get(tab.groupId) : undefined;
    if (groupName) snapshot.groupName = groupName;
    if ((duplicateCounts.get(context.normalizedUrl) || 0) > 1) snapshot.duplicateKey = context.normalizedUrl;
    return snapshot;
  });
}

function createAiWindowLocalSignals(tabs: AiWindowTabSnapshot[]): AiWindowLocalSignals {
  const duplicateGroups = new Map<string, AiWindowTabSnapshot[]>();
  for (const tab of tabs) {
    if (!tab.normalizedUrl) continue;
    if (!duplicateGroups.has(tab.normalizedUrl)) duplicateGroups.set(tab.normalizedUrl, []);
    duplicateGroups.get(tab.normalizedUrl)?.push(tab);
  }

  const protectedTabIds = tabs
    .filter((tab) => isAiWindowProtectedTab(tab))
    .map((tab) => tab.tabId);
  const protectedSet = new Set(protectedTabIds);
  const groups = Array.from(duplicateGroups.entries())
    .map(([duplicateKey, group]) => {
      if (group.length < 2) return null;
      const keeper = group.find((tab) => tab.active) || group.find((tab) => !protectedSet.has(tab.tabId)) || group[0];
      if (!keeper) return null;
      const duplicateTabIds = group
        .filter((tab) => tab.tabId !== keeper.tabId && !protectedSet.has(tab.tabId))
        .map((tab) => tab.tabId);
      if (!duplicateTabIds.length) return null;
      return {
        duplicateKey,
        keeperTabId: keeper.tabId,
        duplicateTabIds
      };
    })
    .filter((group): group is AiWindowLocalSignals["duplicateGroups"][number] => Boolean(group));

  return {
    duplicateGroups: groups,
    duplicateTabIds: groups.flatMap((group) => group.duplicateTabIds),
    protectedTabIds,
    alreadyWorkspaceTabIds: tabs.filter((tab) => tab.inWorkspace).map((tab) => tab.tabId),
    alreadyLaterTabIds: tabs.filter((tab) => tab.inLater).map((tab) => tab.tabId),
    activeTabIds: tabs.filter((tab) => tab.active).map((tab) => tab.tabId)
  };
}

function createLocalAiWindowActions(
  localSignals: AiWindowLocalSignals,
  tabs: AiWindowTabSnapshot[],
  language: AiWindowLanguage = "zh"
): AiWindowAction[] {
  if (!localSignals.duplicateTabIds.length) return [];
  const titleById = new Map(tabs.map((tab) => [tab.tabId, tab.title || tab.domain]));
  const preview = localSignals.duplicateTabIds
    .slice(0, 3)
    .map((tabId) => titleById.get(tabId))
    .filter(Boolean)
    .join(" / ");
  return [{
    id: "aiwin_local_close_duplicates",
    kind: "close_duplicate",
    tabIds: localSignals.duplicateTabIds,
    title: uiText(language, "closeLocalDuplicates"),
    reason: uiText(language, "closeLocalDuplicatesReason", {
      preview: preview ? uiText(language, "duplicatePreview", { preview }) : ""
    }),
    confidence: 0.98,
    contextId: "ctx_local_duplicates"
  }];
}

function mergeAiWindowWorkspaceCandidates(
  aiCandidates: AiWindowWorkspaceCandidate[],
  aiContexts: AiWindowPlan["contexts"],
  aiActions: AiWindowAction[],
  tabs: AiWindowTabSnapshot[],
  language: AiWindowLanguage = "zh"
): AiWindowWorkspaceCandidate[] {
  const validTabIds = new Set(tabs.map((tab) => tab.tabId));
  const candidates = aiCandidates.length
    ? aiCandidates
    : createWorkspaceCandidatesFromActions(aiContexts, aiActions, language);
  const seen = new Set<string>();
  return candidates
    .map((candidate, index) => normalizeAiWindowWorkspaceCandidate(candidate, index, validTabIds, language))
    .filter((candidate): candidate is AiWindowWorkspaceCandidate => {
      if (!candidate || seen.has(candidate.id)) return false;
      seen.add(candidate.id);
      return true;
    })
    .slice(0, 6);
}

function createWorkspaceCandidatesFromActions(
  contexts: AiWindowPlan["contexts"],
  actions: AiWindowAction[],
  language: AiWindowLanguage = "zh"
): AiWindowWorkspaceCandidate[] {
  const workspaceActions = actions.filter((action) =>
    action.kind === "workspace" &&
    !action.appliedAt &&
    Number(action.confidence || 0) >= 0.55
  );
  if (!workspaceActions.length) return [];

  const actionsByContext = new Map<string, AiWindowAction[]>();
  for (const action of actions) {
    if (!action.contextId) continue;
    if (!actionsByContext.has(action.contextId)) actionsByContext.set(action.contextId, []);
    actionsByContext.get(action.contextId)?.push(action);
  }

  const candidates: AiWindowWorkspaceCandidate[] = [];
  for (const context of contexts) {
    const contextActions = actionsByContext.get(context.id) || [];
    const contextWorkspaceActions = contextActions.filter((action) => action.kind === "workspace");
    if (!contextWorkspaceActions.length) continue;
    candidates.push({
      id: `ws_${context.id}`,
      title: context.title || contextWorkspaceActions[0]?.title || uiText(language, "currentTaskWorkspace"),
      summary: context.description || uiText(language, "workspaceSummary"),
      confidence: Math.max(...contextWorkspaceActions.map((action) => Number(action.confidence || 0.5))),
      tabIds: uniqueNumbers(contextWorkspaceActions.flatMap((action) => action.tabIds)),
      reviewTabIds: uniqueNumbers(contextActions.filter((action) => action.kind === "needs_review").flatMap((action) => action.tabIds)),
      excludedTabIds: uniqueNumbers(contextActions.filter((action) => action.kind === "later" || action.kind === "keep").flatMap((action) => action.tabIds)),
      reason: contextWorkspaceActions[0]?.reason || uiText(language, "aiSameTaskReason")
    });
  }

  if (candidates.length) return candidates;
  return [{
    id: "ws_current_task",
    title: workspaceActions[0]?.title || uiText(language, "currentTaskWorkspace"),
    summary: uiText(language, "aiCurrentTaskSummary"),
    confidence: Math.max(...workspaceActions.map((action) => Number(action.confidence || 0.5))),
    tabIds: uniqueNumbers(workspaceActions.flatMap((action) => action.tabIds)),
    reviewTabIds: uniqueNumbers(actions.filter((action) => action.kind === "needs_review").flatMap((action) => action.tabIds)),
    excludedTabIds: uniqueNumbers(actions.filter((action) => action.kind === "later" || action.kind === "keep").flatMap((action) => action.tabIds)),
    reason: workspaceActions[0]?.reason || uiText(language, "aiCurrentTaskReason")
  }];
}

function normalizeAiWindowWorkspaceCandidate(
  candidate: AiWindowWorkspaceCandidate,
  index: number,
  validTabIds: Set<number>,
  language: AiWindowLanguage = "zh"
): AiWindowWorkspaceCandidate | null {
  const tabIds = uniqueNumbers(candidate.tabIds).filter((tabId) => validTabIds.has(tabId));
  const reviewTabIds = uniqueNumbers(candidate.reviewTabIds).filter((tabId) => validTabIds.has(tabId) && !tabIds.includes(tabId));
  const excludedTabIds = uniqueNumbers(candidate.excludedTabIds).filter((tabId) =>
    validTabIds.has(tabId) &&
    !tabIds.includes(tabId) &&
    !reviewTabIds.includes(tabId)
  );
  if (!tabIds.length && !reviewTabIds.length) return null;
  return {
    id: (candidate.id || `ws_${index + 1}`).trim().replace(/[^\w-]/g, "").slice(0, 40) || `ws_${index + 1}`,
    title: (candidate.title || uiText(language, "taskWorkspaceIndexed", { index: index + 1 })).trim().slice(0, 36),
    summary: (candidate.summary || uiText(language, "workspaceCandidateFallback")).trim().slice(0, 140),
    confidence: Math.min(1, Math.max(0, Number(candidate.confidence || 0.5))),
    tabIds,
    reviewTabIds,
    excludedTabIds,
    reason: (candidate.reason || uiText(language, "workspaceReasonFallback")).trim().slice(0, 180)
  };
}

function uniqueNumbers(values: number[]): number[] {
  const seen = new Set<number>();
  const result: number[] = [];
  for (const value of values) {
    const number = Number(value);
    if (!Number.isInteger(number) || seen.has(number)) continue;
    seen.add(number);
    result.push(number);
  }
  return result;
}

function mergeAiWindowContexts(localContexts: AiWindowPlan["contexts"], aiContexts: AiWindowPlan["contexts"]): AiWindowPlan["contexts"] {
  const seen = new Set(localContexts.map((context) => context.id));
  const merged = [...localContexts];
  for (const context of aiContexts) {
    if (seen.has(context.id)) continue;
    seen.add(context.id);
    merged.push(context);
  }
  return merged.slice(0, 10);
}

function mergeAiWindowActions(localActions: AiWindowAction[], aiActions: AiWindowAction[]): AiWindowAction[] {
  const hasLocalDuplicateAction = localActions.some((action) => action.kind === "close_duplicate");
  const filteredAiActions = aiActions.filter((action) => !(hasLocalDuplicateAction && action.kind === "close_duplicate"));
  return [...localActions, ...filteredAiActions].slice(0, 28);
}

function isAiWindowProtectedTab(tab: AiWindowTabSnapshot): boolean {
  return tab.pinned ||
    tab.audible ||
    tab.active ||
    ["login", "oauth", "payment", "checkout", "invoice", "captcha"].includes(tab.pageType);
}

async function getTabGroupNameMap(tabs: chrome.tabs.Tab[]): Promise<Map<number, string>> {
  const groupIds = Array.from(new Set(tabs
    .map((tab) => tab.groupId)
    .filter((groupId): groupId is number => typeof groupId === "number" && groupId >= 0)));
  const entries = await Promise.all(groupIds.map(async (groupId) => {
    const group = await chrome.tabGroups.get(groupId).catch(() => null);
    const title = (group?.title || "").trim();
    return title ? [groupId, title] as const : null;
  }));
  return new Map(entries.filter((entry): entry is readonly [number, string] => Boolean(entry)));
}

async function appendAiWindowPlan(plan: AiWindowPlan, maxCount = 50): Promise<void> {
  const plans = await getLocalArray<AiWindowPlan>(STORAGE_KEYS.aiWindowPlans);
  await chrome.storage.local.set({
    [STORAGE_KEYS.aiWindowPlans]: [plan, ...plans]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, maxCount)
  });
}

async function applyAiWindowPlan(planId: string, actionIds: string[]): Promise<AiWindowPlan> {
  if (!planId) throw new Error("planId is required");
  if (!actionIds.length) throw new Error("至少选择一个整理动作");

  const plans = await getLocalArray<AiWindowPlan>(STORAGE_KEYS.aiWindowPlans);
  const plan = plans.find((item) => item.id === planId);
  if (!plan) throw new Error("整理方案不存在");

  const selectedIds = new Set(actionIds);
  const now = Date.now();
  const nextActions: AiWindowAction[] = [];
  const appliedSummary = createAiWindowAppliedSummary(plan.appliedSummary);
  for (const action of plan.actions) {
    if (!selectedIds.has(action.id)) {
      nextActions.push(action);
      continue;
    }
    if (action.appliedAt) {
      appliedSummary.failed += 1;
      nextActions.push({
        ...action,
        error: "动作已应用，不能重复执行。"
      });
      continue;
    }
    try {
      const affectedCount = await executeAiWindowAction(action);
      const { error: _error, ...withoutError } = action;
      nextActions.push({ ...withoutError, appliedAt: now });
      appliedSummary.appliedActions += 1;
      addAiWindowAppliedCount(appliedSummary, action.kind, affectedCount);
    } catch (error) {
      appliedSummary.failed += 1;
      nextActions.push({
        ...action,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  const selectedActions = nextActions.filter((action) => selectedIds.has(action.id));
  const failed = selectedActions.some((action) => Boolean(action.error));
  const applied = selectedActions.filter((action) => action.appliedAt && !action.error).length;
  const nextPlan: AiWindowPlan = {
    ...plan,
    actions: nextActions,
    status: failed ? "failed" : applied >= selectedActions.length ? "applied" : "partially_applied",
    appliedSummary,
    updatedAt: now
  };
  await chrome.storage.local.set({
    [STORAGE_KEYS.aiWindowPlans]: [nextPlan, ...plans.filter((item) => item.id !== plan.id)]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 50)
  });
  return nextPlan;
}

async function recordAiWindowFeedback(planId: string, actionId: string, feedback: unknown): Promise<AiWindowPlan> {
  if (!planId || !actionId) throw new Error("planId and actionId are required");
  const plans = await getLocalArray<AiWindowPlan>(STORAGE_KEYS.aiWindowPlans);
  const plan = plans.find((item) => item.id === planId);
  if (!plan) throw new Error("整理方案不存在");
  const action = plan.actions.find((item) => item.id === actionId);
  if (!action) throw new Error("整理建议不存在");
  const now = Date.now();
  const nextPlan: AiWindowPlan = {
    ...plan,
    actions: plan.actions.map((item) =>
      item.id === actionId ? { ...item, feedbackStatus: "incorrect" } : item
    ),
    updatedAt: now
  };
  await chrome.storage.local.set({
    [STORAGE_KEYS.aiWindowPlans]: [nextPlan, ...plans.filter((item) => item.id !== plan.id)]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 50)
  });

  const feedbackText = feedback && typeof feedback === "object" && typeof (feedback as { message?: unknown }).message === "string"
    ? ((feedback as { message: string }).message.trim() || "用户标记窗口整理建议不准。")
    : "用户标记窗口整理建议不准。";
  await saveQuickFeedback({
    kind: "AI 窗口整理反馈",
    message: `${action.title}：${feedbackText}`,
    url: plan.tabs.find((tab) => action.tabIds.includes(tab.tabId))?.url || "",
    title: plan.summary,
    createdAt: now
  });
  return nextPlan;
}

async function resolveAiWindowAction(planId: string, actionId: string, resolutionValue: string): Promise<AiWindowPlan> {
  const allowed = new Set<AiWindowManualResolution>(["workspace", "later", "keep"]);
  if (!allowed.has(resolutionValue as AiWindowManualResolution)) throw new Error("Unsupported resolution");
  const resolution = resolutionValue as AiWindowManualResolution;
  if (!planId || !actionId) throw new Error("planId and actionId are required");

  const plans = await getLocalArray<AiWindowPlan>(STORAGE_KEYS.aiWindowPlans);
  const plan = plans.find((item) => item.id === planId);
  if (!plan) throw new Error("整理方案不存在");
  const action = plan.actions.find((item) => item.id === actionId);
  if (!action) throw new Error("整理建议不存在");
  if (action.kind !== "needs_review") throw new Error("只有需确认建议可以手动处理");
  if (action.appliedAt || action.resolvedAs) throw new Error("该建议已处理，不能重复处理");

  const now = Date.now();
  const appliedSummary = createAiWindowAppliedSummary(plan.appliedSummary);
  try {
    if (resolution === "workspace") {
      const tabs = await getExistingTabs(action.tabIds);
      if (!tabs.length) throw new Error("标签页已不存在");
      appliedSummary.workspace += await addTabsToWorkspaceWithoutRuleWrites(tabs);
    } else if (resolution === "later") {
      const tabs = await getExistingTabs(action.tabIds);
      if (!tabs.length) throw new Error("标签页已不存在");
      await saveTabsForLaterFromBackground(tabs);
      appliedSummary.later += tabs.length;
    }
    appliedSummary.appliedActions += 1;
  } catch (error) {
    appliedSummary.failed += 1;
    const failedPlan = updateAiWindowPlanAction(plan, actionId, {
      error: error instanceof Error ? error.message : String(error)
    }, appliedSummary, now);
    await storeAiWindowPlan(failedPlan, plans);
    return failedPlan;
  }

  const nextPlan = updateAiWindowPlanAction(plan, actionId, {
    appliedAt: now,
    resolvedAs: resolution
  }, appliedSummary, now);
  await storeAiWindowPlan(nextPlan, plans);
  return nextPlan;
}

async function enterAiWindowWorkspace(planId: string, candidateId: string, selectedTabIds?: number[]): Promise<AiWindowPlan> {
  if (!planId || !candidateId) throw new Error("planId and candidateId are required");
  const plans = await getLocalArray<AiWindowPlan>(STORAGE_KEYS.aiWindowPlans);
  const plan = plans.find((item) => item.id === planId);
  if (!plan) throw new Error("整理方案不存在");
  const candidate = (plan.workspaceCandidates || []).find((item) => item.id === candidateId);
  if (!candidate) throw new Error("工作台建议不存在");
  if (candidate.appliedAt) throw new Error("该工作台建议已进入，不能重复执行");

  const allowedTabIds = new Set([...(candidate.tabIds || []), ...(candidate.reviewTabIds || [])]);
  const requestedTabIds = selectedTabIds?.length
    ? uniqueNumbers(selectedTabIds).filter((tabId) => allowedTabIds.has(tabId))
    : uniqueNumbers(candidate.tabIds || []);
  if (!requestedTabIds.length) throw new Error("至少选择一个页面进入工作台");

  const now = Date.now();
  const appliedSummary = createAiWindowAppliedSummary(plan.appliedSummary);
  const tabs = await getExistingTabs(requestedTabIds);
  const missingCount = Math.max(0, requestedTabIds.length - tabs.length);
  try {
    if (!tabs.length) throw new Error("标签页已不存在");
    const addedCount = await addTabsToWorkspaceWithoutRuleWrites(tabs);
    await saveWorkspaceTaskFromCandidate(plan, candidate, tabs, now);
    const skippedCount = Math.max(0, requestedTabIds.length - addedCount);
    appliedSummary.workspace += addedCount;
    appliedSummary.appliedActions += 1;
    const nextPlan: AiWindowPlan = {
      ...plan,
      workspaceCandidates: (plan.workspaceCandidates || []).map((item) =>
        item.id === candidateId
          ? (() => {
            const { error: _error, ...withoutError } = item;
            return {
              ...withoutError,
              appliedAt: now,
              appliedSummary: {
                workspace: addedCount,
                skipped: skippedCount,
                failed: 0
              }
            };
          })()
          : item
      ),
      status: "partially_applied",
      appliedSummary,
      updatedAt: now
    };
    await storeAiWindowPlan(nextPlan, plans);
    return nextPlan;
  } catch (error) {
    appliedSummary.failed += Math.max(1, missingCount);
    const nextPlan: AiWindowPlan = {
      ...plan,
      workspaceCandidates: (plan.workspaceCandidates || []).map((item) =>
        item.id === candidateId
          ? {
            ...item,
            appliedSummary: {
              workspace: 0,
              skipped: missingCount,
              failed: Math.max(1, missingCount)
            },
            error: error instanceof Error ? error.message : String(error)
          }
          : item
      ),
      status: "failed",
      appliedSummary,
      updatedAt: now
    };
    await storeAiWindowPlan(nextPlan, plans);
    return nextPlan;
  }
}

function updateAiWindowPlanAction(
  plan: AiWindowPlan,
  actionId: string,
  patch: Partial<AiWindowAction>,
  appliedSummary: AiWindowAppliedSummary,
  now: number
): AiWindowPlan {
  const nextActions = plan.actions.map((item) => {
    if (item.id !== actionId) return item;
    const { error: _error, ...withoutError } = item;
    return {
      ...withoutError,
      ...patch
    };
  });
  const selected = nextActions.find((item) => item.id === actionId);
  const failed = Boolean(selected?.error);
  return {
    ...plan,
    actions: nextActions,
    status: failed ? "failed" : "partially_applied",
    appliedSummary,
    updatedAt: now
  };
}

async function storeAiWindowPlan(plan: AiWindowPlan, plans: AiWindowPlan[]): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.aiWindowPlans]: [plan, ...plans.filter((item) => item.id !== plan.id)]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 50)
  });
}

function createAiWindowAppliedSummary(current?: AiWindowAppliedSummary): AiWindowAppliedSummary {
  return {
    workspace: Math.max(0, Math.floor(Number(current?.workspace || 0))),
    later: Math.max(0, Math.floor(Number(current?.later || 0))),
    closeDuplicate: Math.max(0, Math.floor(Number(current?.closeDuplicate || 0))),
    group: Math.max(0, Math.floor(Number(current?.group || 0))),
    failed: Math.max(0, Math.floor(Number(current?.failed || 0))),
    appliedActions: Math.max(0, Math.floor(Number(current?.appliedActions || 0)))
  };
}

function addAiWindowAppliedCount(summary: AiWindowAppliedSummary, kind: AiWindowAction["kind"], count: number): void {
  const safeCount = Math.max(0, Math.floor(Number(count || 0)));
  if (kind === "workspace") summary.workspace += safeCount;
  if (kind === "later") summary.later += safeCount;
  if (kind === "close_duplicate") summary.closeDuplicate += safeCount;
  if (kind === "group") summary.group += safeCount;
}

async function executeAiWindowAction(action: AiWindowAction): Promise<number> {
  if (action.kind === "keep" || action.kind === "needs_review") return 0;
  const tabs = await getExistingTabs(action.tabIds);
  if (!tabs.length) throw new Error("标签页已不存在");

  if (action.kind === "workspace") {
    return addTabsToWorkspaceWithoutRuleWrites(tabs);
  }
  if (action.kind === "later") {
    await saveTabsForLaterFromBackground(tabs);
    return tabs.length;
  }
  if (action.kind === "close_duplicate") {
    await chrome.tabs.remove(tabs.map((tab) => tab.id));
    return tabs.length;
  }
  if (action.kind === "group") {
    const groupName = (action.groupName || action.title || "").trim();
    if (!groupName) throw new Error("缺少分组名称");
    await groupTabsIntoNamedGroup(tabs.map((tab) => tab.id), groupName);
    return tabs.length;
  }
  return 0;
}

async function getExistingTabs(tabIds: number[]): Promise<Array<chrome.tabs.Tab & { id: number; url: string }>> {
  const tabs = await Promise.all(tabIds.map((tabId) => chrome.tabs.get(tabId).catch(() => null)));
  return tabs.filter((tab): tab is chrome.tabs.Tab & { id: number; url: string } =>
    Boolean(tab && typeof tab.id === "number" && typeof tab.url === "string" && isOrdinaryWebPageUrl(tab.url))
  );
}

async function addTabsToWorkspaceWithoutRuleWrites(tabs: Array<chrome.tabs.Tab & { id: number; url: string }>): Promise<number> {
  const items = await getLocalArray<WorkspaceItem>(WORKSPACE_ITEMS_KEY);
  const existingUrls = new Set(items.map((item) => normalizeUrl(item.url).normalizedUrl).filter(Boolean));
  const now = Date.now();
  const nextItems: WorkspaceItem[] = [];
  for (const tab of tabs) {
    const context = extractPageContext(tab, now);
    if (!context.normalizedUrl || existingUrls.has(context.normalizedUrl)) continue;
    existingUrls.add(context.normalizedUrl);
    nextItems.push({
      id: `${now}_${tab.id}`,
      url: context.url,
      title: context.title || context.hostname || context.url,
      addedAt: now
    });
  }
  await groupTabsIntoNamedGroup(tabs.map((tab) => tab.id), WORKSPACE_GROUP_NAME, "green");
  await chrome.storage.local.set({
    [WORKSPACE_ITEMS_KEY]: normalizeWorkspaceItems([...nextItems, ...items])
  });
  return nextItems.length;
}

async function saveTabsForLaterFromBackground(tabs: Array<chrome.tabs.Tab & { id: number; url: string }>): Promise<void> {
  const items = await getLocalArray<LaterItem>(LATER_ITEMS_KEY);
  const existingUrls = new Set(items.map((item) => normalizeUrl(item.url).normalizedUrl).filter(Boolean));
  const now = Date.now();
  const nextItems: LaterItem[] = [];
  for (const tab of tabs) {
    const context = extractPageContext(tab, now);
    if (!context.normalizedUrl || existingUrls.has(context.normalizedUrl)) continue;
    existingUrls.add(context.normalizedUrl);
    nextItems.push({
      id: `${now}_${tab.id}`,
      url: context.url,
      title: context.title || context.hostname || context.url,
      savedAt: now
    });
  }
  await chrome.storage.local.set({
    [LATER_ITEMS_KEY]: [...nextItems, ...items].slice(0, 200)
  });
}

async function acceptAiSuggestion(suggestionId: string): Promise<AiSuggestion[]> {
  const suggestions = await getLocalArray<AiSuggestion>(STORAGE_KEYS.aiSuggestions);
  const suggestion = suggestions.find((item) => item.id === suggestionId);
  if (!suggestion) throw new Error("AI suggestion not found");

  const now = Date.now();
  const rule = createAiSuggestionRule(suggestion, now);

  const rules = await getLocalArray<UserRule>(STORAGE_KEYS.userRules);
  const nextSuggestions = suggestions.map((item) =>
    item.id === suggestionId ? { ...item, status: "accepted" as const, updatedAt: now } : item
  );
  await chrome.storage.local.set({
    [STORAGE_KEYS.userRules]: upsertUserRule(rules, rule),
    [STORAGE_KEYS.aiSuggestions]: nextSuggestions
  });

  const tabs = await chrome.tabs.query({});
  const matchingTabs = tabs.filter((tab) => tabMatchesSuggestionScope(tab, suggestion));
  for (const tab of matchingTabs) {
    if (typeof tab.id === "number") await classifyTabById(tab.id, "ai-suggestion-accepted");
  }

  return nextSuggestions.filter((item) => item.status === "pending");
}

function createAiSuggestionRule(suggestion: AiSuggestion, now: number): UserRule {
  const scopeKey = getSuggestionScopeKey(suggestion);
  const scoped = Boolean(scopeKey);
  const rule: UserRule = {
    id: makeId("rule"),
    type: scoped ? "path_pattern" : "domain",
    action: "group",
    value: scoped ? scopeKey : suggestion.domain,
    groupName: suggestion.groupName,
    enabled: true,
    priority: 90,
    createdAt: now,
    updatedAt: now,
    source: "ai",
    description: scoped ? "用户接受 AI 建议后生成，限定同站路径模式。" : "用户接受旧版 AI 建议后生成。"
  };
  if (suggestion.groupColor) rule.groupColor = suggestion.groupColor;
  return rule;
}

function tabMatchesSuggestionScope(tab: chrome.tabs.Tab, suggestion: AiSuggestion): boolean {
  if (!tab.url) return false;
  const scopeKey = getSuggestionScopeKey(suggestion);
  if (scopeKey) {
    const context = extractPageContext(tab);
    return createAiScopeKey(context) === scopeKey;
  }

  try {
    const host = new URL(tab.url).hostname;
    return domainMatches(host, suggestion.domain);
  } catch {
    return false;
  }
}

async function updateAiSuggestionStatus(
  suggestionId: string,
  status: AiSuggestion["status"]
): Promise<AiSuggestion[]> {
  const suggestions = await getLocalArray<AiSuggestion>(STORAGE_KEYS.aiSuggestions);
  const now = Date.now();
  const next = suggestions.map((item) =>
    item.id === suggestionId ? { ...item, status, updatedAt: now, lastAskedAt: now } : item
  );
  await chrome.storage.local.set({ [STORAGE_KEYS.aiSuggestions]: next });
  return next.filter((item) => item.status === "pending");
}

async function applyFeedbackFromLog(
  logId: string,
  action: string,
  targetGroupName: unknown
): Promise<UserRule[]> {
  const logs = await getLocalArray<GroupActionLog>(STORAGE_KEYS.groupActionLogs);
  const log = logs.find((item) => item.id === logId);
  if (!log) throw new Error("Action log not found");

  const tab = {
    id: log.tabId,
    windowId: log.windowId,
    url: log.url,
    title: log.title
  } as chrome.tabs.Tab;
  if (typeof log.groupId === "number") tab.groupId = log.groupId;
  const context = extractPageContext(tab);
  const feedback = createFeedbackFromLog(log, context, action, targetGroupName);
  const settings = await getSettings();
  const rules = await getLocalArray<UserRule>(STORAGE_KEYS.userRules);
  const memories = await getLocalArray<GroupMemory>(STORAGE_KEYS.groupMemories);
  const result = handleFeedback(feedback, context, settings, rules, memories);
  await chrome.storage.local.set({
    [STORAGE_KEYS.userRules]: result.rules,
    [STORAGE_KEYS.groupMemories]: result.memories
  });
  return result.rules;
}

function createFeedbackFromLog(
  log: GroupActionLog,
  context: PageContext,
  action: string,
  targetGroupName: unknown
): GroupFeedback {
  const allowed = new Set<GroupFeedback["action"]>([
    "always_page",
    "always_path",
    "always_site",
    "never_site"
  ]);
  if (!allowed.has(action as GroupFeedback["action"])) throw new Error("Unsupported feedback action");

  const groupName = typeof targetGroupName === "string" && targetGroupName.trim()
    ? targetGroupName.trim()
    : log.groupName || "";
  if (action !== "never_site" && !groupName) throw new Error("targetGroupName is required");

  const feedback: GroupFeedback = {
    id: makeId("feedback"),
    logId: log.id,
    tabId: log.tabId,
    action: action as GroupFeedback["action"],
    url: log.url,
    normalizedUrl: log.normalizedUrl,
    domain: context.domain || context.hostname,
    pathPattern: `${context.origin}${context.pathPattern}`,
    createdAt: Date.now()
  };
  if (groupName) feedback.targetGroupName = groupName;
  return feedback;
}

interface WorkspaceItem {
  id: string;
  url: string;
  title: string;
  addedAt: number;
  previousGroupName?: string;
  previousGroupColor?: chrome.tabGroups.ColorEnum;
}

async function getWorkspaceTask(): Promise<WorkspaceTask | null> {
  const result = await chrome.storage.local.get(WORKSPACE_TASK_KEY);
  return normalizeWorkspaceTask(result[WORKSPACE_TASK_KEY]);
}

async function clearWorkspaceTask(): Promise<void> {
  await chrome.storage.local.set({ [WORKSPACE_TASK_KEY]: null });
}

async function saveWorkspaceTaskFromCandidate(
  plan: AiWindowPlan,
  candidate: AiWindowWorkspaceCandidate,
  tabs: Array<chrome.tabs.Tab & { id: number; url: string }>,
  now = Date.now()
): Promise<WorkspaceTask> {
  const tabUrls = uniqueStrings(tabs.map((tab) => extractPageContext(tab, now).url));
  const task: WorkspaceTask = {
    id: makeId("workspace_task"),
    title: normalizeWorkspaceTaskText(candidate.title, "当前工作台任务", 48),
    summary: normalizeWorkspaceTaskText(candidate.summary || candidate.reason, "这些页面属于同一个可继续处理的工作台任务。", 180),
    tabUrls,
    sourcePlanId: plan.id,
    sourceCandidateId: candidate.id,
    createdAt: now,
    updatedAt: now
  };
  await chrome.storage.local.set({ [WORKSPACE_TASK_KEY]: task });
  return task;
}

function normalizeWorkspaceTask(value: unknown): WorkspaceTask | null {
  const input = value && typeof value === "object" ? value as Partial<WorkspaceTask> : {};
  const title = normalizeWorkspaceTaskText(input.title, "", 48);
  if (!title) return null;
  const now = Date.now();
  const task: WorkspaceTask = {
    id: typeof input.id === "string" && input.id.trim() ? input.id.trim() : makeId("workspace_task"),
    title,
    summary: normalizeWorkspaceTaskText(input.summary, "", 180),
    tabUrls: uniqueStrings(Array.isArray(input.tabUrls) ? input.tabUrls : []),
    createdAt: typeof input.createdAt === "number" ? input.createdAt : now,
    updatedAt: typeof input.updatedAt === "number" ? input.updatedAt : now
  };
  if (typeof input.sourcePlanId === "string" && input.sourcePlanId.trim()) task.sourcePlanId = input.sourcePlanId.trim();
  if (typeof input.sourceCandidateId === "string" && input.sourceCandidateId.trim()) task.sourceCandidateId = input.sourceCandidateId.trim();
  return task;
}

function normalizeWorkspaceTaskText(value: unknown, fallback: string, maxLength: number): string {
  const text = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  return (text || fallback).slice(0, maxLength);
}

function uniqueStrings(values: unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
  }
  return result;
}

interface LaterItem {
  id: string;
  url: string;
  title: string;
  savedAt: number;
}

interface QuickFeedbackItem {
  id: string;
  kind: string;
  message: string;
  url: string;
  title: string;
  createdAt: number;
}

async function addCurrentTabToWorkspace(tab?: chrome.tabs.Tab): Promise<{ added: boolean; alreadyExists: boolean; itemCount: number }> {
  if (!tab || typeof tab.id !== "number" || !tab.url) throw new Error("当前页面不可加入工作台");
  const context = extractPageContext(tab);
  if (context.isSystemPage || !/^https?:\/\//i.test(context.url)) throw new Error("当前页面不可加入工作台");

  const items = await getLocalArray<WorkspaceItem>(WORKSPACE_ITEMS_KEY);
  const existing = items.find((item) => normalizeUrl(item.url).normalizedUrl === context.normalizedUrl);
  const restoreMeta = await getWorkspaceRestoreMeta(tab);
  const next = existing
    ? normalizeWorkspaceItems(items.map((item) =>
      item === existing ? mergeWorkspaceRestoreMeta(item, restoreMeta) : item
    ))
    : normalizeWorkspaceItems([
      mergeWorkspaceRestoreMeta({
        id: `${Date.now()}_${tab.id}`,
        url: context.url,
        title: context.title || context.hostname || context.url,
        addedAt: Date.now()
      }, restoreMeta),
      ...items
    ]);

  await groupTabsIntoWorkspace([tab.id]);
  await chrome.storage.local.set({ [WORKSPACE_ITEMS_KEY]: next });
  return { added: !existing, alreadyExists: Boolean(existing), itemCount: next.length };
}

async function resolveCurrentTab(senderTab?: chrome.tabs.Tab): Promise<chrome.tabs.Tab | undefined> {
  if (typeof senderTab?.id === "number") {
    const tab = await chrome.tabs.get(senderTab.id).catch(() => null);
    if (tab) return tab;
  }
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return activeTab;
}

async function isTabInWorkspaceGroup(tab: chrome.tabs.Tab): Promise<boolean> {
  if (typeof tab.groupId !== "number" || tab.groupId < 0) return false;
  try {
    const group = await chrome.tabGroups.get(tab.groupId);
    return (group.title || "").trim() === WORKSPACE_GROUP_NAME;
  } catch {
    return false;
  }
}

async function getWorkspaceRestoreMeta(tab: chrome.tabs.Tab): Promise<Pick<WorkspaceItem, "previousGroupName" | "previousGroupColor">> {
  if (typeof tab.groupId !== "number" || tab.groupId < 0) return {};
  try {
    const group = await chrome.tabGroups.get(tab.groupId);
    const groupName = (group.title || "").trim();
    if (!groupName || groupName === WORKSPACE_GROUP_NAME) return {};
    const meta: Pick<WorkspaceItem, "previousGroupName" | "previousGroupColor"> = {
      previousGroupName: groupName
    };
    if (group.color) meta.previousGroupColor = group.color;
    return meta;
  } catch {
    return {};
  }
}

function mergeWorkspaceRestoreMeta(
  item: WorkspaceItem,
  meta: Pick<WorkspaceItem, "previousGroupName" | "previousGroupColor">
): WorkspaceItem {
  if (!meta.previousGroupName) return item;
  const next: WorkspaceItem = {
    ...item,
    previousGroupName: meta.previousGroupName
  };
  if (meta.previousGroupColor) next.previousGroupColor = meta.previousGroupColor;
  return next;
}

async function saveQuickFeedback(value: unknown): Promise<QuickFeedbackItem[]> {
  const input = value && typeof value === "object" ? value as Partial<QuickFeedbackItem> : {};
  const message = typeof input.message === "string" ? input.message.trim() : "";
  if (!message) throw new Error("反馈内容不能为空");

  const now = Date.now();
  const item: QuickFeedbackItem = {
    id: makeId("feedback"),
    kind: typeof input.kind === "string" && input.kind.trim() ? input.kind.trim() : "反馈",
    message,
    url: typeof input.url === "string" ? input.url : "",
    title: typeof input.title === "string" ? input.title : "",
    createdAt: typeof input.createdAt === "number" ? input.createdAt : now
  };
  const items = await getLocalArray<QuickFeedbackItem>(QUICK_FEEDBACK_KEY);
  const next = [item, ...items].slice(0, 200);
  await chrome.storage.local.set({ [QUICK_FEEDBACK_KEY]: next });
  return next;
}

function normalizeWorkspaceItems(items: WorkspaceItem[]): WorkspaceItem[] {
  const seen = new Set<string>();
  const normalized: WorkspaceItem[] = [];
  for (const item of items) {
    if (!item?.url) continue;
    const key = normalizeUrl(item.url).normalizedUrl;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    normalized.push(item);
    if (normalized.length >= WORKSPACE_LIMIT) break;
  }
  return normalized;
}

function isWorkspaceItemLike(value: unknown): value is WorkspaceItem {
  return Boolean(value && typeof value === "object" && typeof (value as Partial<WorkspaceItem>).url === "string");
}

async function rememberManualCategoryRules(
  rules: UserRule[],
  tabIds: number[],
  groupName: string,
  description = "控制台手动分类生成，优先级高于自动分类。"
): Promise<UserRule[]> {
  const now = Date.now();
  const contexts = (await Promise.all(tabIds.map(async (tabId) => {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    return tab ? extractPageContext(tab, now) : null;
  }))).filter((context): context is PageContext => Boolean(context?.normalizedUrl));
  const normalizedUrls = Array.from(new Set(contexts.map((context) => context.normalizedUrl)));
  if (!normalizedUrls.length) return rules;

  const retainedRules = rules.filter((rule) =>
    !(rule.type === "normalized_url" && normalizedUrls.includes(rule.value))
  );
  const manualRules: UserRule[] = normalizedUrls.map((value) => ({
    id: makeId("rule"),
    type: "normalized_url",
    action: "group",
    value,
    groupName,
    enabled: true,
    priority: 1000,
    createdAt: now,
    updatedAt: now,
    source: "user",
    description
  }));

  return [...manualRules, ...retainedRules];
}

async function classifyOpenWorkspaceTabs(urls: string[], items: WorkspaceItem[] = []): Promise<number> {
  const targetMap = new Map<string, WorkspaceItem>();
  for (const item of items) {
    const key = normalizeUrl(item.url).normalizedUrl;
    if (key && !targetMap.has(key)) targetMap.set(key, item);
  }
  for (const url of urls) {
    const key = normalizeUrl(url).normalizedUrl;
    if (key && !targetMap.has(key)) {
      targetMap.set(key, {
        id: key,
        url,
        title: url,
        addedAt: Date.now()
      });
    }
  }
  if (!targetMap.size) return 0;

  const tabs = await chrome.tabs.query({});
  const matchingIds = tabs
    .map((tab) => {
      if (typeof tab.id !== "number" || !tab.url) return null;
      const context = extractPageContext(tab);
      return targetMap.has(context.normalizedUrl) ? tab.id : null;
    })
    .filter((tabId): tabId is number => typeof tabId === "number");

  for (const tabId of matchingIds) {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    const key = tab?.url ? extractPageContext(tab).normalizedUrl : "";
    const item = key ? targetMap.get(key) : undefined;
    const restored = item ? await restoreWorkspaceSourceGroup(tabId, item) : false;
    if (!restored) await classifyTabById(tabId, "workspace_clear");
  }
  return matchingIds.length;
}

async function groupTabsIntoWorkspace(tabIds: number[]): Promise<void> {
  await rememberWorkspaceSourceGroups(tabIds);
  await groupTabsIntoNamedGroup(tabIds, WORKSPACE_GROUP_NAME, "green");
}

async function groupTabsIntoNamedGroup(
  tabIds: number[],
  groupName: string,
  groupColor?: chrome.tabGroups.ColorEnum
): Promise<void> {
  const uniqueIds = Array.from(new Set(tabIds.filter(Number.isInteger)));
  if (!uniqueIds.length) return;
  programmaticMoveLocks.lock(uniqueIds);

  const tabs = (await Promise.all(uniqueIds.map((tabId) => chrome.tabs.get(tabId).catch(() => null))))
    .filter((tab): tab is chrome.tabs.Tab & { id: number; windowId: number } =>
      tab !== null && typeof tab.id === "number" && typeof tab.windowId === "number"
    );
  const tabsByWindow = new Map<number, number[]>();
  for (const tab of tabs) {
    if (!tabsByWindow.has(tab.windowId)) tabsByWindow.set(tab.windowId, []);
    tabsByWindow.get(tab.windowId)?.push(tab.id);
  }

  for (const [windowId, ids] of tabsByWindow.entries()) {
    const groupId = await withGroupTitleLock(windowId, groupName, async () => {
      const existing = await findCanonicalGroupByTitle(windowId, groupName);
      const targetGroupId = existing
        ? await chrome.tabs.group({ tabIds: ids, groupId: existing.id })
        : await chrome.tabs.group({ tabIds: ids });
      const update: chrome.tabGroups.UpdateProperties = { title: groupName };
      if (groupColor) update.color = groupColor;
      await chrome.tabGroups.update(targetGroupId, update);
      return targetGroupId;
    });
    if (groupName === WORKSPACE_GROUP_NAME) await moveTabsToWindowEnd(ids, windowId);
  }
}

async function moveTabsToWindowEnd(tabIds: number[], windowId: number): Promise<void> {
  const uniqueIds = Array.from(new Set(tabIds.filter(Number.isInteger)));
  if (!uniqueIds.length) return;
  await chrome.tabs.move(uniqueIds, { windowId, index: -1 }).catch(() => undefined);
}

async function rememberWorkspaceSourceGroups(tabIds: number[]): Promise<void> {
  const uniqueIds = Array.from(new Set(tabIds.filter(Number.isInteger)));
  if (!uniqueIds.length) return;

  const tabs = (await Promise.all(uniqueIds.map((tabId) => chrome.tabs.get(tabId).catch(() => null))))
    .filter((tab): tab is chrome.tabs.Tab & { id: number } => tab !== null && typeof tab.id === "number");
  const tabsBySourceGroup = new Map<string, number[]>();

  for (const tab of tabs) {
    const meta = await getWorkspaceRestoreMeta(tab);
    if (!meta.previousGroupName) continue;
    if (!tabsBySourceGroup.has(meta.previousGroupName)) tabsBySourceGroup.set(meta.previousGroupName, []);
    tabsBySourceGroup.get(meta.previousGroupName)?.push(tab.id);
  }

  if (!tabsBySourceGroup.size) return;
  let rules = await getLocalArray<UserRule>(STORAGE_KEYS.userRules);
  for (const [groupName, ids] of tabsBySourceGroup.entries()) {
    rules = await rememberManualCategoryRules(
      rules,
      ids,
      groupName,
      "加入工作台前的原分组记录；工作台只是临时停靠，不覆盖页面本来的分类。"
    );
  }
  await chrome.storage.local.set({ [STORAGE_KEYS.userRules]: rules });
}

async function restoreWorkspaceSourceGroup(tabId: number, item: WorkspaceItem): Promise<boolean> {
  const groupName = String(item.previousGroupName || "").trim();
  if (!groupName || groupName === WORKSPACE_GROUP_NAME) return false;
  await groupTabsIntoNamedGroup([tabId], groupName, item.previousGroupColor);

  const rules = await getLocalArray<UserRule>(STORAGE_KEYS.userRules);
  const next = await rememberManualCategoryRules(
    rules,
    [tabId],
    groupName,
    "清空工作台时还原到加入工作台前的分组。"
  );
  await chrome.storage.local.set({ [STORAGE_KEYS.userRules]: next });
  return true;
}

registerAutoGroupingServiceWorker();
