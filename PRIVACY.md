# Privacy

Tab Inbox is designed as a local-first Chrome extension for organizing browser tabs.

## Default behavior

By default, Tab Inbox analyzes tab titles, URLs, domains, and Chrome tab group state locally in the browser. It does not upload browsing data to a server controlled by this project.

Local extension data is stored with Chrome extension storage:

- Saved/later items, archives, custom groups, AI suggestions, action logs, and API settings use `chrome.storage.local`.
- General automation settings use `chrome.storage.sync`.

Data remains in the browser profile until the user clears extension data, removes the extension, or deletes items through the dashboard.

## Optional AI features

AI organization is off by default.

If a user enables AI organization and provides an OpenAI-compatible endpoint, model, and API key, Tab Inbox may send candidate tab metadata to that configured endpoint:

- Tab title.
- Domain.
- URL.
- Existing user and system category names needed for classification.

Tab Inbox does not intentionally read full page bodies for AI classification. AI results can create local suggestions or high-confidence local rules, depending on user settings and confidence thresholds.

The API key is stored in local browser extension storage. It is not exported with grouping configuration and should not be committed to this repository.

## Extension permissions

Tab Inbox currently requests these Chrome extension permissions:

- `tabs`: read tab titles, URLs, active windows, and move/close tabs when the user chooses actions.
- `tabGroups`: create, update, merge, and move Chrome tab groups.
- `storage`: persist dashboard state, local rules, saved items, archives, AI settings, and usage counters.
- `alarms`: schedule delayed and debounced tab organization work.
- `scripting`: inject the floating workspace button on ordinary web pages when needed.

The extension also declares `http://*/*` and `https://*/*` host access for content scripts and script injection on normal web pages. This enables the floating workspace tools and page-seen signals across sites. Built-in Chrome pages and other restricted pages are skipped.

## What is not collected

This project does not provide a hosted telemetry service, analytics endpoint, or account system. It does not sell browsing data.

## Changes

Any new remote request path, analytics feature, or broader data collection behavior should be documented here before release.
