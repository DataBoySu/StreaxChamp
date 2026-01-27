import { useState, useEffect, useRef } from 'react';

/**
 * Hook that tracks if the user is currently active based on DOM events.
 * Returns true if the user has interacted within the timeout window.
 * Returns false if the user has been idle for longer than the timeout.
 * 
 * @param timeoutMs Duration in milliseconds of inactivity before considering user idle (default 60s)
 */
export const useUserActivity = (timeoutMs = 60000): boolean => {
    const [isActive, setIsActive] = useState(true);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const handleActivity = () => {
            // If we were inactive, become active immediately
            setIsActive(prev => {
                if (!prev) return true;
                return prev;
            });

            // Reset the idle timer
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                setIsActive(false);
            }, timeoutMs);
        };

        // Set initial timer
        timeoutRef.current = setTimeout(() => {
            setIsActive(false);
        }, timeoutMs);

        // Attach listeners
        // Includes mobile-specific events (touchstart, touchmove) and generic pointer events
        const events = [
            'mousemove', 'mousedown', 'click', 'scroll', 'keydown', // Desktop
            'touchstart', 'touchmove', 'pointermove', // Mobile/Touch
            'focus', 'visibilitychange' // App state
        ];
        events.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true, capture: true });
        });

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            events.forEach(event => {
                window.removeEventListener(event, handleActivity, { capture: true });
            });
        };
    }, [timeoutMs]);

    return isActive;
};
