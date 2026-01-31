MODE: INLINE SINGLE-CANVAS QUIZ – PHASE 2 (CUSTOM POSTS ONLY)

Context:
Inline single-canvas quiz rendering has been verified with a hardcoded question.
This must now be extended to render REAL quiz questions,
but ONLY for custom quiz posts.

ABSOLUTE RULES:

1. DO NOT change behavior for normal (non-custom) posts.
   - Normal posts must continue to show the legacy Create / Generate splash.
   - No experiments, no quiz rendering on normal posts.

2. Gate ALL quiz logic behind:
   initData.customQuiz === true

3. Inside splash.tsx, maintain a single-canvas state machine:
   modes:
   - MENU
   - CUSTOM_SPLASH
   - QUIZ

4. Data loading:
   - When initData.customQuiz is true:
     - Fetch quiz data ONCE from:
       /api/quizzes/{quizId}
     - Store it in state: quizData
   - Do NOT fetch on button clicks repeatedly

5. Rendering logic:

   CUSTOM_SPLASH:
   - Show topic
   - Show creator name
   - Show Play button

   QUIZ:
   - Render quizData.questions[currentIndex]
   - Display:
     - question text
     - options as NES-style buttons
   - Clicking an option:
     - store selected answer
     - log selection

6. Progression:
   - Add a “Next” button
   - Increment currentIndex
   - Do NOT implement results yet

7. Constraints:
   - Everything stays inside splash.tsx
   - No expanded mode
   - No animations
   - No conditional mounting of roots
   - No return null

MANDATORY LOGS:
- [InlineQuiz] Custom post detected
- [InlineQuiz] Quiz loaded with N questions
- [InlineQuiz] Rendering question X
- [InlineQuiz] Option selected: ...

GOAL:
Custom quiz posts render real Firestore-backed questions inline,
while normal posts remain completely unchanged.
