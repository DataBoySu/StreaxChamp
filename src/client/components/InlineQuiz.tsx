import { DailyQuiz } from '../hooks/useQuizData';

interface InlineQuizProps {
    quizData: DailyQuiz | null;
    currentIndex: number;
    selectedAnswerIndex: number | null;
    onOptionSelect: (index: number) => void;
    onNext: () => void;
}

export const InlineQuiz = ({ quizData, currentIndex, selectedAnswerIndex, onOptionSelect, onNext }: InlineQuizProps) => {
    // Fallback or demo mode if no data
    if (!quizData) {
        return <p>Loading quiz…</p>;
    }

    const question = quizData.questions[currentIndex];

    if (!question) {
        return <p>Error: Question missing</p>;
    }

    // Ensure we handle both 'options' and 'answers' for compatibility
    const answers = question.options || (question as any).answers;

    if (!question || !Array.isArray(answers)) {
        console.error('[InlineQuiz] Invalid question data:', question);
        return (
            <div className="text-center text-red-500">
                <p>Error: Invalid quiz data.</p>
                <p className="text-xs mt-2">Question or options missing.</p>
            </div>
        );
    }

    return (
        <div className="w-full text-left flex flex-col" style={{ height: '100%' }}>
            <div style={{ marginBottom: '1rem', color: '#6c757d', fontSize: '0.8rem', flexShrink: 0 }}>
                Question {currentIndex + 1} of {quizData.questions.length}
            </div>

            <h3 style={{ marginBottom: '1.5rem', lineHeight: '1.4', flexShrink: 0 }}>{question.question}</h3>

            {/* Options grid with proper spacing */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ marginBottom: '1.5rem', minHeight: 0 }}>
                {answers.map((ans: string, idx: number) => {
                    const isSelected = selectedAnswerIndex === idx;

                    // Determine Correct Index for Feedback
                    let correctIdx = -1;
                    if (typeof question.correctAnswer === 'number') {
                        correctIdx = question.correctAnswer;
                    } else if (typeof question.correctAnswer === 'string') {
                        correctIdx = answers.indexOf(question.correctAnswer);
                    }

                    const isAnswered = selectedAnswerIndex !== null;
                    const isCorrect = idx === correctIdx;

                    let btnClass = 'nes-btn';
                    if (isAnswered) {
                        if (isCorrect) btnClass += ' is-success';
                        else if (isSelected) btnClass += ' is-error';
                        else btnClass += ' is-disabled';
                    } else {
                        if (isSelected) btnClass += ' is-primary'; // should not happen if we guard click
                    }

                    return (
                        <button
                            key={idx}
                            className={btnClass}
                            style={{
                                width: '100%',
                                textAlign: 'left',
                                fontSize: '0.8rem',
                                minHeight: '48px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}
                            disabled={isAnswered}
                            onClick={() => !isAnswered && onOptionSelect(idx)}
                        >
                            {ans}
                        </button>
                    );
                })}
            </div>

            <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <button
                    className={`nes-btn ${selectedAnswerIndex !== null ? 'is-success' : 'is-disabled'}`}
                    disabled={selectedAnswerIndex === null}
                    onClick={onNext}
                    style={{ width: '100%' }}
                >
                    {currentIndex === quizData.questions.length - 1 ? 'Finish' : 'Next >'}
                </button>
            </div>
        </div>
    );
};
