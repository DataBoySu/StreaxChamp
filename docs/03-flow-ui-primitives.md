# Flow UI Primitives

To maintain consistency across the app's various flows (Creator Studio, Quiz Editor, Results, etc.), StreaxChamp uses a set of shared structural primitives. These components encapsulate the layout and navigation logic while remaining agnostic of the specific business logic.

## 1. FlowShell

The root structural wrapper for every screen in the "Flow" system.

- **Responsibility**: Defines the outer boundaries, padding, and flex orientation of the screen.
- **What it must NOT do**: Handle state or networking.
- **Where it is used**: `CreatorDashboard`, `CreateQuizView`, `ResultsView`.

## 2. FlowHeader

The standardized header for all creator and player screens.

- **Responsibility**: Displays the title, optional back button, and optional step progression dots.
- **What it must NOT do**: Perform complex logic; it only triggers a provided `onBack` callback.
- **Where it is used**: Top of all `FlowShell` screens.

## 3. FlowBody

The primary content area for each screen.

- **Responsibility**: Manages the scrolling boundary (`overflow-y-auto`) and provides consistent inner padding.
- **What it must NOT do**: Define the specific UI elements (cards, inputs, etc.) inside it.
- **Where it is used**: Middle section of all `FlowShell` screens.

## 4. FlowFooter

The fixed action bar at the bottom of the screen.

- **Responsibility**: Hosts primary and secondary actions (buttons). Ensures consistent vertical stacking on mobile and side-by-side on desktop.
- **What it must NOT do**: Decide which button is "Primary"; the parent component passes the action config.
- **Where it is used**: Bottom of all `FlowShell` screens.

## 5. NoticeCard

A semantic container for alerts, milestones, and feedback.

- **Responsibility**: Communicates status (Success, Error, Milestone) using color and icons.
- **What it must NOT do**: Trigger side effects (like data deletion).
- **Where it is used**: Inside `FlowBody` for validation errors or achievement celebrations.

## 6. QuizEditorPanel

A specialized primitive for editing question content.

- **Responsibility**: Renders the question text area, 4-option grid, and correct-answer selection logic.
- **What it must NOT do**: Handle "Next" or "Back" navigation.
- **Where it is used**: Inside the `CreateQuizView` editor steps.
