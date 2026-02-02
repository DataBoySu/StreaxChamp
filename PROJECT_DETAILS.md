🚨 MOBILE QUIZ LAYOUT IS STILL UNPLAYABLE — HARD CONSTRAINT FIX REQUIRED

The previous fixes FAILED because they relied on scrolling.
That is NOT acceptable.

We must implement a DETERMINISTIC MOBILE LAYOUT SYSTEM
that GUARANTEES the "Next" button is always reachable.

══════════════════════════════════════
🧠 CORE RULE (NON-NEGOTIABLE)
══════════════════════════════════════
On MOBILE, the quiz screen must be treated as a FIXED-VISUAL CANVAS
with INTERNAL ADAPTATION — NOT unbounded vertical growth.

The screen is divided into RESERVED ZONES.

══════════════════════════════════════
1️⃣ DEFINE A MOBILE HEIGHT BUDGET
══════════════════════════════════════
Introduce a mobile-only layout contract:

Total usable height = viewport height - header - padding

Divide it as:

- Question block: MAX 30%
- Options block: 45–50%
- Next button block: FIXED (min 56px + margin)

This must be enforced in code.

══════════════════════════════════════
2️⃣ TWO-PASS OPTION RENDERING (MANDATORY)
══════════════════════════════════════

PASS 1 — LAYOUT MODE SELECTION
--------------------------------
Before rendering options:

IF mobile:
  - If answerCount === 4 AND all option lengths <= 16 chars:
      layout = "GRID_2x2"
  - ELSE:
      layout = "STACK_4x1"

Desktop behavior must remain unchanged.

PASS 2 — FONT & HEIGHT ADAPTATION
--------------------------------
For MOBILE ONLY:

Calculate maxOptionHeight = optionsBlockHeight / answerCount

Rules:
- Start with base font size (0.85rem)
- If option text overflows its maxOptionHeight:
    ↓ reduce font size stepwise (0.85 → 0.8 → 0.75)
- HARD STOP at 0.75rem
- If still overflowing:
    - Allow internal text wrapping
    - BUT option height must NEVER exceed its allocated slot

No option is allowed to push siblings or the Next button.

══════════════════════════════════════
3️⃣ NEXT BUTTON SAFETY GUARANTEE
══════════════════════════════════════
The "Next" button must live in a RESERVED FOOTER ZONE.

Rules:
- It is NOT part of the options container
- It is NOT affected by option height
- It must always be fully visible without scrolling
- Add a minimum 16px visual gap above it

══════════════════════════════════════
4️⃣ CSS & STYLE CONSTRAINTS
══════════════════════════════════════
FORBIDDEN:
- height: auto on the options container (mobile)
- options determining parent height
- relying on overflow scroll to reach Next
- JS ResizeObserver hacks

REQUIRED:
- max-height on options container (mobile)
- overflow: hidden INSIDE options only (never on whole screen)
- font-size scaling instead of layout collapse

══════════════════════════════════════
5️⃣ WHAT MUST NOT CHANGE
══════════════════════════════════════
- Desktop layout
- Daily quiz rendering
- NES button depth / shadows
- Option correctness logic

══════════════════════════════════════
6️⃣ VERIFICATION (YOU MUST TEST THESE)
══════════════════════════════════════
On MOBILE (Reddit app):

☐ Long question + long answers → Next visible
☐ Short answers → clean 2x2
☐ Very long answers → smaller text, no overflow
☐ No overlap with footer
☐ No option hides the Next button

If ANY case fails, the fix is INVALID.

══════════════════════════════════════
7️⃣ OUTPUT REQUIREMENT
══════════════════════════════════════
Explain clearly:
- Where the height budget is enforced
- How font scaling is applied
- Why this cannot regress on mobile again
