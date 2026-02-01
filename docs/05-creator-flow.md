# Creator Flow Documentation

The Creator Flow is the core content loop of StreaxChamp. It allows users to transition from being players to being curators and creators.

## 1. Narrative Flow

The flow is designed to be linear and non-distracting:

1.  **Creator Studio**: The home base. Shows history and stats.
2.  **Topic Input**: Choosing the "About" for the quiz.
3.  **Manual Editor**: Filling in 5 questions with 4 options each.
4.  **Review**: A final summary of the quiz content.
5.  **Save / Save & Post**: Persisting the data to Firestore or submitting to Reddit.
6.  **Results / Exit**: Returning the user to their studio or the main feed.

## 2. Intent & Decision Making

- **Why 5 Questions?**: To keep the inline experience focused. It is long enough to be a challenge but short enough to be completed in one sitting within a feed.
- **Why "Play More" goes to a Subreddit?**: To drive community engagement. By directing users to the subreddit, we encourage them to explore more creator content and join the StreaxChamp community.
- **Creator vs Player Paths**:
    - **Player Path**: Optimized for speed, limited animations, focus on the timer.
    - **Creator Path**: Optimized for clarity, validation, and sense of achievement.

## 3. Data Flow

- **Drafts**: If a user exits mid-flow, progress is currently NOT saved across sessions.
- **Publishing**: Saving a quiz generates a unique `quizId` and stores it in Firestore. Posting a quiz creates a new Reddit thread with that `quizId` in the metadata.
