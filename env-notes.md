# Environment Notes — where to run the bash-calling loop (working doc)

> **Status: in progress, leaning Docker.** Captures the thinking on the
> ENVIRONMENT parking-lot item from `DISTILLATION.md`. This is the gate on the
> final autonomy/containment decisions, so worth getting right. Not finalized.

## The question

Where do I run a loop that lets an agent call bash unattended? So far: WSL +
the built-in Claude Code sandbox. Is that still safe re: footguns?

## The core insight (the thing to hold onto)

**In-process permissions and unattended operation are in tension.**

- Supervised + permission prompts + sandbox = safe, but you're babysitting.
- Unattended Ralph pushes you toward `--dangerously-skip-permissions` (else the
  loop stalls on prompts) — which removes the very guardrail you were trusting.

**Containment resolves the tension.** A cage (container/VM) lets you give the
agent *more* freedom safely, because the boundary is the cage — not the
prompt-gate. The container is what *earns* you the right to skip permissions.

## Why "WSL + built-in sandbox" is fine now but not for unattended

The built-in sandbox gives two real controls:
- **filesystem write-allowlist** (cwd, `$TMPDIR`, a few dirs; denies settings files)
- **network host-allowlist**

That blocks the classic footguns (`rm -rf ~`, writing `~/.bashrc`, exfil to a
random host). But three gaps matter for a *loop*:

1. **It's bypassable by design.** `dangerouslyDisableSandbox` exists, and the
   whole thing sits behind the permission system. Going unattended = turning the
   guardrail off to keep the loop moving.
2. **Reads aren't restricted.** It stops writes and egress, not reads. Any secret
   in the WSL home (SSH keys, cloud creds, `.env`) is readable. Combined with a
   prompt-injection vector (a dependency, a web page, an issue the loop reads),
   that's the realistic unattended risk — not the agent "going rogue" alone.
3. **WSL is not a boundary around your data.** Agent runs as you → blast radius =
   your whole WSL home **plus** `/mnt/c` (Windows drives, auto-mounted, writable).
   That's a *wider* radius than a clean Linux box.

Plus the Ralph-specific one: **the loop's own guardrails live in the repo**
(settings, hooks, permission allowlist). A loop with edit access can weaken its
own cage. Keep guardrail config outside the edited repo, or read-only.

## Decision shape: ENVIRONMENT is two-stage, keyed to D2's autonomy switch

It was never one choice. It maps onto the dual-mode autonomy decision:

- **Supervised (now):** WSL + built-in sandbox + **permission prompts left on**.
  Adequate. Discipline required: *don't* disable permissions to cut friction. If
  prompts start annoying you, that's the signal to graduate — not to skip them.
- **Unattended (when walking away):** stop trusting the in-process sandbox; run
  in a **cage where "the agent can do anything inside" is acceptable.** Then skip
  permissions *safely* because the cage, not the prompt-gate, is the boundary.

## The lean: Docker container

Docker is the cage that earns yolo mode. Calibration: a container is **not** a
perfect security boundary (shared kernel, escapes exist), but it's entirely
adequate for the real threat model — "agent does something dumb/destructive, or
follows a prompt-injection." Not meant to stop a kernel-level adversary; doesn't
need to.

**The cage is only as tight as what you let into it. Rules:**
- Mount **only the project dir**. No host home, no `~/.ssh`, no `/mnt/c`, no
  cloud cred files.
- Never `--privileged`. **Never mount the Docker socket** (`/var/run/docker.sock`)
  — one-line host escape that devcontainer templates sometimes include.
- Keep the iteration cap + a **spend-capped API key**. Docker stops filesystem
  damage but not a runaway loop burning tokens / filling the container disk.

## Saving the work is a *separate* job (don't conflate with the cage)

This is where it started feeling complicated — because two jobs got mixed:
1. **The cage** (so skipping permissions is safe) → Docker. The only decision
   needed right now.
2. **Persistence** → already mostly solved, see below.

**Persistence via bind-mount:** if the container shares the project folder you
already have on your WSL disk, every commit lands on disk automatically. **The
work is saved with no network credential in the cage.** Git history protects the
project dir; the mount exposes *only* that dir, so the safety property holds (the
agent is *supposed* to be able to churn its own workspace).

**GitHub is optional and later.** It's backup / sharing / review — not required
to "save" anything. Drop it entirely for startup: no tokens, no branch
protection, no "does the loop push itself."

- Recommended flow: agent commits to a **branch** in the mounted repo; **you do
  push / review / merge from the host**, where your real git creds live and you
  control branch protection / force-push. This makes the push the **human
  integration gate** — and basically pre-decides the open "branching/integration"
  question.
- Fallback (only if you want true walk-away with no host involvement): a
  **fine-grained token scoped to the one repo, contents-write only, branch
  protection on `main`** so it can't force-push. Blast radius = one branch, one
  repo. Reach for this only when host-side push feels too manual.

## Container topology — the one open sub-question

- **Bind-mount the host repo (recommended):** work survives on host
  automatically; no cred needed in cage; safety property intact.
- **Ephemeral container, clone fresh inside:** cleaner isolation, but the
  container is the only home for the work until pushed → push becomes mandatory →
  needs a network cred inside the cage → footgun.

Leaning bind-mount. _Not finalized._

## The minimum version (the floor)

> Put a Docker container around the project folder you already have. Run the loop
> inside with permissions skipped. The folder stays on your disk.

Same philosophy as D2: **start at the simplest safe floor, upgrade only when you
feel the need.** Everything else (GitHub, self-push, egress restriction,
disposable-VM upgrade) is deferred until a real need shows up.

## Deferred / revisit

- Restricting container network egress (allowlist) — lower priority while the
  cage is credential-free (little to exfil).
- Disposable throwaway WSL distro or cloud VM as a stronger cage — only if Docker
  proves insufficient.
- The self-push fallback token setup — only when walk-away-no-host is wanted.
- Finalize bind-mount vs. clone-inside topology.
