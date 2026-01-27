import { Logger } from '../Logger';

interface CacheEntry<T> {
    data: T;
    expiry: number;
}

/**
 * In-memory cache service (Singleton).
 * Reverted from Redis to ensure stability for now.
 * Keeps async signatures to maintain compatibility with Controllers.
 */
export class CacheService {
    private static instance: CacheService;
    private memoryCache = new Map<string, CacheEntry<any>>();

    private constructor() { }

    public static getInstance(): CacheService {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService();
        }
        return CacheService.instance;
    }

    /**
     * Gets a value from the cache. Returns null if missing or expired.
     */
    public async get<T>(key: string): Promise<T | null> {
        try {
            const entry = this.memoryCache.get(key);
            if (!entry) {
                Logger.info(`[Cache] ❌ MISS: ${key}`);
                return null;
            }

            if (Date.now() > entry.expiry) {
                this.memoryCache.delete(key);
                Logger.info(`[Cache] ⏰ EXPIRED: ${key}`);
                return null;
            }

            Logger.info(`[Cache] ✅ HIT: ${key}`);
            return entry.data as T;
        } catch (e) {
            Logger.error(`[Cache] Get error for ${key}`, e);
            return null;
        }
    }

    /**
     * Sets a value in the cache with a specified TTL in seconds.
     */
    public async set<T>(key: string, data: T, ttlSeconds: number = 300): Promise<void> {
        try {
            const expiry = Date.now() + (ttlSeconds * 1000);
            const entry: CacheEntry<T> = { data, expiry };
            this.memoryCache.set(key, entry);
            Logger.info(`[Cache] Set key: ${key} (TTL: ${ttlSeconds}s)`);
        } catch (e) {
            Logger.error(`[Cache] Set error for ${key}`, e);
        }
    }

    /**
     * Invalidates a specific key.
     */
    public async del(key: string): Promise<void> {
        this.memoryCache.delete(key);
    }

    /**
     * Clears the entire cache.
     */
    public async flush(): Promise<void> {
        this.memoryCache.clear();
        Logger.info('[Cache] Flushed all entries');
    }
}
