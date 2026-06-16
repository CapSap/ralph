# AGENTS.md — Operational Guide

> This is the agent's operational guide: how to build, test, and run this
> project, plus the conventions to follow. **The agent maintains it.** Keep it
> current and accurate. It is **not** a changelog — don't append history here;
> put history in git and learnings in `IMPLEMENTATION_PLAN.md`.

## Project

- **Name:** _<project name>_
- **What it is:** _<one or two sentences>_
- **Stack / language:** _<e.g. TypeScript + Node, Rust, Python>_

## Commands (the backpressure)

These are the checks every build-mode loop must run and keep green:

```bash
# install deps
<install command>          # e.g. npm install

# build
<build command>            # e.g. npm run build

# type check
<typecheck command>        # e.g. npm run typecheck

# tests
<test command>             # e.g. npm test

# lint / format
<lint command>             # e.g. npm run lint
```

## How to run

```bash
<run command>              # e.g. npm run dev
```

## Conventions

- _<code style / formatting rules>_
- _<directory layout: where source, tests, config live>_
- _<naming conventions>_
- _<anything the agent keeps getting wrong — add a "sign" here>_

## Gotchas / non-obvious facts

- _<things a fresh-context agent would not know and must be told>_
