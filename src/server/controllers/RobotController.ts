import { Request, Response } from 'express';
import { CONFIG } from '../../shared/constants';
import { Logger } from '../Logger';
import { FirestoreRestService } from '../services/FirestoreRestService';
import { validateGeminiKey, attemptHealing as attemptAiHealing, generateRobotLines } from '../services/GeminiService';

/**
 * Controller for managing the mascot's dialogues and handling system health states.
 */
export class RobotController {
    /**
     * Retrieves the mascot's dialogues for today.
     * Incorporates circuit-breaker healing for both Firestore and AI services.
     */
    static async getDialogues(_req: Request, res: Response) {
        try {
            await validateGeminiKey();
            const todaySlug = new Date().toISOString().slice(0, 10);

            // 1. Database Circuit & Healing
            if (FirestoreRestService.dbCircuitOpen) {
                const dbStatus = await FirestoreRestService.attemptHealing();
                if (!dbStatus.healed && dbStatus.final) {
                    return res.json({ ok: true, date: todaySlug, lines: CONFIG.ROBOT.FALLBACK_BANTER.PERMANENTLY_DOWN });
                }
                if (!dbStatus.healed) {
                    return res.json({ ok: true, date: todaySlug, lines: CONFIG.ROBOT.FALLBACK_BANTER.DB_OFFLINE });
                }
                Logger.info('[CircuitBreaker] DB Healed! Resuming normal robot operations.');
            }

            // 2. AI Circuit & Healing
            const aiRepairStatus = await attemptAiHealing();
            if (!aiRepairStatus.healed) {
                if (aiRepairStatus.final) {
                    return res.json({ ok: true, date: todaySlug, lines: CONFIG.ROBOT.FALLBACK_BANTER.AI_OFFLINE });
                }
                return res.json({ ok: true, date: todaySlug, lines: CONFIG.ROBOT.FALLBACK_BANTER.AI_OFFLINE });
            }

            // 3. Normal Operation: Fetch from DB or Generate Fresh
            const fsService = new FirestoreRestService();
            const existingDialogues = await fsService.getRobotDialogues(todaySlug);
            if (existingDialogues) {
                return res.json({ ok: true, date: todaySlug, lines: existingDialogues });
            }

            Logger.ai('[Robot] Generating fresh lines for today...');
            const freshLines = await generateRobotLines();
            if (freshLines && freshLines.length > 0) {
                await fsService.saveRobotDialogues(todaySlug, freshLines);
                return res.json({ ok: true, date: todaySlug, lines: freshLines });
            }

            return res.json({ ok: true, date: todaySlug, lines: CONFIG.ROBOT.FALLBACK_BANTER.AI_OFFLINE });

        } catch (e) {
            Logger.error('[Robot] Failed', e);
            res.status(500).json({ error: 'ROBOT_FAIL' });
        }
    }
}
