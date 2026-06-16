# The Ralph Loop — Reference & Framework

A curated knowledge base and a synthesized reference template for **Ralph**: the
technique of running a coding agent (e.g. Claude Code) in a `while` loop, with a
**fresh context window every iteration** and the **filesystem + git history as
the only memory**.

> "Ralph is a Bash loop." — Geoffrey Huntley
>
> ```bash
> while :; do cat PROMPT.md | claude -p ; done
> ```

That one line is the whole idea. Everything else in this repo is about making
that loop *productive and safe*: what goes in `PROMPT.md`, how the agent
remembers things across context resets, and how you stop it from driving off a
cliff.

---

## Why a fresh context each loop?

A long-running agent conversation degrades: the context window fills up,
**compaction** silently drops tokens, and quality falls off in what LinearB
calls the **"dumb zone"** (~60–70% context utilization). Ralph sidesteps this by
throwing the conversation away every iteration and **re-reading state from
files**. Each loop the agent:

1. Reads the plan / spec / progress files (rebuilds context from disk)
2. Picks **exactly one** highest-priority task
3. Implements it
4. Runs **backpressure** (tests, build, lint, types) and fixes until green
5. Commits, and updates the plan/progress files
6. Exits (loop resets context) — or signals completion

The model never has to hold the whole project in its head. The files do.

---

## Repo map

```
.
├── README.md                  ← you are here (synthesized overview + navigation)
├── docs/
│   ├── overview.md            ← the full synthesized writeup of how Ralph works
│   ├── cheatsheet.md          ← one-page quick reference (knobs, files, fixes)
│   ├── comparison.md          ← lineage map + side-by-side of the implementations
│   └── sources/               ← condensed notes from all 9 primary sources
│       ├── the-ralph-loop-stevekinney.md
│       ├── ralph-playbook-claytonfarr.md
│       ├── ralph-ghuntley.md
│       ├── ghuntley-loop.md
│       ├── how-to-ralph-wiggum-ghuntley.md
│       ├── getting-started-with-ralph-aihero.md
│       ├── ralph-snarktank.md
│       ├── ralph-claude-code-frankbria.md
│       └── ralph-loop-linearb.md
└── reference-template/        ← a synthesized, copy-into-your-project starter
    ├── README.md              ← how to use the template
    ├── loop.sh                ← the orchestrator (plan/build modes, safety rails)
    ├── PROMPT_plan.md         ← prompt that produces IMPLEMENTATION_PLAN.md
    ├── PROMPT_build.md        ← prompt that executes one task per loop
    ├── AGENTS.md              ← operational guide the agent maintains
    ├── IMPLEMENTATION_PLAN.md ← the living task list (the agent's working memory)
    └── specs/
        └── EXAMPLE-feature.md ← spec format example
```

---

## Where to start

| If you want to… | Read |
|---|---|
| Understand the technique end to end | [`docs/overview.md`](docs/overview.md) |
| A one-page memory jog | [`docs/cheatsheet.md`](docs/cheatsheet.md) |
| Compare the real-world implementations | [`docs/comparison.md`](docs/comparison.md) |
| Actually run a loop | [`reference-template/README.md`](reference-template/README.md) |
| Read the primary sources | [`docs/sources/`](docs/sources/) |

---

## The core principles (in one screen)

- **Context is the constraint.** Reset it every loop; keep utilization in the
  "smart zone." Re-read state from files instead of remembering it.
- **One task per loop.** Trust the agent to pick the most important thing, do
  only that, then exit.
- **Files are memory.** `IMPLEMENTATION_PLAN.md`, `AGENTS.md`, `specs/`, and git
  history persist across resets. The conversation does not.
- **Backpressure is the safety net.** Tests, type checks, builds, and linters
  *reject* bad generation. No backpressure → the loop happily accumulates
  garbage. Document the *why* of every test so a context-less future loop keeps it.
- **Steer with "signs," not micromanagement.** When you watch the loop misbehave,
  add a durable instruction to the prompt (e.g. "don't assume code isn't
  implemented — search first"; "no placeholder implementations"). Tuning is ~80%
  of the work.
- **Stay monolithic first.** One process, one repo, one task per loop. Reach for
  multi-agent ("Gas Town") only after the single loop is solid.
- **Always cap the blast radius.** `MAX_ITERATIONS`, a no-progress circuit
  breaker, a sandbox, and version control. Ralph is "deterministically bad in an
  undeterministic world" — plan for it to do dumb things.

---

## Source index

Nine primary sources, distilled in [`docs/sources/`](docs/sources/):

| Source | Author | What it is |
|---|---|---|
| [ralph-ghuntley](docs/sources/ralph-ghuntley.md) | Geoffrey Huntley | The originating post ("Ralph Wiggum as a software engineer") |
| [ghuntley-loop](docs/sources/ghuntley-loop.md) | Geoffrey Huntley | "Everything is a loop" — the mindset manifesto |
| [the-ralph-loop-stevekinney](docs/sources/the-ralph-loop-stevekinney.md) | Steve Kinney | Clear primer: components, phases, prompt anatomy |
| [ralph-playbook-claytonfarr](docs/sources/ralph-playbook-claytonfarr.md) | Clayton Farr | The methodology playbook: 3 phases, 2 prompts, 1 loop |
| [how-to-ralph-wiggum-ghuntley](docs/sources/how-to-ralph-wiggum-ghuntley.md) | (fork of Farr) | Playbook README + a full Claude Code CLI tool |
| [getting-started-with-ralph-aihero](docs/sources/getting-started-with-ralph-aihero.md) | AI Hero | Hands-on setup with Claude Code + Docker sandbox |
| [ralph-snarktank](docs/sources/ralph-snarktank.md) | Ryan Carson | PRD-driven impl (`prd.json`, skills, Amp/Claude Code) |
| [ralph-claude-code-frankbria](docs/sources/ralph-claude-code-frankbria.md) | Frank Bria | Production-grade Claude Code impl (rate limit, circuit breaker) |
| [ralph-loop-linearb](docs/sources/ralph-loop-linearb.md) | LinearB | Theory: context rot, compaction, Ralph→Gas Town |

See [`docs/comparison.md`](docs/comparison.md) for how these relate (several are
forks/derivations of one another).

---

## Attribution

The Ralph technique was originated by **Geoffrey Huntley**. This repository only
collects, synthesizes, and re-expresses publicly published material from the
authors above for reference. All credit to the original authors; see each file
in `docs/sources/` for its source URL.
