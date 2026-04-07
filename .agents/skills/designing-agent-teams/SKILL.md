---
name: designing-agent-teams
description: Use this skill to design or refine a multi-agent coding team with model-to-role assignments. Triggers when creating an agent team for a codebase, adding agents to an existing team, reviewing an agent team configuration, choosing which AI model to assign to each role, or optimising cost/quality/speed tradeoffs across agents.
compatibility: Requires file read/write access and bash.
---

# Designing Agent Teams

Generate multi-agent coding teams with optimal model assignments. Outputs a reasoning document (`AGENTS.md`) plus agent instruction files (`.agents/`) and platform-specific configs where applicable.

## Determine the mode

1. **create-existing** — Analyse an existing codebase, generate a tailored agent team
2. **create-new** — From a project brief or tech stack, generate a starter agent team
3. **add** — Add one or more agents to an existing team (e.g., a new dependency or cross-cutting concern)
4. **review** — Evaluate an existing agent team config, suggest refinements

**Creating for an existing codebase?** → Follow "Gather inputs: existing codebase" below
**Starting a new project?** → Follow "Gather inputs: new project" below
**Adding agents to an existing team?** → Follow "Gather inputs: add" below
**Reviewing an existing team?** → Follow "Gather inputs: review" below

## Gather inputs

Gather what is available from the codebase and the user's request. If the user has not specified priorities, infer them from context (a solo side project likely values speed and cost; a team production app likely values quality). Do not block on missing information — use sensible defaults and note assumptions in AGENTS.md.

### Existing codebase

- Read the project's directory structure, package.json / config files, and README
- Identify languages, frameworks, key dependencies, monorepo structure, test setup
- Estimate complexity: file count, language diversity, architectural layers
- **Default priority if not stated:** balance cost and quality (the most common case)

### New project

- Extract tech stack, project type, and scope from the user's request
- If team size is not stated, assume solo developer
- **Default priority if not stated:** prototyping speed for new projects
- Note framework-specific tooling needs (e.g., CMS schemas, deployment pipelines)

### Add to existing team

- Read the existing agent configuration files (`.agents/`, `AGENTS.md`, and any platform-specific configs) to understand the current team: roles, models, tools, escalation paths
- Identify what the new agent needs to cover — this may come from the user's request (e.g., "I just added Supabase and need an agent for edge functions") or from detecting a new dependency/tool in the codebase
- Determine where the new agent fits in the existing orchestration: who delegates to it, who it escalates to, and what scope boundaries it needs to respect relative to existing agents
- Check for overlap — if an existing agent already covers the concern partially, consider expanding that agent's prompt instead of adding a new one

### Review

- Read the existing agent configuration files (check `.agents/`, `AGENTS.md`, and any platform-specific configs)
- Identify which models are assigned where, what tools each agent has, scope definitions
- Apply the review checklist (below) to identify issues
- If the user has described specific pain points, prioritise those

## Design the agent team

Read `references/model-guide.md` for current model characteristics, pricing, and assignment heuristics.

Apply these principles in order:

**1. Start from roles, not models.** Identify what agent roles the project needs before choosing models.

**2. Consider whether a team is needed at all.** A well-prompted single agent with a good spec handles many projects effectively. Multi-agent coordination adds the most value when a single agent's accuracy is below ~45% on the task, or when the project has clearly parallelisable work streams with independent file boundaries. For simple projects, a single mid-tier agent with a clear AGENTS.md spec may outperform a poorly-coordinated team.

**3. Assemble the core team, then bring in specialists.**

Think of the agent team like a human dev team: a small core that's always present, plus specialist consultants brought in based on the project's requirements.

**Core team (always present):**

- **Lead** — the tech lead. Decomposes tasks, delegates, tracks dependencies, reviews results. Every team has one. Plans should stay at the product and architectural level, not granular implementation steps. Over-specified plans cascade errors downstream. Briefs should reference existing project guidelines (e.g., a token architecture doc, a style guide) rather than repeating their contents inline.
- **Coder** — the developer. Implements features and fixes within scoped boundaries.
- **Tester** — the QA engineer. Writes tests _independently from the coder_ to avoid confirmation bias. Separating test authorship from code authorship is one of the highest-impact structural decisions in a multi-agent team.

These three are present in every team this skill generates. They form the plan-implement-verify loop observed across prominent multi-agent systems (MetaGPT, AgentCoder, ChatDev).

**Specialist consultants (added per project):**

Bring in specialists based on what the project needs. Each should cover a cross-cutting concern that the core team would otherwise miss or handle inconsistently:

- **Accessibility specialist** — for web projects; assesses plans for a11y risks before implementation, reviews changes against WCAG
- **Security specialist** — for auth-heavy, payment, or user-data projects; assesses plans for security risks, reviews auth flows, input validation, dependencies
- **Performance specialist** — for latency-sensitive or resource-constrained projects; flags performance risks in proposed approaches, reviews implementation for bottlenecks
- **Documentation writer** — for libraries, APIs, and long-lived projects; keeps docs in sync with changes
- **Platform specialist** — for projects using 3+ external platforms (e.g., Supabase, Stripe, Sanity) where a single agent's context window can't hold all the platform tools simultaneously

Prefer cross-cutting concern specialists (security, accessibility, performance) over tool-specific ones. Tool-specific agents are justified primarily by context window constraints, not domain expertise — if the project only uses one or two platforms, the coder can handle them with MCP access.

When the project has relevant agent skills installed (e.g., `reviewing-accessibility`, `writing-accessibility-tests`), instruct specialist agents to load those skills for domain-specific procedures and checklists. This grounds the specialist in documented workflows rather than relying solely on the model's general knowledge.

**4. Match cognitive demand to model tier.** See `references/model-guide.md` for the full heuristics. Summary:

- **Frontier** — orchestration, architectural planning, complex debugging, pre-merge review
- **Mid-tier** — code generation, independent test writing, feature implementation, standard refactoring
- **Fast** — file exploration, boilerplate, docstrings, grep-style searches, simple edits

**5. Prevent write conflicts.** How strictly to scope write access depends on whether agents run in parallel or sequentially:

- **Parallel agents** (e.g., Claude Code Agent Teams, tmux worktrees): assign each agent to distinct directories or modules. Two agents writing to the same file simultaneously will overwrite each other's work. Use git worktree isolation where the platform supports it.
- **Sequential agents** (e.g., lead delegates one task at a time): file conflicts are less likely since agents take turns, but still scope write access to what each agent actually needs. A tester should write to test directories, not source code. A docs agent should write to documentation files, not application logic.

In both cases, when a task genuinely crosses boundaries, the lead should coordinate the handoff rather than giving multiple agents overlapping write access.

**6. Scope tools tightly.** Each agent gets only the tools it needs. A documentation agent does not need shell access. A file explorer does not need write permissions.

**7. Ground specialists in official sources.** Specialist agents for specific tools or platforms (e.g., Supabase, Vercel, Sanity, Netlify) should defer to authoritative sources rather than relying on the model's training knowledge, which may be outdated or incomplete. When designing a specialist agent:

- If the tool has an MCP server, include it in the agent's tool configuration and instruct the agent to use it for API lookups, schema queries, and platform operations.
- If the tool has official documentation, instruct the agent to consult it (via web fetch or a bundled reference) before generating platform-specific code.
- The agent's system prompt should explicitly state: use the official docs/MCP as the source of truth; do not guess at API signatures, configuration options, or platform behaviour.
- Check for available MCP servers at the tool's documentation site or the MCP registry. Common examples: Supabase, Stripe, Netlify, Sentry, Linear, GitHub, Notion.

**8. Design for escalation.** Build concrete escalation paths: test failures, error counts, or complexity markers trigger handoff from cheaper to more capable agents.

**9. Use deterministic quality gates.** Do not rely on an LLM to judge whether its own work is good enough. Quality gates should be automated and deterministic: linting, type-checking, test pass rates, build success. An LLM reviewer in a fresh context adds value for nuanced issues (security patterns, architectural fit), but the primary gate must be tooling, not judgment.

**10. Target the 70/20/10 split.** Roughly 70% fast, 20% mid-tier, 10% frontier by call volume. If more than 30% of calls go to frontier models, re-examine whether those tasks genuinely need top-tier reasoning.

## Generate outputs

All outputs go into the current working directory (the project repo root).

### Core outputs (always generated)

These are platform-agnostic and work with any agent that can read markdown files:

```
AGENTS.md                  # Team overview, orchestration, escalation map (repo root)
.agents/
├── lead.md               # Core: always present
├── coder.md               # Core: always present
├── tester.md              # Core: always present
└── [specialist].md        # Specialists: added per project (e.g., accessibility.md, security.md)
```

#### AGENTS.md (repo root)

Create `AGENTS.md` in the project root if it does not exist. This is the team-level document that lives at the repo root.

**AGENTS.md** contains:

1. **Team overview** — purpose and project context
2. **Agent roster** — for each agent: role name, model tier, one-sentence rationale, link to its instruction file
3. **Orchestration pattern** — who calls whom, what triggers handoffs
4. **Cost projection** — estimated call distribution and relative cost
5. **Escalation map** — which agents escalate to which

If `AGENTS.md` already exists, read it first and update in place. In **add** mode, append the new agent(s) to the roster and update the orchestration, cost, and escalation sections. Do not rewrite descriptions of unchanged agents.

#### .agents/ directory

Create `.agents/` in the project root if it does not exist.

**Individual agent files** (e.g., `lead.md`, `coder.md`, `tester.md`) — one file per agent. Each contains:

1. **Role** — what this agent does, in one paragraph
2. **Model** — which model tier and why
3. **Tools and scope** — what tools the agent has access to, what directories/files it can write to
4. **Escalation** — when to escalate, and to whom
5. **Instructions** — the agent's full operational instructions, including domain-specific guidance, conventions to follow, and any MCP servers or documentation URLs to consult

Keep each agent file under 500 words. The agent's capabilities come from the model and its tools, not from lengthy instructions.

### Platform-specific configuration (generated when applicable)

After generating the core outputs, check whether the project already has platform-specific agent configuration. Look for directories and files such as `.opencode/agents/`, `CLAUDE.md`, `.cursor/agents/`, or similar. If found, generate or update the platform-specific config files to reference the `.agents/*.md` instruction files.

If no existing platform config is detected, ask the user which platform they are using. If the user does not specify, generate only the core outputs — they are sufficient for most platforms to pick up.

When generating platform-specific configs:

- **Consult the platform's own documentation** for current config syntax, file format, and available fields. Do not rely on memorised config formats — platforms change their agent configuration frequently.
- Each platform config file should be a thin wrapper that references the agent's `.agents/*.md` instruction file for the full role description. Do not duplicate instructions across files.
- Use the model ID format appropriate for the user's provider (see `references/model-guide.md` for the tier mapping). Always use canonical stable names, not dated snapshot IDs — check the provider's documentation for current canonical IDs.
- **Always create the Lead as a new, named agent** — do not override or modify the platform's default/built-in agent. The Lead must be a distinct, separately selectable agent so the user can still access the platform's default agent alongside the team.

If the platform already has agent config files, read them first and merge new agents. Preserve existing agents not being replaced.

### What not to do

- Do not overwrite existing config files without reading them first
- Do not remove existing agents or agent files unless explicitly asked
- Do not duplicate full agent instructions into platform-specific config files — keep them in `.agents/*.md` and reference from platform configs

## Best practices

These patterns emerged from real-world use and significantly improved team effectiveness. They are recommendations, not requirements — adapt them to your project's needs.

### Narrate delegations

The lead should explain each handoff to the user: which agent is being called, why, and what it returned. Without narration, multi-agent workflows are a black box — the user sees a final result but has no idea what happened in between, making it hard to debug, trust, or improve the team.

Add this to the lead's instructions:

> Before each delegation, explain which agent you are calling and why. After each agent returns, summarise what it found or did.

Reinforce this in any platform-specific config preamble so the lead sees it at invocation time, not just in its instruction file.

### Dual-touchpoint specialists

Domain-critical specialists (accessibility, security, performance) are most effective when called at two points in the workflow:

1. **Early (planning)** — after context gathering but before implementation. The specialist assesses the proposed approach for risks and recommends mitigations. These recommendations are passed to the Coder as implementation guidance.
2. **Late (review)** — after implementation. The specialist reviews the actual code against domain criteria.

This is more effective than a single review gate at the end, because:

- Catching issues at planning time is cheaper than reworking implemented code
- The Coder gets actionable guidance upfront instead of discovering constraints through failed reviews
- The specialist's early assessment shapes the implementation rather than just judging it

Not every specialist needs two touchpoints. Use dual-touchpoint for concerns that are expensive to retrofit (accessibility, security). A documentation writer, for instance, only needs a late pass.

When using dual-touchpoint specialists, name them "Specialist" rather than "Reviewer" — "Reviewer" implies they only look at finished work and doesn't reflect the advisory role.

The early-pass output should include a structured **"Coder Requirements"** section: a numbered list of specific, implementable requirements arising from the risk assessment. Each item states _what_ to do and _why_ (citing the relevant standard or criterion). This section is passed directly to the Coder — write it for that audience. The Lead should pass this section verbatim rather than summarising it; detail is lost in translation when the Lead paraphrases specialist guidance.

### Ordering quality gates

When multiple quality-gate agents run after implementation, order them by dependency:

1. **Tester** first — verifies functional correctness. If tests fail, the code will change, so there's no point reviewing it yet.
2. **Domain specialists** second — review working, tested code against domain criteria (accessibility, security, etc.).

This avoids wasted specialist reviews on code that's about to change due to test failures.

### Evaluator feedback loops

For tasks where quality is subjective (visual design, UX, content tone), a single pass/fail gate is not enough. The Tester or a specialist can grade the Coder's output against explicit criteria and iterate, rather than just passing or failing.

This works when:

- The evaluator is separate from the builder — agents praise their own mediocre work. Tuning a separate agent to be harsh is easier than making the Coder self-critical
- Grading criteria are concrete and weighted (not "is this good?" but "does this follow these specific principles?"), with priorities that push the Coder away from safe defaults
- The evaluating agent is calibrated with few-shot examples showing expected scores for representative outputs
- The evaluating agent uses tools to interact with the output (e.g., Playwright for UI, API calls for backends) rather than just reading code

Deterministic gates (tests, linting, type-checks) stay primary. Evaluator loops cover what automated tools can't measure. 3–5 iterations typically hit diminishing returns.

### Work contracts

Before the Coder starts a chunk of work, have it agree a work contract with the Tester: what will be built, and what counts as "done." The Coder proposes scope and acceptance criteria, the Tester pushes back, and both agree before implementation starts.

This closes the gap between a high-level plan and testable output. Without a contract, the Tester grades against implicit expectations. Use work contracts when the Lead's plan is intentionally high-level and the spec-to-implementation gap is wide enough for misalignment.

## Gotchas

- A coder agent that writes its own tests has confirmation bias — it tests what it thinks it implemented, not what it should have. An independent tester agent that generates tests from the spec, not from the code, catches significantly more edge cases.
- Multiple agents writing to the same files is the most common source of broken builds in parallel agent teams. For parallel setups, scope each writing agent to distinct directories. For sequential setups, the risk is lower but still scope write access to what each agent needs — a tester writing to source code is a sign of misconfigured scope.
- At 85% accuracy per step, a 10-step workflow succeeds only 20% of the time. Keep agent chains short and gate each step with deterministic checks (tests, linting, type-checking), not LLM self-evaluation.
- Specialist agents without access to official docs will confidently generate outdated or wrong API calls. A Supabase agent relying on training data might use deprecated RLS syntax or old client methods. Always wire in the MCP server or documentation URL and tell the agent to check before generating.
- Fast-tier models have a smaller context window than frontier and mid-tier models. An agent assigned to explore a large monorepo on a fast model may silently lose context. For large codebases, use a mid-tier model for exploration or split the search into smaller scoped calls.
- Frontier models tend to refactor code beyond the requested scope. System prompts for frontier-powered agents should explicitly constrain scope ("make only the changes described in the plan, do not refactor adjacent code").
- Agent system prompts that are too long waste context on every call. Keep them under 500 words — the agent's capabilities come from the model, not from lengthy persona descriptions.
- When merging into an existing project-level config file (e.g., `CLAUDE.md`), it may contain project-specific instructions unrelated to agents. Only touch the agent team section. Rewriting the whole file will destroy existing project configuration.
- When adding an agent in **add** mode, create a new `.agents/[name].md` file and a corresponding platform config file. Do not rewrite existing agent files.
- Different platforms handle subagent invocation differently. Consult the platform's documentation for current config syntax rather than assuming one platform's patterns work on another.
- Do not override a platform's default/built-in agent when creating the Lead. The Lead must be a new, separately selectable agent. Overriding the default removes the user's access to it and conflates two different roles.
- Use canonical stable model names in config files (e.g., `claude-sonnet-4`, not `claude-sonnet-4-20250514`). Dated snapshot IDs pin to a specific version that goes stale. Check the provider's docs for current canonical IDs rather than guessing the format.
- For long-running builds, context resets (fresh agent with a handoff artifact) can outperform compaction (summarising in place). Some models exhibit "context anxiety" — wrapping up prematurely as context fills. Compaction doesn't fix this; the agent still perceives a long history. The tradeoff: handoff artifacts must carry enough state (progress, next steps, decisions, file locations) for the next agent to resume cold.
- In sequential teams where the Lead coordinates, the Coder should not create git commits independently. The Lead reviews and commits after verifying the build. Without this constraint, mid-tier models occasionally make unsanctioned commits during implementation, bypassing quality gates.

## Review checklist

When reviewing a team (any mode), check for:

- **Missing core team member** — every team should have a lead, coder, and independent tester; if any is missing, that's the first thing to fix
- **Missing independent tester** — if the coder writes its own tests, the team is missing one of the highest-impact structural decisions
- **Overlapping write access** — in parallel setups, multiple agents with write access to the same directories will cause conflicts; in sequential setups, check that each agent's write scope matches its actual role
- **LLM-only quality gates** — if the only check before merge is another LLM reviewing, add deterministic gates (tests, linting, type-checks)
- **Unjustified agents** — every agent should cover a concern that would otherwise be missed; remove any that duplicate another agent's scope
- **Missing specialists** — if the project has accessibility, security, or compliance requirements, check whether dedicated specialist agents are needed
- **Over-assignment to frontier** — tasks a mid-tier model handles equally well
- **Missing escalation paths** — fast-tier agent stuck with no handoff route
- **Scope creep** — agent with tools or filesystem access it does not need
- **Redundant agents** — overlapping work that could consolidate
- **Context window pressure** — fast-tier models have a smaller context window than frontier/mid-tier
- **Would a single agent suffice?** — if the project is simple enough that one well-prompted agent handles it, a team adds overhead without value
- **Stale scaffolding** — every team component encodes an assumption about what the model can't do alone; when models improve, check whether each piece is still load-bearing (e.g., sprint decomposition essential for one generation may be overhead for the next)
