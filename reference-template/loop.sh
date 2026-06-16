#!/usr/bin/env bash
#
# loop.sh — a synthesized Ralph loop (reference implementation)
# ------------------------------------------------------------------
# Runs a coding agent (Claude Code) in a loop. Each iteration gets a FRESH
# context window; the agent's only memory is the files on disk + git history.
#
# Design blends ideas from the sources (see ../docs/comparison.md):
#   - plan/build mode split ............... Clayton Farr's playbook
#   - <promise>COMPLETE</promise> sigil ... Kinney / snarktank / aihero
#   - MAX_ITERATIONS hard cap ............. Kinney
#   - no-progress circuit breaker ........ frankbria/ralph-claude-code
#   - per-iteration commit + logging ..... common practice
#
# USAGE
#   ./loop.sh build            # default: execute one task per loop
#   ./loop.sh plan             # generate/refine IMPLEMENTATION_PLAN.md, no code
#   MAX_ITERATIONS=20 ./loop.sh build
#
# SAFETY: this script can run an agent unattended with broad permissions.
# Run it inside a sandbox / disposable environment / dedicated box, on a repo
# that is fully committed. Ralph is "deterministically bad in an undeterministic
# world" — assume it will occasionally do something dumb, and contain it.
# ------------------------------------------------------------------

set -uo pipefail

# ---- configuration (override via env) ----------------------------
MODE="${1:-build}"                              # build | plan
MAX_ITERATIONS="${MAX_ITERATIONS:-50}"          # hard ceiling on loops
MAX_NOOP="${MAX_NOOP:-3}"                        # abort after N no-progress loops
COMPLETION_SIGIL="${COMPLETION_SIGIL:-<promise>COMPLETE</promise>}"
CLAUDE_CMD="${CLAUDE_CMD:-claude}"              # or: "npx @anthropic-ai/claude-code"
MODEL="${MODEL:-}"                              # e.g. "opus"; empty = CLI default
LOG_DIR="${LOG_DIR:-logs}"

PROMPT_FILE="PROMPT_${MODE}.md"

# ---- preflight ---------------------------------------------------
if [[ "$MODE" != "build" && "$MODE" != "plan" ]]; then
  echo "error: mode must be 'build' or 'plan' (got '$MODE')" >&2
  exit 2
fi
if [[ ! -f "$PROMPT_FILE" ]]; then
  echo "error: prompt file '$PROMPT_FILE' not found" >&2
  exit 2
fi
if ! command -v "${CLAUDE_CMD%% *}" >/dev/null 2>&1; then
  echo "error: agent command '${CLAUDE_CMD%% *}' not on PATH" >&2
  exit 2
fi
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "error: not inside a git repo — Ralph relies on git for memory + undo" >&2
  exit 2
fi

mkdir -p "$LOG_DIR"

# Optional per-iteration model flag.
MODEL_FLAG=()
[[ -n "$MODEL" ]] && MODEL_FLAG=(--model "$MODEL")

echo "── Ralph loop ──────────────────────────────────────────"
echo "  mode            : $MODE"
echo "  prompt          : $PROMPT_FILE"
echo "  max iterations  : $MAX_ITERATIONS"
echo "  noop breaker    : $MAX_NOOP"
echo "  completion sigil: $COMPLETION_SIGIL"
echo "────────────────────────────────────────────────────────"

noop_count=0

for (( i=1; i<=MAX_ITERATIONS; i++ )); do
  ts="$(date +%Y%m%d-%H%M%S 2>/dev/null || echo "iter")"
  log_file="$LOG_DIR/${MODE}-$(printf '%03d' "$i")-${ts}.log"
  head_before="$(git rev-parse HEAD 2>/dev/null || echo none)"

  echo
  echo "▶ iteration $i/$MAX_ITERATIONS  →  $log_file"

  # ---- run the agent on a fresh context -------------------------
  # We pipe the standing prompt in via -p (print/headless mode). The agent
  # reads the plan/specs/AGENTS.md itself, does ONE task, commits, and may
  # print the completion sigil. Output is teed to a log so we can inspect
  # the stream and grep for the sigil.
  #
  # --dangerously-skip-permissions lets the loop run unattended. Remove it
  # (or swap for --permission-mode acceptEdits) for a human-in-the-loop run.
  "$CLAUDE_CMD" -p "$(cat "$PROMPT_FILE")" \
      --dangerously-skip-permissions \
      "${MODEL_FLAG[@]}" \
      2>&1 | tee "$log_file"

  # ---- completion check -----------------------------------------
  if grep -qF "$COMPLETION_SIGIL" "$log_file"; then
    echo "✅ completion sigil detected — Ralph reports done after $i iteration(s)."
    exit 0
  fi

  # ---- no-progress circuit breaker ------------------------------
  head_after="$(git rev-parse HEAD 2>/dev/null || echo none)"
  if [[ "$head_after" == "$head_before" ]]; then
    noop_count=$(( noop_count + 1 ))
    echo "⚠ no new commit this iteration (no-progress $noop_count/$MAX_NOOP)."
    if (( noop_count >= MAX_NOOP )); then
      echo "🛑 circuit breaker: $MAX_NOOP consecutive no-progress loops. Stopping."
      echo "   Inspect $LOG_DIR/ and IMPLEMENTATION_PLAN.md (look for a Blocked section)."
      exit 1
    fi
  else
    noop_count=0   # progress made; reset the breaker
  fi
done

echo "🔚 reached MAX_ITERATIONS ($MAX_ITERATIONS) without a completion signal."
echo "   This is a safety stop, not necessarily a failure — review and re-run."
exit 1
