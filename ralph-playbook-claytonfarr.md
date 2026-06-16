# The Ralph Playbook (Clayton Farr) — Condensed Reference

**Source:** <https://claytonfarr.github.io/ralph-playbook/>

> Curated playbook by Clayton Farr documenting the "Ralph" autonomous-coding methodology
> originally devised by Geoff Huntley (<https://ghuntley.com/ralph/>).

---

## Overview

**Ralph** is an autonomous coding methodology that runs Claude (or another LLM agent) in
continuous loops, maintaining context across iterations through **file-based state
management**. Each cycle follows:

```
read plan → select task → implement → test → commit → reset context → repeat
```

**Core insight:**

> "Fresh context each iteration keeps the AI in its smart zone. File-based memory persists
> learnings. Backpressure forces self-correction."

---

## Architecture: Three Phases, Two Prompts, One Loop

1. **Phase 1 — Define Requirements** (an LLM conversation, not a loop)
   - Identify **Jobs to Be Done (JTBD)**
   - Break each JTBD into **topics of concern**
   - Generate a `specs/FILENAME.md` for each topic

2. **Phase 2 / 3 — The Ralph Loop** (two operating modes)
   - **PLANNING mode** — gap analysis (specs vs. code); produces a prioritized task list
   - **BUILDING mode** — implements from the plan, commits, and updates the plan as a side effect

### Core vocabulary

| Term | Definition |
|------|-----------|
| **JTBD** | High-level user need or outcome |
| **Topic of Concern** | A distinct aspect within a JTBD |
| **Spec** | Requirements document for one topic |
| **Task** | Unit of work derived from comparing specs against code |

**Topic Scope Test:** Describe the topic in one sentence *without using "and."* If a
conjunction joins unrelated capabilities, split it into multiple topics.

---

## Key Principles

### 1. Context is everything

- Of an advertised 200K+ token window, only ~176K is truly usable.
- Aim for **40–60% context utilization** — the model's "smart zone."
- Tight tasks + **one task per loop** = ~100% smart-zone utilization.
- Use the main agent as a *scheduler*; spawn **subagents** for expensive work.
- Prefer **Markdown over JSON** for token efficiency.

### 2. Steering Ralph: patterns + backpressure

**Upstream steering (shape inputs):**
- Deterministic setup — the same files load every loop (`PROMPT.md` + `AGENTS.md`).
- Existing code patterns shape generated output.
- Add utilities/helpers to guide Ralph toward the correct patterns.

**Downstream steering (constrain outputs):**
- Create **backpressure** via tests, builds, and lints.
- `AGENTS.md` specifies the project-specific validation commands.
- Use **LLM-as-judge** tests for subjective criteria (aesthetics, tone, UX feel).

### 3. Let Ralph Ralph

- Trust the LLM to self-identify, self-correct, and self-improve.
- Use protection: `--dangerously-skip-permissions` **requires** sandbox isolation.
- Philosophy: "Run in isolated environments with minimum viable access."

### 4. Move outside the loop

- Observe and course-correct early.
- "Tune like a guitar" — adjust reactively when Ralph fails in specific ways.
- The plan is **disposable** — regenerate it when wrong (costs only one planning loop).

**Regenerate the plan when:**
- Ralph implements the wrong things or duplicates work.
- The plan feels stale or out of sync with the current state.
- Significant spec changes have been made.
- You're confused about what's actually done.

---

## Loop Mechanics

### Task selection & continuation

The simplest form is a bash loop feeding `PROMPT.md` to Claude continuously:

```bash
while :; do cat PROMPT.md | claude ; done
```

**The mechanism:**
1. Bash loop runs → feeds the prompt to `claude`.
2. Agent completes one task → updates `IMPLEMENTATION_PLAN.md` on disk, commits, exits.
3. Bash loop restarts immediately → a **fresh context window**.
4. Agent reads the updated plan → picks the next most important thing.

> `IMPLEMENTATION_PLAN.md` persists on disk between iterations and acts as **shared state**
> between otherwise isolated loop executions.

### Task execution

Each task keeps working against backpressure (failing tests/builds) until it passes —
creating a *pseudo inner-loop* of self-correction within a single response, powered by tool
use and subagents.

**Control mechanisms:**
- **Scope discipline** — the prompt instructs "one task" and "commit when tests pass."
- **Backpressure** — test/build failures force fixes before committing.
- **Natural completion** — the agent exits after a successful commit.

---

## File Structure

```
project-root/
├── loop.sh                      # Task selection loop
├── PROMPT_build.md              # Build mode instructions
├── PROMPT_plan.md               # Planning mode instructions
├── AGENTS.md                    # Operational guide (loaded each iteration)
├── IMPLEMENTATION_PLAN.md       # Task list (generated/updated by Ralph)
├── specs/                       # Requirement specs
│   ├── [topic-a].md
│   └── [topic-b].md
├── src/                         # Application source code
└── src/lib/                     # Shared utilities & components
```

### `AGENTS.md`

The single canonical "heart of the loop" — a concise operational guide for building/running
the project. Includes:
- Build commands
- Test commands (targeted *and* full suite)
- Typecheck / lint commands
- Operational learnings from Ralph's discoveries

> **Critical rule:** It is NOT a changelog or progress diary. Status, progress, and planning
> belong in `IMPLEMENTATION_PLAN.md`, not here.

### `IMPLEMENTATION_PLAN.md`

- Created via PLANNING mode.
- Updated during BUILDING (mark complete, add discoveries, document bugs).
- Self-correcting — can create new specs if they are missing.
- No pre-specified template — let the LLM dictate the format.

### `specs/*`

- One Markdown file per topic of concern.
- The **source of truth** for what should be built.
- Created during the requirements phase.
- Can be updated when inconsistencies are discovered.

---

## Enhanced `loop.sh` Example

```bash
#!/bin/bash
# Usage: ./loop.sh [plan|build] [max_iterations]
# Examples:
#   ./loop.sh              # Build mode, unlimited
#   ./loop.sh 20           # Build mode, max 20 tasks
#   ./loop.sh plan         # Plan mode
#   ./loop.sh plan 5       # Plan mode, max 5 iterations

MODE="build"
PROMPT_FILE="PROMPT_build.md"

if [ "$1" = "plan" ]; then
    MODE="plan"
    PROMPT_FILE="PROMPT_plan.md"
    MAX_ITERATIONS=${2:-0}
elif [ "$1" = "build" ]; then
    MAX_ITERATIONS=${2:-0}
elif [[ "$1" =~ ^[0-9]+$ ]]; then
    MAX_ITERATIONS=$1
else
    MAX_ITERATIONS=0
fi

ITERATION=0
CURRENT_BRANCH=$(git branch --show-current)

echo "Mode: $MODE | Prompt: $PROMPT_FILE | Branch: $CURRENT_BRANCH"
[ $MAX_ITERATIONS -gt 0 ] && echo "Max: $MAX_ITERATIONS iterations"

while true; do
    [ $MAX_ITERATIONS -gt 0 ] && [ $ITERATION -ge $MAX_ITERATIONS ] && break

    cat "$PROMPT_FILE" | claude -p \
        --dangerously-skip-permissions \
        --output-format=stream-json \
        --model opus \
        --verbose

    git push origin "$CURRENT_BRANCH" || \
        git push -u origin "$CURRENT_BRANCH"

    ITERATION=$((ITERATION + 1))
done
```

**Claude CLI flags used:**
- `-p` — headless mode (non-interactive, reads from stdin)
- `--dangerously-skip-permissions` — bypasses permission prompts (sandbox required)
- `--output-format=stream-json` — structured JSON output
- `--model opus` — uses Opus for complex reasoning
- `--verbose` — detailed execution logging

---

## Prompt Structure

### General pattern

- **Phase 0 (0a, 0b, 0c)** — Orient: study specs, source location, and the current plan.
- **Phases 1–4** — Main instructions: task, validation, commit.
- **`999...` numbering** — Guardrails/invariants. A higher number = more critical.

### Key language patterns (Geoff's specific phrasing)

- "study" (not "read" or "look at") — implies deep investigation
- "don't assume not implemented" (critical — always search first)
- "using parallel subagents" / "up to N subagents"
- "only 1 subagent for build/tests" (serializes for backpressure control)
- "Think extra hard" (now "Ultrathink")
- "capture the why"
- "keep it up to date"
- "resolve them or document them"

### `PROMPT_plan.md` — key instructions

Study specs and current code, compare specs against actual implementation via gap analysis,
create/update `IMPLEMENTATION_PLAN.md` with prioritized tasks.
**"Plan only. Do NOT implement anything."**

### `PROMPT_build.md` — key instructions

1. Study specifications and the existing plan.
2. Choose the most important unimplemented item.
3. Search the codebase (don't assume things are missing).
4. Implement and run tests.
5. Update the plan with findings when issues are discovered.
6. Commit when tests pass and push changes.

> "Important: When authoring documentation, capture the *why* — tests and implementation
> importance."

---

## Enhancements

### 1. Acceptance-driven backpressure

Derive test requirements during planning from acceptance criteria. This prevents "cheating" —
Ralph can't claim a task is done without the appropriate tests passing.

| Layer | Lives in | Describes | Example |
|-------|----------|-----------|---------|
| **Acceptance criteria** | specs | Behavioral outcomes, observable results | "Extracts 5–10 dominant colors from any uploaded image"; "Processes images <5MB in <100ms" |
| **Test requirements** | plan | Verification points derived from criteria | "Required tests: extract 5–10 colors; performance <100ms" |
| **Implementation approach** | Ralph decides | Technical decisions | ~~"Use K-means clustering with 3 iterations"~~ (NOT specified) |

- **Phase 2 enhancement:** planning prompt adds — "For each task in the plan, derive required
  tests from acceptance criteria in specs."
- **Phase 3 enhancement:** building prompt adds — "All required tests must exist and pass
  before committing."

### 2. Non-deterministic backpressure: LLM-as-judge

For subjective criteria (tone, aesthetics, UX feel), use LLM-as-judge tests with a binary
pass/fail. Non-determinism is acceptable because the loop provides **eventual consistency**
through iteration.

Core fixture in `src/lib/llm-review.ts`:

```typescript
interface ReviewResult {
  pass: boolean;
  feedback?: string; // Only when pass=false
}

function createReview(config: {
  criteria: string;      // What to evaluate (behavioral)
  artifact: string;      // Text content OR screenshot path
  intelligence?: "fast" | "smart";
}): Promise<ReviewResult>;
```

**Intelligence levels:**
- `fast` (default) — quick, cost-effective models (e.g., Gemini 3.0 Flash)
- `smart` — higher-quality judgment for nuanced criteria (e.g., GPT 5.1)

Both support multimodal (text + vision). Artifact type is auto-detected (`.png`/`.jpg`/`.jpeg`
→ vision).

```typescript
// Text evaluation
test("welcome message tone", async () => {
  const result = await createReview({
    criteria: "Message uses warm, conversational tone",
    artifact: message,
  });
  expect(result.pass).toBe(true);
});

// Vision evaluation
test("dashboard visual hierarchy", async () => {
  await page.screenshot({ path: "./tmp/dashboard.png" });
  const result = await createReview({
    criteria: "Layout demonstrates clear visual hierarchy with obvious primary action",
    artifact: "./tmp/dashboard.png",
  });
  expect(result.pass).toBe(true);
});
```

### 3. Ralph-friendly work branches (scoped planning)

For feature-branch workflows, create a scoped plan upfront per branch instead of asking Ralph
to "filter" at runtime.

> **Key principle:** Scope at *plan creation* (deterministic), not at *task selection*
> (probabilistic).

```bash
# Full planning on main
./loop.sh plan

# Create work branch
git checkout -b ralph/user-auth-oauth

# Scoped planning on the work branch
./loop.sh plan-work "user authentication with OAuth and session management"

# Build from the scoped plan (no filtering needed)
./loop.sh 20

# PR creation when work is complete
gh pr create --base main --head ralph/user-auth-oauth --fill
```

`loop.sh` addition:

```bash
elif [ "$1" = "plan-work" ]; then
    if [ -z "$2" ]; then
        echo "Error: plan-work requires work description"
        exit 1
    fi
    MODE="plan-work"
    WORK_DESCRIPTION="$2"
    PROMPT_FILE="PROMPT_plan_work.md"
    MAX_ITERATIONS=${3:-5}
fi
```

- Plan-work mode prevents running on `main`/`master` — create a work branch first.
- `PROMPT_plan_work.md` is identical to `PROMPT_plan.md` but adds scoping:
  "Create a SCOPED implementation plan for work: '${WORK_SCOPE}' only … containing ONLY tasks
  directly related to this work scope. Be conservative — if uncertain whether a task belongs,
  exclude it."

### 4. JTBD → Story Map → SLC release push

Connect audience context to product releases through story mapping and the
**Simple / Lovable / Complete (SLC)** framework.

Conceptual mapping:

```
Audience (who)
  └── has JTBDs (desired outcomes)
        └── fulfilled by Activities (means to achieve outcomes)
```

Story map structure:

```
              UPLOAD    →   EXTRACT    →   ARRANGE     →   SHARE
basic         auto                           export
bulk          palette        templates       collab
batch         AI themes      auto-layout     embed
```

SLC release examples:
- **Palette Picker:** upload, extract, export (simple, complete, lovable)
- **Mood Board:** adds arrangement (creative expression)
- **Design Studio:** batch, AI themes, embeddable (professional features)

Operationalizing with Ralph:
1. **Requirements phase** — define audience & JTBDs → `AUDIENCE_JTBD.md`; define activities &
   capability depths → `specs/*.md`.
2. **Planning phase** — use the `PROMPT_plan_slc.md` variant; the agent sequences activities
   into a journey map, recommends the next SLC release slice, and plans only that narrow scope.
3. **Building phase** — standard building prompt against the scoped plan.

- `AUDIENCE_JTBD.md` — single source of truth for WHO and their desired OUTCOMES; referenced
  during spec creation and SLC planning.
- `PROMPT_plan_slc.md` — planning prompt that studies `AUDIENCE_JTBD.md`, sequences activities
  into a user journey map, determines the next SLC release using Opus (ultrathink), and plans
  only the most valuable slice.

### 5. Specs audit mode

A dedicated loop mode for generating/maintaining specs with enforced quality rules.

**When to use:** after writing/updating specs, to enforce consistency.

**What it does:**
- Iterates over `specs/*` files.
- Enforces quality rules (behavioral outcomes only, no code, no implementation details).
- Validates topic scoping using the "one sentence without *and*" test.
- Creates new spec files as needed.
- Applies consistent naming: `NN-kebab-case.md`.

```bash
./loop.sh specs        # Unlimited iterations
./loop.sh specs 3      # Max 3 iterations
```

`loop.sh` addition:

```bash
elif [ "$1" = "specs" ]; then
    MODE="specs"
    PROMPT_FILE="PROMPT_specs.md"
    MAX_ITERATIONS=${2:-0}
```

`PROMPT_specs.md` key rules:
- "NEVER add code blocks or suggest how a variable should be named."
- Acceptance criteria = behavioral outcomes; test requirements = verification points;
  implementation approach = Ralph's decision.
- Each topic must pass the one-sentence-without-*and* test.
- Apply rules to all existing files using up to 100 parallel subagents.
- Naming convention: `NN-kebab-case.md`.

### 6. Reverse-engineering brownfield projects into specs

Bring an existing codebase into Ralph's workflow by reverse-engineering code into specs before
planning new work.

**When to use:** inherited codebase with no specs; want to use Ralph on an existing project;
adding features to a brownfield project.

**Flow:**
1. Point the agent at the codebase with `PROMPT_reverse_engineer_specs.md`.
2. Agent investigates the implementation (implementation-aware).
3. Agent writes specs describing actual behavior (implementation-free).
4. Specs land in `specs/`.
5. Repeat for all specs.
6. Proceed with normal Ralph phases (plan → build).

**Two-phase process:**
- **Phase 1 (Investigation):** trace every entry point, branch, and code path; map data flow,
  side effects, state mutations, error handling, concurrency, config-driven paths, and implicit
  behavior.
- **Phase 2 (Output):** zero implementation details — no function/class/variable names, file
  paths, or library references. A different team on a different stack must be able to reimplement
  from the spec alone.

> **Critical principle:** "Document reality, not intent. Bugs are features. Never add behaviors
> the code doesn't implement."

- **Scope boundaries:** when tracing leaves the topic, stop. Document only what crosses the
  boundary (sent/received).
- **File format:** Markdown in `specs/`. Includes topic statement, scope (in/boundaries), data
  contracts, behaviors (execution order), and state transitions. Mark notable/surprising
  behavior, unreachable paths, and shared cross-topic behavior. Naming: `NN-kebab-case.md`.

**Considerations:**
- Mono-repos may need scoping to specific packages/services.
- Entire-domain spec generation is a larger investment.
- Major refactors after Ralph builds can invalidate specs — re-run periodically.
- Topic granularity is a judgment call (too broad = unwieldy; too narrow = file sprawl).
- Documented behavior includes bugs (define what *is*, not what *should be*).
- Token cost is significant on large codebases.

---

## Guardrails (numbered `999+`)

Higher numbers indicate higher criticality. Representative examples:

- `999` — "When authoring documentation, capture the why — tests and implementation importance."
- `999999` — "Single sources of truth, no migrations/adapters."
- `9999999` — "Create a git tag when there are no build/test errors. Increment patch version
  (0.0.0 → 0.0.1)."
- `999999999` — "Keep `IMPLEMENTATION_PLAN.md` current — future work depends on this."
- `9999999999` — "When learning new run procedures, update `AGENTS.md` — brief, operational only."
- `99999999999` — "For any bugs noticed, resolve or document in the plan even if unrelated."
- `999999999999` — "Implement functionality completely. Placeholders waste effort."

---

## Notable Takeaways

1. **Context window is the constraint.** Everything flows from it: tight tasks + one task per
   loop = ~100% smart-zone utilization.
2. **File-based state is elegantly simple.** No sophisticated orchestration — just a dumb bash
   loop restarting the agent, which reads the plan file each iteration.
3. **Eventual consistency through iteration.** Ralph can fail in expected ways; observe patterns,
   add guardrails, and tune reactively. Non-determinism is manageable.
4. **Backpressure is critical.** Tests/builds force self-correction, and this can extend beyond
   code validation to subjective criteria (LLM-as-judge).
5. **The plan is disposable.** If it's wrong, regenerate it (one planning loop) — cheaper than
   watching Ralph go in circles.
6. **Move outside the loop.** Your job is the engineering setup and environment, not directing
   every decision. Observe, tune the signals (prompts, code patterns, `AGENTS.md`), and trust
   Ralph.
7. **Behavioral specs, implementation freedom.** Acceptance criteria specify outcomes; test
   requirements specify verification; implementation approach is Ralph's to decide.

---

## References

- **Original source:** Geoff Huntley — <https://ghuntley.com/ralph/>
- **Creator:** Geoff Huntley ([@GeoffreyHuntley](https://x.com/GeoffreyHuntley))
- **Playbook curator:** Clayton Farr ([@ClaytonFarr](https://x.com/ClaytonFarr))
- **GitHub repo:** <https://github.com/ClaytonFarr/ralph-playbook>
- **License:** MIT (third-party screenshots excluded)
- Geoff's overview video: <https://www.youtube.com/watch?v=O2bBWDoxO4s>

### Community references

- Matt Pocock — <https://x.com/mattpocockuk/status/2008200878633931247>
- Ryan Carson — <https://x.com/ryancarson/status/2008548371712135632>
- Geoff's walkthrough example — <https://x.com/ClaytonFarr/status/2010780371542241508>
- Thariq (acceptance-driven thinking) — <https://x.com/trq212/status/2005315275026260309>
- Jason Cohen (Simple, Lovable, Complete) — <https://longform.asmartbear.com/slc/>
- User story mapping (Nielsen Norman Group) — <https://www.nngroup.com/articles/user-story-mapping/>

### Contributors

- [@terry-xyz](https://github.com/terry-xyz) · [@blackrosesxyz](https://x.com/blackrosesxyz) —
  loop streaming, `parse_stream.js`, specs audit mode
- Jake Cukjati · [@Byte0fCode](https://x.com/Byte0fCode) ·
  [@jackstine](https://github.com/jackstine) — reverse-engineering brownfield projects
