import { DailyQuiz } from '../hooks/useQuizData';
import { OptionGrid } from './quiz/OptionGrid';
import { OptionButton } from './quiz/OptionButton';

interface InlineQuizProps {
    quizData: DailyQuiz | null;
    currentIndex: number;
    selectedAnswerIndex: number | null;
    onOptionSelect: (index: number) => void;
    onNext: () => void;
}

export const InlineQuiz = ({ quizData, currentIndex, selectedAnswerIndex, onOptionSelect, onNext }: InlineQuizProps) => {
    // --- Early Returns ---
    if (!quizData) return <p>Loading quiz…</p>;

    const question = quizData.questions[currentIndex];
    if (!question) return <p>Error: Question missing</p>;

    // Ensure proper options array
    const answers = (question as any).options || (question as any).answers;
    if (!Array.isArray(answers)) {
        console.error('[InlineQuiz] Invalid question data:', question);
        return <p className="text-red-500">Error: Options missing.</p>;
    }

    // --- State Derivation ---
    const isAnswered = selectedAnswerIndex !== null;

    // Determine Correct Index safely
    let correctIdx = -1;
    if (typeof question.correctAnswer === 'number') {
        correctIdx = question.correctAnswer;
    } else if (typeof question.correctAnswer === 'string') {
        correctIdx = answers.indexOf(question.correctAnswer);
    }

    return (
        <div className="w-full text-left flex flex-col" style={{ height: '100%' }}>
            {/* Header / Meta */}
            <div style={{ marginBottom: '1rem', color: '#6c757d', fontSize: '0.8rem', flexShrink: 0 }}>
                Question {currentIndex + 1} of {quizData.questions.length}
            </div>

            <h3 style={{ marginBottom: '1.5rem', lineHeight: '1.4', flexShrink: 0 }}>
                {question.question}
            </h3>

            {/* Layout & Options */}
            <OptionGrid options={answers}>
                {answers.map((ans: string, idx: number) => (
                    // OPTION CELL: Responsible for spacing/depth, NOT the button itself
                    <div key={idx} style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                        <OptionButton
                            index={idx}
                            label={ans}
                            isSelected={selectedAnswerIndex === idx}
                            isCorrect={idx === correctIdx}
                            isAnswered={isAnswered}
                            onSelect={onOptionSelect}
                        />
                    </div>
                ))}
            </OptionGrid>

            {/* Footer / CTA */}
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <button
                    className={`nes-btn ${isAnswered ? 'is-success' : 'is-disabled'}`}
                    disabled={!isAnswered}
                    onClick={onNext}
                    style={{ width: '100%' }}
                >
                    {currentIndex === quizData.questions.length - 1 ? 'Finish' : 'Next >'}
                </button>
            </div>
        </div>
    );
};
