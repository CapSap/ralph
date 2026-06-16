# Comparison & Lineage

The nine sources are not independent — several are forks or derivations of each
other. This page maps how they relate and compares the runnable implementations
side by side.

---

## Lineage map

```
Geoffrey Huntley — "Ralph Wiggum as a software engineer"  (the origin)
│   ghuntley.com/ralph  +  ghuntley.com/loop (mindset)
│
├── Steve Kinney — "The Ralph Loop"            (primer / explainer)
├── LinearB blog                               (theory: context rot, Gas Town)
├── AI Hero — "Getting Started with Ralph"     (hands-on Claude Code + Docker)
│
├── Clayton Farr — ralph-playbook              (methodology: 3 phases, 2 prompts)
│       │
│       └── ghuntley/how-to-ralph-wiggum       (FORK of Farr's playbook README)
│               └── bundles frankbria's CLI tool ↓
│
├── frankbria/ralph-claude-code                (production-grade Claude Code CLI)
│       └── (its CLI is vendored inside how-to-ralph-wiggum)
│
└── snarktank/ralph  (Ryan Carson)             (PRD-driven; Amp or Claude Code)
```

Key facts:

- **`ghuntley/how-to-ralph-wiggum` is a fork of `ClaytonFarr/ralph-playbook`.**
  Its `README.md` *is* Farr's playbook prose. The repo *also* bundles a full
  Claude Code CLI tool whose lineage traces to **`frankbria/ralph-claude-code`**.
  So that one repo contains two layers with **different file conventions** (see
  the naming table below) — don't mistake that for an inconsistency.
- **frankbria** and **snarktank** are the two substantial, independently-runnable
  Claude Code implementations.
- Kinney, LinearB, and Huntley's posts are **prose** (concepts/theory); aihero is
  a **tutorial** with two short scripts.

---

## Naming divergence (same concept, different filenames)

The single biggest source of confusion when reading across sources:

| Concept | Huntley / frankbria | Farr / playbook | snarktank | aihero |
|---|---|---|---|---|
| Task list / plan | `fix_plan.md` | `IMPLEMENTATION_PLAN.md` | `prd.json` (+ `tasks/prd-*.md`) | `PRD.md` |
| Operational guide | `AGENT.md` / `CLAUDE.md` | `AGENTS.md` | `CLAUDE.md` / `AGENTS.md` | (CLAUDE.md) |
| Progress log | (in `fix_plan.md`) | `progress.txt` | `progress.txt` | `progress.txt` |
| Loop script | `ralph_loop.sh` | `loop.sh` | `ralph.sh` | `afk-ralph.sh` / `ralph-once.sh` |
| Prompt(s) | `PROMPT.md` | `PROMPT_plan.md` + `PROMPT_build.md` | `prompt.md` / `CLAUDE.md` | `PROMPT.md` |
| Completion signal | `---RALPH_STATUS---` block + `EXIT_SIGNAL` | `<promise>COMPLETE</promise>` | `<promise>COMPLETE</promise>` | `<promise>COMPLETE</promise>` |

> The `reference-template/` in this repo standardizes on the **Farr names**
> (`IMPLEMENTATION_PLAN.md`, `AGENTS.md`, split `PROMPT_plan.md`/`PROMPT_build.md`)
> plus the `<promise>COMPLETE</promise>` sigil, since that's the clearest.

---

## Implementation comparison

| | **frankbria/ralph-claude-code** | **snarktank/ralph** | **aihero scripts** | **Farr playbook** |
|---|---|---|---|---|
| Maturity | Production-grade tool | Solid, clean | Minimal tutorial | Methodology only |
| Agent | Claude Code | Amp *or* Claude Code (`--tool claude`) | Claude Code | Claude Code |
| Plan format | `fix_plan.md` (markdown) | `prd.json` (structured) | `PRD.md` | `IMPLEMENTATION_PLAN.md` |
| Task selection | highest-priority incomplete | highest-priority story `passes:false` | next undone in PRD | highest-priority incomplete |
| Permissions | **avoids** skip-perms (keeps circuit breaker) | `--dangerously-skip-permissions --print` | `acceptEdits` (once) / `-p` (afk) | n/a |
| Exit conditions | dual-condition gate + `EXIT_SIGNAL` | `<promise>COMPLETE</promise>` or `max_iterations` | sigil or iteration cap | sigil |
| Safety extras | rate limit, **circuit breaker**, session `--resume`, Docker/E2B, GitHub issue import/queue | fresh instance each loop, quality checks, archiving | Docker sandbox | conventions |
| Default max iter | configurable (`.ralphrc`) | 10 | passed as `$1` | n/a |
| Best for | unattended, robust, GitHub-driven runs | PRD/story-driven feature work | learning / first try | designing your own |

---

## Completion signals in detail

- **`<promise>COMPLETE</promise>`** (Kinney, Farr, snarktank, aihero) — the agent
  prints this tagged sigil only when everything is done and verified; the loop
  greps stdout for it and exits.
- **`---RALPH_STATUS---` block** (frankbria) — a structured status block the
  agent emits each loop; a **dual-condition exit** requires both an explicit
  `EXIT_SIGNAL` *and* an all-tasks-complete state, reducing false "done"s.

Choosing: a single sigil is simpler and fine for most projects; the
dual-condition gate is worth it for long unattended runs where a premature
"complete" is costly.

---

## Which should I use?

- **Learning the technique:** read [overview.md](overview.md), then copy
  [`../reference-template/`](../reference-template/) and run a tiny project.
- **Want a battle-tested, unattended Claude Code runner:** use
  **frankbria/ralph-claude-code** (circuit breaker, rate limiting, GitHub
  integration).
- **PRD/story-driven product work:** use **snarktank/ralph** (`prd.json`, skills).
- **Designing your own house style:** follow **Farr's playbook** and adapt the
  `reference-template/` here.
