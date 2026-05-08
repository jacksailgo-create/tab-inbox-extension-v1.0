import { classifyBuiltin } from "../classifier/builtinClassifier";
import { matchCustomGroups } from "../classifier/customGroupMatcher";
import { resolveOpenerGroup, type OpenerContextState, type TabGroupReader } from "../context/openerContext";
import { findGroupMemory } from "../memory/groupMemoryStore";
import { matchUserRules } from "../rules/userRuleMatcher";
import type {
  CurrentGroupContext,
  CustomGroupConfig,
  GroupCandidate,
  GroupDecision,
  GroupMemory,
  PageContext,
  PluginSettings,
  UserRule
} from "../types";
import { UNGROUPED_TAB_GROUP_ID } from "../utils/constants";
import { isEligibleForGrouping } from "./eligibility";

export interface DecisionInput {
  context: PageContext;
  settings: PluginSettings;
  userRules: UserRule[];
  memories: GroupMemory[];
  customGroups: CustomGroupConfig[];
  openerState: OpenerContextState;
  tabGroupReader: TabGroupReader;
  currentGroup?: CurrentGroupContext | undefined;
  now?: number;
}

export async function decideGroup(input: DecisionInput): Promise<GroupDecision> {
  const { context, settings, userRules, memories, customGroups, openerState, tabGroupReader, currentGroup } = input;
  const now = input.now ?? Date.now();
  const eligibility = isEligibleForGrouping(context, settings);

  if (eligibility.status === "skip_all") {
    return noneDecision(context, "eligibility", eligibility.reason, now);
  }

  const explicitRule = matchUserRules(context, userRules);
  if (explicitRule) {
    if (explicitRule.action === "never_group" || explicitRule.action === "exclude_group") {
      return noneDecision(context, "user_rule", explicitRule.reason, now, {
        matchedRuleId: explicitRule.rule.id
      });
    }

    if (explicitRule.groupName) {
      const candidate: GroupCandidate = {
        groupName: explicitRule.groupName,
        confidence: explicitRule.confidence,
        source: "user_rule",
        reason: explicitRule.reason,
        allowCreate: true,
        shouldLearn: true,
        matchedRuleId: explicitRule.rule.id
      };
      if (explicitRule.groupColor) candidate.groupColor = explicitRule.groupColor;
      return candidateToDecision(context, candidate, settings, now);
    }
  }

  if (eligibility.status === "inherit_only") {
    const opener = await resolveOpenerCandidate(context, settings, openerState, tabGroupReader, now);
    if (opener && eligibility.canInherit) {
      return candidateToDecision(context, opener, settings, now);
    }
    return noneDecision(context, "eligibility", eligibility.reason, now);
  }

  const highTrustMemory = findGroupMemory(context, memories.filter((memory) => isHighTrustMemory(memory, settings)), settings, now);
  if (highTrustMemory) {
    const protection = protectCurrentUserOwnedGroup(context, highTrustMemory, currentGroup, settings, now);
    if (protection) return protection;
    return candidateToDecision(context, highTrustMemory, settings, now);
  }

  const custom = matchCustomGroups(context, customGroups, settings);
  if (custom) {
    const protection = protectCurrentUserOwnedGroup(context, custom, currentGroup, settings, now);
    if (protection) return protection;
    return candidateToDecision(context, custom, settings, now);
  }

  const ordinaryMemory = findGroupMemory(context, memories.filter((memory) => isOrdinaryMemory(memory)), settings, now);
  if (ordinaryMemory) {
    return candidateToDecision(context, ordinaryMemory, settings, now);
  }

  const builtin = classifyBuiltin(context, settings);
  if (builtin) {
    return candidateToDecision(context, builtin, settings, now);
  }

  const opener = await resolveOpenerCandidate(context, settings, openerState, tabGroupReader, now);
  if (opener && eligibility.canInherit) {
    return candidateToDecision(context, opener, settings, now);
  }

  return noneDecision(context, "no_match", "没有规则、继承、记忆或分类结果达到阈值。", now);
}

async function resolveOpenerCandidate(
  context: PageContext,
  settings: PluginSettings,
  openerState: OpenerContextState,
  tabGroupReader: TabGroupReader,
  now: number
): Promise<GroupCandidate | null> {
  if (!settings.behavior.inheritOpenerGroup) return null;
  const opener = await resolveOpenerGroup(context, openerState, tabGroupReader, { now });
  return opener ? { ...opener, shouldLearn: false } : null;
}

function isHighTrustMemory(memory: GroupMemory, settings: PluginSettings): boolean {
  if (memory.source === "manual_move") return isMatureManualMemory(memory, settings);
  return memory.source === "feedback" ||
    memory.source === "rule_promotion";
}

function isOrdinaryMemory(memory: GroupMemory): boolean {
  return memory.source !== "manual_move" &&
    memory.source !== "feedback" &&
    memory.source !== "rule_promotion";
}

function isMatureManualMemory(memory: GroupMemory, settings: PluginSettings): boolean {
  if (memory.matured === false) return false;
  if (memory.matured === true) return memory.confidence >= settings.thresholds.joinExistingGroup;
  if (typeof memory.learningCount === "number" || typeof memory.learningScore === "number") {
    return (memory.learningCount ?? 0) >= 3 &&
      (memory.learningScore ?? memory.confidence) >= 0.6 &&
      memory.confidence >= settings.thresholds.joinExistingGroup;
  }
  return true;
}

function protectCurrentUserOwnedGroup(
  context: PageContext,
  candidate: GroupCandidate,
  currentGroup: CurrentGroupContext | undefined,
  settings: PluginSettings,
  now: number
): GroupDecision | null {
  if (!settings.behavior.protectManualGroups) return null;
  if (typeof context.groupId !== "number" || context.groupId === UNGROUPED_TAB_GROUP_ID) return null;
  if (!currentGroup || currentGroup.id !== context.groupId) return null;
  if (!currentGroup.title || currentGroup.title.trim() !== candidate.groupName.trim()) return null;

  const decision: GroupDecision = {
    action: "none",
    groupId: context.groupId,
    groupName: candidate.groupName,
    confidence: 1,
    source: "manual_protection",
    reason: `当前标签已在用户确认的「${candidate.groupName}」分组中，保护该用户意图。`,
    shouldLearn: false,
    allowCreate: false,
    temporaryPage: context.isTemporaryPage,
    sensitivePage: context.isSensitivePage,
    createdAt: now
  };
  const groupColor = candidate.groupColor ?? currentGroup.color;
  if (groupColor) decision.groupColor = groupColor;
  if (candidate.matchedMemoryId) decision.matchedMemoryId = candidate.matchedMemoryId;
  if (candidate.matchedRuleId) decision.matchedRuleId = candidate.matchedRuleId;
  return decision;
}

function candidateToDecision(
  context: PageContext,
  candidate: GroupCandidate,
  settings: PluginSettings,
  now: number
): GroupDecision {
  const isAlreadyGrouped = typeof context.groupId === "number" && context.groupId !== UNGROUPED_TAB_GROUP_ID;
  const needsExistingGroupMoveThreshold = isAlreadyGrouped && candidate.source !== "user_rule";
  const canCreate = candidate.allowCreate &&
    !context.isTemporaryPage &&
    !context.isSensitivePage &&
    candidate.confidence >= settings.thresholds.createNewGroup;
  const canMoveExistingGroupedTab = !needsExistingGroupMoveThreshold ||
    candidate.confidence >= settings.thresholds.moveExistingGroupedTab;

  const action = candidate.confidence >= settings.thresholds.joinExistingGroup && canMoveExistingGroupedTab
    ? canCreate
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
    source: candidate.source,
    reason,
    shouldLearn: candidate.shouldLearn && context.isEligibleForLearning && !context.isTemporaryPage && !context.isSensitivePage,
    allowCreate: canCreate,
    temporaryPage: context.isTemporaryPage,
    sensitivePage: context.isSensitivePage,
    createdAt: now
  };

  if (candidate.groupColor) decision.groupColor = candidate.groupColor;
  if (candidate.matchedRuleId) decision.matchedRuleId = candidate.matchedRuleId;
  if (candidate.matchedMemoryId) decision.matchedMemoryId = candidate.matchedMemoryId;
  return decision;
}

function noneDecision(
  context: PageContext,
  source: GroupDecision["source"],
  reason: string,
  now: number,
  extra: Partial<GroupDecision> = {}
): GroupDecision {
  return {
    action: "none",
    confidence: 0,
    source,
    reason,
    shouldLearn: false,
    allowCreate: false,
    temporaryPage: context.isTemporaryPage,
    sensitivePage: context.isSensitivePage,
    createdAt: now,
    ...extra
  };
}
