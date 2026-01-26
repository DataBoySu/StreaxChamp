# (˶ᵔ ᵕ ᵔ˶) StreaxChamp (˶ᵔ ᵕ ᵔ˶)

> **✨ The ultimate AI-powered trivia experience on Reddit! ✨**

StreaxChamp is a high-performance, immersive quiz application built on the [Reddit Developer Platform (Devvit)](https://developers.reddit.com/). It leverages **Google Gemini AI** to generate infinite, factually accurate, and challenging trivia across any topic imaginable. 

---

## (ฅ•ω•ฅ) Key Features

- **Infinite AI Quizzes** 🧠: Powered by `Gemini` for rapid, diverse trivia generation.
- **Dynamic Mascot** 🤖: An interactive robot companion with AI-driven banter and state-aware animations.
- **Topic Marketplace** 🛒: Browse "Hot Topics" or generate your own custom trivia field in seconds.
- **Leaderboards** 🏆: Competitive ranking system persisted via Firestore REST.
- **Premium UI** 💅: Sleek, dark-mode first design with glassmorphism and smooth Framer Motion transitions.

---

## (๑ > ᴗ < ๑) Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React, Vite, Framer Motion, Vanilla CSS |
| **Backend** | Devvit (Server Context), Express, Vite SSR |
| **AI Engine** | Google Gemini (Content & Creative pipelines) |
| **Database** | Firestore (REST API), Firebase Data Connect |
| **Tools** | TypeScript, Concurrently, Lucide React |

---

## (づ｡◕‿‿◕｡)づ Project Architecture

<details>
<summary>Click to see the magic inside! 🪄</summary>

### 🏗️ Directory Breakdown

- **`src/client/`**: The React-based webView. Handles the game loop, animations, and mascot interactions.
- **`src/server/`**: The Devvit server layer. Manages gRPC/HTTP transitions, AI circuit breaking, and Firestore integration.
- **`src/shared/`**: Unified types and constants used across the entire stack.
- **`scripts/`**: Automation for seeding topics and testing AI endpoints.

</details>

StreaxChamp/
├── AGENTS.md                               # Documentation for AI agent logic and personas.
├── README.md                               # Main project documentation and overview.
├── package.json                            # Project dependencies and script definitions.
├── tsconfig.json                           # TypeScript compiler configuration.
├── vite.config.ts                          # Root Vite configuration for the monorepo build.
├── dataconnect/                            # Firebase Data Connect configuration and schemas.
│   ├── dataconnect.yaml                    # Main Data Connect configuration file.
│   ├── schema/
│   │   └── schema.gql                      # GraphQL database schema definition.
│   └── example/                            # Example GraphQL operations for reference.
├── scripts/                                # Utility scripts for maintenance and testing.
│   ├── seedTopics.ts                       # Script to populate initial topics in Firestore.
│   ├── testGemini.ts                       # Test script for Gemini AI trivia generation.
│   ├── checkTopics.ts                      # Utility to verify topic integrity in the DB.
│   └── serve-and-run-server.js             # Automation for starting the dev environment.
├── src/                                    # Main source code directory.
│   ├── client/                             # Frontend React application for Devvit WebView.
│   │   ├── App.tsx                         # Root component: UI orchestration and game state.
│   │   ├── main.tsx                        # React entry point and DOM mounting.
│   │   ├── index.css                       # Global styles, layout, and design system tokens.
│   │   ├── components/                     # UI Component library.
│   │   │   ├── dashboard/                  # Dashboard-related UI components.
│   │   │   │   ├── GameSidebar.tsx         # Player history and topic-specific leaderboards.
│   │   │   │   └── GlobalDashboard.tsx     # Global ranking and hot topic lists.
│   │   │   ├── landing/                    # Initial views shown before the quiz starts.
│   │   │   │   └── LandingHero.tsx         # Hero section with mascot and start controls.
│   │   │   ├── modals/                     # Interface overlays for user input.
│   │   │   │   ├── AuthModal.tsx           # Reddit username and nickname capture.
│   │   │   │   └── NoTopicPrompt.tsx       # Fallback prompt for starting a quiz.
│   │   │   ├── quiz/                       # Game loop and active gameplay views.
│   │   │   │   ├── QuizActiveView.tsx      # Display for active questions and options.
│   │   │   │   ├── QuizResult.tsx          # Post-game score summary and celebration.
│   │   │   │   ├── GapView.tsx             # Loading state and streak feedback between questions.
│   │   │   │   └── BonusQuestionView.tsx   # Special UI for the score-doubling bonus question.
│   │   │   ├── topic/                      # Topic discovery and selection interface.
│   │   │   │   ├── TopicSelector.tsx       # Full-screen grid for browsing and searching topics.
│   │   │   │   └── TopicButton.tsx         # Stylized card for individual quiz topics.
│   │   │   ├── ui/                         # Lower-level shared UI elements.
│   │   │   │   ├── MessageDisplay.tsx      # Toast-like feedback for correct/incorrect answers.
│   │   │   │   ├── LoadingDots.tsx         # Minimalist animated loading indicator.
│   │   │   │   └── index.tsx               # Export barrel for basic UI components.
│   │   │   └── InteractiveRobot.tsx        # SVG Mascot with eye-tracking and speech state.
│   │   ├── hooks/                          # Custom React hooks for business logic.
│   │   │   ├── useQuizData.ts              # Logic for question management and scoring.
│   │   │   ├── useLeaderboard.ts           # Real-time polling and submission of high scores.
│   │   │   ├── useTopics.ts                # Fetching and filtering the topic marketplace.
│   │   │   └── useTheme.ts                 # Global theme switching and persistence.
│   │   ├── services/                       # Client-side API and Firebase logic.
│   │   │   ├── FirebaseQuizService.ts      # REST bridge for Firestore quiz data.
│   │   │   └── TopicApi.ts                 # Backend communication for topic generation.
│   │   └── utils/                          # Frontend helper functions.
│   │       └── getMultiplierText.ts        # Logic for mapping streaks to descriptive labels.
│   ├── server/                             # Backend services (Devvit Server Context).
│   │   ├── index.ts                        # Main entry point for the Devvit backend.
│   │   ├── controllers/                    # Request handlers for various API domains.
│   │   │   ├── QuizController.ts           # Handling quiz fetching and validation.
│   │   │   ├── TopicController.ts          # Management of topic generation requests.
│   │   │   └── UserController.ts           # User session and profile resolution.
│   │   ├── services/                       # Core backend business logic.
│   │   │   ├── GeminiService.ts            # Integration with Google Gemini for AI content.
│   │   │   ├── BrowserlessService.ts       # Web scraping layer for real-world topic research.
│   │   │   └── FirestoreRestService.ts     # Low-level gRPC-to-REST bridge for Firestore.
│   │   └── routes/                         # API route definitions.
│   │       └── api.ts                      # Express-like routing for WebView API calls.
│   └── shared/                             # Common code shared between client and server.
│       ├── constants.ts                    # Global configuration and magic numbers.
│       ├── index.ts                        # Central export point for shared logic.
│       └── types/
│           └── index.ts                    # Unified TS interfaces for quiz and user data.
└── tailwind.config.js                      # Design token and utility class configuration.
```

---

## (˶ᵔ ᵕ ᵔ˶) Getting Started

> [!IMPORTANT]
> Ensure you have **Node 22** and the **Devvit CLI** installed! (˶˃ ᵕ ˂˶)

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/your-repo/streax-champ.git
cd StreaxChamp

# Install dependencies
npm install
```

### 2. Environment Setup
Create a `.env` file in the root with:
```env
GEMINI_API_KEY=your_key_here
FIRESTORE_PROJECT_ID=your_project_id
```

### 3. Local Development
```bash
# Starts client, server, and Devvit playtest concurrently
npm run dev
```

---

## (๑ > ᴗ < ๑) Available Commands

- `npm run dev` — Launch playtest with live hotswap.
- `npm run build` — Optimized production build.
- `npm run deploy` — Push to Reddit's staging/production servers.
- `npm run check` — Linting and type checking.

---

## (˶˃ ᵕ ˂˶) Developer Notes

> [!WARNING]
> This project uses an gRPC-over-REST bridge for Firestore. Ensure your project ID matches the one in your Google Cloud Console. 

> [!NOTE]
> Custom topics take ~1-3 minutes to generate and verify via AI before they appear in the "Ready" state. Be patient! (˶ᵔ ᵕ ᵔ˶)

---

## (ฅ•ω•ฅ) License
See [License](LICENSE.md) for more information.

---
<p align="center">
Made with ❤️ for the Reddit Developer Community (˶˃ ᵕ ˂˶)
</p>
