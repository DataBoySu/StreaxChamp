import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ExplanationScreenProps {
    question: string;
    correctAnswer: string;
    explanation?: string;
    isCorrect: boolean;
    onNext: () => void;
}

export const ExplanationScreen: React.FC<ExplanationScreenProps> = ({
    question,
    correctAnswer,
    explanation,
    isCorrect,
    onNext
}) => {
    const [canProceed, setCanProceed] = useState(false);
    const [timeLeft, setTimeLeft] = useState(3);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setCanProceed(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center p-6 text-center w-full max-w-2xl mx-auto h-full min-h-[400px]">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`w-full p-8 rounded-xl border-4 ${isCorrect ? 'bg-green-900/20 border-green-500' : 'bg-red-900/20 border-red-500'}`}
            >
                <h2 className={`text-2xl font-bold mb-4 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                    {isCorrect ? 'Correct!' : 'Incorrect'}
                </h2>

                <div className="mb-6 opacity-80 text-sm">{question}</div>

                <div className="mb-8">
                    <p className="text-xs uppercase tracking-wider opacity-60 mb-2">Correct Answer</p>
                    <p className="text-xl font-mono font-bold">{correctAnswer}</p>
                </div>

                {explanation && (
                    <div className="mb-8 p-4 bg-black/30 rounded-lg text-left">
                        <p className="text-xs uppercase tracking-wider opacity-50 mb-2">Did you know?</p>
                        <p className="text-md leading-relaxed">{explanation}</p>
                    </div>
                )}

                <button
                    onClick={onNext}
                    disabled={!canProceed}
                    className={`
            w-full py-4 text-lg font-bold rounded-lg transition-all
            ${canProceed
                            ? 'bg-primary hover:bg-primary-focus text-white cursor-pointer transform hover:scale-105'
                            : 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'}
          `}
                >
                    {canProceed ? 'Next Question →' : `Wait ${timeLeft}s...`}
                </button>
            </motion.div>
        </div>
    );
};
