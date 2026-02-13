import { Logger } from '../Logger';
import { CONFIG } from '../../shared/constants';

export interface TopicLeaderboardEntry {
    slug: string;
    quizId: string;
    userId: string;
    nickname: string;
    score: number;
    submittedAt: string;
}

/**
 * Service for managing topic-specific leaderboards with atomic transactions.
 * Additive service to handle new topic leaderboard persistence logic.
 */
export class TopicLeaderboardService {
    private readonly baseUrl: string;
    private readonly projectId: string;

    constructor(projectId: string = (process.env.FIRESTORE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || CONFIG.FIREBASE.PROJECT_ID)) {
        this.projectId = projectId;
        this.baseUrl = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents`;
    }

    /**
     * Submits a score to the topic leaderboard using an atomic Firestore commit.
     * Ensures only the first attempt is recorded (locking).
     * Updates topic-level stats (playCount, uniquePlayerCount) atomatonically.
     */
    async submitScore(entry: TopicLeaderboardEntry): Promise<{ accepted: boolean; reason?: string }> {
        try {
            const dbPath = `projects/${this.projectId}/databases/(default)/documents`;
            const leaderboardDocPath = `${dbPath}/topics/${entry.slug}/quizzes/${entry.quizId}/leaderboard/${entry.userId}`;
            const topicDocPath = `${dbPath}/topics/${entry.slug}`;

            const writes: any[] = [
                {
                    // Write 1: Create the leaderboard entry doc
                    // Fails if document already exists (precondition: exists = false)
                    update: {
                        name: leaderboardDocPath,
                        fields: {
                            userId: { stringValue: entry.userId },
                            nickname: { stringValue: entry.nickname },
                            score: { integerValue: String(entry.score) },
                            submittedAt: { stringValue: entry.submittedAt }
                        }
                    },
                    currentDocument: { exists: false }
                },
                {
                    // Write 2: Increment topic-level statistics
                    transform: {
                        document: topicDocPath,
                        fieldTransforms: [
                            {
                                fieldPath: 'playCount',
                                increment: { integerValue: "1" }
                            },
                            {
                                fieldPath: 'uniquePlayerCount',
                                increment: { integerValue: "1" }
                            },
                            {
                                fieldPath: 'updatedAt',
                                setToServerValue: 'REQUEST_TIME'
                            }
                        ]
                    }
                }
            ];

            const body = { writes };
            const url = `${this.baseUrl}:commit`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const txt = await res.text();
                // 409 Conflict typically means the 'exists: false' precondition failed
                if (res.status === 409) {
                    return { accepted: false, reason: "already_played" };
                }
                Logger.error('[TopicLeaderboardService.submitScore] commit failed', { status: res.status, error: txt });
                return { accepted: false, reason: "commit_failed" };
            }

            return { accepted: true };
        } catch (e) {
            Logger.error('[TopicLeaderboardService.submitScore] error', e);
            return { accepted: false, reason: "error" };
        }
    }

    /**
     * Retrieves the top scores for a specific topic quiz.
     * Uses structuredQuery to order by score descending.
     */
    async getLeaderboard(slug: string, quizId: string, limit: number = 10) {
        try {
            const body = {
                structuredQuery: {
                    from: [{ collectionId: 'leaderboard' }],
                    orderBy: [
                        { field: { fieldPath: 'score' }, direction: 'DESCENDING' },
                        { field: { fieldPath: 'submittedAt' }, direction: 'ASCENDING' }
                    ],
                    limit: limit
                }
            };

            // Scoped query to the specific quiz's leaderboard subcollection
            const url = `${this.baseUrl}/topics/${slug}/quizzes/${quizId}:runQuery`;

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const txt = await res.text();
                Logger.error('[TopicLeaderboardService.getLeaderboard] query failed', { status: res.status, error: txt });
                return [];
            }

            const data: any = await res.json();

            // data is an array of objects: [{ document?: ..., readTime: ... }]
            return data
                .map((item: any) => {
                    if (!item.document) return null;
                    const f = item.document.fields || {};
                    const pathParts = item.document.name.split('/');
                    const userId = pathParts[pathParts.length - 1];

                    return {
                        userId,
                        nickname: f.nickname?.stringValue || userId,
                        score: f.score?.integerValue ? parseInt(f.score.integerValue, 10) : 0,
                        submittedAt: f.submittedAt?.stringValue || ''
                    };
                })
                .filter((e: any) => e !== null);
        } catch (e) {
            Logger.error('[TopicLeaderboardService.getLeaderboard] error', e);
            return [];
        }
    }
}
