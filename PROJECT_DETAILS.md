TASK: Final Creator Studio Library Polish (Text Semantics + Spacing Only)
Context

The Creator Studio UI is visually stable.
Only minor text semantics and spacing issues remain in the Library section.

This task must not introduce new colors, backgrounds, layouts, or visual concepts.

✅ Required Fixes
1. Terminology Corrections (Semantic Only)

Replace incorrect or inconsistent wording:

"PROJECTS" → "QUIZZES"

Example:
4 PROJECTS → 4 QUIZZES

"EDIT PROJECT" → "EDIT QUIZ"

Button label only

These are string changes only.
Do not change logic, counts, or state.

2. Metadata Chip Formatting (Date & Questions)

Current issue:

Metadata text is visually cramped and touches borders.

Fix:

Wrap metadata (date + question count) in a horizontal chip container with:

px-3 py-1.5

gap-2

Rounded rectangle (but NOT pill)

Thin border consistent with NES style

Example structure (conceptual):

[ 2/1/2026 ]   [ 5 Questions ]


Rules:

Chips must not touch card edges

Chips must align left, below quiz title

Font size slightly smaller than title

No background color changes

3. Card Inner Padding Adjustment

Problem:

Text elements (title, chips, buttons) sit too close to the card border.

Fix:

Increase inner padding of each quiz card:

Minimum: p-4

Prefer: p-5 if space allows on mobile

Apply consistently to:

Title

Metadata chips

Edit button

Do not change card border thickness or elevation.

4. Header Alignment Polish

For the YOUR LIBRARY header row:

Left: YOUR LIBRARY

Right: X QUIZZES

Ensure:

Vertical alignment is centered

Right-side count has a little breathing room from the edge

No overlap on small screens

❌ Explicit Non-Goals (Do NOT Touch)

Background

Shadows

Color palette

Fonts

Layout structure

Button press effects

Creator logic

Fetching / state logic

This is a pure polish pass.

✅ Verification Checklist

After implementation:

No text touches card borders

Metadata reads clearly at a glance

Terminology uses Quiz / Quizzes everywhere

Mobile view does not feel cramped

Visual style remains unchanged otherwise