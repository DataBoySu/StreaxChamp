🚦 OVERALL STRATEGY (LOCK THIS IN)

We are implementing INLINE PLAY for Custom Quiz Posts with a horizontal flow, without touching:

splash detection logic

generate flow

create flow

expanded mode (for now)

We will reuse existing quiz rendering components wherever possible.

PHASE 0 — SAFETY LOCK (MANDATORY)

Before implementing gameplay, we must explicitly forbid the IDE from touching things it keeps breaking.

🧠 PROMPT 0 — Scope Lock
MODE: SCOPE LOCK / NO FEATURE WORK

You are about to implement INLINE PLAY for Custom Quiz posts.

Before doing so, acknowledge and follow these constraints:

1. Do NOT modify splash detection logic.
2. Do NOT modify Create flow.
3. Do NOT modify Generate flow.
4. Do NOT modify expanded mode routing.
5. Do NOT introduce localStorage.
6. Do NOT infer quiz identity.
7. Do NOT redesign UI styles.

Your work will be limited strictly to:
- Inline rendering logic
- Quiz question rendering
- Horizontal progression state

Confirm understanding before proceeding.


Wait for confirmation.
Only then continue.