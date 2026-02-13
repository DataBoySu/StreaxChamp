import { Request, Response } from 'express';
import { LegacySnapshotFreezer } from '../migrations/LegacySnapshotFreezer';
import { Logger } from '../Logger';

/**
 * Controller for maintenance tasks
 */
export class MaintenanceController {
    /**
     * Triggers the legacy snapshot freeze migration
     */
    static async migrateLegacySnapshots(_req: Request, res: Response) {
        try {
            const freezer = new LegacySnapshotFreezer();
            const results = await freezer.freezeAll();
            res.json({
                ok: true,
                message: "Migration completed",
                results
            });
        } catch (e) {
            Logger.error('[MaintenanceController] Migration trigger failed', e);
            res.status(500).json({ error: 'MIGRATION_FAILED', detail: String(e) });
        }
    }
}
