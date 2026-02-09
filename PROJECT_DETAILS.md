READ THIS FIRST (MANDATORY):
Before making ANY code changes, you must analyze and explain the current data flow end-to-end.
This task is READ-ONLY ANALYSIS ONLY.
❌ Do NOT refactor
❌ Do NOT optimize
❌ Do NOT add features
❌ Do NOT fix bugs yet

The goal is complete situational awareness so we can fix Firestore misuse safely.

🎯 Objective

Produce a forensic reconstruction of how quiz data, score data, and user state move through the system today.

This must answer:

What data exists

Where it lives

When it is read

When it is written

Why it is written

What breaks if it is removed

📂 Mandatory Files to Read First

Before responding, you MUST scan these files fully:

agents.md

devvit_web_knowledge_base.md

src/server/controllers/*

src/server/services/FirestoreRestService.ts

src/server/services/LeaderboardService.ts

src/server/services/CacheService.ts

src/client/App.tsx

src/client/hooks/useQuizData.ts

src/client/hooks/useHistory.ts

src/client/splash.tsx

Any Redis usage (redis, ioredis, upstash, etc.)

🧠 Deliverable Format (STRICT)

You MUST output only analysis, in the following structure:

1️⃣ Data Entities Inventory

List every logical data entity in the app, including but not limited to:

Daily quiz

Topic quiz

Custom quiz

Leaderboard entry

User play record

Replay detection state

Splash metadata

Redis keys

For EACH entity, specify:

Entity Name:
Source of Truth:
Stored In (Memory / Firestore / Redis / Client State):
Mutability (Immutable / Append-only / Mutable):
Expected Lifetime:

2️⃣ Read Path Timeline (Critical)

For each of these user actions, trace the exact data reads:

User opens app

User sees splash

User starts quiz

User answers a question

User finishes quiz

User replays quiz

User returns to splash

For each step:

What data is read?
From where?
Why?
Is it redundant?

3️⃣ Write Path Timeline (Critical)

Trace every write triggered by:

Quiz generation

Quiz completion

Replay

Leaderboard update

Comment posting

Stats aggregation

For each write:

What is written?
Why is it written?
Is it idempotent?
Can it be delayed or removed?

4️⃣ Firestore Usage Audit (Red Flag Section)

Create a table:

Collection	Written By	Read By	Frequency	Required?

Then answer:

Which Firestore reads happen on every splash

Which writes happen on every play

Which ones are purely defensive / legacy

Which ones cause duplicate or conflicting state

5️⃣ Cache & Memory Reality Check

Explain:

What data is cached in memory

What data is cached in Redis

What data is not cached at all

What breaks if the server restarts

What is incorrectly treated as stateless

6️⃣ Replay & Duplication Analysis

Explain how the system currently decides:

Is this a replay?

Should a score be recorded?

Should a leaderboard entry be overwritten or appended?

Identify all places where replay logic is inferred indirectly (dangerous).

7️⃣ Single Biggest Design Mismatch

Answer plainly:

“The system currently behaves like ________,
but the intended design is ________.”

8️⃣ Safe Fix Zones (NO CODE)

Without writing code, list:

What can be safely removed

What must remain for correctness

What must be centralized into memory

What must never be fetched on splash again

9️⃣ Final Verdict

Conclude with:

Is Firestore currently overused, misused, or correctly used?

Is the app behaving like a game server or a CRUD app?

What one principle should guide the rewrite?

⛔ HARD RULES

❌ Do NOT propose solutions yet

❌ Do NOT suggest architecture changes

❌ Do NOT touch UI

❌ Do NOT refactor code

This is pure forensic analysis.

✅ Success Criteria

A good answer will make it possible to:

Delete 30–50% of Firestore reads

Move critical state to memory confidently

Prevent duplicate leaderboard writes permanently

Design the next system without guessing