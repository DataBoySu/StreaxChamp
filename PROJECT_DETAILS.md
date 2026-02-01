🎨 DESIGN INTENT (SO IDE DOESN’T GO ROGUE)

Before the prompt, here’s the design intent you want to enforce:

Creator Studio should feel like:

📒 A cozy desk / notebook

🧸 Friendly, calm, non-competitive

✏️ “I’m making something”, not “I’m playing”

Visual hierarchy > decoration

Which means:

Background = supporting actor

Cards = physical objects

Borders = thick but breathable

Colors = warm neutrals, not loud primaries

🎯 TARGETED AI IDE PROMPT (COPY–PASTE)

This prompt only touches spacing + background, nothing else.

🎨 Creator Studio Visual Polish – Spacing & Background Only

Objective
Refine Creator Studio visuals by:

Improving spacing between borders and content

Replacing the orange grid background with a calmer, cohesive pattern

⚠️ This is a visual-only polish pass.
Do NOT modify logic, state, layout structure, or text.

1️⃣ Fix Border-to-Content Spacing (Breathing Room)
Problem

Content sits too close to thick borders

NES-style “depth” feels flattened

Cards lack internal air

Required Changes

Apply consistent internal padding tokens:

Global panel/card rule

Minimum internal padding: p-4 (16px)

For hero cards / primary sections: p-6 (24px)

Specific fixes

Creator header container: add padding-bottom

“Create New Quiz” card: ensure text does NOT touch border

Library items: increase left/right padding so text does not sit on border

🚫 Do NOT change border thickness
🚫 Do NOT reduce font sizes
🚫 Do NOT change spacing between sections — only inside them

2️⃣ Replace Background Grid + Orange Theme
Problem

Orange grid dominates attention

Grid conflicts with NES pixel borders

Background should frame, not shout

New Background Rules (Creator Studio ONLY)
A. Color

Replace orange background with warm neutral paper tone:

Light mode base: #FFF7ED (warm cream)

Dark mode base: #1C1917 (warm charcoal, not pure black)

No bright orange backgrounds.

B. Pattern (Subtle, Optional)

If pattern is used, it must be:

Extremely low contrast

Large scale

Barely noticeable

Allowed:

Soft dot pattern (2–3% opacity)

Very light paper grain

No visible grid lines

Forbidden:

High-contrast grids

Checkerboards

Repeating sharp lines

C. Contrast Rule

Background must be at least 2 levels lighter/darker than cards

Cards must always visually “float” above background

3️⃣ Consistency Rule (Very Important)

Creator Studio must look identical in light and dark mode, except for:

Background base color

Text color inversion

Spacing, borders, card structure, and hierarchy must remain unchanged.

4️⃣ Validation Checklist

✅ Content never touches borders
✅ Cards feel padded and physical
✅ Background is calm and unobtrusive
✅ Orange is used only for accents (titles, highlights)
✅ Switching themes does not change layout or hierarchy

5️⃣ Explicit Non-Goals

Do not redesign UI

Do not introduce new components

Do not adjust logic or data

Do not restyle quiz gameplay screens

Deliverable

Creator Studio feels calm, breathable, and intentional — ready for kawaii polish later.