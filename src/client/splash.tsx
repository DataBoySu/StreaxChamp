import './index.css';
import 'nes.css/css/nes.min.css';
import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { requestExpandedMode } from '@devvit/web/client';
import { DailyQuiz } from './hooks/useQuizData';

const Splash = () => {
    // 1. Single Canvas State
    const [mode, setMode] = useState<'MENU' | 'CUSTOM_SPLASH' | 'QUIZ'>('MENU');
    const [customQuizMeta, setCustomQuizMeta] = useState<{ title: string; creator?: string; quizId: string } | null>(null);
    const [quizData, setQuizData] = useState<DailyQuiz | null>(null);
    const [quizLoading, setQuizLoading] = useState(false); // Explicit quiz loading state
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Initial check for custom quiz context
    useEffect(() => {
        const checkContext = async () => {
            try {
                // Ensure Splash UI is visible immediately while we check status
                setLoading(false);
                console.log('[Splash] Base splash rendered. Checking init...');

                const initRes = await fetch('/api/init');
                const initData = await initRes.json();
                console.log('[Splash] Init resolved:', initData);

                if (initData.customQuiz) {
                    console.log('[Splash] Custom post detected, enhancing UI...');
                    setCustomQuizMeta({
                        title: initData.customQuiz.topic || 'Custom Quiz',
                        creator: initData.customQuiz.creatorId || initData.customQuiz.username,
                        quizId: initData.customQuiz.quizId
                    });
                    setMode('CUSTOM_SPLASH');
                    setQuizLoading(true); // START LOADING

                    // PRE-FETCH DATA
                    console.log('[InlineQuiz] Loading quiz...');
                    const res = await fetch(`/api/quizzes/${initData.customQuiz.quizId}`);
                    if (res.ok) {
                        const data: DailyQuiz = await res.json();
                        setQuizData(data);
                        console.log(`[InlineQuiz] Quiz loaded with ${data.questions.length} questions`);
                    } else {
                        console.error('[InlineQuiz] Quiz load failed');
                    }
                    setQuizLoading(false); // FINISH LOADING
                }
            } catch (e) {
                console.error('[Splash] Context check failed', e);
            }
        };
        checkContext();
    }, []);

    const handleStartQuiz = () => {
        if (mode === 'CUSTOM_SPLASH') {
            if (quizData) {
                console.log('[InlineQuiz] Starting custom quiz');
                setMode('QUIZ');
            } else {
                console.warn('[InlineQuiz] Cannot start, quiz data missing');
            }
        } else {
            console.log('[Splash] Starting hardcoded/demo quiz...');
            setMode('QUIZ');
        }
    };

    const handleOptionSelect = (option: string) => {
        console.log(`[InlineQuiz] Option selected: ${option}`);
        setSelectedAnswer(option);
    };

    const handleNext = () => {
        if (!quizData) return;

        const nextIdx = currentIndex + 1;
        if (nextIdx < quizData.questions.length) {
            console.log(`[InlineQuiz] Rendering question ${nextIdx}`);
            setCurrentIndex(nextIdx);
            setSelectedAnswer(null);
        } else {
            console.log('[InlineQuiz] End of quiz reached (results pending)');
            // TODO: Results screen
        }
    };

    // logic to handle expansion using the proper Devvit API
    const handleGenerate = async (event: React.MouseEvent<HTMLButtonElement>) => {
        try {
            localStorage.removeItem('start_mode'); // Clear creation mode
            // Use the official Devvit API to request expanded mode
            await requestExpandedMode(event.nativeEvent, 'game');
        } catch (error) {
            console.error('[Splash] Failed to request expanded mode:', error);
        }
    };

    const handleCreate = async (event: React.MouseEvent<HTMLButtonElement>) => {
        try {
            localStorage.setItem('start_mode', 'create'); // Set creation mode
            await requestExpandedMode(event.nativeEvent, 'game');
        } catch (error) {
            console.error('[Splash] Failed to request expanded mode (create):', error);
        }
    };

    // --- RENDER HELPERS ---

    const renderMenu = () => (
        <div className="flex flex-col md:flex-row w-full mt-6 mb-2 md:justify-center"
            style={{ gap: '24px', display: 'flex', flexDirection: 'column' }}>
            {/* Standard "Create" and "Generate" buttons for normal posts */}
            <button type="button" className="nes-btn is-warning" style={{ width: '100%' }} onClick={handleCreate}>Create</button>
            <button type="button" className="nes-btn is-error" style={{ width: '100%' }} onClick={handleGenerate}>Generate</button>
        </div>
    );

    const renderCustomSplash = () => (
        <div className="flex flex-col items-center w-full space-y-4">
            <div className="mb-4">
                <p className="mb-2" style={{ fontSize: '0.8rem', color: '#6c757d' }}>TOPIC:</p>
                <p className="text-xl text-primary" style={{ color: '#d63384' }}>{customQuizMeta?.title}</p>
                {customQuizMeta?.creator && (
                    <p className="mt-2 text-xs" style={{ color: '#adb5bd' }}>Created by {customQuizMeta.creator}</p>
                )}
            </div>

            {/* SAFE LOADING UI */}
            {quizLoading ? (
                <button
                    type="button"
                    className="nes-btn is-disabled"
                    style={{ width: '100%', minHeight: '60px' }}
                    disabled
                >
                    Loading Quiz Data...
                </button>
            ) : !quizData ? (
                <button
                    type="button"
                    className="nes-btn is-error"
                    style={{ width: '100%', minHeight: '60px' }}
                    disabled
                >
                    Error: Quiz Unavailable
                </button>
            ) : (
                <button
                    type="button"
                    className="nes-btn is-primary"
                    style={{ width: '100%', minHeight: '60px' }}
                    onClick={handleStartQuiz}
                >
                    Play Now!
                </button>
            )}
        </div>
    );

    const renderQuiz = () => {
        if (!quizData) {
            return <p>Loading quiz…</p>;
        }

        const question = quizData.questions[currentIndex];

        if (!question || !question.options) {
            return <p>Invalid quiz data</p>;
        }

        return (
            <div className="w-full text-left">
                <div style={{ marginBottom: '1rem', color: '#6c757d', fontSize: '0.8rem' }}>
                    Question {currentIndex + 1} of {quizData.questions.length}
                </div>

                <h3 style={{ marginBottom: '1.5rem', lineHeight: '1.4' }}>
                    {question.question}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '1.5rem' }}>
                    {question.options.map((ans: string, idx: number) => {
                        const isSelected = selectedAnswer === ans;
                        return (
                            <button
                                key={idx}
                                className={`nes-btn ${isSelected ? 'is-primary' : ''}`}
                                style={{ width: '100%', textAlign: 'left' }}
                                onClick={() => handleOptionSelect(ans)}
                            >
                                {ans}
                            </button>
                        );
                    })}
                </div>

                <button
                    className={`nes-btn ${selectedAnswer ? 'is-success' : 'is-disabled'}`}
                    disabled={!selectedAnswer}
                    onClick={handleNext}
                    style={{ width: '100%' }}
                >
                    {currentIndex === quizData.questions.length - 1 ? 'Finish' : 'Next >'}
                </button>
            </div>
        );
    };


    return (
        <div className="flex flex-col items-center min-h-screen p-4 font-['Press_Start_2P'] relative overflow-hidden"
            style={{ backgroundColor: '#fff0f3', color: '#212529' }}>

            {/* Background Pattern */}
            <div className="absolute inset-0 pointer-events-none"
                style={{
                    opacity: 0.2,
                    backgroundImage: 'radial-gradient(#ff4d6d 2px, transparent 2px)',
                    backgroundSize: '24px 24px'
                }}>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center w-full z-10">
                <div className="nes-container is-rounded with-title p-8 text-center relative mt-12 shadow-xl flex flex-col items-center"
                    style={{
                        backgroundColor: 'white',
                        borderColor: '#212529',
                        borderWidth: '4px',
                        color: '#212529',
                        width: '90%',
                        maxWidth: '800px',
                    }}>

                    <p className="title text-base sm:text-3xl mb-8"
                        style={{
                            color: '#d63384',
                            backgroundColor: 'white',
                            position: 'absolute',
                            top: '-1.2rem',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            padding: '0 15px',
                            textShadow: '2px 2px 0px #ffb3c1',
                            whiteSpace: 'nowrap',
                            zIndex: 20
                        }}>
                        {mode === 'QUIZ' ? 'Streax Game' : (customQuizMeta ? 'Challenger!' : 'Streax Quiz')}
                    </p>

                    {/* SINGLE CANVAS ROUTING */}
                    {loading ? (
                        <p>Loading...</p>
                    ) : (
                        <>
                            {mode === 'MENU' && renderMenu()}
                            {mode === 'CUSTOM_SPLASH' && renderCustomSplash()}
                            {mode === 'QUIZ' && renderQuiz()}
                        </>
                    )}
                </div>
            </div>
            <footer className="text-xs text-center mt-auto py-6 z-10" style={{ color: '#d63384' }}>
                <span className="nes-text">Powered by Gemini & Reddit</span>
            </footer>
        </div>
    );
};

// Add media query styles directly in a style tag for desktop layout
const styleElement = document.createElement('style');
styleElement.textContent = `
    @media (min-width: 768px) {
        .splash-btn-container {
            flex-direction: row !important;
        }
        .splash-btn {
            width: 200px !important;
        }
    }
`;
document.head.appendChild(styleElement);

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <Splash />
    </StrictMode>
);
