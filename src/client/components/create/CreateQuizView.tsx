import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InteractiveRobot } from '../InteractiveRobot';
import { Question } from '../../../shared/types/api';
import { FlowShell, FlowBody } from './primitives/FlowShell';
import { FlowHeader } from './primitives/FlowHeader';
import { FlowFooter } from './primitives/FlowFooter';
import { QuizEditorPanel } from './primitives/QuizEditorPanel';
import { NoticeCard } from './primitives/NoticeCard';

// 🎨 LOCAL THEME DEFINITION - LOCKED (Ignores Global Dark Mode)
const CREATE_THEME = {
    bg: '#F3EFE6',       // Warm Parchment / Stationery Beige
    canvasBg: '#e4c386ff', // Inner Canvas (Slightly darker)
    panelBg: '#FFF8F0',  // Input Background
    text: '#1f1f1f',     // Near Black
    border: '#1f1f1f',   // Strict Black Border
    accent: '#FF9DB5',   // Soft Pink CTA
    backBtn: '#E0D8CC',  // Back Button Bg
    shadow: '#1f1f1f'    // Strict Shadow
};

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
        // ROOT CONTAINER - THEME LOCKED
        // Uses relative positioning to Ensure it takes up space
        <div
            style={{
                minHeight: '100vh',
                width: '100%',
                position: 'relative',
                backgroundColor: CREATE_THEME.bg,
                color: CREATE_THEME.text,
                zIndex: 40,
                // Layout
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}
            className="font-sans"
        >
            <FlowShell className="z-50">
                {/* CUSTOM HEADER FOR SCENE 1 (TOPIC) */}
                {isTopic ? (
                    <div className="flex items-center justify-between mb-4 pt-4 px-4 w-full max-w-[720px] mx-auto">
                        {/* Physical Back Button - NES Style */}
                        <button
                            onClick={handleBackStep}
                            className="px-4 py-2 text-sm font-black uppercase tracking-wider transition-none"
                            style={{
                                backgroundColor: CREATE_THEME.backBtn,
                                border: `2px solid ${CREATE_THEME.border}`,
                                boxShadow: `3px 3px 0 0 ${CREATE_THEME.shadow}`,
                                color: CREATE_THEME.text,
                                transform: 'translate(0,0)'
                            }}
                            onMouseDown={(e) => {
                                e.currentTarget.style.transform = "translate(2px, 2px)";
                                e.currentTarget.style.boxShadow = `1px 1px 0 0 ${CREATE_THEME.shadow}`;
                            }}
                            onMouseUp={(e) => {
                                e.currentTarget.style.transform = "translate(0, 0)";
                                e.currentTarget.style.boxShadow = `3px 3px 0 0 ${CREATE_THEME.shadow}`;
                            }}
                        >
                            ← Back
                        </button>

                        {/* Centered Title - High Contrast */}
                        <h1 className="text-xl font-black uppercase tracking-widest text-center" style={{ color: CREATE_THEME.text }}>
                            Create Quiz
                        </h1>

                        <div className="w-20"></div> {/* Spacer for alignment */}
                    </div>
                ) : (
                    <FlowHeader
                        title="Create Quiz"
                        onBack={handleBackStep}
                        currentStep={step}
                        totalSteps={6}
                    />
                )}

                <FlowBody className={isEditor ? '' : 'flex flex-col justify-center'}>
                    <AnimatePresence mode="wait">

                        {/* STEP 0: TOPIC SELECTION */}
                        {isTopic && (
                            <motion.div
                                key="step-topic"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                className="w-full flex justify-center px-4"
                            >
                                {/* INNER CANVAS - THEME LOCKED & BOUNDED */}
                                <div
                                    className="flex flex-col items-center relative mb-16 w-full"
                                    style={{
                                        backgroundColor: CREATE_THEME.canvasBg,
                                        border: `3px solid ${CREATE_THEME.border}`,
                                        boxShadow: `6px 6px 0 0 ${CREATE_THEME.shadow}`,
                                        maxWidth: '720px',
                                        padding: '24px',
                                        // "Float" effect
                                    }}
                                >
                                    {/* 1. Mascot Anchor Wrapper (Dialogue Safety Zone) */}
                                    {/* Padding top is RESERVED for dialogue bubbles so they don't clip. */}
                                    <div
                                        className="w-full relative flex flex-col items-center justify-end pt-[48px] md:pt-[64px]"
                                        style={{ overflow: 'visible' }}
                                    >
                                        <div className="transform scale-90 origin-bottom relative">
                                            <InteractiveRobot username={username} forceState="happy" />
                                        </div>
                                    </div>

                                    <div className="w-full flex flex-col relative z-10">
                                        {/* 2. Title */}
                                        <label
                                            className="block text-lg font-black uppercase tracking-wide text-center"
                                            style={{
                                                color: CREATE_THEME.text,
                                                marginTop: '12px',
                                                marginBottom: '8px'
                                            }}
                                        >
                                            What is your quiz about?
                                        </label>

                                        {/* 3. Input Field (Rectangular, NO rounded) */}
                                        <input
                                            type="text"
                                            value={topic}
                                            onChange={(e) => setTopic(e.target.value)}
                                            placeholder="e.g., Space Exploration"
                                            style={{
                                                height: '44px',
                                                backgroundColor: CREATE_THEME.panelBg,
                                                border: `2px solid ${CREATE_THEME.border}`,
                                                color: CREATE_THEME.text,
                                                outline: 'none'
                                            }}
                                            className="w-full rounded-none px-3 py-2 text-lg text-center font-bold tracking-tight transition-all focus:border-black placeholder:opacity-40"
                                            autoFocus
                                        />
                                    </div>

                                    {/* 4. Primary CTA (Full Width, Pink, Physical) */}
                                    <div className="w-full mt-8">
                                        <button
                                            onClick={handleNext}
                                            className="w-full text-lg font-black uppercase tracking-widest transition-none"
                                            style={{
                                                height: '48px',
                                                backgroundColor: CREATE_THEME.accent,
                                                color: '#FFFFFF',
                                                border: `3px solid ${CREATE_THEME.border}`,
                                                boxShadow: `4px 4px 0 0 ${CREATE_THEME.shadow}`,
                                                transform: 'translate(0, 0)',
                                                textShadow: '1px 1px 0px rgba(0,0,0,0.2)'
                                            }}
                                            onMouseEnter={(e) => {
                                                // Hover visual feedback
                                                e.currentTarget.style.filter = 'brightness(1.05)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = "translate(0, 0)";
                                                e.currentTarget.style.boxShadow = `4px 4px 0 0 ${CREATE_THEME.shadow}`;
                                                e.currentTarget.style.filter = 'brightness(1)';
                                            }}
                                            onMouseDown={(e) => {
                                                e.currentTarget.style.transform = "translate(2px, 2px)";
                                                e.currentTarget.style.boxShadow = `2px 2px 0 0 ${CREATE_THEME.shadow}`;
                                            }}
                                            onMouseUp={(e) => {
                                                e.currentTarget.style.transform = "translate(0, 0)";
                                                e.currentTarget.style.boxShadow = `4px 4px 0 0 ${CREATE_THEME.shadow}`;
                                            }}
                                        >
                                            Start Building &gt;
                                        </button>
                                    </div>
                                </div>

                            </motion.div>
                        )}


                        {/* STEPS 1-5: QUESTIONS */}
                        {isEditor && (() => {
                            const currentQ = questions[step - 1];
                            if (!currentQ) return null;
                            return (
                                <motion.div
                                    key={`step-q-${step}`}
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    className="h-full"
                                >
                                    <QuizEditorPanel
                                        question={currentQ}
                                        topic={topic}
                                        stepNumber={step}
                                        totalSteps={5}
                                        onUpdateQuestion={(field, val) => updateQuestion(step - 1, field, val)}
                                        onUpdateOption={(optIdx, val) => updateOption(step - 1, optIdx, val)}
                                    />
                                </motion.div>
                            );
                        })()}

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

                {/* Footer Navigation - HIDE on Step 0 since we have custom one */}
                {!isTopic && !isReview && (
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
                        {...(onPost ? {
                            primaryAction: {
                                label: isSaving ? 'Processing...' : <><span className="mr-2">🚀</span> Save & Post to Reddit</>,
                                onClick: () => onPost(topic, questions),
                                disabled: isSaving
                            }
                        } : {})}
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
        </div>
    );
};
