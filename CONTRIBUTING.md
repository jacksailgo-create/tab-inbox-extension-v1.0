# Contributing to Tab Inbox

Thanks for taking the time to improve Tab Inbox.

## Development setup

1. Install Node.js 20 or newer.
2. Install dependencies:

   ```sh
   npm ci
   ```

3. Build the extension:

   ```sh
   npm run build
   ```

4. Load the project folder as an unpacked extension in Chrome at `chrome://extensions/`.

## Before opening a pull request

Run the same checks used by CI:

```sh
npm run typecheck
```

For changes that affect extension behavior, also load the unpacked extension manually and verify the dashboard opens, scans tabs, and performs the changed workflow.

## Pull request guidelines

- Keep runtime behavior changes focused and explain the user impact.
- Do not commit generated packages, local archives, `.env` files, or API keys.
- Update `README.md` or `PRIVACY.md` when changing installation, permissions, storage, or AI behavior.
- Manually verify classification, storage, background messages, and tab actions when changing those areas.

## Reporting issues

When filing a bug, include:

- Chrome version and operating system.
- Whether the extension was loaded unpacked or installed from a package.
- Steps to reproduce.
- Any relevant console errors from the extension service worker or dashboard.
