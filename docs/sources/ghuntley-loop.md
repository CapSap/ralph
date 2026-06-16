# Everything Is a Ralph Loop

**Source:** <https://ghuntley.com/loop/>
**Author:** Geoffrey Huntley
**Published:** 17 Jan 2026 (filed under "AI")

> A condensed reference of the key ideas from Geoffrey Huntley's post "everything is a ralph loop."

---

## TL;DR

The article is a conceptual/manifesto-style piece (no code blocks in the post itself). Its core argument: building software has shifted from a vertical, "brick by brick" (Jenga) process to a **loop-based** mindset where you treat LLMs as a new kind of programmable computer. "Ralph" is the name for this loop technique/mindset. Huntley claims traditional software development is "dead" and that the future belongs to engineers who can *program the loop* and build autonomous "software factories."

---

## Core Concepts

### From brick-by-brick to the loop

- **Old way:** Standard software practice builds vertically, "brick by brick — like Jenga."
- **New way:** Approach *everything* as a loop. Software is treated like "clay on the pottery wheel" — if something isn't right, throw it back on the wheel and address what needs resolving.
- The shift is described as fundamental — about **approach, techniques, and best practices**, not merely "acceleration through usage of AI."

### What "Ralph" is

- Ralph is not just **forward mode** (building autonomously) or **reverse mode** (clean-rooming) — it is a **mindset** that these computers can in fact be *programmed*.
- Ralph is an **orchestrator pattern**:
  - Allocate the array with the required backing specifications.
  - Give it a goal.
  - **Loop the goal.**
- The engineer's role persists ("I'm there as an engineer just as I was in the brick-by-brick era"), but now you are **programming the loop**, automating your own job function and removing the need to hire humans.

### Ralph is monolithic, not multi-agent (quoted from the original ralph post)

> While I was in SFO, everyone seemed to be trying to crack on multi-agent, agent-to-agent communication and multiplexing. At this stage, it's not needed. Consider microservices and all the complexities that come with them. Now, consider what microservices would look like if the microservices (agents) themselves are non-deterministic—a red hot mess. What's the opposite of microservices? A monolithic application. A single operating system process that scales vertically. Ralph is monolithic. Ralph works autonomously in a single repository as a single process that performs one task per loop.

Key takeaways from this quote:
- **Don't reach for multi-agent / agent-to-agent / multiplexing** — at this stage it's not needed.
- Non-deterministic agents wired together like microservices become "a red hot mess."
- Ralph = the **monolithic** opposite: a single OS process, scaling vertically.
- It runs **autonomously in a single repository** as **a single process that performs one task per loop**.

---

## The Technique / How to Do It in Practice

- **Watch the loop.** This is where your personal development and learning comes from.
- When you see a **failure domain**, "put on your engineering hat and resolve the problem so it never happens again." (Fix root causes so the loop improves over time.)
- In practice the loop can be run two ways:
  - **Manually** via prompting, or
  - **Via automation with a pause** that requires pressing **CTRL+C** to progress onto the next task.
- Both are still "ralphing." The essence:

> Ralph is about getting the most out [of] how the underlying models work through context engineering and that pattern is GENERIC and can be used for ALL TASKS.

- The underlying enabler is **context engineering** — and the pattern is generic, applicable to all tasks (not just coding).

---

## Build Your Own Coding Agent

Huntley insists practitioners build their own agent and links to a free workshop ("how to build a coding agent").

- **LLMs are a new form of programmable computer.**
- His framing of how simple an agent is:

> It's not that hard to build a coding agent. 300 lines of code running in a loop with LLM tokens. You just keep throwing tokens at the loop, and then you've got yourself an agent.

- He states he won't hire someone "unless you have this fundamental knowledge and can show what you have built with it."

---

## "The Weaving Loom" and Software Factories

- Huntley is building something called **"The Weaving Loom" (Loom)** — source now on his GitHub (with the caveat: "do not use it if your name is not Geoffrey Huntley").
- Loom is described as **infrastructure for evolutionary software** — a concept three years in the making.
- Levels referenced (relative to Steve Yegge's "Gas Town"):
  - **Gas Town** focuses on spinning plates and orchestration — "a full level 8." (ref: <https://steve-yegge.medium.com/welcome-to-gas-town-4f25ee16dd04>)
  - Huntley is going for a **level 9**, where autonomous loops **evolve products and optimise automatically for revenue generation** — "Evolutionary software — also known as a software factory."
- He describes putting Loom under "the mother of all ralph loops" to automatically perform **system verification** — replacing days of planning and weeks of verification with autonomous, AFK loops.
- Any faults identified can be resolved through **forward ralph loops** to rectify issues.

---

## Notable Quotes & Takeaways

- "Software is now clay on the pottery wheel and if something isn't right then I just throw it back on the wheel."
- "Software development is dead — I killed it. Software can now be developed cheaper than the wage of a burger flipper at maccas and it can be built autonomously whilst you are AFK."
- On the split in the industry: some engineers reject AI outright, others merely consume it (Claude Code / Cursor) to accelerate the "lego brick building process" — Huntley argues both miss the deeper shift.
- "What if the models don't stop getting good?" — the central provocation. He warns against still "building Jenga stacks" while principal engineers prove the future is already here.
- A claimed live result (Twitter/X, 17 Jan 2026): running the system under a ralph loop test, it "identified a problem with a feature[,] then it studied the codebase, fixed it, deployed it automatically, verified that it worked" — described as possibly the first **evolutionary software auto-heal**.
- Closing call to action: "Go build your agent, go learn how to program the new computer ... fall in love with all the possibilities and then join me in this space race of building automated software factories."

---

## Distilled Best Practices

1. **Think in loops, not bricks.** Set a goal, loop it, refine like clay rather than stacking vertically.
2. **Stay monolithic.** One process, one repo, one task per loop. Avoid premature multi-agent complexity.
3. **Watch the loop.** Observe failures; that's your learning channel.
4. **Engineer out failure domains permanently** so the same problem never recurs.
5. **Lean on context engineering** — it's the generic mechanism behind getting the most out of the models.
6. **Run forward loops to fix issues** discovered during verification loops.
7. **Build your own coding agent** (~300 lines + a loop + tokens) to internalize that LLMs are programmable computers.

---

*Note: This source article is conceptual and contains no bash scripts, code blocks, or verbatim prompts. The actual ralph loop script lives in Huntley's earlier "original ralph" post referenced here, not in this page.*
