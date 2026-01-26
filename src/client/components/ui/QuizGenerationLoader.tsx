import React, { useEffect, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

const MESSAGES = [
    "Summoning the Quiz Master...",
    "Crafting your quest...",
    "Consulting the Ancient Scrolls...",
    "Polishing the Trophies...",
    "Gathering Knowledge...",
    "Preparing the Challenge...",
    "Igniting the Spark..."
];

export const QuizGenerationLoader: React.FC<{ isVisible: boolean; topicName?: string }> = ({ isVisible, topicName }) => {
    const [msgIndex, setMsgIndex] = useState(0);

    useEffect(() => {
        if (!isVisible) return;
        const interval = setInterval(() => {
            setMsgIndex(prev => (prev + 1) % MESSAGES.length);
        }, 2500);
        return () => clearInterval(interval);
    }, [isVisible]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="flex flex-col items-center p-8 bg-slate-900 border border-orange-500/30 rounded-2xl shadow-2xl max-w-sm w-full mx-4 text-center transform transition-all scale-100">
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-orange-500 blur-xl opacity-20 animate-pulse rounded-full"></div>
                    <Sparkles className="w-12 h-12 text-orange-400 rotate-12 relative z-10" />
                    <div className="absolute -bottom-1 -right-1">
                        <Loader2 className="w-6 h-6 text-orange-200 animate-spin" />
                    </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">
                    {topicName ? `Prepare for ${topicName}` : 'Preparing Quiz'}
                </h3>

                <p className="text-orange-200/80 text-lg font-medium animate-pulse min-h-[1.75rem]">
                    {MESSAGES[msgIndex]}
                </p>

                <div className="mt-8 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500 to-transparent w-full -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
                </div>

                <p className="text-xs text-slate-500 mt-4">
                    This utilizes AI generation. It may take up to 30 seconds.
                </p>
            </div>

            <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
        </div>
    );
};
