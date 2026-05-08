import type { GroupCandidate, GroupDecision, GroupMemory, MemoryKeyType, PageContext, PluginSettings } from "../types";
import { uniqueLimited } from "../utils/arrays";
import { makeId } from "../utils/id";
import { isMemoryExpired, shouldDisableMemory, updateMemoryConfidence } from "./memoryScoring";

export interface GroupMemoryMatch extends GroupCandidate {
  memory: GroupMemory;
  keyType: MemoryKeyType;
  key: string;
}

export interface MemoryWriteOptions {
  now?: number;
  source?: GroupMemory["source"];
  keyTypes?: MemoryKeyType[];
}

const MEMORY_READ_ORDER: MemoryKeyType[] = [
  "exact_url",
  "normalized_url",
  "path_pattern",
  "origin",
  "domain"
];

const DEFAULT_AUTO_WRITE_KEYS: MemoryKeyType[] = ["normalized_url", "path_pattern"];
const MANUAL_LEARNING_MATURE_SCORE = 0.6;

export function createMemoryKeys(context: PageContext): Array<{ keyType: MemoryKeyType; key: string }> {
  const keys: Array<{ keyType: MemoryKeyType; key: string }> = [
    { keyType: "exact_url", key: context.url },
    { keyType: "normalized_url", key: context.normalizedUrl },
    { keyType: "path_pattern", key: `${context.origin}${context.pathPattern}` },
    { keyType: "origin", key: context.origin },
    { keyType: "domain", key: context.domain }
  ];
  return keys.filter((item) => Boolean(item.key));
}

export function findGroupMemory(
  context: PageContext,
  memories: GroupMemory[],
  settings: PluginSettings,
  now = Date.now()
): GroupMemoryMatch | null {
  if (!settings.behavior.enableMemory) return null;
  if (context.isTemporaryPage || context.isSensitivePage) return null;

  const keys = createMemoryKeys(context);

  for (const keyType of MEMORY_READ_ORDER) {
    const key = keys.find((item) => item.keyType === keyType);
    if (!key) continue;

    const match = memories
      .filter((memory) => memory.keyType === key.keyType && memory.key === key.key)
      .filter((memory) => !isMemoryExpired(memory, now) && !shouldDisableMemory(memory))
      .sort((a, b) => b.confidence - a.confidence || b.lastUsedAt - a.lastUsedAt)[0];

    if (!match || match.negative) continue;

    const result: GroupMemoryMatch = {
      memory: match,
      keyType,
      key: key.key,
      groupName: match.groupName,
      confidence: match.confidence,
      source: "memory",
      reason: `稳定记忆命中：${keyType} = ${key.key}，历史置信度 ${match.confidence.toFixed(2)}。`,
      allowCreate: match.confidence >= settings.thresholds.createNewGroup,
      shouldLearn: false,
      matchedMemoryId: match.id
    };
    if (match.groupColor) result.groupColor = match.groupColor;
    return result;
  }

  return null;
}

export function canWriteMemory(
  context: PageContext,
  decision: GroupDecision,
  settings: PluginSettings
): boolean {
  if (!settings.behavior.enableMemory) return false;
  if (!decision.shouldLearn) return false;
  if (!context.isEligibleForLearning) return false;
  if (context.isTemporaryPage || context.isSensitivePage) return false;
  if (!decision.groupName) return false;
  return decision.confidence >= settings.thresholds.memoryWrite;
}

export function recordGroupMemory(
  context: PageContext,
  decision: GroupDecision,
  memories: GroupMemory[],
  settings: PluginSettings,
  options: MemoryWriteOptions = {}
): GroupMemory[] {
  if (!canWriteMemory(context, decision, settings)) return memories;

  const now = options.now ?? Date.now();
  const keyTypes = options.keyTypes ?? DEFAULT_AUTO_WRITE_KEYS;
  const source = options.source ?? "auto";
  const expiresAt = now + settings.privacy.memoryRetentionDays * 24 * 60 * 60 * 1000;
  const groupName = decision.groupName;
  if (!groupName) return memories;

  let next = pruneExpiredMemories(memories, now);

  for (const key of createMemoryKeys(context).filter((item) => keyTypes.includes(item.keyType))) {
    const existingIndex = next.findIndex((memory) => memory.keyType === key.keyType && memory.key === key.key);
    if (existingIndex >= 0) {
      const existing = next[existingIndex];
      if (!existing) continue;
      const updated: GroupMemory = {
        ...existing,
        groupName,
        confidence: updateMemoryConfidence({
          previousConfidence: existing.confidence,
          matched: existing.groupName === groupName
        }),
        hitCount: existing.hitCount + 1,
        lastUsedAt: now,
        updatedAt: now,
        expiresAt,
        source,
        reason: decision.reason,
        sampleUrls: uniqueLimited([context.url, ...existing.sampleUrls], 5),
        sampleTitles: uniqueLimited([context.title || "", ...existing.sampleTitles].filter(Boolean), 5)
      };
      if (decision.groupColor) updated.groupColor = decision.groupColor;
      next = next.map((memory, index) => index === existingIndex ? updated : memory);
    } else {
      const memory: GroupMemory = {
        id: makeId("memory"),
        keyType: key.keyType,
        key: key.key,
        groupName,
        confidence: Math.min(0.92, Math.max(0.65, decision.confidence)),
        hitCount: 1,
        correctionCount: 0,
        createdAt: now,
        lastUsedAt: now,
        updatedAt: now,
        expiresAt,
        source,
        sampleUrls: uniqueLimited([context.url], 5),
        sampleTitles: context.title ? [context.title] : [],
        reason: decision.reason
      };
      if (decision.groupColor) memory.groupColor = decision.groupColor;
      next = [...next, memory];
    }
  }

  return next;
}

export function applyMemoryCorrection(
  memoryId: string,
  memories: GroupMemory[],
  now = Date.now()
): GroupMemory[] {
  return memories.map((memory) => {
    if (memory.id !== memoryId) return memory;
    return correctMemory(memory, now);
  });
}

export function applyMemoryCorrectionsForContext(
  context: PageContext,
  memories: GroupMemory[],
  now = Date.now()
): GroupMemory[] {
  const keys = new Set(createMemoryKeys(context).map((item) => `${item.keyType}:${item.key}`));
  return memories.map((memory) =>
    keys.has(`${memory.keyType}:${memory.key}`) && !memory.negative
      ? correctMemory(memory, now)
      : memory
  );
}

function correctMemory(memory: GroupMemory, now: number): GroupMemory {
  const learningCount = typeof memory.learningCount === "number"
    ? Math.max(0, memory.learningCount - 1)
    : undefined;
  const learningScore = typeof memory.learningScore === "number"
    ? clampLearningScore(memory.learningScore - 0.3)
    : undefined;
  const corrected: GroupMemory = {
    ...memory,
    correctionCount: memory.correctionCount + 1,
    confidence: updateMemoryConfidence({
      previousConfidence: memory.confidence,
      matched: false,
      corrected: true
    }),
    updatedAt: now
  };

  if (memory.source === "manual_move") {
    if (typeof learningCount === "number") corrected.learningCount = learningCount;
    if (typeof learningScore === "number") corrected.learningScore = learningScore;
    if (typeof learningCount === "number" || typeof learningScore === "number") {
      corrected.matured = (learningCount ?? 0) >= 3 && (learningScore ?? corrected.confidence) >= MANUAL_LEARNING_MATURE_SCORE;
    }
  }

  if (shouldDisableMemory(corrected)) corrected.disabled = true;
  return corrected;
}

function clampLearningScore(value: number): number {
  return Math.min(1, Math.max(0, Number(value.toFixed(4))));
}

export function pruneExpiredMemories(memories: GroupMemory[], now = Date.now()): GroupMemory[] {
  return memories.filter((memory) => !isMemoryExpired(memory, now));
}
