import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type PopupType = 'success' | 'warning' | 'error' | 'info';

interface AutoDismissPopupProps {
    message: string;
    type?: PopupType;
    duration?: number; // milliseconds
    onDismiss?: () => void;
}

export const AutoDismissPopup: React.FC<AutoDismissPopupProps> = ({
    message,
    type = 'info',
    duration = 2500,
    onDismiss,
}) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            if (onDismiss) {
                setTimeout(onDismiss, 300); // Wait for exit animation
            }
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onDismiss]);

    // NES.css class based on type
    const getContainerClass = () => {
        switch (type) {
            case 'success':
                return 'is-success';
            case 'warning':
                return 'is-warning';
            case 'error':
                return 'is-error';
            default:
                return 'is-primary';
        }
    };

    // Color for glow effect
    const getGlowColor = () => {
        switch (type) {
            case 'success':
                return 'rgba(0, 255, 136, 0.4)';
            case 'warning':
                return 'rgba(255, 165, 0, 0.4)';
            case 'error':
                return 'rgba(220, 38, 38, 0.4)';
            default:
                return 'rgba(150, 206, 180, 0.4)';
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -50, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -30, scale: 0.9 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    style={{
                        position: 'fixed',
                        top: '5rem',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 10000,
                        pointerEvents: 'none',
                    }}
                >
                    <div
                        className={`nes-container ${getContainerClass()}`}
                        style={{
                            borderRadius: 0,
                            padding: '1rem 1.5rem',
                            boxShadow: `0 0 25px ${getGlowColor()}, 4px 4px 0px rgba(0, 0, 0, 0.3)`,
                            minWidth: '200px',
                            textAlign: 'center',
                        }}
                    >
                        <p
                            style={{
                                margin: 0,
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: 'clamp(0.65rem, 2vw, 0.8rem)',
                                lineHeight: '1.5',
                            }}
                        >
                            {message}
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
