PROMPT START

Implement minimal structured logging for scheduled jobs only.

Scope

Only modify:

src/server/jobs/DailyScheduler.ts

Do NOT touch controllers or services.

1️⃣ Create Job Context Helper

At top of file, add:

import crypto from 'crypto';

function createJobContext(jobName: string) {
  return {
    jobName,
    runId: crypto.randomUUID().slice(0, 8),
    startTime: Date.now()
  };
}

2️⃣ Instrument handleDailyGeneration

At start:

const ctx = createJobContext('DailyGen');
Logger.info(`[Job:${ctx.jobName}] START runId=${ctx.runId} date=${todayStr}`);


Add phase logs:

After AI generation success:

Logger.info(`[Job:DailyGen] runId=${ctx.runId} phase=generate success`);


If lock fails (document already exists):

Logger.info(`[Job:DailyGen] runId=${ctx.runId} phase=lock skipped_existing`);


After Reddit post:

Logger.info(`[Job:DailyGen] runId=${ctx.runId} phase=reddit_post success postId=${redditPostId}`);


After Firestore metadata update:

Logger.info(`[Job:DailyGen] runId=${ctx.runId} phase=firestore_update success`);


At end:

Logger.info(`[Job:DailyGen] END runId=${ctx.runId} durationMs=${Date.now() - ctx.startTime}`);


In catch block:

Logger.error(`[Job:DailyGen] FAIL runId=${ctx.runId}`, e);

3️⃣ Instrument handleLeaderboardSync

At start:

const ctx = createJobContext('Sync');
Logger.info(`[Job:Sync] START runId=${ctx.runId} date=${todayStr}`);


After fetching entries:

Logger.info(`[Job:Sync] runId=${ctx.runId} entries=${entries.length}`);


After hash comparison:

Logger.info(`[Job:Sync] runId=${ctx.runId} hashChanged=${currentHash !== storedHash}`);


When creating comment:

Logger.info(`[Job:Sync] runId=${ctx.runId} createdComment=${commentId}`);


When editing comment:

Logger.info(`[Job:Sync] runId=${ctx.runId} editedComment=${commentId}`);


At end:

Logger.info(`[Job:Sync] END runId=${ctx.runId} durationMs=${Date.now() - ctx.startTime}`);


In catch block:

Logger.error(`[Job:Sync] FAIL runId=${ctx.runId}`, e);

4️⃣ Do NOT modify:

FirestoreRestService

CommentLeaderboardService

Controllers

Scheduler registration logic

Return full updated DailyScheduler.ts only.

PROMPT END