import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 text-white animate-in fade-in duration-300">
            <div className="flex flex-col items-center p-10 max-w-md w-full mx-4 text-center">

                {/* Animated Icon */}
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-orange-500 blur-2xl opacity-20 animate-pulse rounded-full"></div>
                    <div className="relative z-10 p-4 bg-slate-900 border border-orange-500/30 rounded-2xl shadow-xl shadow-orange-900/20">
                        <Sparkles className="w-12 h-12 text-orange-400 rotate-12" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-slate-900 rounded-full p-1 border border-slate-800">
                        <Loader2 className="w-6 h-6 text-orange-200 animate-spin" />
                    </div>
                </div>

                <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400 mb-3 tracking-tight">
                    {topicName ? `Prepare for ${topicName}` : 'Preparing Quiz'}
                </h3>

                <div className="h-8 flex items-center justify-center mb-8">
                    <p className="text-slate-300 text-lg font-medium animate-pulse">
                        {MESSAGES[msgIndex]}
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="w-full max-w-[240px] h-1.5 bg-slate-900 rounded-full overflow-hidden relative shadow-inner border border-slate-800/50">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500 to-transparent w-full -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
                </div>

                <p className="text-xs text-slate-500 mt-6 font-mono tracking-wide uppercase opacity-70">
                    Generating with Gemini AI
                </p>
            </div>

            <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
        </div>,
        document.body
    );
};
