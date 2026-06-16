# Ralph for Claude Code (frankbria/ralph-claude-code)

**Source:** https://github.com/frankbria/ralph-claude-code

> Autonomous AI development loop with intelligent exit detection and rate limiting.

Ralph is a Bash-based implementation of Geoffrey Huntley's ["Ralph" technique](https://ghuntley.com/ralph/) (named after Ralph Wiggum), specialized for **Claude Code**. It runs Claude Code repeatedly in a loop so the agent iteratively improves a project until completion, with built-in safeguards (rate limiting, circuit breaker, intelligent exit detection) to prevent infinite loops and API overuse.

- **Install once, use everywhere** — Ralph becomes a set of global commands available in any directory.
- **Language:** Shell (Bash 4.0+). License: MIT. Default branch: `main`.
- **Version (README):** v0.11.5, "active development" toward v1.0.0; 784 tests across 34 test files, 100% pass rate.
- **Test framework:** [BATS](https://github.com/bats-core/bats-core) (`package.json` lists `bats`, `bats-support`, `bats-assert` as devDependencies).

---

## Table of Contents

1. [Repository Structure](#repository-structure)
2. [Key Files & Components](#key-files--components)
3. [Quick Start (Install + Per-Project Setup)](#quick-start)
4. [How the Loop Works](#how-the-loop-works)
5. [Claude Code Integration Details](#claude-code-integration-details)
6. [Exit Detection (Dual-Condition Gate)](#exit-detection-dual-condition-gate)
7. [The Ralph Files (.ralph/)](#the-ralph-files-ralph)
8. [Configuration (.ralphrc)](#configuration-ralphrc)
9. [Templates & Example Prompts (Verbatim)](#templates--example-prompts)
10. [Importing Requirements (PRD / GitHub Issues)](#importing-requirements)
11. [GitHub Issue Lifecycle & Queue](#github-issue-lifecycle--queue)
12. [Sandbox Execution (Docker / E2B)](#sandbox-execution)
13. [Command Reference](#command-reference)
14. [System Requirements](#system-requirements)
15. [Monitoring & Debugging](#monitoring--debugging)

---

## Repository Structure

```
ralph-claude-code/
├── README.md                     # Main documentation
├── CLAUDE.md                     # Guidance for Claude Code working ON this repo (architecture map)
├── CONTRIBUTING.md
├── LICENSE                       # MIT
├── IMPLEMENTATION_PLAN.md        # Roadmap to v1.0
├── IMPLEMENTATION_STATUS.md      # Progress tracking
├── SPECIFICATION_WORKSHOP.md
├── TESTING.md                    # Testing guide / per-suite breakdown
├── package.json                  # npm test scripts wrap bats; devDeps = bats*
├── package-lock.json
│
│   # --- Top-level scripts (the actual implementation) ---
├── install.sh                    # One-time global install (commands → ~/.local/bin, scripts → ~/.ralph)
├── uninstall.sh                  # Dedicated clean removal
├── setup.sh                      # Project initialization for new Ralph projects
├── create_files.sh               # Bootstrap that creates the entire Ralph system
├── migrate_to_ralph_folder.sh    # Migrate old flat layout → .ralph/ subfolder
├── ralph_loop.sh                 # ★ Main autonomous loop (executes Claude Code repeatedly) ~3381 lines
├── ralph_monitor.sh              # Live monitoring dashboard (tmux)
├── ralph_import.sh               # Convert PRD/spec docs (and GitHub issues) → Ralph project
├── ralph_queue.sh                # ralph-queue: batch processing / persistent issue queue
├── ralph_enable.sh               # Interactive wizard to enable Ralph in existing projects
├── ralph_enable_ci.sh            # Non-interactive (CI/automation) enable, --json output
├── ralph-stats.sh                # ralph-stats: metrics summary from metrics.jsonl
├── sample-prd.md                 # Example PRD for testing ralph-import
├── Dockerfile / .dockerignore    # ralph-sandbox image (Docker sandbox execution)
│
├── lib/                          # Library components sourced by the scripts
│   ├── circuit_breaker.sh        # Stagnation detection; CLOSED→HALF_OPEN→OPEN states
│   ├── response_analyzer.sh      # Parses Claude output for completion signals & session mgmt
│   ├── date_utils.sh             # Cross-platform date utilities (parse_iso_to_epoch)
│   ├── timeout_utils.sh          # portable_timeout() — GNU timeout / macOS gtimeout
│   ├── enable_core.sh            # Shared enable logic, template generation, idempotency
│   ├── wizard_utils.sh           # Interactive prompts (confirm/select/print); bash 3.x safe
│   ├── task_sources.sh           # Import tasks from beads / GitHub Issues / PRD docs
│   ├── issue_analyzer.sh         # assess_issue_completeness() 0–100 heuristic scoring
│   ├── file_protection.sh        # validate_ralph_integrity() — protects .ralph/ & .ralphrc
│   ├── log_utils.sh              # rotate_logs() — rotates ralph.log at 10MB, keeps 4 archives
│   ├── github_lifecycle.sh       # ralph --github-issue lifecycle (comments/PR/close/followups)
│   ├── queue_manager.sh          # Queue state primitives backing ralph-queue
│   ├── sandbox_docker.sh         # Docker sandbox execution (--sandbox docker)
│   ├── sandbox_e2b.sh            # E2B cloud sandbox execution (--sandbox e2b)
│   ├── e2b_helper.py             # Python CLI transport over the E2B SDK
│   └── sync.sh                   # Backend-agnostic sandbox file-sync filtering
│
├── templates/                    # Seed files copied into new projects
│   ├── PROMPT.md                 # Master loop prompt template (RALPH_STATUS block, exit scenarios)
│   ├── AGENT.md                  # Build/test/quality-standards template
│   ├── fix_plan.md               # Prioritized task-list template (with Optional section)
│   ├── ralphrc.template          # .ralphrc config template (fully commented)
│   ├── .ralphignore              # gitignore-like sync exclude template
│   ├── .gitignore
│   └── specs/.gitkeep
│
├── examples/                     # Realistic example project configurations
│   ├── rest-api/                 # FastAPI bookstore API example (.ralph/PROMPT.md, fix_plan.md, specs/api.md)
│   └── simple-cli-tool/          # Node.js todo CLI example (.ralph/PROMPT.md, fix_plan.md)
│
├── docs/
│   ├── CLI_OPTIONS.md            # Full per-flag reference
│   ├── DOCKER_SANDBOX.md
│   ├── E2B_SANDBOX.md
│   ├── QUEUE_MANAGEMENT.md
│   ├── SANDBOX_SYNC.md
│   ├── adr/                      # 0001 multi-provider abstraction, 0002 agent adapter contract
│   ├── archive/2025-10-milestones/
│   ├── code-review/
│   ├── generated/.gitkeep
│   └── user-guide/               # 01-quick-start, 02-understanding-ralph-files, 03-writing-requirements
│
├── tools/
│   └── inspect-allowed-tools.sh
│
├── specs/stdlib/.gitkeep
├── src/.gitkeep
├── logs/.gitkeep
│
├── tests/
│   ├── unit/                     # ~35 .bats files (rate_limiting, exit_detection, json_parsing, cli_*, etc.)
│   ├── integration/              # loop_execution, prd_import, project_setup, installation, tmux, docker, e2b, queue …
│   ├── e2e/                      # test_full_loop.bats (real subprocess), test_sandbox_loop, test_e2b_loop + helpers
│   ├── helpers/                  # fixtures.bash, mocks.bash, test_helper.bash
│   ├── test_error_detection.sh
│   └── test_stuck_loop_detection.sh
│
└── .github/
    ├── workflows/
    │   ├── test.yml              # CI: unit/integration/e2e
    │   ├── docker-publish.yml    # Publishes ralph-sandbox image to GHCR on v* tags
    │   ├── claude.yml            # Claude Code GitHub Action integration
    │   ├── claude-code-review.yml# Automated PR review by Claude
    │   └── triage-incoming-issues.*
    ├── dependabot.yml
    └── aw/actions-lock.json
```

> A Ralph-managed **project** (created by `ralph-setup` / `ralph-enable` / `ralph-import`) gets its own `.ralph/` subfolder — see [The Ralph Files](#the-ralph-files-ralph). The tree above is the *tool's own* repo.

---

## Key Files & Components

### Main scripts

| Script | Purpose |
|--------|---------|
| `ralph_loop.sh` | The core autonomous loop. Reads `.ralph/PROMPT.md`, invokes Claude Code with the configured flags, analyzes the response, tracks progress, and decides whether to continue or exit. ~3381 lines. |
| `ralph_monitor.sh` | Live tmux dashboard: loop count/status, API calls vs. limit, recent log entries, rate-limit countdown, sandbox cost. |
| `setup.sh` | Initializes a new Ralph project. |
| `create_files.sh` | Bootstrap script that creates the entire Ralph system. |
| `ralph_import.sh` | Converts a PRD/spec doc (or a GitHub issue) into a Ralph project. Uses Claude Code with `--output-format json` (text fallback for older CLIs). Handles GitHub issue import, metadata filtering/selection, and completeness assessment with auto plan generation. |
| `ralph_queue.sh` | `ralph-queue` command — builds/manages a persistent work queue (`.ralph/queue.json`) of GitHub issues or local PRDs and processes them sequentially by priority + dependency order. |
| `ralph_enable.sh` | Interactive 5-phase wizard to add Ralph to an existing project. |
| `ralph_enable_ci.sh` | Non-interactive enable for CI; `--json` output; exit codes 0 (success) / 1 (error) / 2 (already enabled). |
| `ralph-stats.sh` | `ralph-stats` — metrics summary from `.ralph/logs/metrics.jsonl` (JSON Lines per-loop metrics). |

### Library components (`lib/`)

- **circuit_breaker.sh** — prevents runaway loops via stagnation detection. States: `CLOSED` (normal) → `HALF_OPEN` (monitoring) → `OPEN` (halted), with auto transitions/recovery. State file `.ralph/.circuit_breaker_state` (JSON).
- **response_analyzer.sh** — analyzes Claude output for completion signals. Parses JSON (flat and Claude CLI formats) with text fallback; extracts `status`, `exit_signal`, `work_type`, `files_modified`, `asking_questions`, `question_count`. Detects questions (Claude asking instead of acting), test-only loops, stuck error patterns. Manages sessions: session ID persisted to `.ralph/.claude_session_id` (24-hour expiration), transition history in `.ralph/.ralph_session_history` (last 50), lifecycle state in `.ralph/.ralph_session`.
- **date_utils.sh** — cross-platform date utilities.
- **timeout_utils.sh** — `portable_timeout()`: GNU `timeout` on Linux, `gtimeout` (Homebrew coreutils) on macOS, auto-detected.
- **enable_core.sh / wizard_utils.sh / task_sources.sh** — power the `ralph-enable` wizard (project/git/task-source detection, template generation, interactive prompts, task import).
- **issue_analyzer.sh** — `assess_issue_completeness()` deterministic 0–100 scoring of issue PRDs.
- **file_protection.sh** — `validate_ralph_integrity()` checks required paths exist every iteration; protects against Claude deleting Ralph's own config.
- **log_utils.sh** — rotates `ralph.log` at 10MB keeping 4 archives.
- **github_lifecycle.sh** — backs `ralph --github-issue` (progress comments, PR creation, close, follow-ups). Uses `gh` CLI exclusively; every operation degrades gracefully.
- **queue_manager.sh** — queue state primitives (atomic temp-file + `mv` writes).
- **sandbox_docker.sh / sandbox_e2b.sh + e2b_helper.py / sync.sh** — optional sandboxed execution (containerized / cloud) with file-sync filtering.

---

## Quick Start

Ralph has two phases: **one-time installation** and **per-project setup**.

```
INSTALL ONCE              USE MANY TIMES
+-----------------+          +----------------------+
| ./install.sh    |    ->    | ralph-setup project1 |
|                 |          | ralph-enable         |
| Adds global     |          | ralph-import prd.md  |
| commands        |          | ...                  |
+-----------------+          +----------------------+
```

### Phase 1: Install Ralph (one time only)

```bash
git clone https://github.com/frankbria/ralph-claude-code.git
cd ralph-claude-code
./install.sh
```

This adds `ralph`, `ralph-monitor`, `ralph-setup`, `ralph-import`, `ralph-queue`, `ralph-migrate`, `ralph-enable`, `ralph-enable-ci` (and `ralph-stats`) to your PATH. Per `CLAUDE.md`, install places **commands → `~/.local/bin/`** and **scripts + templates + lib → `~/.ralph/`**. You only need to do this once per system; the cloned repo can be deleted afterward.

### Phase 2: Initialize a project (per project)

**Option A — Enable Ralph in an existing project (recommended):**
```bash
cd my-existing-project

# Interactive wizard - auto-detects project type and imports tasks
ralph-enable

# Or with a specific task source
ralph-enable --from beads
ralph-enable --from github --label "sprint-1"
ralph-enable --from prd ./docs/requirements.md

# Start autonomous development
ralph --monitor
```

**Option B — Import existing PRD/specifications:**
```bash
ralph-import my-requirements.md my-project
cd my-project
# Review/adjust .ralph/PROMPT.md, .ralph/fix_plan.md, .ralph/specs/requirements.md
ralph --monitor
```

**Option C — Create a new project from scratch:**
```bash
ralph-setup my-awesome-project
cd my-awesome-project
# Edit .ralph/PROMPT.md, .ralph/specs/, .ralph/fix_plan.md
ralph --monitor
```

### Ongoing usage
```bash
ralph --monitor              # Integrated tmux monitoring (recommended)

# Or use separate terminals:
ralph                        # Terminal 1: Ralph loop
ralph-monitor                # Terminal 2: Live monitor dashboard
```

### Uninstalling
```bash
./uninstall.sh
# Or, if the repo was deleted:
curl -sL https://raw.githubusercontent.com/frankbria/ralph-claude-code/main/uninstall.sh | bash
```

---

## How the Loop Works

Each iteration:

1. **Read instructions** — loads `.ralph/PROMPT.md` with project requirements.
2. **Execute Claude Code** — runs the Claude Code CLI with current context and priorities.
3. **Track progress** — updates task lists / logs execution results.
4. **Evaluate completion** — checks exit conditions and completion signals.
5. **Repeat** — until the project is complete or limits are reached.

Per `CLAUDE.md`, each iteration injects context via `build_loop_context()`: loop number, remaining `fix_plan.md` tasks, circuit-breaker state (if not CLOSED), previous-loop summary, and corrective guidance if the previous loop detected questions.

---

## Claude Code Integration Details

This is the part most specific to **Claude Code**. Ralph drives the headless `claude` CLI.

### How the `claude` command is built

From `ralph_loop.sh` (`execute_claude_code()`), the argv is assembled in an array (shell-injection-safe):

```bash
# Note: We do NOT use --dangerously-skip-permissions here. Tool permissions
# are controlled via --allowedTools from CLAUDE_ALLOWED_TOOLS in .ralphrc.
# This preserves the permission denial circuit breaker (Issue #101).
CLAUDE_CMD_ARGS=("$CLAUDE_CODE_CMD")

# Optional model / effort overrides (Issue #228)
[[ -n "$CLAUDE_MODEL"  ]] && CLAUDE_CMD_ARGS+=("--model"  "$CLAUDE_MODEL")
[[ -n "$CLAUDE_EFFORT" ]] && CLAUDE_CMD_ARGS+=("--effort" "$CLAUDE_EFFORT")

# Output format (default json)
[[ "$CLAUDE_OUTPUT_FORMAT" == "json" ]] && CLAUDE_CMD_ARGS+=("--output-format" "json")

# Allowed tools (each tool as a separate argv element, split on commas)
CLAUDE_CMD_ARGS+=("--allowedTools" <tool1> <tool2> ...)

# Session continuity — use --resume <id>, NOT --continue (Issue #151)
[[ "$CLAUDE_USE_CONTINUE" == "true" && -n "$session_id" ]] && \
    CLAUDE_CMD_ARGS+=("--resume" "$session_id")

# Per-loop context as an appended system prompt
[[ -n "$loop_context" ]] && CLAUDE_CMD_ARGS+=("--append-system-prompt" "$loop_context")

# The PROMPT.md body is passed via -p (Claude CLI uses -p, not --prompt-file)
CLAUDE_CMD_ARGS+=("-p" "$prompt_content")
```

Key Claude Code specifics:

- **Command:** `CLAUDE_CODE_CMD` defaults to `claude`; can be set to `npx @anthropic-ai/claude-code` in `.ralphrc`. Auto-detected during `ralph-enable`/`ralph-setup`, validated at startup with `validate_claude_command()` (shows install instructions on failure). Env var overrides `.ralphrc`.
- **Flags used:** `--output-format json` (default; `--live` requires JSON and auto-switches; stream-json used in live mode), `--allowedTools "..."`, `--resume <session_id>` (NOT `--continue`, which can hijack the most-recent session in the cwd), `--append-system-prompt <loop_context>`, `-p <prompt>`, and optional `--model` / `--effort`.
- **Permissions:** Ralph deliberately does **not** pass `--dangerously-skip-permissions`. Tool access is whitelisted via `--allowedTools` from `ALLOWED_TOOLS`/`CLAUDE_ALLOWED_TOOLS`. This keeps the permission-denial circuit breaker (Issue #101) working — when Claude is denied a command, Ralph extracts `permission_denials` from JSON, exits with "permission_denied", and tells you to update `ALLOWED_TOOLS`.
- **Sessions:** session ID persisted to `.ralph/.claude_session_id` (24h expiration). On exit 0, Ralph checks `.is_error` via jq *before* persisting session state — if the CLI returned `is_error: true` (e.g., 400 concurrency, 401 OAuth expiry) the session is reset, not persisted, to avoid infinite retry with a bad session (Issues #134, #199).
- **Version management:** `CLAUDE_MIN_VERSION="2.0.76"` minimum; `CLAUDE_AUTO_UPDATE=true` attempts `npm update -g` at startup (recommended `true` on workstations, `false` in Docker / air-gapped). Update failure is non-blocking.
- **Output parsing:** Ralph reads `.ralph/.response_analysis` for `.analysis.exit_signal` and extracts `input_tokens + output_tokens` for token accounting.

### CI integration (Claude Code GitHub Actions)

The repo itself uses Claude Code GitHub Actions: `.github/workflows/claude.yml` (Claude Code integration) and `claude-code-review.yml` (automated PR review). All `actions/checkout` steps set `persist-credentials: false`; claude-code-action strips checkout's auth header and uses its own GitHub App token.

---

## Exit Detection (Dual-Condition Gate)

Ralph uses a **dual-condition check** so it does not quit during productive iterations. **Exit requires BOTH:**

1. `completion_indicators >= 2` (heuristic detection from natural-language patterns), AND
2. Claude's explicit `EXIT_SIGNAL: true` in the `RALPH_STATUS` block (read from `.ralph/.response_analysis`).

| completion_indicators | EXIT_SIGNAL | Result |
|-----------------------|-------------|--------|
| `>= 2` | `true` | **Exit** ("project_complete") |
| `>= 2` | `false` | **Continue** (Claude still working) |
| `>= 2` | missing | **Continue** (defaults to false) |
| `< 2` | `true` | **Continue** (threshold not met) |

**Conflict resolution:** if `STATUS: COMPLETE` but `EXIT_SIGNAL: false`, the explicit `EXIT_SIGNAL` wins (Claude can mark a phase complete while more phases remain — Issue #146).

**Mode-specific heuristics (Issue #224):**
- **JSON mode** (default): heuristics suppressed entirely — only an explicit `EXIT_SIGNAL: true` can set `exit_signal=true`.
- **Text mode**: requires `confidence_score >= 70` AND `has_completion_signal=true`.

**Example behavior:**
```
Loop 5: Claude outputs "Phase complete, moving to next feature"
        → completion_indicators: 3 (high confidence from patterns)
        → EXIT_SIGNAL: false (Claude says more work needed)
        → Result: CONTINUE (respects Claude's explicit intent)

Loop 8: Claude outputs "All tasks complete, project ready"
        → completion_indicators: 4
        → EXIT_SIGNAL: true (Claude confirms done)
        → Result: EXIT with "project_complete"
```

**Other exit conditions (checked before completion indicators):**
- `MAX_CONSECUTIVE_DONE_SIGNALS=2` — repeated "done" signals.
- `MAX_CONSECUTIVE_TEST_LOOPS=3` — too many test-only iterations.
- `TEST_PERCENTAGE_THRESHOLD=30` — flag if testing dominates recent loops.
- All `- [ ]` items in `.ralph/fix_plan.md` checked — **except** unchecked items under optional sections (Issue #239). `_count_blocking_unchecked()` (awk, section-aware) ignores unchecked items under headings matching `OPTIONAL_SECTIONS` (default `"Optional,Future,Future Enhancements,Nice to Have"`, case-insensitive, configurable in `.ralphrc`).
- Claude API 5-hour usage limit reached (prompt to wait or exit).

**Startup state reset (Issue #194):** every `ralph` invocation unconditionally resets `.exit_signals` and removes `.response_analysis` before the main loop, so stale signals from a crashed prior run can't trigger an exit on iteration 1.

### Optional / Future sections in fix_plan.md
```markdown
## High Priority
- [x] Core feature

## Optional
- [ ] Frontend integration   # does NOT block exit
- [ ] SMS notifications      # does NOT block exit
```

---

## The Ralph Files (.ralph/)

After `ralph-enable` / `ralph-import`, the project gets a `.ralph/` directory:

| File | Auto-Generated? | You should… |
|------|-----------------|-------------|
| `.ralph/PROMPT.md` | Yes (smart defaults) | **Review & customize** project goals and principles |
| `.ralph/fix_plan.md` | Yes (can import tasks) | **Add/modify** specific implementation tasks |
| `.ralph/AGENT.md` | Yes (detects build commands) | Rarely edit (auto-maintained by Ralph) |
| `.ralph/specs/` | Empty directory | Add files when PROMPT.md isn't detailed enough |
| `.ralph/specs/stdlib/` | Empty directory | Add reusable patterns and conventions |
| `.ralphrc` | Yes (project-aware) | Rarely edit (sensible defaults) |

**File relationships:**
```
PROMPT.md (high-level goals)
    ↓
specs/ (detailed requirements when needed)
    ↓
fix_plan.md (specific tasks Ralph executes)
    ↓
AGENT.md (build/test commands - auto-maintained)
```

**Project structure (a Ralph-managed project):**
```
my-project/
├── .ralph/                 # Ralph configuration and state (hidden folder)
│   ├── PROMPT.md           # Main development instructions for Ralph
│   ├── fix_plan.md         # Prioritized task list
│   ├── AGENT.md            # Build and run instructions
│   ├── specs/              # Project specifications and requirements
│   │   └── stdlib/         # Standard library specifications
│   ├── examples/           # Usage examples and test cases
│   ├── logs/               # Ralph execution logs
│   └── docs/generated/     # Auto-generated documentation
├── .ralphrc                # Ralph configuration file (tool permissions, settings)
└── src/                    # Source code implementation (at project root)
```

Hidden state files in `.ralph/` include `.call_count`, `.exit_signals`, `.circuit_breaker_state`, `.claude_session_id`, `.ralph_session`, `.ralph_session_history`, `.response_analysis`, `status.json`, `.github_lifecycle_state`, `queue.json`. Migrate older flat-layout projects with `ralph-migrate`.

---

## Configuration (.ralphrc)

A minimal `.ralphrc` (from README):

```bash
# .ralphrc - Ralph project configuration
PROJECT_NAME="my-project"
PROJECT_TYPE="typescript"

# Claude Code CLI command (auto-detected, override if needed)
CLAUDE_CODE_CMD="claude"
# CLAUDE_CODE_CMD="npx @anthropic-ai/claude-code"  # Alternative: use npx

# Shell init file — source before running claude (useful for zsh/fish users)
#RALPH_SHELL_INIT_FILE="~/.zshrc"

# Loop settings
MAX_CALLS_PER_HOUR=100
CLAUDE_TIMEOUT_MINUTES=15
CLAUDE_OUTPUT_FORMAT="json"
# Token budget per hour (0 = disabled). One Claude call can use 100k+ tokens.
#MAX_TOKENS_PER_HOUR=500000

# Tool permissions
ALLOWED_TOOLS="Write,Read,Edit,Bash(git *),Bash(npm *),Bash(pytest)"

# Session management
SESSION_CONTINUITY=true
SESSION_EXPIRY_HOURS=24

# Circuit breaker thresholds
CB_NO_PROGRESS_THRESHOLD=3
CB_SAME_ERROR_THRESHOLD=5
```

### Default `ALLOWED_TOOLS` (from `templates/ralphrc.template`)

The shipped template uses **granular git subcommands** (not broad `Bash(git *)`) to prevent Claude from running destructive commands (`git clean`, `git rm`, `git reset`) that could delete `.ralph/` (Issue #149):

```bash
ALLOWED_TOOLS="Write,Read,Edit,Bash(git add *),Bash(git commit *),Bash(git diff *),Bash(git log *),Bash(git status),Bash(git status *),Bash(git push *),Bash(git pull *),Bash(git fetch *),Bash(git checkout *),Bash(git branch *),Bash(git stash *),Bash(git merge *),Bash(git tag *),Bash(npm *),Bash(pytest)"
```

> Compound commands (pipes `|`, redirects `2>&1`, `;`/`&&` chains) may not match `Bash(cmd *)` patterns due to a Claude CLI limitation (Issue #243). Ralph detects this and continues with a warning rather than halting.

### Modern Claude CLI configuration keys
```bash
CLAUDE_CODE_CMD="claude"              # CLI command; e.g. "npx @anthropic-ai/claude-code"
CLAUDE_OUTPUT_FORMAT="json"           # json (default) or text
CLAUDE_ALLOWED_TOOLS="Write,Read,Edit,Bash(git add *),...,Bash(npm *),Bash(pytest)"
CLAUDE_USE_CONTINUE=true              # Session continuity
CLAUDE_MIN_VERSION="2.0.76"           # Minimum Claude CLI version
CLAUDE_AUTO_UPDATE=true               # Auto-update Claude CLI at startup
CLAUDE_MODEL=""                       # --model override (e.g. claude-sonnet-4-6); empty = CLI default
CLAUDE_EFFORT=""                      # --effort override (high/low); empty = CLI default
ENABLE_NOTIFICATIONS=false            # Desktop notifications; or --notify / -n
ENABLE_BACKUP=false                   # Git backup branches; or --backup / -b
```

### Rate limiting & circuit breaker

Two independent hourly-reset limits:

| Setting | Default | Description |
|---------|---------|-------------|
| `MAX_CALLS_PER_HOUR` | `100` | Max Claude invocations per hour |
| `MAX_TOKENS_PER_HOUR` | `0` (disabled) | Max cumulative tokens per hour (`input_tokens + output_tokens` per response) |

**Exit thresholds** (in `~/.ralph/ralph_loop.sh`):
```bash
MAX_CONSECUTIVE_TEST_LOOPS=3     # Exit after 3 test-only loops
MAX_CONSECUTIVE_DONE_SIGNALS=2   # Exit after 2 "done" signals
TEST_PERCENTAGE_THRESHOLD=30     # Flag if 30%+ loops are test-only
```

**Circuit breaker thresholds:**
```bash
CB_NO_PROGRESS_THRESHOLD=3       # Open circuit after 3 loops with no file changes
CB_SAME_ERROR_THRESHOLD=5        # Open circuit after 5 loops with repeated errors
CB_OUTPUT_DECLINE_THRESHOLD=70   # Open circuit if output declines by >70%
CB_PERMISSION_DENIAL_THRESHOLD=2 # Open after 2 loops with permission denials
CB_COOLDOWN_MINUTES=30           # Minutes before OPEN → HALF_OPEN auto-recovery (0 = immediate)
CB_AUTO_RESET=false              # true = reset to CLOSED on startup (bypasses cooldown)
```
Auto-recovery: `OPEN → HALF_OPEN → CLOSED` after the cooldown. `ralph --auto-reset-circuit` sets `CB_AUTO_RESET=true` for one run.

### Claude API 5-hour limit handling

Four-layer detection avoids false positives (stream-json output echoes file content that may mention "5-hour limit"):
1. **Timeout guard** — exit 124 checked first (never treated as API limit).
2. **Structural JSON** — parses `rate_limit_event` for `"status":"rejected"` (definitive CLI signal).
3. **Filtered text fallback** — searches only `tail -30`, filtering out `"type":"user"`, `"tool_result"`, `"tool_use_id"` lines.
4. **Extra Usage quota** — detects "You're out of extra usage".

On detection Ralph prompts: **(1)** wait 60 min for reset (countdown), or **(2)** exit gracefully. **Unattended mode:** auto-waits if the prompt times out (30s).

---

## Templates & Example Prompts

### `templates/PROMPT.md` — the master loop prompt (verbatim, abridged to the load-bearing parts)

The PROMPT template establishes Ralph's persona ("You are Ralph, an autonomous AI development agent…"), objectives, principles, protected-files rules, testing limits (~20% of effort per loop), and — critically — the **status block contract** that drives exit detection.

**Core objectives & principles (verbatim):**
```
## Current Objectives
1. Study .ralph/specs/* to learn about the project specifications
2. Review .ralph/fix_plan.md for current priorities
3. Implement the highest priority item using best practices
4. Use parallel subagents for complex tasks (max 100 concurrent)
5. Run tests after each implementation
6. Update documentation and fix_plan.md

## Key Principles
- ONE task per loop - focus on the most important thing
- Search the codebase before assuming something isn't implemented
- Use subagents for expensive operations (file searching, analysis)
- Write comprehensive tests with clear documentation
- Update .ralph/fix_plan.md with your learnings
- Commit working changes with descriptive messages
```

**Protected files (verbatim):**
```
## Protected Files (DO NOT MODIFY)
The following files and directories are part of Ralph's infrastructure.
NEVER delete, move, rename, or overwrite these under any circumstances:
- .ralph/ (entire directory and all contents)
- .ralphrc (project configuration)
```

**The required status block (verbatim) — this is what Claude must emit every loop:**
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

**When to set `EXIT_SIGNAL: true` (verbatim) — ALL must be met:**
```
1. ✅ All items in fix_plan.md are marked [x]
2. ✅ All tests are passing (or no tests exist for valid reasons)
3. ✅ No errors or warnings in the last execution
4. ✅ All requirements from specs/ are implemented
5. ✅ You have nothing meaningful left to implement
```

The template also includes 6 "Specification by Example" exit scenarios (Successful Completion, Test-Only Loop, Stuck on Recurring Error, No Work Remaining, Making Progress, Blocked on External Dependency), each showing the exact `RALPH_STATUS` block to emit and the corresponding "Ralph's Action". Testing guidance (verbatim):
```
## 🧪 Testing Guidelines (CRITICAL)
- LIMIT testing to ~20% of your total effort per loop
- PRIORITIZE: Implementation > Documentation > Tests
- Only write tests for NEW functionality you implement
- Do NOT refactor existing tests unless broken
- Do NOT add "additional test coverage" as busy work
- Focus on CORE functionality first, comprehensive testing later
```

### `templates/fix_plan.md` (verbatim)
```markdown
# Ralph Fix Plan

## High Priority
- [ ] Set up basic project structure and build system
- [ ] Define core data structures and types
- [ ] Implement basic input/output handling
- [ ] Create test framework and initial tests

## Medium Priority
- [ ] Add error handling and validation
- [ ] Implement core business logic
- [ ] Add configuration management
- [ ] Create user documentation

## Low Priority
- [ ] Performance optimization
- [ ] Extended feature set
- [ ] Integration with external services
- [ ] Advanced error recovery

## Optional
<!-- Issue #239: unchecked items in this section (and "Future"/"Future Enhancements"/
     "Nice to Have") do NOT block Ralph's exit. ... Configure the section
     names via OPTIONAL_SECTIONS in .ralphrc. -->
- [ ] Nice-to-have enhancements (non-blocking)

## Completed
- [x] Project initialization

## Notes
- Focus on MVP functionality first
- Ensure each feature is properly tested
- Update this file after each major milestone
```

### `templates/AGENT.md`

Provides build/test/run command stubs (npm / pip / cargo) plus a **Feature Development Quality Standards** section mandating: 85% min coverage, 100% test pass rate, unit+integration+e2e tests, conventional-commit git workflow on feature branches (never `main`), documentation sync, and a feature-completion checklist. Key directive (verbatim): *"AI agents should automatically apply these standards to all feature development tasks without requiring explicit instruction for each task."*

### Example: `examples/simple-cli-tool/.ralph/PROMPT.md` (verbatim)
```markdown
# Ralph Development Instructions

## Context
You are Ralph, building a command-line todo application in Node.js. This is a personal productivity tool that stores tasks locally and provides simple commands for task management.

## Current Objectives
1. Create a CLI that supports add, list, complete, and delete commands
2. Store todos in ~/.todos.json with automatic file creation
3. Provide clear, helpful output for all operations
4. Handle errors gracefully with actionable messages

## Technology Stack
- Node.js 18+
- commander.js for CLI argument parsing
- Native fs/promises for file operations
- Jest for testing

## Key Principles
- Single responsibility: each command does one thing well
- Fail gracefully: missing file = empty list, not an error
- Clear output: users should always know what happened
- Testable: core logic separated from CLI layer

## Command Specifications

### `todo add "task description"`
- Adds a new task with auto-incrementing ID
- Outputs: "Added task #3: Buy groceries"

### `todo list`
- Shows all tasks with status indicators
- [ ] for pending, [x] for completed
- Outputs: "No tasks yet" if empty

### `todo complete <id>`
- Marks task as done
- Errors if ID doesn't exist

### `todo delete <id>`
- Removes task permanently
- Errors if ID doesn't exist

## Data Format
{
  "nextId": 4,
  "tasks": [
    {"id": 1, "text": "Buy groceries", "completed": false},
    {"id": 2, "text": "Call mom", "completed": true}
  ]
}

## Quality Standards
- All commands have --help documentation
- Unit tests for storage module
- Integration tests for CLI commands
```

### Example: `examples/rest-api/.ralph/PROMPT.md` (verbatim)
```markdown
# Ralph Development Instructions

## Context
You are Ralph, building a REST API for a bookstore inventory management system. The API allows staff to manage books, authors, and inventory levels.

## Technology Stack
- Python 3.11+ with FastAPI
- PostgreSQL with SQLAlchemy (async)
- Pydantic for request/response validation
- pytest with pytest-asyncio for testing
- JWT authentication

## Key Principles
- Follow REST conventions strictly (proper HTTP methods, status codes)
- All endpoints except GET require authentication
- Use async/await throughout for database operations
- Every endpoint should have at least one test
- Return consistent error responses (see specs/api.md)

## Data Entities
- **Book**: title, isbn, author_id, price, quantity_in_stock
- **Author**: name, bio, born_date

## Quality Standards
- OpenAPI documentation auto-generated
- Input validation with descriptive error messages
- Database transactions for multi-step operations
- Pagination on list endpoints

## Files to Reference
- See specs/api.md for detailed endpoint specifications
- Follow fix_plan.md for task priorities
```

### Custom prompts
```bash
ralph --prompt my_custom_instructions.md
ralph --monitor --prompt my_custom_instructions.md
```

---

## Importing Requirements

### From a PRD / spec document
Supported formats: Markdown, text, JSON, Word (.docx), PDF, "any text-based format".
```bash
ralph-import product-requirements.md my-app
ralph-import requirements.txt webapp
ralph-import api-spec.json backend-service
ralph-import design-doc.pdf            # auto-names project from filename
```
Generates `.ralph/PROMPT.md`, `.ralph/fix_plan.md`, `.ralph/specs/requirements.md`, `.ralphrc`, and the standard structure. Uses Claude Code's JSON output for the conversion.

### From GitHub Issues
Prerequisites: `gh` CLI installed & authenticated (`gh auth login`), plus `jq`.
```bash
ralph-import --github-issue 42
ralph-import --github-search "fix login timeout"
ralph-import --github-label "sprint-1"
ralph-import --github-issue 42 --repo myorg/myrepo
ralph-import --github-issue 42 --include-comments     # off by default (prompt-injection surface)
```
Metadata filters (combinable, oldest-first): `--github-label "bug,P0"` (comma = AND), `--github-title "[P0]*"` (`*` wildcard), `--github-assignee @me|none`, `--github-milestone "v1.0"`, `--github-state open|closed|all`, `--exclude-label wontfix`. Selection: `--select first|interactive|priority`. Preview with `--dry-run`.

**Completeness assessment (Issue #70):** issues are scored 0–100; below `--completeness-threshold` (default 60) Claude Code generates an implementation plan (preserved at `.ralph/specs/implementation-plan.md`). Flags: `--generate-plan`, `--no-generate-plan`, `--plan-model opus`, `--auto-approve`.

> **Security note:** issue comments are excluded by default — anyone can comment on public repos and comment text flows into the AI conversion prompt. Use `--include-comments` only when you trust the discussion.

---

## GitHub Issue Lifecycle & Queue

### Lifecycle (`ralph --github-issue <ref>`)
`<ref>` accepts `69`, `#69`, `owner/repo#69`, or a full URL. All actions are opt-in, use the `gh` CLI, and degrade gracefully on permission failure. State in `.ralph/.github_lifecycle_state`.

```bash
ralph --github-issue 69 --comment-progress --comment-interval 5
ralph --github-issue 69 --create-pr --link-issue --close-summary --auto-close
ralph --github-issue 69 --auto-close --add-label completed --create-followups --followup-label tech-debt
ralph --github-issue 69 --create-pr --draft-pr
```

| Flag | Effect |
|------|--------|
| `--github-issue REF` | Track the issue (required for all lifecycle features) |
| `--comment-progress` / `--comment-interval N` | Progress comments every N loops (default 5) |
| `--auto-close` | Close the issue on graceful completion |
| `--close-summary` | Post a completion summary comment |
| `--create-pr` / `--link-issue` / `--draft-pr` | Create PR (linked with `Closes #N`; optional draft) |
| `--create-followups` / `--followup-label LABEL` | Open a grouped follow-up issue for TODO/FIXME markers (default label `tech-debt`) |
| `--add-label LABEL` | Label to add on close (repeatable) |

### Batch queue (`ralph-queue`)
Persistent queue at `.ralph/queue.json`, processed sequentially (single branch, no concurrency).
```bash
ralph-queue add --github-label "bug,P0"
ralph-queue add --github-issues 69,70,71
ralph-queue add --github-milestone "v1.0"
ralph-queue add --prd ./docs/feature.md

ralph-queue status [--json]       # also ralph --queue-status
ralph-queue next / reorder / validate / remove 69 / clear

ralph --process-queue [--halt-on-failure]   # priority + dependency order; commits "Fix #N: <title>"
ralph --resume-queue
```
Priority read from `P0`–`P9` / `priority: PN` labels; dependencies parsed from issue body (`depends on #N`, `blocked by #N`, `requires #N`). Progress in `.ralph/logs/queue_processing.log`.

---

## Sandbox Execution

Optional: run only Claude's execution inside an isolated environment; Ralph's loop, rate limiting, and monitoring stay host-side.

### Docker (`--sandbox docker`, Issue #74)
```bash
docker pull ghcr.io/frankbria/ralph-sandbox:latest
docker tag ghcr.io/frankbria/ralph-sandbox:latest ralph-sandbox:latest
# or: docker build -t ralph-sandbox .

ralph --sandbox docker                          # default image, 4g RAM, 2 CPUs, bridge network
ralph --sandbox docker --sandbox-image node:20  # any image with `claude` on PATH
ralph --sandbox docker --sandbox-memory 8g --sandbox-cpus 4
ralph --sandbox docker --sandbox-network none   # full isolation (blocks the Claude API)
ralph --monitor --sandbox docker
```
Project bind-mounted rw at `/workspace` (changes land on host directly). Credentials: `ANTHROPIC_API_KEY` → `0600` env-file passed to `docker run --env-file`; otherwise `~/.claude/.credentials.json` is *copied* into a container-scoped home (the real `~/.claude` is never touched). One persistent container per run; setup failure is fatal (never falls back to host).

### E2B cloud (`--sandbox e2b`, Issue #75)
```bash
pip install e2b
export E2B_API_KEY="e2b_..."          # or ~/.ralph/e2b_api_key (chmod 600)

ralph --sandbox e2b
ralph --sandbox e2b --sandbox-template my-template
ralph --sandbox e2b --sandbox-timeout 7200
ralph --sandbox e2b --sandbox-max-cost 5.00 --sandbox-cost-alert 2.00
ralph --sandbox e2b --sandbox-keep-alive       # reuse with --sandbox-id <id>
ralph --sandbox e2b --sync-include "src/**,tests/**,*.md" --sync-exclude "*.log,node_modules"
```
No bind mount in the cloud → project uploaded once at start, changed files downloaded after every iteration (with deletion propagation). `.git` excluded both directions — in-sandbox commits are NOT synced back (changes arrive as uncommitted host modifications). Cost = cumulative runtime × `SANDBOX_E2B_COST_PER_HOUR`, surfaced in `status.json`, the monitor, and `.ralph/logs/e2b_cost.log`. Sync filtering via `--sync-include`/`--sync-exclude`, a `.ralphignore` file (gitignore-like subset), and `SYNC_MAX_FILE_SIZE`/`SYNC_LARGE_FILE_ACTION`.

> Docker and E2B are the final/only sandbox providers (Daytona/Cloudflare are not planned — #79, #80).

---

## Command Reference

### Installation (run once)
```bash
./install.sh              # Install Ralph globally
./uninstall.sh            # Remove Ralph (dedicated script)
./install.sh uninstall    # Alternative removal
./install.sh --help       # Installation help
ralph-migrate             # Migrate existing project to .ralph/ structure
```

### `ralph [OPTIONS]`
```
  -h, --help              Show help message
  -c, --calls NUM         Set max calls per hour (default: 100)
  -p, --prompt FILE       Set prompt file (default: .ralph/PROMPT.md)
  -s, --status            Show current status and exit
  -m, --monitor           Start with tmux session and live monitor
  -v, --verbose           Show detailed progress updates during execution
  -l, --live              Enable live streaming output (real-time Claude Code visibility)
  -t, --timeout MIN       Claude Code execution timeout in minutes (1-120, default: 15)
      --dry-run           Simulate loop execution without making actual Claude API calls
  -n, --notify            Enable desktop notifications for key events
  -b, --backup            Enable automatic git backup branch before each loop
      --rollback [BRANCH] Roll back to a backup branch (lists branches if none given)
      --show-tool-args    Show tool arguments in live streaming output
      --output-format FORMAT   json (default) or text
      --allowed-tools TOOLS    Set allowed Claude tools
      --no-continue            Disable session continuity (start fresh each loop)
      --session-expiry HOURS   Session expiration in hours (default: 24)
      --reset-circuit          Reset the circuit breaker
      --circuit-status         Show circuit breaker status
      --auto-reset-circuit     Auto-reset circuit breaker on startup (bypasses cooldown)
      --reset-session          Reset session state manually
      --queue-status / --process-queue / --resume-queue
      --queue-next / --queue-clear / --queue-remove <id|N>
```
Full per-flag reference: `docs/CLI_OPTIONS.md`.

### Project commands
```bash
ralph-setup project-name     # Create new Ralph project
ralph-enable                 # Enable Ralph in existing project (interactive)
ralph-enable-ci              # Non-interactive enable (--json, --from github, --project-type ...)
ralph-import prd.md project  # Convert PRD/specs to Ralph project
ralph-queue add --github-label bug   # Build a batch queue
ralph-stats                  # Metrics summary from .ralph/logs/metrics.jsonl
ralph-monitor                # Manual monitoring dashboard
```

### tmux session management
```bash
tmux list-sessions           # View active Ralph sessions
tmux attach -t <name>        # Reattach to detached session
# Ctrl+B then D              # Detach (keeps Ralph running)
```

---

## System Requirements

- **Bash 4.0+**
- **Claude Code CLI** — `npm install -g @anthropic-ai/claude-code` (or use npx; set `CLAUDE_CODE_CMD` in `.ralphrc`)
- **tmux** — for integrated monitoring (recommended)
- **jq** — JSON processing for status tracking
- **Git** — projects are initialized as git repos
- **GNU coreutils** — for the `timeout` command (macOS: `brew install coreutils` → provides `gtimeout`, auto-detected)
- **Standard Unix tools** — grep, date, etc.

### Testing (development)
```bash
npm install -g bats bats-support bats-assert

npm test                 # unit + integration (bats tests/unit/ tests/integration/)
npm run test:unit
npm run test:integration
npm run test:e2e         # bats tests/e2e/ — full ralph_loop.sh subprocess runs
bats tests/unit/test_exit_detection.bats   # single file

./tests/test_error_detection.sh
./tests/test_stuck_loop_detection.sh
```
- 784 tests across 34 test files, 100% pass rate. **Test pass rate (100%) is the quality gate** — kcov coverage is informational only (`COVERAGE_THRESHOLD=0`), since kcov can't instrument bats subprocesses ([bats-core#15](https://github.com/bats-core/bats-core/issues/15)).
- `tests/e2e/test_full_loop.bats` runs `ralph_loop.sh` as a real subprocess against an executable mock `claude` CLI (the mock must take >1s/call — sub-second exits are treated as startup failures).

---

## Monitoring & Debugging

```bash
ralph --monitor             # Integrated tmux monitoring (recommended)
ralph-monitor               # Manual monitoring in a separate terminal
ralph --status              # JSON status output
tail -f .ralph/logs/ralph.log
tail -f .ralph/live.log     # with --live
```
Dashboard shows: current loop count/status, API calls vs. limit, recent log entries, rate-limit countdown (and sandbox cost for E2B).

**Common issues (selected):**
- *Ralph exits silently on first loop* — Claude Code CLI not installed / not in PATH. If using npx, set `CLAUDE_CODE_CMD="npx @anthropic-ai/claude-code"` in `.ralphrc`.
- *Premature exit* — check whether Claude is setting `EXIT_SIGNAL: false` (Ralph now respects this).
- *`timeout: command not found` (macOS)* — `brew install coreutils`.
- *Permission denied* — update `ALLOWED_TOOLS` in `.ralphrc` (e.g. `Bash(npm *)`, `Bash(git *)`, `Bash(pytest)`), then `ralph --reset-session` and restart.

---

## Acknowledgments & Related

- Inspired by the [Ralph technique](https://ghuntley.com/ralph/) by Geoffrey Huntley.
- Built for [Claude Code](https://claude.ai/code) by Anthropic.
- The README also notes an in-progress [multi-provider agent abstraction](https://github.com/frankbria/ralph-claude-code/labels/multi-provider) (ADRs 0001/0002) to decouple Ralph from `claude` so other headless coding CLIs (Codex, Gemini, OpenCode, Droid, Kilocode, Copilot) could drive the loop.

---

*Reference compiled from the repository README, `CLAUDE.md`, `templates/`, `examples/`, and `ralph_loop.sh` at `main` (repo version v0.11.5).*
