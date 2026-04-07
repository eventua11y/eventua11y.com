---
description: Reviews Netlify deployment config, edge functions, redirects, headers, and local dev proxy. Can run Netlify status commands. See .agents/netlify.md for full instructions.
mode: subagent
model: github-copilot/claude-sonnet-4.6
temperature: 0.1
steps: 15
permission:
  edit: deny
  bash:
    '*': deny
    'netlify status*': allow
    'netlify env:list*': allow
---

Follow the instructions in `.agents/netlify.md`.
