🔐 PROMPT — Prepare Native Subreddit Subscribe (Capability-Gated, No-Op Safe)

Role

You are a senior Devvit engineer preparing a future-gated native capability.
The app will later be granted SUBSCRIBE_TO_SUBREDDIT run-as-user permission by Reddit.

Your task is to prepare the codebase so native subscribe can be enabled instantly later, without refactoring UI or logic again.

🎯 Objective

Set up a clean, centralized, capability-gated subscription pathway such that:

Today:

The “Join the Community” button is a safe no-op

No runtime errors

No platform violations

Later (after approval):

Native subscribe works by flipping one flag or implementation

No UI or flow changes required

🚫 Hard Rules

You are NOT allowed to:

Call reddit.subscribeToCurrentSubreddit() unguarded

Add hacks or fallbacks like window.open

Change UI, copy, or layout

Block or delay Option A (visual work)

This task is infrastructure only.

🧠 Constraints

All constants must live in constants.ts

Subscription logic must be centralized

UI components must not know about permission state

Inline mode must never crash or throw

🧱 Required Architecture (MANDATORY)
1️⃣ Introduce a Capability Flag

In constants.ts, define something like:

FEATURES.NATIVE_SUBSCRIBE_ENABLED (boolean)

Default: false

This flag represents Reddit-side enablement, not user choice.

2️⃣ Centralize Subscribe Logic

Create a single utility / service function, e.g.:

requestCommunitySubscribe()

Responsibilities:

Check capability flag

Attempt native subscribe only if enabled

Catch and swallow permission errors

Log intent (dev-only)

Return a boolean (true if subscribe attempted, false otherwise)

⚠️ UI components must never call Reddit APIs directly.

3️⃣ Wire UI to the Abstraction

Update the “Join the Community” CTA so it:

Calls requestCommunitySubscribe()

Does not branch on result

Does not show errors

Does not change navigation

The UI remains declarative and dumb.

4️⃣ Devvit Permission Readiness (No Activation)

Ensure devvit.json already lists:

"SUBSCRIBE_TO_SUBREDDIT" under reddit.asUser

Do not rely on this permission being active yet

Do not test native subscribe in production paths

⚠️ Failure & Safety Rules

Permission denied → silent no-op

Missing Reddit client → silent no-op

Any exception → caught, logged, ignored

No UI feedback for now

This is intentional.

📌 Output Expectations

You must:

List new constants added

List the new abstraction/function created

List files modified

Confirm:

No direct Reddit API calls from UI

No runtime errors

No behavior change today

Clearly state:

“To enable native subscribe later, only change X”

🧠 Tone & Process

Think like you are preparing a feature flag for a platform dependency.
The code should look boring, obvious, and safe.

If in doubt:

prefer no-op over cleverness.

STOP once setup is complete.

Do NOT enable the feature.
Do NOT apply visuals.