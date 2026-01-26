import { Request, Response } from 'express';
import { CONFIG } from '../../shared/constants';
import { Logger } from '../Logger';
import { FirestoreRestService } from '../services/FirestoreRestService';
import { validateGeminiKey, attemptHealing as attemptAiHealing, generateRobotLines } from '../services/GeminiService';

export class RobotController {
    static async getDialogues(req: Request, res: Response) {
        try {
            await validateGeminiKey();
            const today = new Date().toISOString().slice(0, 10);

            // 1. DB Circuit & Healing
            if (FirestoreRestService.dbCircuitOpen) {
                const status = await FirestoreRestService.attemptHealing();
                if (!status.healed && status.final) {
                    return res.json({ ok: true, date: today, lines: CONFIG.ROBOT.FALLBACK_BANTER.PERMANENTLY_DOWN });
                }
                if (!status.healed) {
                    return res.json({ ok: true, date: today, lines: CONFIG.ROBOT.FALLBACK_BANTER.DB_OFFLINE });
                }
                Logger.info('[CircuitBreaker] DB Healed! Resuming normal robot operations.');
            }

            // 2. AI Circuit & Healing
            const aiStatus = await attemptAiHealing();
            if (!aiStatus.healed) {
                if (aiStatus.final) {
                    return res.json({ ok: true, date: today, lines: CONFIG.ROBOT.FALLBACK_BANTER.AI_OFFLINE });
                }
                // If not final (just cooling down), treat open circuit as offline
                return res.json({ ok: true, date: today, lines: CONFIG.ROBOT.FALLBACK_BANTER.AI_OFFLINE });
            }

            // 3. Normal Operation: Fetch from DB or Generate
            const fs = new FirestoreRestService();
            const existing = await fs.getRobotDialogues(today);
            if (existing) {
                return res.json({ ok: true, date: today, lines: existing });
            }

            // Generate
            Logger.ai('[Robot] Generating fresh lines for today...');
            const lines = await generateRobotLines();
            if (lines && lines.length > 0) {
                await fs.saveRobotDialogues(today, lines);
                return res.json({ ok: true, date: today, lines });
            }

            // Fallback if empty array returned (shouldn't happen with strict mode, but safety net)
            return res.json({ ok: true, date: today, lines: CONFIG.ROBOT.FALLBACK_BANTER.AI_OFFLINE });

        } catch (e) {
            Logger.error('[Robot] Failed', e);
            res.status(500).json({ error: 'ROBOT_FAIL' });
        }
    }
}
