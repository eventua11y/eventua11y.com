---
description: Implements features, fixes bugs, and refactors source code within scoped boundaries. See .agents/coder.md for full instructions.
mode: subagent
model: github-copilot/claude-sonnet-4.6
temperature: 0.1
steps: 30
permission:
  edit: allow
  bash:
    '*': ask
    'npm run *': allow
    'npx astro *': allow
    'npx tsc*': allow
    'npx prettier*': allow
    'npx vitest*': allow
    'git status*': allow
    'git diff*': allow
    'git log*': allow
---

Follow the instructions in `.agents/coder.md`.
