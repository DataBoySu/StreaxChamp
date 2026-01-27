
import { Logger } from '../Logger';

interface CacheEntry<T> {
    data: T;
    expiry: number;
}

/**
 * Simple in-memory cache service to reduce database load.
 * Implements a singleton pattern.
 */
export class CacheService {
    private static instance: CacheService;
    private cache: Map<string, CacheEntry<any>> = new Map();

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
    public get<T>(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            Logger.info(`[Cache] ❌ MISS: ${key}`);
            return null;
        }

        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            Logger.info(`[Cache] ⏰ EXPIRED: ${key}`);
            return null;
        }

        Logger.info(`[Cache] ✅ HIT: ${key}`);
        return entry.data as T;
    }

    /**
     * Sets a value in the cache with a specified TTL in seconds.
     */
    public set<T>(key: string, data: T, ttlSeconds: number = 300): void {
        const expiry = Date.now() + (ttlSeconds * 1000);
        this.cache.set(key, { data, expiry });
        Logger.info(`[Cache] Set key: ${key} (TTL: ${ttlSeconds}s)`);
    }

    /**
     * Invalidates a specific key.
     */
    public del(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Clears the entire cache.
     */
    public flush(): void {
        this.cache.clear();
        Logger.info('[Cache] Flushed all entries');
    }
}
