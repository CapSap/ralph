# Ralph Reference Template

A minimal, well-commented, synthesized Ralph setup you can **copy into a project**
and run. It blends the clearest ideas from the sources (see
[`../docs/comparison.md`](../docs/comparison.md)):

- plan/build prompt split — *Clayton Farr*
- `<promise>COMPLETE</promise>` completion sigil — *Kinney / snarktank / aihero*
- `MAX_ITERATIONS` hard cap — *Kinney*
- no-progress circuit breaker — *frankbria*
- per-loop commit + logging — common practice

> This is a **reference**, not a hardened product. For an unattended,
> battle-tested runner, use `frankbria/ralph-claude-code`; for PRD/story-driven
> work, `snarktank/ralph`. See the comparison doc.

## What's here

```
reference-template/
├── loop.sh                  # the orchestrator (plan/build modes + safety rails)
├── parse_stream.js          # renders the agent's stream as readable progress
├── PROMPT_plan.md           # plan mode: turns specs/ into IMPLEMENTATION_PLAN.md
├── PROMPT_build.md          # build mode: one task per loop until done
├── AGENTS.md                # operational guide (how to build/test/run)
├── IMPLEMENTATION_PLAN.md   # the living task list (working memory)
└── specs/
    └── EXAMPLE-feature.md   # spec format example
```

## Prerequisites

- A coding agent CLI on your PATH — **Claude Code** (`claude`) by default.
  Override with `CLAUDE_CMD` (e.g. `CLAUDE_CMD="npx @anthropic-ai/claude-code"`).
- **git** — Ralph uses commits as memory and as the undo button.
- A **sandbox / disposable environment** for unattended runs (Docker, a VM, or a
  dedicated box). The loop can run the agent with broad permissions.
- *Optional:* **node** — enables the readable streamed output (see below). Without
  it the loop silently falls back to the plain text stream.

## Use it

1. **Copy the template into your project (a git repo):**

   ```bash
   cp -r reference-template/* /path/to/your/project/
   cd /path/to/your/project
   git init   # if it isn't already a repo; commit a clean baseline
   ```

2. **Fill in the inputs:**
   - Write one or more specs in `specs/` (delete `EXAMPLE-feature.md`). Keep each
     to one topic — no "and" in the topic sentence.
   - Fill in `AGENTS.md` with your real build/test/run commands and conventions.

3. **Plan** (generates `IMPLEMENTATION_PLAN.md`, writes no code):

   ```bash
   ./loop.sh plan
   ```

   Review the generated plan. Edit it. This is your last cheap chance to steer.

4. **Build** (executes one task per loop until done or capped):

   ```bash
   ./loop.sh build
   ```

   Watch the first few iterations. When you see the loop do something dumb, add a
   durable instruction (a "sign") to `PROMPT_build.md` or `AGENTS.md` and re-run.
   Tuning is most of the work.

## Knobs (environment variables)

| Var | Default | Meaning |
|---|---|---|
| `MAX_ITERATIONS` | `50` | hard cap on loops (cost + runaway guard) |
| `MAX_NOOP` | `3` | abort after N consecutive loops with no new commit |
| `COMPLETION_SIGIL` | `<promise>COMPLETE</promise>` | string that signals "done" |
| `CLAUDE_CMD` | `claude` | agent command (e.g. `npx @anthropic-ai/claude-code`) |
| `MODEL` | _(unset)_ | model override, e.g. `opus`; empty uses the CLI default |
| `LOG_DIR` | `logs` | where per-iteration logs are written |
| `STREAM` | `auto` | `auto`/`1`/`0` — readable streamed output (needs node) |
| `RENDERER` | `./parse_stream.js` | the stream renderer to pipe through |
| `NO_COLOR` | _(unset)_ | set to any value to drop ANSI codes from output + logs |

```bash
MAX_ITERATIONS=20 MODEL=opus ./loop.sh build
```

## Watching the loop (readable output)

Headless mode (`claude -p`) normally prints **nothing until the turn is over** —
which is exactly backwards for a loop you are supposed to babysit and tune. So
`loop.sh` runs the agent with `--output-format stream-json` and pipes it through
`parse_stream.js`, which renders the firehose as it happens:

```
⚙  claude-opus-5 · permissions: acceptEdits · session 296076d4
⏱  usage: 5h 54% · 7d 9%

Picking task 3: wire up the parser. Reading the plan first.

🔧 Read
   📄 IMPLEMENTATION_PLAN.md

   ⧉ context: 18.5k tokens
   ↳ Result:
     ## Tasks
     - [ ] 3. Wire up the parser
     ... +2 more lines

🔧 Bash
   $ npm test
   ✗ Error:
     npm ERR! test failed

────────────────────────────────────────────────────────
✅ Done in 1m 32s | Cost: $0.4211 | Tokens: ↓58.2k ↑1.2k | Tools: 5 | Peak ctx: 25.2k
```

Why each piece is there — every line answers a question a Ralph operator
actually asks:

- **Tool-by-tool progress** — "is it doing something dumb *right now*?" That is
  the moment you spot the need for a new "sign" in `PROMPT_build.md`.
- **`⚙ permissions:`** — "did this iteration really start unattended?" The
  difference between `acceptEdits` and `bypassPermissions` is the whole safety
  story, and it is easy to change by accident.
- **`⧉ context`** — "is this task too big for one loop?" Ralph's premise is
  staying in the smart zone (~40–60% of the window); this is the number that
  tells you when a task needs splitting.
- **`⏱ usage`** — "why did iteration 14 die?" Long runs hit the usage window,
  not a bug. Printed in 10% steps, and in red once you're throttled.
- **The summary line** — per-iteration cost, so a runaway loop shows up in the
  log rather than on the invoice. `↓` counts prompt-side tokens *including
  cache reads*, which is the real work done.

Notes:

- The **rendered** text is what gets teed to `logs/`, so the completion-sigil
  grep sees the same thing you do — even when the agent emits the sigil across
  several stream chunks.
- Logs contain ANSI colour codes. Run with `NO_COLOR=1`, or strip them:
  `sed -r 's/\x1b\[[0-9;]*m//g' logs/build-001-*.log`.
- `STREAM=0` gives you the raw agent output instead (no node needed).
- `parse_stream.js` is standalone — it works on any Claude Code stream:
  `claude -p "..." --verbose --output-format stream-json | node parse_stream.js`

---

## How it stops

- **Done:** the agent prints `<promise>COMPLETE</promise>` → exit 0.
- **Circuit breaker:** `MAX_NOOP` loops in a row with no commit → exit 1 (check
  `logs/` and the `## Blocked` section of `IMPLEMENTATION_PLAN.md`).
- **Cap:** `MAX_ITERATIONS` reached without completion → exit 1 (safety stop;
  review and re-run).

## Human-in-the-loop variant

For a supervised run, edit `loop.sh`: replace `--dangerously-skip-permissions`
with `--permission-mode acceptEdits` (and/or set `MAX_ITERATIONS=1` to step one
task at a time). Start supervised; go unattended only once you trust the setup.

## Safety reminders

- Run on a **fully-committed** repo so any iteration is recoverable (`git reset`).
- Prefer a **sandbox** for unattended runs.
- Ralph is *"deterministically bad in an undeterministic world"* — expect the
  occasional broken build and plan for recovery.
