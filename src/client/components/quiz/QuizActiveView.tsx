import React from 'react';
import { motion } from 'framer-motion';
import { AppQuestion } from '../../hooks/useQuizData';
import { CircularTimer } from '../../components/ui';

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

                {/* Prominent Timer Display */}
                {timerActive && (
                    <div className="timer-container mb-4">
                        <CircularTimer timeLeft={timeLeft} totalTime={totalTime} />
                    </div>
                )}
            </div>

            <motion.div
                className="mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <h4
                    style={{
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: 'clamp(0.85rem, 2.5vw, 1.05rem)',
                        color: '#00ff88',
                        textShadow: '0 0 10px rgba(0, 255, 136, 0.3)',
                        marginBottom: '1rem',
                        lineHeight: '1.6',
                    }}
                >
                    {question?.question}
                </h4>
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
