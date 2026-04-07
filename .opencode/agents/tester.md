---
description: Authors and runs Playwright E2E tests and Vitest unit tests for non-accessibility concerns. Independent from the Coder. See .agents/tester.md for full instructions.
mode: subagent
model: github-copilot/claude-sonnet-4-6
temperature: 0.1
steps: 30
permission:
  edit: allow
  bash:
    '*': deny
    'npx playwright test*': allow
    'npm test*': allow
    'npx vitest*': allow
---

Follow the instructions in `.agents/tester.md`.
