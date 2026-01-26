import { motion, AnimatePresence } from 'framer-motion';
import { CircularTimer } from '../components/ui';

interface QuizViewProps {
    questionIndex: number;
    totalQuestions: number;
    question: string;
    answers: string[];
    timeLeft: number;
    totalTime: number;
    onAnswer: (answer: string) => void;
    selectedAnswer: string | null;
    correctAnswer: string | null;
}

export const QuizView = ({
    questionIndex,
    totalQuestions,
    question,
    answers,
    timeLeft,
    totalTime,
    onAnswer,
    selectedAnswer,
    correctAnswer
}: QuizViewProps) => {
    return (
        <motion.div
            key={`question-${questionIndex}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="max-w-3xl mx-auto"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-bold text-secondary uppercase tracking-widest">
                    Question {questionIndex + 1} / {totalQuestions}
                </span>
                <div className="w-16 h-16">
                    <CircularTimer timeLeft={timeLeft} totalTime={totalTime} />
                </div>
            </div>

            {/* Question Card */}
            <div className="modern-card p-6 md:p-10 mb-8">
                <h2 className="text-xl md:text-2xl font-bold leading-snug mb-8">
                    {question}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {answers.map((ans, idx) => {
                        const isSelected = selectedAnswer === ans;
                        const isCorrect = correctAnswer === ans;
                        const showResult = selectedAnswer !== null;

                        let statusClass = '';
                        if (showResult) {
                            if (isCorrect) statusClass = 'correct';
                            else if (isSelected) statusClass = 'incorrect';
                        }

                        return (
                            <motion.button
                                key={idx}
                                onClick={() => !showResult && onAnswer(ans)}
                                disabled={showResult}
                                className={`quiz-option quiz-option-big ${statusClass}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                whileHover={!showResult ? { scale: 1.02 } : {}}
                                whileTap={!showResult ? { scale: 0.98 } : {}}
                            >
                                <span className="text-lg font-bold">{ans}</span>
                            </motion.button>
                        );
                    })}
                </div>
            </div>
        </motion.div>
    );
};
