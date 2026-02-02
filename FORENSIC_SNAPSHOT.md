# Forensic State Reconstruction: Quiz Generation Pipeline

## 1. Executive Summary
The StreaxChamp quiz generation system is a hybrid **lazy-evaluation** pipeline driven primarily by user requests. It relies on **Google Gemini 1.5/2.5 Flash** for atomic content generation (Topic + Quiz). Persistence is handled by **Firestore**, with a localized in-memory cache for read performance and **Redis** strictly for rate limiting and custom quiz routing. The system supports three distinct quiz types: **Daily** (automated/lazy), **Topic** (on-demand/lazy), and **Custom** (user-created/manual). A critical observation is effectively "stateless" caching logic (in-memory Map) combined with persistent Redis usage for access control, creating a distributed state split.

---

## 2. Pipeline Reconstruction

### A. Entry Points & Triggers
Generation is never truly "background" but triggered by API hits:
1.  **Daily Quiz**: `GET /api/quiz` via `QuizController.getDailyQuiz`.
    *   *Condition*: If today's quiz (`daily-quizzes/{YYYY-MM-DD}`) is missing in Firestore.
2.  **Topic Quiz (Lazy)**: `POST /api/topics/:slug/quiz` via `QuizController.getTopicQuiz`.
    *   *Condition*: If no quiz exists for the topic OR if the "Latest" quiz is from a past date AND the requesting user has completed it.
3.  **Topic Quiz (Manual)**: `POST /api/topics/generate` via `TopicController.generateTopic`.
    *   *Condition*: Explicit user request (e.g., searching for a new topic).
4.  **Daily Bonus**: `Top-Level Component` (Unused/Legacy path in `QuizController.getDailyBonus`).

### B. Generation Decision Logic
1.  **Daily Quiz**:
    *   Checks Cache (`daily_quiz_content_v2_{YYYY-MM-DD}`).
    *   Checks Firestore (`daily-quizzes/{YYYY-MM-DD}`).
    *   **If Missing**: Selects topic based on **Day of Week** rotation (e.g., Monday=Science, Friday=Nature).
    *   Generates via AI, saves to Firestore, sets Cache.
2.  **Topic Quiz**:
    *   Checks Firestore for latest quiz `topics/{slug}/quizzes` (Descending Date).
    *   **Regeneration Trigger**:
        *   No quiz exists.
        *   OR Latest quiz date != Today AND requesting user `isCompleted=true` for that topic.
        *   *Drift*: This logic effectively allows "one new quiz per day" per topic if active users push for it.
3.  **Redis Role**:
    *   **Ignored** for Content Caching (reverted to in-memory `CacheService`).
    *   **Used** for Rate Limiting (`limit:topic_gen:{username}:{date}`).

### C. AI Invocation Layer (`GeminiService.ts`)
1.  **Model**: `gemini-1.5-flash` or `gemini-2.5-flash` (from `CONFIG.GEMINI.BACKUP_CONTENT_MODELS`).
2.  **Scope**: **Atomic**. Generates `Topic Metadata` (Sources, Title) AND `Quiz Questions` (5 items) in one JSON pass.
3.  **Prompt**: `CONFIG.GEMINI.PROMPTS.UNIFIED_GENERATOR`.
    *   Role: "KNOWLEDGE GRAPH & QUIZ ENGINE".
    *   Constraint: "OUTPUT MUST BE RAW JSON ONLY".
4.  **Validation**: Strict.
    *   Requires exactly 5 questions.
    *   Requires exactly 4 options per question.
    *   Requires numeric `correctAnswer` (0-3), though controller has legacy string fallback.
    *   Requires valid URLs for sources (though log warnings allow bypass).

### D. Firestore Write Path
Writes are **Idempotent** based on Date ID.

1.  **Daily Quiz**:
    *   Collection: `daily-quizzes`
    *   Doc ID: `YYYY-MM-DD`
    *   Write: `PATCH` (Create/Update)
    *   Payload: `{ id, questions: [...], metadata: { generatedAt, topic, model ... } }`
2.  **Topic Quiz**:
    *   Collection: `topics/{slug}/quizzes`
    *   Doc ID: `YYYY-MM-DD`
    *   Write: `PATCH`
3.  **Topic Metadata**:
    *   Collection: `topics`
    *   Doc ID: `{slug}`
    *   Write: `PATCH` (Updates `lastGenerated`, `hasQuiz`).

---

## 3. Data Flow Diagram (Textual)

```text
[Client] 
   | (Request Quiz)
   v
[Controller]
   |--> [CacheService (Memory)] -> HIT? -> Return JSON
   |
   | (MISS)
   v
[FirestoreRestService]
   |--> GET /daily-quizzes/{Today} -> FOUND? -> Return JSON
   |
   | (NOT FOUND)
   v
[GeminiService]
   |--> GenerateContent(Prompt + Topic)
   |       |--> Model: Gemini Flash
   |       |--> Validation: Schema Check
   |
   v
[FirestoreRestService]
   |--> PATCH /daily-quizzes/{Today} (Persist)
   |--> PATCH /topics/{slug} (Update Metadata)
   |
   v
[CacheService] -> Set Key (In-Memory)
   |
   v
[Client] <- Return New Quiz
```

---

## 4. Redis Key Usage
Redis is **partially decoupled** from the generation loop.

| Key Header | Purpose | TTL | Criticality |
| :--- | :--- | :--- | :--- |
| `limit:topic_gen:{username}:{date}` | Rate limits user topic generation (Max 1/day) | 24h | Medium |
| `custom_post_allowlist:{postId}` | Gatekeeper: Defines if a post is a Valid Streax App | Permanent* | **High** |
| `post_quiz:{postId}` | Maps Reddit Post ID -> Custom Quiz Metadata | Permanent* | **High** |

*Note: In-memory `CacheService` handles `daily_quiz_content_v2_*`, not Redis.*

---

## 5. Firestore Collections Touched

1.  `daily-quizzes` (Daily generated content)
2.  `topics` (Metadata, sources, play counts)
3.  `topics/{slug}/quizzes` (Archive of generated topic quizzes)
4.  `user_stats/{uid}/topics/{slug}` (User progress tracking)
5.  `play_history` (Global action log, append-only)
6.  `dailyBonus` (Legacy/Separate "Hard Mode" question)
7.  `subreddit_configs` (Wiki URLs)

---

## 6. Known Inconsistencies & Drift

1.  **Cache Misnomer**: `CacheService` is implemented as a Singleton In-Memory Map. This means every deploy/cold-start clears the cache, increasing reads to Firestore. It is **not** distributed.
2.  **Legacy Answer Format**: `TopicController` contains fallback logic for "A/B/C/D" string answers, converting them to indices. The Prompt explicitly requests numeric indices (0-3). This is valid defensive coding but indicates past prompt instability.
3.  **Explanation Validity**: The Prompt requests "Concise fact" for explanation. Firestore parses it. However, earlier versions might not have it. The current parser explicitly handles `explanation` existence.
4.  **Generation Logic Loop**: The `TopicQuiz` generation logic (`getTopicQuiz`) relies on `userFinishedLatest`. If a specific user finishes the latest quiz, and it's a new day, **System Generates a New Quiz for Everyone**. One active user can "roll over" the day for the entire topic.

## 7. Open Questions
*   **Concurrency**: There is no distributed locking. If two users request `GET /quiz` simultaneously at 00:00:01, and cache is empty, **two** parallel AI requests might fly. Firestore's `PATCH` might overwrite or result in last-write-wins, effectively wasting one generation tokens.
*   **Cleanup**: There is no visible retention policy. `daily-quizzes` and `play_history` grow unbounded.

---
**Report Generated**: 2026-02-02
**Agent**: Antigravity
