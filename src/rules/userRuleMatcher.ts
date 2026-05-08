import type { PageContext, UserRule, UserRuleAction, UserRuleType } from "../types";
import { domainMatches, safeRegexTest } from "../utils/matchers";

export interface RuleMatchResult {
  rule: UserRule;
  action: UserRuleAction;
  groupName?: string;
  groupColor?: chrome.tabGroups.ColorEnum;
  confidence: number;
  reason: string;
}

const RULE_TYPE_RANK: Record<UserRuleType, number> = {
  exact_url: 100,
  normalized_url: 90,
  path_pattern: 80,
  origin: 70,
  domain: 60,
  keyword: 30,
  regex: 20
};

const ACTION_RANK: Record<UserRuleAction, number> = {
  never_group: 300,
  exclude_group: 200,
  group: 100
};

const TYPE_CONFIDENCE: Record<UserRuleType, number> = {
  exact_url: 1,
  normalized_url: 0.98,
  path_pattern: 0.94,
  origin: 0.9,
  domain: 0.86,
  keyword: 0.7,
  regex: 0.74
};

export function matchUserRules(context: PageContext, rules: UserRule[]): RuleMatchResult | null {
  const matches = rules
    .filter((rule) => rule.enabled)
    .map((rule) => matchRule(context, rule))
    .filter((match): match is RuleMatchResult => Boolean(match))
    .sort(compareRuleMatches);

  return matches[0] ?? null;
}

export function matchRule(context: PageContext, rule: UserRule): RuleMatchResult | null {
  const value = rule.value.trim();
  if (!value) return null;

  const matched = matchesByType(context, rule.type, value);
  if (!matched) return null;

  const result: RuleMatchResult = {
    rule,
    action: rule.action,
    confidence: TYPE_CONFIDENCE[rule.type],
    reason: createReason(rule)
  };

  if (rule.groupName) result.groupName = rule.groupName;
  if (rule.groupColor) result.groupColor = rule.groupColor;

  return result;
}

function compareRuleMatches(a: RuleMatchResult, b: RuleMatchResult): number {
  const neverGroupDiff = Number(b.action === "never_group") - Number(a.action === "never_group");
  if (neverGroupDiff !== 0) return neverGroupDiff;

  const typeDiff = RULE_TYPE_RANK[b.rule.type] - RULE_TYPE_RANK[a.rule.type];
  if (typeDiff !== 0) return typeDiff;

  const actionDiff = ACTION_RANK[b.action] - ACTION_RANK[a.action];
  if (actionDiff !== 0) return actionDiff;

  const priorityDiff = b.rule.priority - a.rule.priority;
  if (priorityDiff !== 0) return priorityDiff;

  return b.rule.updatedAt - a.rule.updatedAt;
}

function matchesByType(context: PageContext, type: UserRuleType, value: string): boolean {
  switch (type) {
    case "exact_url":
      return context.url === value;
    case "normalized_url":
      return context.normalizedUrl === value;
    case "path_pattern":
      return pathPatternMatches(context, value);
    case "origin":
      return context.origin.toLowerCase() === value.toLowerCase();
    case "domain":
      return domainMatches(context.hostname, value) || domainMatches(context.domain, value);
    case "keyword":
      return searchableText(context).includes(value.toLowerCase());
    case "regex":
      return safeRegexTest(value, `${context.url}\n${context.normalizedUrl}\n${context.title || ""}`);
  }
}

function createReason(rule: UserRule): string {
  const actionLabel = rule.action === "group"
    ? `分到「${rule.groupName || "未命名分组"}」`
    : rule.action === "never_group"
      ? "永不自动分组"
      : "排除目标分组";

  return `用户显式规则命中：${rule.type} = ${rule.value}，动作：${actionLabel}。`;
}

function searchableText(context: PageContext): string {
  return [
    context.url,
    context.normalizedUrl,
    context.title || "",
    context.hostname,
    context.domain,
    context.path,
    context.pathPattern
  ].join(" ").toLowerCase();
}

function normalizePathPattern(value: string): string {
  const trimmed = value.trim().toLowerCase();
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function pathPatternMatches(context: PageContext, value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  const scopedPattern = parseScopedPathPattern(trimmed);
  if (scopedPattern) {
    return scopedPattern.origin === context.origin.toLowerCase() &&
      normalizePathPattern(scopedPattern.pathPattern) === normalizePathPattern(context.pathPattern);
  }

  return normalizePathPattern(context.pathPattern) === normalizePathPattern(trimmed);
}

function parseScopedPathPattern(value: string): { origin: string; pathPattern: string } | null {
  if (!/^https?:\/\//i.test(value)) return null;

  try {
    const url = new URL(value);
    return {
      origin: url.origin.toLowerCase(),
      pathPattern: url.pathname || "/"
    };
  } catch {
    return null;
  }
}
