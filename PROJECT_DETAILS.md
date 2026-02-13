We have identified a disconnection in the Daily Quiz submission flow.

Problem:
The daily leaderboard Firestore collection (daily-quizzes/{date}/leaderboard/{userKey}) is NOT being written during submitDailyScore.
As a result:
- /api/quiz/daily/leaderboard returns empty
- Reddit comment renders placeholder
- UI shows "No rankings detected"

Replay logic may also be interfering.

Your task is to surgically repair the daily leaderboard write path.

--------------------------------------------------
OBJECTIVE
--------------------------------------------------

1. Restore persistent daily leaderboard write
2. Ensure replay logic only prevents duplicate writes for the SAME user on SAME date
3. Ensure leaderboard write happens BEFORE comment ensure/update
4. Add minimal structured logging
5. Do NOT modify scheduler
6. Do NOT modify topic leaderboard logic
7. Do NOT reintroduce any in-memory service

--------------------------------------------------
STEP 1 — Locate submitDailyScore
--------------------------------------------------

File:
src/server/controllers/QuizController.tsx

Inside submitDailyScore:

After verifying:
- !isReplay
- username exists
- score computed

ADD:

await fs.saveQuizLeaderboardEntry({
    date: quizDate,
    userKey: username,
    nickname,
    score,
    completedAt: new Date().toISOString()
});

This must happen:
- BEFORE CommentLeaderboardService.ensureComment
- BEFORE topic bridging

--------------------------------------------------
STEP 2 — Fix Replay Logic Guard
--------------------------------------------------

Ensure replay logic only blocks if:

const history = await fs.getDailyPlayHistory(username, quizDate);

If history exists AND history.completed === true:
    treat as replay

If no history:
    NOT replay

Make sure leaderboard write only skips if replay === true.

DO NOT skip leaderboard write based on other conditions.

--------------------------------------------------
STEP 3 — Implement saveQuizLeaderboardEntry
--------------------------------------------------

If not present or broken, ensure FirestoreRestService has:

async saveQuizLeaderboardEntry({
    date,
    userKey,
    nickname,
    score,
    completedAt
})

Firestore path:

daily-quizzes/{date}/leaderboard/{userKey}

Use PATCH or commit with upsert behavior.

Document body:

{
  userKey,
  nickname,
  score,
  completedAt
}

Do NOT use collectionGroup write.
Do NOT write anywhere else.

--------------------------------------------------
STEP 4 — Add Minimal Logs
--------------------------------------------------

Inside submitDailyScore add:

Logger.info(
  `[SubmitDaily] DailyLB WRITE user=${username} score=${score} date=${quizDate}`
);

If skipped due to replay:

Logger.info(
  `[SubmitDaily] DailyLB SKIPPED replay user=${username} date=${quizDate}`
);

--------------------------------------------------
STEP 5 — Verify Ordering
--------------------------------------------------

Final order inside submitDailyScore must be:

1. Validate
2. Check replay
3. Write daily leaderboard entry (if not replay)
4. Save daily-play-history
5. Ensure comment
6. Topic bridge
7. Return response

--------------------------------------------------
IMPORTANT
--------------------------------------------------

Do NOT change scheduler.
Do NOT change sync job.
Do NOT change hashing logic.
Do NOT change generation job.

Only repair submission path.

Return:
- Diff summary
- Updated submitDailyScore function
- Updated FirestoreRestService method
