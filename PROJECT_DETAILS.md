🔧 TASK: Remove Topic/Daily Leaderboards from Firestore and Replace with Comment-Driven System

DO NOT TOUCH GLOBAL LEADERBOARD

You must analyze the entire leaderboard pipeline before modifying anything.

🔎 Phase 1 — Audit (Mandatory First Step)

Identify all code paths that:

Write topic leaderboard data to Firestore

Write daily leaderboard data to Firestore

Write custom quiz leaderboard data to Firestore

Call submitLeaderboardScore

Update topic/daily leaderboard collections

Confirm that:

Global leaderboard (XP / total score accumulation) is implemented separately.

Global leaderboard logic does NOT depend on topic leaderboard collections.

Print a summary before implementing changes.

🚫 Phase 2 — Remove Firestore Writes (Topic/Daily/Custom Only)

Modify behavior so that:

On Quiz Completion:

DO NOT write topic leaderboard entry to Firestore.

DO NOT write daily leaderboard entry to Firestore.

DO NOT write custom post leaderboard entry to Firestore.

DO NOT block replay.

DO NOT alter Global XP accumulation.

Instead:

Only return quiz results to client.

Global XP update remains intact.

🧠 Phase 3 — Introduce In-Memory Leaderboard Manager

Create a server-side singleton:

LeaderboardMemoryService


Behavior:

Store only Top 10 entries per:

Topic slug

Daily date

Custom postId

Data structure example:

{
key: "topic:anime" | "daily:2026-02-02" | "post:t3_abc",
entries: [
{ username, score, timestamp }
]
}

Rules:

On "Share Score" button press:

Insert user score into memory

Sort descending by score

Keep only top 10

Replace existing entry if user already exists

No Firestore writes here.

📝 Phase 4 — Comment-Based Leaderboard (App Managed)

Implement:

CommentLeaderboardService


Behavior:

For each postId:

Maintain lastUpdatedAt

Maintain commentId (store in Redis or memory)

Every 8 hours:

If comment does not exist:

Create new comment under the post

If comment exists:

Edit existing comment

Comment format:

🏆 TOP 10 — {Topic or Daily Date}

u/username — 5/5

...

...

Last updated: {timestamp}

Only update if leaderboard changed since last edit.

🔒 Constraints

DO NOT remove or modify Global Leaderboard logic.

DO NOT modify XP accumulation.

DO NOT modify user progression.

DO NOT change unrelated UI.

DO NOT introduce Firestore writes for topic/daily leaderboards.

Keep global leaderboard untouched.

📦 Deliverables

Before finishing, print:

What Firestore writes were removed.

What new memory service was added.

Confirmation that global leaderboard still works.

Where comment ID is stored.

How concurrent updates are handled.