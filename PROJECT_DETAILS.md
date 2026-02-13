Implement a one-time Legacy Snapshot Freezer for topic leaderboards.

Task:

For each document in collection:
leaderboards/{slug}

If document exists:

Create new quiz version:
topics/{slug}/quizzes/legacy_snapshot

Write metadata:
source: "memory_snapshot"
migratedAt: REQUEST_TIME
generationVersion: -1
legacy: true

For each entry in entries array:
Create:
topics/{slug}/quizzes/legacy_snapshot/leaderboard/{username}

Fields:
username
score
timestamp
legacy: true

After successful migration:
Delete leaderboards/{slug}

Do not modify daily quiz system.
Do not remove LeaderboardMemoryService yet.
Do not change submission flow.
This is archival only.

Ensure idempotency:
If legacy_snapshot already exists, skip.