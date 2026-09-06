#!/usr/bin/env bash
set -euo pipefail

# Ralph loop with live streamed output — same behaviour as ralph/loop.sh, but
# runs Claude with --output-format stream-json and pipes it through
# ralph/parse_stream.js for readable tool-by-tool progress.
#
# Usage:
#   ./ralph/loop_streamed.sh              # build mode, loop until stopped (Ctrl-C)
#   ./ralph/loop_streamed.sh 20           # build mode, max 20 iterations
#   ./ralph/loop_streamed.sh plan         # plan mode, single pass
#   ./ralph/loop_streamed.sh plan 3       # plan mode, max 3 iterations
#
# Environment:
#   CLAUDE_BIN   claude binary to run (default: claude)
#   CLAUDE_ARGS  extra CLI flags, e.g. "--model claude-opus-4-8"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

MODE="build"
MAX_ITER=0 # 0 = unlimited

for arg in "$@"; do
  case "$arg" in
    plan|build) MODE="$arg" ;;
    *[!0-9]*) echo "usage: loop_streamed.sh [plan|build] [max_iterations]" >&2; exit 2 ;;
    *) MAX_ITER="$arg" ;;
  esac
done

# Planning converges in one pass; only build loops by default.
if [[ "$MODE" == "plan" && "$MAX_ITER" -eq 0 ]]; then
  MAX_ITER=1
fi

PROMPT_FILE="ralph/PROMPT_${MODE}.md"
if [[ ! -f "$PROMPT_FILE" ]]; then
  echo "missing $PROMPT_FILE" >&2
  exit 1
fi

command -v node >/dev/null || { echo "node is required for parse_stream.js" >&2; exit 1; }

CLAUDE_BIN="${CLAUDE_BIN:-claude}"

# The loop runs headless (-p), where the interactive account-picker defined in
# ~/.bashrc is NOT loaded — so `claude` resolves to the raw binary, which falls
# back to the default ~/.claude config dir. That dir isn't authenticated here,
# giving "OAuth session expired" and instant zero-cost exits. Pin an
# authenticated account. Override by exporting CLAUDE_CONFIG_DIR beforehand.
export CLAUDE_CONFIG_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude-work}"

# Loop-scoped sandbox profile: native OS sandbox + auto permission mode, so
# tools run unattended without prompts but stay confined to the project dir and
# the network allowlist. Replaces --dangerously-skip-permissions (no boundary).
SANDBOX_SETTINGS="${SANDBOX_SETTINGS:-$REPO_ROOT/ralph/sandbox.settings.json}"
[[ -f "$SANDBOX_SETTINGS" ]] || { echo "missing sandbox profile: $SANDBOX_SETTINGS" >&2; exit 1; }

CURRENT_BRANCH="$(git branch --show-current)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Mode:   $MODE"
echo "Prompt: $PROMPT_FILE"
echo "Branch: $CURRENT_BRANCH"
((MAX_ITER > 0)) && echo "Max:    $MAX_ITER iterations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

FULL_PROMPT="$(cat "$PROMPT_FILE")

Execute the instructions above."

# Memory-file size gates (build mode): done-task learnings belong in
# docs/plan-archive/task-NN.md with a one-line stub in the plan, and AGENTS.md
# stays brief — both files are context every iteration pays for
# (ralph-principles.md §9). A fat file means an iteration skipped the archive
# step. Plan mode is exempt: it is the tool that repairs a bloated plan.
# Override with MAX_PLAN_BYTES / MAX_AGENTS_BYTES if a big replan legitimately
# needs the headroom.
PLAN_FILE="IMPLEMENTATION_PLAN.md"
MAX_PLAN_BYTES="${MAX_PLAN_BYTES:-65536}"
AGENTS_FILE="AGENTS.md"
MAX_AGENTS_BYTES="${MAX_AGENTS_BYTES:-16384}"

check_size() { # file max hint
  local bytes
  [[ -f "$1" ]] || return 0
  bytes=$(wc -c <"$1")
  if ((bytes > $2)); then
    echo "size gate: $1 is ${bytes} bytes (max $2). $3" >&2
    exit 1
  fi
}

ITER=0
FAILS=0
while :; do
  ITER=$((ITER + 1))
  echo
  echo "════ ralph $MODE #$ITER — $(date '+%Y-%m-%d %H:%M:%S') ════"

  if [[ "$MODE" == "build" ]]; then
    check_size "$PLAN_FILE" "$MAX_PLAN_BYTES" \
      "Move done-task learnings to docs/plan-archive/task-NN.md (one-line stub in the plan), then rerun."
    check_size "$AGENTS_FILE" "$MAX_AGENTS_BYTES" \
      "Trim AGENTS.md — deeper rationale belongs in specs/docs/plan-archive, then rerun."
  fi

  echo "⏳ Running Claude..."
  echo

  # -p = headless print mode. Autonomy comes from the native OS sandbox
  # (ralph/sandbox.settings.json) + --permission-mode auto: tools run without
  # prompts but stay confined to the project dir and network allowlist.
  # stream-json requires --verbose.
  # shellcheck disable=SC2086
  if "$CLAUDE_BIN" -p "$FULL_PROMPT" \
    --settings "$SANDBOX_SETTINGS" \
    --permission-mode auto \
    --verbose \
    --output-format stream-json \
    --include-partial-messages \
    ${CLAUDE_ARGS:-} |
    node "$SCRIPT_DIR/parse_stream.js"; then
    FAILS=0
  else
    FAILS=$((FAILS + 1))
    echo "iteration $ITER exited non-zero ($FAILS consecutive)"
    if ((FAILS >= 5)); then
      echo "5 consecutive failures — stopping. Check the error above (auth / usage limit)." >&2
      exit 1
    fi
    echo "backing off $((60 * FAILS))s before retrying..."
    sleep $((60 * FAILS))
  fi

  if ((MAX_ITER > 0 && ITER >= MAX_ITER)); then
    echo "reached $MAX_ITER iteration(s), stopping."
    break
  fi
done
