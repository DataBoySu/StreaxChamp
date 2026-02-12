import React from 'react';
import { motion } from 'framer-motion';
import { AppQuestion } from '../../hooks/useQuizData';
import { CircularOverlayTimer } from './CircularOverlayTimer';

interface QuizActiveViewProps {
    question: AppQuestion;
    questionIndex: number;
    totalQuestions: number;
    timeLeft: number;
    totalTime: number;
    timerActive: boolean;
    shuffledAnswers: string[];
    selectedAnswer: string | null;
    correctAnswer: string | null;
    onAnswer: (answer: string, correct: string) => void;
}

export const QuizActiveView: React.FC<QuizActiveViewProps> = ({
    question,
    questionIndex,
    totalQuestions,
    timeLeft,
    totalTime,
    timerActive,
    shuffledAnswers,
    selectedAnswer,
    correctAnswer,
    onAnswer,
}) => {
    return (
        <motion.div
            key={`question-${questionIndex}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
        >
            {/* Question Header with prominent timer */}
            <div className="mb-6">
                {/* Question info and progress */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <motion.div
                            style={{
                                fontFamily: "'VT323', monospace",
                                fontSize: 'clamp(1rem, 2.5vw, 1.1rem)',
                                color: '#9ca3af',
                                fontWeight: 'bold',
                            }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            Question {questionIndex + 1} of {totalQuestions}
                        </motion.div>
                        <div className="flex gap-1">
                            {Array.from({ length: totalQuestions }).map((_, i) => (
                                <motion.div
                                    key={i}
                                    className={`w-2 h-2 ${i < questionIndex
                                        ? 'bg-success'
                                        : i === questionIndex
                                            ? 'bg-accent'
                                            : 'bg-border'
                                        }`}
                                    style={{ borderRadius: 0 }}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Overlay Timer - appears only in final 15s */}
                {timerActive && (
                    <CircularOverlayTimer timeLeft={timeLeft} totalTime={totalTime} />
                )}
            </div>

            <motion.div
                className="mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                {/* Question Card - Enhanced with NES.css */}
                <div
                    className="nes-container is-dark"
                    style={{
                        borderRadius: 0,
                        background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(139, 92, 246, 0.1), rgba(167, 139, 250, 0.15))',
                        border: '4px solid #a78bfa',
                        boxShadow: '0 0 30px rgba(167, 139, 250, 0.4), 8px 8px 0px rgba(0, 0, 0, 0.3)',
                        padding: '2rem',
                        marginBottom: '2rem',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    {/* Decorative corner elements */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '0.5rem',
                            left: '0.5rem',
                            width: '12px',
                            height: '12px',
                            background: '#ff69b4',
                            boxShadow: '0 0 10px rgba(255, 105, 180, 0.6)',
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            top: '0.5rem',
                            right: '0.5rem',
                            width: '12px',
                            height: '12px',
                            background: '#00ff88',
                            boxShadow: '0 0 10px rgba(0, 255, 136, 0.6)',
                        }}
                    />

                    {/* Question icon/badge */}
                    <div
                        style={{
                            display: 'inline-block',
                            fontFamily: "'Press Start 2P', cursive",
                            fontSize: 'clamp(0.6rem, 1.5vw, 0.75rem)',
                            color: '#ff69b4',
                            textShadow: '0 0 10px rgba(255, 105, 180, 0.6)',
                            marginBottom: '1rem',
                            padding: '0.5rem 1rem',
                            border: '2px solid #ff69b4',
                            background: 'rgba(255, 105, 180, 0.1)',
                        }}
                    >
                        ❓ QUESTION
                    </div>

                    <h4
                        style={{
                            fontFamily: "'Press Start 2P', cursive",
                            fontSize: 'clamp(0.85rem, 2.5vw, 1.05rem)',
                            color: '#ffffff',
                            textShadow: '0 0 15px rgba(255, 255, 255, 0.5), 0 0 30px rgba(167, 139, 250, 0.3)',
                            marginBottom: '1rem',
                            lineHeight: '1.8',
                            padding: '1rem',
                            background: 'rgba(0, 0, 0, 0.2)',
                            border: '2px solid rgba(167, 139, 250, 0.3)',
                        }}
                    >
                        {question?.question}
                    </h4>

                    {/* Decorative bottom accent */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '0.5rem',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            gap: '0.5rem',
                        }}
                    >
                        <div style={{ width: '8px', height: '8px', background: '#7c3aed', boxShadow: '0 0 8px rgba(124, 58, 237, 0.6)' }} />
                        <div style={{ width: '8px', height: '8px', background: '#a78bfa', boxShadow: '0 0 8px rgba(167, 139, 250, 0.6)' }} />
                        <div style={{ width: '8px', height: '8px', background: '#7c3aed', boxShadow: '0 0 8px rgba(124, 58, 237, 0.6)' }} />
                    </div>
                </div>

                {/* Answer Buttons */}
                <div className="grid grid-cols-2 gap-4">
                    {shuffledAnswers.map((answer, index) => (
                        <motion.button
                            key={answer}
                            onClick={() => onAnswer(answer, question?.correctAnswer || '')}
                            disabled={selectedAnswer !== null}
                            className={`quiz-option quiz-option-big ${selectedAnswer && answer === correctAnswer
                                ? 'correct'
                                : selectedAnswer === answer
                                    ? 'incorrect'
                                    : ''
                                }`}
                            style={{
                                fontFamily: "'VT323', monospace",
                                fontSize: 'clamp(1rem, 2.2vw, 1.15rem)',
                                borderRadius: 0,
                            }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={selectedAnswer === null ? { scale: 1.02 } : {}}
                            whileTap={selectedAnswer === null ? { scale: 0.98 } : {}}
                        >
                            <span className="relative z-10 font-bold text-left text-base">
                                {answer}
                            </span>
                        </motion.button>
                    ))}
                </div>
            </motion.div>
        </motion.div >
    );
};
