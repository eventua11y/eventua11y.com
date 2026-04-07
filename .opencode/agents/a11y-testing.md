---
description: Authors and runs Playwright accessibility tests. Can edit test files. See .agents/a11y-testing.md for full instructions.
mode: subagent
model: github-copilot/claude-sonnet-4.6
temperature: 0.1
steps: 30
permission:
  edit: allow
  bash:
    '*': deny
    'npx playwright test*': allow
    'npm test*': allow
---

Follow the instructions in `.agents/a11y-testing.md`.
