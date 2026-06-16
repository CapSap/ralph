# Ralph (snarktank) — Autonomous AI Agent Loop

**Source:** https://github.com/snarktank/ralph

Ralph is an autonomous AI agent loop that runs AI coding tools ([Amp](https://ampcode.com) or [Claude Code](https://docs.anthropic.com/en/docs/claude-code)) repeatedly until all PRD items are complete. Each iteration is a **fresh instance with clean context**. Memory persists only via git history, `progress.txt`, and `prd.json`.

It is based on [Geoffrey Huntley's "Ralph" pattern](https://ghuntley.com/ralph/). The author (Ryan Carson) wrote an [in-depth article on how he uses Ralph](https://x.com/ryancarson/status/2008548371712135632).

License: MIT (Copyright (c) 2026 snarktank).

---

## Table of Contents

- [Repository Structure](#repository-structure)
- [Core Concept](#core-concept)
- [Prerequisites](#prerequisites)
- [Setup Options](#setup-options)
- [Workflow](#workflow)
- [Key Files Reference](#key-files-reference)
- [Critical Concepts](#critical-concepts)
- [Debugging](#debugging)
- [Archiving](#archiving)
- [File Contents (verbatim)](#file-contents-verbatim)
  - [ralph.sh](#ralphsh)
  - [prompt.md (Amp prompt)](#promptmd--amp-prompt-template)
  - [CLAUDE.md (Claude Code prompt)](#claudemd--claude-code-prompt-template)
  - [prd.json.example](#prdjsonexample)
  - [skills/prd/SKILL.md](#skillsprdskillmd)
  - [skills/ralph/SKILL.md](#skillsralphskillmd)
  - [Plugin / Marketplace manifests](#plugin--marketplace-manifests)
  - [AGENTS.md](#agentsmd)
  - [.gitignore](#gitignore)
  - [GitHub Actions: deploy.yml](#github-actions-deployyml)

---

## Repository Structure

```
ralph/
├── .claude-plugin/
│   ├── marketplace.json        # Claude Code marketplace manifest
│   └── plugin.json             # Plugin manifest (ralph-skills)
├── .github/
│   └── workflows/
│       └── deploy.yml          # Builds & deploys the flowchart to GitHub Pages
├── flowchart/                  # Interactive React Flow visualization of how Ralph works
│   ├── public/vite.svg
│   ├── src/
│   │   ├── assets/react.svg
│   │   ├── App.css
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── .gitignore
│   ├── README.md               # Standard Vite + React + TS template README
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── skills/
│   ├── prd/SKILL.md            # /prd — Generate Product Requirements Documents
│   └── ralph/SKILL.md          # /ralph — Convert PRDs into prd.json format
├── .gitignore
├── AGENTS.md                   # Project-level agent instructions (Amp/Claude read this)
├── CLAUDE.md                   # Prompt template fed to Claude Code each iteration
├── LICENSE                     # MIT
├── README.md
├── prd.json.example            # Example PRD/task-list format
├── prompt.md                   # Prompt template fed to Amp each iteration
├── ralph.sh                    # The bash loop that spawns fresh AI instances
├── ralph-flowchart.png         # Static image of the flowchart (~4.7 MB)
└── ralph.webp                  # Mascot/banner image
```

> Note: `prd.json`, `progress.txt`, and `.last-branch` are generated at runtime and are gitignored. They do not exist in the repo until you run Ralph.

---

## Core Concept

The system operates in three phases:

1. **PRD Creation** — Generate a detailed requirements document using the `/prd` skill.
2. **JSON Conversion** — Transform the markdown PRD into a structured `prd.json` using the `/ralph` skill.
3. **Autonomous Loop** — `ralph.sh` repeatedly spawns fresh AI instances; each picks the highest-priority incomplete story, implements it, runs quality checks, commits, and marks it `passes: true`.

Each iteration is a brand-new agent with no memory. State carries over only through:

- **Git history** — commits from previous iterations
- **`progress.txt`** — append-only learnings/context
- **`prd.json`** — which stories have `passes: true`

The loop ends when all stories pass (the agent emits `<promise>COMPLETE</promise>`) or `max_iterations` is reached.

---

## Prerequisites

- One of the following AI coding tools installed and authenticated:
  - [Amp CLI](https://ampcode.com) (default)
  - [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (`npm install -g @anthropic-ai/claude-code`)
- `jq` installed (`brew install jq` on macOS)
- A git repository for your project

---

## Setup Options

### Option 1: Copy into your project

```bash
# From your project root
mkdir -p scripts/ralph
cp /path/to/ralph/ralph.sh scripts/ralph/

# Copy the prompt template for your AI tool of choice:
cp /path/to/ralph/prompt.md scripts/ralph/prompt.md    # For Amp
# OR
cp /path/to/ralph/CLAUDE.md scripts/ralph/CLAUDE.md    # For Claude Code

chmod +x scripts/ralph/ralph.sh
```

### Option 2: Install skills globally

For **Amp**:

```bash
cp -r skills/prd ~/.config/amp/skills/
cp -r skills/ralph ~/.config/amp/skills/
```

For **Claude Code** (manual):

```bash
cp -r skills/prd ~/.claude/skills/
cp -r skills/ralph ~/.claude/skills/
```

### Option 3: Use as a Claude Code Marketplace

```bash
/plugin marketplace add snarktank/ralph
```

Then install the skills:

```bash
/plugin install ralph-skills@ralph-marketplace
```

Available skills after installation:

- `/prd` — Generate Product Requirements Documents
- `/ralph` — Convert PRDs to `prd.json` format

Skills are automatically invoked when you ask Claude to:

- "create a prd", "write prd for", "plan this feature"
- "convert this prd", "turn into ralph format", "create prd.json"

### Configure Amp auto-handoff (recommended)

Add to `~/.config/amp/settings.json`:

```json
{
  "amp.experimental.autoHandoff": { "context": 90 }
}
```

This enables automatic handoff when context fills up, allowing Ralph to handle large stories that exceed a single context window.

---

## Workflow

### 1. Create a PRD

```
Load the prd skill and create a PRD for [your feature description]
```

Answer the clarifying questions. The skill saves output to `tasks/prd-[feature-name].md`.

### 2. Convert PRD to Ralph format

```
Load the ralph skill and convert tasks/prd-[feature-name].md to prd.json
```

This creates `prd.json` with user stories structured for autonomous execution.

### 3. Run Ralph

```bash
# Using Amp (default)
./scripts/ralph/ralph.sh [max_iterations]

# Using Claude Code
./scripts/ralph/ralph.sh --tool claude [max_iterations]
```

Default is **10 iterations**. Use `--tool amp` or `--tool claude` to select the AI coding backend.

On each iteration Ralph will:

1. Create a feature branch (from PRD `branchName`)
2. Pick the highest-priority story where `passes: false`
3. Implement that single story
4. Run quality checks (typecheck, tests)
5. Commit if checks pass
6. Update `prd.json` to mark story as `passes: true`
7. Append learnings to `progress.txt`
8. Repeat until all stories pass or max iterations reached

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `ralph.sh` | The bash loop that spawns fresh AI instances (supports `--tool amp` or `--tool claude`) |
| `prompt.md` | Prompt template for Amp |
| `CLAUDE.md` | Prompt template for Claude Code |
| `prd.json` | User stories with `passes` status (the task list; generated at runtime) |
| `prd.json.example` | Example PRD format for reference |
| `progress.txt` | Append-only learnings for future iterations (generated at runtime) |
| `skills/prd/` | Skill for generating PRDs (works with Amp and Claude Code) |
| `skills/ralph/` | Skill for converting PRDs to JSON (works with Amp and Claude Code) |
| `.claude-plugin/` | Plugin manifest for Claude Code marketplace discovery |
| `flowchart/` | Interactive visualization of how Ralph works |

### The flowchart

The `flowchart/` directory is a Vite + React + TypeScript app (using React Flow) that provides an interactive, animated walkthrough of how Ralph works. It is deployed to GitHub Pages.

- **[View Interactive Flowchart](https://snarktank.github.io/ralph/)** — click through to see each step with animations.
- Run locally:

```bash
cd flowchart
npm install
npm run dev
```

---

## Critical Concepts

### Each iteration = fresh context

Each iteration spawns a **new AI instance** with clean context. The only memory between iterations is git history, `progress.txt`, and `prd.json`.

### Small tasks

Each PRD item should be small enough to complete in **one context window**. If a task is too big, the LLM runs out of context before finishing and produces poor code.

Right-sized stories:

- Add a database column and migration
- Add a UI component to an existing page
- Update a server action with new logic
- Add a filter dropdown to a list

Too big (split these):

- "Build the entire dashboard"
- "Add authentication"
- "Refactor the API"

### AGENTS.md / CLAUDE.md updates are critical

After each iteration, Ralph updates the relevant `AGENTS.md` (Amp) or `CLAUDE.md` (Claude Code) files with learnings. AI coding tools automatically read these files, so future iterations (and human developers) benefit from discovered patterns, gotchas, and conventions.

Examples of what to add:

- Patterns discovered ("this codebase uses X for Y")
- Gotchas ("do not forget to update Z when changing W")
- Useful context ("the settings panel is in component X")

### Feedback loops

Ralph only works if there are feedback loops:

- Typecheck catches type errors
- Tests verify behavior
- CI must stay green (broken code compounds across iterations)

### Browser verification for UI stories

Frontend stories must include "Verify in browser using dev-browser skill" in their acceptance criteria. Ralph uses the dev-browser skill to navigate to the page, interact with the UI, and confirm changes work.

### Stop condition

When all stories have `passes: true`, the agent outputs `<promise>COMPLETE</promise>` and the loop exits.

---

## Debugging

```bash
# See which stories are done
cat prd.json | jq '.userStories[] | {id, title, passes}'

# See learnings from previous iterations
cat progress.txt

# Check git history
git log --oneline -10
```

### Customizing the prompt

After copying `prompt.md` (for Amp) or `CLAUDE.md` (for Claude Code) into your project, customize it:

- Add project-specific quality check commands
- Include codebase conventions
- Add common gotchas for your stack

---

## Archiving

Ralph automatically archives previous runs when you start a new feature (different `branchName`). Archives are saved to `archive/YYYY-MM-DD-feature-name/`. The logic lives in `ralph.sh` and uses a `.last-branch` marker file to detect when the branch has changed.

---

## File Contents (verbatim)

### ralph.sh

```bash
#!/bin/bash
# Ralph Wiggum - Long-running AI agent loop
# Usage: ./ralph.sh [--tool amp|claude] [max_iterations]

set -e

# Parse arguments
TOOL="amp"  # Default to amp for backwards compatibility
MAX_ITERATIONS=10

while [[ $# -gt 0 ]]; do
  case $1 in
    --tool)
      TOOL="$2"
      shift 2
      ;;
    --tool=*)
      TOOL="${1#*=}"
      shift
      ;;
    *)
      # Assume it's max_iterations if it's a number
      if [[ "$1" =~ ^[0-9]+$ ]]; then
        MAX_ITERATIONS="$1"
      fi
      shift
      ;;
  esac
done

# Validate tool choice
if [[ "$TOOL" != "amp" && "$TOOL" != "claude" ]]; then
  echo "Error: Invalid tool '$TOOL'. Must be 'amp' or 'claude'."
  exit 1
fi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRD_FILE="$SCRIPT_DIR/prd.json"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
ARCHIVE_DIR="$SCRIPT_DIR/archive"
LAST_BRANCH_FILE="$SCRIPT_DIR/.last-branch"

# Archive previous run if branch changed
if [ -f "$PRD_FILE" ] && [ -f "$LAST_BRANCH_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  LAST_BRANCH=$(cat "$LAST_BRANCH_FILE" 2>/dev/null || echo "")
  
  if [ -n "$CURRENT_BRANCH" ] && [ -n "$LAST_BRANCH" ] && [ "$CURRENT_BRANCH" != "$LAST_BRANCH" ]; then
    # Archive the previous run
    DATE=$(date +%Y-%m-%d)
    # Strip "ralph/" prefix from branch name for folder
    FOLDER_NAME=$(echo "$LAST_BRANCH" | sed 's|^ralph/||')
    ARCHIVE_FOLDER="$ARCHIVE_DIR/$DATE-$FOLDER_NAME"
    
    echo "Archiving previous run: $LAST_BRANCH"
    mkdir -p "$ARCHIVE_FOLDER"
    [ -f "$PRD_FILE" ] && cp "$PRD_FILE" "$ARCHIVE_FOLDER/"
    [ -f "$PROGRESS_FILE" ] && cp "$PROGRESS_FILE" "$ARCHIVE_FOLDER/"
    echo "   Archived to: $ARCHIVE_FOLDER"
    
    # Reset progress file for new run
    echo "# Ralph Progress Log" > "$PROGRESS_FILE"
    echo "Started: $(date)" >> "$PROGRESS_FILE"
    echo "---" >> "$PROGRESS_FILE"
  fi
fi

# Track current branch
if [ -f "$PRD_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  if [ -n "$CURRENT_BRANCH" ]; then
    echo "$CURRENT_BRANCH" > "$LAST_BRANCH_FILE"
  fi
fi

# Initialize progress file if it doesn't exist
if [ ! -f "$PROGRESS_FILE" ]; then
  echo "# Ralph Progress Log" > "$PROGRESS_FILE"
  echo "Started: $(date)" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
fi

echo "Starting Ralph - Tool: $TOOL - Max iterations: $MAX_ITERATIONS"

for i in $(seq 1 $MAX_ITERATIONS); do
  echo ""
  echo "==============================================================="
  echo "  Ralph Iteration $i of $MAX_ITERATIONS ($TOOL)"
  echo "==============================================================="

  # Run the selected tool with the ralph prompt
  if [[ "$TOOL" == "amp" ]]; then
    OUTPUT=$(cat "$SCRIPT_DIR/prompt.md" | amp --dangerously-allow-all 2>&1 | tee /dev/stderr) || true
  else
    # Claude Code: use --dangerously-skip-permissions for autonomous operation, --print for output
    OUTPUT=$(claude --dangerously-skip-permissions --print < "$SCRIPT_DIR/CLAUDE.md" 2>&1 | tee /dev/stderr) || true
  fi
  
  # Check for completion signal
  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    echo ""
    echo "Ralph completed all tasks!"
    echo "Completed at iteration $i of $MAX_ITERATIONS"
    exit 0
  fi
  
  echo "Iteration $i complete. Continuing..."
  sleep 2
done

echo ""
echo "Ralph reached max iterations ($MAX_ITERATIONS) without completing all tasks."
echo "Check $PROGRESS_FILE for status."
exit 1
```

Notable behaviors:

- Default tool is `amp`; pass `--tool claude` to use Claude Code.
- Amp is invoked as `cat prompt.md | amp --dangerously-allow-all`.
- Claude Code is invoked as `claude --dangerously-skip-permissions --print < CLAUDE.md`.
- The loop greps each iteration's output for `<promise>COMPLETE</promise>` to detect completion.
- Exits `0` on completion, `1` if max iterations are reached without completing.

---

### prompt.md — Amp prompt template

```markdown
# Ralph Agent Instructions

You are an autonomous coding agent working on a software project.

## Your Task

1. Read the PRD at `prd.json` (in the same directory as this file)
2. Read the progress log at `progress.txt` (check Codebase Patterns section first)
3. Check you're on the correct branch from PRD `branchName`. If not, check it out or create from main.
4. Pick the **highest priority** user story where `passes: false`
5. Implement that single user story
6. Run quality checks (e.g., typecheck, lint, test - use whatever your project requires)
7. Update AGENTS.md files if you discover reusable patterns (see below)
8. If checks pass, commit ALL changes with message: `feat: [Story ID] - [Story Title]`
9. Update the PRD to set `passes: true` for the completed story
10. Append your progress to `progress.txt`

## Progress Report Format

APPEND to progress.txt (never replace, always append):
\```
## [Date/Time] - [Story ID]
Thread: https://ampcode.com/threads/$AMP_CURRENT_THREAD_ID
- What was implemented
- Files changed
- **Learnings for future iterations:**
  - Patterns discovered (e.g., "this codebase uses X for Y")
  - Gotchas encountered (e.g., "don't forget to update Z when changing W")
  - Useful context (e.g., "the evaluation panel is in component X")
---
\```

Include the thread URL so future iterations can use the `read_thread` tool to reference previous work if needed.

The learnings section is critical - it helps future iterations avoid repeating mistakes and understand the codebase better.

## Consolidate Patterns

If you discover a **reusable pattern** that future iterations should know, add it to the `## Codebase Patterns` section at the TOP of progress.txt (create it if it doesn't exist). This section should consolidate the most important learnings:

\```
## Codebase Patterns
- Example: Use `sql<number>` template for aggregations
- Example: Always use `IF NOT EXISTS` for migrations
- Example: Export types from actions.ts for UI components
\```

Only add patterns that are **general and reusable**, not story-specific details.

## Update AGENTS.md Files

Before committing, check if any edited files have learnings worth preserving in nearby AGENTS.md files:

1. **Identify directories with edited files** - Look at which directories you modified
2. **Check for existing AGENTS.md** - Look for AGENTS.md in those directories or parent directories
3. **Add valuable learnings** - If you discovered something future developers/agents should know:
   - API patterns or conventions specific to that module
   - Gotchas or non-obvious requirements
   - Dependencies between files
   - Testing approaches for that area
   - Configuration or environment requirements

**Examples of good AGENTS.md additions:**
- "When modifying X, also update Y to keep them in sync"
- "This module uses pattern Z for all API calls"
- "Tests require the dev server running on PORT 3000"
- "Field names must match the template exactly"

**Do NOT add:**
- Story-specific implementation details
- Temporary debugging notes
- Information already in progress.txt

Only update AGENTS.md if you have **genuinely reusable knowledge** that would help future work in that directory.

## Quality Requirements

- ALL commits must pass your project's quality checks (typecheck, lint, test)
- Do NOT commit broken code
- Keep changes focused and minimal
- Follow existing code patterns

## Browser Testing (Required for Frontend Stories)

For any story that changes UI, you MUST verify it works in the browser:

1. Load the `dev-browser` skill
2. Navigate to the relevant page
3. Verify the UI changes work as expected
4. Take a screenshot if helpful for the progress log

A frontend story is NOT complete until browser verification passes.

## Stop Condition

After completing a user story, check if ALL stories have `passes: true`.

If ALL stories are complete and passing, reply with:
<promise>COMPLETE</promise>

If there are still stories with `passes: false`, end your response normally (another iteration will pick up the next story).

## Important

- Work on ONE story per iteration
- Commit frequently
- Keep CI green
- Read the Codebase Patterns section in progress.txt before starting
```

---

### CLAUDE.md — Claude Code prompt template

This is the Claude Code variant of the prompt. It mirrors `prompt.md` but references `CLAUDE.md` files (instead of `AGENTS.md`), drops the Amp-specific thread URL line, and softens the browser-testing requirement to "if available".

```markdown
# Ralph Agent Instructions

You are an autonomous coding agent working on a software project.

## Your Task

1. Read the PRD at `prd.json` (in the same directory as this file)
2. Read the progress log at `progress.txt` (check Codebase Patterns section first)
3. Check you're on the correct branch from PRD `branchName`. If not, check it out or create from main.
4. Pick the **highest priority** user story where `passes: false`
5. Implement that single user story
6. Run quality checks (e.g., typecheck, lint, test - use whatever your project requires)
7. Update CLAUDE.md files if you discover reusable patterns (see below)
8. If checks pass, commit ALL changes with message: `feat: [Story ID] - [Story Title]`
9. Update the PRD to set `passes: true` for the completed story
10. Append your progress to `progress.txt`

## Progress Report Format

APPEND to progress.txt (never replace, always append):
\```
## [Date/Time] - [Story ID]
- What was implemented
- Files changed
- **Learnings for future iterations:**
  - Patterns discovered (e.g., "this codebase uses X for Y")
  - Gotchas encountered (e.g., "don't forget to update Z when changing W")
  - Useful context (e.g., "the evaluation panel is in component X")
---
\```

The learnings section is critical - it helps future iterations avoid repeating mistakes and understand the codebase better.

## Consolidate Patterns

If you discover a **reusable pattern** that future iterations should know, add it to the `## Codebase Patterns` section at the TOP of progress.txt (create it if it doesn't exist). This section should consolidate the most important learnings:

\```
## Codebase Patterns
- Example: Use `sql<number>` template for aggregations
- Example: Always use `IF NOT EXISTS` for migrations
- Example: Export types from actions.ts for UI components
\```

Only add patterns that are **general and reusable**, not story-specific details.

## Update CLAUDE.md Files

Before committing, check if any edited files have learnings worth preserving in nearby CLAUDE.md files:

1. **Identify directories with edited files** - Look at which directories you modified
2. **Check for existing CLAUDE.md** - Look for CLAUDE.md in those directories or parent directories
3. **Add valuable learnings** - If you discovered something future developers/agents should know:
   - API patterns or conventions specific to that module
   - Gotchas or non-obvious requirements
   - Dependencies between files
   - Testing approaches for that area
   - Configuration or environment requirements

**Examples of good CLAUDE.md additions:**
- "When modifying X, also update Y to keep them in sync"
- "This module uses pattern Z for all API calls"
- "Tests require the dev server running on PORT 3000"
- "Field names must match the template exactly"

**Do NOT add:**
- Story-specific implementation details
- Temporary debugging notes
- Information already in progress.txt

Only update CLAUDE.md if you have **genuinely reusable knowledge** that would help future work in that directory.

## Quality Requirements

- ALL commits must pass your project's quality checks (typecheck, lint, test)
- Do NOT commit broken code
- Keep changes focused and minimal
- Follow existing code patterns

## Browser Testing (If Available)

For any story that changes UI, verify it works in the browser if you have browser testing tools configured (e.g., via MCP):

1. Navigate to the relevant page
2. Verify the UI changes work as expected
3. Take a screenshot if helpful for the progress log

If no browser tools are available, note in your progress report that manual browser verification is needed.

## Stop Condition

After completing a user story, check if ALL stories have `passes: true`.

If ALL stories are complete and passing, reply with:
<promise>COMPLETE</promise>

If there are still stories with `passes: false`, end your response normally (another iteration will pick up the next story).

## Important

- Work on ONE story per iteration
- Commit frequently
- Keep CI green
- Read the Codebase Patterns section in progress.txt before starting
```

---

### prd.json.example

The canonical task-list format. Top-level keys: `project`, `branchName` (prefixed `ralph/`), `description`, and `userStories`. Each story has `id`, `title`, `description`, `acceptanceCriteria` (array), `priority` (number, lower = earlier), `passes` (boolean), and `notes`.

```json
{
  "project": "MyApp",
  "branchName": "ralph/task-priority",
  "description": "Task Priority System - Add priority levels to tasks",
  "userStories": [
    {
      "id": "US-001",
      "title": "Add priority field to database",
      "description": "As a developer, I need to store task priority so it persists across sessions.",
      "acceptanceCriteria": [
        "Add priority column to tasks table: 'high' | 'medium' | 'low' (default 'medium')",
        "Generate and run migration successfully",
        "Typecheck passes"
      ],
      "priority": 1,
      "passes": false,
      "notes": ""
    },
    {
      "id": "US-002",
      "title": "Display priority indicator on task cards",
      "description": "As a user, I want to see task priority at a glance.",
      "acceptanceCriteria": [
        "Each task card shows colored priority badge (red=high, yellow=medium, gray=low)",
        "Priority visible without hovering or clicking",
        "Typecheck passes",
        "Verify in browser using dev-browser skill"
      ],
      "priority": 2,
      "passes": false,
      "notes": ""
    },
    {
      "id": "US-003",
      "title": "Add priority selector to task edit",
      "description": "As a user, I want to change a task's priority when editing it.",
      "acceptanceCriteria": [
        "Priority dropdown in task edit modal",
        "Shows current priority as selected",
        "Saves immediately on selection change",
        "Typecheck passes",
        "Verify in browser using dev-browser skill"
      ],
      "priority": 3,
      "passes": false,
      "notes": ""
    },
    {
      "id": "US-004",
      "title": "Filter tasks by priority",
      "description": "As a user, I want to filter the task list to see only high-priority items.",
      "acceptanceCriteria": [
        "Filter dropdown with options: All | High | Medium | Low",
        "Filter persists in URL params",
        "Empty state message when no tasks match filter",
        "Typecheck passes",
        "Verify in browser using dev-browser skill"
      ],
      "priority": 4,
      "passes": false,
      "notes": ""
    }
  ]
}
```

---

### skills/prd/SKILL.md

The `/prd` skill. It generates a Product Requirements Document from a feature description, asking clarifying questions first and saving to `tasks/prd-[feature-name].md`. It explicitly does NOT implement.

Frontmatter:

```yaml
---
name: prd
description: "Generate a Product Requirements Document (PRD) for a new feature. Use when planning a feature, starting a new project, or when asked to create a PRD. Triggers on: create a prd, write prd for, plan this feature, requirements for, spec out."
user-invocable: true
---
```

Key points from the skill body:

- **The Job:** (1) receive a feature description, (2) ask 3-5 essential clarifying questions with lettered options, (3) generate a structured PRD, (4) save to `tasks/prd-[feature-name].md`. Do NOT start implementing.
- **Clarifying questions** focus on Problem/Goal, Core Functionality, Scope/Boundaries, Success Criteria, and are formatted with lettered options (A/B/C/D) so the user can reply like "1A, 2C, 3B".
- **PRD structure (9 sections):** 1. Introduction/Overview, 2. Goals, 3. User Stories, 4. Functional Requirements (numbered FR-1, FR-2…), 5. Non-Goals (Out of Scope), 6. Design Considerations (optional), 7. Technical Considerations (optional), 8. Success Metrics, 9. Open Questions.
- **User story format:**

```markdown
### US-001: [Title]
**Description:** As a [user], I want [feature] so that [benefit].

**Acceptance Criteria:**
- [ ] Specific verifiable criterion
- [ ] Another criterion
- [ ] Typecheck/lint passes
- [ ] **[UI stories only]** Verify in browser using dev-browser skill
```

- Acceptance criteria must be **verifiable**, not vague ("Button shows confirmation dialog before deleting" — good; "Works correctly" — bad). Any UI story always includes "Verify in browser using dev-browser skill".
- Write for a junior developer / AI agent: explicit, unambiguous, numbered, concrete examples.
- Output: Markdown, located in `tasks/`, filename `prd-[feature-name].md` (kebab-case).
- The skill includes a full worked **Example PRD** ("Task Priority System") and a pre-save **Checklist**.

---

### skills/ralph/SKILL.md

The `/ralph` skill. It converts a markdown PRD into the `prd.json` format Ralph executes.

Frontmatter:

```yaml
---
name: ralph
description: "Convert PRDs to prd.json format for the Ralph autonomous agent system. Use when you have an existing PRD and need to convert it to Ralph's JSON format. Triggers on: convert this prd, turn this into ralph format, create prd.json from this, ralph json."
user-invocable: true
---
```

Key points from the skill body:

- **Output format** is the `prd.json` shape (project, branchName `ralph/[feature-name-kebab-case]`, description, userStories[] each with id, title, description, acceptanceCriteria, priority, passes:false, notes:"").
- **Story Size — the #1 rule:** each story must be completable in ONE iteration / one context window. Rule of thumb: "If you cannot describe the change in 2-3 sentences, it is too big." Includes right-sized vs too-big examples (with how to split each).
- **Story ordering — dependencies first:** schema/migrations → server actions/backend → UI components → dashboard/summary views. Earlier stories must not depend on later ones.
- **Acceptance criteria must be verifiable** (good vs bad examples). Always add `"Typecheck passes"`; add `"Tests pass"` for testable logic; add `"Verify in browser using dev-browser skill"` for UI stories.
- **Conversion rules:** one story → one JSON entry; sequential IDs (US-001…); priority by dependency then document order; all stories start `passes:false` with empty `notes`; `branchName` derived kebab-case and prefixed `ralph/`; always append "Typecheck passes".
- **Splitting large PRDs:** worked example splitting "Add user notification system" into 6 focused stories.
- **Full worked example** converting a "Task Status Feature" markdown PRD into `prd.json`.
- **Archiving:** before writing a new `prd.json`, if an existing one has a different `branchName` and `progress.txt` has content beyond the header, copy both into `archive/YYYY-MM-DD-feature-name/` and reset `progress.txt`. (Note: `ralph.sh` does this automatically at run time; manual archiving is only needed when editing `prd.json` between runs.)
- Ends with a pre-save **Checklist**.

---

### Plugin / Marketplace manifests

`.claude-plugin/marketplace.json`:

```json
{
  "name": "ralph-marketplace",
  "owner": {
    "name": "snarktank"
  },
  "metadata": {
    "description": "Skills for the Ralph autonomous agent system - Generate PRDs and convert them to prd.json format for autonomous execution",
    "version": "1.0.0"
  },
  "plugins": [
    {
      "name": "ralph-skills",
      "source": "./",
      "description": "PRD generation and conversion skills for the Ralph autonomous agent loop",
      "version": "1.0.0",
      "keywords": ["ralph", "prd", "automation", "agent", "planning"],
      "category": "productivity",
      "skills": "./skills/"
    }
  ]
}
```

`.claude-plugin/plugin.json`:

```json
{
  "name": "ralph-skills",
  "version": "1.0.0",
  "description": "Skills for the Ralph autonomous agent system - Generate PRDs and convert them to prd.json format for autonomous execution",
  "author": {
    "name": "snarktank"
  },
  "skills": "./skills/",
  "keywords": ["ralph", "prd", "automation", "agent", "planning", "requirements"]
}
```

---

### AGENTS.md

Project-level agent instructions (Amp and Claude Code automatically read these). Summarizes Ralph, lists commands, key files, the flowchart, and patterns.

```markdown
# Ralph Agent Instructions

## Overview

Ralph is an autonomous AI agent loop that runs AI coding tools (Amp or Claude Code) repeatedly until all PRD items are complete. Each iteration is a fresh instance with clean context.

## Commands

\```bash
# Run the flowchart dev server
cd flowchart && npm run dev

# Build the flowchart
cd flowchart && npm run build

# Run Ralph with Amp (default)
./ralph.sh [max_iterations]

# Run Ralph with Claude Code
./ralph.sh --tool claude [max_iterations]
\```

## Key Files

- `ralph.sh` - The bash loop that spawns fresh AI instances (supports `--tool amp` or `--tool claude`)
- `prompt.md` - Instructions given to each AMP instance
-  `CLAUDE.md` - Instructions given to each Claude Code instance
- `prd.json.example` - Example PRD format
- `flowchart/` - Interactive React Flow diagram explaining how Ralph works

## Flowchart

The `flowchart/` directory contains an interactive visualization built with React Flow. It's designed for presentations - click through to reveal each step with animations.

To run locally:
\```bash
cd flowchart
npm install
npm run dev
\```

## Patterns

- Each iteration spawns a fresh AI instance (Amp or Claude Code) with clean context
- Memory persists via git history, `progress.txt`, and `prd.json`
- Stories should be small enough to complete in one context window
- Always update AGENTS.md with discovered patterns for future iterations
```

---

### .gitignore

```gitignore
# Ralph working files (generated during runs)
prd.json
progress.txt
.last-branch

# Archive is optional to commit
# archive/

# OS files
.DS_Store

#Claude
.claude/
```

---

### GitHub Actions: deploy.yml

Builds the `flowchart/` Vite app and deploys it to GitHub Pages on push to `main`.

```yaml
name: Deploy Flowchart to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: flowchart/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: flowchart

      - name: Build
        run: npm run build
        working-directory: flowchart

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: flowchart/dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

## References

- [Geoffrey Huntley's Ralph article](https://ghuntley.com/ralph/)
- [Amp documentation](https://ampcode.com/manual)
- [Claude Code documentation](https://docs.anthropic.com/en/docs/claude-code)
- [Interactive Ralph flowchart](https://snarktank.github.io/ralph/)
