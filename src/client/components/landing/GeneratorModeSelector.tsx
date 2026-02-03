import React from 'react';
import { motion } from 'framer-motion';

export type GeneratorMode = 'daily' | 'topic';

interface GeneratorModeSelectorProps {
    selectedMode: GeneratorMode;
    onSelectMode: (mode: GeneratorMode) => void;
}

// Pixel Icons
const DailyIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
        <path d="M2 6h20v16H2V6zm2 4v10h16V10H4zm4-8h2v4H8V2zm8 0h2v4h-2V2z" />
        <path d="M7 12h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zm-8 4h2v2H7v-2zm4 0h2v2h-2v-2z" />
    </svg>
);

const TopicIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-4-8c0-2.21 1.79-4 4-4s4 1.79 4 4-1.79 4-4 4-4-1.79-4-4zm6 0c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2z" />
    </svg>
);

export const GeneratorModeSelector: React.FC<GeneratorModeSelectorProps> = ({
    selectedMode,
    onSelectMode,
}) => {
    return (
        <div className="flex gap-4 w-full justify-center max-w-lg mx-auto select-none">
            {/* Daily Quiz Mode Card */}
            <button
                onClick={() => onSelectMode('daily')}
                className={`
                    relative flex-1 p-4 text-left transition-all duration-75 group outline-none
                    ${selectedMode === 'daily'
                        ? 'bg-white text-black border-4 border-black translate-y-[4px]' // Pressed state (NES)
                        : 'bg-white text-black border-4 border-black hover:-translate-y-1 shadow-[4px_4px_0_#000]' // Raised state (NES)
                    }
                `}
            >
                <div className="flex flex-col items-center gap-2 pointer-events-none">
                    <DailyIcon />
                    <span className={`font-pixel text-xs md:text-sm uppercase tracking-wide`}>
                        Daily Quiz
                    </span>
                </div>
                {selectedMode === 'daily' && (
                    <motion.div
                        className="absolute top-2 right-2 text-black"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* Checkmark pixel */}
                        <div className="w-2 h-2 bg-black shadow-[2px_2px_0_#000,-2px_0_0_#000,-4px_-2px_0_#000]"></div>
                    </motion.div>
                )}
            </button>

            {/* Topic Quiz Mode Card */}
            <button
                onClick={() => onSelectMode('topic')}
                className={`
                    relative flex-1 p-4 text-left transition-all duration-75 group outline-none
                    ${selectedMode === 'topic'
                        ? 'bg-white text-black border-4 border-black translate-y-[4px]' // Pressed state
                        : 'bg-white text-black border-4 border-black hover:-translate-y-1 shadow-[4px_4px_0_#000]' // Raised state
                    }
                `}
            >
                <div className="flex flex-col items-center gap-2 pointer-events-none">
                    <TopicIcon />
                    <span className={`font-pixel text-xs md:text-sm uppercase tracking-wide`}>
                        Topic Quiz
                    </span>
                </div>
                {selectedMode === 'topic' && (
                    <motion.div
                        className="absolute top-2 right-2 text-black"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* Checkmark pixel */}
                        <div className="w-2 h-2 bg-black shadow-[2px_2px_0_#000,-2px_0_0_#000,-4px_-2px_0_#000]"></div>
                    </motion.div>
                )}
            </button>
        </div>
    );
};
