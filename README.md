<p align="center">
  <img src="icons/icon-128.png" width="96" height="96" alt="Tab Inbox logo" />
</p>

<h1 align="center">Tab Inbox</h1>

<p align="center">
  A local-first Chrome extension dashboard for turning messy tabs into calm, grouped workspaces.
</p>

<p align="center">
  <strong>English</strong> · <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <img alt="Chrome MV3" src="https://img.shields.io/badge/Chrome-MV3-2f7d5b" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178c6" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-111827" />
</p>

<p align="center">
  <img src="assets/tab-inbox-ai-workspace.png" alt="Tab Inbox AI automatic classification and automated workspace overview" />
</p>

## What is Tab Inbox?

Tab Inbox replaces a tiny extension popup with a full-page command center for tab cleanup. It helps you scan open tabs, group related pages, save useful links for later, archive context, and keep a temporary workspace for the thing you are doing right now.

It is designed to be local-first: rule matching, grouping memory, dashboard state, saved items, and archives live in Chrome extension storage. AI grouping is optional and only runs after the user configures an OpenAI-compatible endpoint.

## Core automation

Tab Inbox can use AI-assisted automation to classify unknown tabs, suggest safe grouping actions, and keep reviewable history before any reusable rules are created. Its automated workspace flow collects pages from the same task context, surfaces uncertain pages for review, and lets you enter a focused workbench without turning temporary organization into permanent rules.

## Highlights

- Dashboard-first workflow opened from the Chrome extension icon.
- Local grouping with built-in categories, custom groups, user rules, and memory from manual moves.
- Review actions for closing, saving for later, archiving, keeping, skipping, and grouping tabs.
- Workspace tools for temporary focus groups and later lists.
- Optional AI organization through a user-provided OpenAI-compatible endpoint.
- Bilingual dashboard labels for English and Chinese.
- Manifest V3 service worker built with TypeScript and esbuild.

## Install from source

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

## Development

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

## Privacy and permissions

Tab Inbox works locally by default. It analyzes tab titles, URLs, domains, and tab group state in the browser, then stores dashboard data in Chrome extension storage.

AI organization is off by default. If enabled, candidate tab title/domain/URL metadata may be sent to the endpoint configured by the user. API keys are stored locally in the browser and are not exported with grouping configuration.

The extension declares `tabs`, `tabGroups`, `storage`, `alarms`, `scripting`, and ordinary `http://*/*` / `https://*/*` host access so it can read tab metadata, manage groups, persist local state, schedule debounce work, and inject workspace tools on normal web pages.

Read [PRIVACY.md](PRIVACY.md) for the full privacy and permissions notes.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening an issue or pull request.

## License

MIT. See [LICENSE](LICENSE).
