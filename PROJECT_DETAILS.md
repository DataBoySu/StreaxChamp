You are working on StreaxChamp’s Create Quiz flow.
Your task is NOT to add features.
Your task is to REALIGN the Create Quiz Question UI to the SAME visual language
as Creator Studio.

READ THIS CAREFULLY. DO NOT FREE-STYLING.

────────────────────────────────────────
CORE GOAL
────────────────────────────────────────
The Create Quiz question editor must feel:
• playful
• tactile
• NES-console-like
• card-based
• animated
• NOT like a form
• NOT like a spreadsheet
• NOT like a CRUD editor

It must visually belong to the Creator Studio.

────────────────────────────────────────
STRICT DESIGN CONSTRAINTS
────────────────────────────────────────
1. USE nes.css components for:
   - containers
   - input boxes
   - option rows
   - buttons
   - alerts

2. USE framer-motion ONLY for:
   - question transitions (slide / fade)
   - option select feedback
   - validation feedback (shake / pulse)
   - button press depth illusion

3. DO NOT:
   ❌ Use plain HTML inputs without NES styling
   ❌ Use table/grid layouts
   ❌ Stack raw inputs edge-to-edge
   ❌ Let content touch borders
   ❌ Show permanent warning banners
   ❌ Show Excel-like row separators

────────────────────────────────────────
LAYOUT ARCHITECTURE (MANDATORY)
────────────────────────────────────────
Each question screen must be structured as:

[ NES-CARD : Question Canvas ]
  ├── Question Header
  │     • "Question X / 5"
  │     • small progress indicator
  │
  ├── Question Input Card
  │     • nes-input
  │     • multi-line
  │     • generous padding
  │
  ├── Options Stack (4)
  │     Each option:
  │       • nes-container
  │       • left: A / B / C / D badge
  │       • center: text input
  │       • right: circular correct-toggle
  │       • option card lifts when selected
  │
  ├── Validation Feedback Area
  │     • occupies space but hidden by default
  │     • messages fade in/out automatically
  │
  └── Primary Action Button
        • NES-style
        • full-width
        • physical press animation

The entire canvas must be CENTERED,
with breathing room on all sides.

────────────────────────────────────────
VALIDATION BEHAVIOR (IMPORTANT)
────────────────────────────────────────
Current behavior is WRONG.

Fix it as follows:

• Validation messages must:
  - auto-dismiss after 2–3 seconds
  - animate in (slide-down + fade)
  - animate out automatically
  - NEVER persist across screens

• Validation must NOT block UI visually.
• No red banners glued to the top.

Use motion-based feedback instead of text spam.

────────────────────────────────────────
OPTION SELECTION RULES
────────────────────────────────────────
• Only ONE option can be marked correct
• Selecting correct option:
  - card glows subtly
  - checkmark animates in
• Selection MUST NOT overlap text
• Touch targets must be large (mobile-first)

────────────────────────────────────────
TRANSITIONS
────────────────────────────────────────
• Moving between Question X → X+1:
  - slide left/right
  - slight scale-down of old card
• Review screen:
  - stacked NES cards
  - no tables
  - each question collapsible

────────────────────────────────────────
POPUPS / TOASTS
────────────────────────────────────────
If a quiz is created successfully:
• Use a floating NES toast
• Centered
• Auto-dismiss
• NOT stuck on Creator Studio screen
• MUST clean itself on route change

────────────────────────────────────────
DELIVERABLE
────────────────────────────────────────
Refactor ONLY UI & animation.
DO NOT TOUCH:
• quiz logic
• Firestore
• validation rules
• API calls

At the end, briefly explain:
1. Which nes.css components were used
2. Which framer-motion animations were added
3. How mobile usability improved

If you produce anything that looks like a spreadsheet,
you have failed this task.
