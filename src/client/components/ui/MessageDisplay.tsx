import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import 'nes.css/css/nes.min.css';

interface MessageDisplayProps {
    message: {
        text: string;
        type: string;
        timesUp: boolean;
    };
}

export const MessageDisplay: React.FC<MessageDisplayProps> = ({ message }) => {
    // Determine NES container style based on message type
    const getContainerClass = () => {
        if (message.type === 'success') return 'is-success';
        if (message.type === 'error') return 'is-error';
        return 'is-warning';
    };

    // Get color for glow effect
    const getGlowColor = () => {
        if (message.type === 'success') return 'rgba(0, 255, 136, 0.5)';
        if (message.type === 'error') return 'rgba(220, 38, 38, 0.5)';
        return 'rgba(255, 165, 0, 0.5)';
    };

    return (
        <AnimatePresence>
            {message.text && (
                <motion.div
                    initial={{ opacity: 0, x: 100, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 100, scale: 0.9 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    style={{
                        position: 'fixed',
                        top: '50%',
                        right: '2rem',
                        transform: 'translateY(-50%)',
                        zIndex: 10000,
                        pointerEvents: 'none',
                    }}
                >
                    <div
                        className={`nes-container ${getContainerClass()}`}
                        style={{
                            borderRadius: 0,
                            padding: '1.25rem 2rem',
                            boxShadow: `0 0 30px ${getGlowColor()}, 6px 6px 0px rgba(0, 0, 0, 0.4)`,
                            minWidth: '150px',
                        }}
                    >
                        <p
                            style={{
                                margin: 0,
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: 'clamp(0.75rem, 2.5vw, 1rem)',
                                textAlign: 'center',
                                lineHeight: '1.5',
                            }}
                        >
                            {message.text}
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
