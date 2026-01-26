import React from 'react';
import { motion } from 'framer-motion';
import { CelebrationBackground } from './CelebrationBackground';
import { ScoreFace } from './ScoreFace';
// import { HotTopics } from '../../HotTopics'; // HotTopics is separate in the grid layout, not inside QuizResult card usually.
// In App.tsx, HotTopics was below the card. QuizResult replaces the card content.

interface QuizResultProps {
    score: number;
    totalQuestions: number;
    onPlayAgain: () => void;
    onReset: () => void;
}

export const QuizResult: React.FC<QuizResultProps> = ({
    score,
    totalQuestions,
    onPlayAgain,
    onReset,
}) => {
    return (
        <motion.div
            key="score"
            className="text-center py-12"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4 }}
            style={{ position: 'relative', zIndex: 10 }}
        >
            {/* Celebration Background Animation */}
            <CelebrationBackground score={score} />

            <div className="mb-8 relative z-20">
                <motion.div
                    className="mb-6"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                >
                    <ScoreFace score={score} totalQuestions={totalQuestions} />
                </motion.div>
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-center">
                    Quiz Complete!
                </h2>
                <div className="text-center mb-6">
                    <motion.p
                        className="text-2xl md:text-3xl mb-4 font-semibold"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        Your Final Score:
                    </motion.p>
                    <motion.div
                        className="relative inline-block"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.3, type: 'spring', damping: 8 }}
                        style={{
                            background:
                                score >= 4
                                    ? 'linear-gradient(45deg, #FFD700, #FFA500, #FF6B6B)'
                                    : score >= 3
                                        ? 'linear-gradient(45deg, #4ECDC4, #45B7D1, #96CEB4)'
                                        : 'linear-gradient(45deg, #6B7280, #9CA3AF, #D1D5DB)',
                            padding: '20px 40px',
                            borderRadius: '20px',
                            border: '4px solid rgba(255,255,255,0.3)',
                            boxShadow:
                                '0 10px 30px rgba(0,0,0,0.3), inset 0 0 20px rgba(255,255,255,0.1)',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Animated background sparkles */}
                        {score >= 3 && (
                            <>
                                <motion.div
                                    className="absolute"
                                    style={{
                                        top: '10px',
                                        left: '10px',
                                        width: '6px',
                                        height: '6px',
                                        backgroundColor: 'rgba(255,255,255,0.8)',
                                        borderRadius: '50%',
                                    }}
                                    animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
                                    transition={{ duration: 2, repeat: Infinity, delay: 0 }}
                                />
                                <motion.div
                                    className="absolute"
                                    style={{
                                        top: '30px',
                                        right: '15px',
                                        width: '4px',
                                        height: '4px',
                                        backgroundColor: 'rgba(255,255,255,0.6)',
                                        borderRadius: '50%',
                                    }}
                                    animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
                                    transition={{ duration: 2, repeat: Infinity, delay: 0.7 }}
                                />
                                <motion.div
                                    className="absolute"
                                    style={{
                                        bottom: '10px',
                                        left: '20px',
                                        width: '5px',
                                        height: '5px',
                                        backgroundColor: 'rgba(255,255,255,0.7)',
                                        borderRadius: '50%',
                                    }}
                                    animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
                                    transition={{ duration: 2, repeat: Infinity, delay: 1.4 }}
                                />
                            </>
                        )}

                        <motion.span
                            className="text-6xl md:text-8xl font-black text-white relative z-10"
                            style={{
                                textShadow:
                                    '2px 2px 4px rgba(0,0,0,0.5), 0 0 20px rgba(255,255,255,0.3)',
                                fontFamily: 'Impact, Arial Black, sans-serif',
                                letterSpacing: '2px',
                            }}
                            animate={{
                                textShadow:
                                    score >= 3
                                        ? [
                                            '2px 2px 4px rgba(0,0,0,0.5), 0 0 20px rgba(255,255,255,0.3)',
                                            '2px 2px 4px rgba(0,0,0,0.5), 0 0 30px rgba(255,255,255,0.5)',
                                            '2px 2px 4px rgba(0,0,0,0.5), 0 0 20px rgba(255,255,255,0.3)',
                                        ]
                                        : '2px 2px 4px rgba(0,0,0,0.5)',
                            }}
                            transition={{ duration: 2, repeat: score >= 3 ? Infinity : 0 }}
                        >
                            {score}/{totalQuestions}
                        </motion.span>
                    </motion.div>
                </div>
                <motion.p
                    className="text-secondary mt-4 text-lg font-semibold"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    {score >= 4
                        ? 'Outstanding Performance!'
                        : score >= 3
                            ? 'Great Job!'
                            : 'Better Luck Next Time'}
                </motion.p>
            </div>
            <div className="flex gap-4 justify-center relative z-20">
                <button
                    onClick={onPlayAgain}
                    className="modern-button modern-button-primary px-6 py-3"
                >
                    Play Again
                </button>
                <button
                    onClick={onReset}
                    className="modern-button modern-button-secondary px-6 py-3"
                >
                    Back to Start
                </button>
            </div>
        </motion.div>
    );
};
