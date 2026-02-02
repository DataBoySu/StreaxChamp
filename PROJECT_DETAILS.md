TASK: Phase 2 UI Overhaul — Generator Mode Selector & Config Cards

IMPORTANT CONTEXT (READ FIRST):
Before making any changes, read and respect the contents of:
- agents.md
- devvit_web_knowledge_base.md

These documents define Devvit-specific constraints, lifecycle rules,
rendering behavior, performance limits, and platform restrictions.
Do NOT assume standard web or React behavior if it conflicts with these files.

---

GOAL:
Refactor the Quiz Generator landing UI to replace the current
"Topic Select / Daily Quiz" toggle and the raw stat chips
with a cohesive, gamer-style Mode Selector + Config Cards system.

This is a VISUAL + STRUCTURAL overhaul only.
DO NOT modify:
- Quiz generation logic
- API contracts
- Firestore / Redis
- Scoring, streaks, or history logic

---

SCOPE (WHAT TO CHANGE):

### 1️⃣ Generator Mode Selector (PRIMARY CHANGE)

Replace the current:
- "Topic Select / Daily Quiz" buttons
- Any ad-hoc conditional UI tied to them

With a dedicated component:

📁 New Component:
src/client/components/landing/GeneratorModeSelector.tsx

Behavior:
- Two large NES-style selectable cards:
  - 🎯 Topic Quiz
  - 📅 Daily Quiz
- Cards are mutually exclusive (radio-style, not toggle buttons)
- Selected card:
  - Appears "pressed in" (NES.css depth)
  - Subtle Framer Motion scale/settle animation
- Unselected card:
  - Neutral, slightly raised

Rules:
- Default selection = Daily Quiz
- Selection ONLY updates UI state (no generation trigger)

---

### 2️⃣ Config Cards (REPLACES STAT CHIPS)

Replace:
- “5 Questions”
- “15s Per Question”
- “1st Glory Awaits”

With NES-style Config Cards:

📁 New Component:
src/client/components/landing/QuizConfigCards.tsx

Cards:
- 🧮 Questions Count (fixed: 5)
- ⏱ Time Per Question (fixed: 15s)
- 🏆 Mode Description (contextual)

Behavior:
- Cards are informational (not interactive yet)
- Copy changes based on selected mode:
  - Daily Quiz → “Official Daily Challenge”
  - Topic Quiz → “User-Generated Topic”
- Use NES.css panels with subtle glow / highlight
- Small Framer Motion hover lift ONLY (no continuous animation)

---

### 3️⃣ Start Quiz CTA (UNCHANGED LOGIC, BETTER VISUAL)

Refactor the existing Start Quiz button:
- Keep all existing onClick logic exactly as-is
- Visually anchor it BELOW Mode Selector + Config Cards
- Make it the strongest visual weight on the screen
- NES.css button with:
  - Clear press-in animation
  - No bouncing, no looping effects

---

### 4️⃣ Layout Rules (CRITICAL)

- The Generator landing page must follow this vertical order:

  1. HeroSection (already refactored)
  2. GeneratorModeSelector
  3. QuizConfigCards
  4. Start Quiz button
  5. Secondary sections (Recent Plays, Leaderboards, Hot Topics)

- No absolute positioning for core controls
- All spacing must survive:
  - Mobile
  - Expanded view
  - Desktop

---

### 5️⃣ Performance Constraints (DO NOT VIOLATE)

- No continuous animations
- No animation tied to mouse position
- Framer Motion:
  - entry (once)
  - hover (light)
  - press (short)
- Components must be memoized where appropriate
- Robot component MUST NOT re-render due to mode changes

---

### 6️⃣ Explicit Non-Goals (DO NOT DO THESE)

❌ Do NOT redesign Create Quiz pages  
❌ Do NOT touch the InteractiveRobot internals  
❌ Do NOT add new logic for difficulty, timing, or question count  
❌ Do NOT introduce new state that affects generation behavior  

---

### 7️⃣ Deliverables

- New components:
  - GeneratorModeSelector.tsx
  - QuizConfigCards.tsx
- Modified:
  - LandingHero.tsx (or equivalent parent)
- Clear, readable structure
- No regressions in behavior

---

FINAL CHECK BEFORE SUBMITTING:
- UI feels “gamer, tactile, intentional”
- No spreadsheet-like visuals
- No visual noise
- No performance regression
