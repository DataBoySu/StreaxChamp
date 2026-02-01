🎯 TARGETED IDE PROMPT — Create Quiz Screen (Scene 1) FIX

Context
This prompt applies ONLY to the Create Quiz screen (Creator flow, Scene 1).
Do NOT modify global theme, landing page, mascot logic, or shared components unless explicitly stated.

1️⃣ ABSOLUTE RULES (DO NOT VIOLATE)

❌ NO white backgrounds (#fff, bg-white, zinc-50, etc.)

❌ NO rounded corners (everything must be rectangular)

❌ DO NOT change mascot logic or animations

❌ DO NOT depend on dark/light theme

✅ This screen must look IDENTICAL in light & dark modes

✅ All colors must be explicitly hard-coded for this screen only

2️⃣ BACKGROUND & CANVAS (CORE FIX)

Outer Page Background

Replace current background with a soft, peaceful neutral:

Use: #F3EFE6 (warm parchment / stationery beige)

Remove orange and grid entirely for this screen

Do NOT reference global CSS variables

Inner Canvas (Main Content Box)

Background: #EDE7DC (slightly darker than page bg)

Border: 3px solid #1f1f1f

Shadow: 6px 6px 0px #1f1f1f

Padding: 24px

Margin from viewport edges (mobile): 16px

Margin from viewport edges (desktop): centered, max-width 720px

👉 This canvas must visually “float” with strong 3D depth.

3️⃣ LAYOUT STRUCTURE (FIX OVERFLOW & ALIGNMENT)

Order inside canvas (top → bottom):

Mascot Zone

Fixed height: 220px

Centered horizontally

overflow: visible

Mascot must NEVER overlap input or button

Dialogue bubble (if shown) must stay inside this zone

Title

Text: WHAT IS YOUR QUIZ ABOUT?

Margin-top: 12px

Margin-bottom: 8px

Color: #1f1f1f

Input Field

Full width

Height: 44px

Background: #FFF8F0

Border: 2px solid #1f1f1f

NO rounded corners

Inner padding: 8px 12px

Primary CTA — “START BUILDING >”

Full width

Height: 48px

Background: #FF9DB5 (soft pink, not white, not orange)

Border: 3px solid #1f1f1f

Shadow: 4px 4px 0px #1f1f1f

Active press:

transform: translate(2px, 2px)

shadow collapses to 2px 2px 0px

4️⃣ BACK BUTTON (FIX LOOK & CONSISTENCY)

Style as NES-style button, NOT text

Background: #E0D8CC

Border: 2px solid #1f1f1f

Shadow: 3px 3px 0px #1f1f1f

Position:

Mobile: top-left, inside page padding

Desktop: same row as title, left-aligned

5️⃣ RESPONSIVENESS (MANDATORY)

Mobile

Single column

No overflow

Canvas must scroll if height exceeds viewport

Desktop

Canvas centered

No elements touching edges

Use box-sizing: border-box everywhere

Explicitly remove overflow-hidden if present

6️⃣ WHAT TO REMOVE (IMPORTANT)

❌ Any bg-white or theme-derived backgrounds

❌ Any rounded corner utilities

❌ Any leftover grid / wiremesh overlays

❌ Any “helper” wrapper that forces clipping

7️⃣ VERIFICATION CHECKLIST (YOU MUST SELF-CHECK)

 Light mode and dark mode look identical

 No white background anywhere

 Mascot never overlaps input or button

 Strong visible 3D depth on canvas & buttons

 Mobile view has no clipping or overflow