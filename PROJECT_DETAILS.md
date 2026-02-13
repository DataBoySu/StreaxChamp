Add version control to topic quizzes.

Modify topic generation logic to:

Generate new quizId (use ISO date or UUID)

Create document at:
topics/{slug}/quizzes/{quizId}

Update parent:
topics/{slug}
activeQuizId: quizId
generationVersion: increment by 1
lastGenerated: REQUEST_TIME

Modify TopicLeaderboardService.submitScore to:

Read topics/{slug}.activeQuizId

If provided quizId !== activeQuizId:
return { accepted: false, reason: "stale_version" }

Do NOT delete anything.

Do NOT touch daily system.

Do NOT remove memory yet.

Only add version enforcement.