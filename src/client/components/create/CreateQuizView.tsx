import 'nes.css/css/nes.min.css';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Question } from '../../../shared/types/api';
import { QuizEditorPanel } from './primitives/QuizEditorPanel';

interface CreateQuizViewProps {
    username: string;
    onSave: (topic: string, questions: Question[]) => Promise<void>;
    onPost?: ((topic: string, questions: Question[]) => Promise<void>) | undefined;
    onBack: () => void;
    isSaving?: boolean | undefined;
    initialData?: { topic: string; questions: Question[] } | null;
}

export const CreateQuizView: React.FC<CreateQuizViewProps> = ({ onSave, onPost, onBack, isSaving = false, initialData }) => {
    const [step, setStep] = useState(initialData ? 1 : 0);
    const [topic, setTopic] = useState(initialData?.topic || '');
    const [questions, setQuestions] = useState<Question[]>(
        initialData?.questions || Array(5).fill(null).map((_, i) => ({
            id: `manual-${i}`,
            question: '',
            options: ['', '', '', ''],
            correctAnswer: 0,
        }))
    );
    const [validationError, setValidationError] = useState<string | null>(null);

    // Auto-dismiss validation after 2.5s
    useEffect(() => {
        if (validationError) {
            const timer = setTimeout(() => setValidationError(null), 2500);
            return () => clearTimeout(timer);
        }
    }, [validationError]);

    const handleNext = () => {
        setValidationError(null);
        if (step === 0 && !topic.trim()) {
            setValidationError('Topic is required!');
            return;
        }
        if (step > 0 && step <= 5) {
            const q = questions[step - 1];
            if (!q || !q.question.trim()) {
                setValidationError('Enter a question!');
                return;
            }
            if (q.options.some(opt => !opt.trim())) {
                setValidationError('Fill all options!');
                return;
            }
        }
        setStep(s => Math.min(s + 1, 6));
    };

    const updateQuestion = (index: number, field: keyof Question, value: any) => {
        if (validationError) setValidationError(null);
        const newQs = [...questions];
        if (newQs[index]) {
            newQs[index] = { ...newQs[index], [field]: value };
            setQuestions(newQs);
        }
    };

    const updateOption = (qIndex: number, oIndex: number, text: string) => {
        if (validationError) setValidationError(null);
        const newQs = [...questions];
        if (newQs[qIndex]) {
            const newOptions = [...newQs[qIndex].options];
            newOptions[oIndex] = text;
            newQs[qIndex] = { ...newQs[qIndex], options: newOptions };
            setQuestions(newQs);
        }
    };

    return (
        <div className="w-full min-h-screen flex flex-col items-center justify-center p-2 relative" style={{ backgroundColor: '#FFF0F5', fontFamily: '"Poppins", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
            {/* Background Pattern */}
            <div style={{
                position: 'absolute', inset: 0, opacity: 0.08,
                backgroundImage: 'radial-gradient(#FFB6C1 2px, transparent 2px)',
                backgroundSize: '24px 24px', pointerEvents: 'none'
            }} />

            {/* Validation Toast - Floating NES Style */}
            <AnimatePresence>
                {validationError && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-8 left-0 right-0 z-[100] flex justify-center pointer-events-none"
                    >
                        <div className="nes-container is-rounded is-dark is-centered" style={{ display: 'inline-block', padding: '1rem', border: '4px solid white' }}>
                            <p style={{ margin: 0, color: 'white' }}>{validationError}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Canvas */}
            <div className="w-full max-w-3xl relative z-10">
                <div className="nes-container is-rounded with-title" style={{ backgroundColor: 'white', minHeight: '600px', padding: '1rem' }}>
                    <p className="title" style={{ backgroundColor: 'white' }}>Create Quiz</p>

                    <div className="flex justify-between items-center mb-4 pb-2" style={{ borderBottom: '2px solid #f0f0f0' }}>
                        <button type="button" className="nes-btn" onClick={() => (step === 0 ? onBack() : setStep(s => s - 1))} style={{ fontSize: '0.8rem' }}>
                            &lt; Back
                        </button>
                        <span className="nes-text is-primary" style={{ fontSize: '0.8rem' }}>
                            {step === 0 ? 'Start' : step === 6 ? 'Review' : `Q${step} of 5`}
                        </span>
                    </div>

                    <div className="flex-1 flex flex-col relative">
                        <AnimatePresence mode="wait">
                            {/* TOPIC STEP */}
                            {step === 0 && (
                                <motion.div
                                    key="topic"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="flex flex-col gap-8 py-8 items-center"
                                >
                                    <div className="nes-field w-full max-w-md">
                                        <label htmlFor="topic_field" style={{ marginBottom: '1rem', display: 'block' }}>What is your quiz about?</label>
                                        <input
                                            type="text"
                                            id="topic_field"
                                            className="nes-input"
                                            value={topic}
                                            onChange={(e) => setTopic(e.target.value)}
                                            placeholder="e.g. Retro Games"
                                            autoFocus
                                            style={{ textAlign: 'center' }}
                                        />
                                    </div>
                                    <div className="w-full max-w-md mt-4">
                                        <button type="button" className="nes-btn is-primary w-full" onClick={handleNext}>
                                            Start Building
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* EDITOR STEPS */}
                            {step >= 1 && step <= 5 && (
                                <motion.div
                                    key={`q-${step}`}
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex flex-col h-full"
                                >
                                    <QuizEditorPanel
                                        question={questions[step - 1]!}
                                        topic={topic}
                                        stepNumber={step}
                                        totalSteps={5}
                                        onUpdateQuestion={(field, val) => updateQuestion(step - 1, field, val)}
                                        onUpdateOption={(optIdx, val) => updateOption(step - 1, optIdx, val)}
                                    />

                                    {/* Anchored Next Button */}
                                    <div className="mt-8 pt-4 w-full flex justify-center">
                                        <button type="button" className="nes-btn is-primary w-full max-w-md" onClick={handleNext}>
                                            {step === 5 ? 'Review Quiz >' : 'Next Question >'}
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* REVIEW STEP */}
                            {step === 6 && (
                                <motion.div
                                    key="review"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col gap-4 py-4 w-full max-w-xl mx-auto"
                                >
                                    <h3 className="nes-text is-primary text-center mb-4">Ready to Launch?</h3>

                                    <div className="nes-container is-dark is-rounded flex justify-between p-4 mb-6">
                                        <div className="text-center">
                                            <span className="block text-xs mb-2">TOPIC</span>
                                            <span className="text-white">{topic}</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="block text-xs mb-2">Qs</span>
                                            <span className="nes-text is-success">5</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 mb-6">
                                        {questions.map((q, i) => (
                                            <div key={i} className="nes-container is-rounded" style={{ padding: '0.75rem', fontSize: '0.85rem', backgroundColor: 'white', color: 'black' }}>
                                                <span style={{ color: 'black' }}>
                                                    {i + 1}. {q.question || 'Empty'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex flex-col gap-4 mt-4">
                                        {onPost && (
                                            <button type="button" className={`nes-btn is-success ${isSaving ? 'is-disabled' : ''}`} onClick={() => onPost(topic, questions)} disabled={isSaving}>
                                                {isSaving ? 'Posting...' : 'Post to Reddit'}
                                            </button>
                                        )}
                                        <button type="button" className={`nes-btn ${isSaving ? 'is-disabled' : ''}`} onClick={() => onSave(topic, questions)} disabled={isSaving}>
                                            Save to Library
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};
