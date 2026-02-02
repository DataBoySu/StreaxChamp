# Reddit Devvit Web View Knowledge Base (LLM-Optimized)

This repository contains comprehensive information, patterns, and code examples for building **Devvit Web Views** using the modern **Client/Server architecture**.

---

## 1. Core Architecture Overview
Devvit Web Views follow a **Client/Server** model.
- **Client (Frontend)**: Standard web technologies (HTML/JS/CSS/React). Runs in the Reddit app/browser.
- **Server (Backend)**: Fast, serverless Node.js environment. Handles secrets, database access (Redis), and Reddit API calls.
- **Communication**: Seamless HTTP `fetch` between client and server.

### Key Packages
- `@devvit/web/client`: For UI effects (toasts, navigation) inside the web view.
- `@devvit/web/server`: For server-side logic and Reddit services.

---

## 2. Project Structure
A standard Devvit Web app is organized as follows:
```text
├── devvit.json          # App manifest and configuration
├── src
│   ├── client           # Frontend assets (index.html, styles, scripts)
│   └── server           # Backend logic (index.ts)
└── package.json         # Dependencies
```

### Configuration (`devvit.json`)
The `devvit.json` file links your frontend and backend.
```json
{
  "name": "my-devvit-app",
  "post": {
    "dir": "public", 
    "entrypoints": {
      "default": {
        "entry": "index.html",
        "height": "tall"
      }
    }
  },
  "server": {
    "entry": "src/server/index.ts"
  }
}
```

---

## 3. Server-Side Fundamentals (`src/server/index.ts`)
The server uses an Express-like interface to handle requests from the client.

### Basic Server Setup
```typescript
import { createServer, context, getServerPort, redis, reddit } from '@devvit/web/server';
import express from 'express';

const app = express();
const router = express.Router();

// Middleware is pre-configured to handle authentication
router.get('/api/user-data', async (req, res) => {
  const { userId, subredditName } = context; // Automatically injected
  
  // Example: Fetch from Redis
  const score = await redis.get(`score:${userId}`) || 0;
  
  res.json({
    username: (await reddit.getUserById(userId)).username,
    score,
    subreddit: subredditName
  });
});

app.use(router);
const server = createServer(app);
server.listen(getServerPort());
```

---

## 4. Client-Side Fundamentals (`src/client/`)
The client can make standard `fetch` calls to the server and use special Devvit effects.

### Communication (Fetch)
```javascript
// Calling the server endpoint defined above
async function loadData() {
  const response = await fetch('/api/user-data');
  const data = await response.json();
  console.log('User data:', data);
}
```

### Devvit Client Effects
Import from `@devvit/web/client` to interact with the Reddit native UI.
```javascript
import { showToast, navigateTo } from '@devvit/web/client';

// Show a success message
showToast('Level up!');

// Navigate to another subreddit
navigateTo('https://www.reddit.com/r/devvit');
```

---

## 5. Persistence with Redis
Redis is the primary storage for Devvit apps. Access it via the server `context`.

### Patterns
```typescript
// Set data
await redis.set('key', 'value');

// Get data
const val = await redis.get('key');

// Atomic increments (Great for scores)
await redis.incrBy('user:score', 10);
```

---

## 6. Security and Restrictions
- **No External Fetch in Client**: The client (frontend) **cannot** call external APIs directly due to CSP. All external requests must be proxied through your `server`.
- **Server Execution**: Max timeout is **30 seconds**.
- **Payload Limits**: 4MB for requests, 10MB for responses.
- **Authentication**: `context.userId` is automatically populated and verified by Reddit; you don't need to implement your own session management for Reddit-specific actions.

---

## 7. LLM Implementation Patterns

### Pattern: Proxied External API Call
Use this pattern when you need to fetch data from an external service (e.g., OpenAI, a game server).

**Server (`src/server/index.ts`):**
```typescript
router.get('/api/external-data', async (req, res) => {
  const externalResponse = await fetch('https://api.example.com/data');
  const data = await externalResponse.json();
  res.json(data);
});
```

**Client (`src/client/index.js`):**
```javascript
const response = await fetch('/api/external-data');
const data = await response.json();
```

### Pattern: State Management
Use Redis on the server to maintain state across user sessions.

**Server:**
```typescript
router.post('/api/save-state', async (req, res) => {
  const { userId } = context;
  const state = req.body;
  await redis.set(`state:${userId}`, JSON.stringify(state));
  res.sendStatus(200);
});
```

---

## 8. Common Hooks and Variables (Server Context)
| Property | Description |
| :--- | :--- |
| `context.userId` | The ID of the current user. |
| `context.postId` | The ID of the post the web view is running on. |
| `context.subredditName` | The name of the subreddit. |
| `redis` | Access to key-value storage. |
| `reddit` | Access to Reddit API (get users, posts, etc.). |
| `scheduler` | Schedule background tasks. |
