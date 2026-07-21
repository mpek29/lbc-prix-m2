# 1. Record architecture decisions

- **Status:** accepted
- **Date:** 2026-07-21

## Context

This is a small extension with a single feature, which is exactly the kind of
project where decisions get made in a hurry and forgotten by the following
quarter. Six months from now the question will not be "what does this code do" —
that is legible — but "why is the price read from a screen-reader paragraph
instead of the element I can see". Without an answer, the next person removes
the strange-looking thing and reintroduces the bug it was there to prevent.

## Decision

Significant decisions are recorded as Architecture Decision Records in
`docs/adr/`, numbered sequentially, in the style described by Michael Nygard.

A decision is significant if reversing it would touch more than one directory,
or if the obvious alternative is obviously better until you know something the
code does not say.

An ADR is immutable once accepted. Changing course means a new record that
supersedes the old one, because the reasoning that was wrong is as useful as the
reasoning that was right.

## Consequences

Code comments explain mechanism; ADRs explain choice. Neither has to do the
other's job, which keeps both shorter.

The cost is a file per decision. At the rate this project makes them, that is a
handful of pages in total.
