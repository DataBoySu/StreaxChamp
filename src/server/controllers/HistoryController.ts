import { Request, Response } from 'express';
import { FirestoreRestService } from '../services/FirestoreRestService';
import { Logger } from '../Logger';

interface PlayHistoryEntry {
    username: string;
    nickname: string;
    topicSlug: string;
    topicTitle: string;
    timestamp: number;
    quizDate: string;
}

/**
 * Controller for managing play history
 */
export class HistoryController {
    /**
     * Save a play history record
     */
    static async savePlay(req: Request, res: Response) {
        try {
            const { username, nickname, topicSlug, topicTitle, quizDate } = req.body;

            if (!username || !topicSlug || !topicTitle) {
                return res.status(400).json({ ok: false, error: 'Missing required fields' });
            }

            const fs = new FirestoreRestService();
            const entry: PlayHistoryEntry = {
                username,
                nickname: nickname || username,
                topicSlug,
                topicTitle,
                timestamp: Date.now(),
                quizDate: quizDate || new Date().toISOString().split('T')[0]
            };

            await fs.savePlayHistory(entry);
            res.json({ ok: true });
        } catch (e) {
            Logger.error('[History] Save error', e);
            res.status(500).json({ ok: false, error: 'Failed to save play history' });
        }
    }

    /**
     * Get global play history (latest 15)
     */
    static async getGlobalHistory(_req: Request, res: Response) {
        try {
            const fs = new FirestoreRestService();
            const history = await fs.getGlobalPlayHistory(15);
            res.json({ ok: true, history });
        } catch (e) {
            Logger.error('[History] Fetch error', e);
            res.status(500).json({ ok: false, error: 'Failed to fetch history' });
        }
    }
}
