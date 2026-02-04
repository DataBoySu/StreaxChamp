import React from 'react';
import { motion } from 'framer-motion';
import { InteractiveRobot } from '../InteractiveRobot';

interface HeroSectionProps {
    username: string;
    errorMessage?: string | undefined;
    hasPlayed?: boolean;
    totalPoints?: number;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
    username,
    errorMessage,
    hasPlayed,
    totalPoints
}) => {
    return (
        <div className="flex flex-col items-center w-full text-center">
            {/* Title & Subtitle Group with more breathing room */}
            <div className="mb-12 md:mb-16 relative z-20 px-4">
                <motion.h1
                    // Cyberpunk neon aesthetic with strong glow for readability
                    style={{
                        fontFamily: "'Press Start 2P', cursive",
                        color: '#00ff88', // Neon cyan matching robot eyes
                        textShadow: '0 0 20px #00ff88, 0 0 40px rgba(0, 255, 136, 0.5), 0 0 60px rgba(0, 255, 136, 0.3)',
                        fontSize: 'clamp(1.75rem, 5vw, 2.75rem)', // Slightly larger for impact
                        lineHeight: '1.4',
                    }}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="mb-6"
                >
                    Infinity Quiz Generator
                </motion.h1>

                <motion.p
                    style={{
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: 'clamp(0.75rem, 2vw, 1rem)', // Increased size
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

            {/* Robot Container - Increased safe space to prevent dialogue clipping */}
            <div
                className="relative w-full flex justify-center items-end"
                style={{ minHeight: '380px' }} // Increased from 340px for more vertical space
            >
                <div
                    className="relative z-30 w-full flex justify-center pointer-events-auto"
                    style={{ marginBottom: '-20px' }}
                >
                    <InteractiveRobot
                        username={username}
                        errorMessage={errorMessage}
                        hasPlayed={hasPlayed || false}
                        totalPoints={totalPoints || 0}
                    />
                </div>
            </div>
        </div>
    );
};
