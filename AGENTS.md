@C:\Users\SystemSu\.codex\RTK.md

You are writing a Devvit Web application that runs on Reddit.com. Use the Devvit MCP when configured or consult https://developers.reddit.com/docs/llms.txt.

## Tech stack

- Frontend: React 19, TypeScript, Tailwind CSS 4, Vite
- Backend: Express 5 in the Devvit Node.js serverless runtime
- Communication: REST endpoints called with `fetch`
- Persistence: Firestore and Devvit Redis
- Testing: Vitest and `@devvit/test`

## Layout and architecture

- `src/client`: browser WebView code.
  - `splash.tsx`: inline feed entry point.
  - `game.tsx`: expanded-view entry point.
  - `App.tsx`: main expanded application.
  - Access navigation and client UI utilities through `@devvit/web/client`.
- `src/server`: secure serverless code.
  - `index.ts`: Express server entry point.
  - `routes/api.ts`: REST and internal route registration.
  - `controllers`: request handling and authorization.
  - `services`: Firestore, Redis, Reddit, AI, and leaderboard integrations.
  - Access `redis`, `reddit`, `context`, and `settings` through `@devvit/web/server`.
- `src/shared`: types, schemas, and constants shared between client and server.

Do not introduce Hono or tRPC unless the repository is deliberately migrated as a separate project-wide change. The current production path is Express and REST.

## Platform integration

Menu items, settings, permissions, scheduled tasks, and WebView entry points are declared in `devvit.json`. Internal menu and scheduler endpoints are mounted under `/internal`.

The application uses two WebViews:

1. `splash.tsx` is the inline feed experience configured as `default`.
2. `game.tsx` is the expanded experience configured as `game`.

Use `requestExpandedMode` to move from inline to expanded view.

## Security boundaries

- Never accept a username, user ID, score, completion state, or ownership claim from the client as authoritative.
- Resolve identity with the Reddit server API.
- Calculate scores from canonical server-side quiz data and submitted answer indexes.
- Validate request bodies at the route or controller boundary.
- Keep secrets in Devvit settings or local environment files; never expose them to the client bundle.
- Treat post context and Redis post-to-quiz mappings as server-owned authorization data.

## Current submission architecture

- `src/server/core/scoreSubmission.ts` owns the strict Zod schemas for quiz submissions and share requests, plus canonical score calculation.
- Quiz clients submit `quizId`, exactly five answer indexes, elapsed time, and an optional Reddit post ID. They do not submit a trusted score or identity.
- `QuizController.submitDailyScore` loads the canonical daily quiz, calculates the score, and writes the authenticated Reddit username.
- `LeaderboardController.submitScore` handles persistent topic and custom-post leaderboards. Topic submissions must match the topic's active quiz. Custom-post submissions must match both `context.postId` and the Redis post-to-quiz mapping.
- `FirestoreRestService.saveQuizLeaderboardEntry` creates a deterministic per-user document atomically. HTTP 409 means the daily attempt is a replay; other failed writes must surface as errors.
- `/api/share/comment` validates the request, requires matching post context, calls `reddit.submitComment`, and only then records the shared state.
- User quiz creation and posting resolve the creator through Reddit. Posting also verifies that the stored quiz belongs to the current user.

Do not restore the removed client-supplied score, username query/header fallbacks, legacy history write route, or generic leaderboard submission route.

## Development

- Run `npm run type-check` after changes.
- Run `npm run lint` for static checks.
- Run `npm test -- <file-name>` for focused tests.
- Run `npm run check` before committing or deploying.

## Code style

- Prefer type aliases over interfaces in new TypeScript code.
- Prefer named exports over default exports.
- Do not use TypeScript casts to bypass type checking.
- Handle every promise by awaiting it, returning it, attaching rejection handling, or explicitly marking intentional fire-and-forget work with `void`.

## Testing

Use the initialized `@devvit/test` harness in `src/server/test.ts` for server tests. Each test receives isolated in-memory Devvit capabilities. Mock the Reddit API only when the harness reports that a Reddit call requires it.

The security regression suite currently covers:

- canonical scoring from numeric and text answer formats;
- rejection of client-supplied scores and invalid answer arrays;
- share-text limits;
- atomic Firestore leaderboard creation, replay conflicts, and failed-write propagation.

`npm run check` is non-mutating and runs type checking, ESLint, all Vitest tests, and both production builds.

## Dependencies and release baseline

- Keep `@devvit/web`, `devvit`, and `@devvit/test` aligned on version `0.13.11`.
- Devvit 0.14 is a separate project-wide migration. Do not mix that upgrade into feature or maintenance work.
- Gemini's production API key is declared as the secret `gemini-api-key` in `devvit.json` and read through `settings` from `@devvit/web/server`.
- The repository release version is `0.1.0`.
- Before publishing, run `npm run check`, confirm the Devvit account and target subreddit, verify production Firestore rules, and confirm the Gemini secret is configured.

## Legacy rules

- Do not use blocks or `@devvit/public-api`; this repository uses Devvit Web.
- Do not restore the removed in-memory leaderboard. Persistent leaderboard writes belong in the server services.
