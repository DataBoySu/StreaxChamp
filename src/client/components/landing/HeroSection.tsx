import React from 'react';
import { motion } from 'framer-motion';
import { InteractiveRobot } from '../InteractiveRobot';

interface HeroSectionProps {
    username: string;
    errorMessage?: string;
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
            {/* Title & Subtitle Group */}
            <div className="mb-8 md:mb-12 relative z-20">
                <motion.h1
                    className="text-3xl md:text-5xl font-black mb-3 text-gradient font-pixel tracking-tight"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    Infinity Quiz Generator
                </motion.h1>

                <motion.p
                    className="text-sm md:text-base text-secondary font-medium font-pixel max-w-lg mx-auto leading-relaxed"
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                >
                    Test your knowledge and climb the leaderboard!
                </motion.p>
            </div>

            {/* Mascot Container
          - Fixed height container to prevent layout shifts.
          - Padding top reserved for the speech bubble (absolute positioned above head).
          - 'pointer-events-none' on wrapper to prevent blocking, 'pointer-events-auto' on robot.
      */}
            <div
                className="relative w-full flex justify-center items-end"
                style={{ minHeight: '240px' }}
            >
                {/* 
             Robot wrapper:
             - Ensures robot is centered.
             - The Robot component itself is ~220px tall.
             - The bubble pops up ~60px above the head.
             - We rely on the margin from Title/Subtitle (mb-12 = ~48px) + Robot's own spacing.
          */}
                <div className="relative z-10 w-full flex justify-center pointer-events-auto">
                    <InteractiveRobot
                        username={username}
                        errorMessage={errorMessage}
                        hasPlayed={hasPlayed}
                        totalPoints={totalPoints}
                    />
                </div>
            </div>
        </div>
    );
};
