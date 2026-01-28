import { useState, useEffect, useCallback } from 'react';

/**
 * Error queue item with code, robot dialogue, and timestamp
 */
interface RobotError {
    code: string;
    robotDialogue: string;
    timestamp: number;
}

/**
 * Custom hook for managing robot error messages with deduplication and queueing.
 * 
 * Features:
 * - Deduplicates same error codes (only shown once)
 * - Queues different errors to show sequentially
 * - Auto-clears after 3s (matches robot dialogue timeout)
 * - Returns current error being displayed
 */
export const useRobotError = () => {
    const [errorQueue, setErrorQueue] = useState<RobotError[]>([]);
    const [currentError, setCurrentError] = useState<RobotError | null>(null);
    const [isDisplaying, setIsDisplaying] = useState(false);

    /**
     * Add an error to the queue (with deduplication)
     */
    const addError = useCallback((code: string, robotDialogue: string) => {
        setErrorQueue(prev => {
            // Check if same error code already in queue
            const exists = prev.find(e => e.code === code);
            if (exists) {
                console.log(`[RobotError] Duplicate error ${code} ignored`);
                return prev; // Skip duplicate
            }

            console.log(`[RobotError] Queueing error: ${code}`);
            return [...prev, { code, robotDialogue, timestamp: Date.now() }];
        });
    }, []);

    /**
     * Clear current error and queue (for manual reset)
     */
    const clearErrors = useCallback(() => {
        setErrorQueue([]);
        setCurrentError(null);
        setIsDisplaying(false);
    }, []);

    // Process error queue
    useEffect(() => {
        if (!isDisplaying && errorQueue.length > 0) {
            const next = errorQueue[0];
            const rest = errorQueue.slice(1);

            if (!next) return; // Type guard

            console.log(`[RobotError] Displaying: ${next.code} - "${next.robotDialogue}"`);

            setCurrentError(next);
            setErrorQueue(rest); setIsDisplaying(true);

            // Auto-clear after 3s (matches robot dialogue timeout)
            const timeout = setTimeout(() => {
                console.log(`[RobotError] Cleared: ${next.code}`);
                setIsDisplaying(false);
                setCurrentError(null);
            }, 3000);

            return () => clearTimeout(timeout);
        }
    }, [errorQueue, isDisplaying]);

    return {
        currentError,
        addError,
        clearErrors,
        isDisplaying,
        queueLength: errorQueue.length
    };
};
