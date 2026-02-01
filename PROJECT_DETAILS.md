🔧 AI IDE PROMPT — Step 2: NES.css Depth Restoration (Inline Quiz)

Context

The Inline Quiz has been structurally refactored into:

InlineQuiz

OptionGrid

OptionButton

Logic is correct, but NES.css button depth illusion is visually lost, especially in 2×2 grid mode.

This task is to restore 3D depth and press feedback, not redesign UI.

🎯 Objective (STRICT)

Restore NES.css visual depth so that:

Buttons visibly “float”

Pressing visibly moves them

Grid mode does NOT flatten buttons

Mobile rendering remains safe

🧱 Required Changes
1️⃣ Add a Depth Wrapper inside OptionGrid

Each grid cell must contain:

<div className="option-cell">
  <OptionButton ... />
</div>


The wrapper is responsible for spacing, not the button.

2️⃣ Spacing Rules (MANDATORY)

Vertical spacing: margin-bottom: 12px

Horizontal spacing: margin-right: 12px

Do not rely only on gap

Grid should visually “breathe”

NES.css shadows must never touch another border.

3️⃣ Button Size Policy

Do NOT shrink buttons

Maintain:

min-height ≥ 44px

width: 100%

Depth > compactness

4️⃣ Press / Hover Preservation

Ensure:

:active still shifts button visually

No parent overflow: hidden blocks shadows

No flex/grid stretch collapses shadow space

🚫 Explicit Non-Goals

❌ No new design tokens

❌ No color changes

❌ No animation changes

❌ No layout logic changes

❌ No mobile-specific overrides

✅ Acceptance Criteria

Grid buttons clearly show shadow separation

Pressing a button visibly “pushes” it down

Hover effect is perceptible (desktop)

Mobile rendering unchanged

Only OptionGrid / wrapper touched

🧪 Visual Check

Before:

Buttons look flat and merged

After:

Buttons look like raised tiles with air between them

Implement this now. Do not touch any other files.