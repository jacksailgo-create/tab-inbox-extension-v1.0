export async function findGroupByTitle(
  windowId: number,
  title: string
): Promise<chrome.tabGroups.TabGroup | null> {
  return findCanonicalGroupByTitle(windowId, title);
}

export async function findCanonicalGroupByTitle(
  windowId: number,
  title: string
): Promise<chrome.tabGroups.TabGroup | null> {
  const groups = await findGroupsByTitle(windowId, title);
  if (!groups.length) return null;

  const canonical = groups[0];
  if (!canonical) return null;
  const duplicates = groups.slice(1);
  for (const duplicate of duplicates) {
    const tabs = await chrome.tabs.query({ windowId, groupId: duplicate.id });
    const tabIds = tabs
      .map((tab) => tab.id)
      .filter((tabId): tabId is number => typeof tabId === "number");
    if (tabIds.length) {
      await chrome.tabs.group({ tabIds, groupId: canonical.id });
    }
  }

  return chrome.tabGroups.get(canonical.id).catch(() => canonical);
}

export async function findGroupsByTitle(
  windowId: number,
  title: string
): Promise<chrome.tabGroups.TabGroup[]> {
  const groups = await chrome.tabGroups.query({ windowId });
  const target = normalizeGroupTitle(title);
  if (!target) return [];
  return groups.filter((group) => normalizeGroupTitle(group.title || "") === target);
}

export function normalizeGroupTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

const groupTitleLocks = new Map<string, Promise<void>>();

export async function withGroupTitleLock<T>(
  windowId: number,
  title: string,
  task: () => Promise<T>
): Promise<T> {
  const key = `${windowId}:${normalizeGroupTitle(title)}`;
  const previous = groupTitleLocks.get(key) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const queued = previous.catch(() => undefined).then(() => current);
  groupTitleLocks.set(key, queued);

  await previous.catch(() => undefined);
  try {
    return await task();
  } finally {
    release();
    if (groupTitleLocks.get(key) === queued) {
      groupTitleLocks.delete(key);
    }
  }
}
