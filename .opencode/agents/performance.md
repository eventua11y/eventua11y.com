---
description: Reviews performance including Core Web Vitals, bundle size, caching, hydration, images, and edge function efficiency. Can run build and analysis commands. See .agents/performance.md for full instructions.
mode: subagent
model: github-copilot/claude-sonnet-4-6
temperature: 0.1
steps: 15
permission:
  edit: deny
  bash:
    '*': deny
    'npx astro build*': allow
    'npx lighthouse*': allow
    'du -sh*': allow
---

Follow the instructions in `.agents/performance.md`.
