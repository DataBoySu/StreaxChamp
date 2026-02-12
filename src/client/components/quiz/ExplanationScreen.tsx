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
                className="nes-container is-dark w-full"
                style={{
                    borderRadius: 0,
                    background: isCorrect
                        ? 'linear-gradient(135deg, rgba(0, 255, 136, 0.1), rgba(0, 255, 136, 0.05))'
                        : 'linear-gradient(135deg, rgba(220, 38, 38, 0.1), rgba(220, 38, 38, 0.05))',
                    border: `4px solid ${isCorrect ? '#00ff88' : '#dc2626'}`,
                    boxShadow: isCorrect
                        ? '0 0 25px rgba(0, 255, 136, 0.4)'
                        : '0 0 25px rgba(220, 38, 38, 0.4)',
                    padding: '2rem',
                }}
            >
                {/* Result Header */}
                <h2
                    style={{
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
                        color: isCorrect ? '#00ff88' : '#ff6b6b',
                        textShadow: `0 0 15px ${isCorrect ? 'rgba(0, 255, 136, 0.5)' : 'rgba(255, 107, 107, 0.5)'}`,
                        marginBottom: '1.5rem',
                    }}
                >
                    {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                </h2>

                {/* Question Display */}
                <div
                    style={{
                        fontFamily: "'VT323', monospace",
                        fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
                        color: '#e5e7eb',
                        marginBottom: '1.5rem',
                        opacity: 0.9,
                    }}
                >
                    {question}
                </div>

                {/* Correct Answer */}
                <div
                    className="nes-container is-dark"
                    style={{
                        borderRadius: 0,
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                        padding: '1rem',
                        marginBottom: '1.5rem',
                    }}
                >
                    <p
                        style={{
                            fontFamily: "'VT323', monospace",
                            fontSize: '0.75rem',
                            color: '#9ca3af',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            marginBottom: '0.5rem',
                        }}
                    >
                        Correct Answer
                    </p>
                    <p
                        style={{
                            fontFamily: "'Press Start 2P', cursive",
                            fontSize: 'clamp(0.8rem, 2vw, 1rem)',
                            color: '#ffffff',
                            textShadow: '0 0 10px rgba(255, 255, 255, 0.3)',
                        }}
                    >
                        {correctAnswer}
                    </p>
                </div>

                {/* Explanation */}
                {explanation && (
                    <div
                        className="nes-container is-dark"
                        style={{
                            borderRadius: 0,
                            background: 'rgba(124, 58, 237, 0.1)',
                            border: '2px solid rgba(124, 58, 237, 0.3)',
                            padding: '1rem',
                            marginBottom: '1.5rem',
                            textAlign: 'left',
                        }}
                    >
                        <p
                            style={{
                                fontFamily: "'VT323', monospace",
                                fontSize: '0.75rem',
                                color: '#a78bfa',
                                textTransform: 'uppercase',
                                marginBottom: '0.5rem',
                            }}
                        >
                            Did you know?
                        </p>
                        <p
                            style={{
                                fontFamily: "'VT323', monospace",
                                fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
                                color: '#e5e7eb',
                                lineHeight: '1.6',
                            }}
                        >
                            {explanation}
                        </p>
                    </div>
                )}

                {/* Next Button */}
                <button
                    onClick={onNext}
                    disabled={!canProceed}
                    className={`nes-btn w-full ${canProceed ? 'is-primary' : ''}`}
                    style={{
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: 'clamp(0.65rem, 1.8vw, 0.85rem)',
                        padding: '1rem',
                        borderRadius: 0,
                        opacity: canProceed ? 1 : 0.5,
                        cursor: canProceed ? 'pointer' : 'not-allowed',
                        boxShadow: canProceed ? '0 0 15px rgba(0, 255, 136, 0.3)' : 'none',
                    }}
                >
                    {canProceed ? 'Next Question →' : `Wait ${timeLeft}s...`}
                </button>
            </motion.div>
        </div>
    );
};
