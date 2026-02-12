import React from 'react';
import { motion } from 'framer-motion';
import { RobotPlayground } from '../RobotPlayground';

interface RobotError {
    code: string;
    robotDialogue: string;
    timestamp: number;
    persistent?: boolean;
}

interface HeroSectionProps {
    username: string;
    hasPlayed?: boolean;
    totalPoints?: number;
    currentError: RobotError | null;
    queueLength: number;
    clearErrors: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
    username,
    hasPlayed,
    totalPoints,
    currentError,
    queueLength,
    clearErrors
}) => {
    return (
        <div className="flex flex-col items-center w-full text-center">
            {/* Title & Subtitle Group - Reduced spacing to shift robot up */}
            <div className="mb-6 md:mb-10 relative z-20 px-4">
                <motion.h1
                    style={{
                        fontFamily: "'Press Start 2P', cursive",
                        color: '#00ff88',
                        fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
                        lineHeight: '1.4',
                        textShadow: '3px 3px 0px rgba(0, 0, 0, 0.4)', // Sharp shadow instead of blur
                    }}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="mb-4"
                >
                    Infinity Quiz Generator
                </motion.h1>

                <motion.p
                    style={{
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: 'clamp(0.65rem, 1.5vw, 0.85rem)', // Slightly smaller
                        color: 'rgba(0, 255, 136, 0.8)', // Softer cyan for subtitle
                        lineHeight: '1.8',
                        textShadow: '0 0 10px rgba(0, 255, 136, 0.5)', // Subtle glow
                    }}
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="max-w-lg mx-auto px-2"
                >
                    Test your knowledge and climb the leaderboard!
                </motion.p>
            </div>

            {/* Robot Container - Reduced safe space to shift up */}
            <div
                className="relative w-full flex justify-center items-end"
                style={{ minHeight: '340px' }} // Reduced from 380px
            >
                <div
                    className="relative z-30 w-full flex justify-center pointer-events-auto"
                    style={{ marginBottom: '-30px', marginTop: '-10px' }} // Shifting up further
                >
                    <RobotPlayground
                        username={username}
                        hasPlayed={hasPlayed || false}
                        totalPoints={totalPoints || 0}
                        currentError={currentError}
                        queueLength={queueLength}
                        clearErrors={clearErrors}
                    />
                </div>
            </div>
        </div>
    );
};
