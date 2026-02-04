TASK: Topic Leaderboard Data Loss Audit & Fix

IMPORTANT:
Before proceeding, read:
- agents.md
- devvit_web_knowledge_base.md

---

PROBLEM:
The Topic Leaderboard is NOT recording scores for all players
who have completed a topic quiz.

Some scores are missing or overwritten.

---

INVESTIGATION SCOPE:
- Client submission flow
- Server controllers handling topic quiz completion
- Firestore write paths
- Replay mode logic
- Leaderboard query logic

---

REQUIRED ANALYSIS:
1. Identify EXACTLY where topic leaderboard writes occur
2. Verify:
   - Document paths
   - Document IDs
   - Whether writes overwrite previous players
3. Confirm:
   - Replay mode does NOT write leaderboard entries
   - First-time plays ALWAYS write leaderboard entries
4. Check whether leaderboard is:
   - Per topic
   - Per quiz instance
   - Per date
   (and whether this is consistent across code)

---

EXPECTED OUTPUT:
- Root cause(s) of missing leaderboard entries
- Whether data is overwritten or skipped
- A corrected Firestore schema (if needed)
- Minimal code changes to fix the issue
- NO UI changes

---

DO NOT:
- Change leaderboard UI
- Add new features
- Modify unrelated stats or XP logic
