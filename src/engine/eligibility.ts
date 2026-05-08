import type { PageContext, PluginSettings } from "../types";
import { domainMatches, safeRegexTest } from "../utils/matchers";

export type GroupingEligibilityStatus = "skip_all" | "inherit_only" | "normal";

export interface GroupingEligibility {
  status: GroupingEligibilityStatus;
  canGroup: boolean;
  canInherit: boolean;
  canCreateGroup: boolean;
  canLearn: boolean;
  reason: string;
}

const INHERIT_ONLY_PAGE_TYPES = new Set([
  "login",
  "oauth",
  "redirect",
  "payment",
  "checkout",
  "captcha",
  "download",
  "error"
]);

export function isEligibleForGrouping(
  context: PageContext,
  settings: PluginSettings
): GroupingEligibility {
  if (!settings.enabled) {
    return skipAll("自动分组已关闭。");
  }

  if (context.isSystemPage || context.pageType === "system" || context.pageType === "newtab") {
    return skipAll("系统页或新标签页不参与自动分组。");
  }

  if (!context.url || !context.normalizedUrl) {
    return skipAll("页面 URL 不完整，暂不处理。");
  }

  const neverGroupDomain = settings.neverGroupDomains.find((domain) =>
    domainMatches(context.hostname, domain) || domainMatches(context.domain, domain)
  );
  if (neverGroupDomain) {
    return skipAll(`用户设置了 ${neverGroupDomain} 永不自动分组。`);
  }

  const neverGroupPattern = settings.neverGroupUrlPatterns.find((pattern) =>
    safeRegexTest(pattern, context.url) || context.normalizedUrl.includes(pattern)
  );
  if (neverGroupPattern) {
    return skipAll(`用户设置的 URL 排除规则命中：${neverGroupPattern}`);
  }

  if (INHERIT_ONLY_PAGE_TYPES.has(context.pageType) || context.isTemporaryPage) {
    return {
      status: "inherit_only",
      canGroup: true,
      canInherit: true,
      canCreateGroup: false,
      canLearn: false,
      reason: `${context.pageType} 属于临时或敏感流程页，只允许继承来源分组，不主动创建或学习。`
    };
  }

  if (context.isSensitivePage) {
    return {
      status: "inherit_only",
      canGroup: true,
      canInherit: true,
      canCreateGroup: false,
      canLearn: false,
      reason: `${context.pageType} 属于敏感页面，只允许继承或显式规则处理，不写入长期记忆。`
    };
  }

  return {
    status: "normal",
    canGroup: true,
    canInherit: true,
    canCreateGroup: true,
    canLearn: context.isEligibleForLearning,
    reason: "页面符合自动分组条件。"
  };
}

function skipAll(reason: string): GroupingEligibility {
  return {
    status: "skip_all",
    canGroup: false,
    canInherit: false,
    canCreateGroup: false,
    canLearn: false,
    reason
  };
}
