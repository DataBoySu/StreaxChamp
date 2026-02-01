import React from 'react';
import { Question } from '../../../../shared/types/api';

interface QuizEditorPanelProps {
    question: Question;
    topic: string;
    stepNumber: number;
    totalSteps: number;
    onUpdateQuestion: (field: keyof Question, value: any) => void;
    onUpdateOption: (optionIndex: number, text: string) => void;
}

export const QuizEditorPanel: React.FC<QuizEditorPanelProps> = ({
    question,
    topic,
    stepNumber,
    totalSteps,
    onUpdateQuestion,
    onUpdateOption
}) => {
    return (
        <div className="flex-1">
            <div className="text-center mb-6">
                <span className="inline-block bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-bold mb-2">
                    Question {stepNumber}/{totalSteps}
                </span>
                <h3 className="text-white text-xl font-bold">{topic}</h3>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="text-sm text-secondary uppercase font-bold mb-2 block">Question Text</label>
                    <textarea
                        value={question.question || ''}
                        onChange={(e) => onUpdateQuestion('question', e.target.value)}
                        placeholder="Enter your question here..."
                        className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-lg text-white focus:border-primary/50 focus:outline-none min-h-[120px]"
                    />
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {question.options.map((opt: string, optIdx: number) => (
                        <div key={optIdx} className="relative group">
                            <input
                                type="text"
                                value={opt}
                                onChange={(e) => onUpdateOption(optIdx, e.target.value)}
                                placeholder={`Option ${optIdx + 1}`}
                                className={`w-full bg-black/30 border-2 rounded-xl p-4 pr-16 text-base focus:outline-none transition-all min-h-[60px] ${question.correctAnswer === optIdx
                                    ? 'border-success bg-success/10 text-white'
                                    : 'border-white/10 text-secondary focus:border-primary/50'
                                    }`}
                            />
                            <button
                                onClick={() => onUpdateQuestion('correctAnswer', optIdx)}
                                className={`absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors shadow-lg z-10 ${question.correctAnswer === optIdx
                                    ? 'border-success bg-success text-black'
                                    : 'border-white/20 hover:border-white/50 bg-black/50'
                                    }`}
                            >
                                {question.correctAnswer === optIdx && <span className="font-bold text-lg">✓</span>}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="text-center text-sm text-secondary/70 italic mt-4">
                    Tap the circle to mark the correct answer.
                </div>
            </div>
        </div>
    );
};
