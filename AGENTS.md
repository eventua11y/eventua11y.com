# AGENTS.md

Instructions for AI agents and subagents working in this repository.

## Agent Team

Eventua11y uses a five-agent team configured in `opencode.json`. Agent instruction files live in `.agents/`.

### Roster

| Agent             | Mode     | Model tier        | Instruction file                                       | Rationale                                                                                                |
| ----------------- | -------- | ----------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| **Lead**          | Primary  | Frontier (Opus)   | [`.agents/lead.md`](.agents/lead.md)                   | Orchestration and planning require deep reasoning; mistakes cascade to all downstream agents             |
| **Coder**         | Subagent | Mid-tier (Sonnet) | [`.agents/coder.md`](.agents/coder.md)                 | Best cost/quality/speed for full-stack implementation within scoped briefs                               |
| **Tester**        | Subagent | Mid-tier (Sonnet) | [`.agents/tester.md`](.agents/tester.md)               | Independent test authorship at the same capability level as the Coder prevents confirmation bias         |
| **Accessibility** | Subagent | Mid-tier (Sonnet) | [`.agents/accessibility.md`](.agents/accessibility.md) | Cross-cutting WCAG 2.2 AA specialist; called at planning and review stages                               |
| **Security**      | Subagent | Mid-tier (Sonnet) | [`.agents/security.md`](.agents/security.md)           | Cross-cutting auth and data-safety specialist; called at planning and review stages on user-account work |

### Orchestration pattern

```
User → Lead
         ├─ early: Accessibility (risk assessment of plan)
         ├─ early: Security (risk assessment of plan, on user-account work)
         ├─ Coder (implementation, guided by accessibility + security findings)
         ├─ Tester (independent tests from spec)
         ├─ late: Accessibility (review of implemented code)
         ├─ late: Security (review of implemented code, on user-account work)
         └─ quality gates: npm run check, npx tsc --noEmit
```

1. Lead gathers context, then calls **Accessibility** with the proposed plan.
2. If the task touches authentication, user data, or access control, Lead also calls **Security** with the proposed plan.
3. Lead delegates implementation to **Coder**, passing the accessibility and security risk findings as guidance.
4. After implementation, Lead delegates test writing to **Tester** (independently from Coder).
5. Lead calls **Accessibility** again to review the implemented changes.
6. If Security was called early, Lead calls **Security** again to review the implemented changes.
7. Lead runs deterministic quality gates; routes failures back to Coder.

### Cost projection

Approximate call distribution by volume: ~70% Sonnet (Coder + Tester + Accessibility), ~10% Opus (Lead), ~20% Haiku (explore subagent). Opus calls are low-volume but high-leverage — one Lead invocation drives many cheaper worker calls.

Note: Security adds minimal cost overhead — it is only called on tasks that touch authentication, user data, or access control, not on every task.

### Escalation map

- **Coder** → Lead: ambiguous brief, out-of-scope files needed, persistent type errors
- **Tester** → Lead: spec too ambiguous to derive criteria, genuine source bug discovered
- **Accessibility** → Lead: critical WCAG failure requiring architectural change
- **Security** → Lead: critical vulnerability requiring architectural change, secrets exposure
- **Lead** → User: architectural decisions beyond current scope, unresolvable ambiguity

## Skills

This project uses reusable skills from [mattobee/skills](https://github.com/mattobee/skills), installed in `.opencode/skills/`. Available skills:

- **`designing-agent-teams`** — Design and generate multi-agent coding teams.
- **`estimating-accessibility-effort`** — Estimate effort to remediate accessibility issues.
- **`fixing-accessibility-issues`** — Fix accessibility issues in implemented UI code.
- **`predicting-accessibility-risks`** — Identify accessibility risks before implementation.
- **`prioritising-accessibility-fixes`** — Prioritise accessibility issues for remediation.
- **`reviewing-accessibility`** — Review implemented UI code for WCAG AA compliance.
- **`suggesting-next-steps`** — Suggest prioritised next steps based on project state.
- **`writing-accessibility-tests`** — Write Playwright accessibility tests with axe-core scans and targeted assertions.

To update skills: `npx skills update` from `.opencode/`.

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

When adding new pages or interactive components, add both layers. For detailed testing patterns including shadow DOM caveats, dark mode scanning, and helper functions, see the `writing-accessibility-tests` skill in `.opencode/skills/writing-accessibility-tests/SKILL.md`.

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
