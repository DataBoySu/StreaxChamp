Modify handleDailyGeneration to eliminate race condition.

Current issue:
Reddit post is created before Firestore doc is saved.
This can lead to duplicate posts if job runs twice.

Required change:

1. After generation, attempt to CREATE Firestore document
   at daily-quizzes/{date}
   using a commit with precondition:
       currentDocument.exists = false

2. If Firestore creation fails because document already exists:
       exit immediately and DO NOT create Reddit post.

3. Only after Firestore doc is successfully created,
       create Reddit post.

4. After creating Reddit post,
       update Firestore document to set:
           metadata.redditPostId = post.id

This ensures Firestore is the locking authority.

Do not remove structured logging.
Do not change fallback logic.
Do not change leaderboard sync job.
