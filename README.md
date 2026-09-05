# StreaxChamp

StreaxChamp is a Reddit-native trivia game built with Devvit Web. Players can take a daily quiz, explore community topics, create quizzes, and compete on persistent leaderboards from Reddit's inline and expanded post views.

![StreaxChamp poster](src/client/public/assets/poster.png)

## Features

- Daily five-question trivia with streaks, timers, XP, and rankings
- AI-generated topic quizzes powered by Google Gemini
- Player-created quizzes with a moderator post flow
- Inline feed play and a full expanded game view
- Persistent daily, topic, and creator leaderboards
- Reddit comments for score sharing
- Light and dark themes, music, animation, and responsive layouts

Scores and player identity are verified by the server. The client submits answer indexes, the server loads the canonical quiz, calculates the score, and uses the authenticated Reddit username for persistence. Daily leaderboard writes use one entry per user and quiz to reject replay submissions.

## Architecture

- **Client:** React 19, TypeScript, Tailwind CSS 4, Vite
- **Server:** Express 5 in the Devvit serverless runtime
- **API:** REST endpoints consumed with `fetch`
- **Platform:** `@devvit/web` for Reddit context, Redis, comments, subscriptions, menus, and scheduled jobs
- **Persistence:** Firestore for quizzes, profiles, history, and leaderboards; Redis for post mappings and platform state
- **AI:** Google Gemini
- **Validation and tests:** Zod, Vitest, and `@devvit/test`

The two-stage WebView is configured in `devvit.json`:

- `src/client/splash.tsx` renders the inline feed experience.
- `src/client/game.tsx` renders the expanded application.
- `src/server/index.ts` starts the Express server.
- `src/server/routes/api.ts` mounts public and internal routes.

## Local development

Requirements:

- Node.js 22 or newer
- npm
- A Reddit developer account with Devvit access
- A Firebase project
- A Google Gemini API key for quiz generation

Install dependencies and sign in:

```bash
npm install
npm run login
```

Create a `.env` file for local builds:

```dotenv
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_API_KEY=your-web-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your-sender-id
FIREBASE_APP_ID=your-app-id
GEMINI_API_KEY=your-local-gemini-key
```

Set the production Gemini secret through Devvit:

```bash
npx devvit settings set gemini-api-key
```

Run the Reddit playtest environment:

```bash
npm run dev
```

The playtest subreddit is configured as `r/streax_champ_dev` in `devvit.json`.

## Quality checks

```bash
npm run check
```

The release gate runs TypeScript compilation, ESLint, Vitest, and production client/server builds. Individual commands are also available:

```bash
npm run type-check
npm run lint
npm test
npm run build
```

Run a focused test with `npm test -- <file-name>`.

## Deployment

```bash
npm run deploy
npm run launch
```

`deploy` builds and uploads the app. `launch` builds, uploads, and publishes it. Confirm the target subreddit, Devvit account, Firestore rules, and configured Gemini secret before publishing.

## Project documentation

- [Project overview](docs/00-overview.md)
- [Devvit inline layout notes](docs/01-devvit-inline-learnings.md)
- [Inline state machine](docs/02-inline-state-machine.md)
- [UI primitives](docs/03-flow-ui-primitives.md)
- [Visual system](docs/04-visual-system.md)
- [Creator flow](docs/05-creator-flow.md)
- [Architecture](ARCHITECTURE.md)

## License

BSD-3-Clause
