<p align="center">
  <img src="icons/icon-128.png" width="96" height="96" alt="Tab Inbox logo" />
</p>

<h1 align="center">Tab Inbox</h1>

<p align="center">
  A local-first Chrome extension dashboard for turning messy tabs into calm, grouped workspaces.
</p>

<p align="center">
  <a href="#english">English</a> · <a href="#简体中文">简体中文</a>
</p>

<p align="center">
  <img alt="Chrome MV3" src="https://img.shields.io/badge/Chrome-MV3-2f7d5b" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178c6" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-111827" />
</p>

## English

Tab Inbox replaces a tiny extension popup with a full-page command center for tab cleanup. It helps you scan open tabs, group related pages, save useful links for later, archive context, and keep a temporary workspace for the thing you are doing right now.

It is designed to be local-first: rule matching, grouping memory, dashboard state, saved items, and archives live in Chrome extension storage. AI grouping is optional and only runs after the user configures an OpenAI-compatible endpoint.

### Highlights

- Dashboard-first workflow opened from the Chrome extension icon.
- Local grouping with built-in categories, custom groups, user rules, and memory from manual moves.
- Review actions for closing, saving for later, archiving, keeping, skipping, and grouping tabs.
- Workspace tools for temporary focus groups and later lists.
- Optional AI organization through a user-provided OpenAI-compatible endpoint.
- Bilingual dashboard labels for English and Chinese.
- Manifest V3 service worker built with TypeScript and esbuild.

### Install from source

Requirements:

- Node.js 20 or newer.
- Chrome 120 or newer.

```sh
npm ci
npm run build
```

Then load the extension:

1. Open `chrome://extensions/`.
2. Enable Developer mode.
3. Click "Load unpacked".
4. Select this repository folder.
5. Click the Tab Inbox extension icon.

### Development

```sh
npm ci
npm run typecheck
npm run build
```

Create a local release package:

```sh
npm run package:extension
```

The package is written to `release/tab-inbox-extension-v<version>.zip` and contains only runtime extension files.

### Privacy and permissions

Tab Inbox works locally by default. It analyzes tab titles, URLs, domains, and tab group state in the browser, then stores dashboard data in Chrome extension storage.

AI organization is off by default. If enabled, candidate tab title/domain/URL metadata may be sent to the endpoint configured by the user. API keys are stored locally in the browser and are not exported with grouping configuration.

The extension declares `tabs`, `tabGroups`, `storage`, `alarms`, `scripting`, and ordinary `http://*/*` / `https://*/*` host access so it can read tab metadata, manage groups, persist local state, schedule debounce work, and inject workspace tools on normal web pages.

Read [PRIVACY.md](PRIVACY.md) for the full privacy and permissions notes.

### Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening an issue or pull request.

### License

MIT. See [LICENSE](LICENSE).

## 简体中文

Tab Inbox 是一个本地优先的 Chrome 标签页管理扩展。它不使用狭小的 popup，而是打开一个完整 Dashboard，帮助你扫描当前打开的标签页、合并相关页面、稍后处理有价值的链接、归档上下文，并为当前任务保留一个临时工作区。

它默认在浏览器本地运行：规则匹配、分组记忆、Dashboard 状态、稍后列表和归档数据都保存在 Chrome 扩展存储中。AI 分组是可选功能，只有在用户主动配置 OpenAI 兼容接口后才会启用。

### 亮点

- 点击扩展图标即可打开完整 Dashboard。
- 支持内置分类、自定义分组、用户规则和手动移动记忆。
- 支持关闭、稍后、归档、保留、跳过、分组等 Review 操作。
- 支持临时工作区、稍后列表和焦点分组。
- 可选 AI 自动整理，使用用户自己配置的 OpenAI 兼容接口。
- Dashboard 支持中文和英文界面文案。
- 基于 Chrome Manifest V3、TypeScript 和 esbuild 构建。

### 从源码安装

环境要求：

- Node.js 20 或更新版本。
- Chrome 120 或更新版本。

```sh
npm ci
npm run build
```

加载扩展：

1. 打开 `chrome://extensions/`。
2. 开启开发者模式。
3. 点击“加载已解压的扩展程序”。
4. 选择本仓库目录。
5. 点击浏览器工具栏里的 Tab Inbox 图标。

### 开发

```sh
npm ci
npm run typecheck
npm run build
```

生成本地发布包：

```sh
npm run package:extension
```

发布包会生成到 `release/tab-inbox-extension-v<version>.zip`，其中只包含扩展运行时需要的文件。

### 隐私与权限

Tab Inbox 默认在本地工作。它会在浏览器内分析标签页标题、URL、域名和标签组状态，并把 Dashboard 数据保存在 Chrome 扩展存储中。

AI 整理默认关闭。启用后，候选标签页的标题、域名和 URL 元数据可能会发送到用户自己配置的接口。API Key 保存在本地浏览器扩展存储中，不会随分组配置导出。

扩展声明了 `tabs`、`tabGroups`、`storage`、`alarms`、`scripting` 以及普通网页的 `http://*/*` / `https://*/*` 访问权限，用于读取标签页信息、管理标签组、保存本地状态、调度防抖任务，并在普通网页上注入工作区工具。

完整说明见 [PRIVACY.md](PRIVACY.md)。

### 参与贡献

欢迎提交 issue 或 pull request。开始前请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

### 许可证

本项目基于 MIT 协议开源，详见 [LICENSE](LICENSE)。
