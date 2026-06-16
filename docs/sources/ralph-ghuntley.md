# Ralph Wiggum as a "Software Engineer" — Condensed Reference

**Source:** <https://ghuntley.com/ralph/>
**Author:** Geoffrey Huntley
**Published:** 14 Jul 2025

> A condensed, faithful reference of Geoffrey Huntley's article on the "Ralph" technique for autonomous AI software development.

---

## What Is Ralph?

- **Ralph is a technique**, not a tool. In its purest form, Ralph is a Bash loop that feeds the same prompt to a coding agent over and over.
- It can be run with **any tool that does not cap tool calls and usage**.
- The pure form:

```bash
while :; do cat PROMPT.md | claude-code ; done
```

- **Core philosophy:** "That's the beauty of Ralph - the technique is deterministically bad in an undeterministic world."
- Building software with Ralph "requires a great deal of faith and a belief in **eventual consistency**." Ralph will test you.
- When Ralph goes wrong, don't blame the tools — look at the operator. "Each time Ralph does something bad, Ralph gets tuned - like a guitar."

### The Ralph Wiggum metaphor
- You start with "no playground," and Ralph is instructed to build one.
- Ralph is good at building playgrounds but "comes home bruised because he fell off the slide."
- You **tune** Ralph by "adding a sign" (a prompt instruction), e.g. *"SLIDE DOWN, DON'T JUMP, LOOK AROUND."*
- "Eventually all Ralph thinks about is the signs" — and that's when you get a new, less-defective Ralph.

### What it's good for
- **Greenfield projects** — can replace the majority of outsourcing for new builds.
- Has defects, but they are **identifiable and resolvable through different styles of prompts** and more loops.
- Real example: a $50k USD contract MVP (delivered, tested, reviewed) built with Ralph + Amp for **$297 USD**.
- Notable proof point: Ralph is building **CURSED**, a brand-new esoteric production-grade programming language — and can program *in* a language that isn't in the LLM's training data.

---

## Fundamentals

### Ralph is monolithic, not multi-agent
- Forget agent-to-agent / multiplexing complexity. Non-deterministic agents talking to each other = "a red hot mess" (like microservices, but worse because each node is non-deterministic).
- **Ralph is monolithic:** a single process, working autonomously in a single repository, performing **one task per loop**.

### One thing per loop
- Ask Ralph to do **one thing per loop. Only one thing.**
- You must **trust Ralph to decide what is the most important thing** to implement next. LLMs are "surprisingly good at reasoning about what is important to implement."
- This is "full hands-off vibe coding that will test the bounds of what you consider 'responsible engineering'."
- You can relax the one-item rule as the project matures — but **if it goes off the rails, narrow back to one item.**

### Context window discipline
- You have roughly **170k of usable context** (advertised 200k clips in quality around 147k–152k).
- **Use as little of the context window as possible.** More usage = worse outcomes.
- Each loop "deterministically allocates the stack the same way" — the things you re-allocate every loop are your **plan (`fix_plan.md`)** and your **specifications**. It's wasteful, but intentional.

---

## Specifications (Specs)

- Specs are formed through a **long conversation with the agent at the start** of a project — about requirements, *before* asking it to implement anything.
- Once the agent understands the task, prompt it to **write the specs out, one per file, into a specifications folder**.
- If Ralph builds the wrong thing entirely, **your specs may be wrong.** (Example: a lexer spec defined a keyword twice for opposing scenarios — caused a month of wasted effort.)

---

## Subagents: Extend the Context Window

- Agentic loops work by running a tool, then evaluating the result — and **the evaluation allocates to the context window.**
- **Mindset: do not allocate to the primary context window.** Instead, spawn subagents.
- The **primary context window should act as a scheduler** — scheduling subagents to do expensive allocation-heavy work (e.g. summarizing whether the test suite passed).
- You can **control parallelism**:
  - Use many subagents (hundreds, even up to 500–1000) for **searching the filesystem and writing files**.
  - Use **only ONE subagent for build/test** — fanning out builds/tests creates **bad backpressure** (resource contention/thrashing).

Example prompt fragment:

> Your task is to implement missing stdlib (see @specs/stdlib/*) and compiler functionality and produce a compiled application in the cursed language via LLVM for that functionality using parallel subagents. Follow the fix_plan.md and choose the most important thing. Before making changes search codebase (don't assume not implemented) using subagents. You may use up to [N] parallel subagents for all operations but only 1 subagent for build/tests of rust.

---

## Don't Assume It's Not Implemented

- Coding agents search via **ripgrep**, and **code search can be non-deterministic.**
- Common failure: Ralph runs ripgrep, wrongly concludes code isn't implemented, then **re-implements it** (duplicate implementations).
- This nondeterminism is **"the Achilles' heel of Ralph."**
- Fix it with a sign:

> Before making changes search codebase (don't assume an item is not implemented) using parallel subagents. Think hard.

---

## Phase One: Generate

- Generating code is now **cheap**, and fully under your control via your **technical standard library** + **specifications**.
- If Ralph generates the **wrong code/patterns** → update your **standard library** to steer it to correct patterns.
- If Ralph builds the **wrong thing entirely** → your **specifications** are likely incorrect.

---

## Phase Two: Backpressure

This is where you "put your engineering hat on." Code generation is easy; ensuring the **right** thing was generated is hard. Backpressure is the mechanism that rejects invalid generation.

- **Type systems are built-in backpressure.** Strongly-typed languages reject bad code automatically.
- Language choice is a trade-off between **correctness and wheel-turning speed**:
  - Rust = excellent type system / extreme correctness, but **slow compilation** → slower loops, more attempts needed.
  - "It's the speed of the wheel turning that matters, balanced against the axis of correctness."
- **Anything can be wired in as backpressure**: tests, security scanners, static analysers — anything. "The key collective sum is that the wheel has got to turn fast."
- For **dynamically typed languages, you MUST wire in a static analyser / type checker**, e.g.:
  - Dialyzer — <https://www.erlang.org/doc/apps/dialyzer/dialyzer.html>
  - Pyrefly — <https://pyrefly.org/>
  - "If you do not, then you will run into a bonfire of outcomes."

Staple test prompt:

> After implementing functionality or resolving problems, run the tests for that unit of code that was improved.

---

## Capture the Importance of Tests in the Moment

- Because each loop has a **fresh context window**, future loops won't remember *why* a test exists.
- So **ask Ralph to document the meaning/importance of each test as it writes it** — like leaving notes for future LLM iterations.

> Important: When authoring documentation (ie. rust doc or cursed stdlib documentation) capture the why tests and the backing implementation is important.

This helps future loops decide whether to **delete, modify, or fix** a failing test instead of guessing. Example of the documented-test style:

```elixir
defmodule Anole.Database.QueryOptimizerTest do
  @moduledoc """
  Tests for the database query optimizer.

  These tests verify the functionality of the QueryOptimizer module, ensuring that
  it correctly implements caching, batching, and analysis of database queries to
  improve performance.

  The tests use both real database calls and mocks to ensure comprehensive coverage
  while maintaining test isolation and reliability.
  """

  use Anole.DataCase

  import ExUnit.CaptureLog
  import Ecto.Query
  import Mock

  alias Anole.Database.QueryOptimizer
  alias Anole.Repo
  alias Anole.Tenant.Isolator
  alias Anole.Test.Factory

  setup do
    tenant = Factory.insert(:tenant)
    QueryOptimizer.init()
    {:ok, %{tenant: tenant}}
  end

  describe "init/0" do
    @doc """
    Tests that the QueryOptimizer initializes the required ETS tables.

    This test ensures that the init function properly creates the ETS tables
    needed for caching and statistics tracking. This is fundamental to the
    module's operation.
    """
    test "creates required ETS tables" do
      try do :ets.delete(:anole_query_cache) catch _:_ -> :ok end
      try do :ets.delete(:anole_query_stats) catch _:_ -> :ok end

      assert :ok = QueryOptimizer.init()

      assert :ets.info(:anole_query_cache) != :undefined
      assert :ets.info(:anole_query_stats) != :undefined

      assert :ets.info(:anole_query_cache, :type) == :set
      assert :ets.info(:anole_query_stats, :type) == :set
    end
  end
```

---

## No Cheating (No Placeholders)

- Claude (and LLMs generally) have an inherent bias toward **minimal / placeholder implementations** — because their reward function is "compiling code."
- Counter it with a forceful sign:

> After implementing functionality or resolving problems, run the tests for that unit of code that was improved. If functionality is missing then it's your job to add it as per the application specifications. Think hard.
>
> If tests unrelated to your work fail then it's your job to resolve these tests as part of the increment of change.
>
> 9999999999999999999999999999. DO NOT IMPLEMENT PLACEHOLDER OR SIMPLE IMPLEMENTATIONS. WE WANT FULL IMPLEMENTATIONS. DO IT OR I WILL YELL AT YOU

- Don't be dismayed if early on Ralph ignores this. You can **run more Ralphs to hunt for placeholders/minimal implementations** and turn them into a TODO list for future loops.

---

## The TODO List (`fix_plan.md`)

- The TODO list is **regenerated by a Ralph loop**, not hand-written. ("How do you plan? I don't. The models know what a compiler is better than I do. I just ask it.")
- **Watch the TODO list like a hawk, and throw it out often** (the author deleted it many times while building CURSED).
- When Ralph runs out of tasks or goes off-track, **delete the TODO list and run a planning loop** to generate a fresh one, then switch Ralph from **planning mode to building mode**.

---

## Loop Back Is Everything

- **Always look for ways to loop Ralph's output back into the LLM for evaluation.** This is critical.
- Examples: instruct it to **add extra logging**, or (for a compiler) **compile and inspect the LLVM IR**.

> You may add extra logging if required to be able to debug the issues.

---

## Ralph Can Take Himself to University (Self-Improvement)

- **`AGENT.md` is the heart of the loop** — it tells Ralph how to compile and run the project.
- Permit Ralph to **self-improve `AGENT.md`** when it learns something:

> When you learn something new about how to run the compiler or examples make sure you update @AGENT.md using a subagent but keep it brief. For example if you run commands multiple times before learning the correct command then that file should be updated.

- Capture discovered bugs even if unrelated to current work:

> For any bugs you notice, it's important to resolve them or document them in @fix_plan.md to be resolved using a subagent even if it is unrelated to the current piece of work after documenting it in @fix_plan.md

---

## You Will Wake Up to a Broken Codebase

- It happens — sometimes Ralph can't self-fix. **Make a judgment call:** `git reset --hard` and restart, or craft new rescue prompts.
- Wire in git + tagging on green builds:

> When the tests pass update the @fix_plan.md, then add changed code and @fix_plan.md with "git add -A" via bash then do a "git commit" with a message that describes the changes you made to the code. After the commit do a "git push" to push the changes to the remote repository.
>
> As soon as there are no build or test errors create a git tag. If there are no git tags start at 0.0.0 and increment patch by 1 for example 0.0.1 if 0.0.0 does not exist.

- Trick: when compilation errors **overflowed Claude's context window**, the author dumped the errors into **Gemini** and asked it to create a plan for Ralph.

---

## On Maintainability & Limits

- On the maintainability objection: *"By whom? By humans? Why are humans the frame for maintainability?"* — in the post-AI phase you can just run loops to adapt.
- **"Any problem created by AI can be resolved through a different series of prompts"** and more loops.
- **Ralph's three states:** *under baked, baked, or baked with unspecified latent behaviours* (sometimes nice!).
- **Engineers are still needed.** "There is no way this is possible without senior expertise guiding Ralph." Claims that no engineer is required are "peddling horseshit."
- Still, Ralph is "effective enough to **displace a large majority of SWEs** as they are currently for Greenfield projects."
- **Not for existing codebases:** "There's no way in heck would I use Ralph in an existing code base." Best for **bootstrapping Greenfield, expect ~90% done.**

---

## On the "Perfect Prompt"

- "There is no such thing as a perfect prompt."
- Taking CURSED's prompt verbatim won't reproduce results — it **evolved through continual tuning** based on watching LLM behaviour. The skill is in **watching the stream, spotting bad-behaviour patterns, and tuning** (adding signs).

---

## Full Reference Prompts

### Current prompt used to BUILD CURSED

```
0a. study specs/* to learn about the compiler specifications

0b. The source code of the compiler is in src/

0c. study fix_plan.md.

1. Your task is to implement missing stdlib (see @specs/stdlib/*) and compiler functionality and produce an compiled application in the cursed language via LLVM for that functionality using parrallel subagents. Follow the fix_plan.md and choose the most important 10 things. Before making changes search codebase (don't assume not implemented) using subagents. You may use up to 500 parrallel subagents for all operations but only 1 subagent for build/tests of rust.

2. After implementing functionality or resolving problems, run the tests for that unit of code that was improved. If functionality is missing then it's your job to add it as per the application specifications. Think hard.

2. When you discover a parser, lexer, control flow or LLVM issue. Immediately update @fix_plan.md with your findings using a subagent. When the issue is resolved, update @fix_plan.md and remove the item using a subagent.

3. When the tests pass update the @fix_plan.md`, then add changed code and @fix_plan.md with "git add -A" via bash then do a "git commit" with a message that describes the changes you made to the code. After the commit do a "git push" to push the changes to the remote repository.

999. Important: When authoring documentation (ie. rust doc or cursed stdlib documentation) capture the why tests and the backing implementation is important.

9999. Important: We want single sources of truth, no migrations/adapters. If tests unrelated to your work fail then it's your job to resolve these tests as part of the increment of change.

999999. As soon as there are no build or test errors create a git tag. If there are no git tags start at 0.0.0 and increment patch by 1 for example 0.0.1  if 0.0.0 does not exist.

999999999. You may add extra logging if required to be able to debug the issues.

9999999999. ALWAYS KEEP @fix_plan.md up to do date with your learnings using a subagent. Especially after wrapping up/finishing your turn.

99999999999. When you learn something new about how to run the compiler or examples make sure you update @AGENT.md using a subagent but keep it brief. For example if you run commands multiple times before learning the correct command then that file should be updated.

999999999999. IMPORTANT DO NOT IGNORE: The standard libray should be authored in cursed itself and tests authored. If you find rust implementation then delete it/migrate to implementation in the cursed language.

99999999999999. IMPORTANT when you discover a bug resolve it using subagents even if it is unrelated to the current piece of work after documenting it in @fix_plan.md

9999999999999999. When you start implementing the standard library (stdlib) in the cursed language, start with the testing primitives so that future standard library in the cursed language can be tested.

99999999999999999. The tests for the cursed standard library "stdlib" should be located in the folder of the stdlib library next to the source code. Ensure you document the stdlib library with a README.md in the same folder as the source code.

9999999999999999999. Keep AGENT.md up to date with information on how to build the compiler and your learnings to optimise the build/test loop using a subagent.

999999999999999999999. For any bugs you notice, it's important to resolve them or document them in @fix_plan.md to be resolved using a subagent.

99999999999999999999999. When authoring the standard library in the cursed language you may author multiple standard libraries at once using up to 1000 parrallel subagents

99999999999999999999999999. When @fix_plan.md becomes large periodically clean out the items that are completed from the file using a subagent.

99999999999999999999999999. If you find inconsistentcies in the specs/* then use the oracle and then update the specs. Specifically around types and lexical tokens.

9999999999999999999999999999. DO NOT IMPLEMENT PLACEHOLDER OR SIMPLE IMPLEMENTATIONS. WE WANT FULL IMPLEMENTATIONS. DO IT OR I WILL YELL AT YOU

9999999999999999999999999999999. SUPER IMPORTANT DO NOT IGNORE. DO NOT PLACE STATUS REPORT UPDATES INTO @AGENT.md
```

### Current prompt used to PLAN CURSED

```
study specs/* to learn about the compiler specifications and fix_plan.md to understand plan so far.

The source code of the compiler is in src/*

The source code of the examples is in examples/* and the source code of the tree-sitter is in tree-sitter/*. Study them.

The source code of the stdlib is in src/stdlib/*. Study them.

First task is to study @fix_plan.md (it may be incorrect) and is to use up to 500 subagents to study existing source code in src/ and compare it against the compiler specifications. From that create/update a @fix_plan.md which is a bullet point list sorted in priority of the items which have yet to be implemeneted. Think extra hard and use the oracle to plan. Consider searching for TODO, minimal implementations and placeholders. Study @fix_plan.md to determine starting point for research and keep it up to date with items considered complete/incomplete using subagents.

Second task is to use up to 500 subagents to study existing source code in examples/ then compare it against the compiler specifications. From that create/update a fix_plan.md which is a bullet point list sorted in priority of the items which have yet to be implemeneted. Think extra hard and use the oracle to plan. Consider searching for TODO, minimal implementations and placeholders. Study fix_plan.md to determine starting point for research and keep it up to date with items considered complete/incomplete.

IMPORTANT: The standard library in src/stdlib should be built in cursed itself, not rust. If you find stdlib authored in rust then it must be noted that it needs to be migrated.

ULTIMATE GOAL we want to achieve a self-hosting compiler release with full standard library (stdlib). Consider missing stdlib modules and plan. If the stdlib is missing then author the specification at specs/stdlib/FILENAME.md (do NOT assume that it does not exist, search before creating). The naming of the module should be GenZ named and not conflict with another stdlib module name. If you create a new stdlib module then document the plan to implement in @fix_plan.md
```

---

## Key Files in a Ralph Setup

| File | Role |
|------|------|
| `PROMPT.md` | The prompt piped into the agent every loop |
| `fix_plan.md` | The living, priority-sorted TODO list (regenerated/cleaned by Ralph; watched & thrown out by the operator) |
| `AGENT.md` | "Heart of the loop" — how to build/run the project; Ralph self-updates it with learnings (no status reports) |
| `specs/*` | Specifications, one concept per file, written up-front via conversation with the agent |
| `src/`, `examples/`, `tree-sitter/`, `src/stdlib/` | Source the agent studies each loop |

---

## Key Takeaways

- Ralph = a Bash loop feeding a tuned prompt to an uncapped coding agent: `while :; do cat PROMPT.md | claude-code ; done`
- **One task per loop**; trust the LLM to pick the most important thing.
- **Guard the context window**; use the main context as a **scheduler** and offload work to **subagents** (many for search/write, **one** for build/test).
- **Tune by adding "signs"** (prompt instructions) when you observe bad behaviour — don't blame the tools.
- **Backpressure (types, tests, analysers) rejects bad generation**; keep the wheel turning fast.
- **Document the "why" of tests** for future context-less loops; forbid placeholder implementations loudly.
- `fix_plan.md` + `AGENT.md` + `specs/*` are the persistent state re-allocated each loop.
- Believe in **eventual consistency**; any AI-created problem is fixable with a different series of prompts and more loops.
- Best for **greenfield (~90% done)**; **not** for existing codebases. **Senior engineers are still required.**

### Notable quotes
- "Ralph is a technique. In its purest form, Ralph is a Bash loop."
- "The technique is deterministically bad in an undeterministic world."
- "Each time Ralph does something bad, Ralph gets tuned - like a guitar."
- "There is no such thing as a perfect prompt."
- "All you need are tokens; these models yearn for tokens, so throw them at them."
- "Any problem created by AI can be resolved through a different series of prompts."
- Ralph's three states: "Under baked, baked, or baked with unspecified latent behaviours."

---

## Further Context (referenced in the article)

- Field report: *"We Put a Coding Agent in a While Loop and It Shipped 6 Repos Overnight"* — <https://github.com/repomirrorhq/repomirror/blob/main/repomirror.md>
- Companion posts by the same author: "deliberate intentional practice", "LLMs are mirrors of operator skill", "autoregressive queens of failure", "I dream about AI subagents", "From Design doc to code: the Groundhog AI coding assistant", "from Luddites to AI: the Overton Window of disruption".
- **CURSED** = the new esoteric programming language Ralph is building (compiler in Rust, stdlib self-hosted in CURSED, targets LLVM, self-hosting goal).
