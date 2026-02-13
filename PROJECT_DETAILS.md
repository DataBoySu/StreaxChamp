Step 1 — Fix Observability (Small but Important)

Add explicit logging inside /api/init:

Logger.info('[Init] Daily history check', {
  user,
  date,
  historyExists: !!history,
  completed: history?.completed
});


Right now your system works.
But you are blind.

Blind systems feel broken even when they aren’t.