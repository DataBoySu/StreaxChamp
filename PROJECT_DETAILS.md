🚨 CRITICAL MOBILE BREAKAGE — CREATOR QUIZZES UNPLAYABLE

We have a production-blocking bug:
Creator-mode quizzes are UNPLAYABLE on mobile devices.
Daily quizzes are fine.
Desktop is fine.

Your task is NOT cosmetic. This is a layout correctness fix.

══════════════════════════════════════
1️⃣ ROOT CAUSE ANALYSIS (MANDATORY)
══════════════════════════════════════
Before changing anything, identify EXACTLY why this happens.

You MUST:
- Compare the render path for:
  - Daily quiz questions
  - Creator-mode quiz questions
- Identify ALL layout differences (containers, height, flex, grid, overflow)

Specifically inspect:
- InlineQuiz.tsx
- OptionGrid / OptionButton
- Parent containers (Canvas / Card / Modal)
- Any usage of:
  - height: 100%
  - minHeight
  - vh units
  - overflow: hidden
  - flex-1 inside constrained parents
  - grid-auto-rows
  - NES.css shadow overflow

Log your findings in comments before fixing.

══════════════════════════════════════
2️⃣ REQUIRED MOBILE-SAFE RULES
══════════════════════════════════════
Apply ALL of the following rules:

❌ FORBIDDEN on mobile:
- height: 100% on option buttons
- fixed container heights
- vertical centering that assumes available space
- clipping via overflow:hidden on quiz containers

✅ REQUIRED:
- Options must size by CONTENT, not container
- Next button must ALWAYS be visually separated
- Page must scroll naturally if content exceeds viewport
- NES.css shadow must never overlap adjacent buttons

══════════════════════════════════════
3️⃣ IMPLEMENTATION REQUIREMENTS
══════════════════════════════════════
Implement a MOBILE-FIRST FIX:

A. Option Buttons
- Remove height: '100%' from option buttons
- Use min-height ONLY (e.g. 44–48px)
- Let buttons grow naturally with text

B. Option Grid
- Mobile (<640px):
  - FORCE stacked layout (1 column)
  - Disable grid-cols-2 entirely
- Desktop only may use 2x2 grid

C. Container Behavior
- The quiz container MUST:
  - NOT trap height
  - NOT use flex:1 for vertical sizing
  - Allow full vertical scrolling

D. Spacing Guarantees
- Minimum 16–24px gap between:
  - Last option
  - Next button
- NES shadow must have breathing room

══════════════════════════════════════
4️⃣ DO NOT BREAK THESE
══════════════════════════════════════
- Desktop 2x2 layout must remain unchanged
- Daily quiz flow must remain unchanged
- Visual NES button depth must remain intact
- No ResizeObserver hacks
- No JS-based viewport measurements

══════════════════════════════════════
5️⃣ VERIFICATION CHECKLIST (MANDATORY)
══════════════════════════════════════
After fix, verify:

☐ Mobile (Reddit app):
   - All options fully visible
   - No overlap
   - Next button always clickable
   - Natural scrolling works

☐ Desktop:
   - Creator quizzes unchanged
   - Daily quizzes unchanged

☐ Regression check:
   - Test with long option text
   - Test with short options (4x1 layout)

If ANY of these fail, the fix is incorrect.

══════════════════════════════════════
6️⃣ OUTPUT REQUIREMENT
══════════════════════════════════════
Explain:
- Root cause (1–2 paragraphs)
- Exact code changes made
- Why this fix is stable long-term
