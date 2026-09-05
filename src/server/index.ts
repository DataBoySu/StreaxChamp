import 'dotenv/config';
import express from 'express';
import { createServer, getServerPort } from '@devvit/web/server';
import { requestLogger } from './middleware/requestLogger';
import { apiRouter } from './routes/api';
import { internalRouter } from './routes/internal';
import { hydrateGeminiKeyFromSettings } from './services/GeminiService';

// Note: Menu items & Post configurations are handled via devvit.json
// pointing to /internal/ routes mounted below.

// Try to load secrets from Devvit settings at startup (non-blocking)
void hydrateGeminiKeyFromSettings();
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
