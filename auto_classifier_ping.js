(function () {
  function notifyTabInbox() {
    try {
      chrome.runtime.sendMessage({ type: "page-seen" });
    } catch {
      // The background worker may be unavailable during extension reloads.
    }
  }

  function ensureWorkspaceTools() {
    try {
      globalThis.__tabInboxWorkspaceToolsMount?.();
    } catch {
      // The floating tools are non-critical and should never affect the page.
    }
  }

  notifyTabInbox();
  ensureWorkspaceTools();
  window.addEventListener("load", notifyTabInbox, { once: true });
  window.addEventListener("load", ensureWorkspaceTools, { once: true });
  setTimeout(notifyTabInbox, 1200);
  setTimeout(ensureWorkspaceTools, 500);
  setTimeout(ensureWorkspaceTools, 2000);
})();
