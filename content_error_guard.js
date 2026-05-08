(function () {
  const TIMEOUT_RE = /请求超时|timeout|timed out/i;

  function getReasonMessage(reason) {
    if (!reason) return "";
    if (typeof reason === "string") return reason;
    if (reason.message) return String(reason.message);
    try {
      return JSON.stringify(reason);
    } catch {
      return "";
    }
  }

  function isSafeToHide(reason) {
    const message = getReasonMessage(reason);
    return TIMEOUT_RE.test(message) && (reason?.code === 500 || /"code"\s*:\s*500/.test(message));
  }

  window.addEventListener("unhandledrejection", (event) => {
    if (!isSafeToHide(event.reason)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    console.warn("[Tab Inbox] 已隐藏页面请求超时错误，避免把原始异常暴露给用户。", event.reason);
  }, true);
})();
