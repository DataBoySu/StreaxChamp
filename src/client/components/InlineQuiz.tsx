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

    // Calculate dynamic font sizes based on content length
    const questionLength = question.question.length;
    const maxOptionLength = Math.max(...answers.map((ans: string) => ans.length));

    // Dynamic question font size: shorter questions can be larger
    const questionFontSize = questionLength > 100 ? '0.85rem' : questionLength > 60 ? '0.95rem' : '1rem';

    // Dynamic option font size: adjust based on longest option
    const optionFontSize = maxOptionLength > 25 ? '0.7rem' : maxOptionLength > 15 ? '0.75rem' : '0.8rem';

    return (
        <div
            className="w-full text-left flex flex-col"
            style={{
                height: '100%',
                maxHeight: '600px', // Constrain to typical mobile viewport
                padding: '0.5rem',
                overflow: 'hidden' // Prevent any scrolling
            }}
        >
            {/* Header / Meta */}
            <div style={{
                marginBottom: '0.4rem',
                color: '#6c757d',
                fontSize: '0.7rem',
                flexShrink: 0
            }}>
                Question {currentIndex + 1} of {quizData.questions.length}
            </div>

            {/* Question Text */}
            <h3 style={{
                marginBottom: '0.75rem',
                lineHeight: '1.3',
                flexShrink: 0,
                fontSize: questionFontSize,
                fontWeight: 'bold'
            }}>
                {question.question}
            </h3>

            {/* Layout & Options */}
            <OptionGrid options={answers} optionFontSize={optionFontSize}>
                {answers.map((ans: string, idx: number) => (
                    <div key={idx} style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                        <OptionButton
                            index={idx}
                            label={ans}
                            isSelected={selectedAnswerIndex === idx}
                            isCorrect={idx === correctIdx}
                            isAnswered={isAnswered}
                            onSelect={onOptionSelect}
                            fontSize={optionFontSize}
                        />
                    </div>
                ))}
            </OptionGrid>

            {/* Footer / CTA */}
            <div style={{
                textAlign: 'center',
                flexShrink: 0,
                marginTop: '0.5rem'
            }}>
                <button
                    className={`nes-btn ${isAnswered ? 'is-success' : 'is-disabled'}`}
                    disabled={!isAnswered}
                    onClick={onNext}
                    style={{
                        width: '100%',
                        fontSize: '0.75rem',
                        padding: '0.5rem 1rem',
                        minHeight: '36px'
                    }}
                >
                    {currentIndex === quizData.questions.length - 1 ? 'Finish' : 'Next >'}
                </button>
            </div>
        </div>
    );
};
