# StreaxChamp: LLM-Optimized Agent Guide
https://developers.reddit.com/docs/llms.txt

## Tech Stack
- **Frontend**: React 19, Tailwind 4 (@theme), Vite
- **Backend**: Devvit Node.js, Hono, tRPC v11
- **Testing**: Vitest + `@devvit/test` (in-memory server mocks)

## Hard Constraints
- **Client CSP**: No external `fetch` in WebView. Proxy external APIs (Gemini/Firestore) via Server.
- **Interaction**: `navigateTo` and `requestExpandedMode` **require** `e.nativeEvent` from an `onClick`.
- **Limits**: 30s timeout | 4MB Req / 10MB Res | 24h Redis TTL default.
- **v4 Architecture**: "Splash" is an active HTML Inline View (`splash.tsx`), not a static image.
- **Blocks**: Never use `@devvit/public-api` for UI. Full WebView only.

## Architecture Map
- `/src/server`: Backend. Access `redis`, `reddit`, `context`.
- `/src/client`: Frontend. Access `navigation`, `realtime`.
- `devvit.json`: Defines routes and `splash` vs `game` entrypoints.

## Patterns

### 1. Mode Transition (Inline ➔ Game)
```typescript
import { requestExpandedMode } from '@devvit/web/client';
const launch = (e: React.MouseEvent) => requestExpandedMode(e.nativeEvent, 'game');
```

### 2. Navigation
```typescript
import { navigateTo } from '@devvit/web/client';
navigateTo('https://url.com'); // External/Internal
```

### 3. Realtime (WebSockets Proxy)
```typescript
// Client: Subscribe
import { connectRealtime } from '@devvit/web/client';
await connectRealtime({ channel: 'ch1', onMessage: (msg) => {} });

// Server: Broadcast
import { realtime } from '@devvit/web/server';
await realtime.send('ch1', { data: 1 });
```

### 4. Community Growth (Join)
- **Required**: `devvit.json` ➔ `reddit` ➔ `SUBSCRIBE_TO_SUBREDDIT` (`asUser`).
- **Logic**: `await reddit.subscribeToCurrentSubreddit();` (Server-side).

### 5. Persistence
```typescript
await redis.set('k', 'v');
await redis.incrBy('score', 1);
```

### 6. Testing
```typescript
import { test } from '../test'; // src/server/test.ts
test('Mocked server', async () => {
  await redis.set('k', 'v');
  expect(await redis.get('k')).toBe('v');
});
```
