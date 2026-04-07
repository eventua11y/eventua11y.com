---
description: Implements features, fixes bugs, and refactors source code within scoped boundaries. See .agents/coder.md for full instructions.
mode: subagent
model: github-copilot/claude-sonnet-4.6
temperature: 0.1
steps: 30
permission:
  edit: allow
  bash:
    '*': deny
    'npm run build*': allow
    'npx astro check*': allow
    'npx tsc*': allow
---

Follow the instructions in `.agents/coder.md`.
