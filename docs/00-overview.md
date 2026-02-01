# StreaxChamp Documentation Overview

Welcome to the StreaxChamp project documentation. StreaxChamp is a Reddit Devvit application that allows users to create and play AI-powered quizzes.

## 🚀 Orientation

This project operates under strict environment constraints, specifically the **Reddit Devvit WebView**. Developers must be aware of the differences between "Inline" and "Expanded" modes, as they dictate layout and state management strategies.

## 🛠️ Why Devvit constraints matter

- **Inline Mode**: Runs inside the Reddit feed with a fixed height and no global scrolling. Layout regressions here can break the user experience and create visual artifacts (black gaps or cut-off content).
- **Expanded Mode**: An immersive view where the app has more screen real estate, but still operates within a sandboxed environment.

## 📚 Documentation Structure

The documentation is structured to guide you from high-level orientation to technical implementation details:

1.  **[00-overview.md](00-overview.md)**: You are here.
2.  **[01-devvit-inline-learnings.md](01-devvit-inline-learnings.md)**: Mandatory reading for anyone touching the Inline UI.
3.  **[02-inline-state-machine.md](02-inline-state-machine.md)**: The technical "constitution" for interaction and data flow.
4.  **[03-flow-ui-primitives.md](03-flow-ui-primitives.md)**: Guide to the shared UI components used across the app's flows.
5.  **[04-visual-system.md](04-visual-system.md)**: The single source of truth for colors, depth, and typography.
6.  **[05-creator-flow.md](05-creator-flow.md)**: Documentation of the narrative and technical flow for quiz creators.

## 🏁 Read These First

If you are new to the project, start with **[01-devvit-inline-learnings.md](01-devvit-inline-learnings.md)**. It contains hard-won knowledge about layout stability in Devvit that will prevent common bugs.
