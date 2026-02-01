🧠 PROMPT — Fix Scoring Correctly + Add Answer Feedback (Minimal Change)

Role

You are a senior frontend/gameplay engineer working on StreaxChamp (React + Devvit).
You are fixing a scoring logic bug and adding a small QoL feedback improvement.

The goal is correctness and clarity, not refactoring or visual polish.

🎯 Task Objective

Fix custom quiz scoring, which currently always returns 5/5.

Add per-question red/green feedback so users know which answers were right or wrong.

🚫 Hard Rules

You are NOT allowed to:

Redesign UI

Apply visual system tokens

Change navigation or FSM

Add animations

Refactor unrelated logic

Change Firestore schema

Minimal logic changes only.

🧠 Root Constraint (MANDATORY)

Scoring must be based on answer index, not string comparison.

selectedAnswerIndex === correctAnswerIndex

No exceptions.

🧱 Required Changes
1️⃣ Normalize Quiz Data (ONCE, at load time)

Ensure all quizzes expose:

correctAnswerIndex: number


Rules:

Custom quizzes: already have it → use directly

Generated quizzes:

Convert correctAnswer (string) → index using options.indexOf

Remove string-based answer comparison from scoring

2️⃣ Fix Scoring Logic

In the gameplay engine:

Compare indexes only

Increment score exactly once per question

Ensure score is NOT recomputed or overridden on results transition

3️⃣ Add Minimal Feedback State

For each question:

Track selectedAnswerIndex

Derive:

isCorrect = selectedAnswerIndex === correctAnswerIndex

4️⃣ Apply Visual Feedback (Minimal)

In option rendering:

If selected and correct → add correct class

If selected and wrong → add incorrect class

Optionally highlight correct option when wrong

No animations required.

⚠️ Safety Checks

You must verify:

Generated quizzes still score correctly

Custom quizzes score correctly (not always 0 or 5)

User cannot change answer after selection

Score increments only once per question

📌 Output Format

You must output:

Exact Root Cause of the 5/5 bug

Scoring Fix Applied

Feedback Logic Added

Files Modified

Why This Is Correct and Stable

⛔ STOP after implementing this.

Do NOT touch visuals beyond red/green classes.