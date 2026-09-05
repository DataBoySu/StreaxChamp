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

## Legacy rules

- Do not use blocks or `@devvit/public-api`; this repository uses Devvit Web.
- Do not restore the removed in-memory leaderboard. Persistent leaderboard writes belong in the server services.
