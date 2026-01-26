import React from 'react';
import { motion } from 'framer-motion';
import { CircularTimer } from '../ui';

interface BonusQuestionViewProps {
    bonusQuestion: { question: string; answers: string[]; correctAnswer: string } | null;
    timerActive: boolean;
    timeLeft: number;
    totalTime: number;
    selectedAnswer: string | null;
    correctAnswer: string | null;
    onAnswer: (selected: string | null, correct: string) => void;
}

export const BonusQuestionView: React.FC<BonusQuestionViewProps> = ({
    bonusQuestion,
    timerActive,
    timeLeft,
    totalTime,
    selectedAnswer,
    correctAnswer,
    onAnswer,
}) => {
    if (!bonusQuestion) return null;

    return (
        <motion.div
            key="bonus"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
        >
            <div className="text-center mb-8">
                <h3 className="text-3xl font-bold text-warning mb-2">BONUS QUESTION!</h3>
                <p className="text-secondary">
                    Perfect score! Here's your chance for an extra point!
                </p>

                {/* Prominent Bonus Timer */}
                {timerActive && (
                    <div className="timer-container my-6">
                        <CircularTimer timeLeft={timeLeft} totalTime={totalTime} />
                    </div>
                )}
            </div>

            <motion.div
                className="mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
            >
                <h4 className="text-xl md:text-2xl font-semibold mb-6 text-center">
                    {bonusQuestion.question}
                </h4>
                <div className="grid grid-cols-2 gap-6">
                    {bonusQuestion.answers.map((answer) => (
                        <button
                            key={answer}
                            onClick={() => onAnswer(answer, bonusQuestion.correctAnswer)}
                            disabled={selectedAnswer !== null}
                            className={`quiz-option quiz-option-big ${selectedAnswer && answer === correctAnswer
                                    ? 'correct'
                                    : selectedAnswer === answer
                                        ? 'incorrect'
                                        : ''
                                }`}
                        >
                            <span className="relative z-10 font-bold text-left text-lg">
                                {answer}
                            </span>
                        </button>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
};
