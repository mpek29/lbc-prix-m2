# 1. Record architecture decisions

- **Status:** accepted
- **Date:** 2026-07-21

## Context

This is a small extension with a single feature, which is exactly the sort of
project where decisions get made in a hurry and forgotten by the next quarter.
Six months from now the open question will not be "what does this code do". That
part is legible. It will be "why is the price read from a screen-reader
paragraph instead of the element I can see". Without an answer, the next person
removes the odd-looking thing and reintroduces the bug it was preventing.

## Decision

Record significant decisions as Architecture Decision Records in `docs/adr/`,
numbered sequentially, in the style Michael Nygard described.

A decision counts as significant if reversing it would touch more than one
directory, or if the obvious alternative looks better until you know something
the code does not say.

An ADR is immutable once accepted. Changing course means a new record that
supersedes the old one. Reasoning that turned out to be wrong is as useful as
reasoning that held up.

## Consequences

Code comments explain mechanism, ADRs explain choice. Neither has to do the
other's job, so both stay shorter.

The cost is a file per decision. At the rate this project makes them, that is a
few pages in total.
