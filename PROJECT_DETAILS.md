🚨 Creator Studio Visual Regression Fix (Hard Reset)

This is a correction task, not a redesign.
Do NOT introduce new visuals.
Only REMOVE and SCOPE styles correctly.

1️⃣ REMOVE Rounded Corners (Mandatory)

Remove all borderRadius applied to:

Creator Studio root container

Any wrapping “dashboard” or “canvas” div

Creator Studio must be fully rectangular

No clipped corners

No “device frame” metaphor

This is a hard revert. Rounded corners are explicitly unwanted.

2️⃣ STOP Styling the Global App Background

Undo any changes that modify:

Global app background

FlowShell background

App-level container background

Specifically:

Remove orange background

Remove grid background

Remove background styles that affect non-Creator screens

Creator Studio must NOT own the app shell.

3️⃣ Apply Background ONLY Inside Creator Studio Surface

Inside Creator Studio root component only:

Apply a warm paper background (e.g. cream / parchment)

This background must:

Not affect generator / quiz screens

Not leak outside Creator Studio

Add padding from edges (24–32px) so NES borders breathe

4️⃣ Fix Dark Theme: NO PURE BLACK

For dark mode inside Creator Studio only:

Replace black / zinc-950 / pure dark backgrounds with:

Warm charcoal

Dark brown

Muted graphite

NES borders and shadows must remain visible

❌ No bg-black
❌ No zinc-950

5️⃣ Do NOT Touch Buttons (Out of Scope)

Do not change:

Button press logic

Shadows

Hover behavior

This task is layout + background only.

6️⃣ Success Criteria (Must Verify)

Creator Studio corners are rectangular

Orange grid background is gone

Generator / Quiz screens are unaffected

Dark theme still shows NES borders clearly

Creator Studio looks identical in structure, just cleaner