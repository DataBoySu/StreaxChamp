import { FirestoreRestService, QuotaError } from './FirestoreRestService';
import { Logger } from '../Logger';

export interface AppStats {
    top3: Array<{ slug: string; title: string; topScore: number; nickname: string; timeTakenMs: number }>;
    popular: Array<{ slug: string; title: string; totalCompletions: number }>;
    globalTop: Array<{ slug: string; title: string; nickname: string; score: number; timeTakenMs: number }>;
    hotTopics: Array<{ slug: string; title: string }>;
    globalTotals: Array<{ userKey: string; nickname: string; totalScore: number }>;
    updatedAt: string;
}

export class StatsService {
    private fs: FirestoreRestService;
    private readonly STATS_DOC_ID = 'stats';
    private readonly STATS_COLLECTION = 'global';

    constructor() {
        this.fs = new FirestoreRestService();
    }

    /**
     * Fetch the aggregated stats document.
     * Consumes exactly 1 Read.
     */
    async getGlobalStats(): Promise<AppStats | null> {
        try {
            const url = `${this.fs.getBaseUrl()}/${this.STATS_COLLECTION}/${this.STATS_DOC_ID}`;
            const res = await this.fs.fetchWithQuotaCheck(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });

            if (!res.ok) {
                if (res.status === 404) {
                    Logger.info('[StatsService] Global stats document not found (404). This is normal if never generated.');
                    return null;
                }
                const text = await res.text();
                Logger.error(`[StatsService] GET stats failed: status=${res.status} body=${text.slice(0, 100)}`);
                return null;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data: any = await res.json();
            const f = data.fields || {};

            // Helper to parse arrays of objects/strings
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const parseList = (field: any, mapper: (item: any) => any) => {
                return (field?.arrayValue?.values || []).map((v: any) => mapper(v.mapValue?.fields || {}));
            };

            const stats: AppStats = {
                updatedAt: f.updatedAt?.stringValue || '',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                top3: parseList(f.top3, (o: any) => ({
                    slug: o.slug?.stringValue || '',
                    title: o.title?.stringValue || '',
                    topScore: Number(o.topScore?.integerValue || 0),
                    nickname: o.nickname?.stringValue || 'Anonymous',
                    timeTakenMs: Number(o.timeTakenMs?.integerValue || 0)
                })),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                popular: parseList(f.popular, (o: any) => ({
                    slug: o.slug?.stringValue || '',
                    title: o.title?.stringValue || '',
                    totalCompletions: Number(o.totalCompletions?.integerValue || 0)
                })),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                globalTop: parseList(f.globalTop, (o: any) => ({
                    slug: o.slug?.stringValue || '',
                    title: o.title?.stringValue || '',
                    nickname: o.nickname?.stringValue || 'Anonymous',
                    score: Number(o.score?.integerValue || 0),
                    timeTakenMs: Number(o.timeTakenMs?.integerValue || 0)
                })),
                hotTopics: (f.hotTopics?.arrayValue?.values || []).map((v: any) => {
                    const o = v.mapValue?.fields || {};
                    return {
                        slug: o.slug?.stringValue || '',
                        title: o.title?.stringValue || '',
                    };
                }),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                globalTotals: parseList(f.globalTotals, (o: any) => ({
                    userKey: o.userKey?.stringValue || '',
                    nickname: o.nickname?.stringValue || 'Anonymous',
                    totalScore: Number(o.totalScore?.integerValue || 0)
                }))
            };

            return stats;
        } catch (e) {
            if (e instanceof Error && e.name === 'QuotaError') {
                Logger.error(`[StatsService] FIRESTORE QUOTA EXCEEDED (429/message). Error: ${e.message}`);
                throw e; // Rethrow so caller knows!
            }
            Logger.error(`[StatsService] Unexpected error type: ${e instanceof Error ? e.name : typeof e}. msg: ${e instanceof Error ? e.message : String(e)}`);
            return null;
        }
    }

    /**
     * Update the aggregated stats document.
     * Consumes 1 Write. 
     * Call this sparingly (e.g. cron job or every 10 completions).
     */
    async updateGlobalStats(stats: AppStats): Promise<boolean> {
        try {
            const url = `${this.fs.getBaseUrl()}/${this.STATS_COLLECTION}/${this.STATS_DOC_ID}`;

            // Helper to serialize arrays
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const serializeList = (list: any[], mapper: (item: any) => any) => {
                return { arrayValue: { values: list.map(item => ({ mapValue: { fields: mapper(item) } })) } };
            };

            const body = {
                fields: {
                    updatedAt: { stringValue: new Date().toISOString() },
                    top3: serializeList(stats.top3, item => ({
                        slug: { stringValue: item.slug },
                        title: { stringValue: item.title },
                        topScore: { integerValue: String(item.topScore) },
                        nickname: { stringValue: item.nickname },
                        timeTakenMs: { integerValue: String(item.timeTakenMs) }
                    })),
                    popular: serializeList(stats.popular, item => ({
                        slug: { stringValue: item.slug },
                        title: { stringValue: item.title },
                        totalCompletions: { integerValue: String(item.totalCompletions) }
                    })),
                    globalTop: serializeList(stats.globalTop, item => ({
                        slug: { stringValue: item.slug },
                        title: { stringValue: item.title },
                        nickname: { stringValue: item.nickname },
                        score: { integerValue: String(item.score) },
                        timeTakenMs: { integerValue: String(item.timeTakenMs) }
                    })),
                    hotTopics: serializeList(stats.hotTopics, item => ({
                        slug: { stringValue: item.slug },
                        title: { stringValue: item.title },
                    })),
                    globalTotals: serializeList(stats.globalTotals, item => ({
                        userKey: { stringValue: item.userKey },
                        nickname: { stringValue: item.nickname },
                        totalScore: { integerValue: String(item.totalScore) }
                    }))
                }
            };

            const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            return res.ok;
        } catch {
            return false;
        }
    }
}
