import { Logger } from '../Logger';
import { CONFIG } from '../../shared/constants';

/**
 * Migration service to freeze legacy memory snapshots from leaderboards/{slug}
 * into the new versioned topic structure at topics/{slug}/quizzes/legacy_snapshot.
 */
export class LegacySnapshotFreezer {
    private readonly baseUrl: string;
    private readonly projectId: string;

    constructor(projectId: string = (process.env.FIRESTORE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || CONFIG.FIREBASE.PROJECT_ID)) {
        this.projectId = projectId;
        this.baseUrl = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents`;
    }

    /**
     * Executes the one-time migration for all slugs in leaderboards/ collection.
     */
    async freezeAll(): Promise<{ processed: number; migrated: number; errors: number }> {
        const stats = { processed: 0, migrated: 0, errors: 0 };
        try {
            Logger.info('[LegacySnapshotFreezer] Starting migration...');

            // 1. List all documents in leaderboards/
            const url = `${this.baseUrl}/leaderboards`;
            const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });

            if (!res.ok) {
                const txt = await res.text();
                Logger.error('[LegacySnapshotFreezer] Failed to list leaderboards', { status: res.status, error: txt });
                return stats;
            }

            const data: any = await res.json();
            if (!data.documents || data.documents.length === 0) {
                Logger.info('[LegacySnapshotFreezer] No legacy leaderboards found.');
                return stats;
            }

            for (const doc of data.documents) {
                stats.processed++;
                const slug = doc.name.split('/').pop();
                if (!slug) continue;

                try {
                    const success = await this.freezeSlug(slug, doc.fields);
                    if (success) stats.migrated++;
                    else stats.errors++;
                } catch (err) {
                    Logger.error(`[LegacySnapshotFreezer] Failed to migrate slug: ${slug}`, err);
                    stats.errors++;
                }
            }

            Logger.info('[LegacySnapshotFreezer] Migration complete.', stats);
            return stats;
        } catch (e) {
            Logger.error('[LegacySnapshotFreezer] Fatal error during migration', e);
            return stats;
        }
    }

    /**
     * Freezes a single slug's leaderboard snapshot.
     */
    private async freezeSlug(slug: string, fields: any): Promise<boolean> {
        const quizPath = `topics/${slug}/quizzes/legacy_snapshot`;

        // Idempotency check: Does legacy_snapshot quiz already exist?
        const checkRes = await fetch(`${this.baseUrl}/${quizPath}`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        if (checkRes.ok) {
            Logger.info(`[LegacySnapshotFreezer] Slug ${slug} already has legacy_snapshot. Skipping.`);
            return true;
        }

        const entries = fields.entries?.arrayValue?.values || [];
        if (entries.length === 0) {
            Logger.info(`[LegacySnapshotFreezer] Slug ${slug} has no entries. Cleaning up.`);
            await this.deleteLegacyDoc(slug);
            return true;
        }

        Logger.info(`[LegacySnapshotFreezer] Migrating ${slug} with ${entries.length} entries...`);

        // 2. Transact: Create quiz metadata and all leaderboard entries
        const dbPath = `projects/${this.projectId}/databases/(default)/documents`;
        const writes: any[] = [
            {
                // Create the quiz document
                update: {
                    name: `${dbPath}/${quizPath}`,
                    fields: {
                        source: { stringValue: "memory_snapshot" },
                        migratedAt: { stringValue: new Date().toISOString() },
                        generationVersion: { integerValue: "-1" },
                        legacy: { booleanValue: true },
                        status: { stringValue: "archived" }
                    }
                }
            }
        ];

        // Add entries
        for (const entryDoc of entries) {
            const f = entryDoc.mapValue?.fields || {};
            const username = f.username?.stringValue;
            if (!username) continue;

            writes.push({
                update: {
                    name: `${dbPath}/${quizPath}/leaderboard/${username}`,
                    fields: {
                        username: { stringValue: username },
                        score: { integerValue: f.score?.integerValue || "0" },
                        timestamp: { integerValue: f.timestamp?.integerValue || "0" },
                        legacy: { booleanValue: true }
                    }
                }
            });
        }

        const commitRes = await fetch(`${this.baseUrl}:commit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ writes })
        });

        if (!commitRes.ok) {
            const txt = await commitRes.text();
            Logger.error(`[LegacySnapshotFreezer] Commit failed for ${slug}`, txt);
            return false;
        }

        // 3. Delete the original document
        await this.deleteLegacyDoc(slug);

        return true;
    }

    private async deleteLegacyDoc(slug: string) {
        await fetch(`${this.baseUrl}/leaderboards/${slug}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
