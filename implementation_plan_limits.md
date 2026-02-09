# Implementation Plan: Dual-Layer Generation Limits

## Objective
Implement a dual-layer limitation system for AI topic generation to control costs/load while ensuring fair usage.
1. **Per-User Limit**: 1 generation per day.
2. **Global Limit**: 20 generations per day (total across all users).

## Backend Implementation (`src/server/controllers/TopicController.ts`)

We will utilize Redis to track both user-specific and global counters.

### Logic Flow
1. **Identify User**: Resolve `username` from Devvit context.
2. **Check Global Limit**:
   - Key: `limit:global:topic_gen:{YYYY-MM-DD}`
   - Constant: `CONFIG.LIMITS.GLOBAL_DAILY_CAP` (20)
   - **Condition**: If `current_global >= 20`, block request.
   - **Error**: `GLOBAL_LIMIT_REACHED` ("The global forges are overheated. Come back tomorrow.")
3. **Check User Limit**:
   - Key: `limit:user:topic_gen:{username}:{YYYY-MM-DD}`
   - Constant: `CONFIG.LIMITS.USER_DAILY_CAP` (1)
   - **Condition**: If `current_user >= 1`, block request.
   - **Error**: `USER_LIMIT_REACHED` ("You have forged your daily creation. Rest now.")
4. **Execution**: Perform generation.
5. **Increment**: Atomic increment of both keys with 24h expiry.

## Shared Constants (`src/shared/constants.ts`)

Update `CONFIG` object:
```typescript
LIMITS: {
    USER_DAILY_GEN: 1,
    GLOBAL_DAILY_GEN: 20,
}
```

## Frontend Implementation (`src/client/components/topic/TopicSelector.tsx`)

The UI needs to elegantly (being consistent with the ui design) communicate *why* generation is disabled (User Personal Limit vs. System Global Limit).

### Visual Design (UI)
We will enhance the "Search/Add" bar and the "Info Banner" to reflect the state.

**State 1: Normal**
- Input: Active
- Button: "Add" / "Go"
- Banner: "Custom topics take 1–3 minutes."

**State 2: User Limit Reached**
- Input: Disabled. Placeholder: "Daily limit reached (1/1)"
- Button: Disabled. Label: "DONE"
- Style: Opacity reduced, cursor not-allowed.
- Robot Dialogue: "You've done enough fast work today. Return tomorrow."

**State 3: Global Limit Reached (System Wide)**
- Input: Disabled. Placeholder: "Server Overload (20/20)"
- Button: Disabled. Label: "FULL"
- Banner: Changes color to a "Cooldown" theme (Blue/Ice instead of Red/Warning).
- Text: "The global forges are cooling down. New topics unlock at 00:00 UTC."

### Data Fetching
- We will add a new endpoint or piggyback on `getTopicStatus/listTopics` to return the current `global_remaining` count so we can show "15/20 generated" or similar if desired, though simple error handling is safer for now.
- **Better Approach**: The `fetchTopics` or a `checkStatus` call can return `{ globalCapReached: boolean, userCapReached: boolean }` so the UI updates *before* the user tries to type.

## Proposed Code Structure

### 1. `constants.ts`
```typescript
export const CONFIG = {
  // ...
  LIMITS: {
      USER_DAILY_GEN: 1,
      GLOBAL_DAILY_GEN: 20
  }
}
```

### 2. `TopicSelector.tsx` (Mockup)
```tsx
const [status, setStatus] = useState<'allowed' | 'user_capped' | 'global_capped'>('allowed');

// Check status on mount
useEffect(() => {
  fetch('/api/status/generation').then(data => {
    if (data.global >= 20) setStatus('global_capped');
    else if (data.user >= 1) setStatus('user_capped');
  });
}, []);

// Render
<input 
  disabled={status !== 'allowed'}
  placeholder={
    status === 'global_capped' ? "Global Limit Reached (20/20)" :
    status === 'user_capped' ? "You reached your daily limit (1/1)" :
    "Search or add topics..."
  }
/>
```
