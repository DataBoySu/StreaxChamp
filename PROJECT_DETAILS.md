You are continuing work on an existing Daily Quiz system.
DO NOT claim completion unless every item below is verified in code.

TASK: Fix remaining Daily Quiz system bugs and missing UI.

========================
PART 1: Explanation Interstitial (MANDATORY)
========================
- Each question already contains `explanation` in Firestore.
- Modify the quiz progression state machine so that AFTER an answer is locked:
  1. Show Correct / Incorrect
  2. Show Correct Answer
  3. THEN show the explanation text in a dedicated interstitial screen
- This explanation screen must:
  - Render `question.explanation`
  - Enforce a minimum visible duration (e.g. 2–3 seconds)
  - Block "Next Question" until duration passes
- This must work in BOTH normal play and replay mode.
- Verify explanation is never skipped.

FILES TO CHECK:
- QuizFlow / QuestionController component
- Any `isAnswerLocked`, `showResult`, `nextQuestion` logic

========================
PART 2: Replay Mode Integrity (CRITICAL)
========================
Replay mode must be PURELY READ-ONLY.

Fix all of the following:
- When server returns `{ replay: true }`:
  - NO leaderboard writes
  - NO score increments
  - NO duplicate history records
- Verify replay check happens BEFORE:
  - leaderboard writes
  - XP updates
  - topic stats updates

Add explicit logs:
`[DAILY QUIZ] Replay detected – skipping writes`

========================
PART 3: Leaderboard Scope Fix
========================
- Daily quizzes MUST use a per-quiz leaderboard:
  Path: `daily-quizzes/{date}/leaderboard/{userId}`
- REMOVE all topic-based leaderboard rendering for daily quizzes.
- UI must:
  - Render leaderboard ONLY for the current quiz date
  - Never show topic leaderboard for daily quizzes
- Ensure duplicate users cannot appear (keyed by userId).

========================
PART 4: "Browse Past Quizzes" UI (MISSING FEATURE)
========================
- After completing today's daily quiz:
  - Unlock a button: `Browse Past Quizzes`
- Clicking it must:
  - Call `GET /api/quiz/daily/list`
  - Display a modal or screen listing quiz dates (latest first)
  - Visually mark completed dates
- Selecting a date:
  - Loads that specific quiz
  - Honors replay mode rules

This feature MUST NOT auto-play older quizzes.
Selection must be explicit.

========================
PART 5: Verification (MANDATORY)
========================
Before responding, verify ALL of the following:
- Explanation text renders from Firestore
- Replay mode does not write ANY data
- Leaderboard shows only per-date entries
- "Browse Past Quizzes" button is visible and functional
- No topic leaderboard is shown for daily quizzes

If ANY item is not implemented, report it explicitly.
Do NOT claim "complete" otherwise.
