TASK: Generator Landing Page UI Bug Audit (NO DESIGN CHANGES)

IMPORTANT:
Before proceeding, read:
- agents.md
- devvit_web_knowledge_base.md

---

PROBLEM:
Players report UI bugs on the Generator landing page.
Issues appear after navigation, returning from quizzes, or state changes.

---

GOALS:
- Identify ALL UI bugs caused by state, lifecycle, or rendering logic
- Do NOT redesign or restyle anything
- Do NOT touch animations, colors, or layout aesthetics

---

INVESTIGATION REQUIREMENTS:
1. Audit the Generator landing page component tree
2. Identify:
   - Components that remain mounted when they should unmount
   - Hidden elements still consuming layout space
   - State that is not reset on route re-entry
   - Effects that run multiple times unexpectedly
3. Verify behavior in:
   - First load
   - After completing a quiz
   - After navigating back from quiz
   - Expanded view

---

EXPECTED OUTPUT:
- A list of concrete bugs (with file + component names)
- Why each bug happens (state, effect, conditional render)
- Minimal fixes for each bug
- Confirmation that fixes do NOT change visuals

---

DO NOT:
- Introduce new UI
- Change spacing
- Change robot behavior
- Touch Framer Motion animations
