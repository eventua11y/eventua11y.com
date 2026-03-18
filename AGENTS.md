# AGENTS.md

Instructions for AI agents and subagents working in this repository.

## OpenCode Agent Team

This project has a team of specialist agents configured in `.opencode/agents/` and reusable skills in `.opencode/skills/`. The team is structured as:

- **`project-lead`** — Coordinates the specialist team. Use Tab to switch to it in OpenCode, or invoke with `@project-lead`.
- **`accessibility-lead`** — Orchestrates the accessibility sub-team (`a11y-markup`, `a11y-visual`, `a11y-interaction`, `a11y-forms`, `a11y-testing`).
- **Domain specialists** — `astro`, `performance`, `security`, `testing`, `netlify`, `supabase`.

All analysis agents are read-only. Only `a11y-testing` and `testing` can edit files (test files only).

### When to invoke agents

Agents support five modes — **audit**, **advise**, **estimate**, **diagnose**, and **answer** — and should be invoked at appropriate workflow moments:

- **Planning a feature or change** — invoke agents to **advise** on risks and recommend approaches, and to **estimate** effort, complexity, and priority before work begins.
- **Reviewing code, PRs, or branches** — invoke agents to **audit** for issues in their domain.
- **Investigating a bug or regression** — invoke agents to **diagnose** the problem in their area of expertise.
- **Asking a question** — invoke agents to **answer** domain-specific questions (e.g. "does this need ARIA?", "will this break caching?", "is this RLS policy correct?").
- **Before merging** — invoke the `project-lead` for a cross-domain review to catch issues that span multiple specialist areas.

## GitHub Labels

When creating or updating GitHub issues or pull requests, you **must** apply appropriate labels. Never create an issue or PR without at least one label.

### How to Apply Labels

- Use `--label` flags when creating: `gh issue create --label "bug" --label "dates"` or `gh pr create --label "enhancement"`
- Add labels after creation: `gh issue edit <number> --add-label "label"` or `gh pr edit <number> --add-label "label"`
- Multiple `--label` flags can be passed in a single command

### Available Labels

| Label            | Apply when...                                                        |
| ---------------- | -------------------------------------------------------------------- |
| `bug`            | The issue describes something that isn't working correctly           |
| `enhancement`    | The issue requests a new feature or improvement                      |
| `documentation`  | The change is solely or primarily about documentation                |
| `accessibility`  | The change addresses accessibility defects or improvements           |
| `dependencies`   | The PR updates a dependency file (package.json, lock files)          |
| `testing`        | The change is primarily about adding or updating tests               |
| `CSS`            | The change is primarily about styling or theming                     |
| `dates`          | The change relates to setting or displaying datetimes/timezones      |
| `filtering`      | The change relates to event filtering functionality                  |
| `Sanity`         | The change involves Sanity CMS schema, queries, or integration       |
| `Sentry`         | The change involves Sentry error tracking configuration              |
| `astro`          | The change is primarily about Astro framework configuration or pages |
| `content`        | The change relates to site content (not CMS schema)                  |
| `javascript`     | The PR updates JavaScript/TypeScript code (general-purpose)          |
| `github_actions` | The PR updates GitHub Actions workflows                              |
| `usability`      | The change improves general usability                                |
| `needs research` | The issue requires further investigation before work begins          |
| `Priority: High` | The issue is urgent or blocking other work                           |
| `Epic`           | The issue is a parent tracking issue for a larger initiative         |
| `Social`         | The change relates to social media or Open Graph metadata            |

### Labeling Rules

1. Apply **at least one** label to every issue and PR.
2. Use **multiple labels** when relevant (e.g. a bug fix for date filtering should get `bug`, `dates`, and `filtering`).
3. For PRs, match labels to the nature of the code change, not just the linked issue.
4. When in doubt about whether a label applies, include it — over-labeling is better than under-labeling.

## Fixed Development Ports

This project uses **fixed, non-negotiable ports** for local development:

- **Port 8888**: Netlify CLI dev proxy (the port you visit in the browser at `http://localhost:8888`)
- **Port 4321**: Astro upstream dev server (proxied by Netlify CLI)

Both ports are configured with strict enforcement — the server will **error and exit** rather than silently switching to an alternative port. **Never** pass `--port` flags, change port numbers in configuration files, or suggest alternative ports. If a port conflict occurs, identify and stop whatever process is occupying the port instead.

## Accessibility Testing

This project uses a two-layer accessibility testing strategy in `tests/accessibility.spec.ts`:

1. **axe-core scans** on every page as a foundation, scoped to WCAG 2.2 Level AA.
2. **Playwright assertions** on top for things axe cannot catch: accessible names on interactive elements, landmark structure, heading hierarchy, `aria-current` navigation state, `aria-live` regions, and `lang` attribute.

When adding new pages or interactive components, add both layers. For detailed testing patterns including shadow DOM caveats, dark mode scanning, and helper functions, see the `writing-a11y-tests` OpenCode skill in `.opencode/skills/writing-a11y-tests/SKILL.md`.

## GROQ Query Projections

Event listing queries in `src/lib/sanity.ts` and `netlify/edge-functions/get-events.ts` use **explicit field projections** — not the `...` spread operator. This is intentional to reduce payload sizes by excluding fields only needed on detail pages (e.g. `description`, `organizer`, `topics`, `geopoint`, `keywords`).

- **Do not** replace explicit field lists with `...` in listing queries.
- The single-event detail query (`getEventBySlug`) keeps `...` at the root level since the detail page uses nearly all fields, but its children sub-query uses explicit fields.
- When adding a new field to the Sanity schema, add it to the relevant GROQ projections only if the listing UI actually needs it.
- Note that explicit projections return `null` for unset fields, whereas `...` omits them (resulting in `undefined` in JS). Code that consumes query results must handle `null` values — e.g. `dayjs().tz(null)` throws, but `dayjs().tz(undefined)` does not.

## Sanity CMS Datasets

This project has two Sanity datasets: **`production`** and **`test`**.

- **Never** create dummy, test, placeholder, or seed data in the `production` dataset. The production dataset contains only real, editorial content that powers the live site.
- All test or dummy documents **must** be created in the **`test`** dataset.
- When using Sanity MCP tools, always verify the `dataset` parameter before any write operation. If the data is for testing, experimentation, or development, set the dataset to `test`.

## Sub-Issues for Epics

When creating an `Epic` issue with child tasks, add the child issues as **sub-issues** using the GitHub GraphQL API rather than listing them manually in the epic body. GitHub renders sub-issues natively with progress tracking.

Do **not** duplicate the sub-issue list in the epic's body text — the native sub-issues view is the source of truth.
