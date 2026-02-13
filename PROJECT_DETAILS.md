Perform structural verification of topic cutover integrity.

Do NOT modify code.

Report only.

1️⃣ Search entire codebase for:
LeaderboardMemoryService.submit
with keys starting with "topic:"

List all occurrences.

2️⃣ Search entire codebase for writes to:
leaderboards/{slug}

List all remaining write paths.

3️⃣ In LeaderboardController.submitScore:
Show exact code where quizId is determined.
Confirm whether quizId comes from:
- client input
- or Firestore topics/{slug}.activeQuizId

4️⃣ In QuizController (bridging logic):
Show exact logic that routes daily score into topic leaderboard.
Confirm it uses TopicLeaderboardService.

5️⃣ In LeaderboardMemoryService:
Show the new guard logic.
Confirm it rejects topic keys BEFORE mutating memory.

No commentary.
Just code paths and confirmations.