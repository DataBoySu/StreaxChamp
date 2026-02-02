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
        <div className="flex-1 flex flex-col h-full overflow-y-auto pb-2 px-1">
            {/* Header - Minimal & Secondary */}
            <div className="flex justify-between items-center mb-3 shrink-0 px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#1f1f1f]/40 truncate max-w-[150px]">
                    {topic}
                </span>
                <span className="text-xs font-bold text-[#1f1f1f]/30">
                    {stepNumber} / {totalSteps}
                </span>
            </div>

            <div className="space-y-4 flex-1 w-full max-w-2xl mx-auto flex flex-col">
                <div className="shrink-0">
                    {/* Question Input - Compact Default, Grows on Focus */}
                    <textarea
                        value={question.question || ''}
                        onChange={(e) => onUpdateQuestion('question', e.target.value)}
                        placeholder="Type question..."
                        className="w-full bg-white border-2 border-[#1f1f1f]/10 rounded-xl p-4 text-lg font-bold text-[#1f1f1f] placeholder:text-[#1f1f1f]/20 focus:border-[#FB8C00] focus:ring-0 focus:outline-none min-h-[84px] focus:min-h-[140px] resize-none transition-all duration-300 shadow-sm leading-tight"
                    />
                </div>

                {/* Options Grid - Big Tap Targets */}
                <div className="grid grid-cols-1 gap-2.5 flex-1 content-start">
                    {question.options.map((opt: string, optIdx: number) => {
                        const isCorrect = question.correctAnswer === optIdx;
                        return (
                            <div key={optIdx} className="flex items-stretch gap-3 w-full group min-h-[56px]">
                                {/* Selection Column (Left) */}
                                <button
                                    onClick={() => onUpdateQuestion('correctAnswer', optIdx)}
                                    className={`shrink-0 w-[56px] rounded-xl border-2 flex items-center justify-center transition-all shadow-sm active:scale-95 ${isCorrect
                                            ? 'border-[#FB8C00] bg-[#FFF4E5] text-[#FB8C00] shadow-md z-10'
                                            : 'border-[#1f1f1f]/10 bg-white text-[#1f1f1f]/20 hover:border-[#1f1f1f]/30'
                                        }`}
                                >
                                    {isCorrect ? (
                                        <span className="text-xl font-black">✔</span>
                                    ) : (
                                        <span className="text-xs font-bold opacity-60">
                                            {String.fromCharCode(65 + optIdx)}
                                        </span>
                                    )}
                                </button>

                                {/* Option Text Input */}
                                <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => onUpdateOption(optIdx, e.target.value)}
                                    placeholder={`Option ${optIdx + 1}`}
                                    className={`flex-1 bg-white border-2 rounded-xl px-4 text-base font-medium text-[#1f1f1f] placeholder:text-[#1f1f1f]/20 focus:outline-none transition-all shadow-sm active:scale-[0.99] ${isCorrect
                                            ? 'border-[#FB8C00] bg-[#FFF4E5]/30'
                                            : 'border-[#1f1f1f]/10 focus:border-[#FB8C00]'
                                        }`}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
