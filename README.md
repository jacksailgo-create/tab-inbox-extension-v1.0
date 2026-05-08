# Tab Inbox

Tab Inbox is a local-first Chrome extension dashboard for cleaning up messy browser tabs. It opens a full-page dashboard instead of a tiny popup, then helps you close, save, archive, and group tabs with local rules, memory, and optional AI assistance.

## Features

- Full-page dashboard opened from the Chrome extension icon.
- Local tab grouping with built-in categories, custom groups, user rules, and memory from manual moves.
- Review actions for closing, saving for later, archiving, keeping, skipping, and grouping tabs.
- Workspace tools for temporary focus groups and later lists.
- Optional AI organization through a user-provided OpenAI-compatible endpoint.
- Bilingual dashboard labels for Chinese and English.
- Local-first storage using Chrome extension storage.

## Privacy at a glance

Tab Inbox works locally by default. It analyzes tab titles, URLs, domains, and tab group state in the browser, and stores dashboard data in Chrome extension storage.

AI organization is off by default. If enabled, candidate tab title/domain/URL metadata may be sent to the OpenAI-compatible endpoint configured by the user. API keys are stored locally in the browser and are not exported with grouping configuration.

See [PRIVACY.md](PRIVACY.md) for the full privacy and permissions notes.

## Chrome permissions

The extension currently declares:

- `tabs`: read tab metadata and perform user-triggered tab actions.
- `tabGroups`: create, update, merge, and move Chrome tab groups.
- `storage`: persist settings, saved items, archives, rules, memory, AI settings, and logs.
- `alarms`: debounce and schedule background organization work.
- `scripting`: inject the floating workspace button into ordinary web pages.
- `http://*/*` and `https://*/*` host access: run content scripts and workspace tools on normal web pages.

Restricted Chrome pages are skipped by the extension.

## Development

Requirements:

- Node.js 20 or newer.
- Chrome 120 or newer is the build target.

Install dependencies:

```sh
npm ci
```

Run checks:

```sh
npm run typecheck
```

Build the extension service worker:

```sh
npm run build
```

## Load unpacked extension

1. Run `npm run build`.
2. Open `chrome://extensions/`.
3. Enable Developer mode.
4. Click "Load unpacked".
5. Select this repository folder.
6. Click the Tab Inbox extension icon.

## Package a release zip

Create a Chrome extension zip:

```sh
npm run package:extension
```

The command builds the service worker, stages only runtime files, and writes the package to `release/tab-inbox-extension-v<version>.zip`.

The package includes:

- `manifest.json`
- `dashboard.html`, `dashboard.css`, `dashboard.js`
- `content_error_guard.js`, `auto_classifier_ping.js`, `workspace_fab.js`
- `icons/`
- `dist/background/serviceWorker.js`

It excludes source files, tests, docs, `node_modules`, local archives, and local environment files.

The packaging script uses the system `zip` command.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development and pull request guidelines.

## License

MIT. See [LICENSE](LICENSE).
