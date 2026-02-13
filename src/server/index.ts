import 'dotenv/config';
import { Devvit, SettingScope } from '@devvit/public-api';
import express from 'express';
import { createServer, getServerPort } from '@devvit/server';
import { requestLogger } from './middleware/requestLogger';
import { apiRouter } from './routes/api';
import { internalRouter } from './routes/internal';
import { hydrateGeminiKeyFromSettings } from './services/GeminiService';

// App-level secret for Gemini key; configured via Devvit settings
Devvit.addSettings({
    type: 'string',
    name: 'gemini-api-key',
    label: 'Gemini API Key',
    scope: SettingScope.App,
    isSecret: true,
});

// Note: Menu items & Post configurations are handled via devvit.json
// pointing to /internal/ routes mounted below.

// Register Scheduler
import { handleDailyGeneration, handleLeaderboardSync, JOB_GENERATE_DAILY, JOB_SYNC_LEADERBOARD } from './jobs/DailyScheduler';

Devvit.addSchedulerJob({
    name: JOB_GENERATE_DAILY,
    onRun: handleDailyGeneration,
});

Devvit.addSchedulerJob({
    name: JOB_SYNC_LEADERBOARD,
    onRun: handleLeaderboardSync,
});

// Try to load secrets from Devvit settings at startup (non-blocking)
hydrateGeminiKeyFromSettings();
// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(requestLogger);

// Mount API Routes
app.use('/api', apiRouter);

// Mount Internal Routes (Menu Actions, Triggers)
app.use('/internal', internalRouter);

// 404 Handler
app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

const server = createServer(app);
const port = getServerPort();
server.listen(port, () => {
    // Server started - no logging needed in Devvit context
});
