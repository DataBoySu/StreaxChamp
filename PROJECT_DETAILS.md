TASK: Landing Page & Topic Selector UI Refinement (STRICT SCOPE)

I need you to refine and visually overhaul ONLY the following areas:

Landing Page (Infinity Quiz Generator)

Topic Selector UI

🚫 DO NOT TOUCH:

Interactive Robot logic or visuals (position/scale may be adjusted ONLY to prevent overflow)

Topic buttons themselves (their labels, colors, click logic)

Quiz gameplay UI

Creator Studio

Any server-side logic or data flow

1️⃣ Scroll & Layout Bug (Critical – Must Fix First)

The Landing Page currently has two scrollbars (outer + inner container).

Remove the inner scrollbar entirely.

The page must support single-swipe vertical scrolling on mobile.

Use natural document flow instead of fixed-height + overflow containers wherever possible.

2️⃣ Visual Direction (Non-Negotiable)

Transform existing components (do not replace functionality) to follow this style:

Aesthetic:

Kawaii + Cyber

2D pixel art with fake 3D depth (shadows, offsets, NES-style borders)

Libraries to Prefer:

nes.css (buttons, containers, borders, UI affordances)

Press Start 2P font (headings, buttons, labels)

Framer Motion (subtle, low-cost animations only)

Feel free to install external css and frontend frameworks if you believe existing tech stack is insufficient for the task.

Theme Lock:

The Landing Page and Topic Selector must look identical whether Reddit is in light mode or dark mode.

Ignore Reddit theme signals.

Explicitly set background, text, and surface colors.

3️⃣ Color & Contrast Rules

The Interactive Robot is the visual anchor — all colors must complement it.

Avoid pure black backgrounds (they kill NES-style depth).

Prefer:

Warm parchment / soft neutral backgrounds

High-contrast borders

Clear separation between layers (background → surface → interactive)

4️⃣ Space-Aware Design (Very Important)

Rework spacing so content breathes on mobile:

No text hugging borders

No stacked elements colliding when the robot dialogue appears or disappears

Robot dialogue must never clip or push content off-screen.

If needed, reserve vertical “safe space” above or below the robot without changing its logic.

5️⃣ Topic Selector UI

Restyle the Topic Selector container using the same NES + pixel + cyber aesthetic.

Improve readability and spacing.

Keep it scrollable if needed, but do not nest scrollbars.

Topic buttons themselves must remain untouched.

6️⃣ Performance Constraints

Animations must be cheap (opacity, translate, scale only).

No continuous animations, no heavy blur filters, no large shadow stacks.

The app currently slows down during play — do not add anything that increases runtime cost.

7️⃣ Deliverables

Refactor or restyle existing components only.

No visual regressions compared to the current Landing Page.

The end result should feel:

Gamer-grade

Intentional

Consistent

NES-inspired without parody

❗If a requested change risks breaking other screens, do not implement it — instead, leave a comment explaining why.

Do not proceed beyond Landing Page & Topic Selector.