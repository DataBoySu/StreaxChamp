# Inline Interaction Architecture & Data Contract

**Version**: 1.1
**Status**: APPROVED
**Context**: Reddit Devvit Inline Frame (Fixed 520px Height, No Scroll)

---

## 1. Inline State Enum

The inline experience is modeled as a deterministic Finite State Machine (FSM). Only one state is active at a time. High-level "modes" in the code map to these formal states.

```typescript
enum InlineState {
  BOOT = "BOOT",                     // Initial mounting, context checks
  MENU = "MENU",                     // Standard interaction (Create/Generate)
  CUSTOM_LOADING = "CUSTOM_LOADING",  // Fetching quiz data for custom post
  CUSTOM_SPLASH = "CUSTOM_SPLASH",   // Cover screen for a ready custom quiz
  QUIZ_ACTIVE = "QUIZ_ACTIVE",       // Interactive gameplay
  RESULTS = "RESULTS",               // Final score summary
  ERROR = "ERROR"                    // Fallback for fatal data failures
}
```

---

## 2. Transition Rules

Transitions are strictly defined to prevent undefined states.

| From State | To State | Trigger | Condition |
| :--- | :--- | :--- | :--- |
| **BOOT** | `MENU` | System (Init) | `!initData.customQuiz` |
| **BOOT** | `CUSTOM_LOADING` | System (Init) | `!!initData.customQuiz` |
| **BOOT** | `ERROR` | System (Init) | `fetch('/api/init')` fails |
| **CUSTOM_LOADING** | `CUSTOM_SPLASH` | System (Fetch) | `quizData` fetched successfully |
| **CUSTOM_LOADING** | `ERROR` | System (Fetch) | `quizData` fetch fails |
| **MENU** | *(Expanded Mode)* | User Action | Click "Create" or "Generate" |
| **CUSTOM_SPLASH** | `QUIZ_ACTIVE` | User Action | Click "Play Now" |
| **CUSTOM_SPLASH** | `ERROR` | System | `quizData` missing at play time |
| **QUIZ_ACTIVE** | `QUIZ_ACTIVE` | User Action | Click "Next" (more questions remain) |
| **QUIZ_ACTIVE** | `RESULTS` | User Action | Click "Finish" (no questions remain) |
| **RESULTS** | *(Expanded Mode)* | User Action | Click "Play More" |
| **ERROR** | `MENU` | User Action | Click "Home" / "Retry" (Proposed) |

> **Note**: The `MENU` state currently acts as a portal to Expanded Mode. It does not transition to `QUIZ_ACTIVE` in the current implementation.

---

## 3. Stage-by-Stage Data Contract

### A. BOOT
- **Required Inputs**: None.
- **Owned State**: `loading` (boolean).
- **Side Effects**:
  - `fetch('/api/init')`: Determines session context.
- **Exit Condition**: `init` resolves.

### B. MENU
- **Required Inputs**: None.
- **Owned State**: None.
- **Side Effects**: None (Static UI).
- **Exit Condition**: User requests expansion.

### C. CUSTOM_LOADING
- **Required Inputs**:
  - `customQuizMeta`: `{ quizId, title, creator }`
- **Owned State**: `quizLoading` (boolean).
- **Side Effects**:
  - `fetch('/api/quizzes/:id')`: Fetches gameplay data.
- **Exit Condition**: Data fetch completes (OK or Fail).

### D. CUSTOM_SPLASH
- **Required Inputs**:
  - `customQuizMeta`: Display metadata.
  - `quizData`: Full `DailyQuiz` object (Preloaded).
- **Owned State**: None.
- **Side Effects**: None.
- **Exit Condition**: User confirms readiness.

### E. QUIZ_ACTIVE
- **Required Inputs**:
  - `quizData`: VALIDATED `DailyQuiz` object.
- **Owned State** (via `useInlineQuiz`):
  - `currentIndex`: `0..N-1`
  - `selectedAnswerIndex`: `number | null`
  - `score`: `number`
- **Mutates**:
  - Increments `currentIndex`.
  - Increments `score`.
- **Exit Condition**: `currentIndex >= questions.length`.

### F. RESULTS
- **Required Inputs**:
  - `score`: Final calculated score.
  - `totalQuestions`: Derived from `quizData`.
- **Owned State**: None.
- **Side Effects**: None.
- **Exit Condition**: User requests expansion.

---

## 4. Stage Render Contract

Defines the exact UI component and props required for each active state. This contract enforces that a state cannot exist visually without its dependencies.

| State | Component / Render Fn | Required Props / Context | Visual Output |
| :--- | :--- | :--- | :--- |
| **MENU** | `renderMenu()` | None (Static) | Two buttons: Create / Generate |
| **CUSTOM_SPLASH** | `renderCustomSplash()` | `customQuizMeta` (Must be non-null) | Topic Title, Creator, "Play Now" Btn |
| **QUIZ_ACTIVE** | `<InlineQuiz />` | `quizData` (Full object), `currentIndex`, `score` | Question Text, 4 Options (Grid), Next Btn |
| **RESULTS** | `renderResults()` | `score`, `quizData.questions.length` | Final Score, "Play More" Btn |
| **ERROR** | `renderError()` | `errorMessage` (string) | Error Message, "Home" Btn |

---

## 5. Transition Guards

Runtime checks that MUST pass before a state transition is committed. These guards prevent the "White Screen of Death" by ensuring data readiness.

| Transition | Guard Condition | Failure Action |
| :--- | :--- | :--- |
| `BOOT` → `CUSTOM_LOADING` | `initData.customQuiz` is valid object | Fallback to `MENU` |
| `CUSTOM_LOADING` → `CUSTOM_SPLASH` | `quizData` is valid & `!loading` | Transition to `ERROR` |
| `CUSTOM_SPLASH` → `QUIZ_ACTIVE` | `quizData.questions` is non-empty array | Transition to `ERROR` |
| `QUIZ_ACTIVE` → `NEXT_QUESTION` | `selectedAnswerIndex` is not null | Disable "Next" Button (UI Guard) |
| `QUIZ_ACTIVE` → `RESULTS` | `currentIndex` == `questions.length` | Stay in `QUIZ_ACTIVE` (Log warning) |

---

## 6. Data Ownership Diagram

```text
[Splash.tsx] (The Orchestrator)
  │
  ├─ state: mode (The FSM Pointer)
  ├─ state: loading / quizLoading (Transient UI flags)
  │
  ├─ data: customQuizMeta (Session Context)
  │      Lived for: Session
  │      Source: /api/init
  │
  ├─ data: quizData (Content Cache)
  │      Lived for: Session (once loaded)
  │      Source: /api/quizzes/:id
  │
  └─ [useInlineQuiz Hook] (The Gameplay Engine)
        │
        ├─ state: currentIndex (Ephemeral)
        ├─ state: selection (Ephemeral)
        └─ state: score (Ephemeral)
           (Reset on mount or explicit reset)
```

**Ownership Rules**:
1. **Splash.tsx** owns **Connectivity & Context**. It decides *what* valid data exists.
2. **useInlineQuiz** owns **Progression**. It assumes data is valid and handles the counter/score logic.
3. **Components (InlineQuiz)** are **Pure Renderers**. They receive data/callbacks and render. They hold NO logic state.

---

## 7. Failure & Recovery Strategy

**Constraint**: Inline frames cannot easily "toast" or "modal" errors. Errors must be inline content replacements.

1. **Context Check Fail (`/api/init`)**:
   - **Action**: Fallback to `MENU` (Safe Default).
   - **Log**: "[Splash] Context check failed, assuming default."

2. **Quiz Data Fail (`/api/quizzes`)**:
   - **Action**: Transition to `ERROR` state.
   - **UI**: Render "Quiz Unavailable" card in the NES container.
   - **Recovery**: "Go Home" button (resets to `MENU`).

3. **Runtime Data Corruption** (e.g., missing question index):
   - **Action**: Catch boundary in `InlineQuiz`.
   - **UI**: Render "Game Error" slide.
   - **Recovery**: "Finish" button (Skip to `RESULTS` with 0 score or valid partial score).

---

## 8. Explicit Non-Goals

1. **No Routing**: We will not use `react-router` or history manipulation in the inline frame.
2. **No Persistent Gameplay**: If the user leaves the viewport/refreshes, the specific question index is LOST. The app restarts at `BOOT`.
3. **No Complex Animations**: Page transitions are immediate or simple CSS opacity fades. No heavy JS animations.
4. **No Global Scroll**: The root container never scrolls. Only specific internal `<div>`s (like the option list) may explicitly scroll.
