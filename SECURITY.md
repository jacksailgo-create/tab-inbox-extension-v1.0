# Security Policy

## Supported versions

Security fixes are accepted for the current `main` branch. Tagged releases may receive fixes when practical.

## Reporting a vulnerability

Please do not open a public issue for vulnerabilities that expose user browsing data, extension storage, API keys, or unexpected remote requests.

Use GitHub private vulnerability reporting if it is enabled for the repository. If it is not enabled yet, open a public issue requesting a private security contact, without publishing exploit details.

Include:

- A short description of the issue.
- Steps to reproduce or a proof of concept.
- The affected version or commit.
- Any suggested fix, if you have one.

## Security expectations

- Tab Inbox should work locally by default.
- AI features must remain opt-in.
- API keys must not be logged, exported, or committed.
- Any new remote request path must be documented in `PRIVACY.md`.
