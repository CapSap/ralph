# Spec: <Feature Name>

> The source of truth for **what** to build. Specs drive plan mode, which drives
> build mode. **Scope test:** you should be able to state this spec's topic in
> **one sentence without the word "and."** If you need "and," split it into two
> specs.

## Job to be done (JTBD)

When _<situation>_, the user wants to _<motivation>_, so they can _<outcome>_.

## Scope

**In scope**

- _<thing this feature does>_
- _<thing this feature does>_

**Out of scope**

- _<explicitly not doing this — prevents the loop from wandering>_

## Behavior

Describe the desired behavior concretely. Prefer examples and rules over prose.

- Given _<input/state>_, when _<action>_, then _<observable result>_.
- Given _<input/state>_, when _<action>_, then _<observable result>_.

## Acceptance criteria (mechanical where possible)

These are what backpressure verifies. Favor checks a test can assert.

- [ ] _<a test/command that must pass>_
- [ ] _<an observable behavior that can be verified>_
- [ ] _<edge case handled>_

## Notes / open questions

- _<decisions, constraints, links to related specs>_
