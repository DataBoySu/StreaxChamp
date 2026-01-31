MODE: STABILIZATION – SEPARATE SPLASH SCREENS (POST-BUG FIX)

Context:
The black screen issue has been identified and fixed.
Root cause was a schema mismatch:
UI used question.answers but Firestore uses question.options.
Inline architecture is correct and must NOT be redesigned.

Your task:
Stabilize the app and restore clear separation between
normal-post splash and custom-quiz splash,
without breaking the working inline quiz.

ABSOLUTE RULES:

1. DO NOT change the single-canvas inline model.
   Everything stays inside splash.tsx.

2. DO NOT reintroduce expanded-mode logic for custom quizzes.

3. DO NOT refactor rendering architecture.

REQUIRED ACTIONS:

A. Lock the data contract
   - Ensure quiz rendering ALWAYS uses:
     question.options
   - Add a defensive guard:
     If options is missing or not an array, render a visible error message
     instead of crashing.

B. Restore clear splash separation:

   - Normal posts (initData.customQuiz !== true):
     mode = 'MENU'
     Render ONLY:
       - Streax Quiz title
       - Create / Generate buttons
     Quiz code must NOT execute.

   - Custom quiz posts (initData.customQuiz === true):
     Initial mode = 'CUSTOM_SPLASH'
     Render:
       - Topic
       - Creator
       - Play button
     Quiz data is preloaded in background.

C. Mode transitions (must be explicit):

   MENU → (Create / Generate) → expanded mode (unchanged)
   CUSTOM_SPLASH → Play → QUIZ

D. Rendering safety:
   - No mode may render nothing
   - No return null
   - All async states must show visible UI

MANDATORY LOGS:
- [Splash] Normal post → MENU mode
- [Splash] Custom post detected → CUSTOM_SPLASH mode
- [InlineQuiz] Quiz data loaded (N questions)
- [InlineQuiz] Entering QUIZ mode

FORBIDDEN:
- Merging normal and custom splashes into one UI
- Conditional mounting of root containers
- Changing quiz flow logic

GOAL:
Have two clearly distinct splash experiences,
with a stable inline quiz for custom posts
and zero regressions for normal posts.
