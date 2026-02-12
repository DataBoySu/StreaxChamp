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
    const getStyleConfig = () => {
        if (message.type === 'success')
            return {
                glow: 'rgba(0, 255, 136, 0.9)',
                bg: 'rgba(0, 100, 50, 1)',
                border: '#00ff88',
                shadow: '0 0 40px rgba(0, 255, 136, 0.9), 6px 6px 0px rgba(0, 0, 0, 0.6)',
            };
        if (message.type === 'error')
            return {
                glow: 'rgba(220, 38, 38, 0.9)',
                bg: 'rgba(100, 20, 20, 1)',
                border: '#dc2626',
                shadow: '0 0 40px rgba(220, 38, 38, 0.9), 6px 6px 0px rgba(0, 0, 0, 0.6)',
            };
        return {
            glow: 'rgba(255, 165, 0, 0.9)',
            bg: 'rgba(100, 60, 0, 1)',
            border: '#ffa500',
            shadow: '0 0 40px rgba(255, 165, 0, 0.9), 6px 6px 0px rgba(0, 0, 0, 0.6)',
        };
    };

    const styleConfig = getStyleConfig();

    return (
        <AnimatePresence>
            {message.text && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.5, x: 100 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: 100 }}
                    transition={{ duration: 0.3, type: 'spring', bounce: 0.4 }}
                    style={{
                        position: 'fixed',
                        top: '15%',
                        right: '1.5rem',
                        zIndex: 10001,
                        pointerEvents: 'none',
                    }}
                >
                    <div
                        className={`nes-container ${getContainerClass()}`}
                        style={{
                            borderRadius: 0,
                            padding: '1.5rem 2.5rem',
                            background: styleConfig.bg,
                            border: `6px solid ${styleConfig.border}`,
                            boxShadow: styleConfig.shadow,
                            minWidth: '180px',
                            opacity: 1,
                        }}
                    >
                        <p
                            style={{
                                margin: 0,
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: 'clamp(0.9rem, 3vw, 1.2rem)',
                                textAlign: 'center',
                                lineHeight: '1.8',
                                color: '#ffffff',
                                textShadow: `0 0 20px ${styleConfig.glow}, 0 0 40px ${styleConfig.glow}`,
                                opacity: 1,
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
