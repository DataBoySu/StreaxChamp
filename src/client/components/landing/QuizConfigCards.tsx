import React from 'react';
import { GeneratorMode } from './GeneratorModeSelector';

interface QuizConfigCardsProps {
    selectedMode: GeneratorMode;
    topicTitle?: string;
    onTopicClick?: () => void;
}

export const QuizConfigCards: React.FC<QuizConfigCardsProps> = ({ selectedMode, topicTitle, onTopicClick }) => {

    const getModeDescription = () => {
        if (selectedMode === 'daily') {
            return {
                label: 'RANKED',
                color: 'text-error', // NES Red
                subtext: 'Global Leaderboard',
                actionable: false
            };
        }
        return {
            label: topicTitle ? 'TOPIC' : 'SELECT TOPIC',
            color: 'text-success', // NES Green
            subtext: topicTitle || 'User-Generated',
            actionable: true
        };
    };

    const desc = getModeDescription();

    return (
        <div className="flex gap-4 w-full max-w-lg mx-auto select-none mt-2">
            {/* Count Card */}
            <div className="bg-white border-2 border-black p-2 flex flex-col items-center justify-center shadow-[4px_4px_0_#000]">
                <span className="text-sm font-bold font-pixel">5</span>
                <span className="text-[10px] font-pixel uppercase mt-1">Q's</span>
            </div>

            {/* Timer Card */}
            <div className="bg-white border-2 border-black p-2 flex flex-col items-center justify-center shadow-[4px_4px_0_#000]">
                <span className="text-sm font-bold font-pixel">15s</span>
                <span className="text-[10px] font-pixel uppercase mt-1">Time</span>
            </div>

            {/* Dynamic Context Card */}
            <div
                className={`flex-1 bg-white border-4 border-black p-2 flex flex-col items-center justify-center shadow-[4px_4px_0_#000] transition-transform ${desc.actionable ? 'cursor-pointer active:translate-y-[4px] active:shadow-none hover:-translate-y-1' : ''}`}
                onClick={desc.actionable ? onTopicClick : undefined}
            >
                <div className="flex items-center gap-2">
                    {/* Pixel Icon can go here if needed, keeping text only for now as requested */}
                    <span className={`text-xs md:text-sm font-bold font-pixel uppercase ${desc.color}`}>
                        {desc.label}
                    </span>
                </div>
                <span className="text-[10px] font-pixel uppercase mt-1 text-center leading-tight max-w-[150px] truncate">
                    {desc.subtext}
                </span>
            </div>
        </div>
    );
};
