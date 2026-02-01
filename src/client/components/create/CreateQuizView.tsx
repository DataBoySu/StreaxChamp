import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InteractiveRobot } from '../InteractiveRobot';
import { Question } from '../../../shared/types/api';
import { FlowShell, FlowBody } from './primitives/FlowShell';
import { FlowHeader } from './primitives/FlowHeader';
import { FlowFooter } from './primitives/FlowFooter';
import { QuizEditorPanel } from './primitives/QuizEditorPanel';
import { NoticeCard } from './primitives/NoticeCard';

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

    // Determine current header/footer props based on step
    const isReview = step === 6;
    const isTopic = step === 0;
    const isEditor = step >= 1 && step <= 5;

    return (
        <FlowShell>
            <FlowHeader
                title="Create Quiz"
                onBack={handleBackStep}
                currentStep={step}
                totalSteps={6}
            />

            <FlowBody className={isEditor ? '' : 'flex flex-col justify-center'}>
                <AnimatePresence mode="wait">

                    {/* STEP 0: TOPIC SELECTION */}
                    {isTopic && (
                        <motion.div
                            key="step-topic"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex-1 flex flex-col justify-center items-center text-center space-y-6 w-full max-w-lg mx-auto"
                        >
                            {/* Z-2 Panel Container */}
                            <div className="modern-card p-8 w-full flex flex-col items-center gap-6 bg-card border-2 border-border">
                                <InteractiveRobot username={username} forceState="happy" />

                                <div className="w-full">
                                    <label className="block text-secondary mb-3 text-sm font-bold uppercase tracking-wider">
                                        What is your quiz about?
                                    </label>

                                    {/* Z-1 Recessed Input */}
                                    <input
                                        type="text"
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        placeholder="e.g., Space Exploration"
                                        className="w-full bg-black/20 border-2 border-white/20 rounded-xl p-4 text-xl text-center text-primary focus:border-accent focus:outline-none transition-all placeholder:text-secondary/50"
                                        autoFocus
                                    />
                                    <p className="text-xs text-secondary mt-2">
                                        Enter a topic to generate questions.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}


                    {/* STEPS 1-5: QUESTIONS */}
                    {isEditor && questions[step - 1] && (
                        <motion.div
                            key={`step-q-${step}`}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="h-full"
                        >
                            <QuizEditorPanel
                                question={questions[step - 1]}
                                topic={topic}
                                stepNumber={step}
                                totalSteps={5}
                                onUpdateQuestion={(field, val) => updateQuestion(step - 1, field, val)}
                                onUpdateOption={(optIdx, val) => updateOption(step - 1, optIdx, val)}
                            />
                        </motion.div>
                    )}

                    {/* STEP 6: REVIEW */}
                    {isReview && (
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
                        </motion.div>
                    )}

                </AnimatePresence>
            </FlowBody>

            {/* Validation Message */}
            {validationError && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50"
                >
                    <NoticeCard type="error" message={validationError} />
                </motion.div>
            )}

            {/* Footer Navigation */}
            {!isReview && (
                <FlowFooter
                    primaryAction={{
                        label: step === 5 ? 'Review >' : 'Next >',
                        onClick: handleNext
                    }}
                />
            )}

            {/* Custom Footer for Review Step */}
            {isReview && (
                <FlowFooter
                    className="w-full max-w-sm mx-auto"
                    primaryAction={onPost ? {
                        label: isSaving ? 'Processing...' : <><span className="mr-2">🚀</span> Save & Post to Reddit</>,
                        onClick: () => onPost(topic, questions),
                        disabled: isSaving
                    } : undefined}
                    secondaryAction={{
                        label: isSaving ? 'Saving...' : <><span className="mr-2">💾</span> Save to My Library</>,
                        onClick: () => onSave(topic, questions),
                        disabled: isSaving
                    }}
                >
                    <p className="text-[10px] text-center text-secondary opacity-60">
                        By saving, you agree this content follows our community guidelines.
                    </p>
                </FlowFooter>
            )}
        </FlowShell>
    );
};
