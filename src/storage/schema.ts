import type {
  AiSettings,
  AiClassificationRecord,
  AiSuggestion,
  AiWindowPlan,
  AiUsage,
  CustomGroupConfig,
  GroupActionLog,
  GroupFeedback,
  GroupMemory,
  PageContext,
  PluginSettings,
  UserRule,
  WorkspaceTask
} from "../types";

export const LOCAL_SCHEMA_VERSION = 3;
export const SYNC_SCHEMA_VERSION = 1;

export const STORAGE_KEYS = {
  localSchemaVersion: "schemaVersion",
  syncSchemaVersion: "schemaVersion",
  userRules: "userRules",
  customGroups: "customGroups",
  groupMemories: "groupMemories",
  groupActionLogs: "groupActionLogs",
  recentTabContexts: "recentTabContexts",
  recentActiveTabs: "recentActiveTabs",
  feedbackQueue: "feedbackQueue",
  aiSettings: "aiSettings",
  aiSuggestions: "aiSuggestions",
  aiClassificationHistory: "aiClassificationHistory",
  aiWindowPlans: "aiWindowPlans",
  aiUsage: "aiUsage",
  workspaceTask: "workspaceTask",
  settings: "settings"
} as const;

export interface LocalStorageSchema {
  schemaVersion: number;
  userRules: UserRule[];
  customGroups: CustomGroupConfig[];
  groupMemories: GroupMemory[];
  groupActionLogs: GroupActionLog[];
  recentTabContexts: Record<number, Partial<PageContext>>;
  recentActiveTabs: Record<number, number>;
  feedbackQueue: GroupFeedback[];
  aiSettings: AiSettings;
  aiSuggestions: AiSuggestion[];
  aiClassificationHistory: AiClassificationRecord[];
  aiWindowPlans: AiWindowPlan[];
  aiUsage: AiUsage;
  workspaceTask?: WorkspaceTask;
}

export interface SyncStorageSchema {
  schemaVersion: number;
  settings: PluginSettings;
  syncedUserRules?: UserRule[];
}

export function createDefaultSettings(now = Date.now()): PluginSettings {
  return {
    schemaVersion: SYNC_SCHEMA_VERSION,
    browserTarget: "chrome",
    automationLevel: "balanced",
    enabled: true,
    thresholds: {
      joinExistingGroup: 0.55,
      createNewGroup: 0.8,
      moveExistingGroupedTab: 0.88,
      memoryWrite: 0.75
    },
    behavior: {
      protectManualGroups: true,
      inheritOpenerGroup: true,
      enableMemory: true,
      enableBuiltinClassifier: true,
      enableCustomGroups: true,
      createGroupsForBuiltinClassifier: true
    },
    privacy: {
      storeActionLogs: true,
      actionLogRetentionDays: 30,
      memoryRetentionDays: 90,
      storeSampleTitles: true
    },
    neverGroupDomains: [],
    neverGroupUrlPatterns: [],
    updatedAt: now
  };
}

export function createDefaultAiSettings(now = Date.now()): AiSettings {
  return {
    enabled: false,
    baseUrl: "",
    model: "",
    apiKey: "",
    autoApplyThreshold: 0.88,
    suggestThreshold: 0.65,
    dailyLimit: 100,
    cooldownHours: 24,
    updatedAt: now
  };
}

export function createDefaultAiUsage(now = Date.now()): AiUsage {
  return {
    date: new Date(now).toISOString().slice(0, 10),
    count: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0
  };
}

export function createDefaultLocalStorage(): LocalStorageSchema {
  return {
    schemaVersion: LOCAL_SCHEMA_VERSION,
    userRules: [],
    customGroups: [],
    groupMemories: [],
    groupActionLogs: [],
    recentTabContexts: {},
    recentActiveTabs: {},
    feedbackQueue: [],
    aiSettings: createDefaultAiSettings(),
    aiSuggestions: [],
    aiClassificationHistory: [],
    aiWindowPlans: [],
    aiUsage: createDefaultAiUsage()
  };
}
