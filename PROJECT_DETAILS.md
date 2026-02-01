🎯 TARGETED AI IDE PROMPT — Robot Mascot Bounding & Dialogue Safety Fix

Paste this as-is.

Context (Critical)

The robot mascot has:

Hover / cursor-follow micro-interactions

Time-based dialogue bubbles

Special prompt bubbles that appear above its head

Currently, these dialogues are being clipped by the inner canvas top edge.

This is a layout anchoring bug, not a visual one.

1️⃣ Root Cause (Do Not Skip)

The mascot is currently:

Positioned too close to the top boundary of the inner canvas

With dialogue bubbles rendered using absolute positioning above the mascot

Without any vertical safety margin for dialogue height

2️⃣ Mandatory Fix Strategy

We do NOT resize the canvas
We do NOT shrink the robot
We do NOT disable dialogue

Instead, we introduce a dialogue-safe anchor zone.

3️⃣ Exact Structural Changes Required
A. Mascot Anchor Wrapper

Wrap the mascot in a container with top padding reserved only for dialogue:

Add a wrapper div:

position: relative

padding-top: 96px (desktop)

padding-top: 72px (mobile)

⚠️ This padding exists ONLY to absorb dialogue height, not as visual spacing.

B. Mascot Vertical Alignment

The robot itself must be:

Vertically centered within the remaining space

NOT pushed further down than necessary

Do NOT add margin-top to the robot itself

C. Dialogue Bubble Rules

Dialogue bubbles must:

Render with position: absolute

Anchor to mascot top (bottom: 100%)

Never exceed the top padding zone

Add:

max-width constraint

Soft vertical offset (bottom: calc(100% + 8px))

4️⃣ Overflow & Clipping Rules (MANDATORY)

Inner canvas must have:

overflow: visible

Only the outer app shell may clip overflow

Do NOT use overflow: hidden anywhere in the mascot subtree

5️⃣ Mobile-Specific Safety

On mobile:

Dialogue-safe padding must be smaller

Ensure no dialogue is clipped even when:

Keyboard opens

Address bar collapses

Scroll is at top

6️⃣ What NOT To Do

🚫 Do NOT move the mascot lower arbitrarily
🚫 Do NOT disable or shorten dialogue text
🚫 Do NOT add scroll just for dialogue
🚫 Do NOT convert dialogue to inline flow

✅ Success Criteria

Idle robot: centered, compact

Dialogue appears: fully visible, never clipped

Special prompt appears: always readable

Canvas size unchanged

No visual dead space when dialogue is hidden