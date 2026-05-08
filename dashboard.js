"use strict";

const SAVED_KEY = "laterItems";
const WORKSPACE_KEY = "workspaceItems";
const WORKSPACE_TASK_KEY = "workspaceTask";
const CUSTOM_GROUPS_KEY = "customGroups";
const AI_SETTINGS_KEY = "aiSettings";
const USER_RULES_KEY = "userRules";
const ACTION_LOGS_KEY = "groupActionLogs";
const GROUP_MEMORIES_KEY = "groupMemories";
const AI_SUGGESTIONS_KEY = "aiSuggestions";
const AI_HISTORY_KEY = "aiClassificationHistory";
const AI_WINDOW_PLANS_KEY = "aiWindowPlans";
const AI_USAGE_KEY = "aiUsage";
const LANGUAGE_KEY = "tabInboxLanguage";
const ACTIVE_VIEW_KEY = "tabInboxActiveView";
const WORKSPACE_GROUP_NAME = "工作台";
const WORKSPACE_LIMIT = 50;
const FOCUS_GROUP_MIN_SIZE = 4;
const PAGE_PREVIEW_LIMIT = 4;
const LIVE_REFRESH_KEYS = new Set([
  SAVED_KEY,
  WORKSPACE_KEY,
  WORKSPACE_TASK_KEY,
  CUSTOM_GROUPS_KEY,
  AI_SETTINGS_KEY,
  USER_RULES_KEY,
  ACTION_LOGS_KEY,
  GROUP_MEMORIES_KEY,
  AI_SUGGESTIONS_KEY,
  AI_HISTORY_KEY,
  AI_WINDOW_PLANS_KEY,
  AI_USAGE_KEY
]);
const TRACKING_QUERY_PARAMS = new Set([
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
const UNCATEGORIZED_CATEGORY_NAME = "待分类";
const BUILTIN_CATEGORY_NAMES = [
  "AI 工具",
  "创作设计",
  "办公效率",
  "开发技术",
  "资料文档",
  "搜索查询",
  "阅读学习",
  "沟通社交",
  "影音娱乐",
  "购物财务",
  UNCATEGORIZED_CATEGORY_NAME
];

const CATEGORY_LABELS = {
  "AI 工具": { zh: "AI 工具", en: "AI Tools" },
  "创作设计": { zh: "创作设计", en: "Creative" },
  "办公效率": { zh: "办公效率", en: "Office Productivity" },
  "开发技术": { zh: "开发技术", en: "Dev & Tech" },
  "资料文档": { zh: "资料文档", en: "Docs & Reference" },
  "搜索查询": { zh: "搜索查询", en: "Search" },
  "阅读学习": { zh: "阅读学习", en: "Reading & Learning" },
  "沟通社交": { zh: "沟通社交", en: "Comms & Social" },
  "影音娱乐": { zh: "影音娱乐", en: "Media" },
  "购物财务": { zh: "购物财务", en: "Shopping & Finance" },
  "待分类": { zh: "待分类", en: "Unsorted" }
};

const MESSAGES = {
  zh: {
    appTagline: "把拥挤标签页整理成可执行任务流",
    globalSearchPlaceholder: "搜索命令或标签",
    refresh: "刷新",
    refreshBusy: "刷新中",
    closeExtraDashboards: "关闭多余面板",
    processing: "处理中",
    currentStatus: "当前状态",
    commandCenter: "指挥中心",
    aiSuite: "AI 效率套件",
    tabInbox: "标签收件箱",
    automationHealth: "自动化健康",
    laterList: "稍后清单",
    proStatus: "效率状态",
    managedTabs: "已整理 {count} 个标签",
    groupTasks: "组任务",
    openTabs: "打开标签",
    duplicates: "重复标签",
    focusGroups: "待聚焦组",
    openNow: "现在打开",
    searchPlaceholder: "搜索网站或标题",
    organizeTools: "整理工具",
    viewFilter: "视图筛选",
    all: "全部",
    focus: "待聚焦",
    duplicateFilter: "重复",
    runAutoGroup: "运行自动分组",
    closeAllDuplicates: "关闭全部重复",
    clearSearch: "清空搜索",
    automation: "自动分组",
    readingStatus: "正在读取状态",
    automationStatusLabel: "自动分组状态",
    off: "关闭",
    enabled: "启用",
    needsConfig: "待配置",
    rules: "规则",
    suggestions: "建议",
    records: "记录",
    memory: "记忆",
    workspace: "工作台",
    pages: "{count} 个页面",
    openAll: "打开全部",
    clear: "清空",
    categories: "分类",
    categoryCount: "{total} 个分类",
    categorySummary: "{total} 个分类 · {assigned} 个标签 · {custom} 个自定义",
    newCategoryName: "新增分类名称",
    keywordOrDomain: "关键词或域名，可选",
    add: "添加",
    update: "更新",
    edit: "编辑",
    cancelEdit: "取消编辑",
    later: "稍后",
    addToWorkspace: "加入工作台",
    automationSettings: "自动分组设置",
    enableAutomation: "启用本地自动分组",
    automationLevel: "自动化强度",
    levelConservative: "保守",
    levelBalanced: "平衡",
    levelAggressive: "积极",
    enableMemorySetting: "启用稳定记忆",
    enableBuiltinSetting: "启用内置分类",
    enableCustomGroupsSetting: "启用自定义分组",
    createBuiltinGroupsSetting: "允许内置分类创建分组",
    saveAutomationSettings: "保存自动化设置",
    enableAi: "启用 AI 补全未知分类",
    autoThreshold: "自动阈值",
    suggestThreshold: "建议阈值",
    dailyLimit: "每日上限",
    cooldownHours: "冷却小时",
    saveAiSettings: "保存 AI 设置",
    testConnection: "测试连接",
    aiSuggestions: "AI 建议",
    aiHistory: "AI 分类记录",
    aiWindowHistory: "窗口整理历史",
    aiWindowPlanCount: "{count} 个方案",
    noAiWindowHistory: "还没有窗口整理历史",
    noWorkspaceCandidates: "暂无工作台候选",
    localSignals: "本地信号",
    failed: "失败",
    memoryModule: "记忆模块",
    rulesAndLogs: "规则与记录",
    settings: "设置",
    activeRules: "生效规则",
    recentRecords: "最近记录",
    noMatchedGroups: "没有匹配的标签组。",
    noTabsToOrganize: "没有需要整理的标签页。",
    noLaterPages: "没有稍后页面。很清爽。",
    workspaceEmpty: "把当前任务相关页面放这里。",
    pendingSuggestions: "{count} 条待确认",
    noAiSuggestions: "没有待确认的 AI 建议。",
    stableMemories: "{count} 条稳定记忆",
    mergedMemories: "{count} 条稳定记忆 · 已合并 {merged} 条重复",
    noMemories: "还没有稳定记忆。手动移动或高置信自动分组后会出现在这里。",
    resultWithQuery: "{mode}视图中找到 {visible} / {total} 个标签组",
    resultSummary: "{mode}视图 · {visible} 个标签组",
    noAutomationLogs: "还没有自动分组记录",
    aiUsageTitle: "今日 {count} 次请求 · 输入 {prompt} · 输出 {completion} · 总计 {total} token",
    aiHistoryCount: "{count} 个页面 · 今日 {tokens} token",
    noAiHistory: "还没有 AI 分类记录。运行自动分组后会出现在这里。",
    activeRuleCount: "{count} 条规则",
    noRules: "暂无规则。",
    noRecords: "暂无记录。",
    ruleActionGroup: "分组",
    ruleActionNever: "永不分组",
    ruleActionExclude: "排除",
    ruleValuePlaceholder: "domain、URL、路径模式或关键词",
    targetGroupPlaceholder: "目标分组",
    addRule: "添加规则",
    subdomains: "{count} 个子域",
    tabCount: "{count} 个标签",
    pinnedCount: "{count} 个固定",
    duplicateCount: "{count} 个重复",
    collapsePages: "收起页面",
    expandPages: "展开 {count} 个页面",
    autoGroup: "自动分组",
    openThisGroup: "打开这一组",
    placeInWorkspace: "放入工作台",
    saveForLater: "保存稍后",
    closeDuplicates: "关闭重复",
    closeGroup: "关闭整组",
    manualCategoryLabel: "手动选择分类",
    selectCategory: "选择分类",
    applyCategory: "应用分类",
    applyToTab: "应用",
    pinned: "固定",
    current: "当前",
    open: "打开",
    classify: "归类",
    delete: "删除",
    remove: "移除",
    manualCategory: "手动分类",
    custom: "自定义",
    builtin: "内置",
    systemCategory: "系统分类",
    categoryKindLabel: "{name} · {kind}",
    viewCategoryTabs: "查看标签",
    hideCategoryTabs: "收起标签",
    noCategoryTabs: "这个分类下暂无打开的标签。",
    deleteMemory: "删除记忆",
    hitCount: "命中 {count} 次",
    mergedCount: "合并 {count} 条",
    unnamedGroup: "未命名分组",
    uncategorized: "未分类",
    sourceUnknown: "未知",
    timeUnknown: "时间未知",
    justNow: "刚刚",
    minutesAgo: "{count} 分钟前",
    hoursAgo: "{count} 小时前",
    daysAgo: "{count} 天前",
    savedPages: "已保存 {count} 个页面",
    alreadySaved: "这些页面已经在稍后清单里",
    workspaceAdded: "已加入工作台 {count} 个页面",
    alreadyInWorkspace: "这些页面已经在工作台里",
    workspaceStillEmpty: "工作台还是空的",
    openedWorkspace: "已打开 {count} 个工作台页面",
    chooseCategoryFirst: "先选择分类",
    categorizedTo: "已归类到「{name}」",
    autoGroupedTabs: "已运行 {count} 个标签的自动分组",
    inputCategoryName: "先输入分类名称",
    addCategoryFailed: "添加分类失败",
    updateCategoryFailed: "更新分类失败",
    categoryAdded: "已添加分类：{name}",
    categoryUpdated: "已更新分类：{name}",
    automationSettingsSaved: "自动化设置已保存",
    saveAutomationFailed: "保存自动化设置失败",
    inputRuleValue: "先输入规则值",
    inputRuleGroup: "先输入目标分组",
    ruleAdded: "已添加规则",
    addRuleFailed: "添加规则失败",
    feedbackSaved: "已从记录生成规则",
    feedbackFailed: "生成反馈规则失败",
    feedbackPage: "记住页面",
    feedbackPath: "记住路径",
    feedbackSite: "记住网站",
    feedbackNeverSite: "网站不分组",
    saveAiFailed: "保存 AI 设置失败",
    aiSettingsSaved: "AI 设置已保存",
    aiTestFailed: "AI 连接测试失败",
    aiConnectionOk: "连接可用：{model}",
    aiPermissionDenied: "没有获得 AI 接口访问权限",
    opening: "打开中",
    adding: "加入中",
    closing: "关闭中",
    grouping: "分组中",
    saving: "保存中",
    testing: "测试中",
    clearWorkspaceConfirm: "清空工作台中的 {count} 个页面？",
    workspaceCleared: "工作台已清空",
    clearSavedConfirm: "清空稍后清单中的 {count} 个页面？",
    savedCleared: "稍后清单已清空",
    noClosableDuplicates: "没有可关闭的重复标签",
    closedDuplicates: "已关闭 {count} 个重复标签",
    autoGroupFailed: "自动分组失败",
    closeDomainConfirm: "关闭 {count} 个来自 {host} 的标签？",
    deleteRuleFailed: "删除规则失败",
    ruleDeleted: "规则已删除",
    aiSuggestionFailed: "处理 AI 建议失败",
    acceptAiSuggestion: "接受并应用",
    ignoreAiSuggestion: "忽略",
    acceptedAiSuggestion: "已接受并应用 AI 建议",
    ignoredAiSuggestion: "已忽略 AI 建议",
    deleteMemoryFailed: "删除记忆失败",
    memoryDeletedMany: "已删除 {count} 条合并记忆",
    memoryDeleted: "记忆已删除",
    linkNotOpenable: "这个链接不能直接打开",
    deleteCategoryConfirm: "删除自定义分类「{name}」？",
    deleteCategoryFailed: "删除分类失败",
    categoryDeleted: "分类已删除",
    loadFailed: "页面加载失败，请刷新重试。"
  },
  en: {
    appTagline: "Turn crowded tabs into an executable workflow",
    globalSearchPlaceholder: "Search commands or tabs",
    refresh: "Refresh",
    refreshBusy: "Refreshing",
    closeExtraDashboards: "Close extra dashboards",
    processing: "Working",
    currentStatus: "Current status",
    commandCenter: "Command Center",
    aiSuite: "AI Productivity Suite",
    tabInbox: "Tab Inbox",
    automationHealth: "Automation Health",
    laterList: "Later List",
    proStatus: "Pro Status",
    managedTabs: "{count} tabs managed",
    groupTasks: "Groups",
    openTabs: "Open tabs",
    duplicates: "Duplicates",
    focusGroups: "Focus groups",
    openNow: "Open Now",
    searchPlaceholder: "Search sites or titles",
    organizeTools: "Organizing tools",
    viewFilter: "View filter",
    all: "All",
    focus: "Focus",
    duplicateFilter: "Duplicates",
    runAutoGroup: "Run auto grouping",
    closeAllDuplicates: "Close all duplicates",
    clearSearch: "Clear search",
    automation: "Auto Grouping",
    readingStatus: "Reading status",
    automationStatusLabel: "Auto grouping status",
    off: "Off",
    enabled: "On",
    needsConfig: "Needs setup",
    rules: "Rules",
    suggestions: "Suggestions",
    records: "Records",
    memory: "Memory",
    workspace: "Workspace",
    pages: "{count} pages",
    openAll: "Open all",
    clear: "Clear",
    categories: "Categories",
    categoryCount: "{total} categories",
    categorySummary: "{total} categories · {assigned} tabs · {custom} custom",
    newCategoryName: "New category name",
    keywordOrDomain: "Keyword or domain, optional",
    add: "Add",
    update: "Update",
    edit: "Edit",
    cancelEdit: "Cancel edit",
    later: "Later",
    addToWorkspace: "Add to workspace",
    automationSettings: "Auto grouping settings",
    enableAutomation: "Enable local auto grouping",
    automationLevel: "Automation level",
    levelConservative: "Conservative",
    levelBalanced: "Balanced",
    levelAggressive: "Aggressive",
    enableMemorySetting: "Use stable memory",
    enableBuiltinSetting: "Use built-in classifier",
    enableCustomGroupsSetting: "Use custom groups",
    createBuiltinGroupsSetting: "Allow built-ins to create groups",
    saveAutomationSettings: "Save automation settings",
    enableAi: "Use AI for unknown categories",
    autoThreshold: "Auto threshold",
    suggestThreshold: "Suggest threshold",
    dailyLimit: "Daily limit",
    cooldownHours: "Cooldown hours",
    saveAiSettings: "Save AI settings",
    testConnection: "Test connection",
    aiSuggestions: "AI Suggestions",
    aiHistory: "AI History",
    aiWindowHistory: "Window Organization History",
    aiWindowPlanCount: "{count} plans",
    noAiWindowHistory: "No window organization history yet",
    noWorkspaceCandidates: "No workspace candidates",
    localSignals: "Local signals",
    failed: "Failed",
    memoryModule: "Memory Module",
    rulesAndLogs: "Rules & Logs",
    settings: "Settings",
    activeRules: "Active rules",
    recentRecords: "Recent records",
    noMatchedGroups: "No matching tab groups.",
    noTabsToOrganize: "No tabs need organizing.",
    noLaterPages: "No later pages. Nice and clean.",
    workspaceEmpty: "Drop task-related pages here.",
    pendingSuggestions: "{count} pending",
    noAiSuggestions: "No pending AI suggestions.",
    stableMemories: "{count} stable memories",
    mergedMemories: "{count} stable memories · merged {merged} duplicates",
    noMemories: "No stable memory yet. Manual moves or high-confidence grouping will appear here.",
    resultWithQuery: "{mode} view found {visible} / {total} groups",
    resultSummary: "{mode} view · {visible} groups",
    noAutomationLogs: "No auto grouping records yet",
    aiUsageTitle: "Today {count} requests · input {prompt} · output {completion} · total {total} tokens",
    aiHistoryCount: "{count} pages · {tokens} tokens today",
    noAiHistory: "No AI history yet. Run auto grouping to populate this list.",
    activeRuleCount: "{count} rules",
    noRules: "No rules yet.",
    noRecords: "No records yet.",
    ruleActionGroup: "Group",
    ruleActionNever: "Never group",
    ruleActionExclude: "Exclude",
    ruleValuePlaceholder: "domain, URL, path pattern, or keyword",
    targetGroupPlaceholder: "Target group",
    addRule: "Add rule",
    subdomains: "{count} subdomains",
    tabCount: "{count} tabs",
    pinnedCount: "{count} pinned",
    duplicateCount: "{count} duplicates",
    collapsePages: "Collapse pages",
    expandPages: "Expand {count} pages",
    autoGroup: "Auto group",
    openThisGroup: "Open group",
    placeInWorkspace: "To workspace",
    saveForLater: "Save for later",
    closeDuplicates: "Close duplicates",
    closeGroup: "Close group",
    manualCategoryLabel: "Choose category manually",
    selectCategory: "Select category",
    applyCategory: "Apply category",
    applyToTab: "Apply",
    pinned: "Pinned",
    current: "Current",
    open: "Open",
    classify: "Classify",
    delete: "Delete",
    remove: "Remove",
    manualCategory: "Manual category",
    custom: "Custom",
    builtin: "Built-in",
    systemCategory: "System category",
    categoryKindLabel: "{name} · {kind}",
    viewCategoryTabs: "View tabs",
    hideCategoryTabs: "Hide tabs",
    noCategoryTabs: "No open tabs in this category.",
    deleteMemory: "Delete memory",
    hitCount: "{count} hits",
    mergedCount: "merged {count}",
    unnamedGroup: "Unnamed group",
    uncategorized: "Uncategorized",
    sourceUnknown: "Unknown",
    timeUnknown: "Unknown time",
    justNow: "Just now",
    minutesAgo: "{count} min ago",
    hoursAgo: "{count} hr ago",
    daysAgo: "{count} days ago",
    savedPages: "Saved {count} pages",
    alreadySaved: "These pages are already in Later",
    workspaceAdded: "Added {count} pages to workspace",
    alreadyInWorkspace: "These pages are already in Workspace",
    workspaceStillEmpty: "Workspace is empty",
    openedWorkspace: "Opened {count} workspace pages",
    chooseCategoryFirst: "Choose a category first",
    categorizedTo: "Categorized as “{name}”",
    autoGroupedTabs: "Ran auto grouping for {count} tabs",
    inputCategoryName: "Enter a category name first",
    addCategoryFailed: "Failed to add category",
    updateCategoryFailed: "Failed to update category",
    categoryAdded: "Added category: {name}",
    categoryUpdated: "Updated category: {name}",
    automationSettingsSaved: "Automation settings saved",
    saveAutomationFailed: "Failed to save automation settings",
    inputRuleValue: "Enter a rule value first",
    inputRuleGroup: "Enter a target group first",
    ruleAdded: "Rule added",
    addRuleFailed: "Failed to add rule",
    feedbackSaved: "Created a rule from the record",
    feedbackFailed: "Failed to create feedback rule",
    feedbackPage: "Remember page",
    feedbackPath: "Remember path",
    feedbackSite: "Remember site",
    feedbackNeverSite: "Never site",
    saveAiFailed: "Failed to save AI settings",
    aiSettingsSaved: "AI settings saved",
    aiTestFailed: "AI connection test failed",
    aiConnectionOk: "Connection ready: {model}",
    aiPermissionDenied: "AI API access was not granted",
    opening: "Opening",
    adding: "Adding",
    closing: "Closing",
    grouping: "Grouping",
    saving: "Saving",
    testing: "Testing",
    clearWorkspaceConfirm: "Clear {count} workspace pages?",
    workspaceCleared: "Workspace cleared",
    clearSavedConfirm: "Clear {count} later pages?",
    savedCleared: "Later list cleared",
    noClosableDuplicates: "No duplicates to close",
    closedDuplicates: "Closed {count} duplicate tabs",
    autoGroupFailed: "Auto grouping failed",
    closeDomainConfirm: "Close {count} tabs from {host}?",
    deleteRuleFailed: "Failed to delete rule",
    ruleDeleted: "Rule deleted",
    aiSuggestionFailed: "Failed to handle AI suggestion",
    acceptAiSuggestion: "Accept & apply",
    ignoreAiSuggestion: "Ignore",
    acceptedAiSuggestion: "Accepted and applied AI suggestion",
    ignoredAiSuggestion: "Ignored AI suggestion",
    deleteMemoryFailed: "Failed to delete memory",
    memoryDeletedMany: "Deleted {count} merged memories",
    memoryDeleted: "Memory deleted",
    linkNotOpenable: "This link cannot be opened directly",
    deleteCategoryConfirm: "Delete custom category “{name}”?",
    deleteCategoryFailed: "Failed to delete category",
    categoryDeleted: "Category deleted",
    loadFailed: "Page failed to load. Refresh and try again."
  }
};

let currentLanguage = getInitialLanguage();
let activeView = getInitialView();
let openTabs = [];
let savedItems = [];
let workspaceItems = [];
let workspaceTask = null;
let pluginSettings = null;
let aiSettings = null;
let aiSuggestions = [];
let aiHistory = [];
let aiWindowPlans = [];
let aiUsage = null;
let userRules = [];
let actionLogs = [];
let memories = [];
let customGroups = [];
let classificationPreviews = new Map();
let query = "";
let filterMode = "all";
let refreshTimer = 0;
let editingCategoryId = "";
let aiSettingsDraftDirty = false;
const expandedHosts = new Set();
const expandedCategories = new Set();

const els = {
  dateLine: document.getElementById("dateLine"),
  globalSearchInput: document.getElementById("globalSearchInput"),
  languageToggleBtn: document.getElementById("languageToggleBtn"),
  refreshBtn: document.getElementById("refreshBtn"),
  closeExtraDashboardsBtn: document.getElementById("closeExtraDashboardsBtn"),
  domainCount: document.getElementById("domainCount"),
  openTabCount: document.getElementById("openTabCount"),
  duplicateCount: document.getElementById("duplicateCount"),
  focusCount: document.getElementById("focusCount"),
  resultSummary: document.getElementById("resultSummary"),
  searchInput: document.getElementById("searchInput"),
  clearSearchBtn: document.getElementById("clearSearchBtn"),
  classifyVisibleBtn: document.getElementById("classifyVisibleBtn"),
  closeAllDupesBtn: document.getElementById("closeAllDupesBtn"),
  domainList: document.getElementById("domainList"),
  automationStatus: document.getElementById("automationStatus"),
  aiStateText: document.getElementById("aiStateText"),
  ruleCountText: document.getElementById("ruleCountText"),
  pendingSuggestionText: document.getElementById("pendingSuggestionText"),
  recentLogCountText: document.getElementById("recentLogCountText"),
  aiTokenText: document.getElementById("aiTokenText"),
  memoryCountText: document.getElementById("memoryCountText"),
  workspaceTitle: document.getElementById("workspaceTitle"),
  workspaceCount: document.getElementById("workspaceCount"),
  workspaceList: document.getElementById("workspaceList"),
  openWorkspaceBtn: document.getElementById("openWorkspaceBtn"),
  clearWorkspaceBtn: document.getElementById("clearWorkspaceBtn"),
  categoryCount: document.getElementById("categoryCount"),
  categoryForm: document.getElementById("categoryForm"),
  categoryNameInput: document.getElementById("categoryNameInput"),
  categoryKeywordInput: document.getElementById("categoryKeywordInput"),
  addCategoryBtn: document.getElementById("addCategoryBtn"),
  cancelCategoryEditBtn: document.getElementById("cancelCategoryEditBtn"),
  categoryList: document.getElementById("categoryList"),
  savedCount: document.getElementById("savedCount"),
  savedList: document.getElementById("savedList"),
  savedToWorkspaceBtn: document.getElementById("savedToWorkspaceBtn"),
  clearSavedBtn: document.getElementById("clearSavedBtn"),
  automationEnabledInput: document.getElementById("automationEnabledInput"),
  automationLevelSelect: document.getElementById("automationLevelSelect"),
  enableMemoryInput: document.getElementById("enableMemoryInput"),
  enableBuiltinInput: document.getElementById("enableBuiltinInput"),
  enableCustomGroupsInput: document.getElementById("enableCustomGroupsInput"),
  createBuiltinGroupsInput: document.getElementById("createBuiltinGroupsInput"),
  saveAutomationSettingsBtn: document.getElementById("saveAutomationSettingsBtn"),
  aiEnabledInput: document.getElementById("aiEnabledInput"),
  aiBaseUrlInput: document.getElementById("aiBaseUrlInput"),
  aiModelInput: document.getElementById("aiModelInput"),
  aiApiKeyInput: document.getElementById("aiApiKeyInput"),
  aiAutoThresholdInput: document.getElementById("aiAutoThresholdInput"),
  aiSuggestThresholdInput: document.getElementById("aiSuggestThresholdInput"),
  aiDailyLimitInput: document.getElementById("aiDailyLimitInput"),
  aiCooldownInput: document.getElementById("aiCooldownInput"),
  saveAiSettingsBtn: document.getElementById("saveAiSettingsBtn"),
  testAiSettingsBtn: document.getElementById("testAiSettingsBtn"),
  aiSuggestionCount: document.getElementById("aiSuggestionCount"),
  aiSuggestionList: document.getElementById("aiSuggestionList"),
  aiHistoryCount: document.getElementById("aiHistoryCount"),
  aiHistoryList: document.getElementById("aiHistoryList"),
  aiWindowPlanCount: document.getElementById("aiWindowPlanCount"),
  aiWindowPlanList: document.getElementById("aiWindowPlanList"),
  memoryCount: document.getElementById("memoryCount"),
  memoryList: document.getElementById("memoryList"),
  ruleForm: document.getElementById("ruleForm"),
  ruleActionSelect: document.getElementById("ruleActionSelect"),
  ruleTypeSelect: document.getElementById("ruleTypeSelect"),
  ruleValueInput: document.getElementById("ruleValueInput"),
  ruleGroupNameInput: document.getElementById("ruleGroupNameInput"),
  addRuleBtn: document.getElementById("addRuleBtn"),
  rulesPanelMeta: document.getElementById("rulesPanelMeta"),
  rulesCount: document.getElementById("rulesCount"),
  rulesList: document.getElementById("rulesList"),
  logsCount: document.getElementById("logsCount"),
  logsList: document.getElementById("logsList"),
  railManagedText: document.getElementById("railManagedText"),
  railProgressBar: document.getElementById("railProgressBar"),
  toast: document.getElementById("toast")
};

function getInitialLanguage() {
  const stored = localStorage.getItem(LANGUAGE_KEY);
  if (stored === "zh" || stored === "en") return stored;
  return navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function getInitialView() {
  const stored = localStorage.getItem(ACTIVE_VIEW_KEY);
  const allowed = new Set(["open-tabs", "automation", "workspace", "categories", "saved", "ai", "memory", "rules", "settings"]);
  return allowed.has(stored) ? stored : "open-tabs";
}

function t(key, values = {}) {
  const template = MESSAGES[currentLanguage]?.[key] || MESSAGES.zh[key] || key;
  return template.replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
}

function translateCategoryName(name = "") {
  return CATEGORY_LABELS[name]?.[currentLanguage] || name;
}

function applyStaticTranslations() {
  document.documentElement.lang = currentLanguage === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
    node.setAttribute("aria-label", t(node.dataset.i18nAriaLabel));
  });
  if (els.languageToggleBtn) {
    els.languageToggleBtn.textContent = currentLanguage === "zh" ? "EN" : "中";
    els.languageToggleBtn.setAttribute("aria-label", currentLanguage === "zh" ? "Switch to English" : "切换到中文");
  }
  globalThis.chrome?.storage?.local?.set?.({ [LANGUAGE_KEY]: currentLanguage });
}

function isSystemUrl(url = "") {
  return /^(chrome|edge|about|chrome-extension|moz-extension|devtools):/i.test(url);
}

function normalizePath(pathname = "") {
  if (!pathname || pathname === "/") return "/";
  const collapsed = pathname.replace(/\/{2,}/g, "/");
  return collapsed.length > 1 ? collapsed.replace(/\/+$/, "") : collapsed;
}

function shouldKeepHash(hash = "") {
  if (!hash) return false;
  if (HASH_ROUTE_PREFIXES.some((prefix) => hash.startsWith(prefix))) return true;
  return SHORT_HASH_RE.test(hash) && hash.includes("/");
}

function normalizeUrl(rawUrl = "") {
  try {
    const url = new URL(rawUrl);
    Array.from(url.searchParams.keys()).forEach((key) => {
      if (TRACKING_QUERY_PARAMS.has(key.toLowerCase())) url.searchParams.delete(key);
    });
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    const path = normalizePath(url.pathname);
    const keptHash = shouldKeepHash(url.hash) ? url.hash : "";
    const normalized = `${url.origin}${path}${url.search}${keptHash}`;
    return normalized.endsWith("/") && path !== "/" ? normalized.slice(0, -1) : normalized;
  } catch {
    return rawUrl;
  }
}

function getHostname(rawUrl = "") {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function getPrimaryDomain(hostname = "") {
  const clean = String(hostname || "").toLowerCase().replace(/^www\./, "");
  const parts = clean.split(".").filter(Boolean);
  if (parts.length <= 2) return clean;

  const twoPartSuffixes = new Set([
    "com.cn",
    "net.cn",
    "org.cn",
    "gov.cn",
    "co.uk",
    "org.uk",
    "ac.uk",
    "com.au",
    "net.au",
    "co.jp",
    "com.br",
    "com.hk",
    "com.sg",
    "com.tw"
  ]);
  const suffix = parts.slice(-2).join(".");
  const take = twoPartSuffixes.has(suffix) ? 3 : 2;
  return parts.slice(-take).join(".");
}

function friendlyDomain(hostname = "") {
  const primaryDomain = getPrimaryDomain(hostname);
  const known = {
    "github.com": "GitHub",
    "docs.google.com": "Google Docs",
    "mail.google.com": "Gmail",
    "youtube.com": "YouTube",
    "youtu.be": "YouTube",
    "chatgpt.com": "ChatGPT",
    "claude.ai": "Claude",
    "notion.so": "Notion",
    "figma.com": "Figma",
    "linear.app": "Linear",
    "x.com": "X",
    "twitter.com": "X",
    "reddit.com": "Reddit"
  };
  if (known[hostname]) return known[hostname];
  if (known[primaryDomain]) return known[primaryDomain];
  return primaryDomain
    .replace(/\.(com|org|net|io|ai|app|dev|cn|co|me)$/i, "")
    .split(".")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Unknown";
}

function cleanTitle(title = "", url = "") {
  const hostname = getHostname(url);
  let value = title.replace(/^\(\d+\+?\)\s*/, "").trim();
  const domainLabel = friendlyDomain(hostname);
  for (const sep of [" - ", " | ", " — ", " · ", " – "]) {
    const idx = value.lastIndexOf(sep);
    if (idx < 0) continue;
    const suffix = value.slice(idx + sep.length).trim().toLowerCase();
    if (suffix === hostname.toLowerCase() || suffix === domainLabel.toLowerCase()) {
      value = value.slice(0, idx).trim();
      break;
    }
  }
  return value || hostname || url;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

async function fetchOpenTabs() {
  const tabs = await chrome.tabs.query({});
  const dashboardUrl = chrome.runtime.getURL("dashboard.html");
  const groupIds = Array.from(new Set(tabs
    .map((tab) => tab.groupId)
    .filter((groupId) => Number.isInteger(groupId) && groupId !== -1)));
  const groupTitles = new Map();
  await Promise.all(groupIds.map(async (groupId) => {
    const group = await chrome.tabGroups.get(groupId).catch(() => null);
    if (group?.title) groupTitles.set(groupId, group.title);
  }));
  openTabs = tabs
    .filter((tab) => tab.id && tab.url && !isSystemUrl(tab.url))
    .filter((tab) => tab.url !== dashboardUrl)
    .map((tab) => ({
      id: tab.id,
      windowId: tab.windowId,
      url: tab.url,
      normalizedUrl: normalizeUrl(tab.url),
      title: tab.title || "",
      cleanTitle: cleanTitle(tab.title || "", tab.url),
      hostname: getHostname(tab.url),
      primaryDomain: getPrimaryDomain(getHostname(tab.url)),
      active: Boolean(tab.active),
      pinned: Boolean(tab.pinned),
      groupId: tab.groupId,
      groupTitle: groupTitles.get(tab.groupId) || "",
      favIconUrl: tab.favIconUrl || ""
    }));

  const dashboards = tabs.filter((tab) => tab.url === dashboardUrl || tab.url === "chrome://newtab/");
  els.closeExtraDashboardsBtn.hidden = dashboards.length <= 1;
}

async function loadSavedItems() {
  const result = await chrome.storage.local.get(SAVED_KEY);
  savedItems = Array.isArray(result[SAVED_KEY]) ? result[SAVED_KEY] : [];
}

async function loadWorkspaceItems() {
  const result = await chrome.storage.local.get(WORKSPACE_KEY);
  workspaceItems = Array.isArray(result[WORKSPACE_KEY]) ? result[WORKSPACE_KEY] : [];
}

async function loadWorkspaceTask() {
  const response = await chrome.runtime.sendMessage({ type: "workspace:task-get" }).catch(() => null);
  if (response?.ok) {
    workspaceTask = normalizeWorkspaceTask(response.data);
    return;
  }
  const result = await chrome.storage.local.get(WORKSPACE_TASK_KEY).catch(() => ({}));
  workspaceTask = normalizeWorkspaceTask(result[WORKSPACE_TASK_KEY]);
}

async function loadPluginSettings() {
  const response = await chrome.runtime.sendMessage({ type: "settings:get" }).catch(() => null);
  pluginSettings = response?.ok && response.data && typeof response.data === "object"
    ? response.data
    : getDefaultPluginSettings();
}

async function loadAiSettings() {
  const response = await chrome.runtime.sendMessage({ type: "ai-settings:get" }).catch(() => null);
  aiSettings = getAiSettingsFromResponse(response) || await loadAiSettingsFromStorage();
}

async function loadAiSuggestions() {
  const response = await chrome.runtime.sendMessage({ type: "ai-suggestions:list" }).catch(() => null);
  aiSuggestions = response?.ok && Array.isArray(response.data) ? response.data : [];
}

async function loadAiHistory() {
  const response = await chrome.runtime.sendMessage({ type: "ai-history:list", limit: 120 }).catch(() => null);
  if (response?.ok && Array.isArray(response.data)) {
    aiHistory = response.data;
    return;
  }
  const result = await chrome.storage.local.get(AI_HISTORY_KEY).catch(() => ({}));
  aiHistory = Array.isArray(result[AI_HISTORY_KEY]) ? result[AI_HISTORY_KEY] : [];
}

async function loadAiWindowPlans() {
  const response = await chrome.runtime.sendMessage({ type: "ai-window:history", limit: 50 }).catch(() => null);
  if (response?.ok && Array.isArray(response.data)) {
    aiWindowPlans = response.data;
    return;
  }
  const result = await chrome.storage.local.get(AI_WINDOW_PLANS_KEY).catch(() => ({}));
  aiWindowPlans = Array.isArray(result[AI_WINDOW_PLANS_KEY]) ? result[AI_WINDOW_PLANS_KEY] : [];
}

async function loadAiUsage() {
  const result = await chrome.storage.local.get(AI_USAGE_KEY).catch(() => ({}));
  aiUsage = normalizeAiUsage(result[AI_USAGE_KEY]);
}

async function loadRules() {
  const response = await chrome.runtime.sendMessage({ type: "rules:list" }).catch(() => null);
  userRules = response?.ok && Array.isArray(response.data) ? response.data : [];
}

async function loadCustomGroups() {
  const response = await chrome.runtime.sendMessage({ type: "custom-groups:list" }).catch(() => null);
  customGroups = getCustomGroupsFromResponse(response);
  if (!customGroups.length) {
    customGroups = await loadCustomGroupsFromStorage();
  }
}

async function loadActionLogs() {
  const response = await chrome.runtime.sendMessage({ type: "logs:list", limit: 120 }).catch(() => null);
  actionLogs = response?.ok && Array.isArray(response.data) ? response.data : [];
}

async function loadMemories() {
  const response = await chrome.runtime.sendMessage({ type: "memories:list", limit: 80 }).catch(() => null);
  memories = response?.ok && Array.isArray(response.data) ? response.data : [];
}

async function loadClassificationPreviews() {
  const tabIds = openTabs.map((tab) => tab.id).filter(Number.isInteger);
  if (!tabIds.length) {
    classificationPreviews = new Map();
    return;
  }

  const response = await chrome.runtime.sendMessage({ type: "classification:preview-tabs", tabIds }).catch(() => null);
  const items = response?.ok && Array.isArray(response.data) ? response.data : [];
  classificationPreviews = new Map(items.map((item) => [Number(item.tabId), item]));
}

async function saveSavedItems(items) {
  savedItems = items;
  await chrome.storage.local.set({ [SAVED_KEY]: savedItems });
}

async function saveWorkspaceItems(items) {
  workspaceItems = normalizeWorkspaceItems(items);
  await chrome.storage.local.set({ [WORKSPACE_KEY]: workspaceItems });
}

async function clearWorkspaceTask() {
  workspaceTask = null;
  await chrome.runtime.sendMessage({ type: "workspace:task-clear" }).catch(() =>
    chrome.storage.local.set({ [WORKSPACE_TASK_KEY]: null })
  );
}

async function loadCustomGroupsFromStorage() {
  const result = await chrome.storage.local.get(CUSTOM_GROUPS_KEY).catch(() => ({}));
  return Array.isArray(result[CUSTOM_GROUPS_KEY]) ? result[CUSTOM_GROUPS_KEY] : [];
}

async function loadAiSettingsFromStorage() {
  const result = await chrome.storage.local.get(AI_SETTINGS_KEY).catch(() => ({}));
  return result[AI_SETTINGS_KEY] && typeof result[AI_SETTINGS_KEY] === "object"
    ? result[AI_SETTINGS_KEY]
    : null;
}

function getAiSettingsFromResponse(response) {
  if (response?.ok && response.data && typeof response.data === "object") return response.data;
  if (response && typeof response === "object" && "enabled" in response) return response;
  if (response?.data && typeof response.data === "object") return response.data;
  return null;
}

function getDefaultPluginSettings() {
  return {
    enabled: true,
    automationLevel: "balanced",
    behavior: {
      enableMemory: true,
      enableBuiltinClassifier: true,
      enableCustomGroups: true,
      createGroupsForBuiltinClassifier: true
    }
  };
}

function normalizeAiUsage(value) {
  const today = new Date().toISOString().slice(0, 10);
  const usage = value && typeof value === "object" ? value : {};
  if (usage.date && usage.date !== today) {
    return { date: today, count: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  }
  const promptTokens = Math.max(0, Math.floor(Number(usage.promptTokens || 0)));
  const completionTokens = Math.max(0, Math.floor(Number(usage.completionTokens || 0)));
  const totalTokens = Math.max(0, Math.floor(Number(usage.totalTokens || promptTokens + completionTokens)));
  return {
    date: usage.date || today,
    count: Math.max(0, Math.floor(Number(usage.count || 0))),
    promptTokens,
    completionTokens,
    totalTokens
  };
}

function getCustomGroupsFromResponse(response) {
  if (Array.isArray(response)) return response;
  if (response?.ok && Array.isArray(response.data)) return response.data;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

function normalizeWorkspaceItems(items) {
  const seen = new Set();
  const normalized = [];
  for (const item of items) {
    if (!item?.url || seen.has(item.url)) continue;
    seen.add(item.url);
    normalized.push(item);
    if (normalized.length >= WORKSPACE_LIMIT) break;
  }
  return normalized;
}

function normalizeWorkspaceTask(value) {
  const input = value && typeof value === "object" ? value : {};
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) return null;
  return {
    id: typeof input.id === "string" && input.id.trim() ? input.id.trim() : `workspace_task_${Date.now()}`,
    title,
    summary: typeof input.summary === "string" ? input.summary.trim() : "",
    tabUrls: Array.isArray(input.tabUrls) ? input.tabUrls.filter((url) => typeof url === "string" && url.trim()) : [],
    sourcePlanId: typeof input.sourcePlanId === "string" ? input.sourcePlanId : "",
    sourceCandidateId: typeof input.sourceCandidateId === "string" ? input.sourceCandidateId : "",
    createdAt: Number(input.createdAt || Date.now()),
    updatedAt: Number(input.updatedAt || Date.now())
  };
}

function groupTabsByDomain(tabs) {
  const groups = new Map();
  for (const tab of tabs) {
    const bucket = getTabGroupingBucket(tab);
    if (!groups.has(bucket.key)) groups.set(bucket.key, { ...bucket, tabs: [] });
    groups.get(bucket.key).tabs.push(tab);
  }
  return Array.from(groups.values()).sort((a, b) => b.tabs.length - a.tabs.length || a.label.localeCompare(b.label));
}

function getTabGroupingBucket(tab) {
  const chromeGroupName = String(tab.groupTitle || "").trim();
  if (chromeGroupName) {
    return {
      key: `chrome:${chromeGroupName}`,
      hostname: chromeGroupName,
      label: translateCategoryName(chromeGroupName),
      source: "chrome_group",
      sourceLabel: currentLanguage === "zh" ? "当前浏览器分组" : "Current browser group"
    };
  }

  const preview = classificationPreviews.get(tab.id);
  const previewName = String(preview?.groupName || "").trim();
  if (previewName) {
    return {
      key: `preview:${previewName}`,
      hostname: previewName,
      label: translateCategoryName(previewName),
      source: "preview",
      sourceLabel: sourceLabel(preview.source)
    };
  }

  const domain = tab.primaryDomain || getPrimaryDomain(tab.hostname) || tab.hostname || "unknown";
  return {
    key: `domain:${domain}`,
    hostname: domain,
    label: friendlyDomain(domain),
    source: "domain",
    sourceLabel: currentLanguage === "zh" ? "域名回退" : "Domain fallback"
  };
}

function getDuplicateStats(tabs) {
  const counts = new Map();
  for (const tab of tabs) counts.set(tab.normalizedUrl, (counts.get(tab.normalizedUrl) || 0) + 1);
  const duplicateUrls = Array.from(counts.entries()).filter(([, count]) => count > 1);
  return {
    duplicateUrls: duplicateUrls.map(([url]) => url),
    extraCount: duplicateUrls.reduce((sum, [, count]) => sum + count - 1, 0),
    counts
  };
}

function isFocusGroup(group, duplicateStats) {
  return group.tabs.length >= FOCUS_GROUP_MIN_SIZE || group.tabs.some((tab) => (duplicateStats.counts.get(tab.normalizedUrl) || 0) > 1);
}

function getClosableDuplicateIds(tabs) {
  const buckets = new Map();
  for (const tab of tabs) {
    const key = tab.normalizedUrl;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(tab);
  }

  const ids = [];
  for (const bucket of buckets.values()) {
    if (bucket.length <= 1) continue;
    const keeper = bucket.find((tab) => tab.active) || bucket.find((tab) => tab.pinned) || bucket[0];
    for (const tab of bucket) {
      if (tab.id !== keeper.id && !tab.pinned) ids.push(tab.id);
    }
  }
  return ids;
}

function isOpenableUrl(url = "") {
  return /^https?:\/\//i.test(url);
}

function filteredGroups() {
  const lowered = query.trim().toLowerCase();
  const duplicateStats = getDuplicateStats(openTabs);
  const groups = groupTabsByDomain(openTabs);
  return groups
    .map((group) => ({
      ...group,
      tabs: lowered ? group.tabs.filter((tab) =>
        group.label.toLowerCase().includes(lowered) ||
        group.hostname.toLowerCase().includes(lowered) ||
        tab.hostname.toLowerCase().includes(lowered) ||
        (tab.primaryDomain || "").toLowerCase().includes(lowered) ||
        tab.cleanTitle.toLowerCase().includes(lowered) ||
        tab.url.toLowerCase().includes(lowered)
      ) : group.tabs
    }))
    .filter((group) => group.tabs.length)
    .filter((group) => {
      if (filterMode === "duplicates") return group.tabs.some((tab) => (duplicateStats.counts.get(tab.normalizedUrl) || 0) > 1);
      if (filterMode === "focus") return isFocusGroup(group, duplicateStats);
      return true;
    });
}

function render() {
  const groups = filteredGroups();
  const duplicateStats = getDuplicateStats(openTabs);
  const allGroups = groupTabsByDomain(openTabs);
  const focusGroups = allGroups.filter((group) => isFocusGroup(group, duplicateStats));
  const closableDuplicateIds = getClosableDuplicateIds(openTabs);
  const displayMemories = getDisplayMemories(memories);

  els.dateLine.textContent = new Date().toLocaleDateString(currentLanguage === "zh" ? "zh-CN" : "en-US", { weekday: "long", month: "long", day: "numeric" });
  els.domainCount.textContent = String(allGroups.length);
  els.openTabCount.textContent = String(openTabs.length);
  els.duplicateCount.textContent = String(duplicateStats.extraCount);
  els.focusCount.textContent = String(focusGroups.length);
  if (els.railManagedText) els.railManagedText.textContent = t("managedTabs", { count: openTabs.length });
  if (els.railProgressBar) els.railProgressBar.style.width = `${Math.min(100, Math.round((openTabs.length / 100) * 100))}%`;
  els.resultSummary.textContent = getResultSummary(groups.length, allGroups.length);
  if (els.globalSearchInput && els.globalSearchInput.value !== query) els.globalSearchInput.value = query;
  const workspaceTaskTitle = workspaceTask?.title ? `${t("workspace")} · ${workspaceTask.title}` : t("workspace");
  if (els.workspaceTitle) els.workspaceTitle.textContent = workspaceTaskTitle;
  const workspaceTaskSummary = workspaceTask?.summary || "";
  els.workspaceCount.textContent = workspaceTaskSummary
    ? `${workspaceTaskSummary} · ${t("pages", { count: workspaceItems.length })}`
    : t("pages", { count: workspaceItems.length });
  els.workspaceCount.title = els.workspaceCount.textContent;
  els.savedCount.textContent = t("pages", { count: savedItems.length });
  els.clearSearchBtn.hidden = !query;
  els.closeAllDupesBtn.disabled = closableDuplicateIds.length === 0;
  els.classifyVisibleBtn.disabled = groups.reduce((sum, group) => sum + group.tabs.length, 0) === 0;
  els.openWorkspaceBtn.disabled = workspaceItems.length === 0;
  els.clearWorkspaceBtn.disabled = workspaceItems.length === 0;
  els.savedToWorkspaceBtn.disabled = savedItems.length === 0;
  els.clearSavedBtn.disabled = savedItems.length === 0;
  document.querySelectorAll(".segment").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === filterMode);
  });
  document.querySelectorAll(".metric-card").forEach((card) => {
    const filter = card.dataset.metricFilter || "all";
    card.classList.toggle("is-active", filter === filterMode);
  });
  applyActiveView();

  els.domainList.innerHTML = groups.length
    ? groups.map((group) => renderDomainCard(group, duplicateStats)).join("")
    : `<div class="empty">${query || filterMode !== "all" ? t("noMatchedGroups") : t("noTabsToOrganize")}</div>`;

  els.savedList.innerHTML = savedItems.length
    ? savedItems.map(renderSavedItem).join("")
    : `<div class="empty">${t("noLaterPages")}</div>`;

  els.workspaceList.innerHTML = workspaceItems.length
    ? workspaceItems.map(renderWorkspaceItem).join("")
    : `<div class="empty">${t("workspaceEmpty")}</div>`;

  renderCategories();

  els.aiSuggestionCount.textContent = t("pendingSuggestions", { count: aiSuggestions.length });
  els.aiSuggestionList.innerHTML = aiSuggestions.length
    ? aiSuggestions.map(renderAiSuggestion).join("")
    : `<div class="empty">${t("noAiSuggestions")}</div>`;

  renderAiHistory();
  renderAiWindowPlans();

  els.memoryCount.textContent = displayMemories.length === memories.length
    ? t("stableMemories", { count: displayMemories.length })
    : t("mergedMemories", { count: displayMemories.length, merged: memories.length - displayMemories.length });
  els.memoryList.innerHTML = displayMemories.length
    ? displayMemories.map(renderMemoryItem).join("")
    : `<div class="empty">${t("noMemories")}</div>`;

  renderAutomationStatus();
  renderRulesAndLogs();
}

function renderAiSettings(options = {}) {
  if (!aiSettings) return;
  if (aiSettingsDraftDirty && !options.force) return;
  els.aiEnabledInput.checked = Boolean(aiSettings.enabled);
  els.aiBaseUrlInput.value = aiSettings.baseUrl || "";
  els.aiModelInput.value = aiSettings.model || "";
  els.aiApiKeyInput.value = aiSettings.apiKey || "";
  els.aiAutoThresholdInput.value = String(aiSettings.autoApplyThreshold ?? 0.88);
  els.aiSuggestThresholdInput.value = String(aiSettings.suggestThreshold ?? 0.65);
  els.aiDailyLimitInput.value = String(aiSettings.dailyLimit ?? 100);
  els.aiCooldownInput.value = String(aiSettings.cooldownHours ?? 24);
}

function renderPluginSettings() {
  const settings = pluginSettings || getDefaultPluginSettings();
  const behavior = settings.behavior || {};
  if (els.automationEnabledInput) els.automationEnabledInput.checked = settings.enabled !== false;
  if (els.automationLevelSelect) els.automationLevelSelect.value = settings.automationLevel || "balanced";
  if (els.enableMemoryInput) els.enableMemoryInput.checked = behavior.enableMemory !== false;
  if (els.enableBuiltinInput) els.enableBuiltinInput.checked = behavior.enableBuiltinClassifier !== false;
  if (els.enableCustomGroupsInput) els.enableCustomGroupsInput.checked = behavior.enableCustomGroups !== false;
  if (els.createBuiltinGroupsInput) els.createBuiltinGroupsInput.checked = behavior.createGroupsForBuiltinClassifier !== false;
}

function getResultSummary(visibleCount, totalCount) {
  const modeLabel = { all: t("all"), focus: t("focus"), duplicates: t("duplicateFilter") }[filterMode] || t("all");
  if (query.trim()) return t("resultWithQuery", { mode: modeLabel, visible: visibleCount, total: totalCount });
  return t("resultSummary", { mode: modeLabel, visible: visibleCount });
}

function renderAutomationStatus() {
  const aiEnabled = Boolean(aiSettings?.enabled);
  const aiReady = Boolean(aiEnabled && aiSettings?.baseUrl && aiSettings?.model && aiSettings?.apiKey);
  const activeRules = userRules.filter((rule) => rule.enabled).length;
  const latest = actionLogs[0];
  els.aiStateText.textContent = aiReady ? t("enabled") : aiEnabled ? t("needsConfig") : t("off");
  els.ruleCountText.textContent = String(activeRules);
  els.pendingSuggestionText.textContent = String(aiSuggestions.length);
  els.recentLogCountText.textContent = String(actionLogs.length);
  els.aiTokenText.textContent = formatCompactNumber(aiUsage?.totalTokens || 0);
  els.aiTokenText.title = t("aiUsageTitle", {
    count: aiUsage?.count || 0,
    prompt: aiUsage?.promptTokens || 0,
    completion: aiUsage?.completionTokens || 0,
    total: aiUsage?.totalTokens || 0
  });
  els.memoryCountText.textContent = String(memories.length);
  els.automationStatus.textContent = latest
    ? `${formatRelativeTime(latest.timestamp)} · ${sourceLabel(latest.source)} · ${actionLabel(latest.action)}`
    : t("noAutomationLogs");
}

function getAiHistoryItems() {
  const records = aiHistory
    .map(normalizeAiHistoryRecord)
    .filter(Boolean);
  const legacyLogs = actionLogs
    .filter((log) => log.source === "ai_classifier")
    .map(normalizeAiHistoryRecord)
    .filter(Boolean);
  return dedupeAiHistoryItems([...records, ...legacyLogs]);
}

function dedupeAiHistoryItems(items) {
  const bySignature = new Map();
  for (const item of items) {
    const signature = getAiHistorySignature(item);
    const existing = bySignature.get(signature);
    if (!existing || shouldPreferAiHistoryItem(item, existing)) {
      bySignature.set(signature, item);
    }
  }
  return Array.from(bySignature.values())
    .sort((a, b) => (b.createdAt || b.timestamp || 0) - (a.createdAt || a.timestamp || 0));
}

function getAiHistorySignature(item) {
  const normalizedUrl = item.normalizedUrl || normalizeUrl(item.url || "");
  const groupName = item.groupName || "";
  const action = item.action || aiStatusToAction(item.status);
  const confidence = Math.round((item.confidence || 0) * 100);
  const reason = String(item.reason || "").trim().replace(/\s+/g, " ");
  return [normalizedUrl, groupName, action, confidence, reason].join("|");
}

function shouldPreferAiHistoryItem(candidate, current) {
  const candidateTokens = Number(candidate.totalTokens || 0);
  const currentTokens = Number(current.totalTokens || 0);
  if (candidateTokens !== currentTokens) return candidateTokens > currentTokens;
  const candidateCreatedAt = candidate.createdAt || candidate.timestamp || 0;
  const currentCreatedAt = current.createdAt || current.timestamp || 0;
  return candidateCreatedAt > currentCreatedAt;
}

function normalizeAiHistoryRecord(item) {
  if (!item || typeof item !== "object") return null;
  const createdAt = Number(item.createdAt || item.timestamp || 0);
  return {
    ...item,
    createdAt,
    timestamp: createdAt,
    action: item.action || aiStatusToAction(item.status),
    source: item.source || "ai_classifier",
    confidence: Number(item.confidence || 0),
    promptTokens: Math.max(0, Math.floor(Number(item.promptTokens || 0))),
    completionTokens: Math.max(0, Math.floor(Number(item.completionTokens || 0))),
    totalTokens: Math.max(0, Math.floor(Number(item.totalTokens || 0)))
  };
}

function aiStatusToAction(status) {
  if (status === "auto_applied") return "create_group";
  if (status === "suggested" || status === "unusable" || status === "failed") return "none";
  return "none";
}

function renderAiHistory() {
  const items = getAiHistoryItems();
  els.aiHistoryCount.textContent = t("aiHistoryCount", { count: items.length, tokens: formatCompactNumber(aiUsage?.totalTokens || 0) });
  els.aiHistoryList.innerHTML = items.length
    ? items.slice(0, 40).map(renderAiHistoryItem).join("")
    : `<div class="empty">${t("noAiHistory")}</div>`;
}

function renderAiWindowPlans() {
  if (!els.aiWindowPlanList || !els.aiWindowPlanCount) return;
  const plans = aiWindowPlans
    .slice()
    .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
  els.aiWindowPlanCount.textContent = t("aiWindowPlanCount", { count: plans.length });
  els.aiWindowPlanList.innerHTML = plans.length
    ? plans.slice(0, 30).map(renderAiWindowPlanItem).join("")
    : `<div class="empty">${t("noAiWindowHistory")}</div>`;
}

function renderAiWindowPlanItem(plan) {
  const summary = plan.appliedSummary || {};
  const actions = Array.isArray(plan.actions) ? plan.actions : [];
  const candidates = Array.isArray(plan.workspaceCandidates) ? plan.workspaceCandidates : [];
  const signals = plan.localSignals || {};
  const tokenText = plan.totalTokens ? ` · ${formatCompactNumber(plan.totalTokens)} token` : " · local";
  const status = aiWindowPlanStatusLabel(plan.status);
  const candidateText = candidates.length
    ? candidates.slice(0, 2).map((candidate) => candidate.title || "Workspace").join(" / ")
    : t("noWorkspaceCandidates");
  const actionText = [
    `${t("workspace")} ${summary.workspace || 0}`,
    `${t("later")} ${summary.later || 0}`,
    `${t("duplicates")} ${summary.closeDuplicate || 0}`,
    `${t("failed")} ${summary.failed || 0}`
  ].join(" · ");
  return `
    <article class="ai-window-plan-item">
      <div class="ai-history-head">
        <div>
          <div class="ai-history-title">${escapeHtml(plan.summary || "Window plan")}</div>
          <div class="ai-history-meta">${escapeHtml(formatDateTime(plan.createdAt))} · ${escapeHtml(status)}${escapeHtml(tokenText)}</div>
        </div>
        <span class="badge">${escapeHtml(String(candidates.length || actions.length))}</span>
      </div>
      <div class="ai-history-target">${escapeHtml(candidateText)}</div>
      <div class="ai-history-target">${escapeHtml(actionText)}</div>
      <div class="ai-history-reason">
        ${escapeHtml(t("localSignals"))}:
        ${escapeHtml(String((signals.duplicateTabIds || []).length))} duplicate,
        ${escapeHtml(String((signals.protectedTabIds || []).length))} protected,
        ${escapeHtml(String((signals.alreadyWorkspaceTabIds || []).length))} workspace,
        ${escapeHtml(String((signals.alreadyLaterTabIds || []).length))} later
      </div>
    </article>
  `;
}

function aiWindowPlanStatusLabel(status) {
  const zh = {
    suggested: "待确认",
    partially_applied: "部分执行",
    applied: "已执行",
    failed: "有失败"
  };
  const en = {
    suggested: "Suggested",
    partially_applied: "Partially applied",
    applied: "Applied",
    failed: "Failed"
  };
  return (currentLanguage === "zh" ? zh : en)[status] || status || "suggested";
}

function renderRulesAndLogs() {
  const activeRules = userRules.filter((rule) => rule.enabled);
  syncRuleGroupOptions();
  els.rulesPanelMeta.textContent = t("activeRuleCount", { count: activeRules.length });
  els.rulesCount.textContent = String(activeRules.length);
  els.logsCount.textContent = String(actionLogs.length);
  els.rulesList.innerHTML = activeRules.length
    ? activeRules.slice().sort((a, b) => b.priority - a.priority || b.updatedAt - a.updatedAt).map(renderRuleItem).join("")
    : `<div class="empty compact-empty">${t("noRules")}</div>`;
  els.logsList.innerHTML = actionLogs.length
    ? actionLogs.slice(0, 12).map(renderLogItem).join("")
    : `<div class="empty compact-empty">${t("noRecords")}</div>`;
}

function renderDomainCard(group, duplicateStats) {
  const hasDupes = group.tabs.some((tab) => (duplicateStats.counts.get(tab.normalizedUrl) || 0) > 1);
  const representativeHost = group.tabs.find((tab) => tab.hostname)?.hostname || group.hostname;
  const favicon = group.tabs.find((tab) => tab.favIconUrl)?.favIconUrl || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(representativeHost)}&sz=32`;
  const isExpanded = expandedHosts.has(group.key);
  const visibleTabs = isExpanded ? group.tabs : group.tabs.slice(0, PAGE_PREVIEW_LIMIT);
  const hiddenCount = group.tabs.length - visibleTabs.length;
  const duplicateCount = group.tabs.filter((tab) => (duplicateStats.counts.get(tab.normalizedUrl) || 0) > 1).length;
  const pinnedCount = group.tabs.filter((tab) => tab.pinned).length;
  const subdomainCount = new Set(group.tabs.map((tab) => tab.hostname).filter(Boolean)).size;
  const domainMetaParts = [
    group.sourceLabel,
    group.source === "domain" ? group.hostname : "",
    subdomainCount > 1 ? t("subdomains", { count: subdomainCount }) : "",
    t("tabCount", { count: group.tabs.length }),
    pinnedCount ? t("pinnedCount", { count: pinnedCount }) : ""
  ].filter(Boolean);
  const domainMeta = domainMetaParts.join(" · ");

  return `
    <article class="domain-card ${hasDupes ? "is-duplicate" : ""}" data-group-key="${escapeHtml(group.key)}" data-hostname="${escapeHtml(group.hostname)}" data-group-label="${escapeHtml(group.label)}">
      <div class="domain-head">
        <div class="domain-name">
          <img class="favicon" src="${escapeHtml(favicon)}" alt="" />
          <div>
            <div class="domain-title">${escapeHtml(group.label)}</div>
            <div class="domain-meta">${escapeHtml(domainMeta)}</div>
          </div>
        </div>
        ${hasDupes ? `<span class="badge warn">${t("duplicateCount", { count: duplicateCount })}</span>` : `<span class="badge">${group.tabs.length}</span>`}
      </div>
      <div class="page-list">
        ${visibleTabs.map(renderPageChip).join("")}
        ${hiddenCount > 0 || isExpanded ? `
          <div class="page-chip is-more">
            <button class="show-more-btn" data-action="toggle-domain-pages" type="button">
              ${isExpanded ? t("collapsePages") : t("expandPages", { count: hiddenCount })}
            </button>
          </div>
        ` : ""}
      </div>
      <div class="domain-actions">
        <button data-action="classify-domain" type="button">${t("autoGroup")}</button>
        <button class="primary-action" data-action="focus-domain" type="button">${t("openThisGroup")}</button>
        <button data-action="workspace-domain" type="button">${t("placeInWorkspace")}</button>
        <button data-action="save-domain" type="button">${t("saveForLater")}</button>
        ${hasDupes ? `<button data-action="close-domain-dupes" type="button">${t("closeDuplicates")}</button>` : ""}
        <button class="danger-action" data-action="close-domain" type="button">${t("closeGroup")}</button>
      </div>
    </article>
  `;
}

function renderPageChip(tab) {
  const categoryOptions = renderCategoryOptions(tab.groupTitle || "");
  return `
    <div class="page-chip ${tab.active ? "is-active-tab" : ""}" data-tab-id="${tab.id}">
      <span class="page-title">${escapeHtml(tab.cleanTitle)}</span>
      <span class="page-actions">
        ${tab.pinned ? `<span class="status-dot">${t("pinned")}</span>` : ""}
        ${tab.active ? `<span class="status-dot active">${t("current")}</span>` : ""}
        <button class="mini-btn" data-action="focus-tab" type="button">${t("open")}</button>
        <button class="mini-btn" data-action="workspace-tab" type="button">${t("workspace")}</button>
        <button class="mini-btn" data-action="save-tab" type="button">${t("later")}</button>
      </span>
      <span class="tab-classify" aria-label="${t("manualCategoryLabel")}">
        <select class="category-select compact" data-role="tab-category-select" aria-label="${t("selectCategory")}">
          ${categoryOptions}
        </select>
        <button class="mini-btn primary-action" data-action="apply-category-tab" type="button">${t("applyToTab")}</button>
      </span>
    </div>
  `;
}

function renderSavedItem(item) {
  const hostname = getHostname(item.url);
  return `
    <article class="saved-item" data-saved-id="${escapeHtml(item.id)}">
      <div>
        <div class="saved-title">${escapeHtml(item.title || friendlyDomain(hostname))}</div>
        <div class="saved-meta">${escapeHtml(hostname)}</div>
      </div>
      <div class="page-actions">
        <button class="mini-btn" data-action="open-saved" type="button">${t("open")}</button>
        <button class="mini-btn" data-action="workspace-saved" type="button">${t("workspace")}</button>
        <button class="mini-btn" data-action="delete-saved" type="button">${t("delete")}</button>
      </div>
    </article>
  `;
}

function renderWorkspaceItem(item) {
  const hostname = getHostname(item.url);
  return `
    <article class="workspace-item" data-workspace-id="${escapeHtml(item.id)}">
      <div>
        <div class="workspace-title">${escapeHtml(item.title || friendlyDomain(hostname))}</div>
        <div class="workspace-meta">${escapeHtml(hostname)}</div>
      </div>
      <div class="page-actions">
        <button class="mini-btn" data-action="open-workspace" type="button">${t("open")}</button>
        <button class="mini-btn" data-action="remove-workspace" type="button">${t("remove")}</button>
      </div>
    </article>
  `;
}

function getCategoryKeywordText(group) {
  const parts = [
    ...(Array.isArray(group.domains) ? group.domains : []),
    ...(Array.isArray(group.keywords) ? group.keywords : []),
    ...(Array.isArray(group.urlPatterns) ? group.urlPatterns : []),
    ...(Array.isArray(group.pathPatterns) ? group.pathPatterns : [])
  ].filter(Boolean);
  return parts.length ? parts.slice(0, 3).join(currentLanguage === "zh" ? "、" : ", ") : t("manualCategory");
}

function getAvailableCategoryChoices() {
  const customItems = customGroups
    .slice()
    .sort((a, b) => b.priority - a.priority || b.updatedAt - a.updatedAt)
    .map((group) => ({
      name: group.groupName,
      kind: t("custom"),
      color: group.color
    }));
  const builtinItems = BUILTIN_CATEGORY_NAMES
    .filter((name) => name !== UNCATEGORIZED_CATEGORY_NAME)
    .map((name) => ({
      name,
      kind: t("builtin")
    }));
  const seen = new Set();
  return [...customItems, ...builtinItems].filter((item) => {
    const key = item.name.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function renderCategoryOptions(selectedName = "") {
  const selected = String(selectedName || "").trim();
  const choices = getAvailableCategoryChoices();
  const hasSelectedChoice = selected && choices.some((category) => category.name === selected);
  const options = choices
    .map((category) => {
      const isSelected = category.name === selected ? " selected" : "";
      return `<option value="${escapeHtml(category.name)}"${isSelected}>${escapeHtml(t("categoryKindLabel", { name: translateCategoryName(category.name), kind: category.kind }))}</option>`;
    })
    .join("");
  if (hasSelectedChoice) return options;
  return `<option value="" selected>${t("selectCategory")}</option>${options}`;
}

function renderRuleGroupOptions(selectedName = "") {
  const selected = String(selectedName || "").trim();
  const choices = getAvailableCategoryChoices();
  const hasSelectedChoice = selected && choices.some((category) => category.name === selected);
  const placeholderSelected = hasSelectedChoice ? "" : " selected";
  const options = choices
    .map((category) => {
      const isSelected = category.name === selected ? " selected" : "";
      const label = t("categoryKindLabel", { name: translateCategoryName(category.name), kind: category.kind });
      return `<option value="${escapeHtml(category.name)}"${isSelected}>${escapeHtml(label)}</option>`;
    })
    .join("");
  return `<option value=""${placeholderSelected}>${escapeHtml(t("targetGroupPlaceholder"))}</option>${options}`;
}

function syncRuleGroupOptions() {
  if (!els.ruleGroupNameInput) return;
  els.ruleGroupNameInput.innerHTML = renderRuleGroupOptions(els.ruleGroupNameInput.value);
}

function getCategoryTabCounts(categories) {
  const categoryNames = new Set(categories.map((category) => category.groupName));
  const counts = new Map();
  for (const tab of openTabs) {
    const groupName = String(tab.groupTitle || "").trim();
    if (!groupName && categoryNames.has(UNCATEGORIZED_CATEGORY_NAME)) {
      counts.set(UNCATEGORIZED_CATEGORY_NAME, (counts.get(UNCATEGORIZED_CATEGORY_NAME) || 0) + 1);
      continue;
    }
    if (!categoryNames.has(groupName)) continue;
    counts.set(groupName, (counts.get(groupName) || 0) + 1);
  }
  return counts;
}

function getTabsForCategory(categoryName = "") {
  const normalizedName = String(categoryName || "").trim();
  if (!normalizedName) return [];
  return openTabs
    .filter((tab) => {
      const groupName = String(tab.groupTitle || "").trim();
      if (normalizedName === UNCATEGORIZED_CATEGORY_NAME) return !groupName;
      return groupName === normalizedName;
    })
    .sort((a, b) => friendlyDomain(a.hostname).localeCompare(friendlyDomain(b.hostname)) || a.cleanTitle.localeCompare(b.cleanTitle));
}

function renderCategories() {
  syncCategoryFormMode();
  const builtinItems = BUILTIN_CATEGORY_NAMES.map((name) => ({
    id: `builtin:${name}`,
    groupName: name,
    kind: t("builtin"),
    meta: t("systemCategory")
  }));
  const customItems = customGroups
    .slice()
    .sort((a, b) => b.priority - a.priority || b.updatedAt - a.updatedAt)
    .map((group) => ({
      ...group,
      kind: t("custom"),
      meta: getCategoryKeywordText(group)
    }));
  const seen = new Set();
  const categories = [...customItems, ...builtinItems].filter((category) => {
    const key = String(category.groupName || "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const tabCounts = getCategoryTabCounts(categories);
  const assignedTabCount = Array.from(tabCounts.values()).reduce((sum, count) => sum + count, 0);
  els.categoryCount.textContent = t("categorySummary", { total: categories.length, assigned: assignedTabCount, custom: customItems.length });
  els.categoryList.innerHTML = categories.length
    ? categories.map((category) => renderCategoryItem(category, tabCounts.get(category.groupName) || 0)).join("")
    : `<div class="empty">${t("categoryCount", { total: 0 })}</div>`;
}

function renderCategoryItem(category, tabCount = 0) {
  const isCustom = category.kind === t("custom");
  const isExpanded = expandedCategories.has(category.groupName);
  const tabs = isExpanded ? getTabsForCategory(category.groupName) : [];
  return `
    <article class="category-item ${isExpanded ? "is-expanded" : ""}" data-category-id="${escapeHtml(category.id)}" data-category-name="${escapeHtml(category.groupName)}">
      <div class="category-row">
        <div>
          <div class="category-title">${escapeHtml(translateCategoryName(category.groupName))}</div>
          <div class="category-meta">${escapeHtml(t("tabCount", { count: tabCount }))} · ${escapeHtml(category.meta)}</div>
        </div>
        <div class="page-actions">
          <span class="category-kind">${escapeHtml(category.kind)}</span>
          <button class="mini-btn" data-action="toggle-category-tabs" type="button">${isExpanded ? t("hideCategoryTabs") : t("viewCategoryTabs")}</button>
          ${isCustom ? `
            <button class="mini-btn" data-action="edit-category" type="button">${t("edit")}</button>
            <button class="mini-btn danger-action" data-action="delete-category" type="button">${t("delete")}</button>
          ` : ""}
        </div>
      </div>
      ${isExpanded ? `
        <div class="category-tab-list">
          ${tabs.length ? tabs.map(renderCategoryTabItem).join("") : `<div class="empty compact-empty">${t("noCategoryTabs")}</div>`}
        </div>
      ` : ""}
    </article>
  `;
}

function renderCategoryTabItem(tab) {
  const hostname = tab.hostname || getHostname(tab.url);
  return `
    <div class="category-tab-item" data-tab-id="${tab.id}">
      <div>
        <div class="category-tab-title">${escapeHtml(tab.cleanTitle || tab.title || tab.url)}</div>
        <div class="category-tab-meta">${escapeHtml(friendlyDomain(hostname))} · ${escapeHtml(hostname)}</div>
      </div>
      <div class="page-actions">
        ${tab.pinned ? `<span class="status-dot">${t("pinned")}</span>` : ""}
        ${tab.active ? `<span class="status-dot active">${t("current")}</span>` : ""}
        <button class="mini-btn" data-action="focus-category-tab" type="button">${t("open")}</button>
        <button class="mini-btn" data-action="workspace-category-tab" type="button">${t("workspace")}</button>
        <button class="mini-btn" data-action="save-category-tab" type="button">${t("later")}</button>
      </div>
    </div>
  `;
}

function renderAiSuggestion(suggestion) {
  const confidence = Math.round((suggestion.confidence || 0) * 100);
  return `
    <article class="ai-suggestion" data-suggestion-id="${escapeHtml(suggestion.id)}">
      <div class="ai-suggestion-head">
        <div>
          <div class="ai-suggestion-title">${escapeHtml(suggestion.domain)} → ${escapeHtml(suggestion.groupName)}</div>
          <div class="ai-suggestion-meta">${confidence}% · ${escapeHtml(suggestion.pageType || "unknown")}${suggestion.sampleTitle ? ` · ${escapeHtml(suggestion.sampleTitle)}` : ""}</div>
        </div>
        <span class="badge">${confidence}%</span>
      </div>
      <div class="ai-suggestion-reason">${escapeHtml(suggestion.reason)}</div>
      <div class="ai-suggestion-actions">
        <button class="primary-action" data-action="accept-ai-suggestion">${t("acceptAiSuggestion")}</button>
        <button class="soft-btn" data-action="ignore-ai-suggestion">${t("ignoreAiSuggestion")}</button>
      </div>
    </article>
  `;
}

function renderAiHistoryItem(log) {
  const confidence = Math.round((log.confidence || 0) * 100);
  const hostname = getHostname(log.url);
  const title = log.title || cleanTitle("", log.url) || friendlyDomain(hostname);
  const groupName = log.groupName || t("uncategorized");
  const classification = getAiClassificationText(log);
  const tokenText = log.totalTokens ? ` · ${formatCompactNumber(log.totalTokens)} token` : "";
  return `
    <article class="ai-history-item">
      <div class="ai-history-head">
        <div>
          <div class="ai-history-title">${escapeHtml(title)}</div>
          <div class="ai-history-meta">${escapeHtml(formatDateTime(log.createdAt || log.timestamp))} · ${escapeHtml(formatRelativeTime(log.createdAt || log.timestamp))}${escapeHtml(tokenText)}</div>
        </div>
        <span class="badge">${confidence}%</span>
      </div>
      <div class="ai-history-target">${escapeHtml(classification)}</div>
      <div class="ai-history-meta">${escapeHtml(hostname)} · ${escapeHtml(actionLabel(log.action))}</div>
      <div class="ai-history-reason">${escapeHtml(log.reason || "")}</div>
    </article>
  `;
}

function getMemoryPrimaryUrl(memory) {
  const urls = Array.isArray(memory.sampleUrls) ? memory.sampleUrls : [];
  return urls[0] || (String(memory.key || "").startsWith("http") ? memory.key : "");
}

function getMemorySignature(memory) {
  const primaryUrl = getMemoryPrimaryUrl(memory);
  if (primaryUrl) return `${memory.groupName}|${normalizeUrl(primaryUrl)}`;
  return `${memory.groupName}|${memory.keyType}|${memory.key}`;
}

function getDisplayMemories(items) {
  const merged = new Map();
  for (const memory of items) {
    const signature = getMemorySignature(memory);
    const existing = merged.get(signature);
    if (!existing) {
      merged.set(signature, {
        ...memory,
        ids: [memory.id],
        mergedCount: 1
      });
      continue;
    }
    existing.ids.push(memory.id);
    existing.mergedCount += 1;
    existing.confidence = Math.max(existing.confidence || 0, memory.confidence || 0);
    existing.hitCount = (existing.hitCount || 0) + (memory.hitCount || 0);
    existing.updatedAt = Math.max(existing.updatedAt || 0, memory.updatedAt || 0);
    existing.lastUsedAt = Math.max(existing.lastUsedAt || 0, memory.lastUsedAt || 0);
    existing.sampleUrls = Array.from(new Set([...(existing.sampleUrls || []), ...(memory.sampleUrls || [])])).slice(0, 5);
    existing.sampleTitles = Array.from(new Set([...(existing.sampleTitles || []), ...(memory.sampleTitles || [])])).slice(0, 5);
  }
  return Array.from(merged.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

function renderMemoryItem(memory) {
  const confidence = Math.round((memory.confidence || 0) * 100);
  const keyLabel = `${memory.keyType}: ${memory.key}`;
  const mergedLabel = memory.mergedCount > 1 ? ` · ${t("mergedCount", { count: memory.mergedCount })}` : "";
  return `
    <article class="memory-item" data-memory-id="${escapeHtml(memory.id)}" data-memory-ids="${escapeHtml((memory.ids || [memory.id]).join(","))}">
      <div class="memory-head">
        <div>
          <div class="memory-title">${escapeHtml(translateCategoryName(memory.groupName))}</div>
          <div class="memory-meta">${escapeHtml(keyLabel)} · ${escapeHtml(t("hitCount", { count: memory.hitCount || 0 }))} · ${escapeHtml(sourceLabel(memory.source))}${escapeHtml(mergedLabel)}</div>
        </div>
        <span class="badge">${confidence}%</span>
      </div>
      <div class="memory-reason">${escapeHtml(memory.reason || "")}</div>
      <div class="memory-actions">
        <button class="mini-btn danger-action" data-action="delete-memory" type="button">${t("deleteMemory")}</button>
      </div>
    </article>
  `;
}

function renderRuleItem(rule) {
  const target = rule.action === "group" ? translateCategoryName(rule.groupName || t("unnamedGroup")) : actionLabel(rule.action);
  return `
    <article class="rule-item" data-rule-id="${escapeHtml(rule.id)}">
      <div>
        <div class="rule-title">${escapeHtml(target)}</div>
        <div class="rule-meta">${escapeHtml(rule.type)} · ${escapeHtml(rule.value)} · ${escapeHtml(sourceLabel(rule.source))}</div>
      </div>
      <button class="mini-btn danger-action" data-action="delete-rule" type="button">${t("delete")}</button>
    </article>
  `;
}

function logUiText(key) {
  const labels = currentLanguage === "zh"
    ? {
      page: "页面",
      originalUrl: "原始网址",
      normalizedUrl: "归一化网址",
      result: "结果",
      reason: "原因",
      pageType: "页面类型",
      source: "来源",
      confidence: "置信度",
      allowCreate: "允许创建",
      temporary: "临时页",
      sensitive: "敏感页",
      shouldLearn: "写入记忆",
      yes: "是",
      no: "否",
      unknown: "未知",
      targetGroup: "目标分组"
    }
    : {
      page: "Page",
      originalUrl: "Original URL",
      normalizedUrl: "Normalized URL",
      result: "Result",
      reason: "Reason",
      pageType: "Page type",
      source: "Source",
      confidence: "Confidence",
      allowCreate: "Can create",
      temporary: "Temporary",
      sensitive: "Sensitive",
      shouldLearn: "Write memory",
      yes: "Yes",
      no: "No",
      unknown: "Unknown",
      targetGroup: "Target group"
    };
  return labels[key] || key;
}

function logBooleanLabel(value) {
  if (typeof value !== "boolean") return logUiText("unknown");
  return value ? logUiText("yes") : logUiText("no");
}

function isTemporaryLogPage(log) {
  if (typeof log.temporaryPage === "boolean") return log.temporaryPage;
  return ["login", "oauth", "redirect", "payment", "captcha", "download", "error"].includes(log.pageType);
}

function isSensitiveLogPage(log) {
  if (typeof log.sensitivePage === "boolean") return log.sensitivePage;
  return ["login", "oauth", "payment", "checkout", "invoice", "captcha"].includes(log.pageType);
}

function getLogOutcomeText(log) {
  const groupName = log.groupName ? translateCategoryName(log.groupName) : "";
  if (currentLanguage === "zh") {
    if (log.action === "create_group") return `已创建并移入「${groupName}」。`;
    if (log.action === "move_to_existing_group") return `已移入已有分组「${groupName}」。`;
    if (log.action === "wait") return "暂不处理：等待更多上下文或用户操作。";
    if (log.source === "eligibility" && isTemporaryLogPage(log)) {
      return `未移动：页面被识别为 ${log.pageType} 临时或敏感流程页，只允许继承来源分组，所以不会主动创建或移动到新分组。`;
    }
    if (log.source === "no_match") return "未移动：没有规则、记忆、自定义分组或内置分类达到阈值。";
    if (groupName) return `未移动：候选分组是「${groupName}」，但当前决策不允许执行移动。`;
    return "未移动：当前页面未满足自动分组执行条件。";
  }
  if (log.action === "create_group") return `Created and moved into "${groupName}".`;
  if (log.action === "move_to_existing_group") return `Moved into existing group "${groupName}".`;
  if (log.action === "wait") return "Waiting for more context or user action.";
  if (log.source === "eligibility" && isTemporaryLogPage(log)) {
    return `Not moved: the page was detected as a ${log.pageType} temporary or sensitive flow, so it can only inherit an opener group.`;
  }
  if (log.source === "no_match") return "Not moved: no rule, memory, custom group, or built-in category reached the threshold.";
  if (groupName) return `Not moved: candidate group was "${groupName}", but this decision was not allowed to move the tab.`;
  return "Not moved: this page did not meet auto-grouping execution conditions.";
}

function renderLogItem(log) {
  const confidence = Math.round((log.confidence || 0) * 100);
  const hostname = getHostname(log.url);
  const title = log.title || cleanTitle("", log.url) || friendlyDomain(hostname);
  const groupName = log.groupName ? translateCategoryName(log.groupName) : "";
  const group = groupName ? ` -> ${groupName}` : "";
  const rawUrl = log.url || "";
  const normalizedUrl = log.normalizedUrl && log.normalizedUrl !== rawUrl ? log.normalizedUrl : "";
  const diagnostics = [
    `${logUiText("pageType")}: ${log.pageType || logUiText("unknown")}`,
    `${logUiText("source")}: ${sourceLabel(log.source)}`,
    `${logUiText("confidence")}: ${confidence}%`,
    `${logUiText("allowCreate")}: ${logBooleanLabel(log.allowCreate)}`,
    `${logUiText("temporary")}: ${logBooleanLabel(isTemporaryLogPage(log))}`,
    `${logUiText("sensitive")}: ${logBooleanLabel(isSensitiveLogPage(log))}`,
    `${logUiText("shouldLearn")}: ${logBooleanLabel(Boolean(log.shouldLearn))}`
  ];
  if (groupName) diagnostics.push(`${logUiText("targetGroup")}: ${groupName}`);
  const groupActions = log.groupName ? `
    <button class="mini-btn" data-action="feedback-page" type="button">${t("feedbackPage")}</button>
    <button class="mini-btn" data-action="feedback-path" type="button">${t("feedbackPath")}</button>
    <button class="mini-btn" data-action="feedback-site" type="button">${t("feedbackSite")}</button>
  ` : "";
  return `
    <article class="log-item" data-log-id="${escapeHtml(log.id)}" data-log-group="${escapeHtml(log.groupName || "")}">
      <div class="log-title">${escapeHtml(actionLabel(log.action))}${escapeHtml(group)}</div>
      <div class="log-meta">${escapeHtml(formatRelativeTime(log.timestamp))} · ${escapeHtml(formatDateTime(log.timestamp))}</div>
      <div class="log-page">
        <div class="log-page-title">${escapeHtml(logUiText("page"))}: ${escapeHtml(title)}</div>
        <div class="log-url"><span>${escapeHtml(logUiText("originalUrl"))}</span>${escapeHtml(rawUrl || logUiText("unknown"))}</div>
        ${normalizedUrl ? `<div class="log-url"><span>${escapeHtml(logUiText("normalizedUrl"))}</span>${escapeHtml(normalizedUrl)}</div>` : ""}
      </div>
      <div class="log-diagnostics">${diagnostics.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
      <div class="log-outcome"><strong>${escapeHtml(logUiText("result"))}</strong>${escapeHtml(getLogOutcomeText(log))}</div>
      <div class="log-reason"><strong>${escapeHtml(logUiText("reason"))}</strong>${escapeHtml(log.reason || "")}</div>
      <div class="log-actions">
        ${groupActions}
        <button class="mini-btn danger-action" data-action="feedback-never-site" type="button">${t("feedbackNeverSite")}</button>
      </div>
    </article>
  `;
}

function sourceLabel(source) {
  const labels = currentLanguage === "zh"
    ? {
      eligibility: "过滤",
      user_rule: "规则",
      manual_protection: "手动保护",
      opener_inheritance: "来源继承",
      memory: "记忆",
      custom_group: "自定义",
      builtin_classifier: "内置",
      ai_classifier: "AI",
      no_match: "未命中",
      ai: "AI",
      feedback: "反馈",
      manual_move: "手动移动",
      rule_promotion: "规则记忆",
      user: "用户",
      migration: "迁移",
      import: "导入"
    }
    : {
      eligibility: "Filtered",
      user_rule: "Rule",
      manual_protection: "Manual lock",
      opener_inheritance: "Source inheritance",
      memory: "Memory",
      custom_group: "Custom",
      builtin_classifier: "Built-in",
      ai_classifier: "AI",
      no_match: "No match",
      ai: "AI",
      feedback: "Feedback",
      manual_move: "Manual move",
      rule_promotion: "Rule memory",
      user: "User",
      migration: "Migration",
      import: "Import"
    };
  return labels[source] || source || t("sourceUnknown");
}

function actionLabel(action) {
  const labels = currentLanguage === "zh"
    ? {
      none: "未移动",
      wait: "等待",
      move_to_existing_group: "移入分组",
      create_group: "创建分组",
      group: "分组",
      never_group: "永不分组",
      exclude_group: "排除"
    }
    : {
      none: "Not moved",
      wait: "Waiting",
      move_to_existing_group: "Moved to group",
      create_group: "Created group",
      group: "Group",
      never_group: "Never group",
      exclude_group: "Exclude"
    };
  return labels[action] || action || t("sourceUnknown");
}

function getAiClassificationText(log) {
  const groupName = translateCategoryName(log.groupName || t("uncategorized"));
  if (currentLanguage === "zh") {
    if (log.status === "auto_applied") return `AI 自动分类为「${groupName}」`;
    if (log.status === "suggested") return `AI 建议分类为「${groupName}」`;
    if (log.status === "unusable") return "AI 未返回可用分类";
    if (log.status === "failed") return "AI 分类失败";
    if (log.action === "create_group") return `AI 自动分类为「${groupName}」`;
    if (log.action === "move_to_existing_group") return `AI 移入已有分类「${groupName}」`;
    if (log.action === "none" && log.groupName) return `AI 建议分类为「${groupName}」`;
    if (log.action === "wait") return "AI 判断为等待处理";
    return `AI 未执行分类：${actionLabel(log.action)}`;
  }
  if (log.status === "auto_applied") return `AI categorized as “${groupName}”`;
  if (log.status === "suggested") return `AI suggested “${groupName}”`;
  if (log.status === "unusable") return "AI returned no usable category";
  if (log.status === "failed") return "AI classification failed";
  if (log.action === "create_group") return `AI categorized as “${groupName}”`;
  if (log.action === "move_to_existing_group") return `AI moved into “${groupName}”`;
  if (log.action === "none" && log.groupName) return `AI suggested “${groupName}”`;
  if (log.action === "wait") return "AI marked it as waiting";
  return `AI did not classify: ${actionLabel(log.action)}`;
}

function formatDateTime(timestamp) {
  const value = Number(timestamp);
  if (!Number.isFinite(value)) return t("timeUnknown");
  return new Date(value).toLocaleString(currentLanguage === "zh" ? "zh-CN" : "en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

function formatCompactNumber(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "0";
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(1)}K`;
  return String(number);
}

function formatRelativeTime(timestamp) {
  const value = Number(timestamp);
  if (!Number.isFinite(value)) return t("justNow");
  const diff = Date.now() - value;
  if (diff < 60_000) return t("justNow");
  if (diff < 3_600_000) return t("minutesAgo", { count: Math.floor(diff / 60_000) });
  if (diff < 86_400_000) return t("hoursAgo", { count: Math.floor(diff / 3_600_000) });
  return t("daysAgo", { count: Math.floor(diff / 86_400_000) });
}

async function focusTab(tab) {
  await chrome.tabs.update(tab.id, { active: true });
  if (tab.windowId) await chrome.windows.update(tab.windowId, { focused: true });
}

async function closeTabs(tabIds) {
  if (!tabIds.length) return;
  await chrome.tabs.remove(tabIds);
  await refresh();
}

async function saveTabsForLater(tabs) {
  const existingUrls = new Set(savedItems.map((item) => item.url));
  const uniqueTabs = tabs.filter((tab) => !existingUrls.has(tab.url));
  const next = [
    ...uniqueTabs
      .map((tab) => ({
        id: `${Date.now()}_${tab.id}`,
        url: tab.url,
        title: tab.cleanTitle || tab.title || tab.url,
        savedAt: Date.now()
      })),
    ...savedItems
  ].slice(0, 200);
  await saveSavedItems(next);
  showToast(uniqueTabs.length ? t("savedPages", { count: uniqueTabs.length }) : t("alreadySaved"));
  render();
}

async function addTabsToWorkspace(tabs) {
  const existingUrls = new Set(workspaceItems.map((item) => normalizeUrl(item.url)));
  const nextItems = [];
  for (const tab of tabs) {
    const key = normalizeUrl(tab.url);
    if (!key || existingUrls.has(key)) continue;
    existingUrls.add(key);
    nextItems.push({
      id: `${Date.now()}_${Number.isInteger(tab.id) ? tab.id : nextItems.length}`,
      url: tab.url,
      title: tab.cleanTitle || tab.title || tab.url,
      addedAt: Date.now(),
      ...(tab.groupTitle && tab.groupTitle !== WORKSPACE_GROUP_NAME ? { previousGroupName: tab.groupTitle } : {})
    });
  }
  const tabIds = tabs.map((tab) => tab.id).filter(Number.isInteger);
  if (tabIds.length) {
    await chrome.runtime.sendMessage({ type: "workspace:group-tabs", tabIds });
  }
  await saveWorkspaceItems([...nextItems, ...workspaceItems]);
  showToast(nextItems.length ? t("workspaceAdded", { count: nextItems.length }) : t("alreadyInWorkspace"));
  render();
}

async function addSavedItemsToWorkspace(items) {
  const tabs = items.flatMap((item) => {
    const key = normalizeUrl(item.url);
    const matchingTabs = openTabs.filter((tab) => normalizeUrl(tab.url) === key);
    if (matchingTabs.length) {
      return matchingTabs.map((tab) => ({
        ...tab,
        cleanTitle: item.title || tab.cleanTitle || tab.title || tab.url
      }));
    }
    return [{
      id: item.id,
      url: item.url,
      title: item.title || item.url,
      cleanTitle: item.title || item.url
    }];
  });
  await addTabsToWorkspace(tabs);
}

async function openWorkspaceItems() {
  if (!workspaceItems.length) {
    showToast(t("workspaceStillEmpty"));
    return;
  }
  for (let index = 0; index < workspaceItems.length; index += 1) {
    const item = workspaceItems[index];
    if (!isOpenableUrl(item.url)) continue;
    await chrome.tabs.create({ url: item.url, active: index === 0 });
  }
  showToast(t("openedWorkspace", { count: workspaceItems.length }));
}

async function findTabGroupByTitle(windowId, title) {
  if (!chrome.tabGroups?.query) return null;
  const groups = await chrome.tabGroups.query({ windowId }).catch(() => []);
  return groups.find((group) => group.title === title) || null;
}

function getCategoryColor(groupName) {
  const customGroup = customGroups.find((group) => group.groupName === groupName);
  return customGroup?.color || "";
}

async function groupTabsIntoCategory(tabs, groupName) {
  const categoryName = String(groupName || "").trim();
  const tabIds = tabs.map((tab) => tab.id).filter(Number.isInteger);
  if (!categoryName) {
    showToast(t("chooseCategoryFirst"));
    return;
  }
  if (!tabIds.length) return;

  await chrome.runtime.sendMessage({ type: "programmatic-group-lock", tabIds }).catch(() => null);

  const tabsByWindow = new Map();
  for (const tab of tabs) {
    if (!Number.isInteger(tab.id) || !Number.isInteger(tab.windowId)) continue;
    if (!tabsByWindow.has(tab.windowId)) tabsByWindow.set(tab.windowId, []);
    tabsByWindow.get(tab.windowId).push(tab.id);
  }

  const color = getCategoryColor(categoryName);
  for (const [windowId, ids] of tabsByWindow.entries()) {
    const existing = await findTabGroupByTitle(windowId, categoryName);
    const groupId = existing
      ? await chrome.tabs.group({ tabIds: ids, groupId: existing.id })
      : await chrome.tabs.group({ tabIds: ids });
    const update = { title: categoryName };
    if (color) update.color = color;
    await chrome.tabGroups.update(groupId, update);
  }

  await chrome.runtime.sendMessage({
    type: "manual-category:remember",
    tabIds,
    groupName: categoryName
  });
  await refresh();
  showToast(t("categorizedTo", { name: translateCategoryName(categoryName) }));
}

async function classifyWorkspaceTabsBeforeClear() {
  const urls = workspaceItems.map((item) => item.url).filter(Boolean);
  if (!urls.length) return 0;
  const response = await chrome.runtime.sendMessage({ type: "workspace:classify-tabs", urls, items: workspaceItems }).catch(() => null);
  return response?.ok ? Number(response.data || 0) : 0;
}

async function refresh() {
  await Promise.all([
    fetchOpenTabs(),
    loadSavedItems(),
    loadWorkspaceItems(),
    loadWorkspaceTask(),
    loadPluginSettings(),
    loadAiSettings(),
    loadAiSuggestions(),
    loadAiHistory(),
    loadAiWindowPlans(),
    loadAiUsage(),
    loadRules(),
    loadCustomGroups(),
    loadActionLogs(),
    loadMemories()
  ]);
  await loadClassificationPreviews();
  renderPluginSettings();
  renderAiSettings();
  render();
}

function scheduleRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = 0;
    refresh().catch((error) => {
      console.error("[Tab Inbox] live refresh failed", error);
    });
  }, 180);
}

function registerLiveRefreshListeners() {
  chrome.storage?.onChanged?.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (!Object.keys(changes).some((key) => LIVE_REFRESH_KEYS.has(key))) return;
    scheduleRefresh();
  });

  chrome.tabs?.onCreated?.addListener(scheduleRefresh);
  chrome.tabs?.onRemoved?.addListener(scheduleRefresh);
  chrome.tabs?.onUpdated?.addListener((_tabId, changeInfo) => {
    if (changeInfo.status || changeInfo.title || changeInfo.url || changeInfo.pinned || "groupId" in changeInfo) {
      scheduleRefresh();
    }
  });
  chrome.tabGroups?.onUpdated?.addListener(scheduleRefresh);
  chrome.tabGroups?.onRemoved?.addListener(scheduleRefresh);
}

async function classifyTabs(tabs) {
  const candidates = tabs.filter((tab) => Number.isInteger(tab.id));
  if (!candidates.length) return;
  for (const tab of candidates) {
    await chrome.runtime.sendMessage({ type: "debug:decide-tab", tabId: tab.id });
  }
  await refresh();
  showToast(t("autoGroupedTabs", { count: candidates.length }));
}

function splitCategoryTokens(value = "") {
  return value
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function looksLikeDomain(value = "") {
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(value);
}

async function addCustomCategory() {
  const groupName = els.categoryNameInput.value.trim();
  const tokens = splitCategoryTokens(els.categoryKeywordInput.value);
  if (!groupName) {
    showToast(t("inputCategoryName"));
    els.categoryNameInput.focus();
    return;
  }
  const domains = tokens.filter(looksLikeDomain);
  const keywords = tokens.filter((token) => !looksLikeDomain(token));
  const response = await chrome.runtime.sendMessage({
    type: "custom-groups:add",
    group: { groupName, domains, keywords }
  });
  if (!response?.ok) throw new Error(response?.error || t("addCategoryFailed"));
  customGroups = getCustomGroupsFromResponse(response);
  if (!customGroups.length) {
    customGroups = await loadCustomGroupsFromStorage();
  }
  els.categoryNameInput.value = "";
  els.categoryKeywordInput.value = "";
  render();
  showToast(t("categoryAdded", { name: groupName }));
}

async function saveCustomCategory() {
  if (!editingCategoryId) return addCustomCategory();

  const groupName = els.categoryNameInput.value.trim();
  const tokens = splitCategoryTokens(els.categoryKeywordInput.value);
  if (!groupName) {
    showToast(t("inputCategoryName"));
    els.categoryNameInput.focus();
    return;
  }

  const domains = tokens.filter(looksLikeDomain);
  const keywords = tokens.filter((token) => !looksLikeDomain(token));
  const response = await chrome.runtime.sendMessage({
    type: "custom-groups:update",
    groupId: editingCategoryId,
    group: { groupName, domains, keywords }
  });
  if (!response?.ok) throw new Error(response?.error || t("updateCategoryFailed"));

  customGroups = getCustomGroupsFromResponse(response);
  clearCategoryEditForm();
  render();
  showToast(t("categoryUpdated", { name: groupName }));
}

function getCategoryEditText(group) {
  return [
    ...(Array.isArray(group.domains) ? group.domains : []),
    ...(Array.isArray(group.keywords) ? group.keywords : [])
  ].filter(Boolean).join(", ");
}

function startCategoryEdit(groupId) {
  const category = customGroups.find((group) => group.id === groupId);
  if (!category) return;
  editingCategoryId = category.id;
  els.categoryNameInput.value = category.groupName || "";
  els.categoryKeywordInput.value = getCategoryEditText(category);
  syncCategoryFormMode();
  els.categoryNameInput.focus();
}

function clearCategoryEditForm() {
  editingCategoryId = "";
  els.categoryNameInput.value = "";
  els.categoryKeywordInput.value = "";
  syncCategoryFormMode();
}

function syncCategoryFormMode() {
  const isEditing = Boolean(editingCategoryId);
  els.addCategoryBtn.textContent = isEditing ? t("update") : t("add");
  if (els.cancelCategoryEditBtn) els.cancelCategoryEditBtn.hidden = !isEditing;
}

function collectAiSettingsPatch() {
  return {
    enabled: els.aiEnabledInput.checked,
    baseUrl: els.aiBaseUrlInput.value.trim(),
    model: els.aiModelInput.value.trim(),
    apiKey: els.aiApiKeyInput.value.trim(),
    autoApplyThreshold: Number(els.aiAutoThresholdInput.value || 0.88),
    suggestThreshold: Number(els.aiSuggestThresholdInput.value || 0.65),
    dailyLimit: Number(els.aiDailyLimitInput.value || 100),
    cooldownHours: Number(els.aiCooldownInput.value || 24)
  };
}

function collectAutomationSettingsPatch() {
  return {
    enabled: els.automationEnabledInput?.checked ?? true,
    automationLevel: els.automationLevelSelect?.value || "balanced",
    behavior: {
      enableMemory: els.enableMemoryInput?.checked ?? true,
      enableBuiltinClassifier: els.enableBuiltinInput?.checked ?? true,
      enableCustomGroups: els.enableCustomGroupsInput?.checked ?? true,
      createGroupsForBuiltinClassifier: els.createBuiltinGroupsInput?.checked ?? true
    }
  };
}

async function saveAutomationSettings() {
  const response = await chrome.runtime.sendMessage({
    type: "settings:update",
    patch: collectAutomationSettingsPatch()
  });
  if (!response?.ok) throw new Error(response?.error || t("saveAutomationFailed"));
  pluginSettings = response.data || getDefaultPluginSettings();
  renderPluginSettings();
  render();
  showToast(t("automationSettingsSaved"));
}

async function saveAiSettings() {
  await requestAiPermissionForBaseUrl(els.aiBaseUrlInput.value);
  const response = await chrome.runtime.sendMessage({
    type: "ai-settings:update",
    patch: collectAiSettingsPatch()
  });
  if (!response?.ok) throw new Error(response?.error || t("saveAiFailed"));
  aiSettings = getAiSettingsFromResponse(response) || await loadAiSettingsFromStorage();
  aiSettingsDraftDirty = false;
  renderAiSettings({ force: true });
  render();
  showToast(t("aiSettingsSaved"));
}

async function testAiSettings() {
  await requestAiPermissionForBaseUrl(els.aiBaseUrlInput.value);
  const response = await chrome.runtime.sendMessage({
    type: "ai-settings:test",
    patch: collectAiSettingsPatch()
  });
  if (!response?.ok) throw new Error(response?.error || t("aiTestFailed"));
  showToast(t("aiConnectionOk", { model: response.data?.model || els.aiModelInput.value.trim() }));
}

async function requestAiPermissionForBaseUrl(baseUrl) {
  const origin = getPermissionOrigin(baseUrl);
  if (!origin || !chrome.permissions?.request) return;
  const granted = await chrome.permissions.request({ origins: [`${origin}/*`] });
  if (!granted) throw new Error(t("aiPermissionDenied"));
}

function collectRuleInput() {
  const action = els.ruleActionSelect?.value || "group";
  const groupName = els.ruleGroupNameInput?.value.trim() || "";
  const value = els.ruleValueInput?.value.trim() || "";
  if (!value) {
    els.ruleValueInput?.focus();
    throw new Error(t("inputRuleValue"));
  }
  if (action === "group" && !groupName) {
    els.ruleGroupNameInput?.focus();
    throw new Error(t("inputRuleGroup"));
  }
  const rule = {
    type: els.ruleTypeSelect?.value || "domain",
    action,
    value,
    groupName,
    enabled: true,
    source: "user"
  };
  if (action !== "group") delete rule.groupName;
  return rule;
}

async function addUserRule() {
  const response = await chrome.runtime.sendMessage({
    type: "rules:add",
    rule: collectRuleInput()
  });
  if (!response?.ok) throw new Error(response?.error || t("addRuleFailed"));
  userRules = Array.isArray(response.data) ? response.data : [];
  if (els.ruleValueInput) els.ruleValueInput.value = "";
  if (els.ruleGroupNameInput) els.ruleGroupNameInput.value = "";
  render();
  showToast(t("ruleAdded"));
}

function syncRuleFormMode() {
  const isGrouping = (els.ruleActionSelect?.value || "group") === "group";
  syncRuleGroupOptions();
  if (els.ruleGroupNameInput) {
    els.ruleGroupNameInput.hidden = !isGrouping;
    els.ruleGroupNameInput.required = isGrouping;
  }
}

async function applyFeedbackFromLog(logId, feedbackAction, targetGroupName = "") {
  const response = await chrome.runtime.sendMessage({
    type: "feedback:from-log",
    logId,
    action: feedbackAction,
    targetGroupName
  });
  if (!response?.ok) throw new Error(response?.error || t("feedbackFailed"));
  userRules = Array.isArray(response.data) ? response.data : [];
  await loadMemories();
  render();
  showToast(t("feedbackSaved"));
}

function getPermissionOrigin(baseUrl) {
  try {
    const url = new URL(baseUrl);
    if (!/^https?:$/.test(url.protocol)) return "";
    return url.origin;
  } catch {
    return "";
  }
}

function getCardTabs(card) {
  const groupKey = card.dataset.groupKey;
  if (groupKey) return openTabs.filter((tab) => getTabGroupingBucket(tab).key === groupKey);
  const domain = card.dataset.hostname;
  return openTabs.filter((tab) => (tab.primaryDomain || getPrimaryDomain(tab.hostname) || tab.hostname) === domain);
}

function getTabFromChip(chip) {
  const tabId = Number(chip.dataset.tabId);
  return openTabs.find((tab) => tab.id === tabId);
}

async function closeExtraDashboards() {
  const dashboardUrl = chrome.runtime.getURL("dashboard.html");
  const tabs = await chrome.tabs.query({});
  const currentWindow = await chrome.windows.getCurrent();
  const dashboards = tabs.filter((tab) => tab.url === dashboardUrl || tab.url === "chrome://newtab/");
  const keep = dashboards.find((tab) => tab.active && tab.windowId === currentWindow.id) || dashboards.find((tab) => tab.active) || dashboards[0];
  const toClose = dashboards.filter((tab) => tab.id !== keep?.id).map((tab) => tab.id);
  if (toClose.length) await chrome.tabs.remove(toClose);
  await refresh();
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  setTimeout(() => els.toast.classList.remove("show"), 1800);
}

async function withButtonBusy(button, label, task) {
  if (!button || button.classList.contains("is-busy")) return;
  const previousText = button.textContent;
  button.classList.add("is-busy");
  button.disabled = true;
  if (label) button.textContent = label;
  try {
    await task();
  } finally {
    button.classList.remove("is-busy");
    button.disabled = false;
    button.textContent = previousText;
  }
}

function setRailActive(targetId = activeView) {
  document.querySelectorAll(".rail-nav a").forEach((link) => {
    link.classList.toggle("is-active", link.dataset.railTarget === targetId);
  });
}

function applyActiveView() {
  document.body.dataset.view = activeView;
  document.querySelectorAll("[data-view-panel]").forEach((panel) => {
    const isActive = panel.dataset.viewPanel === activeView;
    panel.classList.toggle("is-view-active", isActive);
    panel.toggleAttribute("hidden", !isActive);
  });
  setRailActive(activeView);
}

function setActiveView(nextView) {
  activeView = nextView || "open-tabs";
  localStorage.setItem(ACTIVE_VIEW_KEY, activeView);
  applyActiveView();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setFilterMode(nextMode, options = {}) {
  filterMode = nextMode || "all";
  render();
  if (options.openInbox !== false) setActiveView("open-tabs");
}

function registerCommandRail() {
  const links = Array.from(document.querySelectorAll(".rail-nav a[data-rail-target]"));

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      setActiveView(link.dataset.railTarget);
    });
  });
}

function registerMetricCards() {
  document.querySelectorAll(".metric-card").forEach((card) => {
    const activate = () => setFilterMode(card.dataset.metricFilter || "all");
    card.addEventListener("click", activate);
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      activate();
    });
  });
}

els.languageToggleBtn?.addEventListener("click", () => {
  currentLanguage = currentLanguage === "zh" ? "en" : "zh";
  localStorage.setItem(LANGUAGE_KEY, currentLanguage);
  applyStaticTranslations();
  render();
});
els.refreshBtn.addEventListener("click", (event) => withButtonBusy(event.currentTarget, t("refreshBusy"), refresh));
els.closeExtraDashboardsBtn.addEventListener("click", (event) => withButtonBusy(event.currentTarget, t("processing"), closeExtraDashboards));
els.openWorkspaceBtn.addEventListener("click", (event) => withButtonBusy(event.currentTarget, t("opening"), openWorkspaceItems));
els.clearWorkspaceBtn.addEventListener("click", async () => {
  if (!workspaceItems.length) return;
  if (!confirm(t("clearWorkspaceConfirm", { count: workspaceItems.length }))) return;
  await classifyWorkspaceTabsBeforeClear();
  await saveWorkspaceItems([]);
  await clearWorkspaceTask();
  render();
  showToast(t("workspaceCleared"));
});
els.savedToWorkspaceBtn.addEventListener("click", (event) => withButtonBusy(event.currentTarget, t("adding"), () => addSavedItemsToWorkspace(savedItems)));
els.clearSavedBtn.addEventListener("click", async () => {
  if (!savedItems.length) return;
  if (!confirm(t("clearSavedConfirm", { count: savedItems.length }))) return;
  await saveSavedItems([]);
  render();
  showToast(t("savedCleared"));
});
els.closeAllDupesBtn.addEventListener("click", async (event) => {
  const ids = getClosableDuplicateIds(openTabs);
  if (!ids.length) {
    showToast(t("noClosableDuplicates"));
    return;
  }
  await withButtonBusy(event.currentTarget, t("closing"), async () => {
    await closeTabs(ids);
    showToast(t("closedDuplicates", { count: ids.length }));
  });
});
els.searchInput.addEventListener("input", (event) => {
  query = event.target.value;
  if (els.globalSearchInput && els.globalSearchInput.value !== query) els.globalSearchInput.value = query;
  render();
});
els.globalSearchInput?.addEventListener("input", (event) => {
  query = event.target.value;
  if (els.searchInput.value !== query) els.searchInput.value = query;
  setActiveView("open-tabs");
  render();
});
els.clearSearchBtn.addEventListener("click", () => {
  query = "";
  els.searchInput.value = "";
  if (els.globalSearchInput) els.globalSearchInput.value = "";
  render();
});
document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => {
    setFilterMode(button.dataset.filter || "all", { openInbox: false });
  });
});
els.classifyVisibleBtn.addEventListener("click", async (event) => {
  try {
    const tabs = filteredGroups().flatMap((group) => group.tabs);
    await withButtonBusy(event.currentTarget, t("grouping"), () => classifyTabs(tabs));
  } catch (error) {
    showToast(error instanceof Error ? error.message : t("autoGroupFailed"));
  }
});
els.categoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await withButtonBusy(els.addCategoryBtn, editingCategoryId ? t("saving") : t("adding"), saveCustomCategory);
  } catch (error) {
    showToast(error instanceof Error ? error.message : editingCategoryId ? t("updateCategoryFailed") : t("addCategoryFailed"));
  }
});
els.cancelCategoryEditBtn?.addEventListener("click", clearCategoryEditForm);
els.saveAutomationSettingsBtn?.addEventListener("click", async (event) => {
  try {
    await withButtonBusy(event.currentTarget, t("saving"), saveAutomationSettings);
  } catch (error) {
    showToast(error instanceof Error ? error.message : t("saveAutomationFailed"));
  }
});
els.saveAiSettingsBtn.addEventListener("click", async (event) => {
  try {
    await withButtonBusy(event.currentTarget, t("saving"), saveAiSettings);
  } catch (error) {
    showToast(error instanceof Error ? error.message : t("saveAiFailed"));
  }
});
els.testAiSettingsBtn.addEventListener("click", async (event) => {
  try {
    await withButtonBusy(event.currentTarget, t("testing"), testAiSettings);
  } catch (error) {
    showToast(error instanceof Error ? error.message : t("aiTestFailed"));
  }
});
[
  els.aiEnabledInput,
  els.aiBaseUrlInput,
  els.aiModelInput,
  els.aiApiKeyInput,
  els.aiAutoThresholdInput,
  els.aiSuggestThresholdInput,
  els.aiDailyLimitInput,
  els.aiCooldownInput
].forEach((input) => {
  input?.addEventListener("input", () => {
    aiSettingsDraftDirty = true;
  });
  input?.addEventListener("change", () => {
    aiSettingsDraftDirty = true;
  });
});
els.ruleActionSelect?.addEventListener("change", syncRuleFormMode);
els.ruleForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await withButtonBusy(els.addRuleBtn, t("adding"), addUserRule);
  } catch (error) {
    showToast(error instanceof Error ? error.message : t("addRuleFailed"));
  }
});

els.domainList.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const card = button.closest(".domain-card");
  const chip = button.closest(".page-chip");
  const action = button.dataset.action;
  const tabs = card ? getCardTabs(card) : [];
  const tab = chip ? getTabFromChip(chip) : null;

  if (action === "toggle-domain-pages" && card?.dataset.groupKey) {
    const groupKey = card.dataset.groupKey;
    if (expandedHosts.has(groupKey)) expandedHosts.delete(groupKey);
    else expandedHosts.add(groupKey);
    render();
    return;
  }

  await withButtonBusy(button, t("processing"), async () => {
    if (action === "focus-domain" && tabs[0]) await focusTab(tabs[0]);
    if (action === "classify-domain") await classifyTabs(tabs);
    if (action === "workspace-domain") await addTabsToWorkspace(tabs);
    if (action === "save-domain") await saveTabsForLater(tabs);
    if (action === "close-domain") {
      if (!tabs.length || !confirm(t("closeDomainConfirm", { count: tabs.length, host: card.dataset.groupLabel || card.dataset.hostname }))) return;
      await closeTabs(tabs.map((item) => item.id));
    }
    if (action === "close-domain-dupes") {
      const duplicateIds = getClosableDuplicateIds(tabs);
      await closeTabs(duplicateIds);
      showToast(t("closedDuplicates", { count: duplicateIds.length }));
    }
    if (action === "focus-tab" && tab) await focusTab(tab);
    if (action === "apply-category-tab" && tab) {
      const select = chip?.querySelector('[data-role="tab-category-select"]');
      await groupTabsIntoCategory([tab], select?.value || "");
    }
    if (action === "workspace-tab" && tab) await addTabsToWorkspace([tab]);
    if (action === "save-tab" && tab) await saveTabsForLater([tab]);
  });
});

els.rulesList.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button || button.dataset.action !== "delete-rule") return;
  const itemEl = button.closest(".rule-item");
  const ruleId = itemEl?.dataset.ruleId;
  if (!ruleId) return;
  const response = await chrome.runtime.sendMessage({ type: "rules:delete", ruleId }).catch((error) => ({
    ok: false,
    error: error instanceof Error ? error.message : String(error)
  }));
  if (!response?.ok) {
    showToast(response?.error || t("deleteRuleFailed"));
    return;
  }
  userRules = response.data || [];
  render();
  showToast(t("ruleDeleted"));
});

els.logsList.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const itemEl = button.closest(".log-item");
  const logId = itemEl?.dataset.logId;
  if (!logId) return;
  const actionMap = {
    "feedback-page": "always_page",
    "feedback-path": "always_path",
    "feedback-site": "always_site",
    "feedback-never-site": "never_site"
  };
  const feedbackAction = actionMap[button.dataset.action];
  if (!feedbackAction) return;
  try {
    await withButtonBusy(button, t("saving"), () => applyFeedbackFromLog(logId, feedbackAction, itemEl.dataset.logGroup || ""));
  } catch (error) {
    showToast(error instanceof Error ? error.message : t("feedbackFailed"));
  }
});

els.aiSuggestionList.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const itemEl = button.closest(".ai-suggestion");
  const suggestionId = itemEl?.dataset.suggestionId;
  if (!suggestionId) return;

  const type = button.dataset.action === "accept-ai-suggestion"
    ? "ai-suggestions:accept"
    : "ai-suggestions:ignore";
  const response = await chrome.runtime.sendMessage({ type, suggestionId }).catch((error) => ({
    ok: false,
    error: error instanceof Error ? error.message : String(error)
  }));
  if (!response?.ok) {
    showToast(response?.error || t("aiSuggestionFailed"));
    return;
  }
  aiSuggestions = response.data || [];
  await fetchOpenTabs();
  render();
  showToast(type === "ai-suggestions:accept" ? t("acceptedAiSuggestion") : t("ignoredAiSuggestion"));
});

els.memoryList.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button || button.dataset.action !== "delete-memory") return;
  const itemEl = button.closest(".memory-item");
  const memoryIds = (itemEl?.dataset.memoryIds || itemEl?.dataset.memoryId || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (!memoryIds.length) return;

  let response = null;
  for (const memoryId of memoryIds) {
    response = await chrome.runtime.sendMessage({ type: "memories:delete", memoryId }).catch((error) => ({
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    }));
    if (!response?.ok) {
      showToast(response?.error || t("deleteMemoryFailed"));
      return;
    }
  }
  memories = response.data || [];
  render();
  showToast(memoryIds.length > 1 ? t("memoryDeletedMany", { count: memoryIds.length }) : t("memoryDeleted"));
});

els.workspaceList.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const itemEl = button.closest(".workspace-item");
  const item = workspaceItems.find((workspace) => workspace.id === itemEl?.dataset.workspaceId);
  if (!item) return;

  if (button.dataset.action === "open-workspace") {
    if (!isOpenableUrl(item.url)) return showToast(t("linkNotOpenable"));
    await chrome.tabs.create({ url: item.url, active: true });
  }
  if (button.dataset.action === "remove-workspace") {
    await saveWorkspaceItems(workspaceItems.filter((workspace) => workspace.id !== item.id));
    render();
  }
});

els.categoryList.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const itemEl = button.closest(".category-item");
  const tabEl = button.closest(".category-tab-item");
  const tab = tabEl ? getTabFromChip(tabEl) : null;
  if (tab) {
    await withButtonBusy(button, t("processing"), async () => {
      if (button.dataset.action === "focus-category-tab") await focusTab(tab);
      if (button.dataset.action === "workspace-category-tab") await addTabsToWorkspace([tab]);
      if (button.dataset.action === "save-category-tab") await saveTabsForLater([tab]);
    });
    return;
  }

  const groupId = itemEl?.dataset.categoryId;
  if (!groupId) return;
  const categoryName = itemEl.dataset.categoryName || "";
  const category = customGroups.find((group) => group.id === groupId);

  if (button.dataset.action === "toggle-category-tabs") {
    if (expandedCategories.has(categoryName)) expandedCategories.delete(categoryName);
    else expandedCategories.add(categoryName);
    render();
    return;
  }

  if (!category) return;

  if (button.dataset.action === "edit-category") {
    startCategoryEdit(groupId);
    return;
  }

  if (button.dataset.action !== "delete-category") return;
  if (!confirm(t("deleteCategoryConfirm", { name: category.groupName }))) return;
  await withButtonBusy(button, t("processing"), async () => {
    const response = await chrome.runtime.sendMessage({ type: "custom-groups:delete", groupId });
    if (!response?.ok) throw new Error(response?.error || t("deleteCategoryFailed"));
    customGroups = getCustomGroupsFromResponse(response);
    if (!customGroups.length) {
      customGroups = await loadCustomGroupsFromStorage();
    }
    if (editingCategoryId === groupId) clearCategoryEditForm();
    render();
    showToast(t("categoryDeleted"));
  });
});

els.savedList.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const itemEl = button.closest(".saved-item");
  const item = savedItems.find((saved) => saved.id === itemEl?.dataset.savedId);
  if (!item) return;

  if (button.dataset.action === "open-saved") {
    if (!isOpenableUrl(item.url)) return showToast(t("linkNotOpenable"));
    await chrome.tabs.create({ url: item.url, active: true });
  }
  if (button.dataset.action === "workspace-saved") {
    await addSavedItemsToWorkspace([item]);
  }
  if (button.dataset.action === "delete-saved") {
    await saveSavedItems(savedItems.filter((saved) => saved.id !== item.id));
    render();
  }
});

applyStaticTranslations();
syncRuleFormMode();
registerCommandRail();
registerMetricCards();
applyActiveView();
registerLiveRefreshListeners();

refresh().catch((error) => {
  console.error("[Tab Inbox] dashboard failed", error);
  els.domainList.innerHTML = `<div class="empty">${t("loadFailed")}</div>`;
});

globalThis.__tabInboxDashboard = {
  cleanTitle,
  friendlyDomain,
  groupTabsByDomain,
  getDuplicateStats,
  getClosableDuplicateIds,
  isOpenableUrl,
  normalizeWorkspaceItems,
  normalizeUrl
};
