import { createMemoryKeys, recordGroupMemory } from "../memory/groupMemoryStore";
import { applyMemoryCorrection } from "../memory/groupMemoryStore";
import type { GroupDecision, GroupFeedback, GroupMemory, MemoryKeyType, PageContext, PluginSettings, UserRule } from "../types";
import { uniqueLimited } from "../utils/arrays";
import { makeId } from "../utils/id";

const MANUAL_LEARNING_KEY_TYPES: MemoryKeyType[] = ["normalized_url", "path_pattern"];
const MATURED_MANUAL_KEY_TYPES: MemoryKeyType[] = ["domain"];
const MANUAL_LEARNING_MATURE_COUNT = 3;
const MANUAL_LEARNING_MATURE_SCORE = 0.6;
const MANUAL_LEARNING_EXTRA_INCREMENT = 0.05;

export interface FeedbackResult {
  rules: UserRule[];
  memories: GroupMemory[];
}

export function handleFeedback(
  feedback: GroupFeedback,
  context: PageContext,
  settings: PluginSettings,
  rules: UserRule[],
  memories: GroupMemory[]
): FeedbackResult {
  switch (feedback.action) {
    case "move_once":
      return { rules, memories };
    case "always_page":
      return {
        rules: [...rules, createRule("normalized_url", feedback.normalizedUrl, feedback)],
        memories
      };
    case "always_path":
      return {
        rules: [...rules, createRule("path_pattern", feedback.pathPattern, feedback)],
        memories
      };
    case "always_site":
      return {
        rules: [...rules, createRule("domain", feedback.domain, feedback)],
        memories
      };
    case "never_site":
      return {
        rules: [...rules, createNeverRule(feedback.domain)],
        memories
      };
    case "ignore_keyword":
      return {
        rules: feedback.keyword ? [...rules, createIgnoreKeywordRule(feedback.keyword)] : rules,
        memories
      };
  }
}

export function learnFromManualMove(
  context: PageContext,
  groupName: string,
  settings: PluginSettings,
  memories: GroupMemory[],
  groupColor?: chrome.tabGroups.ColorEnum
): GroupMemory[] {
  if (!settings.behavior.enableMemory || !context.isEligibleForLearning || context.isTemporaryPage || context.isSensitivePage) {
    return memories;
  }

  const now = Date.now();
  const expiresAt = now + settings.privacy.memoryRetentionDays * 24 * 60 * 60 * 1000;
  const eligibleKeys = createMemoryKeys(context).filter((key) => MANUAL_LEARNING_KEY_TYPES.includes(key.keyType));
  let next = memories;
  let matured = false;

  for (const key of eligibleKeys) {
    const result = upsertManualLearningMemory({
      context,
      groupName,
      groupColor,
      memories: next,
      keyType: key.keyType,
      key: key.key,
      now,
      expiresAt
    });
    next = result.memories;
    matured = matured || result.matured;
  }

  if (matured) {
    for (const key of createMemoryKeys(context).filter((item) => MATURED_MANUAL_KEY_TYPES.includes(item.keyType))) {
      const result = upsertManualLearningMemory({
        context,
        groupName,
        groupColor,
        memories: next,
        keyType: key.keyType,
        key: key.key,
        now,
        expiresAt,
        forceMatured: true
      });
      next = result.memories;
    }
  }

  return next;
}

export function learnFromManualRemoval(memoryId: string | undefined, memories: GroupMemory[]): GroupMemory[] {
  if (!memoryId) return memories;
  return applyMemoryCorrection(memoryId, memories);
}

function createRule(type: UserRule["type"], value: string, feedback: GroupFeedback): UserRule {
  const now = Date.now();
  const rule: UserRule = {
    id: makeId("rule"),
    type,
    action: "group",
    value,
    groupName: feedback.targetGroupName || "未命名分组",
    enabled: true,
    priority: 100,
    createdAt: now,
    updatedAt: now,
    source: "feedback"
  };
  if (feedback.targetGroupColor) rule.groupColor = feedback.targetGroupColor;
  return rule;
}

function createNeverRule(domain: string): UserRule {
  const now = Date.now();
  return {
    id: makeId("rule"),
    type: "domain",
    action: "never_group",
    value: domain,
    enabled: true,
    priority: 1000,
    createdAt: now,
    updatedAt: now,
    source: "feedback"
  };
}

function createIgnoreKeywordRule(keyword: string): UserRule {
  const now = Date.now();
  return {
    id: makeId("rule"),
    type: "keyword",
    action: "exclude_group",
    value: keyword,
    enabled: true,
    priority: 900,
    createdAt: now,
    updatedAt: now,
    source: "feedback",
    description: "用户反馈：不要再根据这个关键词判断。"
  };
}

interface ManualLearningInput {
  context: PageContext;
  groupName: string;
  groupColor?: chrome.tabGroups.ColorEnum | undefined;
  memories: GroupMemory[];
  keyType: MemoryKeyType;
  key: string;
  now: number;
  expiresAt: number;
  forceMatured?: boolean;
}

function upsertManualLearningMemory(input: ManualLearningInput): { memories: GroupMemory[]; matured: boolean } {
  const { context, groupName, groupColor, keyType, key, now, expiresAt, forceMatured = false } = input;
  const existingIndex = input.memories.findIndex((memory) => memory.keyType === keyType && memory.key === key);
  const existing = existingIndex >= 0 ? input.memories[existingIndex] : undefined;
  const sameGroup = existing?.groupName === groupName;
  const previousCount = sameGroup ? normalizeLearningCount(existing) : 0;
  const previousScore = sameGroup ? normalizeLearningScore(existing) : 0;
  const learningCount = forceMatured
    ? Math.max(previousCount, MANUAL_LEARNING_MATURE_COUNT)
    : previousCount + 1;
  const learningScore = forceMatured
    ? Math.max(previousScore, MANUAL_LEARNING_MATURE_SCORE)
    : clampManualLearningScore(previousScore + learningIncrementForCount(learningCount));
  const matured = forceMatured || (learningCount >= MANUAL_LEARNING_MATURE_COUNT && learningScore >= MANUAL_LEARNING_MATURE_SCORE);
  const confidence = matured ? Math.max(learningScore, MANUAL_LEARNING_MATURE_SCORE) : learningScore;
  const reason = matured
    ? `用户已 ${learningCount} 次手动确认「${groupName}」，学习成熟。`
    : `用户第 ${learningCount} 次手动确认「${groupName}」，学习中（${learningScore.toFixed(2)}）。`;

  const memory: GroupMemory = {
    id: existing?.id ?? makeId("memory"),
    keyType,
    key,
    groupName,
    confidence,
    hitCount: (sameGroup ? existing?.hitCount ?? 0 : 0) + 1,
    correctionCount: existing && !sameGroup ? existing.correctionCount + 1 : existing?.correctionCount ?? 0,
    createdAt: sameGroup ? existing?.createdAt ?? now : now,
    lastUsedAt: now,
    updatedAt: now,
    expiresAt,
    source: "manual_move",
    sampleUrls: uniqueLimited([context.url, ...(sameGroup ? existing?.sampleUrls ?? [] : [])], 5),
    sampleTitles: uniqueLimited([context.title || "", ...(sameGroup ? existing?.sampleTitles ?? [] : [])].filter(Boolean), 5),
    reason,
    learningCount,
    learningScore,
    matured,
    lastManualConfirmedAt: now
  };
  if (groupColor) memory.groupColor = groupColor;

  if (existingIndex >= 0) {
    return {
      memories: input.memories.map((item, index) => index === existingIndex ? memory : item),
      matured
    };
  }

  return {
    memories: [...input.memories, memory],
    matured
  };
}

function normalizeLearningCount(memory: GroupMemory | undefined): number {
  if (!memory) return 0;
  if (typeof memory.learningCount === "number") return Math.max(0, memory.learningCount);
  return memory.source === "manual_move" ? MANUAL_LEARNING_MATURE_COUNT : 0;
}

function normalizeLearningScore(memory: GroupMemory | undefined): number {
  if (!memory) return 0;
  if (typeof memory.learningScore === "number") return Math.max(0, memory.learningScore);
  return memory.source === "manual_move" ? Math.max(memory.confidence, MANUAL_LEARNING_MATURE_SCORE) : 0;
}

function learningIncrementForCount(count: number): number {
  if (count === 1) return 0.1;
  if (count === 2) return 0.2;
  if (count === 3) return 0.3;
  return MANUAL_LEARNING_EXTRA_INCREMENT;
}

function clampManualLearningScore(value: number): number {
  return Math.min(1, Math.max(0, Number(value.toFixed(4))));
}
