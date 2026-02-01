🎯 TARGETED IDE PROMPT — Create Quiz Screen (Scene 1)

Context
This screen reuses the interactive Robot Mascot component from the Landing Page.
Do NOT refactor or rewrite the mascot logic.
Only reposition and contain it visually.

1️⃣ Fix Layout Hierarchy (Do NOT touch mascot internals)

Goal:
The robot must be visible, unobstructed, and allowed to animate freely (eye tracking, dialog bubbles).

Required structure (top → bottom):

Header (Back + Create Quiz)
↓
Inner Canvas (bounded card)
  ├─ Robot Mascot (top-center, absolute-safe zone)
  ├─ Optional timed dialog bubble (allowed here)
  ├─ Quiz Topic Input
  └─ CTA Button (Start Building)


Rules

Robot mascot must live inside the inner canvas, not the page background.

No text, input, or button may overlap the robot or its dialog bubble.

Reserve minimum 220–260px vertical space for mascot + dialog area.

The mascot may follow cursor, but must be clipped only by the inner canvas, not the viewport.

2️⃣ Add a Proper Inner Canvas (Critical)

Problem: Inner canvas blends into background → zero contrast.

Fix:

Create a single inner canvas card that wraps mascot + inputs.

Canvas must:

Be rectangular (NO rounded corners).

Have visible border (2–3px solid).

Have non-white, non-black background.

Approved background direction (pick ONE):

Warm paper (#FFF4E6 / #FAF3E0)

Soft stone (#F1F2F4)

Muted sage (#EEF4F1)

⚠️ Do NOT use pure white or pure black.

3️⃣ Fix Theme Independence (Very Important)

Requirement
This screen must look IDENTICAL in light & dark theme.

Action

Explicitly opt out of global theme colors.

Hard-set:

Inner canvas background

Border color

Text color

Ignore dark: Tailwind variants here.

This screen is self-themed, like Creator Studio.

4️⃣ Reposition & Restyle Header Controls

Back Button

Convert to a real NES-style button (depth + press).

No pill, no flat text.

Left-aligned, consistent size with CTA buttons elsewhere.

Create Quiz Title

Centered

High contrast

Do not overlap robot safe zone.

5️⃣ Fix CTA Button (Start Building)

Rules

Must visually match Creator Studio button physics:

Shadow present

Press = translate + shadow collapse

Width: full or near-full

Must never touch the bottom canvas border (≥16px padding).

6️⃣ Spacing & Padding Rules (Non-negotiable)

Inner canvas padding: 24–32px

Distance from canvas edge to content: never < 16px

Inputs must not touch borders

No content hugging edges

7️⃣ Explicitly Do NOT Do These

❌ Do NOT refactor the robot component
❌ Do NOT remove dialog bubble logic
❌ Do NOT introduce rounded corners
❌ Do NOT use black backgrounds
❌ Do NOT reintroduce global grid / wiremesh
❌ Do NOT change mascot animations or state logic

8️⃣ Success Criteria Checklist

After changes:

Robot is fully visible on mobile & desktop

Dialog bubble never clips

Inner canvas clearly separated from background

Screen looks the same in light & dark theme

Back & Start buttons have real physical press feedback

No overlap, no hidden elements, no theme bleed