import type { GroupCandidate, PageContext, PageType, PluginSettings } from "../types";
import { domainMatches } from "../utils/matchers";

interface BuiltinCategory {
  groupName: string;
  color?: chrome.tabGroups.ColorEnum;
  domains: string[];
  pathKeywords: string[];
  titleKeywords: string[];
  pageTypes: PageType[];
}

export const BUILTIN_CATEGORIES: BuiltinCategory[] = [
  {
    groupName: "AI 工具",
    color: "purple",
    domains: ["chatgpt.com", "openai.com", "claude.ai", "deepseek.com", "gemini.google.com", "perplexity.ai", "poe.com", "qianwen.com", "kimi.moonshot.cn"],
    pathKeywords: ["chat", "prompt", "agent", "models"],
    titleKeywords: ["chatgpt", "claude", "deepseek", "gemini", "perplexity", "kimi", "ai"],
    pageTypes: []
  },
  {
    groupName: "创作设计",
    color: "orange",
    domains: ["figma.com", "canva.com", "dribbble.com", "behance.net", "adobe.com", "miro.com"],
    pathKeywords: ["design", "file", "board", "prototype"],
    titleKeywords: ["figma", "design", "prototype", "miro", "canva"],
    pageTypes: []
  },
  {
    groupName: "办公效率",
    color: "cyan",
    domains: ["mail.google.com", "outlook.live.com", "outlook.office.com", "calendar.google.com", "calendly.com", "docs.google.com", "notion.so", "feishu.cn", "larksuite.com", "linear.app", "jira", "atlassian.net", "trello.com", "asana.com", "clickup.com", "slack.com", "teams.microsoft.com"],
    pathKeywords: ["mail", "calendar", "inbox", "compose", "dashboard", "admin", "console", "workspace", "projects", "settings", "board", "ticket"],
    titleKeywords: ["mail", "calendar", "inbox", "dashboard", "admin", "console", "workspace", "project", "issue", "ticket", "notion"],
    pageTypes: ["email", "dashboard"]
  },
  {
    groupName: "开发技术",
    color: "blue",
    domains: ["github.com", "gitlab.com", "bitbucket.org", "gitee.com", "stackoverflow.com", "npmjs.com", "developer.mozilla.org", "developer.chrome.com", "localhost", "127.0.0.1"],
    pathKeywords: ["repo", "pull", "issues", "commit", "docs", "api"],
    titleKeywords: ["github", "api", "typescript", "javascript", "docs"],
    pageTypes: ["code"]
  },
  {
    groupName: "资料文档",
    color: "cyan",
    domains: ["drive.google.com", "dropbox.com", "box.com", "confluence", "kdocs.cn", "wikipedia.org"],
    pathKeywords: ["docs", "document", "documents", "wiki", "page", "file", "files", "help", "manual"],
    titleKeywords: ["docs", "document", "wiki", "pdf", "manual", "help"],
    pageTypes: ["document"]
  },
  {
    groupName: "搜索查询",
    color: "grey",
    domains: ["google.com", "google.com.hk", "baidu.com", "bing.com", "duckduckgo.com", "sogou.com", "so.com", "yandex.com"],
    pathKeywords: ["search", "s"],
    titleKeywords: ["search", "google", "百度", "bing", "duckduckgo", "搜索"],
    pageTypes: ["search"]
  },
  {
    groupName: "阅读学习",
    color: "blue",
    domains: ["medium.com", "substack.com", "news.ycombinator.com", "36kr.com", "sspai.com", "zhihu.com", "juejin.cn", "coursera.org", "udemy.com", "edx.org", "khanacademy.org", "duolingo.com", "classroom.google.com"],
    pathKeywords: ["article", "blog", "news", "story", "post", "course", "lesson", "learn", "class", "lecture", "tutorial"],
    titleKeywords: ["article", "blog", "news", "course", "lesson", "learn", "课程", "教程"],
    pageTypes: ["article"]
  },
  {
    groupName: "沟通社交",
    color: "pink",
    domains: ["mail.qq.com", "mail.163.com", "x.com", "twitter.com", "reddit.com", "linkedin.com", "facebook.com", "instagram.com", "weibo.com", "xiaohongshu.com", "discord.com", "telegram.org"],
    pathKeywords: ["status", "post", "profile", "messages", "comment", "community"],
    titleKeywords: ["social", "profile", "message", "comment", "community"],
    pageTypes: ["social"]
  },
  {
    groupName: "影音娱乐",
    color: "red",
    domains: ["youtube.com", "youtu.be", "bilibili.com", "netflix.com", "twitch.tv", "open.spotify.com", "music.163.com", "podcasts.apple.com", "xiaoyuzhoufm.com"],
    pathKeywords: ["watch", "video", "playlist", "podcast", "album", "track", "live", "shorts"],
    titleKeywords: ["video", "youtube", "podcast", "spotify", "bilibili"],
    pageTypes: ["video", "audio"]
  },
  {
    groupName: "购物财务",
    color: "yellow",
    domains: ["amazon.com", "taobao.com", "tmall.com", "jd.com", "pinduoduo.com", "ebay.com", "aliexpress.com", "etsy.com", "stripe.com", "paypal.com", "wise.com", "alipay.com"],
    pathKeywords: ["product", "item", "cart", "checkout", "order", "billing", "invoice", "payment", "receipt", "transactions"],
    titleKeywords: ["cart", "checkout", "order", "商品", "购物车", "invoice", "billing", "payment", "账单", "发票"],
    pageTypes: ["product", "cart", "checkout", "invoice", "payment", "order"]
  }
];


export function classifyBuiltin(
  context: PageContext,
  settings: PluginSettings,
  categories = BUILTIN_CATEGORIES
): GroupCandidate | null {
  if (!settings.behavior.enableBuiltinClassifier) return null;

  const results = categories
    .map((category) => scoreBuiltinCategory(context, category))
    .filter((result) => result.confidence >= settings.thresholds.joinExistingGroup)
    .sort((a, b) => b.confidence - a.confidence);

  const best = results[0];
  if (!best) return null;

  const candidate: GroupCandidate = {
    groupName: best.category.groupName,
    confidence: best.confidence,
    source: "builtin_classifier",
    reason: `内置分类命中「${best.category.groupName}」：${best.reasons.join("；")}。`,
    allowCreate: settings.behavior.createGroupsForBuiltinClassifier && best.confidence >= settings.thresholds.createNewGroup,
    shouldLearn: false
  };
  if (best.category.color) candidate.groupColor = best.category.color;
  return candidate;
}

function scoreBuiltinCategory(context: PageContext, category: BuiltinCategory): {
  category: BuiltinCategory;
  confidence: number;
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];
  const title = (context.title || "").toLowerCase();
  const path = `${context.path} ${context.pathPattern}`.toLowerCase();

  const domainHit = getBestDomainHit(context.hostname, category.domains);
  if (domainHit) {
    score += domainHit.kind === "bare_label" ? 0.62 : domainHit.kind === "exact" ? 0.86 : 0.82;
    reasons.push(`domain 命中 ${domainHit.domain}`);
  }

  const pageTypeHit = category.pageTypes.includes(context.pageType);
  if (pageTypeHit) {
    score += 0.3;
    reasons.push(`页面类型为 ${context.pageType}`);
  }

  const pathHit = category.pathKeywords.find((keyword) => path.includes(keyword.toLowerCase()));
  if (pathHit) {
    score += 0.18;
    reasons.push(`路径关键词 ${pathHit}`);
  }

  const titleHit = category.titleKeywords.find((keyword) => title.includes(keyword.toLowerCase()));
  if (titleHit) {
    score += 0.12;
    reasons.push(`标题关键词 ${titleHit}`);
  }

  return {
    category,
    confidence: Math.min(0.95, Number(score.toFixed(4))),
    reasons: reasons.length ? reasons : ["无明显命中"]
  };
}

function getBestDomainHit(hostname: string, domains: string[]): { domain: string; kind: "exact" | "subdomain" | "bare_label" } | null {
  const normalizedHost = hostname.toLowerCase().replace(/^www\./, "");
  const hits = domains
    .filter((domain) => domainMatches(normalizedHost, domain, { allowBareLabel: true }))
    .map((domain) => {
      const normalizedDomain = domain.toLowerCase().replace(/^www\./, "");
      const kind: "exact" | "subdomain" | "bare_label" = normalizedHost === normalizedDomain
        ? "exact"
        : normalizedHost.endsWith(`.${normalizedDomain}`)
          ? "subdomain"
          : "bare_label";
      return { domain, kind };
    })
    .sort((a, b) => getDomainHitRank(b.kind) - getDomainHitRank(a.kind) || b.domain.length - a.domain.length);
  return hits[0] || null;
}

function getDomainHitRank(kind: "exact" | "subdomain" | "bare_label"): number {
  if (kind === "exact") return 3;
  if (kind === "subdomain") return 2;
  return 1;
}
