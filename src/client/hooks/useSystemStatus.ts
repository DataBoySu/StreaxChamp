import { useState, useEffect, useCallback } from 'react';
import { CONFIG } from '../../shared/constants';

interface LimitStatus {
    allowed: boolean;
    user: { remaining: number; reset: number };
    global: { remaining: number; reset: number };
}

type SystemHealth = 'ok' | 'limit_reached' | 'maintenance' | 'offline';

export const useSystemStatus = (pollingIntervalMs = 60000) => {
    const [status, setStatus] = useState<SystemHealth>('ok');
    const [limits, setLimits] = useState<LimitStatus | null>(null);
    const [lastChecked, setLastChecked] = useState<number>(0);

    const checkSystem = useCallback(async () => {
        try {
            const res = await fetch('/api/limits');
            if (res.ok) {
                const data = await res.json();
                setLimits(data);
                setLastChecked(Date.now());

                console.log('[useSystemStatus] API Response:', data);

                // Determine Status
                if (data.allowed === false) {
                    console.log('[useSystemStatus] Access blocked. Analyzing reason...');
                    // Check specific limits
                    if (data.global.remaining <= 0 && CONFIG.LIMITS.dailyGlobalGen === 0) {
                        console.log('[useSystemStatus] Status: maintenance');
                        setStatus('maintenance'); // Kill Switch
                    } else if (data.global.remaining <= 0) {
                        console.log('[useSystemStatus] Status: limit_reached (global)');
                        setStatus('limit_reached'); // Global Cap
                    } else if (data.user.remaining <= 0) {
                        console.log('[useSystemStatus] Status: limit_reached (user)');
                        setStatus('limit_reached'); // User Cap
                    } else {
                        console.log('[useSystemStatus] Status: limit_reached (generic)');
                        setStatus('limit_reached'); // Generic Block
                    }
                } else {
                    console.log('[useSystemStatus] Status: ok');
                    setStatus('ok');
                }
            } else {
                console.warn('[useSystemStatus] API Error:', res.status);
                // If API fails (e.g. 500 or 404), might be maintenance or offset
                setStatus('offline');
            }
        } catch (e) {
            console.error('[SystemStatus] Check failed', e);
            setStatus('offline');
        }
    }, []);

    useEffect(() => {
        // Initial check
        void checkSystem();

        // Poll
        const timer = setInterval(checkSystem, pollingIntervalMs);
        return () => clearInterval(timer);
    }, [checkSystem, pollingIntervalMs]);

    return {
        status,
        limits,
        lastChecked,
        checkSystem
    };
};
