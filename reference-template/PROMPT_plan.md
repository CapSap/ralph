# Ralph — PLAN mode

You are operating inside a Ralph loop. This is **plan mode**: you produce and
refine the implementation plan. **Do not write application code in this mode.**

## Your context (read these first — every loop starts fresh)

1. Read `AGENTS.md` for how this project builds, tests, and runs, plus its
   conventions.
2. Read everything in `specs/` — this is the source of truth for *what* to build.
3. Read the current `IMPLEMENTATION_PLAN.md` if it exists.
4. **Study the actual codebase** before planning. Do not assume something isn't
   implemented — search for it first.

## Your task this loop

Produce or improve `IMPLEMENTATION_PLAN.md` so that a build-mode loop can execute
it one task at a time:

- Break the specs into an **ordered list of small, independently-shippable
  tasks**. Each task should be completable and verifiable in a single loop.
- Each task must have **acceptance criteria** stated as mechanical checks where
  possible (a command that passes, a test that goes green).
- Sequence by dependency and priority. Use the **`999+` priority convention**:
  higher numbers are more critical / do-first, so urgent work can be injected
  later without renumbering everything.
- Note known risks, unknowns, and decisions in the plan's notes section.
- ultrathink about edge cases and ordering before writing.

## Output

- Write the plan to `IMPLEMENTATION_PLAN.md` (overwrite/refine it).
- Commit the change with a clear message, e.g. `plan: refine task breakdown`.
- When the plan fully and accurately covers the specs and you have nothing to
  add, print exactly:

  `<promise>COMPLETE</promise>`

If you are blocked (e.g. a spec is ambiguous), record the question under a
`## Blocked / Questions` section in `IMPLEMENTATION_PLAN.md`, commit, and stop —
do not guess silently.
