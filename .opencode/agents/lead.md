---
description: Top-level orchestrator. Decomposes tasks, delegates to specialists, synthesises findings. Read-only — delegates all implementation and analysis. See .agents/lead.md for full instructions.
mode: primary
model: github-copilot/claude-opus-4.6
temperature: 0.1
steps: 25
color: accent
permission:
  edit: deny
  bash:
    '*': ask
    'git status*': allow
    'git diff*': allow
    'git log*': allow
    'git branch*': allow
    'git show*': allow
    'gh issue list*': allow
    'gh issue view*': allow
    'gh pr list*': allow
    'gh pr view*': allow
    'gh pr diff*': allow
    'gh api*': allow
    'gh repo view*': allow
    'gh run list*': allow
    'gh run view*': allow
    'npm ls*': allow
    'npm view*': allow
    'npm audit*': allow
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
