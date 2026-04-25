---
description: Reviews security concerns including dependencies, env vars, CSP, edge functions, auth, and CSRF. Can run npm audit. See .agents/security.md for full instructions.
mode: subagent
model: github-copilot/claude-sonnet-4.6
temperature: 0.1
steps: 15
permission:
  edit: deny
  bash:
    '*': ask
    'npm audit*': allow
---

Follow the instructions in `.agents/security.md`.
