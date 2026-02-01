# Visual System & Design Tokens

StreaxChamp uses a **strict, token-driven visual system** designed for safe composability. The system relies on "fake 3D" (pixel depth) rather than shadows/gradients to maintain the retro aesthetic without sacrificing usability.

## 1. Visual System Overview

**Core Principles:**
1.  **Readability First**: High contrast text, no low-contrast greys.
2.  **Pixel Depth**: Depth is conveyed via hard borders and offset layers, never blur.
3.  **Semantic Actions**: Colors denote *intent* (Action vs Danger), not brand.
4.  **Bounded Motion**: Motion is a micro-feedback loop, not a transition engine.

---

## 2. Design Tokens

### A. Semantic Color Roles
*Do not use hex codes directly in components. Use these semantic names.*

| Role | Token Name | Usage |
| :--- | :--- | :--- |
| **Backgrounds** | `bg.app` | Global app background (Base layer) |
| | `bg.panel` | Cards, input containers (Elevated layer) |
| | `bg.input` | Inputs, textareas (Recessed layer) |
| **Text** | `text.primary` | Headings, main body content |
| | `text.secondary` | Labels, captions, metadata |
| | `text.inverse` | Text on high-contrast buttons |
| **Accents** | `accent.primary` | Main Brand / "Next" / "Go" |
| | `accent.secondary` | "Back" / "Cancel" / "Edit" |
| | `accent.highlight` | Focus rings, selection markers |
| **Status** | `status.success` | Validated inputs, score success, "Saved" |
| | `status.warning` | Milestones, non-blocking alerts |
| | `status.error` | Validation errors, fatal blocks, "Delete" |
| **Borders** | `border.neutral` | Standard container outlines |
| | `border.light` | Divider lines |

---

### B. Elevation & Pixel-Depth Model
*Depth is achieved via border-width manipulation and pseudo-element offsets.*

| Level | Name | Visual Rule | Usage |
| :--- | :--- | :--- | :--- |
| **Z-0** | `Flat` | No border, transparent bg | The global `<FlowShell>` container background. |
| **Z-1** | `Recessed` | `border-2`, `bg-black/20` (inset feel) | Inputs (`text`), Textareas, Progress tracks. |
| **Z-2** | `Panel` | `border-2`, `shadow-hard-sm` (2px offset) | Content Cards, `<NoticeCard>`, Stat boxes. |
| **Z-3** | `Interactive` | `border-2`, `shadow-hard-md` (4px offset) | Buttons (normal state), Selectable Options. |
| **Z-4** | `Floating` | `border-4`, `shadow-hard-lg` (6px offset) | Sticky Headers, Toasts, Modals (if any). |

> **Rule**: When pressing a Z-3 button, it visually transforms to Z-2 (offset reduces), simulating a physical press.

---

### C. Typography Hierarchy
*Font Families are defined globally (Press Start 2P for headers, System Sans for body). This table defines SCALES.*

| Component | Token | Size / Weight | Usage |
| :--- | :--- | :--- | :--- |
| **H1** | `type.h1` | `text-xl` + `bold` | Main Screen Titles ("Creator Studio") |
| **H2** | `type.h2` | `text-lg` + `bold` | Section Headers, Question Topics |
| **Body** | `type.body` | `text-base` + `normal` | Question Text, Instructions |
| **Label** | `type.label` | `text-sm` + `bold` + `uppercase` | Input Labels, Button Text |
| **Caption** | `type.caption` | `text-xs` + `normal` | Helper text, "Powered by...", metadata |

---

## 3. Motion & Interaction Tokens
*Motion is strictly for feedback. Layouts never animate size.*

| Token | Rule | Usage |
| :--- | :--- | :--- |
| `motion.press` | `transform: translateY(2px)` | Active state of Buttons/Options. |
| `motion.hover` | `transform: translateY(-1px)` | Desktop hover cues (Z-2 items). |
| `motion.enter` | `opacity: 0 -> 1` (0.2s) | New screens entering view. |
| `motion.pulse` | `scale: 1 -> 1.05 -> 1` | Milestones / Success badges only. |

**Constraints:**
- Duration max: `200ms` for interactions, `300ms` for entrances.
- **NEVER** animate `height`, `width`, or `margin`. This causes layout thrashing in inline frames.
- **ALWAYS** check `prefers-reduced-motion`.

---

## 4. CTA Hierarchy & Action Language

| Priority | Visual Style | usage |
| :--- | :--- | :--- |
| **Primary** | Solid Color Flow + Thick Border | "Next", "Create", "Post", "Play" |
| **Secondary** | Outline / Transparent Bg | "Back", "Edit", "Save Draft" |
| **Destructive** | Solid Red + Thick Border | "Delete Quiz", "Reset" |

---

## 5. Feedback & Status Language

Using `<NoticeCard>` primitives:

*   **Success (Green)**: "Video saved!", "Quiz Published".
*   **Warning (Yellow)**: "3 questions remaining", "Topic too short".
*   **Error (Red)**: "Network failed", "Validation error".
*   **Milestone (Purple/Gold)**: "Streak x5!", "First Quiz Created!".

---

## 6. Devvit-Specific Safeguards

1.  **Height Locking**: All CSS tokens must account for the `box-sizing: border-box` model to prevent padding from expanding the 520px inline container.
2.  **No Scroll Chains**: "Scrollable" tokens apply ONLY to `FlowBody`. The outer shell is `overflow: hidden`.
3.  **Contrast**: Text tokens must pass WCAG AA against `bg.panel` and `bg.app`.
4.  **Touch Targets**: All interactive elements (Z-3) must have a min-height of `44px` (touch friendly).

---

## 7. Explicit Non-Goals

1.  **Theme Switching**: Does not support Light/Dark mode toggling at runtime (Force Dark/Retro theme).
2.  **Custom Keyframes**: No complex CSS keyframes beyond simple pulses.
3.  **Vector Graphics**: No SVG icon systems. Use emoji or pixel-art sprites.
