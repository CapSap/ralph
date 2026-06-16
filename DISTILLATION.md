# My Ralph Loop — Distillation (working doc)

> **Status: in progress.** Built through conversation while reviewing the 9
> sources in `docs/sources/`. Captures *my* decisions, what's parked, and why.
> This is the thinking record — not a template (that comes later, once decided).

## Use case & constraints

- **Scope:** both greenfield and brownfield — handled by *one* setup with an
  optional brownfield "reverse-engineer specs" bootstrap (see D3). One git
  repo/dir per project.
- **Autonomy:** babysit first, walk away later → build **both modes behind one
  switch**, default supervised (see D2).
- **Environment:** **UNDECIDED — parked.** See Parking Lot.
- **Scale:** solo, single-agent only. No multi-agent / "Gas Town" (see D1).

## Principles I'm keeping (the settled bedrock)

- Fresh context every loop; **files + git are the only memory.**
- **One task per loop.**
- **Backpressure is mandatory** (tests/types/build/lint) — and document the
  *why* of each test so a memory-less loop won't delete it.
- **Spec quality dominates** outcomes (the high-leverage input).
- **Tune via "signs"** — watch it fail, add a durable instruction. ~80% of the work.
- **Cap the blast radius** — iteration limits + version control, always.

## Decisions made

- **D1 — Scale: monolithic, single-context loop.** No multi-agent. Subagent
  offloading of search/build (Huntley's nuance) is *deferred* until context
  pressure actually appears.
- **D2 — Autonomy: dual-mode behind one switch, default supervised.** Start
  `acceptEdits` + `MAX_ITERATIONS=1` + watch the stream; graduate to unattended
  with higher caps as trust builds. Robust completion + circuit-breaker patterns
  matter most *after* walking away — start simple, keep the upgrade path open.
- **D3 — Green/brown: one setup, not two.** Core loop is identical; only the
  front end differs (write specs vs. extract specs from existing code). Add an
  optional brownfield bootstrap step rather than a second template. One git
  repo/dir per project regardless.
- **D4 — The spec is the durable source of truth; the plan is disposable.**
  I hand-edit the **spec** until it's right. The **plan is generated from
  (spec + current repo state) and thrown out often** — it's a scratch artifact,
  not persistent memory. **"Done-ness" is read from reality** (the code/tests
  that exist in the repo), *not* from checkboxes in a persisted plan. This also
  settles the format question: the plan is throwaway markdown — no need for
  structured `prd.json` pass-tracking. → Memory = **spec + repo + git history**.
- **D5 — Prompt structure: split, explicit.** Separate `PROMPT_plan.md` and
  `PROMPT_build.md`. The planning phase is the cheap, high-value steering gate.
- **D6 — Task selection: judgment-driven, evolving plan.** Models tend to grab
  item #1, which is fine *because* the plan is freshly regenerated and
  judgment-ordered right before building. **Judgment lives in the re-plan step**
  (re-assess "given what's built now, what matters most?"). Build mode is told to
  re-evaluate, not blindly take #1. The plan genuinely evolves as the repo grows.
- **D7 — Learnings live in a dedicated, human-readable file, read every loop and
  treated as binding.** A *learning* becomes a *standing rule* when I promote it
  into this file; curating it is a core operator job (this is Huntley's "signs,"
  kept explicit). **Mechanism:** the prompt opens by telling the agent to read
  the durable files first and treat them as law — that's what makes a file an
  every-turn instruction (context resets, so nothing binds unless re-read).
  Tests/backpressure remain the *enforcement* layer (complementary, not replaced):
  tests catch "code regressed," the rules file catches "don't go down road X."
  - _Open sub-point:_ two files (`AGENTS.md` operational + `LEARNINGS.md` rules)
    vs. one file with two sections. _pending_
- **D8 — Plan regeneration cadence: operator-driven.** I re-run plan mode
  whenever the plan has gone stale (cheap, disposable). Automate re-plan triggers
  later, when walking away.

## Open decisions (next up)

- **Completion detection** — single sigil vs. dual-condition gate.
  _coupled to autonomy; revisit when we settle environment_
- **Branching/integration** — push to master vs. branches/PRs.
  _coupled to environment; revisit then_

## Parking Lot (revisit deliberately)

- **ENVIRONMENT** — the gate on final autonomy/containment decisions. Options:
  - (a) **Local machine + branch isolation** — simplest; blast radius = the repo.
  - (b) **Docker / devcontainer** — cage the agent; reproducible; more setup.
  - (c) **Disposable VM** — Huntley-style; cage the blast radius, free the agent.
  - Couples to: permission level for autonomous mode (decision #1 in the table)
    and the containment model (decision #6).
- **Subagent offloading** (search/build) for context hygiene — deferred per D1.
