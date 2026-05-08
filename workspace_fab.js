(function () {
  const HOST_ID = "tab-inbox-workspace-tools";
  const POSITION_KEY = "tabInboxWorkspaceToolsPosition";
  const DEFAULT_POSITION = { x: 1, y: 0.5 };
  const EDGE_PADDING = 8;
  const RIGHT_EDGE_PADDING = 0;
  const RIGHT_EDGE_SNAP_DISTANCE = 96;
  const RIGHT_DOCK_X = 1;
  const PRIMARY_BUTTON_CENTER_OFFSET = 131;
  if (!/^https?:$/i.test(window.location.protocol)) return;

  function boot() {
    if (document.getElementById(HOST_ID)) return;
    if (document.body || document.documentElement) {
      mount();
      return;
    }
    setTimeout(boot, 50);
  }

  function mount() {
    if (document.getElementById(HOST_ID)) return;

    const host = document.createElement("div");
    host.id = HOST_ID;
    host.style.cssText = [
      "all: initial",
      "position: fixed",
      "inset: 0",
      "z-index: 2147483647",
      "display: block",
      "width: 100vw",
      "height: 100vh",
      'font-family: "Avenir Next", "PingFang SC", "Microsoft YaHei", sans-serif',
      "pointer-events: none",
      "overflow: visible",
      "isolation: isolate"
    ].join(";");
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host {
        all: initial;
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        z-index: 2147483647;
        display: block;
        font-family: "Avenir Next", "PingFang SC", "Microsoft YaHei", sans-serif;
        pointer-events: none;
        overflow: visible;
        isolation: isolate;
      }

      .rail {
        position: fixed;
        top: 50vh;
        right: 0;
        transform: translateY(-50%);
        display: block;
        width: 46px;
        height: 262px;
        min-width: 46px;
        padding: 0;
        border: 0;
        border-radius: 0;
        background: transparent;
        box-shadow: none;
        color: #0b579f;
        z-index: 1;
        pointer-events: auto;
        touch-action: none;
        will-change: left, top, right;
        overflow: visible;
        isolation: isolate;
      }

      .rail::before {
        display: none;
      }

      .rail > button {
        all: unset;
        position: absolute;
        right: 0;
        top: 108px;
        display: grid;
        place-items: center;
        width: 46px;
        height: 46px;
        border-radius: 50%;
        background: rgba(255, 255, 255, .94);
        color: #0b579f;
        z-index: 2;
        cursor: pointer;
        user-select: none;
        box-shadow:
          inset 0 0 0 1px rgba(12, 74, 134, .12),
          0 10px 24px rgba(4, 28, 52, .18);
        font-size: 15px;
        font-weight: 900;
        line-height: 1;
        transition: opacity .18s ease, transform .18s ease, box-shadow .18s ease, background .18s ease, color .18s ease, filter .18s ease;
      }

      .rail > button:hover,
      .rail > button:focus-visible {
        transform: scale(1.04);
        background: #fff;
        box-shadow:
          inset 0 0 0 1px rgba(12, 74, 134, .18),
          0 14px 30px rgba(4, 28, 52, .24);
      }

      .rail > button:focus-visible {
        outline: 3px solid rgba(41, 169, 225, .28);
        outline-offset: 4px;
      }

      .button-glyph {
        position: relative;
        display: grid;
        place-items: center;
        width: 21px;
        height: 21px;
        color: currentColor;
      }

      .button-glyph svg {
        display: block;
        width: 21px;
        height: 21px;
        stroke: currentColor;
        stroke-width: 2.15;
        stroke-linecap: round;
        stroke-linejoin: round;
        fill: none;
        overflow: visible;
      }

      .button-glyph .logo-tray {
        fill: #083f78;
        stroke: #083f78;
      }

      .button-glyph .logo-page {
        fill: #ffffff;
        stroke: #ffffff;
      }

      .button-glyph .logo-tab {
        fill: #42c4df;
        stroke: #42c4df;
      }

      .button-glyph .logo-arrow {
        stroke: #f2a31c;
      }

      .primary {
        width: 46px;
        height: 46px;
        background: rgba(255, 255, 255, .96);
        color: #0b579f;
        box-shadow:
          inset 0 0 0 1px rgba(8, 63, 120, .12),
          0 14px 32px rgba(4, 28, 52, .22);
      }

      .primary .button-glyph {
        width: 24px;
        height: 24px;
      }

      .primary .button-glyph svg {
        width: 24px;
        height: 24px;
        stroke-width: 2.5;
      }

      .primary.is-busy {
        opacity: .82;
        transform: scale(.98);
        cursor: progress;
      }

      .rail > button.secondary.is-busy {
        opacity: .72;
        cursor: progress;
      }

      .primary.is-success {
        background: #fff;
        box-shadow:
          inset 0 0 0 1px rgba(8, 63, 120, .12),
          0 14px 32px rgba(4, 28, 52, .22);
      }

      .rail > button.secondary {
        display: grid;
        opacity: 0;
        pointer-events: none;
        visibility: hidden;
        transform: translateX(18px) scale(.88);
      }

      .rail > button.summary-action {
        top: 54px;
      }

      .rail > button.organize-action {
        top: 0;
      }

      .rail > button.feedback-action {
        top: 162px;
      }

      .rail.is-expanded > button.secondary {
        display: grid;
        opacity: 1;
        pointer-events: auto;
        visibility: visible;
        transform: translateX(0) scale(1);
      }

      .badge {
        position: absolute;
        right: -4px;
        bottom: -3px;
        display: none;
        place-items: center;
        width: 20px;
        height: 20px;
        border: 2px solid rgba(255, 255, 255, .92);
        border-radius: 50%;
        background: #5bc44f;
        color: #fff;
        font-size: 12px;
        font-weight: 900;
        line-height: 1;
        box-shadow: 0 5px 12px rgba(43, 135, 50, .38);
      }

      .primary.is-success .badge {
        display: grid;
      }

      .panel {
        position: fixed;
        top: 50%;
        right: 96px;
        display: none;
        width: min(380px, calc(100vw - 112px));
        max-height: min(520px, calc(100vh - 48px));
        overflow: auto;
        padding: 14px;
        border: 1px solid rgba(255, 111, 158, .2);
        border-radius: 14px;
        background: rgba(255, 255, 255, .96);
        color: #17211c;
        box-shadow: 0 22px 60px rgba(38, 23, 28, .18);
        transform: translateY(-50%);
        pointer-events: auto;
        overscroll-behavior: contain;
        z-index: 2;
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
      }

      .panel.show {
        display: grid;
        gap: 10px;
      }

      .panel h3 {
        margin: 0;
        color: #17211c;
        font-size: 14px;
        font-weight: 900;
      }

      .panel p,
      .panel li {
        margin: 0;
        color: #5d6760;
        font-size: 12px;
        line-height: 1.55;
      }

      .panel ul {
        display: grid;
        gap: 6px;
        margin: 0;
        padding-left: 18px;
      }

      .plan-meta {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .plan-stats {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 6px;
      }

      .plan-stat {
        display: grid;
        gap: 2px;
        min-width: 0;
        padding: 8px;
        border: 1px solid #edf0ec;
        border-radius: 10px;
        background: #fbfcfa;
      }

      .plan-stat strong {
        color: #17211c;
        font-size: 14px;
        line-height: 1;
      }

      .plan-stat span {
        overflow: hidden;
        color: #5d6760;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 10px;
        font-weight: 800;
      }

      .plan-pill {
        display: inline-flex;
        align-items: center;
        min-height: 22px;
        padding: 0 8px;
        border-radius: 999px;
        background: #edf6f2;
        color: #236346;
        font-size: 11px;
        font-weight: 900;
      }

      .plan-list {
        display: grid;
        gap: 8px;
        margin: 2px 0;
      }

      .plan-quick-actions {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .plan-quick-actions button,
      .plan-feedback-btn,
      .workspace-candidate-enter {
        all: unset;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 24px;
        padding: 0 8px;
        border-radius: 7px;
        background: #eef3f6;
        color: #33424e;
        cursor: pointer;
        font-size: 11px;
        font-weight: 900;
      }

      .workspace-candidates {
        display: grid;
        gap: 8px;
      }

      .workspace-candidate {
        display: grid;
        gap: 8px;
        min-width: 0;
        padding: 12px;
        border: 1px solid rgba(31, 122, 69, .22);
        border-radius: 10px;
        background: linear-gradient(180deg, #fbfffc 0%, #f6fbf7 100%);
      }

      .workspace-candidate-head {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px;
        align-items: start;
      }

      .workspace-candidate-title {
        overflow: hidden;
        color: #17211c;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 13px;
        font-weight: 900;
      }

      .workspace-candidate-summary,
      .workspace-candidate-counts,
      .workspace-candidate-reason,
      .workspace-candidate-result {
        color: #5d6760;
        font-size: 11px;
        line-height: 1.45;
      }

      .workspace-candidate-counts {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .workspace-candidate-counts span {
        padding: 3px 6px;
        border-radius: 999px;
        background: #edf6f2;
        color: #236346;
        font-weight: 900;
      }

      .workspace-candidate-enter {
        min-height: 28px;
        padding: 0 10px;
        background: #1f7a45;
        color: #fff;
      }

      .workspace-candidate-enter:disabled,
      .plan-quick-actions button:disabled,
      .plan-feedback-btn:disabled {
        cursor: default;
        opacity: .55;
      }

      .workspace-candidate-pages {
        display: grid;
        gap: 6px;
        margin-top: 2px;
      }

      .workspace-candidate-page {
        display: grid;
        grid-template-columns: 18px minmax(0, 1fr);
        gap: 6px;
        align-items: start;
        min-width: 0;
        color: #33424e;
        font-size: 11px;
        line-height: 1.35;
      }

      .workspace-candidate-page input {
        width: 14px;
        height: 14px;
        margin: 1px 0 0;
        accent-color: #1f7a45;
      }

      .workspace-candidate-page span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .workspace-candidate details {
        min-width: 0;
      }

      .workspace-candidate summary {
        cursor: pointer;
        color: #236346;
        font-size: 11px;
        font-weight: 900;
        list-style-position: inside;
      }

      .plan-feedback-btn {
        margin-top: 6px;
      }

      .plan-resolution-actions {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-top: 8px;
      }

      .plan-feedback-btn.is-marked {
        background: #fff0f0;
        color: #c94b55;
      }

      .plan-context {
        display: grid;
        gap: 6px;
      }

      .plan-context-title {
        color: #17211c;
        font-size: 12px;
        font-weight: 900;
      }

      .plan-context-note {
        color: #5d6760;
        font-size: 11px;
        line-height: 1.4;
      }

      .plan-action {
        display: grid;
        grid-template-columns: 18px minmax(0, 1fr);
        gap: 8px;
        padding: 10px;
        border: 1px solid #edf0ec;
        border-radius: 10px;
        background: #fbfcfa;
      }

      .plan-action.is-danger {
        border-color: rgba(201, 75, 85, .28);
        background: #fff8f8;
      }

      .plan-action.is-muted {
        opacity: .78;
      }

      .plan-action.is-review {
        grid-template-columns: minmax(0, 1fr);
      }

      .plan-action input {
        width: 15px;
        height: 15px;
        margin: 2px 0 0;
        accent-color: #1f7a45;
      }

      .plan-action-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        color: #17211c;
        font-size: 12px;
        font-weight: 900;
        line-height: 1.35;
      }

      .plan-confidence {
        flex: 0 0 auto;
        color: #236346;
        font-size: 11px;
        font-weight: 900;
      }

      .plan-reason,
      .plan-tabs,
      .plan-error {
        margin-top: 4px;
        color: #5d6760;
        font-size: 11px;
        line-height: 1.45;
      }

      .plan-tabs {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .plan-error {
        color: #c94b55;
        font-weight: 800;
      }

      .panel textarea {
        width: 100%;
        min-height: 94px;
        resize: vertical;
        padding: 10px;
        border: 1px solid #ead7dc;
        border-radius: 10px;
        outline: none;
        color: #17211c;
        font: inherit;
        font-size: 13px;
        box-sizing: border-box;
      }

      .panel textarea:focus {
        border-color: #ff6f9e;
        box-shadow: 0 0 0 3px rgba(255, 111, 158, .16);
      }

      .panel-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }

      .panel-actions button {
        all: unset;
        position: static;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: auto;
        min-width: 54px;
        height: 32px;
        padding: 0 12px;
        border-radius: 8px;
        background: #17211c;
        color: #fff;
        cursor: pointer;
        box-shadow: none;
        font-size: 12px;
        font-weight: 800;
        line-height: 1;
      }

      .panel-actions button:first-child {
        background: #eef3f6;
        color: #33424e;
      }

      .panel-actions button.is-secondary {
        background: #eef3f6;
        color: #33424e;
      }

      .panel-actions button:hover,
      .panel-actions button:focus-visible {
        filter: brightness(.96);
      }

      .panel-actions button:disabled {
        cursor: default;
        opacity: .56;
      }

      .panel-actions button:focus-visible {
        outline: 3px solid rgba(41, 169, 225, .22);
        outline-offset: 2px;
      }

      .toast {
        position: fixed;
        top: 50%;
        right: 96px;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        max-width: min(220px, calc(100vw - 116px));
        padding: 9px 11px;
        border: 1px solid rgba(255, 255, 255, .5);
        border-radius: 999px;
        background: #17211c;
        color: #fff;
        box-shadow: 0 10px 26px rgba(23, 33, 28, .18);
        font-size: 12px;
        font-weight: 800;
        opacity: 0;
        pointer-events: none;
        transform: translate(8px, -50%);
        transition: opacity .18s ease, transform .18s ease;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .toast::before {
        content: "";
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: rgba(255, 255, 255, .18);
        color: #fff;
        font-size: 11px;
        line-height: 1;
      }

      .toast.success {
        background: #1f7a45;
        box-shadow: 0 12px 28px rgba(31, 122, 69, .24);
      }

      .toast.success::before {
        content: "✓";
      }

      .toast.error {
        background: #c94b55;
        box-shadow: 0 12px 28px rgba(201, 75, 85, .24);
      }

      .toast.error::before {
        content: "!";
      }

      .toast.show {
        opacity: 1;
        transform: translate(0, -50%);
      }
    `;

    const rail = document.createElement("div");
    rail.className = "rail";
    const organizeButton = makeButton("secondary organize-action", "organizeWindow", "整理窗口");
    const summaryButton = makeButton("secondary summary-action", "pageSummary", "总结该页面");
    const workspaceButton = makeButton("primary", "logoTray", "加入工作台");
    const feedbackButton = makeButton("secondary feedback-action", "feedback", "反馈");
    workspaceButton.appendChild(makeBadge());
    rail.append(organizeButton, summaryButton, workspaceButton, feedbackButton);

    const panel = document.createElement("div");
    panel.className = "panel";
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    shadow.append(style, rail, panel, toast);
    (document.body || document.documentElement).appendChild(host);

    let toastTimer = 0;
    let railPosition = readPosition();
    applyRailPosition();

    workspaceButton.addEventListener("mouseenter", () => rail.classList.add("is-expanded"));
    workspaceButton.addEventListener("focus", () => rail.classList.add("is-expanded"));
    rail.addEventListener("mouseleave", () => rail.classList.remove("is-expanded"));
    rail.addEventListener("focusout", (event) => {
      if (!event.relatedTarget || !rail.contains(event.relatedTarget)) {
        rail.classList.remove("is-expanded");
      }
    });

    function showToast(message, tone = "neutral") {
      toast.textContent = message;
      toast.classList.remove("success", "error");
      if (tone !== "neutral") toast.classList.add(tone);
      toast.classList.add("show");
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove("show"), 1500);
    }

    function showPanel(content) {
      toast.classList.remove("show");
      panel.replaceChildren(...content);
      rail.classList.add("is-open");
      panel.classList.add("show");
      positionFloatingSurface(panel);
    }

    function closePanel() {
      panel.classList.remove("show");
      rail.classList.remove("is-open");
    }

    shadow.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closePanel();
    });

    window.addEventListener("resize", () => {
      railPosition = clampPosition(railPosition);
      savePosition(railPosition);
      applyRailPosition();
      if (panel.classList.contains("show")) positionFloatingSurface(panel);
      if (toast.classList.contains("show")) positionFloatingSurface(toast);
    });

    installDragBehavior();

    workspaceButton.addEventListener("click", async () => {
      if (workspaceButton.classList.contains("is-busy")) return;
      workspaceButton.classList.add("is-busy");
      try {
        const response = await chrome.runtime.sendMessage({ type: "workspace:add-current-tab" });
        if (!response?.ok) throw new Error(response?.error || "加入失败");
        workspaceButton.classList.add("is-success");
        showToast(response.data?.alreadyExists ? "已在工作台" : "已加入工作台", "success");
        setTimeout(() => workspaceButton.classList.remove("is-success"), 1000);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "加入失败", "error");
      } finally {
        workspaceButton.classList.remove("is-busy");
      }
    });

    organizeButton.addEventListener("click", async () => {
      if (organizeButton.classList.contains("is-busy")) return;
      organizeButton.classList.add("is-busy");
      showLoadingPanel("正在整理窗口");
      try {
        const settingsResponse = await chrome.runtime.sendMessage({ type: "ai-settings:get" });
        if (!settingsResponse?.ok) throw new Error(settingsResponse?.error || "读取 AI 配置失败");
        if (!isAiSettingsReady(settingsResponse.data)) {
          showAiSetupRequiredPanel();
          return;
        }
        const response = await chrome.runtime.sendMessage({ type: "ai-window:analyze-current" });
        if (!response?.ok) throw new Error(response?.error || "整理失败");
        showAiWindowPlan(response.data);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "整理失败", "error");
        closePanel();
      } finally {
        organizeButton.classList.remove("is-busy");
      }
    });

    summaryButton.addEventListener("click", () => {
      const summary = summarizePage();
      const title = document.createElement("h3");
      title.textContent = "页面总结";
      const desc = document.createElement("p");
      desc.textContent = summary.description || summary.title || "没有抓取到明显摘要。";
      const list = document.createElement("ul");
      summary.points.forEach((point) => {
        const item = document.createElement("li");
        item.textContent = point;
        list.appendChild(item);
      });
      const actions = makePanelActions(closePanel);
      showPanel([title, desc, list, actions]);
    });

    function showLoadingPanel(message) {
      const title = document.createElement("h3");
      title.textContent = message;
      const desc = document.createElement("p");
      desc.textContent = "AI 正在识别这个窗口里的同语境工作台和可确认页面。";
      showPanel([title, desc]);
    }

    function isAiSettingsReady(settings) {
      return Boolean(
        settings &&
        settings.enabled &&
        String(settings.baseUrl || "").trim() &&
        String(settings.model || "").trim() &&
        String(settings.apiKey || "").trim()
      );
    }

    function showAiSetupRequiredPanel() {
      const title = document.createElement("h3");
      title.textContent = "需要先配置 AI";
      const desc = document.createElement("p");
      desc.textContent = "整理窗口依赖 AI 识别同一语境下的工作台。配置后，才能推荐一键进入工作台；未配置时只能查看本地重复页建议。";
      const actions = makePanelActions(closePanel);

      const localPreview = document.createElement("button");
      localPreview.type = "button";
      localPreview.className = "is-secondary";
      localPreview.textContent = "查看本地重复页";
      localPreview.addEventListener("click", async () => {
        if (localPreview.disabled) return;
        localPreview.disabled = true;
        showLoadingPanel("正在查看本地重复页");
        try {
          const response = await chrome.runtime.sendMessage({ type: "ai-window:local-preview" });
          if (!response?.ok) throw new Error(response?.error || "读取本地建议失败");
          showAiWindowPlan(response.data);
        } catch (error) {
          showToast(error instanceof Error ? error.message : "读取本地建议失败", "error");
          showAiSetupRequiredPanel();
        }
      });

      const openSettings = document.createElement("button");
      openSettings.type = "button";
      openSettings.textContent = "去配置 AI";
      openSettings.addEventListener("click", async () => {
        if (openSettings.disabled) return;
        openSettings.disabled = true;
        try {
          const response = await chrome.runtime.sendMessage({ type: "dashboard:open" });
          if (!response?.ok) throw new Error(response?.error || "打开配置失败");
          closePanel();
        } catch (error) {
          openSettings.disabled = false;
          showToast(error instanceof Error ? error.message : "打开配置失败", "error");
        }
      });

      actions.append(localPreview, openSettings);
      showPanel([title, desc, actions]);
    }

    function showAiWindowPlan(plan) {
      const tabs = Array.isArray(plan?.tabs) ? plan.tabs : [];
      const actionsData = Array.isArray(plan?.actions) ? plan.actions : [];
      const workspaceCandidates = Array.isArray(plan?.workspaceCandidates) ? plan.workspaceCandidates : [];
      const title = document.createElement("h3");
      title.textContent = "窗口整理";
      const desc = document.createElement("p");
      desc.textContent = plan?.summary || "已生成整理建议。";
      const meta = document.createElement("div");
      meta.className = "plan-meta";
      meta.append(makePill(`${tabs.length} 个页面`), makePill(`${workspaceCandidates.length} 个工作台建议`), makePill(`${actionsData.length} 条详情`));
      if (Number(plan?.totalTokens) > 0) meta.appendChild(makePill(`${plan.totalTokens} tokens`));
      const stats = makePlanStats(actionsData);
      const appliedSummary = makeAppliedSummary(plan?.appliedSummary);
      const candidateSection = makeWorkspaceCandidates(plan, workspaceCandidates, tabs);

      const quickActions = document.createElement("div");
      quickActions.className = "plan-quick-actions";
      const duplicateOnly = makeQuickButton("仅关闭重复");
      const workspaceOnly = makeQuickButton("加入当前任务");
      const clearAll = makeQuickButton("全部取消");
      quickActions.append(duplicateOnly, workspaceOnly, clearAll);

      const list = document.createElement("div");
      list.className = "plan-list";
      const selectableKinds = new Set(["workspace", "later", "close_duplicate", "group"]);
      const grouped = groupPlanActions(plan, actionsData);
      grouped.forEach((context) => {
        const contextEl = document.createElement("div");
        contextEl.className = "plan-context";
        const contextTitle = document.createElement("div");
        contextTitle.className = "plan-context-title";
        contextTitle.textContent = context.title;
        contextEl.appendChild(contextTitle);
        if (context.description) {
          const note = document.createElement("div");
          note.className = "plan-context-note";
          note.textContent = context.description;
          contextEl.appendChild(note);
        }
        context.actions.forEach((action) => {
          const isManualReview = action.kind === "needs_review";
          const row = document.createElement("div");
          row.className = "plan-action";
          if (action.kind === "close_duplicate") row.classList.add("is-danger");
          if (isManualReview) row.classList.add("is-review");
          if (!selectableKinds.has(action.kind) && !isManualReview) row.classList.add("is-muted");

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.value = action.id || "";
          checkbox.dataset.kind = action.kind || "";
          checkbox.disabled = isManualReview || !selectableKinds.has(action.kind) || Boolean(action.appliedAt);
          checkbox.checked = selectableKinds.has(action.kind) && !action.appliedAt && !action.error;
          if (isManualReview) checkbox.hidden = true;

          const body = document.createElement("div");
          const head = document.createElement("div");
          head.className = "plan-action-title";
          const actionTitle = document.createElement("span");
          actionTitle.textContent = `${actionKindLabel(action.kind)} · ${action.title || "建议"}`;
          const confidence = document.createElement("span");
          confidence.className = "plan-confidence";
          confidence.textContent = `${Math.round(Number(action.confidence || 0) * 100)}%`;
          head.append(actionTitle, confidence);

          const reason = document.createElement("div");
          reason.className = "plan-reason";
          reason.textContent = action.reason || "等待确认。";
          const tabLine = document.createElement("div");
          tabLine.className = "plan-tabs";
          tabLine.textContent = actionTabSummary(action, tabs);
          body.append(head, reason, tabLine);
          if (action.error) {
            const error = document.createElement("div");
            error.className = "plan-error";
            error.textContent = action.error;
            body.appendChild(error);
          }
          if (isManualReview) {
            body.appendChild(makeResolutionActions(plan, action));
          }
          const feedback = document.createElement("button");
          feedback.type = "button";
          feedback.className = "plan-feedback-btn";
          if (action.feedbackStatus) feedback.classList.add("is-marked");
          feedback.textContent = action.feedbackStatus ? "已标记不准" : "不准";
          feedback.disabled = Boolean(action.feedbackStatus);
          feedback.addEventListener("click", async () => {
            if (feedback.disabled) return;
            feedback.disabled = true;
            try {
              const response = await chrome.runtime.sendMessage({
                type: "ai-window:feedback",
                planId: plan.id,
                actionId: action.id,
                feedback: { message: "胶囊浮层标记不准" }
              });
              if (!response?.ok) throw new Error(response?.error || "反馈失败");
              showToast("反馈已记录", "success");
              showAiWindowPlan(response.data);
            } catch (error) {
              feedback.disabled = false;
              showToast(error instanceof Error ? error.message : "反馈失败", "error");
            }
          });
          body.appendChild(feedback);
          row.append(checkbox, body);
          contextEl.appendChild(row);
        });
        list.appendChild(contextEl);
      });
      if (!actionsData.length) {
        const empty = document.createElement("p");
        empty.textContent = "没有生成可执行建议。";
        list.appendChild(empty);
      }

      const actions = makePanelActions(closePanel);
      const apply = document.createElement("button");
      apply.type = "button";
      apply.textContent = "应用选中";
      apply.disabled = !list.querySelector('input[type="checkbox"]:checked');
      duplicateOnly.addEventListener("click", () => selectPlanActions(list, (kind) => kind === "close_duplicate", apply));
      workspaceOnly.addEventListener("click", () => selectPlanActions(list, (kind) => kind === "workspace", apply));
      clearAll.addEventListener("click", () => selectPlanActions(list, () => false, apply));
      list.addEventListener("change", () => {
        apply.disabled = !list.querySelector('input[type="checkbox"]:checked');
      });
      apply.addEventListener("click", async () => {
        const actionIds = Array.from(list.querySelectorAll('input[type="checkbox"]:checked'))
          .map((input) => input.value)
          .filter(Boolean);
        if (!actionIds.length) return;
        const selected = actionsData.filter((action) => actionIds.includes(action.id));
        const closeCount = selected
          .filter((action) => action.kind === "close_duplicate")
          .reduce((sum, action) => sum + (Array.isArray(action.tabIds) ? action.tabIds.length : 0), 0);
        if (closeCount && !confirm(`将关闭 ${closeCount} 个重复标签页，继续吗？`)) return;
        apply.disabled = true;
        apply.textContent = "应用中";
        try {
          const response = await chrome.runtime.sendMessage({
            type: "ai-window:apply",
            planId: plan.id,
            actionIds
          });
          if (!response?.ok) throw new Error(response?.error || "应用失败");
          showToast("整理动作已应用", "success");
          showAiWindowPlan(response.data);
        } catch (error) {
          showToast(error instanceof Error ? error.message : "应用失败", "error");
          apply.disabled = false;
          apply.textContent = "应用选中";
        }
      });
      actions.appendChild(apply);
      const content = [title, desc, meta];
      if (candidateSection) content.push(candidateSection);
      content.push(stats, quickActions);
      if (appliedSummary) content.push(appliedSummary);
      content.push(list, actions);
      showPanel(content);
    }

    function makePill(text) {
      const pill = document.createElement("span");
      pill.className = "plan-pill";
      pill.textContent = text;
      return pill;
    }

    function makePlanStats(actionsData) {
      const stats = document.createElement("div");
      stats.className = "plan-stats";
      stats.append(
        makeStat("当前任务", countActionTabs(actionsData, "workspace")),
        makeStat("可稍后", countActionTabs(actionsData, "later")),
        makeStat("重复", countActionTabs(actionsData, "close_duplicate")),
        makeStat("需确认", countActionTabs(actionsData, "needs_review"))
      );
      return stats;
    }

    function makeStat(label, count) {
      const stat = document.createElement("div");
      stat.className = "plan-stat";
      const strong = document.createElement("strong");
      strong.textContent = String(count);
      const span = document.createElement("span");
      span.textContent = label;
      stat.append(strong, span);
      return stat;
    }

    function makeAppliedSummary(summary) {
      if (!summary) return null;
      const node = document.createElement("p");
      node.textContent = `已执行：工作台 ${summary.workspace || 0}，稍后 ${summary.later || 0}，关闭重复 ${summary.closeDuplicate || 0}，失败 ${summary.failed || 0}`;
      return node;
    }

    function makeWorkspaceCandidates(plan, candidates, tabs) {
      if (!candidates.length) return null;
      const wrap = document.createElement("div");
      wrap.className = "workspace-candidates";
      candidates.forEach((candidate) => {
        const card = document.createElement("article");
        card.className = "workspace-candidate";
        const head = document.createElement("div");
        head.className = "workspace-candidate-head";
        const titleWrap = document.createElement("div");
        const cardTitle = document.createElement("div");
        cardTitle.className = "workspace-candidate-title";
        cardTitle.textContent = candidate.title || "当前任务工作台";
        const summary = document.createElement("div");
        summary.className = "workspace-candidate-summary";
        summary.textContent = candidate.summary || "建议作为同一任务语境继续处理。";
        titleWrap.append(cardTitle, summary);
        const enter = document.createElement("button");
        enter.type = "button";
        enter.className = "workspace-candidate-enter";
        enter.textContent = candidate.appliedAt ? "已进入" : "进入工作台";
        enter.disabled = Boolean(candidate.appliedAt);
        head.append(titleWrap, enter);

        const counts = document.createElement("div");
        counts.className = "workspace-candidate-counts";
        counts.append(
          makeCandidateCount(`建议加入 ${safeArray(candidate.tabIds).length}`),
          makeCandidateCount(`需确认 ${safeArray(candidate.reviewTabIds).length}`),
          makeCandidateCount(`已排除 ${safeArray(candidate.excludedTabIds).length}`),
          makeCandidateCount(`${Math.round(Number(candidate.confidence || 0) * 100)}%`)
        );

        const result = document.createElement("div");
        result.className = "workspace-candidate-result";
        if (candidate.appliedSummary) {
          result.textContent = `结果：加入 ${candidate.appliedSummary.workspace || 0}，跳过 ${candidate.appliedSummary.skipped || 0}，失败 ${candidate.appliedSummary.failed || 0}`;
        } else if (candidate.error) {
          result.classList.add("plan-error");
          result.textContent = candidate.error;
        }

        const details = document.createElement("details");
        const detailTitle = document.createElement("summary");
        detailTitle.textContent = "页面明细";
        const pages = document.createElement("div");
        pages.className = "workspace-candidate-pages";
        const tabMap = new Map(tabs.map((tab) => [tab.tabId, tab]));
        appendCandidatePages(pages, candidate.tabIds, tabMap, "recommended", true, candidate.appliedAt);
        appendCandidatePages(pages, candidate.reviewTabIds, tabMap, "review", false, candidate.appliedAt);
        if (safeArray(candidate.excludedTabIds).length) {
          const excluded = document.createElement("div");
          excluded.className = "workspace-candidate-reason";
          excluded.textContent = `已排除：${candidateTabTitles(candidate.excludedTabIds, tabs)}`;
          pages.appendChild(excluded);
        }
        const reason = document.createElement("div");
        reason.className = "workspace-candidate-reason";
        reason.textContent = candidate.reason || "这些页面看起来属于同一个可继续处理的任务。";
        pages.appendChild(reason);
        details.append(detailTitle, pages);

        enter.addEventListener("click", async () => {
          if (enter.disabled) return;
          const selectedTabIds = Array.from(card.querySelectorAll(".workspace-candidate-page input:checked"))
            .map((input) => Number(input.value))
            .filter((tabId) => Number.isInteger(tabId));
          if (!selectedTabIds.length) {
            showToast("至少选择一个页面", "error");
            return;
          }
          enter.disabled = true;
          enter.textContent = "进入中";
          try {
            const response = await chrome.runtime.sendMessage({
              type: "ai-window:enter-workspace",
              planId: plan.id,
              candidateId: candidate.id,
              selectedTabIds
            });
            if (!response?.ok) throw new Error(response?.error || "进入工作台失败");
            showToast("已进入工作台", "success");
            showAiWindowPlan(response.data);
          } catch (error) {
            enter.disabled = false;
            enter.textContent = "进入工作台";
            showToast(error instanceof Error ? error.message : "进入工作台失败", "error");
          }
        });

        card.append(head, counts);
        if (result.textContent) card.appendChild(result);
        card.appendChild(details);
        wrap.appendChild(card);
      });
      return wrap;
    }

    function makeCandidateCount(text) {
      const node = document.createElement("span");
      node.textContent = text;
      return node;
    }

    function appendCandidatePages(parent, tabIds, tabMap, mode, checked, disabled) {
      safeArray(tabIds).forEach((tabId) => {
        const tab = tabMap.get(tabId);
        if (!tab) return;
        const label = document.createElement("label");
        label.className = "workspace-candidate-page";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = String(tabId);
        checkbox.checked = checked;
        checkbox.disabled = Boolean(disabled);
        const text = document.createElement("span");
        text.textContent = `${mode === "review" ? "需确认 · " : ""}${tab.title || tab.domain || tab.url}`;
        label.append(checkbox, text);
        parent.appendChild(label);
      });
    }

    function candidateTabTitles(tabIds, tabs) {
      const ids = new Set(safeArray(tabIds));
      const titles = tabs
        .filter((tab) => ids.has(tab.tabId))
        .map((tab) => tab.title || tab.domain || tab.url)
        .slice(0, 3);
      const rest = Math.max(0, ids.size - titles.length);
      return `${titles.join(" / ")}${rest ? ` 等 ${rest} 个` : ""}`;
    }

    function safeArray(value) {
      return Array.isArray(value) ? value : [];
    }

    function countActionTabs(actionsData, kind) {
      return actionsData
        .filter((action) => action.kind === kind)
        .reduce((sum, action) => sum + (Array.isArray(action.tabIds) ? action.tabIds.length : 0), 0);
    }

    function makeQuickButton(text) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = text;
      return button;
    }

    function makeResolutionActions(plan, action) {
      const wrap = document.createElement("div");
      wrap.className = "plan-resolution-actions";
      const options = [
        ["workspace", "加入工作台"],
        ["later", "稍后处理"],
        ["keep", "保留"]
      ];
      options.forEach(([resolution, label]) => {
        const button = makeQuickButton(action.resolvedAs === resolution ? `已${label}` : label);
        button.disabled = Boolean(action.appliedAt || action.resolvedAs);
        button.addEventListener("click", async () => {
          if (button.disabled) return;
          button.disabled = true;
          try {
            const response = await chrome.runtime.sendMessage({
              type: "ai-window:resolve-action",
              planId: plan.id,
              actionId: action.id,
              resolution
            });
            if (!response?.ok) throw new Error(response?.error || "处理失败");
            showToast("已处理需确认项", "success");
            showAiWindowPlan(response.data);
          } catch (error) {
            button.disabled = false;
            showToast(error instanceof Error ? error.message : "处理失败", "error");
          }
        });
        wrap.appendChild(button);
      });
      return wrap;
    }

    function selectPlanActions(list, predicate, applyButton) {
      list.querySelectorAll('input[type="checkbox"]').forEach((input) => {
        input.checked = !input.disabled && predicate(input.dataset.kind || "");
      });
      applyButton.disabled = !list.querySelector('input[type="checkbox"]:checked');
    }

    function groupPlanActions(plan, actionsData) {
      const contexts = Array.isArray(plan?.contexts) ? plan.contexts : [];
      const byContext = new Map(contexts.map((context) => [context.id, { ...context, actions: [] }]));
      const fallback = { id: "ctx_other", title: "其他建议", description: "", actions: [] };
      actionsData.forEach((action) => {
        const target = byContext.get(action.contextId) || fallback;
        target.actions.push(action);
      });
      return [...byContext.values(), fallback].filter((context) => context.actions.length);
    }

    function actionKindLabel(kind) {
      const labels = {
        workspace: "工作台",
        later: "稍后",
        close_duplicate: "关闭重复",
        keep: "保留",
        group: "分组",
        needs_review: "需确认"
      };
      return labels[kind] || "建议";
    }

    function actionTabSummary(action, tabs) {
      const ids = new Set(Array.isArray(action.tabIds) ? action.tabIds : []);
      const titles = tabs
        .filter((tab) => ids.has(tab.tabId))
        .map((tab) => tab.title || tab.domain || tab.url)
        .slice(0, 3);
      const rest = Math.max(0, ids.size - titles.length);
      return `${ids.size} 个页面：${titles.join(" / ")}${rest ? ` 等 ${rest} 个` : ""}`;
    }

    feedbackButton.addEventListener("click", () => showFeedbackPanel("反馈"));

    function showFeedbackPanel(titleText) {
      const title = document.createElement("h3");
      title.textContent = titleText;
      const hint = document.createElement("p");
      hint.textContent = "写下你对当前页面、分类或工作台动作的反馈。";
      const textarea = document.createElement("textarea");
      textarea.placeholder = "例如：这个页面不应该进入工作台...";
      const actions = makePanelActions(closePanel);
      const submit = document.createElement("button");
      submit.type = "button";
      submit.textContent = "提交";
      submit.addEventListener("click", async () => {
        const message = textarea.value.trim();
        if (!message) {
          showToast("先写一点反馈", "error");
          return;
        }
        if (submit.disabled) return;
        submit.disabled = true;
        submit.textContent = "提交中";
        try {
          const response = await chrome.runtime.sendMessage({
            type: "feedback:quick",
            feedback: {
              kind: titleText,
              message,
              url: window.location.href,
              title: document.title,
              createdAt: Date.now()
            }
          });
          if (!response?.ok) throw new Error(response?.error || "反馈保存失败");
          closePanel();
          showToast("反馈已保存", "success");
        } catch (error) {
          showToast(error instanceof Error ? error.message : "反馈保存失败", "error");
        } finally {
          submit.disabled = false;
          submit.textContent = "提交";
        }
      });
      actions.appendChild(submit);
      showPanel([title, hint, textarea, actions]);
      textarea.focus();
    }

    function installDragBehavior() {
      let drag = null;
      const dragEvents = {
        capture: true
      };

      rail.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || event.target.closest(".secondary")) return;
        drag = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          moved: false
        };
        window.addEventListener("pointermove", handleDragMove, dragEvents);
        window.addEventListener("pointerup", handleDragEnd, dragEvents);
        window.addEventListener("pointercancel", handleDragCancel, dragEvents);
      });

      function handleDragMove(event) {
        if (!drag || event.pointerId !== drag.pointerId) return;
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        if (!drag.moved && Math.hypot(dx, dy) < 4) return;
        drag.moved = true;
        try {
          rail.setPointerCapture(event.pointerId);
        } catch {
          // The pointer may have already been released on fast clicks.
        }
        closePanel();
        toast.classList.remove("show");
        railPosition = clampPosition({
          x: event.clientX / Math.max(1, window.innerWidth),
          y: event.clientY / Math.max(1, window.innerHeight)
        });
        applyRailPosition();
        event.preventDefault();
      }

      function handleDragEnd(event) {
        if (!drag || event.pointerId !== drag.pointerId) return;
        if (drag.moved) {
          railPosition = snapPosition(railPosition);
          applyRailPosition();
          savePosition(railPosition);
          const suppressUntil = Date.now() + 250;
          for (const button of [workspaceButton, organizeButton, summaryButton, feedbackButton]) {
            button.dataset.suppressClickUntil = String(suppressUntil);
          }
        }
        try {
          rail.releasePointerCapture(event.pointerId);
        } catch {
          // No capture was set for normal clicks.
        }
        cleanupDrag();
      }

      function handleDragCancel() {
        cleanupDrag();
      }

      function cleanupDrag() {
        window.removeEventListener("pointermove", handleDragMove, dragEvents);
        window.removeEventListener("pointerup", handleDragEnd, dragEvents);
        window.removeEventListener("pointercancel", handleDragCancel, dragEvents);
        drag = null;
      }
    }

    function applyRailPosition() {
      const rect = rail.getBoundingClientRect();
      const y = railPosition.y * window.innerHeight;
      const top = Math.round(Math.min(window.innerHeight - rect.height - EDGE_PADDING, Math.max(EDGE_PADDING, y - PRIMARY_BUTTON_CENTER_OFFSET)));
      rail.style.top = `${top}px`;
      rail.style.transform = "none";
      if (isRightDocked(railPosition)) {
        rail.style.left = "auto";
        rail.style.right = `${RIGHT_EDGE_PADDING}px`;
        return;
      }
      const x = railPosition.x * window.innerWidth;
      const left = Math.round(Math.min(window.innerWidth - rect.width - EDGE_PADDING, Math.max(EDGE_PADDING, x - rect.width / 2)));
      rail.style.left = `${left}px`;
      rail.style.right = "auto";
    }

    function positionFloatingSurface(surface) {
      const railRect = rail.getBoundingClientRect();
      const gap = 10;
      const desiredRight = window.innerWidth - railRect.left + gap;
      const fallbackLeft = railRect.right + gap;
      const useLeftSide = railRect.left > window.innerWidth / 2;
      surface.style.top = `${Math.round(railRect.top + PRIMARY_BUTTON_CENTER_OFFSET)}px`;
      if (useLeftSide) {
        surface.style.right = `${Math.max(gap, desiredRight)}px`;
        surface.style.left = "auto";
        surface.style.transform = "translate(8px, -50%)";
      } else {
        surface.style.left = `${Math.min(window.innerWidth - gap, fallbackLeft)}px`;
        surface.style.right = "auto";
        surface.style.transform = "translate(-8px, -50%)";
      }
    }

    function readPosition() {
      try {
        const stored = JSON.parse(localStorage.getItem(POSITION_KEY) || "null");
        if (stored && Number.isFinite(stored.x) && Number.isFinite(stored.y)) {
          return snapPosition(stored);
        }
      } catch {
        // Ignore broken localStorage values.
      }
      return snapPosition({ ...DEFAULT_POSITION });
    }

    function savePosition(position) {
      try {
        localStorage.setItem(POSITION_KEY, JSON.stringify(position));
      } catch {
        // Some pages disable localStorage for content scripts.
      }
    }

    function clampPosition(position) {
      const xPadding = 32 / Math.max(1, window.innerWidth);
      const yPadding = 32 / Math.max(1, window.innerHeight);
      return {
        x: Math.min(1, Math.max(xPadding, position.x)),
        y: Math.min(1 - yPadding, Math.max(yPadding, position.y))
      };
    }

    function snapPosition(position) {
      const clamped = clampPosition(position);
      const rect = rail.getBoundingClientRect();
      const railWidth = rect.width || 54;
      const centerX = clamped.x * Math.max(1, window.innerWidth);
      const rightGap = window.innerWidth - (centerX + railWidth / 2);
      if (rightGap <= RIGHT_EDGE_SNAP_DISTANCE) return { ...clamped, x: RIGHT_DOCK_X };
      return clamped;
    }

    function isRightDocked(position) {
      return position.x === RIGHT_DOCK_X;
    }
  }

  function makeButton(className, iconName, title) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    const icon = document.createElement("span");
    icon.className = "button-glyph";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = getIconMarkup(iconName);
    button.appendChild(icon);
    button.title = title;
    button.setAttribute("aria-label", title);
    button.addEventListener("click", (event) => {
      const until = Number(button.dataset.suppressClickUntil || 0);
      if (until && Date.now() < until) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    }, { capture: true });
    return button;
  }

  function getIconMarkup(name) {
    const icons = {
      organizeWindow: `
        <svg viewBox="0 0 32 32">
          <path d="M7 8h18"></path>
          <path d="M7 16h12"></path>
          <path d="M7 24h8"></path>
          <path d="M24 14l.9 2.1L27 17l-2.1.9L24 20l-.9-2.1L21 17l2.1-.9L24 14z"></path>
          <path d="M22 22l.6 1.4L24 24l-1.4.6L22 26l-.6-1.4L20 24l1.4-.6L22 22z"></path>
        </svg>
      `,
      pageSummary: `
        <svg viewBox="0 0 32 32">
          <path d="M9 5h11l5 5v17H9V5z"></path>
          <path d="M20 5v6h5"></path>
          <path d="M13 16h10"></path>
          <path d="M13 21h7"></path>
          <path d="M26 15l.8 2.1L29 18l-2.2.9L26 21l-.9-2.1L23 18l2.1-.9L26 15z"></path>
        </svg>
      `,
      sparkA: `
        <svg viewBox="0 0 32 32">
          <path d="M13.5 23.5l5-14 5 14"></path>
          <path d="M16 17.5h5.5"></path>
          <path d="M7 5l1.5 4L12.5 11l-4 1.5L7 16.5l-1.5-4L1.5 11l4-2L7 5z"></path>
          <path d="M25.5 4.5l.9 2.2 2.1.8-2.1.8-.9 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z"></path>
        </svg>
      `,
      logoTray: `
        <svg viewBox="0 0 36 36">
          <path class="logo-tab" d="M10 8h16a2 2 0 0 1 2 2v4H8v-4a2 2 0 0 1 2-2z"></path>
          <path class="logo-tray" d="M6 16h24l3 11a3 3 0 0 1-3 4H6a3 3 0 0 1-3-4l3-11z"></path>
          <path class="logo-page" d="M9 14h18l2 9H7l2-9z"></path>
          <path class="logo-arrow" d="M18 16v9"></path>
          <path class="logo-arrow" d="M14 21l4 4 4-4"></path>
        </svg>
      `,
      feedback: `
        <svg viewBox="0 0 32 32">
          <path d="M7 8h18a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H14l-6 5v-5H7a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3z"></path>
          <path d="M11 14h10"></path>
          <path d="M11 18h6"></path>
        </svg>
      `,
      issueReport: `
        <svg viewBox="0 0 32 32">
          <path d="M16 5l12 21H4L16 5z"></path>
          <path d="M16 13v6"></path>
          <path d="M16 23h.01"></path>
        </svg>
      `,
      close: `
        <svg viewBox="0 0 24 24">
          <path d="M6 6l12 12"></path>
          <path d="M18 6L6 18"></path>
        </svg>
      `
    };
    return icons[name] || icons.logoTray;
  }

  function makeBadge() {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "✓";
    badge.setAttribute("aria-hidden", "true");
    return badge;
  }

  function makePanelActions(onClose) {
    const actions = document.createElement("div");
    actions.className = "panel-actions";
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "关闭";
    close.addEventListener("click", onClose);
    actions.appendChild(close);
    return actions;
  }

  function summarizePage() {
    const metaDescription = document.querySelector('meta[name="description"], meta[property="og:description"]')?.content || "";
    const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
      .map((node) => node.textContent?.replace(/\s+/g, " ").trim() || "")
      .filter(Boolean)
      .slice(0, 5);
    const paragraphs = Array.from(document.querySelectorAll("article p, main p, p"))
      .map((node) => node.textContent?.replace(/\s+/g, " ").trim() || "")
      .filter((text) => text.length >= 40)
      .slice(0, 2);
    return {
      title: document.title,
      description: metaDescription,
      points: [...headings, ...paragraphs].slice(0, 6)
    };
  }

  globalThis.__tabInboxWorkspaceToolsMount = boot;
  boot();
  document.addEventListener("DOMContentLoaded", boot, { once: true });
  window.addEventListener("load", boot, { once: true });
  setTimeout(boot, 500);
  setTimeout(boot, 2000);
})();
