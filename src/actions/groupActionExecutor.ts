import type { GroupActionLog, GroupDecision, PageContext } from "../types";
import { UNGROUPED_TAB_GROUP_ID } from "../utils/constants";
import { makeId } from "../utils/id";
import { findCanonicalGroupByTitle, withGroupTitleLock } from "./groupFinder";

export interface GroupActionResult {
  success: boolean;
  log: GroupActionLog;
  groupId?: number;
  error?: string;
}

export async function applyGroupDecision(
  tab: chrome.tabs.Tab,
  context: PageContext,
  decision: GroupDecision
): Promise<GroupActionResult> {
  const now = Date.now();

  if (decision.action === "none" || decision.action === "wait" || !decision.groupName) {
    return {
      success: true,
      log: createLog(context, decision, now)
    };
  }

  try {
    const groupName = decision.groupName;
    const windowId = tab.windowId ?? context.windowId;
    return await withGroupTitleLock(windowId, groupName, async () => {
      const latestTab = typeof tab.id === "number"
        ? await chrome.tabs.get(tab.id).catch(() => tab)
        : tab;
      const latestGroupId = typeof latestTab.groupId === "number" ? latestTab.groupId : tab.groupId;

      if (typeof latestGroupId === "number" && latestGroupId !== UNGROUPED_TAB_GROUP_ID && latestGroupId === decision.groupId) {
        return {
          success: true,
          groupId: latestGroupId,
          log: createLog(context, { ...decision, action: "none", reason: "标签已经在目标分组中，跳过重复移动。" }, now, latestGroupId)
        };
      }

      const existing = await findCanonicalGroupByTitle(windowId, groupName);
      if (existing) {
        if (typeof latestGroupId === "number" && latestGroupId === existing.id) {
          return {
            success: true,
            groupId: latestGroupId,
            log: createLog(context, { ...decision, action: "none", reason: "标签已经在目标分组中，跳过重复移动。" }, now, latestGroupId)
          };
        }
        const groupId = await chrome.tabs.group({ tabIds: tab.id, groupId: existing.id });
        return {
          success: true,
          groupId,
          log: createLog(context, { ...decision, action: "move_to_existing_group" }, now, groupId)
        };
      }

      if (!decision.allowCreate || decision.temporaryPage || decision.action !== "create_group") {
        return {
          success: true,
          log: createLog(context, {
            ...decision,
            action: "none",
            reason: `${decision.reason}；未找到同名分组，且当前决策不允许创建新分组。`
          }, now)
        };
      }

      const groupId = await chrome.tabs.group({ tabIds: tab.id });
      const update: chrome.tabGroups.UpdateProperties = { title: groupName };
      if (decision.groupColor) update.color = decision.groupColor;
      await chrome.tabGroups.update(groupId, update);

      return {
        success: true,
        groupId,
        log: createLog(context, decision, now, groupId)
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: message,
      log: createLog(context, decision, now, undefined, message)
    };
  }
}

function createLog(
  context: PageContext,
  decision: GroupDecision,
  timestamp: number,
  groupId?: number,
  error?: string
): GroupActionLog {
  const log: GroupActionLog = {
    id: makeId("log"),
    tabId: context.tabId,
    windowId: context.windowId,
    url: context.url,
    normalizedUrl: context.normalizedUrl,
    action: decision.action,
    source: decision.source,
    confidence: decision.confidence,
    reason: decision.reason,
    pageType: context.pageType,
    shouldLearn: decision.shouldLearn,
    allowCreate: decision.allowCreate,
    temporaryPage: decision.temporaryPage,
    sensitivePage: decision.sensitivePage,
    timestamp
  };

  if (context.title) log.title = context.title;
  if (decision.groupName) log.groupName = decision.groupName;
  if (typeof groupId === "number") log.groupId = groupId;
  if (decision.matchedRuleId) log.matchedRuleId = decision.matchedRuleId;
  if (decision.matchedMemoryId) log.matchedMemoryId = decision.matchedMemoryId;
  if (error) log.error = error;
  return log;
}
