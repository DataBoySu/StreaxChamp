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

    return (
        <AnimatePresence>
            {message.text && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="fixed bottom-8 left-0 right-0 z-[100] flex justify-center pointer-events-none px-4"
                >
                    <div
                        className={`nes-container is-rounded ${getContainerClass()}`}
                        style={{
                            display: 'inline-block',
                            padding: '1rem',
                            maxWidth: '90%',
                            textAlign: 'center',
                            backgroundColor: message.type === 'success' ? '#90EE90' :
                                message.type === 'error' ? '#FFB6C1' :
                                    '#FFE4B5'
                        }}
                    >
                        <p style={{ margin: 0, fontWeight: 'bold' }}>{message.text}</p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
