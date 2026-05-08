import type {
  AiSettings,
  AiWindowAction,
  AiWindowActionKind,
  AiWindowContext,
  AiWindowTabSnapshot,
  AiWindowWorkspaceCandidate
} from "../types";
import type { AiTokenUsage } from "./aiClassifier";

export interface AiWindowOrganizationDraft {
  summary: string;
  workspaceCandidates: AiWindowWorkspaceCandidate[];
  contexts: AiWindowContext[];
  actions: AiWindowAction[];
  usage: AiTokenUsage;
}

export type AiWindowLanguage = "zh" | "en";

interface AiWindowOrganizationOptions {
  language?: AiWindowLanguage;
}

const ACTION_KINDS = new Set<AiWindowActionKind>([
  "workspace",
  "later",
  "close_duplicate",
  "keep",
  "group",
  "needs_review"
]);

export async function requestAiWindowOrganization(
  windowId: number,
  tabs: AiWindowTabSnapshot[],
  settings: AiSettings,
  options: AiWindowOrganizationOptions = {}
): Promise<AiWindowOrganizationDraft> {
  if (!settings.enabled || !settings.baseUrl.trim() || !settings.model.trim() || !settings.apiKey.trim()) {
    throw new Error("AI settings are incomplete");
  }
  const language = normalizeLanguage(options.language);

  const response = await fetch(toChatCompletionsUrl(settings.baseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.15,
      messages: [
        {
          role: "system",
          content: getAiWindowSystemPrompt(language)
        },
        {
          role: "user",
          content: JSON.stringify({
            windowId,
            tabs: tabs.map((tab) => ({
              tabId: tab.tabId,
              title: tab.title,
              domain: tab.domain,
              hostname: tab.hostname,
              pageType: tab.pageType,
              groupName: tab.groupName || null,
              pinned: tab.pinned,
              audible: tab.audible,
              active: tab.active,
              inWorkspace: tab.inWorkspace,
              inLater: tab.inLater,
              duplicateKey: tab.duplicateKey || null,
              url: tab.url
            }))
          })
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`AI window request failed: ${response.status}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: unknown;
  };
  const content = data.choices?.[0]?.message?.content || "";
  return {
    ...parseAiWindowOrganization(content, tabs, language),
    usage: normalizeUsage(data.usage)
  };
}

export function parseAiWindowOrganization(
  content: string,
  tabs: AiWindowTabSnapshot[],
  language: AiWindowLanguage = "zh"
): Omit<AiWindowOrganizationDraft, "usage"> {
  const parsed = parseJsonObject(content);
  const input = parsed && typeof parsed === "object" ? parsed as {
    summary?: unknown;
    workspaceCandidates?: unknown;
    contexts?: unknown;
    actions?: unknown;
  } : {};
  const tabIds = new Set(tabs.map((tab) => tab.tabId));
  const workspaceCandidates: AiWindowWorkspaceCandidate[] = Array.isArray(input.workspaceCandidates)
    ? input.workspaceCandidates
      .map((value, index) => normalizeWorkspaceCandidate(value, index, tabIds, language))
      .filter((candidate): candidate is AiWindowWorkspaceCandidate => Boolean(candidate))
      .slice(0, 6)
    : [];
  const contextIds = new Set<string>();
  const contexts: AiWindowContext[] = Array.isArray(input.contexts)
    ? input.contexts
      .map((value, index) => normalizeContext(value, index, tabIds, language))
      .filter((context): context is AiWindowContext => {
        if (!context || contextIds.has(context.id)) return false;
        contextIds.add(context.id);
        return true;
      })
      .slice(0, 8)
    : [];
  const actions: AiWindowAction[] = Array.isArray(input.actions)
    ? input.actions
      .map((value, index) => normalizeAction(value, index, tabs, contextIds, language))
      .filter((action): action is AiWindowAction => Boolean(action))
      .slice(0, 24)
    : [];

  return {
    summary: normalizeText(input.summary, 140) || aiWindowText(language, "parsedSummary"),
    workspaceCandidates,
    contexts,
    actions
  };
}

function normalizeWorkspaceCandidate(
  value: unknown,
  index: number,
  validTabIds: Set<number>,
  language: AiWindowLanguage = "zh"
): AiWindowWorkspaceCandidate | null {
  const input = value && typeof value === "object" ? value as Partial<AiWindowWorkspaceCandidate> : {};
  const tabIds = normalizeTabIds(input.tabIds, validTabIds);
  const reviewTabIds = normalizeTabIds(input.reviewTabIds, validTabIds)
    .filter((tabId) => !tabIds.includes(tabId));
  const excludedTabIds = normalizeTabIds(input.excludedTabIds, validTabIds)
    .filter((tabId) => !tabIds.includes(tabId) && !reviewTabIds.includes(tabId));
  if (!tabIds.length && !reviewTabIds.length) return null;
  return {
    id: normalizeId(input.id) || `ws_${index + 1}`,
    title: normalizeText(input.title, 36) || aiWindowText(language, "workspaceTitle", { index: index + 1 }),
    summary: normalizeText(input.summary, 140) || aiWindowText(language, "workspaceSummary"),
    confidence: clampConfidence(input.confidence),
    tabIds,
    reviewTabIds,
    excludedTabIds,
    reason: normalizeText(input.reason, 180) || aiWindowText(language, "workspaceReason")
  };
}

function normalizeContext(
  value: unknown,
  index: number,
  validTabIds: Set<number>,
  language: AiWindowLanguage = "zh"
): AiWindowContext | null {
  const input = value && typeof value === "object" ? value as Partial<AiWindowContext> : {};
  const tabIds = normalizeTabIds(input.tabIds, validTabIds);
  if (!tabIds.length) return null;
  return {
    id: normalizeId(input.id) || `ctx_${index + 1}`,
    title: normalizeText(input.title, 36) || aiWindowText(language, "contextTitle", { index: index + 1 }),
    description: normalizeText(input.description, 140),
    tabIds
  };
}

function normalizeAction(
  value: unknown,
  index: number,
  tabs: AiWindowTabSnapshot[],
  contextIds: Set<string>,
  language: AiWindowLanguage = "zh"
): AiWindowAction | null {
  const input = value && typeof value === "object" ? value as Partial<AiWindowAction> : {};
  const kind = ACTION_KINDS.has(input.kind as AiWindowActionKind)
    ? input.kind as AiWindowActionKind
    : null;
  if (!kind) return null;

  const validTabIds = new Set(tabs.map((tab) => tab.tabId));
  const tabIds = kind === "close_duplicate"
    ? normalizeCloseDuplicateTabIds(input.tabIds, tabs)
    : normalizeTabIds(input.tabIds, validTabIds);
  if (!tabIds.length) return null;

  const groupName = normalizeText(input.groupName, 24);
  if (kind === "group" && groupName.length < 2) return null;

  const action: AiWindowAction = {
    id: `aiwin_action_${index + 1}`,
    kind,
    tabIds,
    title: normalizeText(input.title, 42) || defaultActionTitle(kind, language),
    reason: normalizeText(input.reason, 180) || aiWindowText(language, "actionReason"),
    confidence: clampConfidence(input.confidence)
  };
  const contextId = normalizeId(input.contextId);
  if (contextId && contextIds.has(contextId)) action.contextId = contextId;
  if (groupName) action.groupName = groupName;
  return action;
}

function normalizeCloseDuplicateTabIds(value: unknown, tabs: AiWindowTabSnapshot[]): number[] {
  const validTabIds = new Set(tabs.map((tab) => tab.tabId));
  const requested = normalizeTabIds(value, validTabIds);
  const groups = new Map<string, AiWindowTabSnapshot[]>();
  for (const tab of tabs) {
    if (!tab.duplicateKey) continue;
    if (!groups.has(tab.duplicateKey)) groups.set(tab.duplicateKey, []);
    groups.get(tab.duplicateKey)?.push(tab);
  }
  const closable = new Set<number>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    for (const tab of group.slice(1)) {
      if (!tab.pinned && !tab.audible && !tab.active) closable.add(tab.tabId);
    }
  }
  return requested.filter((tabId) => closable.has(tabId));
}

function normalizeTabIds(value: unknown, validTabIds: Set<number>): number[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<number>();
  const result: number[] = [];
  for (const item of value) {
    const tabId = Number(item);
    if (!Number.isInteger(tabId) || !validTabIds.has(tabId) || seen.has(tabId)) continue;
    seen.add(tabId);
    result.push(tabId);
  }
  return result;
}

function defaultActionTitle(kind: AiWindowActionKind, language: AiWindowLanguage): string {
  const en: Record<AiWindowActionKind, string> = {
    workspace: "Add to workspace",
    later: "Handle later",
    close_duplicate: "Close duplicate tabs",
    group: "One-time group",
    needs_review: "Needs review",
    keep: "Keep"
  };
  if (language === "en") return en[kind];
  switch (kind) {
    case "workspace":
      return "加入工作台";
    case "later":
      return "稍后处理";
    case "close_duplicate":
      return "关闭重复页";
    case "group":
      return "一次性分组";
    case "needs_review":
      return "需要确认";
    case "keep":
    default:
      return "保留";
  }
}

function normalizeLanguage(language: unknown): AiWindowLanguage {
  return language === "en" ? "en" : "zh";
}

function getAiWindowSystemPrompt(language: AiWindowLanguage): string {
  if (language === "en") {
    return [
      "You are Tab Inbox's window organization assistant.",
      "Your goal is not classification-rule learning; create a temporary, confirmable action plan for this browser window.",
      "Judge only from the provided tab metadata. Do not assume you have read page bodies.",
      "Do not suggest closing pinned or audible tabs.",
      "Use close_duplicate only for tabs with the same duplicateKey, excluding the first kept item.",
      "Prioritize workspaceCandidates: each candidate is one same-context task that can enter the workspace in one action.",
      "workspaceCandidates.tabIds are pages recommended by default; reviewTabIds need user confirmation; excludedTabIds clearly do not belong in that context.",
      "workspace means relevant to the current task; later means valuable but not needed now; keep means leave open; needs_review means the user should decide.",
      "group means a one-time browser tab group suggestion, not a reusable rule. Do not use group without a reliable group name.",
      "Return user-facing summary, title, description, reason, and groupName fields in English.",
      "Return JSON only. No Markdown.",
      "JSON schema: {\"summary\":\"one-sentence window status\",\"workspaceCandidates\":[{\"id\":\"ws_1\",\"title\":\"task name\",\"summary\":\"one-sentence explanation\",\"confidence\":0.0,\"tabIds\":[1],\"reviewTabIds\":[2],\"excludedTabIds\":[3],\"reason\":\"why these pages share one context\"}],\"contexts\":[{\"id\":\"ctx_1\",\"title\":\"task name\",\"description\":\"one-sentence explanation\",\"tabIds\":[1]}],\"actions\":[{\"kind\":\"workspace|later|close_duplicate|keep|group|needs_review\",\"tabIds\":[1],\"title\":\"short title\",\"reason\":\"one-sentence reason\",\"confidence\":0.0,\"contextId\":\"ctx_1|null\",\"groupName\":\"optional group name\"}]}"
    ].join("\n");
  }
  return [
    "你是 Tab Inbox 的窗口整理助手。",
    "目标不是分类规则学习，而是把这个窗口整理成可确认的临时行动方案。",
    "只根据给定标签页元信息判断，不假设已读取网页正文。",
    "不要建议关闭 pinned 或 audible 标签页。",
    "close_duplicate 只能用于 duplicateKey 相同且不是首个保留项的标签页。",
    "优先输出 workspaceCandidates：每个候选表示一个同语境任务，可一键进入工作台。",
    "workspaceCandidates.tabIds 是默认建议加入工作台的页面；reviewTabIds 是需要用户确认是否属于该语境的页面；excludedTabIds 是明确不属于该语境的页面。",
    "workspace 表示当前任务相关；later 表示有价值但当前不用；keep 表示继续保留；needs_review 表示需要用户判断。",
    "group 只表示一次性浏览器分组建议，不创建规则；没有可靠组名时不要使用 group。",
    "summary、title、description、reason、groupName 等用户可见字段必须使用中文。",
    "只输出 JSON，不要 Markdown。",
    "JSON schema: {\"summary\":\"一句话窗口状态\",\"workspaceCandidates\":[{\"id\":\"ws_1\",\"title\":\"任务名\",\"summary\":\"一句话说明\",\"confidence\":0.0,\"tabIds\":[1],\"reviewTabIds\":[2],\"excludedTabIds\":[3],\"reason\":\"为什么这些页面属于同一语境\"}],\"contexts\":[{\"id\":\"ctx_1\",\"title\":\"任务名\",\"description\":\"一句话说明\",\"tabIds\":[1]}],\"actions\":[{\"kind\":\"workspace|later|close_duplicate|keep|group|needs_review\",\"tabIds\":[1],\"title\":\"短标题\",\"reason\":\"一句话原因\",\"confidence\":0.0,\"contextId\":\"ctx_1|null\",\"groupName\":\"可选组名\"}]}"
  ].join("\n");
}

function aiWindowText(language: AiWindowLanguage, key: string, values: Record<string, number> = {}): string {
  const messages: Record<AiWindowLanguage, Record<string, string>> = {
    zh: {
      parsedSummary: "已分析这个窗口，等待选择整理动作。",
      workspaceTitle: "任务工作台 {index}",
      workspaceSummary: "建议作为同一任务语境继续处理。",
      workspaceReason: "这些页面看起来属于同一个可继续处理的任务。",
      contextTitle: "任务 {index}",
      actionReason: "AI 建议用户确认后处理。"
    },
    en: {
      parsedSummary: "This window has been analyzed and is waiting for an organization action.",
      workspaceTitle: "Task workspace {index}",
      workspaceSummary: "Recommended as one task context to continue.",
      workspaceReason: "These pages look like one task you can continue.",
      contextTitle: "Task {index}",
      actionReason: "AI suggests reviewing this before taking action."
    }
  };
  return (messages[language][key] || key).replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ""));
}

function normalizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function normalizeId(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/[^\w-]/g, "").slice(0, 40);
}

function clampConfidence(value: unknown): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0.5;
  return Math.min(1, Math.max(0, Number(number.toFixed(4))));
}

function toChatCompletionsUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/chat/completions") ? trimmed : `${trimmed}/chat/completions`;
}

function parseJsonObject(content: string): unknown {
  const trimmed = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function normalizeUsage(value: unknown): AiTokenUsage {
  const usage = value && typeof value === "object"
    ? value as {
      prompt_tokens?: unknown;
      completion_tokens?: unknown;
      total_tokens?: unknown;
      promptTokens?: unknown;
      completionTokens?: unknown;
      totalTokens?: unknown;
    }
    : {};
  const promptTokens = Math.max(0, Math.floor(Number(usage.prompt_tokens ?? usage.promptTokens ?? 0)));
  const completionTokens = Math.max(0, Math.floor(Number(usage.completion_tokens ?? usage.completionTokens ?? 0)));
  const totalTokens = Math.max(0, Math.floor(Number(usage.total_tokens ?? usage.totalTokens ?? promptTokens + completionTokens)));
  return { promptTokens, completionTokens, totalTokens };
}
