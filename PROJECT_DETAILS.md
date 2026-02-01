Recommended Documentation Structure

Add a /docs directory at project root.

/docs
 ├─ 00-overview.md
 ├─ 01-devvit-inline-learnings.md
 ├─ 02-inline-state-machine.md
 ├─ 03-flow-ui-primitives.md
 ├─ 04-visual-system.md
 ├─ 05-creator-flow.md


You already have content for most of these — this is reorganization, not new writing.

What Goes Where (Very Important)
docs/00-overview.md

Purpose: Orientation

Contents:

What StreaxChamp is

Why Devvit constraints matter

How docs are structured

“Read these first” section

This is what a new contributor opens.

docs/01-devvit-inline-learnings.md

Move your existing learnings.md here verbatim.

Add only one header at top:

“This document is mandatory reading before touching inline UI.”

No rewriting.

docs/02-inline-state-machine.md

Contains:

Inline FSM

Transition table

Stage data contracts

Render contract

Failure strategy

This is your interaction constitution.

docs/03-flow-ui-primitives.md

Documents:

FlowShell

FlowHeader

FlowBody

FlowFooter

PrimaryAction / SecondaryAction

NoticeCard

QuizEditorPanel

For each:

Responsibility

What it must NOT do

Where it is used

No styling details here.

docs/04-visual-system.md

Your Visual System & Design Tokens doc goes here almost exactly as-is.

This is the single source of truth for:

Colors

Depth

Motion

CTA hierarchy

No duplication elsewhere.

docs/05-creator-flow.md

Narrative flow documentation:

Create → Edit → Review → Save / Post → Play → Results → Exit


Purpose:

Explain intent

Explain “why Play More goes to sub”

Explain creator vs player paths

This helps product reasoning later.

README.md: What It Should Become

Your README should not contain deep details.

It should become:

1️⃣ Project summary

What StreaxChamp is, in 5–6 lines.

2️⃣ Architecture at a glance

Devvit app

Inline + Expanded modes

AI-powered quiz generation

Creator-driven content

3️⃣ Documentation index (THIS IS KEY)

Example:

## 📚 Documentation

If you are working on this project, read these in order:

1. [Overview](docs/00-overview.md)
2. [Devvit Inline Learnings (Required)](docs/01-devvit-inline-learnings.md)
3. [Inline State Machine & Data Contracts](docs/02-inline-state-machine.md)
4. [Flow UI Primitives](docs/03-flow-ui-primitives.md)
5. [Visual System & Design Tokens](docs/04-visual-system.md)
6. [Creator Flow](docs/05-creator-flow.md)


This alone will save you weeks later.

Optional (but smart): Add “DO NOT” Warnings

At the top of README or overview:

⚠️ Do not modify inline layout or introduce h-full without reading the Devvit learnings doc.

These guardrails matter.