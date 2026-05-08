export type ID = string;
export type Timestamp = number;

export type BrowserName = "chrome" | "edge" | "firefox";
export type AutomationLevel = "conservative" | "balanced" | "aggressive";

export type PageType =
  | "system"
  | "newtab"
  | "login"
  | "oauth"
  | "redirect"
  | "payment"
  | "checkout"
  | "cart"
  | "product"
  | "order"
  | "invoice"
  | "document"
  | "code"
  | "video"
  | "audio"
  | "search"
  | "social"
  | "email"
  | "dashboard"
  | "article"
  | "download"
  | "error"
  | "captcha"
  | "unknown";

export interface PageContext {
  tabId: number;
  windowId: number;
  groupId?: number;
  url: string;
  pendingUrl?: string;
  normalizedUrl: string;
  title?: string;
  origin: string;
  domain: string;
  hostname: string;
  path: string;
  pathPattern: string;
  searchParams: Record<string, string>;
  hash?: string;
  pageType: PageType;
  openerTabId?: number;
  openerGroupId?: number;
  openerGroupName?: string;
  isSystemPage: boolean;
  isTemporaryPage: boolean;
  isSensitivePage: boolean;
  isEligibleForLearning: boolean;
  createdAt?: Timestamp;
  updatedAt: Timestamp;
}

export type UserRuleType =
  | "exact_url"
  | "normalized_url"
  | "path_pattern"
  | "origin"
  | "domain"
  | "keyword"
  | "regex";

export type UserRuleAction = "group" | "never_group" | "exclude_group";

export interface UserRule {
  id: ID;
  type: UserRuleType;
  action: UserRuleAction;
  value: string;
  groupName?: string;
  groupColor?: chrome.tabGroups.ColorEnum;
  enabled: boolean;
  priority: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  source: "user" | "feedback" | "import" | "migration" | "ai";
  description?: string;
}

export type MemoryKeyType =
  | "exact_url"
  | "normalized_url"
  | "path_pattern"
  | "origin"
  | "domain";

export interface GroupMemory {
  id: ID;
  keyType: MemoryKeyType;
  key: string;
  groupName: string;
  groupColor?: chrome.tabGroups.ColorEnum;
  confidence: number;
  hitCount: number;
  correctionCount: number;
  createdAt: Timestamp;
  lastUsedAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt?: Timestamp;
  source: "auto" | "manual_move" | "feedback" | "rule_promotion" | "custom_group" | "ai";
  negative?: boolean;
  disabled?: boolean;
  sampleUrls: string[];
  sampleTitles: string[];
  reason: string;
  learningCount?: number;
  learningScore?: number;
  matured?: boolean;
  lastManualConfirmedAt?: Timestamp;
}

export interface CurrentGroupContext {
  id: number;
  title?: string;
  color?: chrome.tabGroups.ColorEnum;
}

export type DecisionSource =
  | "eligibility"
  | "user_rule"
  | "manual_protection"
  | "opener_inheritance"
  | "memory"
  | "custom_group"
  | "builtin_classifier"
  | "ai_classifier"
  | "no_match";

export type GroupAction =
  | "none"
  | "wait"
  | "move_to_existing_group"
  | "create_group";

export interface GroupCandidate {
  groupName: string;
  groupColor?: chrome.tabGroups.ColorEnum;
  confidence: number;
  source: DecisionSource;
  reason: string;
  allowCreate: boolean;
  shouldLearn: boolean;
  matchedRuleId?: ID;
  matchedMemoryId?: ID;
}

export interface GroupDecision {
  action: GroupAction;
  groupName?: string;
  groupId?: number;
  groupColor?: chrome.tabGroups.ColorEnum;
  confidence: number;
  source: DecisionSource;
  reason: string;
  shouldLearn: boolean;
  allowCreate: boolean;
  temporaryPage: boolean;
  sensitivePage: boolean;
  matchedRuleId?: ID;
  matchedMemoryId?: ID;
  candidates?: GroupCandidate[];
  createdAt: Timestamp;
}

export interface CustomGroupConfig {
  id: ID;
  groupName: string;
  color?: chrome.tabGroups.ColorEnum;
  keywords: string[];
  domains: string[];
  urlPatterns: string[];
  pathPatterns: string[];
  excludeKeywords: string[];
  autoCreate: boolean;
  enabled: boolean;
  priority: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface WorkspaceTask {
  id: ID;
  title: string;
  summary: string;
  tabUrls: string[];
  sourcePlanId?: ID;
  sourceCandidateId?: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PluginSettings {
  schemaVersion: number;
  browserTarget: BrowserName;
  automationLevel: AutomationLevel;
  enabled: boolean;
  thresholds: {
    joinExistingGroup: number;
    createNewGroup: number;
    moveExistingGroupedTab: number;
    memoryWrite: number;
  };
  behavior: {
    protectManualGroups: boolean;
    inheritOpenerGroup: boolean;
    enableMemory: boolean;
    enableBuiltinClassifier: boolean;
    enableCustomGroups: boolean;
    createGroupsForBuiltinClassifier: boolean;
  };
  privacy: {
    storeActionLogs: boolean;
    actionLogRetentionDays: number;
    memoryRetentionDays: number;
    storeSampleTitles: boolean;
  };
  neverGroupDomains: string[];
  neverGroupUrlPatterns: string[];
  updatedAt: Timestamp;
}

export interface AiSettings {
  enabled: boolean;
  baseUrl: string;
  model: string;
  apiKey: string;
  autoApplyThreshold: number;
  suggestThreshold: number;
  dailyLimit: number;
  cooldownHours: number;
  updatedAt: Timestamp;
}

export type AiSuggestionStatus = "pending" | "accepted" | "ignored";

export interface AiSuggestion {
  id: ID;
  domain: string;
  hostname: string;
  origin?: string;
  pathPattern?: string;
  scopeKey?: string;
  pageType: PageType;
  sampleTitle?: string;
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
  status: AiSuggestionStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastAskedAt: Timestamp;
}

export type AiClassificationRecordStatus =
  | "auto_applied"
  | "suggested"
  | "unusable"
  | "failed";

export interface AiClassificationRecord {
  id: ID;
  tabId: number;
  windowId: number;
  url: string;
  normalizedUrl: string;
  title?: string;
  domain: string;
  hostname: string;
  pageType: PageType;
  groupName?: string;
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
  status: AiClassificationRecordStatus;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  createdAt: Timestamp;
}

export interface AiUsage {
  date: string;
  count: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export type AiWindowActionKind =
  | "workspace"
  | "later"
  | "close_duplicate"
  | "keep"
  | "group"
  | "needs_review";

export type AiWindowPlanStatus =
  | "suggested"
  | "partially_applied"
  | "applied"
  | "failed";

export type AiWindowFeedbackStatus = "incorrect";

export type AiWindowManualResolution = "workspace" | "later" | "keep";

export interface AiWindowDuplicateGroup {
  duplicateKey: string;
  keeperTabId: number;
  duplicateTabIds: number[];
}

export interface AiWindowLocalSignals {
  duplicateGroups: AiWindowDuplicateGroup[];
  duplicateTabIds: number[];
  protectedTabIds: number[];
  alreadyWorkspaceTabIds: number[];
  alreadyLaterTabIds: number[];
  activeTabIds: number[];
}

export interface AiWindowAppliedSummary {
  workspace: number;
  later: number;
  closeDuplicate: number;
  group: number;
  failed: number;
  appliedActions: number;
}

export interface AiWindowWorkspaceCandidateAppliedSummary {
  workspace: number;
  skipped: number;
  failed: number;
}

export interface AiWindowTabSnapshot {
  tabId: number;
  windowId: number;
  url: string;
  normalizedUrl: string;
  title: string;
  domain: string;
  hostname: string;
  pageType: PageType;
  groupName?: string;
  pinned: boolean;
  audible: boolean;
  active: boolean;
  inWorkspace: boolean;
  inLater: boolean;
  duplicateKey?: string;
}

export interface AiWindowContext {
  id: ID;
  title: string;
  description: string;
  tabIds: number[];
}

export interface AiWindowAction {
  id: ID;
  kind: AiWindowActionKind;
  tabIds: number[];
  title: string;
  reason: string;
  confidence: number;
  contextId?: ID;
  groupName?: string;
  appliedAt?: Timestamp;
  error?: string;
  feedbackStatus?: AiWindowFeedbackStatus;
  resolvedAs?: AiWindowManualResolution;
}

export interface AiWindowWorkspaceCandidate {
  id: ID;
  title: string;
  summary: string;
  confidence: number;
  tabIds: number[];
  reviewTabIds: number[];
  excludedTabIds: number[];
  reason: string;
  appliedAt?: Timestamp;
  appliedSummary?: AiWindowWorkspaceCandidateAppliedSummary;
  error?: string;
}

export interface AiWindowPlan {
  id: ID;
  windowId: number;
  summary: string;
  localSignals: AiWindowLocalSignals;
  workspaceCandidates: AiWindowWorkspaceCandidate[];
  contexts: AiWindowContext[];
  actions: AiWindowAction[];
  tabs: AiWindowTabSnapshot[];
  status: AiWindowPlanStatus;
  appliedSummary?: AiWindowAppliedSummary;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface GroupActionLog {
  id: ID;
  tabId: number;
  windowId: number;
  url: string;
  normalizedUrl: string;
  title?: string;
  groupName?: string;
  groupId?: number;
  action: GroupAction;
  source: DecisionSource;
  confidence: number;
  reason: string;
  pageType: PageType;
  shouldLearn: boolean;
  allowCreate?: boolean;
  temporaryPage?: boolean;
  sensitivePage?: boolean;
  learnedMemoryId?: ID;
  matchedRuleId?: ID;
  matchedMemoryId?: ID;
  error?: string;
  timestamp: Timestamp;
}

export type FeedbackAction =
  | "move_once"
  | "always_page"
  | "always_path"
  | "always_site"
  | "never_site"
  | "ignore_keyword";

export interface GroupFeedback {
  id: ID;
  logId?: ID;
  tabId?: number;
  action: FeedbackAction;
  targetGroupName?: string;
  targetGroupColor?: chrome.tabGroups.ColorEnum;
  url: string;
  normalizedUrl: string;
  domain: string;
  pathPattern: string;
  keyword?: string;
  createdAt: Timestamp;
}
