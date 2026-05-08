import type { CustomGroupConfig, GroupMemory, UserRule } from "../types";
import { makeId } from "../utils/id";
import {
  createDefaultLocalStorage,
  createDefaultSettings,
  LOCAL_SCHEMA_VERSION,
  STORAGE_KEYS,
  SYNC_SCHEMA_VERSION
} from "./schema";

type LegacyAssignmentRule = {
  id?: string;
  type?: string;
  action?: string;
  value?: string;
  groupName?: string;
  groupColor?: chrome.tabGroups.ColorEnum;
  enabled?: boolean;
  priority?: number;
  createdAt?: number;
  updatedAt?: number;
  description?: string;
};

type LegacyStableAssignment = {
  groupName?: string;
  groupColor?: chrome.tabGroups.ColorEnum;
  confidence?: number;
  hitCount?: number;
  correctionCount?: number;
  createdAt?: number;
  lastUsedAt?: number;
  updatedAt?: number;
  expiresAt?: number;
  source?: GroupMemory["source"];
  sampleUrls?: string[];
  sampleTitles?: string[];
  reason?: string;
};

const USER_RULE_TYPES = new Set<UserRule["type"]>([
  "exact_url",
  "normalized_url",
  "path_pattern",
  "origin",
  "domain",
  "keyword",
  "regex"
]);

const USER_RULE_ACTIONS = new Set<UserRule["action"]>([
  "group",
  "never_group",
  "exclude_group"
]);

function normalizeLegacyRule(rule: LegacyAssignmentRule, index: number): UserRule | null {
  if (!rule.value) return null;

  const type = USER_RULE_TYPES.has(rule.type as UserRule["type"])
    ? (rule.type as UserRule["type"])
    : "domain";
  const action = USER_RULE_ACTIONS.has(rule.action as UserRule["action"])
    ? (rule.action as UserRule["action"])
    : "group";

  if (action === "group" && !rule.groupName) return null;

  const now = Date.now();
  const normalized: UserRule = {
    id: rule.id || makeId("rule"),
    type,
    action,
    value: rule.value,
    enabled: rule.enabled ?? true,
    priority: rule.priority ?? index,
    createdAt: rule.createdAt ?? now,
    updatedAt: rule.updatedAt ?? now,
    source: "migration"
  };

  if (rule.groupName) normalized.groupName = rule.groupName;
  if (rule.groupColor) normalized.groupColor = rule.groupColor;
  if (rule.description) normalized.description = rule.description;

  return normalized;
}

function inferMemoryKeyType(key: string): GroupMemory["keyType"] {
  if (key.startsWith("url:")) return "normalized_url";
  if (key.startsWith("path:")) return "path_pattern";
  if (key.startsWith("origin:")) return "origin";
  if (key.startsWith("site:") || key.startsWith("domain:")) return "domain";
  return "normalized_url";
}

function normalizeLegacyMemoryKey(key: string): string {
  return key.replace(/^(url|path|origin|site|domain):/, "");
}

function normalizeStoredMemory(value: unknown): GroupMemory | null {
  if (!value || typeof value !== "object") return null;
  const memory = value as GroupMemory;
  if (!memory.groupName || !memory.key || !memory.keyType) return null;
  return {
    ...memory,
    key: normalizeLegacyMemoryKey(memory.key)
  };
}

function normalizeLegacyMemory(key: string, value: LegacyStableAssignment): GroupMemory | null {
  if (!value.groupName) return null;

  const now = Date.now();
  const keyType = inferMemoryKeyType(key);
  const normalized: GroupMemory = {
    id: makeId("memory"),
    keyType,
    key: normalizeLegacyMemoryKey(key),
    groupName: value.groupName,
    confidence: value.confidence ?? 0.75,
    hitCount: value.hitCount ?? 1,
    correctionCount: value.correctionCount ?? 0,
    createdAt: value.createdAt ?? now,
    lastUsedAt: value.lastUsedAt ?? now,
    updatedAt: value.updatedAt ?? now,
    source: value.source ?? "auto",
    sampleUrls: value.sampleUrls ?? [],
    sampleTitles: value.sampleTitles ?? [],
    reason: value.reason ?? "由旧版稳定分组记录迁移。"
  };

  if (value.groupColor) normalized.groupColor = value.groupColor;
  if (value.expiresAt) normalized.expiresAt = value.expiresAt;

  return normalized;
}

export async function migrateStorageIfNeeded(): Promise<void> {
  const [local, sync] = await Promise.all([
    chrome.storage.local.get(null),
    chrome.storage.sync.get(null)
  ]);

  const localVersion = Number(local[STORAGE_KEYS.localSchemaVersion] ?? 0);
  const syncVersion = Number(sync[STORAGE_KEYS.syncSchemaVersion] ?? 0);

  if (localVersion < LOCAL_SCHEMA_VERSION) {
    const defaults = createDefaultLocalStorage();
    const migratedRules = Array.isArray(local.assignmentRules)
      ? local.assignmentRules
          .map((rule: LegacyAssignmentRule, index: number) => normalizeLegacyRule(rule, index))
          .filter((rule: UserRule | null): rule is UserRule => Boolean(rule))
      : Array.isArray(local.userRules)
        ? (local.userRules as UserRule[])
        : defaults.userRules;

    const legacyMemories: GroupMemory[] = local.stableGroupAssignments &&
      typeof local.stableGroupAssignments === "object"
      ? Object.entries(local.stableGroupAssignments)
          .map(([key, value]) => normalizeLegacyMemory(key, value as LegacyStableAssignment))
          .filter((memory: GroupMemory | null): memory is GroupMemory => Boolean(memory))
      : [];
    const storedMemories: GroupMemory[] = Array.isArray(local.groupMemories)
      ? local.groupMemories
          .map((memory: unknown) => normalizeStoredMemory(memory))
          .filter((memory: GroupMemory | null): memory is GroupMemory => Boolean(memory))
      : [];

    await chrome.storage.local.set({
      [STORAGE_KEYS.localSchemaVersion]: LOCAL_SCHEMA_VERSION,
      customGroups: Array.isArray(local.customGroups)
        ? (local.customGroups as CustomGroupConfig[])
        : defaults.customGroups,
      userRules: migratedRules,
      groupMemories: [...storedMemories, ...legacyMemories],
      groupActionLogs: Array.isArray(local.groupActionLogs) ? local.groupActionLogs : defaults.groupActionLogs,
      recentTabContexts: local.recentTabContexts && typeof local.recentTabContexts === "object"
        ? local.recentTabContexts
        : defaults.recentTabContexts,
      recentActiveTabs: local.recentActiveTabs && typeof local.recentActiveTabs === "object"
        ? local.recentActiveTabs
        : defaults.recentActiveTabs,
      feedbackQueue: Array.isArray(local.feedbackQueue) ? local.feedbackQueue : defaults.feedbackQueue,
      aiSettings: local.aiSettings && typeof local.aiSettings === "object" ? local.aiSettings : defaults.aiSettings,
      aiSuggestions: Array.isArray(local.aiSuggestions) ? local.aiSuggestions : defaults.aiSuggestions,
      aiClassificationHistory: Array.isArray(local.aiClassificationHistory)
        ? local.aiClassificationHistory
        : defaults.aiClassificationHistory,
      aiWindowPlans: Array.isArray(local.aiWindowPlans) ? local.aiWindowPlans : defaults.aiWindowPlans,
      aiUsage: local.aiUsage && typeof local.aiUsage === "object" ? local.aiUsage : defaults.aiUsage
    });
  }

  if (syncVersion < SYNC_SCHEMA_VERSION || !sync.settings) {
    await chrome.storage.sync.set({
      [STORAGE_KEYS.syncSchemaVersion]: SYNC_SCHEMA_VERSION,
      [STORAGE_KEYS.settings]: createDefaultSettings()
    });
  }
}
