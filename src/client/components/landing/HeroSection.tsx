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
                    // NES aesthetic: Press Start 2P font with text shadow for depth
                    style={{
                        fontFamily: "'Press Start 2P', cursive",
                        color: '#FF4500', // Reddit orange
                        textShadow: '4px 4px 0px rgba(0, 0, 0, 0.2)',
                        fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', // Responsive sizing
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
                        fontSize: 'clamp(0.625rem, 2vw, 0.875rem)',
                        color: '#5A5A5A',
                        lineHeight: '1.8',
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
