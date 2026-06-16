# Ralph: How It Works (Synthesized Overview)

A synthesis of the nine sources in [`sources/`](sources/). Where a point is
specific to one author it is attributed inline; the rest is common ground.

---

## 1. Origin & etymology

- Originated by **Geoffrey Huntley** ("Ralph Wiggum as a software engineer").
- Named after Ralph Wiggum (Simpsons) — endearingly dumb but persistent — and
  the slang **"to ralph"** (to vomit): the loop re-allocates ("mallocs") the
  entire specification on every iteration, repeatedly.
- Tagline: **"Ralph is a Bash loop"** that is *"deterministically bad in an
  undeterministic world."* You know it will do dumb things; you engineer around
  that with structure and backpressure.

The minimal form:

```bash
while :; do cat PROMPT.md | claude -p ; done
```

---

## 2. The core mechanism

Each iteration is a **fresh agent process with a clean context window**. The
only things that survive between iterations are on disk:

- the **plan / task list** (`IMPLEMENTATION_PLAN.md`, `fix_plan.md`, or `prd.json`)
- the **operational guide** (`AGENTS.md` / `AGENT.md` / `CLAUDE.md`)
- the **specs** (`specs/*.md`)
- a **progress log** (`progress.txt`) — append-only learnings, optional
- the **git history** and the **working tree itself**

The loop body, every pass:

1. **Rebuild context from files** — read the plan, specs, and operational guide.
2. **Select one task** — the single highest-priority incomplete item. *Not* a batch.
3. **Implement** it.
4. **Apply backpressure** — run tests / build / typecheck / lint; fix until green.
5. **Commit** with a descriptive message.
6. **Update state files** — mark the task done, record learnings, refine the plan.
7. **Exit** → the loop restarts with a clean context, or the agent emits a
   **completion signal** and the loop stops.

> The primary context window is best thought of as a **scheduler**, not a
> workspace. Heavy reading/searching/building should be pushed into **subagents**
> so the orchestrating context stays uncluttered (Huntley).

---

## 3. Why it works: the context argument

This is the theoretical core, articulated most fully by LinearB and Huntley.

- **The context window is a finite array.** As it fills, two failure modes hit:
  - **Compaction events** — the sliding window silently drops older tokens; the
    agent "forgets" earlier decisions mid-task.
  - **Context rot** — output quality degrades as utilization climbs. Quality
    falls off a cliff in the **"dumb zone"** (~60–70% full per LinearB; Farr
    frames the **"smart zone"** as ~40–60% utilization).
- **Ralph's fix is deliberate, repeated re-allocation.** Throwing away the
  conversation and re-reading state from files every loop keeps each iteration
  in the smart zone. It looks wasteful (you re-read the spec every time) — that
  inefficiency is *the point*.
- **Consequence:** "Pick the most important item and only do one." A loop that
  tries to do five things fills its context and degrades; a loop that does one
  thing stays sharp.

---

## 4. Components

Across sources the moving parts are consistent (names vary — see
[comparison.md](comparison.md)):

| Component | Role | Common filenames |
|---|---|---|
| **Orchestrator** | the bash loop; caps iterations; detects completion | `loop.sh`, `ralph.sh`, `ralph_loop.sh`, `afk-ralph.sh` |
| **Prompt(s)** | the agent's standing instructions ("the brain") | `PROMPT.md`, `PROMPT_plan.md`, `PROMPT_build.md` |
| **Plan / task list** | working memory; what's done, what's next | `IMPLEMENTATION_PLAN.md`, `fix_plan.md`, `prd.json` |
| **Operational guide** | how to build/test/run; conventions | `AGENTS.md`, `AGENT.md`, `CLAUDE.md` |
| **Specs** | the durable source of truth for *what* to build | `specs/*.md` |
| **Completion signal** | tells the loop to stop | `<promise>COMPLETE</promise>`, `RALPH_STATUS` block |

---

## 5. The three-phase workflow

Clayton Farr's framing — **"3 Phases, 2 Prompts, 1 Loop"** — is the cleanest:

1. **Define requirements.** Write specs (`specs/`). This is the highest-leverage
   step; spec quality is the single biggest predictor of success. A good scope
   test: *the topic of a spec should be describable in one sentence without the
   word "and."*
2. **Planning (plan mode).** Run the loop with `PROMPT_plan.md` to turn specs +
   a study of the codebase into an ordered `IMPLEMENTATION_PLAN.md`. No code is
   written in this phase.
3. **Building (build mode).** Run the loop with `PROMPT_build.md`: one task per
   iteration until the plan is complete.

Frameworks differ on phase 1's artifact (free-form `specs/`, a `PRD.md`, or a
structured `prd.json`) but the shape is the same: **define → plan → build.**

---

## 6. Prompt anatomy

A productive Ralph prompt has four jobs (Kinney's framing, corroborated by all):

1. **Scope** — what to work on and, crucially, **how to choose** the next task
   ("pick the single highest-priority incomplete item").
2. **Backpressure** — the exact mechanical verification commands to run
   (`npm test`, `cargo build`, `pytest`, type check, lint) and the instruction
   to fix until they pass.
3. **Completion signal** — emit a tagged sigil (e.g. `<promise>COMPLETE</promise>`)
   *only* when everything is done and verified.
4. **Stuck behavior** — what to do when blocked: record the blocker in the plan
   and stop or move on, rather than thrash.

**Huntley's "signs"** — durable instructions you add after watching the loop
misbehave. The recurring ones:

- *"Study the codebase before you start — don't assume code isn't implemented;
  search first."*
- *"No placeholder/stub implementations."*
- *"ultrathink"* (ask for extended reasoning).
- *"Capture the **why**"* in tests and comments, so a future context-less loop
  understands intent.

> Tuning the prompt by adding signs is **~80% of the operator's work** (Kinney).
> Don't copy someone else's `PROMPT.md` blindly — it's tuned to *their* failures.

---

## 7. Backpressure (the safety net)

Backpressure = any mechanism that **rejects bad generation**: type systems,
tests, builds, static analysis, hooks, change-data-capture, audit logs.

- Without it, the loop accumulates plausible-looking garbage with no signal.
- "**The wheel has got to turn fast**" (Huntley): fast feedback (quick tests,
  fast builds, sub-minute deploys) lets many loops run productively.
- **Document the *why* of every test.** A future loop has no memory of why a
  test exists; if the reason isn't written down, it may "fix" the test by
  deleting it.
- Critical caveat on parallelism (Huntley): use **many subagents for
  search/read/write**, but **only one** for build/test — concurrent builds
  destroy the backpressure signal.

---

## 8. State & memory files

- **Plan / task list** — the agent's working memory. Marked-up checklist with
  priorities; the agent updates it each loop (marks done, adds discovered tasks,
  records blockers). Regenerated/refined rather than treated as immutable.
- **Operational guide (`AGENTS.md`)** — how to build, test, run; project
  conventions; where things live. The agent maintains it. **It is an operational
  guide, not a changelog** — keep it current, don't let it become an append log.
- **Progress log (`progress.txt`)** — optional append-only learnings.
- **Git history** — the durable record and the undo button.

### Priority numbering convention (Farr / Huntley)

Use a **`999+` numbering** convention in the plan where **higher = more
critical / do-first** (e.g. items numbered `9999` jump the queue). This lets you
inject "do this before anything else" tasks without renumbering everything.

---

## 9. Safety & failure modes

Ralph *will* do dumb things; structure contains the blast radius.

- **`MAX_ITERATIONS` cap** (Kinney) — a hard ceiling so a stuck loop can't run
  forever (and run up a bill).
- **No-progress circuit breaker** (frankbria) — abort after N consecutive loops
  with no commits / repeated identical failures / permission denials.
- **Sandboxing** — run inside Docker / E2B / a constrained box (aihero,
  frankbria). Huntley runs agents with broad permissions on a *dedicated*
  bare-metal NixOS box with fast rollbacks — i.e. the environment, not the
  agent, is the safety boundary.
- **Permissions** — autonomous ("AFK") loops typically pass
  `--dangerously-skip-permissions` (Claude Code) / `--dangerously-allow-all`
  (Amp). frankbria deliberately *avoids* skip-permissions so its
  permission-denial circuit breaker still fires. Human-in-the-loop variants use
  `--permission-mode acceptEdits` instead.
- **Expect to wake up to a broken build** (Huntley). Recovery: `git reset`, or
  feed the failure into a separate model for a rescue plan.
- **Version control is non-negotiable** — commit every loop so any iteration is
  recoverable.

### Common anti-patterns

- Vague acceptance criteria / specs with "and" in the topic (scope too big).
- Oversized task scope (more than one thing per loop).
- No backpressure (nothing rejects bad work).
- No stuck-escape (the loop thrashes on the same failure).
- Copying someone else's prompt without tuning it to your failures.
- Letting `AGENTS.md` rot into a changelog.

---

## 10. Economics

- Roughly **$10/hour** of API spend for a continuous loop (Kinney; LinearB cites
  **~$10.42/hr on Sonnet 4.5**).
- The widely-cited anecdote: a **~$50k contract MVP delivered for ~$297** in API
  costs.
- Implication: compute is cheap relative to engineer time; the expensive input
  is **specification and tuning**, not tokens.

---

## 11. Scaling: Ralph → Gas Town

A staged progression (LinearB, attributing "Gas Town" to Steve Yegge):

1. **One agent** — a single Ralph loop. Master this first.
2. **Two agents.**
3. **~Ten agents.**
4. **"Gas Town"** — full multi-agent orchestration.

> **Don't skip stages.** Huntley's repeated guidance is to **stay monolithic** —
> one process, one repo, one task per loop — and resist agent-to-agent
> complexity until the single loop is genuinely reliable.

---

## 12. When to use Ralph (and when not to)

**Good fit**

- **Greenfield** work — Huntley reports it can carry a new project to ~90% done.
- Well-specified, mechanically-verifiable tasks (strong tests/types = strong
  backpressure).
- Reverse-engineering / "clean-rooming" — point Ralph at an artifact and have it
  rebuild from inferred specs (the demos: cloning Nomad, rebuilding Tailscale).
- Large, repetitive, or long-horizon work that benefits from running unattended.

**Poor fit**

- Tasks with weak or no automated verification.
- Sprawling brownfield changes without specs (reverse-engineer specs first).
- Anything where "deterministically bad" iterations are unacceptable without a
  sandbox and rollback.

> **Senior engineers are still required.** Ralph amplifies operator skill — "LLMs
> are mirrors of operator skill" (Kinney). Good specs, good backpressure, and
> good tuning come from experience; without them the loop produces confident
> nonsense faster.

---

## 13. The mindset (Huntley's "everything is a loop")

- Stop building "brick by brick" (Jenga); treat software as **"clay on the
  pottery wheel"** — shaped continuously by the turning loop.
- Ralph runs in **forward mode** (autonomous building) and **reverse mode**
  (clean-rooming an existing artifact into specs, then rebuilding).
- The deeper claim: LLMs are **programmable computers**, and the loop +
  context-engineering is the program. Context engineering generalizes across
  tasks; the loop is the substrate.

---

*For names and per-implementation specifics, see [comparison.md](comparison.md).
For a one-page jog, see [cheatsheet.md](cheatsheet.md).*
