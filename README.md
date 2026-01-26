# (˶ᵔ ᵕ ᵔ˶) StreaxChamp (˶ᵔ ᵕ ᵔ˶)

> **✨ The ultimate AI-powered trivia experience on Reddit! ✨**

StreaxChamp is a high-performance, immersive quiz application built on the [Reddit Developer Platform (Devvit)](https://developers.reddit.com/). It leverages **Google Gemini AI** to generate infinite, factually accurate, and challenging trivia across any topic imaginable. 

---

## (ฅ•ω•ฅ) Key Features

- **Infinite AI Quizzes** 🧠: Powered by `gemini` for rapid, diverse trivia generation.
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

### (˶˃ ᵕ ˂˶) Project Structure
```text
StreaxChamp/
├── .env                          # Configuration for environment variables (API keys, project IDs)
├── AGENTS.md                     # Documentation for AI agent interactions and roles
├── README.md                     # Project overview, setup instructions, and documentation
├── dataconnect/                  # Firebase Data Connect configuration and schema definitions
│   ├── dataconnect.yaml          # Main configuration file for Firebase Data Connect
│   └── schema/                   # GraphQL schema definitions for the database
├── scripts/                      # Utility scripts for maintenance, seeding, and testing
│   ├── seedTopics.ts             # Script to populate initial topics in the database
│   ├── testGemini.ts             # Integration test for Gemini AI service
│   └── serve-and-run-server.js   # Script to start both the dev server and backend services
├── src/                          # Main source code directory
│   ├── client/                   # Frontend React application code
│   │   ├── App.tsx               # Main application component and routing logic
│   │   ├── index.css             # Global styles and Tailwind CSS imports
│   │   ├── main.tsx              # React entry point, renders the App component
│   │   ├── components/           # Reusable UI components
│   │   │   ├── AnimatedWelcomeBox.tsx  # Interactive welcome panel on landing
│   │   │   ├── InteractiveRobot.tsx    # Robot avatar with dynamic animations and states
│   │   │   ├── HotTopics.tsx           # Dashboard view for trending quiz topics
│   │   │   └── QuizAdminPanel.tsx      # Internal tool for managing and force-generating quizzes
│   │   ├── hooks/                # Custom React hooks for business logic
│   │   │   ├── useQuizData.ts    # Manages quiz state, timers, and answer submission
│   │   │   ├── useLeaderboard.ts # Fetches and updates competitive ranking data
│   │   │   └── useTheme.ts       # Handles dark/light mode toggles and persistent styling
│   │   └── services/             # Client-side API and Firebase client wrappers
│   ├── server/                   # Backend services (Node.js/Vite environment)
│   │   ├── index.ts              # Server entry point handling core initialization
│   │   ├── controllers/          # Request handlers for various application domains
│   │   │   ├── QuizController.ts # Logic for quiz generation and validation
│   │   │   └── TopicController.ts# Manages topic scraping and curation flow
│   │   └── services/             # Core backend business logic and integrations
│   │       ├── GeminiService.ts  # Interface for Google Gemini AI (quiz/topic generation)
│   │       └── BrowserlessService.ts # Manages headless browser instances for web scraping
│   ├── shared/                   # Shared code used by both client and server
│   │   ├── constants.ts          # Unified configuration constants and magic numbers
│   │   └── types/                # TypeScript interfaces and types for data consistency
│   └── dataconnect-generated/    # Auto-generated SDK for Firebase Data Connect
├── tailwind.config.js            # Configuration for Tailwind CSS utility framework
├── tsconfig.json                 # Project-wide TypeScript compiler configuration
└── vite.config.ts                # Build tool configuration for the frontend and server
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


> [!INFO]
> Custom topics take ~1-3 minutes to generate and verify via AI before they appear in the "Ready" state. Be patient! (˶ᵔ ᵕ ᵔ˶)

---

## (ฅ•ω•ฅ) License
See [License](LICENSE.md) for more information.

---
<p align="center">Made with ❤️ for the Reddit Developer Community (˶˃ ᵕ ˂˶)</p>
