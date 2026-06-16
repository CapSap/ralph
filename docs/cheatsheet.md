# Ralph Cheatsheet

One page. For the full story see [overview.md](overview.md).

---

## The loop, minimally

```bash
while :; do cat PROMPT.md | claude -p ; done
```

Fresh context every pass. Files are the only memory. One task per loop.

---

## The loop, safely (what the reference-template does)

```bash
MAX_ITERATIONS=50      # hard ceiling — never loop forever
MAX_NOOP=3             # abort after N loops with no git progress
PROMPT_build.md        # standing instructions
IMPLEMENTATION_PLAN.md # working memory (the agent updates it)
# exit when stdout contains: <promise>COMPLETE</promise>
```

---

## File checklist

| File | Purpose | Who maintains |
|---|---|---|
| `loop.sh` | orchestrator + safety rails | you |
| `PROMPT_plan.md` | builds the plan from specs (no code) | you |
| `PROMPT_build.md` | does one task per loop | you |
| `specs/*.md` | source of truth for *what* to build | you |
| `IMPLEMENTATION_PLAN.md` | the task list / working memory | the agent |
| `AGENTS.md` | how to build/test/run + conventions | the agent |
| git history | durable record + undo | the loop (commits each pass) |

---

## Prompt skeleton (the 4 jobs)

```
1. SCOPE        Read the plan; pick the SINGLE highest-priority incomplete task.
2. BACKPRESSURE Run <test/build/lint cmds>; fix until green before committing.
3. COMPLETION   Print <promise>COMPLETE</promise> only when ALL tasks pass.
4. STUCK        If blocked or the same failure repeats, log it to the plan and stop.
```

---

## Huntley's "signs" (durable prompt instructions)

- "Study the codebase first — **don't assume code isn't implemented**; search."
- "**No placeholder / stub** implementations."
- "**ultrathink**."
- "**Capture the *why*** in tests and comments."

Add a new sign each time you watch the loop do something dumb. Tuning ≈ 80% of the work.

---

## The dials

| Knob | Effect |
|---|---|
| `MAX_ITERATIONS` | hard cap on total loops (cost + runaway guard) |
| `MAX_NOOP` | circuit breaker on consecutive no-progress loops |
| spec granularity | one topic per spec, **no "and"** in the topic sentence |
| backpressure strength | more/better tests+types = better output |
| permission mode | `acceptEdits` (HITL) vs `--dangerously-skip-permissions` (AFK) |
| `999+` priority | higher number = do-first; inject urgent tasks without renumbering |

---

## Failure → fix

| Symptom | Likely cause | Fix |
|---|---|---|
| Loop never finishes | no/weak completion signal | tighten the sigil rule; add dual-condition exit |
| Garbage accumulates | no backpressure | add tests/types/lint; fix-until-green in prompt |
| Forgets earlier work | context too full / too much per loop | one task per loop; offload reading to subagents |
| Deletes a passing test | no recorded *why* | document why each test exists |
| Thrashes on one bug | no stuck-escape | add "log blocker + stop" stuck behavior |
| Reinvents existing code | assumes not implemented | add the "search first" sign |
| Runs up a bill | no cap | set `MAX_ITERATIONS`; sandbox; watch the stream |
| Wake to broken build | expected — it's "deterministically bad" | `git reset`; feed failure to a model for a rescue plan |

---

## Context zones (rough)

- **Smart zone** ~40–60% utilization → keep loops here.
- **Dumb zone** ~60–70%+ → quality falls off; compaction silently drops tokens.
- Ralph stays in the smart zone by **resetting context every loop**.

---

## Economics

- ~**$10/hr** continuous (LinearB: ~$10.42/hr on Sonnet 4.5).
- Cited anecdote: ~$50k MVP for ~$297 in API spend.
- Expensive input = **specs + tuning**, not tokens.

---

## Scaling

`1 agent → 2 → ~10 → "Gas Town" (multi-agent)`. **Master the single monolithic
loop first. Don't skip stages.**
