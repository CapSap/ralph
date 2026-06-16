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

## Open decisions (next up)

> Proposed starting stance noted; pending confirmation.

- **Plan/state format** — markdown plan vs. structured `prd.json`.
  *Proposed:* markdown (editable while babysitting). _pending_
- **Prompt structure** — one `PROMPT.md` vs. split plan/build.
  *Proposed:* split (cheap planning gate). _pending_
- **Task selection** — agent freely picks vs. ordered priority list.
  *Proposed:* ordered list + `999+` priority (predictable). _pending_
- **Completion detection** — single sigil vs. dual-condition gate. _not discussed_
- **Branching/integration** — push to master vs. branches/PRs. _not discussed_

## Parking Lot (revisit deliberately)

- **ENVIRONMENT** — the gate on final autonomy/containment decisions. Options:
  - (a) **Local machine + branch isolation** — simplest; blast radius = the repo.
  - (b) **Docker / devcontainer** — cage the agent; reproducible; more setup.
  - (c) **Disposable VM** — Huntley-style; cage the blast radius, free the agent.
  - Couples to: permission level for autonomous mode (decision #1 in the table)
    and the containment model (decision #6).
- **Subagent offloading** (search/build) for context hygiene — deferred per D1.
