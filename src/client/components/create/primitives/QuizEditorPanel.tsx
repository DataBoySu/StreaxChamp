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

import 'nes.css/css/nes.min.css';

export const QuizEditorPanel: React.FC<QuizEditorPanelProps> = ({
    question,
    onUpdateQuestion,
    onUpdateOption
}) => {
    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto px-2">


            <div className="flex-1 flex flex-col gap-4 w-full max-w-2xl mx-auto">
                {/* Question Input Card */}
                <div className="nes-container is-rounded with-title" style={{ backgroundColor: 'white', padding: '0.75rem' }}>
                    <p className="title" style={{ backgroundColor: 'white', padding: '0 10px', fontSize: '12px' }}>Question</p>
                    <textarea
                        value={question.question || ''}
                        onChange={(e) => onUpdateQuestion('question', e.target.value)}
                        placeholder="Type question..."
                        className="nes-textarea"
                        rows={3}
                        style={{ minHeight: '100px', fontSize: '14px', resize: 'none' }}
                    />
                </div>

                {/* Options Stack */}
                <div className="flex flex-col gap-2">
                    {question.options.map((opt: string, optIdx: number) => {
                        const isCorrect = question.correctAnswer === optIdx;
                        return (
                            <div
                                key={optIdx}
                                className={`nes-container is-rounded flex items-center`}
                                style={{
                                    padding: '0.5rem',
                                    display: 'flex',
                                    flexDirection: 'row',
                                    gap: '12px',
                                    alignItems: 'center',
                                    backgroundColor: isCorrect ? '#FFB6C1' : '#fff',
                                    borderColor: isCorrect ? '#FF69B4' : '#212529',
                                    transition: 'all 0.2s ease-out'
                                }}
                            >
                                {/* Pixel Badge: A/B/C/D */}
                                <div className="shrink-0">
                                    <span className={`nes-badge is-icon`}>
                                        <span className="is-dark" style={{ fontSize: '10px' }}>{['A', 'B', 'C', 'D'][optIdx]}</span>
                                        <span className={`is-${isCorrect ? 'success' : 'primary'}`}></span>
                                    </span>
                                </div>

                                {/* Input */}
                                <div className="flex-1" style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        value={opt}
                                        onChange={(e) => onUpdateOption(optIdx, e.target.value)}
                                        placeholder={`Option ${optIdx + 1}`}
                                        className={`nes-input`}
                                        style={{
                                            margin: 0,
                                            fontSize: '12px',
                                            height: 'auto',
                                            padding: '8px',
                                            width: '100%',
                                            backgroundColor: isCorrect ? '#4c7a5eff' : '#1a1515ff',
                                            color: 'white', // Ensure text is visible on dark backgrounds
                                        }}
                                    />
                                </div>

                                {/* Right Logic: Action Button */}
                                <button
                                    onClick={() => onUpdateQuestion('correctAnswer', optIdx)}
                                    className={`nes-btn ${isCorrect ? 'is-success' : ''} is-primary`}
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        padding: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '16px'
                                    }}
                                >
                                    {isCorrect ? '✓' : '?'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
