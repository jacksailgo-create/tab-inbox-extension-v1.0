import type { GroupMemory } from "../types";

export interface MemoryConfidenceUpdateInput {
  previousConfidence: number;
  matched: boolean;
  corrected?: boolean;
  manualConfirmation?: boolean;
}

export function updateMemoryConfidence(input: MemoryConfidenceUpdateInput): number {
  const { previousConfidence, matched, corrected = false, manualConfirmation = false } = input;

  if (corrected) return clamp(previousConfidence - 0.22);
  if (manualConfirmation) return clamp(previousConfidence + 0.12);
  if (matched) return clamp(previousConfidence + 0.04);
  return clamp(previousConfidence - 0.04);
}

export function shouldDisableMemory(memory: GroupMemory): boolean {
  if (memory.disabled) return true;
  if (memory.correctionCount >= 3) return true;
  return memory.confidence < 0.3 && memory.correctionCount > 0;
}

export function isMemoryExpired(memory: GroupMemory, now = Date.now()): boolean {
  return typeof memory.expiresAt === "number" && memory.expiresAt <= now;
}

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}
