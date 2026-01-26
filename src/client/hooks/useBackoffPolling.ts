import { useEffect, useRef, useCallback } from 'react';

export interface BackoffPollingOptions {
    enabled?: boolean;
    initialInterval?: number;
    maxInterval?: number;
    backoffMultiplier?: number;
    resetOnVisible?: boolean;
}

/**
 * Smart polling hook with exponential backoff.
 * Starts fast for responsiveness, slows down when idle to save API calls.
 * 
 * @param callback - Function to call on each poll
 * @param options - Configuration options
 * @returns reset function to trigger immediate poll and reset interval
 */
export function useBackoffPolling(
    callback: () => void | Promise<void>,
    options: BackoffPollingOptions = {}
) {
    const {
        enabled = true,
        initialInterval = 3000,
        maxInterval = 60000,
        backoffMultiplier = 1.5,
        resetOnVisible = true,
    } = options;

    const currentIntervalRef = useRef(initialInterval);
    const timerRef = useRef<number | null>(null);
    const isPollingRef = useRef(false);

    const clearTimer = useCallback(() => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const scheduleNext = useCallback(() => {
        clearTimer();
        if (!enabled) return;

        timerRef.current = window.setTimeout(async () => {
            if (!isPollingRef.current) {
                isPollingRef.current = true;
                try {
                    await callback();
                } finally {
                    isPollingRef.current = false;
                }

                // Increase interval for next poll (exponential backoff)
                currentIntervalRef.current = Math.min(
                    currentIntervalRef.current * backoffMultiplier,
                    maxInterval
                );
                scheduleNext();
            }
        }, currentIntervalRef.current);
    }, [enabled, callback, backoffMultiplier, maxInterval, clearTimer]);

    const reset = useCallback(() => {
        clearTimer();
        currentIntervalRef.current = initialInterval;
        scheduleNext();
    }, [initialInterval, scheduleNext, clearTimer]);

    // Initial setup and cleanup
    useEffect(() => {
        if (enabled) {
            scheduleNext();
        }
        return () => clearTimer();
    }, [enabled, scheduleNext, clearTimer]);

    // Handle visibility change
    useEffect(() => {
        if (!resetOnVisible) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                reset();
            } else {
                clearTimer();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [resetOnVisible, reset, clearTimer]);

    return { reset };
}
