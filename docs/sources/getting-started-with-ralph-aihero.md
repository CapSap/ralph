# Getting Started With Ralph

**Source:** https://www.aihero.dev/getting-started-with-ralph

A condensed reference for the AI Hero "Getting Started With Ralph" guide.

---

## What is Ralph?

Ralph is **a technique for running AI coding agents in a loop**. You run the same
prompt repeatedly. The AI picks its own tasks from a PRD (Product Requirements
Document). It commits after each feature.

The approach lets you step away while an AI assistant (Claude Code) autonomously
implements features from a PRD, committing changes incrementally.

---

## Core Concepts

### The Ralph Loop

A repeating cycle where Claude Code:

1. Reads a PRD and a progress file
2. Identifies the next incomplete task
3. Implements it
4. Commits the changes
5. Updates progress tracking

...all **one task per iteration**.

### Key Benefits

- Autonomous feature implementation
- Incremental commits for clarity
- Asynchronous ("step away") development workflow
- Customizable task sources and outputs

---

## Prerequisites

1. **Claude Code** - Anthropic's CLI for agentic coding
2. **Docker Desktop 4.50+** - Provides isolated sandboxes for safe AI execution
3. **Git** - For commit attribution
4. **Basic familiarity with bash scripting**

---

## Installation & Setup

### Step 1: Install Claude Code

Using the native binary:

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

If the command isn't found, update your PATH:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

Or install via npm:

```bash
npm i -g @anthropic-ai/claude-code
```

Authenticate by running:

```bash
claude
```

### Step 2: Install Docker Desktop

Run Claude inside a Docker sandbox:

```bash
docker sandbox run claude
```

Sandbox benefits:

- Mounts the working directory at the same path
- Auto-injects your Git config
- Persists state across runs

### Step 3: Create Your Plan File

Use Claude's plan mode to create a PRD:

```bash
claude
```

Press `shift-tab` to enter plan mode, iterate on your plan, then save it to `PRD.md`.

Create a progress file:

```bash
touch progress.txt
```

The PRD can be a markdown checklist, JSON, or prose — what matters is **clear
scope** so tasks can be extracted.

### Step 4: Create `ralph-once.sh` (Human-in-the-Loop)

A single-iteration version, good for learning and observing behavior:

```bash
#!/bin/bash

claude --permission-mode acceptEdits "@PRD.md @progress.txt \
1. Read the PRD and progress file. \
2. Find the next incomplete task and implement it. \
3. Commit your changes. \
4. Update progress.txt with what you did. \
ONLY DO ONE TASK AT A TIME."
```

Make it executable:

```bash
chmod +x ralph-once.sh
```

Key elements:

- `--permission-mode acceptEdits` - Auto-accepts edits to prevent stalling
- `@PRD.md` - References the requirements document
- `@progress.txt` - Tracks completed work
- `ONLY DO ONE TASK` - Enforces small, atomic commits

### Step 5: Create `afk-ralph.sh` (Fully Autonomous)

The looping, away-from-keyboard version:

```bash
#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  exit 1
fi

for ((i=1; i<=$1; i++)); do
  result=$(docker sandbox run claude --permission-mode acceptEdits -p "@PRD.md @progress.txt \
  1. Find the highest-priority task and implement it. \
  2. Run your tests and type checks. \
  3. Update the PRD with what was done. \
  4. Append your progress to progress.txt. \
  5. Commit your changes. \
  ONLY WORK ON A SINGLE TASK. \
  If the PRD is complete, output <promise>COMPLETE</promise>.")

  echo "$result"

  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "PRD complete after $i iterations."
    exit 0
  fi
done
```

Run with a capped iteration count:

```bash
./afk-ralph.sh 20
```

Key elements:

- `set -e` - Exit on any error
- `$1` (iterations) - Caps the loop to prevent cost runaway
- `-p` - Print mode for non-interactive output
- `<promise>COMPLETE</promise>` - Completion sigil used as the exit condition

---

## Best Practices

- **Start with human-in-the-loop**: Run `ralph-once.sh` first, observe behavior,
  verify commits, then iterate before going fully autonomous.
- **Task sizing**: Keep individual tasks small and discrete — one feature per
  loop iteration.
- **Progress tracking**: Maintain both the PRD (desired end state) and the
  progress file (completed work) to give the agent context across iterations.

---

## Customization Options

Ralph's simplicity enables extensive customization:

- **Task sources**: Pull from GitHub Issues, Linear, or custom task lists instead
  of a local PRD.
- **Output formats**: Create branches / PRs instead of committing directly to
  `main`.
- **Loop variations**:
  - **Test Coverage** - Write tests until coverage targets are met
  - **Linting** - Fix lint errors incrementally
  - **Duplication** - Refactor code clones into shared utilities
  - **Entropy** - Scan and clean up code smells

> Any workflow fitting "read repo, improve, commit" works with Ralph.

---

## Notable Takeaways

- Ralph is fundamentally simple: the **same prompt, run in a loop**, with the AI
  selecting its own next task.
- The PRD + progress file pair is the memory mechanism that keeps iterations
  coherent.
- "One task per iteration" plus per-task commits keeps changes atomic and
  reviewable.
- Docker sandboxes provide isolation/safety for autonomous runs.
- Always cap iterations to control cost; use a completion sigil to exit early.
- Begin supervised (human-in-the-loop), then graduate to autonomous (`afk`) runs.

---

## Additional Resources

The guide references an extended article, **"11 tips for AI coding with Ralph"**,
for deeper guidance on feedback loops, task prioritization, and advanced
techniques.
