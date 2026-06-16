# How to Ralph Wiggum (ghuntley/how-to-ralph-wiggum)

**Source:** https://github.com/ghuntley/how-to-ralph-wiggum

> Repo description: *"The Ralph Wiggum Technique—the AI development methodology that reduces software costs to less than a fast food worker's wage."*

---

## What this repository actually is

`ghuntley/how-to-ralph-wiggum` is a **fork of `ClaytonFarr/ralph-playbook`** (`fork: true`, `parent/source: ClaytonFarr/ralph-playbook`, default branch `main`). It contains two distinct layers that are worth understanding separately:

1. **The Ralph Playbook (`README.md`)** — a long-form prose guide by Clayton Farr that distils Geoffrey Huntley's ("Ralph") autonomous-agent methodology into a practical playbook: *Three Phases, Two Prompts, One Loop*. This is philosophy + canonical prompt templates. It is provider-agnostic but written around Claude.
2. **"Ralph for Claude Code" tooling** — a substantial, production-grade bash implementation of the loop (lineage: `frankbria/ralph-claude-code`, per `package.json` and `.ralphrc` template comments). This is the `ralph_loop.sh` (~154 KB), the `lib/` library modules, installer, templates, examples, docs, and an extensive bats test suite. It implements rate limiting, circuit breakers, exit detection, sandboxing (Docker + E2B), GitHub issue import/lifecycle, and queue management.

In short: the **README teaches the method**, the **rest of the repo is a real CLI tool** (`ralph`, `ralph-setup`, `ralph-enable`, `ralph-import`, `ralph-queue`, `ralph-monitor`, `ralph-stats`, `ralph-migrate`) that operationalizes it.

The core idea (from Geoff's original minimal form):

```bash
while :; do cat PROMPT.md | claude ; done
```

A dumb bash loop repeatedly feeds a prompt to the agent; the agent reads disposable on-disk state (a plan, a spec set, an operational guide), does **one task per iteration** with a fresh context window, commits, and exits — then the loop restarts.

---

## Repository structure

```
how-to-ralph-wiggum/
├── README.md                       # "The Ralph Playbook" (the methodology, ~62 KB)
├── CLAUDE.md                       # Guidance for Claude Code working in this repo (~38 KB)
├── CONTRIBUTING.md
├── LICENSE                         # MIT
├── package.json                    # name: ralph-claude-code; bats test scripts
├── package-lock.json
├── Dockerfile                      # Default ralph-sandbox image (node:20-slim + claude CLI)
├── .dockerignore  .gitattributes  .gitignore
│
│   # ── Top-level executable scripts ──
├── ralph_loop.sh                   # MAIN autonomous loop (~154 KB)
├── ralph_monitor.sh                # Live tmux monitoring dashboard
├── ralph_import.sh                 # PRD / GitHub-issue → Ralph project (~64 KB)
├── ralph_queue.sh                  # Batch / issue-queue management
├── ralph_enable.sh                 # Interactive wizard to enable Ralph in existing repo
├── ralph_enable_ci.sh              # Non-interactive enable (CI/automation, --json)
├── ralph-stats.sh                  # Metrics analytics over .ralph/logs/metrics.jsonl
├── migrate_to_ralph_folder.sh      # Migrate flat layout → .ralph/ subfolder (v0.10.0+)
├── create_files.sh                 # Bootstrap script that creates the whole Ralph system
├── install.sh   uninstall.sh       # Global install/uninstall to ~/.local/bin + ~/.ralph
├── setup.sh                        # ralph-setup: scaffold a new Ralph project
├── sample-prd.md                   # Example PRD for ralph-import
├── IMPLEMENTATION_PLAN.md          # This repo's own Ralph plan
├── IMPLEMENTATION_STATUS.md        # This repo's own status
├── SPECIFICATION_WORKSHOP.md       # Spec-authoring workshop guide
│
├── lib/                            # Shared bash library modules (sourced by ralph_loop.sh)
│   ├── circuit_breaker.sh          # Runaway-loop / stagnation detection (CLOSED/HALF_OPEN/OPEN)
│   ├── response_analyzer.sh        # Parse Claude output; completion + exit-signal detection (~53 KB)
│   ├── enable_core.sh              # Shared enable logic, template generation
│   ├── wizard_utils.sh             # Interactive prompt helpers (bash 3.x safe)
│   ├── task_sources.sh             # Import tasks from beads / GitHub / PRD
│   ├── issue_analyzer.sh           # 0–100 heuristic completeness scoring of issue PRDs
│   ├── github_lifecycle.sh         # GitHub issue lifecycle (comments, PR, close, follow-ups)
│   ├── queue_manager.sh            # Queue state primitives (.ralph/queue.json)
│   ├── sandbox_docker.sh           # Docker sandbox execution
│   ├── sandbox_e2b.sh + e2b_helper.py  # E2B cloud sandbox execution (Python transport)
│   ├── sync.sh                     # Backend-agnostic sandbox file-sync filtering (.ralphignore)
│   ├── file_protection.sh          # validate_ralph_integrity() — protect .ralph/ + .ralphrc
│   ├── date_utils.sh  timeout_utils.sh  log_utils.sh
│
├── templates/                      # Seed files copied into new projects' .ralph/
│   ├── PROMPT.md                   # Default loop prompt (RALPH_STATUS protocol)
│   ├── AGENT.md                    # Build/run instructions + quality standards
│   ├── fix_plan.md                 # Prioritized TODO template (with Optional section)
│   ├── ralphrc.template            # Annotated .ralphrc config
│   ├── .ralphignore  .gitignore
│   └── specs/.gitkeep
│
├── examples/
│   ├── simple-cli-tool/            # Minimal: PROMPT.md + fix_plan.md, no specs/
│   │   └── .ralph/{PROMPT.md, fix_plan.md}
│   └── rest-api/                   # Medium: PROMPT.md + fix_plan.md + specs/api.md
│       └── .ralph/{PROMPT.md, fix_plan.md, specs/api.md}
│
├── docs/
│   ├── CLI_OPTIONS.md   QUEUE_MANAGEMENT.md
│   ├── DOCKER_SANDBOX.md  E2B_SANDBOX.md  SANDBOX_SYNC.md
│   ├── adr/                        # 0001 multi-provider abstraction, 0002 adapter contract
│   ├── archive/2025-10-milestones/ # Phase completion + expert panel review
│   ├── code-review/                # Dated review reports
│   └── user-guide/                 # 01-quick-start, 02-understanding-ralph-files, 03-writing-requirements
│
├── tests/                          # bats test suite (the quality gate; 100% pass required)
│   ├── unit/                       # ~37 .bats files (cli, exit detection, sandbox, github, queue, ...)
│   ├── integration/                # ~13 .bats files (loop, monitor, prd import, tmux, ...)
│   ├── e2e/                        # full_loop, sandbox_loop, e2b_loop + helpers
│   └── helpers/                    # fixtures.bash, mocks.bash, test_helper.bash
│
├── tools/inspect-allowed-tools.sh
├── src/                            # (project source placeholder; .gitkeep)
├── specs/stdlib/                   # (placeholder; .gitkeep)
├── logs/                           # (.gitkeep)
└── .github/
    ├── workflows/                  # test.yml, docker-publish.yml, claude.yml,
    │                               #   claude-code-review.yml, triage-incoming-issues
    ├── dependabot.yml
    └── aw/actions-lock.json
```

---

# PART 1 — The Ralph Playbook (README.md)

The README is titled **"The Ralph Playbook"** and frames Ralph not as "a loop that codes" but as a funnel: **3 Phases, 2 Prompts, 1 Loop**.

## Workflow: idea → specs → plan → loop

### Phase 1 — Define Requirements (LLM conversation)
- Discuss project ideas → identify **Jobs to Be Done (JTBD)**.
- Break each JTBD into **topics of concern**.
- Use subagents to load info from URLs into context.
- A subagent writes one `specs/FILENAME.md` per topic of concern.

### Phase 2 / 3 — Run the Ralph loop (two modes, swap `PROMPT.md`)

Same loop mechanism, different prompt depending on objective:

| Mode | When to use | Prompt focus |
|------|-------------|--------------|
| **PLANNING** | No plan exists, or plan is stale/wrong | Generate/update `IMPLEMENTATION_PLAN.md` only — gap analysis, no code, no commits |
| **BUILDING** | Plan exists | Implement from plan, run tests (backpressure), commit, update plan as a side effect |

Context loaded each iteration: `PROMPT.md` + `AGENTS.md`.

**BUILDING-mode loop lifecycle** (per iteration):
1. *Orient* – subagents study `specs/*`
2. *Read plan* – study `IMPLEMENTATION_PLAN.md`
3. *Select* – pick the most important task
4. *Investigate* – subagents study relevant `/src` ("don't assume not implemented")
5. *Implement* – N subagents for file ops
6. *Validate* – exactly 1 subagent for build/tests (backpressure)
7. *Update plan* – mark done, note discoveries/bugs
8. *Update `AGENTS.md`* – only if operational learnings
9. *Commit*
10. *Loop ends* → context cleared → next iteration starts fresh

### Concepts

| Term | Definition |
|------|------------|
| **Job to be Done (JTBD)** | High-level user need/outcome |
| **Topic of Concern** | A distinct aspect/component within a JTBD |
| **Spec** | Requirements doc for one topic of concern (`specs/FILENAME.md`) |
| **Task** | Unit of work derived from comparing specs to code |

Relationships: 1 JTBD → many topics; 1 topic → 1 spec; 1 spec → many tasks.

**Topic Scope Test — "One Sentence Without 'And'":** if you need "and" to describe what a topic does, it is probably multiple topics.

## Key Principles

- **Context is everything.** ~176K of an advertised 200K tokens is truly usable; aim for the 40–60% "smart zone." Tight tasks + one task per loop = 100% smart-zone utilization. Use the **main context as a scheduler**, spawn **subagents as memory extension**, prefer brevity and **Markdown over JSON**.
- **Steer with patterns + backpressure.** *Upstream:* deterministic setup (same files every loop), existing code shapes output. *Downstream:* tests/typechecks/lints/builds reject bad work. The prompt says "run tests" generically; `AGENTS.md` supplies the project-specific commands. Backpressure can extend to subjective criteria via LLM-as-judge.
- **Let Ralph Ralph.** Trust self-correction; eventual consistency through iteration. Autonomy requires `--dangerously-skip-permissions`, so **a sandbox is your only security boundary** ("It's not if it gets popped, it's when. And what is the blast radius?"). Escape hatches: Ctrl+C, `git reset --hard`, regenerate the plan.
- **Move outside the loop.** Sit *on* the loop, not *in* it. Observe failure patterns and add "signs" (prompt guardrails, `AGENTS.md` notes, codebase utilities). **The plan is disposable** — regenerating costs one planning loop.

Geoff's key language patterns: "study" (not "read"), "don't assume not implemented" (the Achilles' heel), "using parallel subagents / up to N subagents", "only 1 subagent for build/tests", "Ultrathink", "capture the why", "keep it up to date", "if functionality is missing then it's your job to add it", "resolve them or document them".

## Loop Mechanics

The IMPLEMENTATION_PLAN.md file persists on disk between iterations and acts as **shared state between otherwise isolated executions**. No orchestration needed beyond the bash loop.

### Enhanced loop example (verbatim)

Wraps the core loop with mode selection (plan/build), max-iterations, and a git push per iteration. Uses two prompt files: `PROMPT_plan.md` and `PROMPT_build.md`.

```bash
#!/bin/bash
# Usage: ./loop.sh [plan] [max_iterations]
# Examples:
#   ./loop.sh              # Build mode, unlimited iterations
#   ./loop.sh 20           # Build mode, max 20 iterations
#   ./loop.sh plan         # Plan mode, unlimited iterations
#   ./loop.sh plan 5       # Plan mode, max 5 iterations

# Parse arguments
if [ "$1" = "plan" ]; then
    # Plan mode
    MODE="plan"
    PROMPT_FILE="PROMPT_plan.md"
    MAX_ITERATIONS=${2:-0}
elif [[ "$1" =~ ^[0-9]+$ ]]; then
    # Build mode with max iterations
    MODE="build"
    PROMPT_FILE="PROMPT_build.md"
    MAX_ITERATIONS=$1
else
    # Build mode, unlimited (no arguments or invalid input)
    MODE="build"
    PROMPT_FILE="PROMPT_build.md"
    MAX_ITERATIONS=0
fi

ITERATION=0
CURRENT_BRANCH=$(git branch --show-current)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Mode:   $MODE"
echo "Prompt: $PROMPT_FILE"
echo "Branch: $CURRENT_BRANCH"
[ $MAX_ITERATIONS -gt 0 ] && echo "Max:    $MAX_ITERATIONS iterations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verify prompt file exists
if [ ! -f "$PROMPT_FILE" ]; then
    echo "Error: $PROMPT_FILE not found"
    exit 1
fi

while true; do
    if [ $MAX_ITERATIONS -gt 0 ] && [ $ITERATION -ge $MAX_ITERATIONS ]; then
        echo "Reached max iterations: $MAX_ITERATIONS"
        break
    fi

    # Run Ralph iteration with selected prompt
    # -p: Headless mode (non-interactive, reads from stdin)
    # --dangerously-skip-permissions: Auto-approve all tool calls (YOLO mode)
    # --output-format=stream-json: Structured output for logging/monitoring
    # --model opus: Primary agent uses Opus for complex reasoning (task selection, prioritization)
    #               Can use 'sonnet' in build mode for speed if plan is clear and tasks well-defined
    # --verbose: Detailed execution logging
    cat "$PROMPT_FILE" | claude -p \
        --dangerously-skip-permissions \
        --output-format=stream-json \
        --model opus \
        --verbose

    # Push changes after each iteration
    git push origin "$CURRENT_BRANCH" || {
        echo "Failed to push. Creating remote branch..."
        git push -u origin "$CURRENT_BRANCH"
    }

    ITERATION=$((ITERATION + 1))
    echo -e "\n\n======================== LOOP $ITERATION ========================\n"
done
```

**Max-iterations** limits the *outer* loop (tasks attempted), not tool calls inside a task. Each iteration = one fresh context window = one task = one commit.

## Canonical prompt templates (verbatim)

### `PROMPT_plan.md`

```
0a. Study `specs/*` with up to 250 parallel Sonnet subagents to learn the application specifications.
0b. Study @IMPLEMENTATION_PLAN.md (if present) to understand the plan so far.
0c. Study `src/lib/*` with up to 250 parallel Sonnet subagents to understand shared utilities & components.
0d. For reference, the application source code is in `src/*`.

1. Study @IMPLEMENTATION_PLAN.md (if present; it may be incorrect) and use up to 500 Sonnet subagents to study existing source code in `src/*` and compare it against `specs/*`. Use an Opus subagent to analyze findings, prioritize tasks, and create/update @IMPLEMENTATION_PLAN.md as a bullet point list sorted in priority of items yet to be implemented. Ultrathink. Consider searching for TODO, minimal implementations, placeholders, skipped/flaky tests, and inconsistent patterns. Study @IMPLEMENTATION_PLAN.md to determine starting point for research and keep it up to date with items considered complete/incomplete using subagents.

IMPORTANT: Plan only. Do NOT implement anything. Do NOT assume functionality is missing; confirm with code search first. Treat `src/lib` as the project's standard library for shared utilities and components. Prefer consolidated, idiomatic implementations there over ad-hoc copies.

ULTIMATE GOAL: We want to achieve [project-specific goal]. Consider missing elements and plan accordingly. If an element is missing, search first to confirm it doesn't exist, then if needed author the specification at specs/FILENAME.md. If you create a new element then document the plan to implement it in @IMPLEMENTATION_PLAN.md using a subagent.
```

### `PROMPT_build.md`

```
0a. Study `specs/*` with up to 500 parallel Sonnet subagents to learn the application specifications.
0b. Study @IMPLEMENTATION_PLAN.md.
0c. For reference, the application source code is in `src/*`.

1. Your task is to implement functionality per the specifications using parallel subagents. Follow @IMPLEMENTATION_PLAN.md and choose the most important item to address. Before making changes, search the codebase (don't assume not implemented) using Sonnet subagents. You may use up to 500 parallel Sonnet subagents for searches/reads and only 1 Sonnet subagent for build/tests. Use Opus subagents when complex reasoning is needed (debugging, architectural decisions).
2. After implementing functionality or resolving problems, run the tests for that unit of code that was improved. If functionality is missing then it's your job to add it as per the application specifications. Ultrathink.
3. When you discover issues, immediately update @IMPLEMENTATION_PLAN.md with your findings using a subagent. When resolved, update and remove the item.
4. When the tests pass, update @IMPLEMENTATION_PLAN.md, then `git add -A` then `git commit` with a message describing the changes. After the commit, `git push`.

99999. Important: When authoring documentation, capture the why — tests and implementation importance.
999999. Important: Single sources of truth, no migrations/adapters. If tests unrelated to your work fail, resolve them as part of the increment.
9999999. As soon as there are no build or test errors create a git tag. If there are no git tags start at 0.0.0 and increment patch by 1 for example 0.0.1  if 0.0.0 does not exist.
99999999. You may add extra logging if required to debug issues.
999999999. Keep @IMPLEMENTATION_PLAN.md current with learnings using a subagent — future work depends on this to avoid duplicating efforts. Update especially after finishing your turn.
9999999999. When you learn something new about how to run the application, update @AGENTS.md using a subagent but keep it brief. For example if you run commands multiple times before learning the correct command then that file should be updated.
99999999999. For any bugs you notice, resolve them or document them in @IMPLEMENTATION_PLAN.md using a subagent even if it is unrelated to the current piece of work.
999999999999. Implement functionality completely. Placeholders and stubs waste efforts and time redoing the same work.
9999999999999. When @IMPLEMENTATION_PLAN.md becomes large periodically clean out the items that are completed from the file using a subagent.
99999999999999. If you find inconsistencies in the specs/* then use an Opus 4.5 subagent with 'ultrathink' requested to update the specs.
999999999999999. IMPORTANT: Keep @AGENTS.md operational only — status updates and progress notes belong in `IMPLEMENTATION_PLAN.md`. A bloated AGENTS.md pollutes every future loop's context.
```

> The `999...` escalating numbering convention encodes guardrail criticality: higher number = more critical invariant.

### Playbook file roles

- **`loop.sh`** — outer orchestration; `chmod +x loop.sh` before first use.
- **PROMPTS** — instruction set per iteration; swap PLANNING/BUILDING. Structure: Phase 0 (orient) → Phases 1–4 (task/validate/commit) → `999…` guardrails.
- **`AGENTS.md`** — the concise (~60 line) "how to build/run" guide. NOT a changelog. Wires in backpressure by listing actual build/test/typecheck/lint commands.
- **`IMPLEMENTATION_PLAN.md`** — prioritized bullet task list, generated by PLANNING, updated by BUILDING, freely regenerated. No fixed template.
- **`specs/*`** — one markdown file per topic of concern; source of truth. No fixed template.
- **`src/` and `src/lib/`** — application code and shared "standard library" utilities.

## Proposed enhancements (Clayton's additions to the core method)

1. **Use Claude's `AskUserQuestionTool` for Planning** — structured interview in Phase 1 to clarify JTBD/edge cases/acceptance criteria before writing specs. No code/prompt changes.
2. **Acceptance-Driven Backpressure** — derive *test requirements* from acceptance criteria during planning, making the specs→tests link explicit. Specify WHAT to verify (outcomes), not HOW (approach). Prevents "cheating" (no done without required tests). Includes concrete `PROMPT_plan.md` / `PROMPT_build.md` edits.
3. **Non-Deterministic Backpressure** — LLM-as-judge tests for subjective criteria (tone, aesthetics, UX). Introduces a `src/lib/llm-review.ts` fixture with a binary pass/fail API:
   ```typescript
   interface ReviewResult {
     pass: boolean;
     feedback?: string; // Only present when pass=false
   }

   function createReview(config: {
     criteria: string;                  // What to evaluate (behavioral, observable)
     artifact: string;                  // Text content OR screenshot path
     intelligence?: "fast" | "smart";   // Optional, defaults to 'fast'
   }): Promise<ReviewResult>;
   ```
   Multimodal: text vs. screenshot auto-detected by extension. `fast` (e.g. Gemini Flash) default, `smart` (e.g. GPT-class) for nuanced judgment. Ralph learns the pattern from `llm-review.test.ts` examples — "discovery, not documentation."
4. **Ralph-Friendly Work Branches** — scope a plan **at branch creation** (`plan-work "natural language description"`) rather than filtering tasks at runtime (unreliable, violates determinism). Adds a `PROMPT_plan_work.md` template using a `${WORK_SCOPE}` env var substituted via `envsubst`, and an extended `loop.sh` with a `plan-work` mode. Workflow:
   ```bash
   ./loop.sh plan                              # Full plan on main
   git checkout -b ralph/user-auth-oauth       # Create work branch
   ./loop.sh plan-work "user authentication system with OAuth and session management"
   ./loop.sh                                   # Build from scoped plan
   gh pr create --base main --head ralph/user-auth-oauth --fill
   ```
5. **JTBD → Story Map → SLC Release** — reframe topics of concern as **activities** (verbs: "upload photo"), sequence them into a User Story Map, and slice horizontally into **Simple/Lovable/Complete** releases (preferred over MVP). Adds `AUDIENCE_JTBD.md` as a separate artifact and an SLC-oriented planning prompt variant that recommends the next most valuable release.

---

# PART 2 — "Ralph for Claude Code" tooling (the implementation)

`CLAUDE.md` documents the actual CLI tool. It is far more than the playbook's `loop.sh`: it adds operational safety, observability, and integrations. Project-managed files live in a **`.ralph/` subfolder** (note: the tooling uses `AGENT.md` and `fix_plan.md`, vs. the playbook's `AGENTS.md` and `IMPLEMENTATION_PLAN.md`).

## Installed commands (`./install.sh`)

Installs commands to `~/.local/bin/` and scripts/templates/lib to `~/.ralph/`:

| Command | Purpose |
|---------|---------|
| `ralph` | Run the autonomous loop (`exec ~/.ralph/ralph_loop.sh`) |
| `ralph-monitor` | Live monitoring dashboard |
| `ralph-setup <name>` | Scaffold a new Ralph project |
| `ralph-enable` / `ralph-enable-ci` | Enable Ralph in an existing repo (interactive / non-interactive) |
| `ralph-import` | Convert a PRD or GitHub issue into a Ralph project |
| `ralph-queue` | Batch / issue-queue management |
| `ralph-migrate` | Migrate flat layout → `.ralph/` subfolder |
| `ralph-stats` | Metrics analytics |

External deps: Claude Code CLI, tmux (monitoring), git (projects must be repos), jq, coreutils (`timeout`/`gtimeout`). Docker/E2B are optional for sandboxing.

## Key usage (from CLAUDE.md)

```bash
# Project lifecycle
ralph-setup my-project-name
ralph-enable                               # interactive wizard
ralph-enable --from github --label "sprint-1"
ralph-enable --from prd ./docs/requirements.md
ralph-migrate                              # flat → .ralph/ (v0.10.0+)

# Running the loop
ralph --monitor                            # with integrated tmux monitoring (recommended)
ralph                                      # without monitoring
ralph --monitor --calls 50 --prompt my_custom_prompt.md
ralph --status

# Circuit breaker / session
ralph --reset-circuit / --circuit-status / --auto-reset-circuit
ralph --reset-session

# Backup & rollback (git)
ralph --backup                             # (-b) backup branch before each loop
ralph --rollback                           # list backup branches
ralph --rollback ralph-backup-loop-3-<ts>

# Testing the tool itself
npm test                                   # bats: tests/unit + tests/integration
npm run test:unit | test:integration | test:e2e
```

## `.ralph/` project layout (managed project)

```
project-name/
├── .ralph/
│   ├── PROMPT.md          # main loop prompt
│   ├── fix_plan.md        # prioritized TODO
│   ├── AGENT.md           # build/run instructions (maintained by Ralph)
│   ├── status.json        # real-time status
│   ├── specs/  examples/  logs/  docs/generated/
│   └── (hidden state: .call_count, .exit_signals, .circuit_breaker_state, .claude_session_id, ...)
└── src/                   # source code at project root
.ralphrc                   # per-project config (chmod 600)
```

**Protected files** (`file_protection.sh`): `.ralph/`, `.ralph/PROMPT.md`, `.ralph/fix_plan.md`, `.ralph/AGENT.md`, `.ralphrc` are required; `validate_ralph_integrity()` runs at startup and before every iteration. Recovery is `ralph-enable --force`.

## Library modules (`lib/`) — what each does

- **circuit_breaker.sh** — stagnation/runaway detection. States CLOSED → HALF_OPEN → OPEN with auto-recovery (`CB_COOLDOWN_MINUTES`, `CB_AUTO_RESET`). State in `.ralph/.circuit_breaker_state`.
- **response_analyzer.sh** — parses Claude output (JSON flat + Claude CLI formats, text fallback) for `status`, `exit_signal`, `work_type`, `files_modified`, `asking_questions`. Detects questions-instead-of-acting, test-only loops, stuck error patterns. Manages session ID persistence (24h expiry) and history.
- **enable_core.sh** — shared enable logic: idempotency (`is_ralph_enabled()`), project/git/task-source detection, template generation (`generate_prompt_md()`, `generate_ralphrc()`).
- **wizard_utils.sh** — interactive prompt helpers, POSIX/bash-3.x safe.
- **task_sources.sh** — import tasks from beads, GitHub Issues, and PRD docs (checkbox + numbered formats); normalization + prioritization.
- **issue_analyzer.sh** — deterministic 0–100 completeness scoring of issue PRDs; emits `confidence_score`, `completeness_level`, `missing_elements`, `recommendation`.
- **github_lifecycle.sh** — backs `ralph --github-issue`: progress comments, PR creation with `Closes #N`, follow-up issues from TODO/FIXME, issue close + labels. All opt-in; gh failures degrade gracefully. State in `.ralph/.github_lifecycle_state`. Uses `gh` CLI exclusively.
- **queue_manager.sh** — queue primitives at `.ralph/queue.json`; priority + dependency ordering, jq cycle detection; atomic temp-file + `mv` mutations.
- **sandbox_docker.sh** — runs only the Claude CLI in a container (project bind-mounted rw at `/workspace`); host keeps orchestration so monitoring is unaffected. Setup failure is fatal (never falls back to host).
- **sandbox_e2b.sh + e2b_helper.py** — E2B cloud sandbox; SDK is Python/JS-only so transport goes via `e2b_helper.py`. Project uploaded once, changed files synced back every iteration (at-least-once delivery; `.git` excluded both ways → in-sandbox commits arrive as uncommitted host changes). Cost tracking + budget caps.
- **sync.sh** — backend-agnostic sandbox file-sync filtering for E2B (Docker needs none); gitignore-like `.ralphignore` subset (no negation), include/exclude globs, large-file policy.
- **file_protection.sh** — integrity checks for required Ralph paths.
- **date_utils.sh / timeout_utils.sh / log_utils.sh** — cross-platform date math, `portable_timeout()` (GNU `timeout` / macOS `gtimeout`), 10 MB log rotation.

## Safety & control behaviors (CLAUDE.md highlights)

- **Exit detection (dual-condition):** exits only when `recent_completion_indicators >= 2` **AND** Claude emits explicit `EXIT_SIGNAL: true`. In JSON mode (default) heuristics are suppressed entirely — only the explicit signal counts. Other exits: repeated "done" (`MAX_CONSECUTIVE_DONE_SIGNALS=2`), too many test-only loops (`MAX_CONSECUTIVE_TEST_LOOPS=3`), all `fix_plan.md` items complete (items under "Optional/Future/Nice to Have" sections don't block — Issue #239).
- **Rate limiting:** default 100 API calls/hour (`--calls`), hourly reset, counters persist across restarts; optional `MAX_TOKENS_PER_HOUR`.
- **Timeout handling:** exceeding `CLAUDE_TIMEOUT_MINUTES` kills with exit 124; "productive timeout" detection checks git for work done during execution.
- **API limit / error detection:** four-layer detection avoids false positives from echoed file content in stream-json output; `is_error: true` (with exit 0) triggers session reset.
- **Permission denial detection:** extracts denied commands and exits with guidance to update `ALLOWED_TOOLS`.

## Configuration (`templates/ralphrc.template`)

Notable keys (env vars override `.ralphrc`):
- `MAX_CALLS_PER_HOUR=100`, `CLAUDE_TIMEOUT_MINUTES=15`, `CLAUDE_OUTPUT_FORMAT="json"`
- `ALLOWED_TOOLS="Write,Read,Edit,Bash(git add *),Bash(git commit *),...,Bash(npm *),Bash(pytest)"` — uses **granular git subcommands** by default (broad `Bash(git *)` would allow destructive `git clean`/`git rm` that could delete `.ralph/`, Issue #149).
- `SESSION_CONTINUITY=true`, `SESSION_EXPIRY_HOURS=24`
- `CB_NO_PROGRESS_THRESHOLD=3`, `CB_SAME_ERROR_THRESHOLD=5`, `CB_OUTPUT_DECLINE_THRESHOLD=70`, `CB_COOLDOWN_MINUTES=30`, `CB_AUTO_RESET=false`
- `CLAUDE_AUTO_UPDATE=true` (false for Docker/air-gapped), `CLAUDE_MIN_VERSION="2.0.76"`
- Optional sandbox blocks: `SANDBOX_PROVIDER=docker|e2b` with `SANDBOX_DOCKER_*` / `SANDBOX_E2B_*`, plus `SYNC_INCLUDE/EXCLUDE`, `SYNC_MAX_FILE_SIZE`, `SYNC_LARGE_FILE_ACTION`.

## The default loop prompt (`templates/PROMPT.md`)

This is the prompt seeded into new projects. It is more "Claude-Code-native" than the playbook templates and centers on a **machine-readable status block** the loop parses for exit detection:

```
---RALPH_STATUS---
STATUS: IN_PROGRESS | COMPLETE | BLOCKED
TASKS_COMPLETED_THIS_LOOP: <number>
FILES_MODIFIED: <number>
TESTS_STATUS: PASSING | FAILING | NOT_RUN
WORK_TYPE: IMPLEMENTATION | TESTING | DOCUMENTATION | REFACTORING
EXIT_SIGNAL: false | true
RECOMMENDATION: <one line summary of what to do next>
---END_RALPH_STATUS---
```

Set `EXIT_SIGNAL: true` only when: all `fix_plan.md` items `[x]`, all tests passing, no errors, all specs implemented, nothing meaningful left. The template also includes:
- **One task per loop**, search before assuming, subagents for expensive ops (max 100 concurrent).
- **Testing limited to ~20% of effort** per loop; priority Implementation > Documentation > Tests.
- **Protected Files (DO NOT MODIFY):** `.ralph/` and `.ralphrc`.
- Six worked **exit scenarios** (specification-by-example): successful completion, test-only loop, stuck-on-error, no work remaining, making progress, blocked-on-dependency — each with the exact status block and Ralph's resulting action.

## Templates: `AGENT.md` and `fix_plan.md`

- **`templates/AGENT.md`** — build/test/run command examples for Node/Python/Rust plus **mandatory quality standards**: 85% coverage on new code, 100% pass rate, conventional commits, feature branches only, Ralph integration (update `fix_plan.md`), and a feature-completion checklist.
- **`templates/fix_plan.md`** — High/Medium/Low Priority sections plus an **Optional** section (unchecked items there do **not** block exit, Issue #239; configurable via `OPTIONAL_SECTIONS`), Completed, and Notes.

## Examples

- **`examples/simple-cli-tool/`** — minimal Node.js todo-CLI config: just `.ralph/PROMPT.md` + `.ralph/fix_plan.md`, **no `specs/`** (PROMPT.md is enough). The PROMPT defines `todo add/list/complete/delete`, JSON storage at `~/.todos.json`, commander.js + Jest, and a data-format example.
- **`examples/rest-api/`** — medium-complexity bookstore REST API (FastAPI + PostgreSQL) demonstrating **when to add `specs/`**: a high-level `PROMPT.md` plus a detailed `specs/api.md` (endpoint paths, schemas, validation, error codes, pagination). `fix_plan.md` references the spec (`- [ ] Implement book endpoints per specs/api.md`).

Comparison table from the rest-api README:

| Aspect | Simple CLI | REST API |
|--------|-----------|----------|
| Complexity | Low | Medium |
| Uses specs/ | No | Yes |
| PROMPT.md length | ~40 lines | ~30 lines |
| Why | Self-contained | API contracts need detail |

## Sandboxing (the "use protection" principle, operationalized)

- **Docker** (`ralph --sandbox docker`): default image built from the repo `Dockerfile` (`node:20-slim` + git/jq/python3 + `@anthropic-ai/claude-code`, non-root `node` user), or pulled from `ghcr.io/frankbria/ralph-sandbox:latest`. Flags: `--sandbox-image`, `--sandbox-memory`, `--sandbox-cpus`, `--sandbox-network none|bridge|host`.
- **E2B** (`ralph --sandbox e2b`): cloud sandbox via `pip install e2b` + `E2B_API_KEY`. Sub-flags: `--sandbox-template`, `--sandbox-timeout`, `--sandbox-max-cost`, `--sandbox-cost-alert`, `--sandbox-keep-alive`, plus `--sync-include`/`--sync-exclude`. Setup failure is fatal — never falls back to host execution.

## GitHub integration

- **`ralph-import --github-issue <N>`** (+ `--repo`, `--include-comments`) fetches via `gh`, scores completeness, and can auto-generate an implementation plan when below `--completeness-threshold` (default 60). Rich filtering: `--github-search/-label/-title/-assignee/-milestone/-state`, `--select first|interactive|priority`, `--dry-run`.
- **Issue lifecycle** (`ralph --github-issue`): `--comment-progress --comment-interval N`, `--create-pr --link-issue --draft-pr`, `--create-followups --followup-label`, `--auto-close --add-label`. All opt-in, all degrade gracefully.
- **Queue** (`ralph-queue`): `add` (issues/filters/PRD) → `status/next/reorder/validate/remove/clear` → `process [--halt-on-failure]` / `resume`. Sequential, single branch, one commit (`Fix #N: <title>`) per issue.

## Tests & CI

- bats suite under `tests/unit`, `tests/integration`, `tests/e2e` (+ `helpers/`). **100% pass rate is the quality gate**; kcov coverage is informational only (`COVERAGE_THRESHOLD=0`, because kcov can't instrument bats subprocesses). E2E (`test_full_loop.bats`) runs `ralph_loop.sh` as a real subprocess against a mock `claude` CLI that must take >1s/call.
- GitHub Actions: `test.yml` (unit + E2E blocking, integration advisory), `docker-publish.yml` (multi-arch GHCR image on `v*` tags, smoke-tested), `claude.yml` + `claude-code-review.yml`, issue triage. Supply-chain hardening: all actions SHA-pinned with dependabot + a `test_workflow_sha_pinning.bats` guard; `persist-credentials: false` on checkouts.

## Development standards (CLAUDE.md)

- Tests: 100% pass, no exceptions; unit for functions, integration for loop behavior, E2E for full cycles.
- Git: conventional commits with scope (`feat(loop):`, `fix(monitor):`); feature branches only; never commit to `main`; PRs for significant changes.
- Ralph integration: update `.ralph/fix_plan.md` before work, mark items complete when done.
- Docs sync: keep CLAUDE.md, README, and `templates/` current with implementation; remove outdated comments; document breaking changes.
- "AI agents should apply these standards automatically without explicit instruction."

---

## Quick-start cheat sheet (from docs/user-guide/01-quick-start.md)

```bash
# 1. Create + init a project
mkdir todo-cli && cd todo-cli && npm init -y && git init

# 2. Enable Ralph (interactive wizard detects type, creates .ralph/)
ralph-enable

# 3. Edit .ralph/PROMPT.md (context + objectives + principles)
# 4. Edit .ralph/fix_plan.md (prioritized, specific, actionable tasks)

# 5. Run it (tmux: left = loop output, right = dashboard)
ralph --monitor
#    Ctrl+B then D to detach; `tmux attach -t todo-cli` to return; `ralph --status`

# 6. Review
ls -la src/ ; cat .ralph/fix_plan.md ; npm test
```

Loop cycle per iteration: **Read** PROMPT.md + fix_plan.md → **Implement** highest-priority unchecked task → **Test** and fix → **Update** fix_plan.md → **Repeat** until `EXIT_SIGNAL`. Common failure: vague `fix_plan.md` causes test-only loops — make tasks specific ("Add error handling for missing ~/.todos.json", not "Improve the code").

---

## Provenance / lineage summary

- **This repo:** `ghuntley/how-to-ralph-wiggum` (fork).
- **Forked from / README authored as:** `ClaytonFarr/ralph-playbook` ("The Ralph Playbook").
- **Tooling lineage:** `frankbria/ralph-claude-code` (per `package.json`, `.ralphrc` docs, GHCR image `ghcr.io/frankbria/ralph-sandbox`).
- **Methodology origin:** Geoffrey Huntley ("Ralph"), https://ghuntley.com/ralph/.
- **License:** MIT.
```

