import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InteractiveRobot } from '../InteractiveRobot';
import { Question } from '../../../shared/types/api';

interface CreateQuizViewProps {
    username: string;
    onSave: (topic: string, questions: Question[]) => Promise<void>;
    onPost?: ((topic: string, questions: Question[]) => Promise<void>) | undefined;
    onBack: () => void;
    isSaving?: boolean | undefined;
    initialData?: { topic: string; questions: Question[] } | null;
}

export const CreateQuizView: React.FC<CreateQuizViewProps> = ({ username, onSave, onPost, onBack, isSaving = false, initialData }) => {
    useEffect(() => console.log('[CreateQuizView] Mounted', { initialData }), []);
    const [step, setStep] = useState(initialData ? 1 : 0); // Skip topic selection if editing
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

    const handleNext = () => {
        setValidationError(null);
        if (step === 0 && !topic.trim()) {
            setValidationError('Please enter a topic name!');
            return;
        }
        if (step > 0 && step <= 5) {
            const qIndex = step - 1;
            const q = questions[qIndex];
            if (!q || !q.question.trim()) {
                setValidationError('Please enter the question text.');
                return;
            }
            if (q.options.some((opt: string) => !opt.trim())) {
                setValidationError('Please fill in all 4 options.');
                return;
            }
        }
        setStep(s => Math.min(s + 1, 6));
    };

    const handleBackStep = () => {
        setValidationError(null);
        if (step === 0) {
            onBack();
        } else {
            setStep(s => s - 1);
        }
    };

    const updateQuestion = (index: number, field: keyof Question, value: any) => {
        const newQs = [...questions];
        const target = newQs[index];
        if (target) {
            newQs[index] = { ...target, [field]: value };
            setQuestions(newQs);
        }
    };

    const updateOption = (qIndex: number, oIndex: number, text: string) => {
        const newQs = [...questions];
        const target = newQs[qIndex];
        if (target) {
            const newOptions = [...target.options];
            newOptions[oIndex] = text;
            newQs[qIndex] = { ...target, options: newOptions };
            setQuestions(newQs);
        }
    };

    return (
        <div className="flex flex-col h-full w-full max-w-5xl mx-auto p-4 relative">
            {/* Header / Nav */}
            <div className="flex items-center justify-between mb-6">
                <button onClick={handleBackStep} className="modern-button px-3 py-1 text-sm bg-accent/20">
                    ← Back
                </button>
                <div className="text-center">
                    <h2 className="text-lg font-bold text-gradient">Create Quiz</h2>
                    <div className="flex gap-1 justify-center mt-1">
                        {[0, 1, 2, 3, 4, 5, 6].map(i => (
                            <div
                                key={i}
                                className={`h-1.5 w-6 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-white/20'}`}
                            />
                        ))}
                    </div>
                </div>
                <div className="w-16" /> {/* Spacer */}
            </div>

            <AnimatePresence mode="wait">

                {/* STEP 0: TOPIC SELECTION */}
                {step === 0 && (
                    <motion.div
                        key="step-topic"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        className="flex-1 flex flex-col justify-center items-center text-center space-y-6"
                    >
                        <InteractiveRobot username={username} forceState="happy" />

                        <div className="w-full max-w-md">
                            <label className="block text-secondary mb-2 text-sm font-bold uppercase tracking-wider">
                                What is your quiz about?
                            </label>
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="e.g., Space Exploration"
                                className="w-full bg-black/40 border-2 border-primary/50 rounded-xl p-4 text-xl text-center text-white focus:border-primary focus:outline-none transition-all"
                                autoFocus
                            />
                        </div>
                    </motion.div>
                )}

                {/* STEPS 1-5: QUESTIONS */}
                {step >= 1 && step <= 5 && questions[step - 1] && (
                    <motion.div
                        key={`step-q-${step}`}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        className="flex-1 overflow-y-auto pb-20 custom-scrollbar"
                    >
                        <div className="text-center mb-6">
                            <span className="inline-block bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-bold mb-2">
                                Question {step}/5
                            </span>
                            <h3 className="text-white text-xl font-bold">{topic}</h3>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-sm text-secondary uppercase font-bold mb-2 block">Question Text</label>
                                <textarea
                                    value={questions[step - 1]?.question || ''}
                                    onChange={(e) => updateQuestion(step - 1, 'question', e.target.value)}
                                    placeholder="Enter your question here..."
                                    className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-lg text-white focus:border-primary/50 focus:outline-none min-h-[120px]"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {questions[step - 1]?.options.map((opt: string, optIdx: number) => (
                                    <div key={optIdx} className="relative group">
                                        <input
                                            type="text"
                                            value={opt}
                                            onChange={(e) => updateOption(step - 1, optIdx, e.target.value)}
                                            placeholder={`Option ${optIdx + 1}`}
                                            className={`w-full bg-black/30 border-2 rounded-xl p-4 pr-16 text-base focus:outline-none transition-all min-h-[60px] ${questions[step - 1]?.correctAnswer === optIdx
                                                ? 'border-success bg-success/10 text-white'
                                                : 'border-white/10 text-secondary focus:border-primary/50'
                                                }`}
                                        />
                                        <button
                                            onClick={() => updateQuestion(step - 1, 'correctAnswer', optIdx)}
                                            className={`absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors shadow-lg z-10 ${questions[step - 1]?.correctAnswer === optIdx
                                                ? 'border-success bg-success text-black'
                                                : 'border-white/20 hover:border-white/50 bg-black/50'
                                                }`}
                                        >
                                            {questions[step - 1]?.correctAnswer === optIdx && <span className="font-bold text-lg">✓</span>}
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="text-center text-sm text-secondary/70 italic mt-4">
                                Tap the circle to mark the correct answer.
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* STEP 6: REVIEW */}
                {step === 6 && (
                    <motion.div
                        key="step-review"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex-1 flex flex-col items-center justify-center text-center space-y-6"
                    >
                        <InteractiveRobot username={username} forceState="happy" />

                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                                Ready to Publish?
                            </h2>
                            <p className="text-secondary max-w-xs mx-auto">
                                You've crafted a 5-question quiz about <strong className="text-white">{topic}</strong>.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 w-full max-w-sm mt-4">
                            <div className="modern-card p-4 text-center bg-black/20">
                                <div className="text-2xl font-bold text-white">5</div>
                                <div className="text-xs text-secondary">Questions</div>
                            </div>
                            <div className="modern-card p-4 text-center bg-black/20">
                                <div className="text-2xl font-bold text-success">Diff</div>
                                <div className="text-xs text-secondary">Mixed</div>
                            </div>
                        </div>

                        <div className="pt-4 w-full max-w-sm space-y-3">
                            {onPost && (
                                <button
                                    onClick={() => onPost(topic, questions)}
                                    disabled={isSaving}
                                    className="modern-button modern-button-xl w-full flex items-center justify-center gap-2"
                                >
                                    {isSaving ? 'Processing...' : <><span>🚀</span> Save & Post to Reddit</>}
                                </button>
                            )}

                            <button
                                onClick={() => onSave(topic, questions)}
                                disabled={isSaving}
                                className={`modern-button w-full flex items-center justify-center gap-2 ${onPost ? 'bg-white/10 hover:bg-white/20' : 'modern-button-xl'}`}
                            >
                                {isSaving ? 'Saving...' : <><span>💾</span> Save to My Library</>}
                            </button>

                            <p className="text-[10px] text-secondary mt-3 opacity-60">
                                By saving, you agree this content follows our community guidelines.
                            </p>
                        </div>
                    </motion.div>
                )}

            </AnimatePresence>

            {/* Validation Message */}
            {validationError && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-error text-white text-xs font-bold rounded-full shadow-lg z-50 whitespace-nowrap"
                >
                    ⚠️ {validationError}
                </motion.div>
            )}

            {/* Next Button (Shared for steps 0-5) */}
            {step < 6 && (
                <div className="mt-auto pt-4 flex justify-end">
                    <button
                        onClick={handleNext}
                        className="modern-button modern-button-primary px-8 py-3 font-bold"
                    >
                        {step === 5 ? 'Review >' : 'Next >'}
                    </button>
                </div>
            )}
        </div>
    );
};
