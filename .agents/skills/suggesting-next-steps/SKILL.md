---
name: suggesting-next-steps
description: Use this skill to suggest prioritised next steps for a project. Triggers when the user asks what to work on next, wants to resume after a break, or needs help prioritising a backlog.
compatibility: Requires file read access and gh CLI for GitHub issue/PR queries.
---

# Suggesting Next Steps

Analyse a project's current state and suggest prioritised next steps. This is a read-only skill — gather and organise information, do not make changes.

## Gather context

Collect whatever signals are available. Not every project has all of these — adapt to what exists. Do not block on missing sources.

### Local state

- `git status` — uncommitted changes, staged files
- `git branch` — local branches, especially any that look like work-in-progress
- `git log --oneline -20` — recent commit history to understand what was worked on last
- `git stash list` — stashed changes that may have been forgotten

### Open work on GitHub

- `gh pr list --state open` — open pull requests (these are active work)
- `gh issue list --state open --limit 30` — open issues
- `gh issue list --label bug --state open` — bugs specifically (these take priority)

If `gh` is not authenticated or the repo has no remote, skip GitHub queries and note it.

### Tracking files

Look for any of these in the repo root or `docs/`:

- `STATUS.md` — implementation status tracking (e.g., sections for "Implemented", "Partially Implemented", "Not Started")
- `ROADMAP.md`, `TODO.md`, `CHANGELOG.md` — other common tracking files

When a tracking file exists, it is the primary source for what is done and what remains. Parse its structure and extract incomplete items with as much specificity as available (sub-features, specific user stories, named gaps).

### Project context

- `AGENTS.md` — project description, goals, architecture. Use for context about what the project is and what matters, not as a source of tasks.
- `README.md` — project overview
- PRD or requirements documents in `docs/` — long-term goals and scope
- `package.json` (or equivalent) — scripts that exist, test setup, dependencies

### Test and build health

- Check whether test scripts exist in `package.json` and whether test files exist in the repo
- Look for obvious gaps: source files with no corresponding test files, test scripts that are defined but have no test files to run
- Check CI status if GitHub Actions workflows exist: `gh run list --limit 5`

## Categorise findings

Group what was found into five categories, presented in this order:

### Resume

Unfinished work from previous sessions. This is the highest-priority category because it represents interrupted momentum.

- Uncommitted or staged changes
- Stashed work
- Open PRs (especially draft PRs or those with review comments to address)
- Branches with recent commits that haven't been merged
- The most recent area of work from git log, if it appears incomplete

### Fix

Things that are broken or degraded. These should be addressed before new work.

- Open issues labelled as bugs
- Failing CI runs
- Known broken tests

### Complete

Partially implemented features with specific incomplete sub-tasks identified. This comes from tracking files (STATUS.md), GitHub issues with checklists, or PRD sections that map to existing but incomplete code.

List the specific incomplete sub-tasks, not just the feature name. "Conformance tracking: evaluation status, pass/fail/NA per criterion, summary view" is useful. "Finish story 08" is not.

### Start

Highest-impact work that hasn't been started yet. Draw from:

- "Not Started" sections in tracking files
- Open issues not labelled as bugs
- PRD features that have no corresponding code or tracking entry
- Gaps identified during context gathering (e.g., no error handling, no monitoring)

Do not list everything. Pick the 3–5 items that appear most impactful based on project context. If a PRD or roadmap suggests phasing, respect it — do not suggest Phase 3 work when Phase 1 is incomplete.

### Improve

Maintenance and quality improvements. Lower urgency but worth noting.

- Missing test coverage for existing features
- Outdated dependencies (if obvious from package.json, not a full audit)
- Dead code, unused imports, or inconsistent patterns noticed during context gathering
- Documentation gaps

## Present the list

For each item, provide:

- A one-line description of what to do
- A reference: file path, issue number, PR number, or branch name

Keep it concise. The goal is orientation, not a project plan. If a category has no items, omit it entirely.

If there is genuinely nothing to suggest — the project is clean, tests pass, no open issues, tracking is up to date — say so.

## Gotchas

- Do not invent work. Only suggest things supported by evidence from the signals gathered. If the backlog is empty and there are no issues, the project may simply be in a good state.
- Do not make changes. This skill is strictly read-only — no commits, no file edits, no issue creation.
- Not every repo uses GitHub. If there's no remote or `gh` fails, rely on local signals (git history, tracking files, project docs). Note the limitation but don't treat it as a blocker.
- Tracking files vary in format. STATUS.md might use markdown headings, checklists, tables, or prose. Parse whatever structure exists rather than expecting a specific format.
- Respect existing prioritisation. If the project has labelled issues (e.g., "Priority: High"), epics, or a phased roadmap, use that ordering rather than imposing a different one.
- AGENTS.md describes the project and its agent team. Use it for context ("this is an accessibility audit tool" shapes what matters), but do not suggest agent team changes — that's a different skill.
