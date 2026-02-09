import { useState, useEffect, useCallback } from 'react';

/**
 * Error queue item with code, robot dialogue, and timestamp
 */
interface RobotError {
    code: string;
    robotDialogue: string;
    timestamp: number;
    persistent?: boolean; // New flag
}

export const useRobotError = () => {
    const [errorQueue, setErrorQueue] = useState<RobotError[]>([]);
    const [currentError, setCurrentError] = useState<RobotError | null>(null);
    const [isDisplaying, setIsDisplaying] = useState(false);

    /**
     * Add an error to the queue (with deduplication)
     */
    const addError = useCallback((code: string, robotDialogue: string, persistent: boolean = false) => {
        setErrorQueue(prev => {
            // Check if same error code already in queue or currently displayed
            const exists = prev.find(e => e.code === code) || (currentError?.code === code);
            if (exists) {
                // If existing error is not persistent but new one IS, upgrade it? 
                // For simplicity, just ignore duplicates for now.
                // But if we want to force a persistent error that was previously transient, we might need logic.
                // Leaning towards: if it matches current error and is persistent, update current.
                if (currentError?.code === code && persistent && !currentError.persistent) {
                    setCurrentError({ ...currentError, persistent: true });
                }
                console.log(`[RobotError] Duplicate error ${code} ignored`);
                return prev;
            }

            console.log(`[RobotError] Queueing error: ${code} (persistent=${persistent})`);
            return [...prev, { code, robotDialogue, timestamp: Date.now(), persistent }];
        });
    }, [currentError]);

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

            if (!next) return;

            console.log(`[RobotError] Displaying: ${next.code} - "${next.robotDialogue}"`);

            setCurrentError(next);
            setErrorQueue(rest);
            setIsDisplaying(true);

            // Auto-clear ONLY if not persistent
            if (!next.persistent) {
                const timeout = setTimeout(() => {
                    console.log(`[RobotError] Cleared: ${next.code}`);
                    setIsDisplaying(false);
                    setCurrentError(null);
                }, 3000); // 3s for normal errors

                return () => clearTimeout(timeout);
            } else {
                console.log(`[RobotError] Persistent error set: ${next.code}. Waiting for manual clear.`);
            }
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
