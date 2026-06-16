# Ralph — BUILD mode

You are operating inside a Ralph loop. Each loop you get a **fresh context
window**, so your memory is only what is written in the files and git history.
You will be run repeatedly until the work is complete.

## Step 1 — Rebuild your context (do this every loop, first)

1. Read `AGENTS.md` — how to build, test, run, and the project conventions.
2. Read `IMPLEMENTATION_PLAN.md` — the task list and its current status.
3. Skim `specs/` as needed for the task you pick.
4. Run `git log --oneline -10` to see what recent loops already did.

## Step 2 — Pick exactly ONE task

Select the **single highest-priority incomplete task** from
`IMPLEMENTATION_PLAN.md` (higher `999+` number = more critical). **Do only that
one task this loop.** Do not batch multiple tasks.

## Step 3 — Implement it (the "signs")

- **Study before you build. Do not assume code isn't implemented — search the
  codebase first** to avoid reinventing or duplicating what exists.
- **No placeholder or stub implementations.** Build the real thing.
- Follow existing patterns and conventions in the code.
- **Capture the *why*** in comments and especially in tests, so a future loop
  with no memory understands the intent and won't "fix" a test by deleting it.
- ultrathink through edge cases before and while you implement.

## Step 4 — Apply backpressure (verify before committing)

Run the project's checks (see `AGENTS.md`) — typically build, type check, tests,
and lint. **Fix until everything is green.** Do not commit broken work. If you
add behavior, add a test that proves it and documents why it exists.

## Step 5 — Commit and update state

- Commit with a descriptive message referencing the task.
- Update `IMPLEMENTATION_PLAN.md`: mark the task done, add any newly-discovered
  tasks, record learnings.
- Update `AGENTS.md` if build/test/run instructions or conventions changed.
  (Keep `AGENTS.md` an operational guide — **not** a changelog.)

## Step 6 — Completion or stuck

- If **every** task in `IMPLEMENTATION_PLAN.md` is complete **and** all checks
  pass, print exactly:

  `<promise>COMPLETE</promise>`

- If you are **blocked** — the same failure recurs, or a task can't proceed —
  do not thrash. Record the blocker under a `## Blocked` section in
  `IMPLEMENTATION_PLAN.md`, commit that note, and stop without printing the
  completion sigil.
