import { useState } from 'react';
import { DailyQuiz } from './useQuizData';

export const useInlineQuiz = (quizData: DailyQuiz | null, onComplete: () => void) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
    const [score, setScore] = useState(0);

    const handleOptionSelect = (index: number) => {
        console.log(`[InlineQuiz] Option selected: ${index}`);
        setSelectedAnswerIndex(index);
    };

    const handleNext = () => {
        if (!quizData) return;

        // Check answer using index
        const currentQ = quizData.questions[currentIndex];
        // Ensure we find the normalized options list same as renderQuiz
        const ansList = currentQ.options || (currentQ as any).answers;

        if (currentQ && selectedAnswerIndex !== null && ansList) {
            let correctIdx = -1;
            // Normalize correct answer to index
            if (typeof currentQ.correctAnswer === 'number') {
                correctIdx = currentQ.correctAnswer;
            } else if (typeof currentQ.correctAnswer === 'string') {
                correctIdx = ansList.indexOf(currentQ.correctAnswer);
            }

            // Strict index comparison
            if (correctIdx !== -1 && selectedAnswerIndex === correctIdx) {
                setScore(prev => prev + 1);
            }
        }

        const nextIdx = currentIndex + 1;
        if (nextIdx < quizData.questions.length) {
            console.log(`[InlineQuiz] Rendering question ${nextIdx}`);
            setCurrentIndex(nextIdx);
            setSelectedAnswerIndex(null); // Reset for next question
        } else {
            console.log('[InlineQuiz] End of quiz reached');
            onComplete();
        }
    };

    return {
        currentIndex,
        selectedAnswerIndex,
        score,
        handleOptionSelect,
        handleNext
    };
};
