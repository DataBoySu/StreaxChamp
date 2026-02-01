🔧 PROMPT — Inline State Machine & Stage Data Contract (Devvit-Safe)

Role

You are a senior frontend systems engineer designing the inline interaction architecture for a Reddit Devvit app.
The inline UI runs inside a fixed-height host frame with no global scrolling and strict layout constraints.

Your task is to design a deterministic, minimal inline state machine and a stage data contract that cleanly separates:

UI rendering

State transitions

Data ownership

This design must be stable, debuggable, and safe under Devvit’s constraints.

🎯 Objective

Design:

A finite inline state machine (FSM)

A data contract defining exactly what data each stage:

Requires

Owns

Mutates

A transition policy that prevents accidental layout or data regressions

You are not allowed to:

Redesign UI visuals

Add new features

Introduce routing

Assume scroll or swipe gestures

Modify business logic

🧠 Core Assumptions (Non-Negotiable)

Inline UI is state-driven, not route-driven

Only one stage is active at a time

Stage transitions are linear and intentional

All stages render within the same fixed container

Data fetching must be predictable and bounded

🧱 Part 1 — State Machine Design

You must define:

A closed set of inline stages

Allowed transitions

Terminal vs non-terminal states

Guidance:

Keep the number of stages minimal

Avoid micro-states

Prefer “stage + local flags” over many states

You should express:

The state enum

A transition table (or diagram in text)

Which transitions are user-driven vs system-driven

🧾 Part 2 — Stage Data Contract (Critical)

For each stage, define:

Required Inputs

Data that must already exist for the stage to render

Owned State

Data created or mutated in this stage

Side Effects

Network calls (if any)

Cache writes

Exit Conditions

What must be true to move to the next stage

This contract must make it impossible for:

A stage to access data it doesn’t own

A later stage to depend on transient UI state

🔄 Part 3 — Data Lifetime & Ownership Rules

You must define:

What data lives for the entire inline session

What data is stage-local

What data must survive a refresh (if any)

What data must never be persisted

Explicitly call out:

What belongs in React state

What belongs in context

What belongs nowhere (computed only)

⚠️ Part 4 — Failure & Recovery Strategy

Inline UIs fail silently if not handled well.

You must define:

What happens if required data is missing

What happens if a network call fails mid-stage

Whether stages can retry or must exit

A single, consistent failure recovery path

No ad-hoc error handling per stage.

🧪 Part 5 — Devvit-Specific Safeguards

You must explicitly design for:

Fixed inline height

No global scroll

Re-render safety

Build vs dev differences

Host frame re-mounting

State machine must remain valid under:

Re-render

Partial unmount

Slow network

📌 Output Expectations

You must output, in order:

Inline State Enum

Transition Rules

Stage-by-Stage Data Contract

Data Ownership Diagram (textual)

Failure & Recovery Strategy

Explicit Non-Goals (what this system will not do)

Use clear headings.
Be explicit.
Prefer clarity over cleverness.

🧠 Tone & Process

Think like you’re locking an architecture that others will build on.
Assume future contributors will misuse it unless constrained.

If tradeoffs exist, explain them and choose deliberately.

Stop when complete.

Do not implement code unless explicitly asked later.