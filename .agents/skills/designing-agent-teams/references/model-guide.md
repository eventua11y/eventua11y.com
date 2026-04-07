# Model Guide — Assignment Heuristics

This skill uses a three-tier model framework. Match cognitive demand to model tier, then substitute the specific model IDs from your provider.

## The three tiers

**Frontier — The architect and safety net.** Most capable, slowest, most expensive. Use for orchestration, architectural planning, complex multi-file debugging, and pre-merge review. These are low-volume, high-leverage tasks where reasoning depth matters and mistakes are expensive. Avoid for single-file tasks, boilerplate, or anything high-volume.

**Mid-tier — The workhorse.** Handles 80–90% of coding tasks at the best quality/cost/speed balance. Use for feature implementation, test writing, standard refactoring, and multi-file changes within a well-understood scope. Less prone to overengineering than frontier models — tends to make the requested change rather than refactoring everything it touches. Default to mid-tier unless there is a specific reason to use another tier.

**Fast — The speed specialist.** Fastest and cheapest, with a smaller context window. Use for bounded, well-defined tasks: file exploration, grep, boilerplate, docstrings, commit messages, simple edits. Ideal for high-volume operations and preliminary exploration before handing off to a more capable agent. If escalation rate from a fast-tier agent exceeds ~30%, the tasks assigned to it are too complex for this tier.

## Provider mapping

| Tier     | Anthropic     | OpenAI              | Google                |
| -------- | ------------- | ------------------- | --------------------- |
| Frontier | Claude Opus   | GPT-4o / o3         | Gemini 2.5 Pro        |
| Mid-tier | Claude Sonnet | GPT-4.1             | Gemini 2.5 Flash      |
| Fast     | Claude Haiku  | GPT-4.1 mini / nano | Gemini 2.0 Flash-Lite |

Models and naming change frequently. Check your provider's current model lineup when configuring agents. The tier assignments above are approximate — evaluate based on capability benchmarks, context window size, and cost for your use case.

When writing model IDs in config files, use the provider's canonical stable name (e.g., `claude-sonnet-4`, not `claude-sonnet-4-20250514`). Dated snapshot IDs pin to a specific version that will go stale. Canonical names automatically resolve to the latest version. Check the provider's documentation for current canonical IDs — do not guess the format.

## The 70/20/10 rule

Target call distribution by volume: ~70% fast, ~20% mid-tier, ~10% frontier. The lead runs roughly 10 times per workflow while workers run 100+ times — volume differences make per-call cost compound fast.

Red flags in a team's distribution:

- More than 30% frontier calls → tasks are likely over-assigned to the top tier
- Less than 50% fast calls → look for bounded subtasks to delegate down
- Escalation rate above 30% from any tier → tasks are miscategorised for that tier

## Escalation design

Build concrete escalation triggers, not vague "if it's hard" rules. Effective triggers: test failures after an attempt, error counts exceeding a threshold, the agent detecting it needs to reason across more files than its scope allows. Escalation should flow upward (fast → mid-tier → frontier) and be the exception, not the norm.

## Context behaviour

Some models exhibit "context anxiety" — wrapping up work prematurely as they approach what they believe is their context limit. This varies by model generation and is more pronounced in some mid-tier models. When observed, context resets (fresh agent with a handoff artifact) work better than compaction (summarising in place). Test on your specific model before committing to a strategy.

## Cost levers

- **Prompt caching** — shared context replayed across agent calls gets cached automatically; the savings are large
- **Effort control** — some providers support adaptive effort levels; at reduced effort, frontier models deliver strong results with far fewer output tokens
- **Batch API** — significant discount for non-time-critical work (doc generation, test expansion, analysis)
- **Context isolation** — each subagent gets its own context window and returns only a summary, preventing context bloat in the lead
