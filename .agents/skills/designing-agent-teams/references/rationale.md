# Rationale

Why the skill works the way it does. The agent never loads this file. It's here for anyone reviewing the skill or wondering where a decision came from.

## Separate tester from coder

[AgentCoder](https://arxiv.org/abs/2312.13010) got 96.3% on HumanEval by putting code generation and test generation into separate agents. The insight is simple: a coder testing its own work has confirmation bias. It tests what it thinks it built, not what it should have built. When tests are written independently from the spec, accuracy jumps from 79.3% to 89.6%.

Every team the skill generates includes an independent Tester. If a review finds the coder is writing its own tests, that's the first thing to fix.

## Plan-implement-verify core team

A bunch of different multi-agent systems have independently landed on the same three-role pattern: plan, implement, verify.

- [MetaGPT](https://arxiv.org/abs/2308.00352) uses structured SOPs for these stages. The big quality gains come from adding planning and design roles, not more coders.
- AgentCoder separates programmer, test designer, and test executor.
- [ChatDev](https://arxiv.org/abs/2307.07924) runs a separate testing phase that catches bugs inline testing misses.
- Anthropic's [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents) describes the same thing as an evaluator-optimizer loop.
- The ["Code in Harmony" survey](https://arxiv.org/abs/2501.01957) ranked 14 frameworks by Elo. The top three all used 3 to 4 agents with feedback loops. The bottom-ranked ones used more agents in waterfall pipelines.

So the skill has a mandatory core team: Lead (plan), Coder (implement), Tester (verify). Every team gets these three. Specialists go on top.

## Hierarchical coordination is not optional

[Google Research](https://arxiv.org/abs/2502.14858) tested 180 agent configurations across 5 architectures. Flat topologies (no coordinator) amplified errors by 17.2×. Adding a centralized orchestrator brought that down to 4.4×.

Without someone in charge, adding agents makes things worse. The skill requires a Lead in every team.

## Deterministic quality gates, not LLM self-evaluation

At 85% accuracy per step, a 10-step chain succeeds 20% of the time. [LLMs Cannot Self-Correct Reasoning Yet](https://arxiv.org/abs/2310.01798) showed that without external feedback, LLMs can't reliably spot their own mistakes. The [Agent Skills best practices](https://agentskills.io/skill-creation/best-practices) reach the same conclusion with their validation loops pattern.

The skill requires deterministic gates at each step: linting, type-checking, test pass rates. If the only quality check is another LLM reviewing the work, the skill flags it.

## Security specialists make a measurable difference

[AutoSafeCoder](https://arxiv.org/abs/2409.10737) added a security agent with static analysis feedback to a multi-agent coding team. Vulnerabilities dropped 13%. With iterative feedback, vulnerability rates went from 40.2% to 7.4%.

This is why the skill recommends a security auditor for auth-heavy or user-data projects. It's also the main evidence that cross-cutting specialists (security, accessibility) add more value than tool-specific ones.

## Keep agent instructions short

The [Agent Skills best practices](https://agentskills.io/skill-creation/best-practices) recommend keeping SKILL.md under 500 lines and 5,000 tokens. Long instructions hurt more than they help because the agent can't find what matters.

The skill caps individual agent files at 500 words for the same reason. The agent's capabilities come from the model and its tools, not from a lengthy persona description.

## Ground specialists in official docs, not training data

LLMs will confidently use deprecated APIs from stale training data. The [Agent Skills best practices](https://agentskills.io/skill-creation/best-practices) flag this directly: relying on the LLM's general training knowledge is a common pitfall.

The skill tells every specialist to wire in MCP servers or documentation URLs and check official sources before generating platform-specific code. A Supabase agent running on training data alone will eventually use deprecated RLS syntax. The gotchas section warns about this.

## Context windows drive the specialist-vs-MCP decision

[EclipseSource](https://eclipsesource.com/blogs/2026/01/22/mcp-context-overload/) found that three MCP servers consumed over 20% of the context window before the agent even started. [Jenova.ai](https://www.jenova.ai/en/resources/mcp-tool-scalability-problem) found tool selection accuracy collapsed from 43% to under 14% with too many tools loaded.

The skill recommends tool-specific specialist agents mainly as a context window strategy. If a project uses 3+ platforms whose tools would overflow a single agent's context, split them out. For simpler setups the coder can handle platform tools via MCP directly. Anthropic's [Tool Search](https://www.anthropic.com/engineering/advanced-tool-use) helps here too by loading tools on demand.

## Multi-agent isn't always better

[Google Research](https://arxiv.org/abs/2502.14858) found that for sequential, dependency-heavy tasks, every multi-agent variant performed 39 to 70% worse than a single agent. Multi-agent helps most when single-agent accuracy is below roughly 45%.

The skill's review checklist asks "would a single agent suffice?" because a well-prompted single agent with a clear spec beats a poorly-coordinated team every time.

## Design choices

These aren't research findings. They're architectural decisions that felt right for the skill.

### Platform-agnostic core outputs

The [Agent Skills specification](https://agentskills.io/specification) is platform-agnostic by design. The skill follows this: core outputs (`.agents/*.md` and `AGENTS.md`) are plain markdown that works anywhere. Platform-specific config (OpenCode, Claude Code, Cursor) is generated as a thin wrapper only when needed. The skill checks the platform's own docs for current config syntax rather than bundling references that go stale.

### Generic model tiers

The skill uses frontier / mid-tier / fast as capability tiers with a provider mapping table in `model-guide.md`. This keeps teams portable. Switch from Anthropic to OpenAI or Google and the team design still works. Only the mapping table needs updating.

## Practitioner heuristics

Rules of thumb from experience. Useful but not backed by published research.

### 70/20/10 call volume split

Roughly 70% fast, 20% mid-tier, 10% frontier by call volume. More of a smell test than a target. If more than 30% of calls hit frontier models, it's worth asking whether those tasks really need top-tier reasoning.

### Mid-tier handles 80 to 90% of coding tasks

Feature building, test writing, standard refactoring. None of this needs frontier reasoning. Default to mid-tier for the Coder, Tester, and most specialists. Save frontier for the Lead's planning and review work.

### Frontier models refactor beyond scope

Not formally studied, but widely observed. Give a frontier model a focused task and it'll often "improve" nearby code unprompted. The skill recommends explicit scope constraints in system prompts: "make only the changes described in the plan, do not refactor adjacent code."

### Dual-touchpoint specialists

Call domain specialists early (planning) and late (review) rather than just once at the end. Early assessment shapes the implementation instead of just judging it afterwards. The skill recommends this for concerns that are expensive to retrofit, like accessibility and security. Not every specialist needs both touchpoints. A documentation writer only needs a late pass.

## Agents can't judge their own work

Agents confidently praise their own mediocre output. Anthropic's [harness design post](https://www.anthropic.com/engineering/harness-design-long-running-apps) confirmed this. Getting a separate agent to be harsh is easier than getting the builder to be honest. For frontend work, they gave the evaluator Playwright to click through live pages and score against weighted criteria, anchored with example scores. Quality improved over 5–15 iterations.

Same idea as the independent Tester (separate the judge from the maker) but with grading criteria and tool interaction instead of test suites. The "Evaluator feedback loops" best practice applies this to the Tester and specialist roles.

## Work contracts keep the Tester and Coder aligned

The same [Anthropic post](https://www.anthropic.com/engineering/harness-design-long-running-apps) uses a sprint contract pattern: before each chunk of work, the Coder proposes what it'll build and how "done" is defined, and the Tester pushes back until they agree. One sprint had 27 testable criteria.

Without a contract, the Tester grades against whatever it thinks "done" looks like, which may not match what the Coder intended. The skill recommends work contracts when the gap between spec and implementation is wide enough for that to happen.

## Context resets beat compaction for some models

Anthropic's [harness design post](https://www.anthropic.com/engineering/harness-design-long-running-apps) found that context resets (clean slate with a handoff artifact) beat compaction (summarising in place) for Sonnet 4.5, which started wrapping up prematurely as context filled. They call it "context anxiety." Opus 4.5 and 4.6 reduced this enough to drop resets. Pick your context strategy based on the model, not as a one-size-fits-all rule. The gotchas section warns about this.

## Scaffolding goes stale as models improve

Every piece of scaffolding assumes the model can't do something on its own. Anthropic's [harness design post](https://www.anthropic.com/engineering/harness-design-long-running-apps) showed this concretely: sprint decomposition was essential for Opus 4.5 but just overhead for Opus 4.6. The Tester's value shifted from catching coherence failures to catching last-mile bugs as the Coder got better.

The review checklist asks about stale scaffolding for the same reason it asks "would a single agent suffice?" If it's not earning its keep, drop it.
