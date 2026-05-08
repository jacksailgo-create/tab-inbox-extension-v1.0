import type { GroupActionLog, PluginSettings } from "../types";

export function appendActionLog(
  logs: GroupActionLog[],
  log: GroupActionLog,
  settings: PluginSettings,
  maxCount = 500
): GroupActionLog[] {
  if (!settings.privacy.storeActionLogs) return logs;
  return pruneActionLogs([log, ...logs], settings.privacy.actionLogRetentionDays, maxCount);
}

export function pruneActionLogs(
  logs: GroupActionLog[],
  retentionDays: number,
  maxCount = 500,
  now = Date.now()
): GroupActionLog[] {
  const minTimestamp = now - retentionDays * 24 * 60 * 60 * 1000;
  return logs
    .filter((log) => log.timestamp >= minTimestamp)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, maxCount);
}

export function summarizeLogReason(log: GroupActionLog): string {
  const group = log.groupName ? `「${log.groupName}」` : "无分组";
  return `${log.source}：${log.action} ${group}，置信度 ${log.confidence.toFixed(2)}。${log.reason}`;
}
