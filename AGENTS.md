# AGENTS.md

Instructions for AI agents and subagents working in this repository.

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
4. When in doubt about whether a label applies, include it -- over-labeling is better than under-labeling.
