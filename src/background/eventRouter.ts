import { DebounceScheduler } from "./debounceScheduler";

export interface EventRouterOptions {
  classifyTab: (tabId: number, reason: string) => Promise<void>;
  recordActiveTab?: (tabId: number, windowId: number) => Promise<void>;
  removeTab?: (tabId: number) => Promise<void>;
}

export function registerTabEventRouter(options: EventRouterOptions): DebounceScheduler {
  const scheduler = new DebounceScheduler(options.classifyTab);

  chrome.tabs.onCreated.addListener((tab) => {
    if (typeof tab.id === "number") scheduler.schedule(tab.id, "tab_created");
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url) {
      scheduler.schedule(tabId, "tab_updated_url");
      return;
    }

    if (changeInfo.title || changeInfo.status === "complete") {
      scheduler.schedule(tabId, "tab_updated_title_or_complete");
    }
  });

  chrome.tabs.onActivated.addListener((activeInfo) => {
    void options.recordActiveTab?.(activeInfo.tabId, activeInfo.windowId);
    scheduler.schedule(activeInfo.tabId, "tab_activated");
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    scheduler.cancel(tabId);
    void options.removeTab?.(tabId);
  });

  return scheduler;
}
