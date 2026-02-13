# System Architecture

## 1. Firestore Schema

The application uses Google Cloud Firestore as its primary persistent storage. Interactions are handled via the Firestore REST API to ensure compatibility with the Devvit runtime environment.

### Collections & Documents

#### Core Content
- **`daily-quizzes/{date}`**
    - Stores the globally shared daily quiz for a specific date (YYYY-MM-DD).
    - **Fields:** `questions` (Array of objects), `metadata` (Source, Generator info), `id`, `updatedAt`, `leaderboardCommentId` (ID of the Reddit comment used for the leaderboard).
- **`topics/{slug}`**
    - Represents a specific quiz topic (e.g., "science-fiction", "web-development").
    - **Fields:** `title`, `slug`, `sources` (Wiki URLs), `status` (ready/generating), `lastGenerated`, `playCount`, `hasQuiz`.
- **`topics/{slug}/quizzes/{date}`**
    - Subcollection storing the specific quiz for a topic on a given date.
    - **Fields:** `questions`, `metadata`.

#### User Data & Progress
- **`users/{userId}`**
    - Stores global user statistics.
    - **Fields:** `totalScore` (Int), `totalQuizzesCreated` (Int), `nickname`, `lastActiveAt`.
- **`user_stats/{userId}/topics/{topicSlug}`**
    - Tracks a user's progress within a specific topic.
    - **Fields:** `lastQuizId`, `lastAttemptDate`, `isCompleted`, `hasShared`.
- **`daily-play-history/{userId}_{date}`**
    - Records a user's completion of the global daily quiz.
    - **ID Format:** Composite Key `${userId}_${date}`.
    - **Fields:** `score`, `totalQuestions`, `isPerfect`, `timeTakenMs`, `completedAt`.

#### Leaderboards & Social
- **`daily-quizzes/{date}/leaderboard/{userId}`**
    - Subcollection storing leaderboard entries for the daily quiz.
    - **Fields:** `score`, `nickname`, `completedAt`, `userId`.
- **`play_history/{autoId}`**
    - A global feed of recent gameplay events.
    - **Fields:** `username`, `topicTitle`, `score`, `timestamp`.
- **`user_quizzes/{username}_{topicSlug}`**
    - Stores User Generated Content (custom quizzes).
    - **Fields:** `creator`, `topic`, `questions`, `metadata`.

#### Configuration
- **`subreddit_configs/{subredditName}`**
    - Stores configuration for each installed subreddit instance.
    - **Fields:** `wikiUrl`, `configuredAt`.

### Indexes

Based on query patterns, the following Composite Indexes are required:

1.  **`users` Collection**:
    -   Query: `orderBy: totalScore DESC`
    -   Used for: Global User Leaderboard.
2.  **`topics` Collection**:
    -   Query: `where: playCount > 0`, `orderBy: playCount DESC`
    -   Used for: "Hot Topics" list.
3.  **`user_quizzes` Collection**:
    -   Query: `where: creator == {username}`
    -   Used for: Fetching a user's created quizzes.
4.  **`daily-play-history` Collection**:
    -   Query: `where: userId == {userId}`
    -   Used for: Retrieving user's play history.

### Transaction Usage & Atomicity

The system utilizes Firestore's atomic operations to ensure data integrity, particularly for scoring.

-   **`incrementUserTotalScore`**: Uses the `:commit` endpoint with `fieldTransforms` to atomically increment `totalScore`. This prevents race conditions where multiple rapid game completions could overwrite score updates.
-   **`incrementUserQuizzesCreated`**: Similarly uses atomic `increment` field transforms.

### Consistency Guarantees

-   **Eventual Consistency**: The global `play_history` feed and "Hot Topics" lists are eventually consistent.
-   **Strong Consistency**: User profile updates (`totalScore`) utilize atomic operations for strong consistency on the individual document level.
-   **Read-Your-Writes**: The implementation generally waits for REST responses before updating the UI, providing a consistent experience for the user (e.g., completing a quiz immediately updates the local state).

## 2. Caching Layer

The application implements a multi-tiered caching strategy to minimize Firestore reads and ensure low-latency responses, primarily using an in-memory `CacheService`.

### Architecture & Location
-   **In-Memory Singleton**: The `CacheService` is a singleton class maintaining a Javascript `Map<string, CacheEntry<T>>`.
-   **Execution Context**: Since Devvit apps run in a serverless-like environment (potentially ephemeral), this cache is local to the running instance. It is *not* a distributed Redis cache (though Redis is available in the platform, the current implementation explicitly notes it uses in-memory for stability).

### Caching Strategies & TTL

| Content Type | Key Pattern | TTL | Rationale |
| :--- | :--- | :--- | :--- |
| **Topics List** | `topics_list` | 10 min | high-read, low-write. Invalidated on generation. |
| **Hot Topics** | `hot_topics_data` | 30 min | Expensive aggregation query. Semi-static. |
| **Global Leaderboard** | `landing_leaderboard` | 5 min | High-traffic landing page component. |
| **Daily Quiz Content** | `daily_quiz_content_v2_{date}` | 24 hours | Static content for the day. |

### Invalidation Strategy
-   **Time-Based**: All entries have a fixed TTL.
-   **Event-Based**:
    -   **Topic Generation**: generating a new topic explicitly calls `del('topics_list')` and `del('landing_summary')` to ensure the new topic appears immediately.

### Cache Stampede Prevention
-   **Current State**: The current implementation does *not* implement explicit stampede protection (e.g., locking or promise coalescing). Concurrent requests for a cold key will result in parallel Firestore requests.
-   **Mitigation**: The impact is mitigated by the relatively long TTLs and the "Read-Through" pattern in controllers.

### Memory Constraints
-   There is no explicit eviction policy (e.g., LRU) or size limit.
-   **Risk**: The cache grows unboundedly within the instance lifespan.
-   **Mitigation**: The limited number of unique keys (daily quizzes + finite topics) makes this manageable for the current scale, but it is a potential scalability bottleneck.

## 3. Leaderboard System

The leaderboard architecture balances immediate user feedback with scalable backend writes, using a hybrid memory-buffer + periodic flush approach.

### Score Write Flow
1.  **Submission**: Client submits score to `QuizController.submitDailyScore`.
2.  **Validation**: Server checks `daily-play-history` to strictly reject replays (Anti-Score-Inflation).
3.  **Persistence (Immediate)**:
    -   `daily-play-history` document is created (Atomic).
    -   User's `totalScore` is incremented in `users/{userId}` (Atomic).
    -   User's topic progress is updated in `user_stats`.
4.  **Leaderboard Entry (Buffered)**:
    -   The score is submitted to `LeaderboardMemoryService` (in-memory).
    -   **Condition**: Only top 10 scores are retained in memory per leaderboard key.

### Rank Calculation & Tie-Breaking
Ranking uses a standard competitive sort with a specific tie-breaker for fairness.

-   **Primary Sort**: Score (Descending).
-   **Secondary Sort (Tie-Breaker)**: Timestamp (Ascending).
    -   **Logic**: "Early Bird" advantage. If two players have the same score, the one who achieved it *earlier* ranks higher.

### Periodicity & Eventual Consistency
-   **In-Memory Buffer**: The top 10 scores are held in memory.
-   **Flush Cycle**: Every **3 hours**, the `LeaderboardMemoryService`:
    1.  Writes the buffered entries to Firestore (`daily-quizzes/{date}/leaderboard`).
    2.  Updates the Reddit Comment associated with the quiz post to display the new Top 10 table.
-   **Rationale**: prevents Firestore write hotspots during traffic spikes and avoids hitting Reddit API rate limits for comment edits.

### Anti-Cheat & Integrity
-   **Replay Protection**: The system enforces a strict "First Attempt Only" policy for leaderboards. Subsequent plays are marked as `isReplay: true` and excluded from leaderboard processing.
-   **Server-Side Validation**: All timestamps and scores are processed server-side.

## 4. Deterministic Quiz Engine

The system achieves a "deterministic" user experience through persistence rather than cryptographic seeding.

### Pseudo-Determinism
-   **Generation**: The AI generation process (`GeminiService`) is *non-deterministic* (temperature 0.3).
-   **Persistence**: Once a daily quiz is generated and saved to Firestore (`daily-quizzes/{date}`), it becomes the **Single Source of Truth** for that day.
-   **User Experiene**: All users see the exact same quiz for a given 24-hour period, ensuring fair competition on the leaderboard.
-   **Topic Rotation**: The logic for selecting the daily topic is deterministic based on the day of the week (e.g., Sunday=Mixed, Monday=Science), ensuring predictable variety.

### Content Integrity
-   **Validation Pipeline**: `GeminiService` implements a strict 20-point validation check on generated JSON (structure, option counts, answer bounds, no duplicates).
-   **Sanitization**: AI output is sanitized to remove common formatting hallucinations (e.g., "A) ", "1. ") before storage.

*Note: The "Streak Multiplier" feature mentioned in initial requirements is not currently implemented in the server-side scoring logic.*

## 5. Rate Limiting

The application implements a two-tier rate limiting strategy using Redis to control AI costs and prevent abuse.

### Architecture
-   **Service**: `RateLimitService`
-   **Storage**: Redis (via `@devvit/web/server`).
-   **Scope**:
    1.  **User Limit**: Caps the number of custom quizzes a user can generate per day.
    2.  **Global Limit**: Caps the total system-wide generations per day (Cost Control).
-   **Failure Mode**: The system "Fails Open" on Redis errors to enforce good UX over strict billing control during outages.

## 6. Autonomous Processes

Due to the constraints of the execution environment, autonomous processes are handled via in-memory intervals rather than external cron jobs.

### Interval-Based Maintenance
-   **Leaderboard Flush**: `LeaderboardMemoryService` runs a `checkCycles()` interval every **10 minutes**.
    -   **Task**: Checks if any in-memory leaderboard buffer is older than 3 hours.
    -   **Action**: Flushes to Firestore and updates Reddit comments.
-   **Limitation**: This relies on the server instance remaining active. In a purely serverless cold-start environment, these intervals would pause, effectively making the flush "lazy" (occurring only when traffic wakes the instance).

## 7. Anti-Cheat & Failure Modes

### Anti-Cheat Measures
-   **Strict Replay Protection**: The `QuizController` explicitly checks `daily-play-history/{userId}_{date}` before accepting a leaderboard score. Second attempts are accepted but marked as `isReplay: true` and disqualified from ranking.
-   **Time Validation**: `timeTaken` is captured and used for tie-breaking. (Future: verify against minimum logical duration).

### Failure Modes & Circuit Breakers
-   **AI Circuit Breaker**: `GeminiService` tracks failure rates. If the error threshold is crossed, it enters an "Open" state to fail fast and prevent cascading timeouts.
-   **Database Circuit Breaker**: `FirestoreRestService` similarly monitors connectivity.
-   **Fallbacks**:
    -   **Hot Topics**: If aggregation fails, `LandingController` serves a static fallback list.
    -   **Quiz Generation**: If AI fails, the system returns a specific error code allowing the UI to degrade gracefully (though no static fallback quiz is implemented).

## 8. System Limitations & Concurrency (Explicit)

This section details the known cross-instance behaviors and limitations of the current architecture.

### Redis Usage
-   **Scope**: Redis is utilized for:
    1.  **Rate Limiting**: Tracking user and global generation quotas.
    2.  **Custom Quiz Mappings**: Storing the "Allowlist" (`custom_post_allowlist:{id}`) and configuration (`post_quiz:{id}`) for user-generated quizzes. This acts as a security gate to prevent unauthorized app launches.

### Leaderboard Concurrency & Consistency
-   **Cold Start**: `LeaderboardMemoryService` starts with an **empty buffer**. It does *not* read from Firestore on startup to reconstruct the current leaderboard state.
    -   *Risk*: If an instance crashes before a flush cycle (3 hours), the buffered scores in that instance are lost (though individual `daily-play-history` is preserved synchronously).
-   **Flush Behavior**: The flush operation (`saveLeaderboard`) uses a **Last Writer Wins** strategy.
    -   *Scenario*: If multiple server instances are active and flush simultaneously, they will overwrite each other's `leaderboard` document array. There is no merging logic.
    -   *Mitigation*: The `daily-play-history` collection is the atomic source of truth. The leaderboard document is a "view" that may temporarily fluctuate in a multi-instance environment.
-   **Scheduling**: There are **no external Devvit Schedulers** (stateless cron). All periodic tasks (Flush, Reddit Comment Updates) rely on `setInterval` within the running service instance.




