# The Ralph Loop

> A condensed reference based on Steve Kinney's article.
>
> **Source:** https://stevekinney.com/writing/the-ralph-loop

## What Is the Ralph Loop?

The Ralph Loop is an autonomous coding technique built on a `while true` bash
loop that repeatedly feeds the same prompt file to Claude via the CLI, giving
the agent a **fresh, clean context window on every iteration**.

> "A while true loop, a prompt file, and a clean context window on every iteration."

The simplest possible form:

```bash
while :; do cat PROMPT.md | claude -p; done
```

## Why It Works: Solving Context Rot

The loop solves **context rot** — the degradation of LLM output quality as
conversation history accumulates. Instead of one long-running conversation, the
loop uses the **filesystem as persistent memory**.

- Each iteration starts with a completely clean context.
- The agent reads the current codebase state from disk.
- Git history and progress files persist perfectly across iterations.
- No stale information accumulates in the context window.

> "Your files and git history are a better memory layer than the LLM's context window."

## The Four Components

1. **Bash script (the orchestrator)** — runs the loop with iteration limits,
   checks for the completion signal, handles cleanup. Deliberately minimal to
   prevent runaway costs.
2. **`PROMPT.md` (the brain)** — re-read from disk each iteration (so it can be
   edited mid-run). Defines task scope, verification, and completion criteria,
   plus stuck-behavior instructions. Makes no framework or ambient-knowledge
   assumptions.
3. **Filesystem (the memory)** — progress files, task lists, git history. The
   agent orients itself solely from disk state.
4. **Completion signal** — a distinctive string (e.g. `<promise>COMPLETE</promise>`)
   wrapped in tags so the bash script can `grep` for it to exit the loop without
   accidental matches.

## Minimal Working Implementation

```bash
#!/bin/bash
set -e

MAX_ITERATIONS=${1:-10}
PROMPT_FILE="PROMPT.md"
iteration=0

while [ $iteration -lt $MAX_ITERATIONS ]; do
  iteration=$((iteration + 1))
  echo "=== Iteration $iteration / $MAX_ITERATIONS ==="

  output=$(cat "$PROMPT_FILE" | claude -p)
  echo "$output"

  if echo "$output" | grep -q '<promise>COMPLETE</promise>'; then
    echo "Task complete at iteration $iteration"
    exit 0
  fi
done

echo "Hit max iterations without completion"
exit 1
```

> **Critical warning:** Always set `MAX_ITERATIONS`. Without it, a runaway loop
> can generate $500+ API bills.

## The Three-Phase Workflow

1. **Discovery** — an interactive Claude Code session to explore the problem
   space and iterate on requirements (use Plan mode).
2. **Specification** — convert learnings into concrete artifacts (PRD, task
   list, standards document). Specification quality is *"the single biggest
   predictor of whether the loop succeeds or fails."*
3. **Execution** — run the loop against the spec. `PROMPT.md` references the
   spec; the agent picks tasks iteratively.

Skipping discovery/specification and running the loop with vague requirements
produces useless output — garbage in, garbage out.

## Prompt Structure: Four Essential Elements

- **Scope** — one unit of work per iteration, e.g. *"Pick the next incomplete
  task from `ROADMAP.md` and implement it."* Too-broad scope causes thrashing.
- **Backpressure (mechanical verification)** — name the actual commands
  (`bun test`, `npm run typecheck`, `eslint .`) the agent must run after every
  change. Without it, *"the loop will cheerfully commit broken code and tell you
  it's done."*
- **Completion signal** — a distinctive XML-tagged string like
  `<promise>WORK_COMPLETE</promise>` to prevent accidental termination.
- **Stuck behavior** — instructions for when progress stalls, e.g. document
  blockers in `progress.txt`, commit, then output `<promise>WORK_STUCK</promise>`.
  Prevents infinite loops on impossible tasks.

## Example Prompt Template

```markdown
## Task

Read `ROADMAP.md` for full project context. Pick the next
incomplete task and implement it.

## Instructions

1. Read the task file and understand this specific task's scope
2. Write a failing test for expected behavior
3. Implement until test passes
4. Run ALL verification commands:
   ```bash
   bun test
   bun run typecheck
   bun run lint
   ```
5. Fix any failures — do not proceed until all pass
6. Update `progress.txt` with what you completed
7. Commit your changes

## When done

If task is fully implemented and all verification commands exit 0:

    <promise>WORK_COMPLETE</promise>

## If stuck

If you cannot make progress after genuine attempt:

- Document what's blocking you in `progress.txt`
- Commit what you have
- Output: <promise>WORK_STUCK</promise>
```

## State Persistence Approaches

- **Append-only log (`progress.txt`)** — each iteration logs what it completed.
  Simple; works well for linear task lists.
- **JSON with pass/fail flags (e.g. `prd.json`)** — each task has a
  `passes: false` field flipped on completion; agent picks the highest-priority
  uncompleted story.
- **Pure git history** — no separate state file; the agent runs `git log` to
  determine progress. The most minimal approach.
- **Steering files (`AGENTS.md`, `CLAUDE.md`)** — read every iteration, carry
  project-specific operational knowledge, can be edited between iterations.
  Underappreciated but powerful for course-correction.

## Tuning and Iteration

The initial prompt is only ~20% of the work; the remaining ~80% is watching and
adjusting based on observed failures.

> "Instead of prescribing everything upfront, observe and adjust reactively.
> When the agent fails a specific way, add a 'sign' to help it next time."

"Signs" include:

- Explicit prompt guardrails addressing observed mistakes.
- Steering files with operational knowledge.
- Code patterns as examples (the agent discovers and follows them).

Self-referential feedback loops are especially effective — tests show whether
output is correct, LLVM IR demonstrates compilation success, etc. Example: an
engineer wrote coding standards with Claude, reviewed them, then ran one loop
prompt — *"Make the codebase match these standards"* — and the agent built its
own six-hour refactor plan.

## Common Anti-Patterns

- **Vague success criteria** — e.g. "Build a todo API and make it good." No
  verification or completion definition, so the agent either claims instant
  success or loops forever.
- **Oversized scope** — e.g. "Build a complete e-commerce platform" in one
  prompt. The agent bounces between unfinished subsystems. Fix: break into
  phases with discrete completion criteria.
- **No backpressure** — the agent commits plausible-looking but broken code,
  and the next iteration builds on it. The most common failure mode.
- **No stuck escape** — the agent endlessly repeats an impossible task (one
  observed run spent 50 iterations on a task needing a human decision at
  iteration 3).
- **Copy-pasting external prompts** — community prompts need their context to
  work. *"It won't make sense unless you know how to wield it."*

## Economics and Cost

- Running Claude via the bash loop costs roughly **$10/hour** in API credits.
- Field example: an engineer delivered **$50,000** of contract work (tested,
  reviewed, shipped) via a Ralph loop for a total API cost of **$297**.
- Practical tiers:
  - $20/month Claude Code tier — a single Ralph session can consume the weekly limit.
  - $100+/month tier — practical for regular use.
- Versus multi-day manual back-and-forth, the API cost is *"a rounding error
  compared to the engineering time."*

## Plugin vs. Raw Bash Loop

**Claude Code Plugin** (`/ralph-loop "task" --max-iterations 20`)

- Convenient.
- Context accumulates across iterations (a stop hook intercepts exit).
- Best for short, focused tasks that benefit from seeing prior attempts.

**Raw Bash Loop**

- Completely clean context per iteration — prevents context rot more effectively.
- More composable (wrap in scripts, chain with CI).
- Preferred by experienced practitioners for longer runs, multi-story PRDs,
  overnight work, and runs over ~10 iterations.

## Getting Started: Recommended Progression

1. **Write a PRD** — interactively in Claude Code (use Plan mode). Finish the
   spec before touching the loop.
2. **Write `PROMPT.md`** — start minimal; resist premature guardrails. Include
   task file reference, verification, and completion/stuck signals.
3. **Run manually once** — `cat PROMPT.md | claude -p`. Did it pick the right
   task, run tests, commit sensibly?
4. **Run manually a few more times** — watch for patterns and failure modes;
   plan adjustments (prompt, `CLAUDE.md`, code patterns).
5. **Wrap in the loop** — only now. Start with a 5–10 iteration cap; raise it as
   confidence grows.
6. **Add per-iteration commits** — rollback points, auditability, and a `git
   log` the next iteration can review.
7. **Run unattended** — overnight execution. Review outputs like any pull
   request; treat results as a draft, not a deployment.

## When It Works (and When It Doesn't)

**Works well for:**

- Greenfield features built from a PRD.
- TDD workflows (failing test → implementation → mechanical verification).
- Mechanical refactors ("match these standards" across many files).
- Language/framework porting that is well-scoped and mechanically verifiable.
- Standards enforcement on a cron (single overnight run, small review set).

**Doesn't work for:**

- Architectural decisions (require discovery, not execution).
- Ambiguous requirements ("make it feel polished" defeats convergence).
- Tightly coupled changes across files needing a single context.
- Deep existing codebases with no room for both code and changes in context.

## Notable Achievements

- **Geoffrey Huntley** (technique originator) ran Ralph for three months to
  build a complete programming language with an LLVM compiler producing binaries
  for macOS, Linux, and Windows. The language was never in training data — the
  model learned it while building the compiler.
- Huntley also ran Ralph to autonomously identify and resolve infrastructure
  faults while "DJing" (fully unattended).
- A YC hackathon team ported complete codebases between languages overnight.

## Core Philosophy

> "Success depends on writing good prompts, not just having a good model. LLMs
> are mirrors of operator skill."

- The **prompt is the program**, the **bash loop is the runtime**, the
  **filesystem is the state store**, and the **LLM is the execution engine**.
- The engineering skill is *"defining what 'correct' looks like clearly enough
  that a system can verify it."*
- The real value isn't the bash script — it's the discipline of precise
  specifications, mechanical verification, and clear acceptance criteria.
- Skill compounds through *"sitting on the loop — watching, tuning, learning how
  this new kind of computer actually behaves."*
