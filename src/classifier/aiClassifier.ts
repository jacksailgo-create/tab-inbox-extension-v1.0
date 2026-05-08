import type { AiSettings, GroupCandidate, PageContext } from "../types";
import { SYSTEM_CATEGORIES, SYSTEM_CATEGORY_NAMES, UNCATEGORIZED_CATEGORY_NAME } from "./systemCategories";

const GROUP_COLORS: chrome.tabGroups.ColorEnum[] = [
  "grey",
  "blue",
  "red",
  "yellow",
  "green",
  "pink",
  "purple",
  "cyan",
  "orange"
];

type AiClassificationMode = "site" | "page" | "user_rule" | "review";
type AiClassificationStatus = "categorized" | "uncategorized" | "needs_review";
type AiClassificationIntent = "read" | "search" | "edit" | "communicate" | "buy" | "watch" | "manage" | "login" | "unknown";

export interface AiClassificationResult extends GroupCandidate {
  rawReason: string;
  isExistingCategory: boolean;
  semanticConflict: boolean;
  siteCategory?: string;
  siteCategoryName?: string;
  pageCategory?: string;
  pageCategoryName?: string;
  displayCategory?: string;
  displayCategoryName?: string;
  classificationMode?: AiClassificationMode;
  status?: AiClassificationStatus;
  intent?: AiClassificationIntent;
  suggestedNewCategory?: string | null;
  usage?: AiTokenUsage;
}

export interface AiTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AiClassificationResponse {
  candidate: AiClassificationResult | null;
  usage: AiTokenUsage;
}

export interface AiConnectionTestResponse {
  model: string;
  message: string;
  usage: AiTokenUsage;
}

export interface AiCategoryOption {
  name: string;
  kind: "custom" | "system";
}

export interface AiCategoryContext {
  customCategories: AiCategoryOption[];
  systemCategories: AiCategoryOption[];
}

export async function classifyWithAi(
  context: PageContext,
  settings: AiSettings
): Promise<AiClassificationResult | null> {
  const response = await requestAiClassification(context, settings);
  return response.candidate;
}

export async function requestAiClassification(
  context: PageContext,
  settings: AiSettings,
  categoryContext: AiCategoryContext = createDefaultAiCategoryContext()
): Promise<AiClassificationResponse> {
  if (!settings.enabled || !settings.baseUrl.trim() || !settings.model.trim() || !settings.apiKey.trim()) {
    return { candidate: null, usage: normalizeUsage(null) };
  }

  const response = await fetch(toChatCompletionsUrl(settings.baseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: [
            "你是浏览器标签页分类器。",
            "只根据给定的最小化页面信息判断合适的中文标签组名称。",
            "核心原则：复杂网站默认按网站主分类 siteCategory 聚合，当前页面差异记录在 pageCategory 和 intent，避免同一网站被打散到多个一级分类。",
            "分类优先级：1) 用户自定义分类；2) 系统分类；3) 待分类或需确认。不要自动创建新分类。",
            `系统分类 key 映射：${JSON.stringify(Object.fromEntries(SYSTEM_CATEGORIES.map((item) => [item.key, item.name])))}。`,
            `用户自定义分类：${categoryContext.customCategories.map((item) => item.name).join("、") || "无"}。`,
            `如果无法可靠分类，status=uncategorized，displayCategory/displayCategoryName=null，不要强行输出 ${UNCATEGORIZED_CATEGORY_NAME} 作为分类。`,
            "只有当用户开启按页面分类、页面明显脱离网站主用途、或 pageCategory 明显更适合时，displayCategory 才使用 pageCategory；否则 displayCategory 默认使用 siteCategory。",
            "新分类只能放在 suggestedNewCategory，不能直接替代系统分类或 displayCategory。",
            "intent 只能是 read/search/edit/communicate/buy/watch/manage/login/unknown。",
            "只输出 JSON，不要 Markdown，不要解释。",
            "JSON schema: {\"siteCategory\":\"key|null\",\"siteCategoryName\":\"中文名|null\",\"pageCategory\":\"key|null\",\"pageCategoryName\":\"中文名|null\",\"displayCategory\":\"key|null\",\"displayCategoryName\":\"中文名|null\",\"classificationMode\":\"site|page|user_rule|review\",\"status\":\"categorized|uncategorized|needs_review\",\"confidence\":0.0,\"intent\":\"read|search|edit|communicate|buy|watch|manage|login|unknown\",\"reason\":\"一句话说明\",\"suggestedNewCategory\":null,\"color\":\"grey|blue|red|yellow|green|pink|purple|cyan|orange\"}"
          ].join("\n")
        },
        {
          role: "user",
          content: JSON.stringify({
            customCategories: categoryContext.customCategories.map((item) => item.name),
            systemCategories: SYSTEM_CATEGORIES,
            hostname: context.hostname,
            domain: context.domain,
            pathPattern: context.pathPattern,
            pageType: context.pageType,
            title: context.title || ""
          })
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`AI request failed: ${response.status}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };
  const content = data.choices?.[0]?.message?.content || "";
  const result = parseAiClassification(content, categoryContext);
  const usage = normalizeUsage(data.usage);
  if (result) result.usage = usage;
  return { candidate: result, usage };
}

export async function requestAiConnectionTest(settings: AiSettings): Promise<AiConnectionTestResponse> {
  if (!settings.baseUrl.trim() || !settings.model.trim() || !settings.apiKey.trim()) {
    throw new Error("AI settings are incomplete");
  }

  const response = await fetch(toChatCompletionsUrl(settings.baseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        {
          role: "user",
          content: "Reply with OK."
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`AI request failed: ${response.status}`);
  }

  const data = await response.json() as {
    model?: unknown;
    choices?: Array<{ message?: { content?: string }; text?: string }>;
    usage?: unknown;
  };
  if (!Array.isArray(data.choices)) {
    throw new Error("AI response was not recognized");
  }

  const content = data.choices[0]?.message?.content || data.choices[0]?.text || "";
  return {
    model: normalizeOptionalString(data.model) || settings.model.trim(),
    message: content.trim().slice(0, 80) || "OK",
    usage: normalizeUsage(data.usage)
  };
}

export function parseAiClassification(
  content: string,
  categoryContext: AiCategoryContext = createDefaultAiCategoryContext()
): AiClassificationResult | null {
  const parsed = parseJsonObject(content);
  if (!parsed || typeof parsed !== "object") return null;

  const shaped = parsed as {
    groupName?: unknown;
    siteCategory?: unknown;
    siteCategoryName?: unknown;
    pageCategory?: unknown;
    pageCategoryName?: unknown;
    displayCategory?: unknown;
    displayCategoryName?: unknown;
    classificationMode?: unknown;
    status?: unknown;
    intent?: unknown;
    reason?: unknown;
    color?: unknown;
    suggestedNewCategory?: unknown;
    semanticConflict?: unknown;
  };
  const displayCategory = normalizeOptionalString(shaped.displayCategory);
  const displayCategoryName = normalizeGroupName(shaped.displayCategoryName) ||
    getSystemCategoryName(displayCategory) ||
    normalizeGroupName(shaped.groupName);
  const suggestedNewCategory = normalizeGroupName(shaped.suggestedNewCategory);
  const status = normalizeStatus(shaped.status, Number((parsed as { confidence?: unknown }).confidence));
  const groupName = status === "uncategorized" ? "" : displayCategoryName || suggestedNewCategory;
  const confidence = Number((parsed as { confidence?: unknown }).confidence);
  const rawReason = normalizeReason(shaped.reason);
  const color = normalizeColor(shaped.color);
  const existingNames = new Set([
    ...categoryContext.customCategories,
    ...categoryContext.systemCategories
  ].map((item) => normalizeCategoryKey(item.name)));
  const isExistingCategory = existingNames.has(normalizeCategoryKey(groupName)) ||
    Boolean(displayCategory && getSystemCategoryName(displayCategory));
  const semanticConflict = Boolean(shaped.semanticConflict) || Boolean(suggestedNewCategory && !isExistingCategory);

  if (!groupName || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) return null;
  if (!rawReason) return null;

  const result: AiClassificationResult = {
    groupName,
    confidence: Number(confidence.toFixed(4)),
    source: "ai_classifier",
    reason: `AI 分类建议「${groupName}」：${rawReason}`,
    rawReason,
    isExistingCategory,
    semanticConflict,
    allowCreate: true,
    shouldLearn: true
  };
  const siteCategory = normalizeOptionalString(shaped.siteCategory);
  const siteCategoryName = normalizeGroupName(shaped.siteCategoryName) || getSystemCategoryName(siteCategory);
  const pageCategory = normalizeOptionalString(shaped.pageCategory);
  const pageCategoryName = normalizeGroupName(shaped.pageCategoryName) || getSystemCategoryName(pageCategory);
  const classificationMode = normalizeClassificationMode(shaped.classificationMode, status);
  const intent = normalizeIntent(shaped.intent);
  if (siteCategory) result.siteCategory = siteCategory;
  if (siteCategoryName) result.siteCategoryName = siteCategoryName;
  if (pageCategory) result.pageCategory = pageCategory;
  if (pageCategoryName) result.pageCategoryName = pageCategoryName;
  if (displayCategory) result.displayCategory = displayCategory;
  if (displayCategoryName) result.displayCategoryName = displayCategoryName;
  result.classificationMode = classificationMode;
  result.status = status;
  result.intent = intent;
  result.suggestedNewCategory = suggestedNewCategory || null;
  if (color) result.groupColor = color;
  return result;
}

export function createDefaultAiCategoryContext(): AiCategoryContext {
  return {
    customCategories: [],
    systemCategories: SYSTEM_CATEGORY_NAMES.map((name) => ({ name, kind: "system" as const }))
  };
}

function normalizeCategoryKey(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeOptionalString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getSystemCategoryName(key: string): string {
  if (!key) return "";
  return SYSTEM_CATEGORIES.find((category) => category.key === key)?.name || "";
}

function normalizeStatus(value: unknown, confidence: number): AiClassificationStatus {
  if (value === "categorized" || value === "uncategorized" || value === "needs_review") return value;
  if (!Number.isFinite(confidence)) return "uncategorized";
  if (confidence >= 0.75) return "categorized";
  if (confidence >= 0.45) return "needs_review";
  return "uncategorized";
}

function normalizeClassificationMode(
  value: unknown,
  status: AiClassificationStatus
): AiClassificationMode {
  if (value === "site" || value === "page" || value === "user_rule" || value === "review") return value;
  return status === "categorized" ? "site" : "review";
}

function normalizeIntent(value: unknown): AiClassificationIntent {
  if (
    value === "read" ||
    value === "search" ||
    value === "edit" ||
    value === "communicate" ||
    value === "buy" ||
    value === "watch" ||
    value === "manage" ||
    value === "login" ||
    value === "unknown"
  ) {
    return value;
  }
  return "unknown";
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

function normalizeGroupName(value: unknown): string {
  if (typeof value !== "string") return "";
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < 2 || normalized.length > 24) return "";
  return normalized;
}

function normalizeReason(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 160);
}

function normalizeColor(value: unknown): chrome.tabGroups.ColorEnum | undefined {
  if (typeof value !== "string") return undefined;
  return GROUP_COLORS.includes(value as chrome.tabGroups.ColorEnum)
    ? (value as chrome.tabGroups.ColorEnum)
    : undefined;
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
      input_tokens?: unknown;
      output_tokens?: unknown;
      inputTokens?: unknown;
      outputTokens?: unknown;
    }
    : {};
  const promptTokens = Math.max(0, Math.floor(Number(
    usage.prompt_tokens ?? usage.promptTokens ?? usage.input_tokens ?? usage.inputTokens ?? 0
  )));
  const completionTokens = Math.max(0, Math.floor(Number(
    usage.completion_tokens ?? usage.completionTokens ?? usage.output_tokens ?? usage.outputTokens ?? 0
  )));
  const totalTokens = Math.max(0, Math.floor(Number(
    usage.total_tokens ?? usage.totalTokens ?? (promptTokens + completionTokens)
  )));
  return { promptTokens, completionTokens, totalTokens };
}
