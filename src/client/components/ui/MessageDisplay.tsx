import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MessageDisplayProps {
    message: {
        text: string;
        type: string;
        timesUp: boolean;
    };
}

export const MessageDisplay: React.FC<MessageDisplayProps> = ({ message }) => {
    return (
        <AnimatePresence>
            {message.text && (
                <motion.div
                    className={`p-3 md:p-6 rounded-lg mb-6 text-center font-medium mx-2 max-w-full overflow-hidden ${message.timesUp
                            ? 'times-up-glow'
                            : message.type === 'success'
                                ? `bg-success/20 text-success border border-success/30 ${message.text.includes('Correct') ||
                                    message.text.includes('Good') ||
                                    message.text.includes('Great') ||
                                    message.text.includes('Excellent') ||
                                    message.text.includes('Ammazza') ||
                                    message.text.includes('Unstoppable') ||
                                    message.text.includes('Bonus')
                                    ? 'message-dramatic message-correct'
                                    : ''
                                }`
                                : message.type === 'error'
                                    ? `bg-error/20 text-error border border-error/30 ${message.text.includes('Incorrect')
                                        ? 'message-dramatic message-incorrect'
                                        : ''
                                    }`
                                    : 'bg-warning/20 text-warning border border-warning/30'
                        }`}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{
                        opacity: 1,
                        scale:
                            message.text.includes('Incorrect') ||
                                message.text.includes('Correct') ||
                                message.text.includes('Good') ||
                                message.text.includes('Great') ||
                                message.text.includes('Excellent') ||
                                message.text.includes('Ammazza') ||
                                message.text.includes('Unstoppable') ||
                                message.text.includes('Bonus')
                                ? window.innerWidth < 768
                                    ? 1.05
                                    : 1.2
                                : 1,
                        y:
                            message.text.includes('Incorrect') ||
                                message.text.includes('Correct') ||
                                message.text.includes('Good') ||
                                message.text.includes('Great') ||
                                message.text.includes('Excellent') ||
                                message.text.includes('Ammazza') ||
                                message.text.includes('Unstoppable') ||
                                message.text.includes('Bonus')
                                ? [-10, 0, -5, 0]
                                : 0,
                    }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{
                        duration:
                            message.text.includes('Incorrect') ||
                                message.text.includes('Correct') ||
                                message.text.includes('Good') ||
                                message.text.includes('Great') ||
                                message.text.includes('Excellent') ||
                                message.text.includes('Ammazza') ||
                                message.text.includes('Unstoppable') ||
                                message.text.includes('Bonus')
                                ? 0.8
                                : 0.3,
                        ease:
                            message.text.includes('Incorrect') ||
                                message.text.includes('Correct') ||
                                message.text.includes('Good') ||
                                message.text.includes('Great') ||
                                message.text.includes('Excellent') ||
                                message.text.includes('Ammazza') ||
                                message.text.includes('Unstoppable') ||
                                message.text.includes('Bonus')
                                ? 'easeOut'
                                : 'easeInOut',
                    }}
                >
                    {message.text}
                </motion.div>
            )}
        </AnimatePresence>
    );
};
