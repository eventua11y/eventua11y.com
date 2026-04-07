---
description: Top-level orchestrator. Decomposes tasks, delegates to specialists, synthesises findings. Read-only — delegates all implementation and analysis. See .agents/lead.md for full instructions.
mode: primary
model: github-copilot/claude-opus-4-6
temperature: 0.1
steps: 25
color: accent
permission:
  edit: deny
  bash: deny
  task:
    '*': deny
    'coder': allow
    'tester': allow
    'accessibility': allow
    'a11y-testing': allow
    'security': allow
    'astro': allow
    'netlify': allow
    'supabase': allow
    'performance': allow
---

Follow the instructions in `.agents/lead.md`.
