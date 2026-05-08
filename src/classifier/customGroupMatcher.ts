import type { CustomGroupConfig, GroupCandidate, PageContext, PluginSettings } from "../types";
import { domainMatches } from "../utils/matchers";
import { isSafeRegexPattern, safeRegexTest } from "../utils/matchers";

export interface CustomGroupScore {
  config: CustomGroupConfig;
  score: number;
  reasons: string[];
}

export function matchCustomGroups(
  context: PageContext,
  configs: CustomGroupConfig[],
  settings: PluginSettings
): GroupCandidate | null {
  if (!settings.behavior.enableCustomGroups) return null;

  const best = configs
    .filter((config) => config.enabled)
    .map((config) => scoreCustomGroup(context, config))
    .filter((result) => result.score >= settings.thresholds.joinExistingGroup)
    .sort((a, b) => b.score - a.score || b.config.priority - a.config.priority)[0];

  if (!best) return null;

  const allowCreate = best.config.autoCreate && best.score >= settings.thresholds.createNewGroup;
  const candidate: GroupCandidate = {
    groupName: best.config.groupName,
    confidence: Math.min(1, best.score),
    source: "custom_group",
    reason: `自定义分组「${best.config.groupName}」命中：${best.reasons.join("；")}。`,
    allowCreate,
    shouldLearn: context.isEligibleForLearning && !context.isTemporaryPage && !context.isSensitivePage
  };
  if (best.config.color) candidate.groupColor = best.config.color;
  return candidate;
}

export function scoreCustomGroup(context: PageContext, config: CustomGroupConfig): CustomGroupScore {
  let score = 0;
  const reasons: string[] = [];
  const searchText = [
    context.title || "",
    context.url,
    context.normalizedUrl,
    context.hostname,
    context.domain,
    context.path,
    context.pathPattern
  ].join(" ").toLowerCase();

  const domainHit = config.domains.find((domain) => domainMatches(context.hostname, domain));
  if (domainHit) {
    score += 0.82;
    reasons.push(`domain 命中 ${domainHit} +0.82`);
  }

  const urlPatternHit = [...config.urlPatterns, ...config.pathPatterns].find((pattern) =>
    patternMatches(context, pattern)
  );
  if (urlPatternHit) {
    score += 0.3;
    reasons.push(`URL/path 命中 ${urlPatternHit} +0.3`);
  }

  const keywordHit = config.keywords.find((keyword) =>
    isStrongKeyword(keyword) && searchText.includes(keyword.toLowerCase())
  );
  if (keywordHit) {
    score += 0.2;
    reasons.push(`关键词命中 ${keywordHit} +0.2`);
  }

  const groupName = config.groupName.trim().toLowerCase();
  if (groupName && (context.title || "").toLowerCase().includes(groupName)) {
    score += 0.12;
    reasons.push("标题包含分组名 +0.12");
  }

  const excludeHit = config.excludeKeywords.find((keyword) => searchText.includes(keyword.toLowerCase()));
  if (excludeHit) {
    return {
      config,
      score: 0,
      reasons: [`排除词命中 ${excludeHit}，跳过自定义分组`]
    };
  }

  return {
    config,
    score: clamp(score),
    reasons: reasons.length ? reasons : ["无明显命中"]
  };
}

function patternMatches(context: PageContext, pattern: string): boolean {
  const value = pattern.trim();
  if (!value) return false;
  if (context.pathPattern === value || context.path === value) return true;
  if (context.url.includes(value) || context.normalizedUrl.includes(value)) return true;
  if (!isSafeRegexPattern(value)) return false;

  return safeRegexTest(value, context.normalizedUrl);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

function isStrongKeyword(keyword: string): boolean {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return false;
  const lettersAndNumbers = normalized.replace(/[\s_-]+/g, "");
  if (/[\u4e00-\u9fff]/.test(lettersAndNumbers)) return lettersAndNumbers.length >= 2;
  return lettersAndNumbers.length >= 3;
}
