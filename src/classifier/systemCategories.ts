export const UNCATEGORIZED_CATEGORY_NAME = "待分类";

export const SYSTEM_CATEGORIES = [
  { key: "ai_tools", name: "AI 工具" },
  { key: "creative_design", name: "创作设计" },
  { key: "office_productivity", name: "办公效率" },
  { key: "development", name: "开发技术" },
  { key: "docs_resources", name: "资料文档" },
  { key: "search_query", name: "搜索查询" },
  { key: "reading_learning", name: "阅读学习" },
  { key: "communication_social", name: "沟通社交" },
  { key: "media_entertainment", name: "影音娱乐" },
  { key: "shopping_finance", name: "购物财务" }
] as const;

export const SYSTEM_CATEGORY_NAMES = SYSTEM_CATEGORIES.map((category) => category.name);

export type SystemCategoryName = typeof SYSTEM_CATEGORY_NAMES[number];
export type SystemCategoryKey = typeof SYSTEM_CATEGORIES[number]["key"];
