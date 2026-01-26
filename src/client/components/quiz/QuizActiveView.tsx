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
                            className="text-base font-semibold text-secondary"
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
                                    className={`w-2 h-2 rounded-full ${i < questionIndex
                                        ? 'bg-success'
                                        : i === questionIndex
                                            ? 'bg-accent'
                                            : 'bg-border'
                                        }`}
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
                <h4 className="text-lg md:text-xl font-semibold mb-4 leading-relaxed">
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
        </motion.div>
    );
};
