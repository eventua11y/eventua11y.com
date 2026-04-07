# AGENTS.md

Instructions for AI agents and subagents working in this repository.

## Agent Team

Agent instruction files live in `.agents/` (platform-agnostic). Platform-specific configs live in `.opencode/agents/` and reference the `.agents/` files. Skills are in `.agents/skills/` (installed from [mattobee/skills](https://github.com/mattobee/skills)) and `.opencode/skills/` (project-specific).

### Team overview

The team follows a plan-implement-verify pattern with specialist consultants for cross-cutting concerns.

| Agent               | Role                                                     | Model Tier        | Rationale                                                              |
| ------------------- | -------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------- |
| **`lead`**          | Orchestrator — decomposes tasks, delegates, reviews      | Frontier (Opus)   | Cross-domain coordination needs highest reasoning depth                |
| **`coder`**         | Developer — implements features and fixes                | Mid-tier (Sonnet) | The workhorse; mid-tier prevents overengineering                       |
| **`tester`**        | QA — writes tests independently from coder               | Mid-tier (Sonnet) | Independent test authorship avoids confirmation bias                   |
| **`accessibility`** | WCAG 2.2 specialist — markup, visual, interaction, forms | Frontier (Opus)   | Dual-touchpoint: advises during planning, reviews after implementation |
| **`a11y-testing`**  | Accessibility test author                                | Mid-tier (Sonnet) | Scoped test writing from specialist requirements                       |
| **`security`**      | Security specialist — deps, auth, CSP, CSRF              | Mid-tier (Sonnet) | Checklist-driven review                                                |
| **`astro`**         | Astro framework specialist                               | Mid-tier (Sonnet) | Pattern-matching review                                                |
| **`netlify`**       | Netlify deployment specialist                            | Mid-tier (Sonnet) | Configuration-oriented review                                          |
| **`supabase`**      | Supabase integration specialist                          | Mid-tier (Sonnet) | Checklist-driven review                                                |
| **`performance`**   | Performance specialist — CWV, bundle, caching            | Mid-tier (Sonnet) | Metric-driven review                                                   |

### Orchestration

The `lead` delegates to all other agents. No other agent delegates (flat hierarchy under the lead). The workflow for feature implementation:

1. Lead gathers context and plans.
2. Lead invokes `accessibility` and/or `security` to **advise** (early assessment). Their Coder Requirements are passed verbatim to the coder.
3. Lead delegates to `coder` for implementation.
4. Lead delegates to `tester` (functional) and/or `a11y-testing` (accessibility) for test authorship.
5. After tests pass, Lead invokes specialists to **review** the implementation.
6. Lead synthesises findings into a unified report.

### Escalation map

- `coder` escalates to `lead` on: ambiguous plans, build failures after 2 attempts, changes spanning 5+ unrelated modules.
- `tester` escalates to `lead` on: test revealing a source code bug (tester cannot edit source).
- `a11y-testing` escalates to `lead` on: genuine accessibility failures in source code.
- All specialists escalate to `lead` when findings require code changes.

### Cost projection

- Frontier (Opus): 2 agents — `lead`, `accessibility`. ~20% of calls.
- Mid-tier (Sonnet): 8 agents — `coder`, `tester`, `a11y-testing`, `security`, `astro`, `netlify`, `supabase`, `performance`. ~80% of calls.

### Write access

| Agent          | Can write to                                                  |
| -------------- | ------------------------------------------------------------- |
| `coder`        | `src/`, `netlify/`, `public/`, root config files              |
| `tester`       | `tests/` (except `accessibility.spec.ts`), `src/**/*.test.ts` |
| `a11y-testing` | `tests/`                                                      |
| All others     | Read-only                                                     |

### When to invoke agents

Agents support five modes — **audit**, **advise**, **estimate**, **diagnose**, and **answer** — and should be invoked at appropriate workflow moments:

- **Planning a feature or change** — invoke `accessibility` and/or `security` to **advise** on risks and produce Coder Requirements, and to **estimate** effort before work begins.
- **Implementing a feature** — invoke `coder` to implement, then `tester` to verify.
- **Reviewing code, PRs, or branches** — invoke relevant specialists to **audit** for issues.
- **Investigating a bug or regression** — invoke specialists to **diagnose** the problem.
- **Asking a question** — invoke specialists to **answer** domain-specific questions.
- **Before merging** — invoke the `lead` for a cross-domain review.

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
