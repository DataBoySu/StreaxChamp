import React from 'react';
import { motion } from 'framer-motion';

interface GapViewProps {
    multiplier: number;
}

export const GapView: React.FC<GapViewProps> = ({ multiplier }) => {
    const getMultiplierText = (level: number): string => {
        switch (level) {
            case 1: return 'Good';
            case 2: return 'Very Good';
            case 3: return 'Great';
            case 4: return 'Excellent';
            case 5: return 'AMAZING';
            default: return level > 5 ? 'LEGENDARY' : '';
        }
    };

    return (
        <motion.div
            key="gap"
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="mb-8">
                <motion.h3
                    className="text-2xl font-bold text-secondary mb-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    Loading Next Question
                    <motion.span
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    >
                        ...
                    </motion.span>
                </motion.h3>

                {/* Loading Animation */}
                <motion.div
                    className="flex justify-center mb-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="flex space-x-2">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                className="w-3 h-3 bg-accent rounded-full"
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.5, 1, 0.5],
                                }}
                                transition={{
                                    duration: 1,
                                    repeat: Infinity,
                                    delay: i * 0.2,
                                }}
                            />
                        ))}
                    </div>
                </motion.div>

                {multiplier > 0 && (
                    <motion.div
                        className="text-4xl font-bold text-success"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.6 }}
                    >
                        {getMultiplierText(multiplier)} Streak!
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};
