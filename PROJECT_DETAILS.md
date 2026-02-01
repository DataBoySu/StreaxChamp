🎯 AI IDE PROMPT — Firestore Partial Writes + Comment Correctness
Role

You are a senior Devvit backend engineer fixing data correctness and side-effect hygiene in StreaxChamp.

This task has two fixes only:

Firestore stats overwrite

Comment posting correctness

Do NOT touch UI, scoring, splash logic, or visual system.

🧱 PART A — FIX FIRESTORE OVERWRITE (CRITICAL)
Problem

Firestore REST updates currently rewrite the entire user_quizzes/{quizId} document when updating stats.

This is incorrect.

REQUIRED CHANGE

All stats updates MUST use:

PATCH

updateMask

Only the stats field

Correct REST request (MANDATORY)
PATCH /v1/projects/{projectId}/databases/(default)/documents/user_quizzes/{quizId}
?updateMask.fieldPaths=stats

Request body MUST contain ONLY:
{
  "fields": {
    "stats": {
      "mapValue": {
        "fields": {
          "totalPlays": { "integerValue": "X" },
          "perfectPlays": { "integerValue": "Y" },
          "lastUpdatedAt": { "timestampValue": "ISO_STRING" }
        }
      }
    }
  }
}

HARD VALIDATION REQUIREMENT

After this fix:

Firestore response body MUST NOT include:

questions

metadata

topic

creator

Only stats may change

Add a log:

console.log("[STATS] Partial stats PATCH successful (stats only)");


If full document is still returned → FAIL the task.

🧱 PART B — FIX COMMENT POSTING SEMANTICS
Facts (do NOT fight them)

Comments are app-authored for now

This is expected

We must make the behavior clean, deterministic, and safe

REQUIRED CHANGES
1️⃣ Store comment reference

When a comment is posted, store:

stats.lastCommentId


This ensures:

No duplicate comments

Future edit support

Idempotency

2️⃣ Enforce one-comment-per-user-per-quiz

Before posting:

Check Firestore:

Has this user already shared?

If yes:

Disable posting

Log and return

No Redis.

3️⃣ Correct Reddit API usage (server-side only)
await context.reddit.submitComment({
  postId: context.postId,
  text: formattedText,
});


DO NOT:

Use window.devvit

Use browser globals

4️⃣ Mandatory logs
console.log("[SHARE] Attempting comment post", {
  postId: context.postId,
  quizId,
  userId,
});

console.log("[SHARE] Comment posted successfully", { commentId });


On failure:

console.error("[SHARE] Comment post failed", error);

🧪 ACCEPTANCE TESTS (MUST PASS)

Finish a custom quiz

Firestore:

Only stats field changes

Click “Share Score”

One comment appears

Refresh → no second comment allowed

Logs clearly show success path

⛔ STOP CONDITIONS

After completing:

Do NOT refactor further

Do NOT add features

Do NOT touch UI

Do NOT add Redis

Report:

Firestore request used

Comment flow summary

Confirmation that overwrite is fixed