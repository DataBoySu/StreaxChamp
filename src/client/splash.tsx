import './index.css';
import 'nes.css/css/nes.min.css';
import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { requestExpandedMode } from '@devvit/web/client';
import { DailyQuiz } from './hooks/useQuizData';
import { useInlineQuiz } from './hooks/useInlineQuiz';
import { InlineQuiz } from './components/InlineQuiz';
import { CONFIG } from '../shared/constants';
import { requestCommunitySubscribe } from './services/SubscriptionService';



const Splash = () => {
    const [mode, setMode] = useState<'MENU' | 'CUSTOM_SPLASH' | 'QUIZ' | 'RESULTS'>('MENU');
    const [customQuizMeta, setCustomQuizMeta] = useState<{ title: string; creator?: string; quizId: string; postId: string } | null>(null);
    const [quizStats, setQuizStats] = useState<{ totalPlays: number; perfectScores: number } | null>(null);
    const [hasShared, setHasShared] = useState(false);
    const [quizData, setQuizData] = useState<DailyQuiz | null>(null);
    const [quizLoading, setQuizLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [username, setUsername] = useState<string | null>(null);

    const {
        currentIndex,
        selectedAnswerIndex,
        score,
        handleOptionSelect,
        handleNext
    } = useInlineQuiz(quizData, async (finalScore) => {
        if (customQuizMeta && username) {
            console.log(`[Splash] Custom Quiz Complete. Score: ${finalScore}. Submitting to Leaderboard...`);
            try {
                await fetch(`/api/leaderboard/${customQuizMeta.quizId}/submit`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userKey: username,
                        nickname: username,
                        score: finalScore,
                        slug: customQuizMeta.quizId
                    })
                });
                console.log('[Splash] Score submitted successfully.');
            } catch (e) {
                console.error('[Splash] Score submission failed', e);
            }
        }
        setMode('RESULTS');
    });

    useEffect(() => {
        const checkContext = async () => {
            try {
                setLoading(false);
                console.log('[Splash] Base splash rendered. Checking init...');

                const initRes = await fetch('/api/init');
                const initData = await initRes.json();
                console.log('[Splash] Init resolved:', initData);

                if (initData.customQuiz) {
                    console.log('[Splash] Custom post detected, enhancing UI...');
                    setUsername(initData.username);
                    setCustomQuizMeta({
                        title: initData.customQuiz.topic || 'Custom Quiz',
                        creator: initData.customQuiz.creatorId || initData.customQuiz.username,
                        quizId: initData.customQuiz.quizId,
                        postId: initData.postId || initData.customQuiz.postId // Capture PostID from init
                    });
                    setMode('CUSTOM_SPLASH');
                    setQuizLoading(true);

                    setQuizLoading(true);

                    console.log('[InlineQuiz] Loading quiz...');
                    // PARALLEL FETCH: Load quiz data AND live stats
                    const [res, statsRes] = await Promise.all([
                        fetch(`/api/quizzes/${initData.customQuiz.quizId}`),
                        fetch(`/api/stats/${initData.customQuiz.quizId}`)
                    ]);

                    if (res.ok) {
                        const rawData = await res.json();

                        // FIX: Normalize schema (String -> Index connection)
                        const normalizedQuestions = (rawData.questions || []).map((q: any) => {
                            const opts = q.options || q.answers || [];
                            let val = q.correctAnswer;
                            if (typeof val === 'string') val = opts.indexOf(val);
                            return { ...q, options: opts, correctAnswer: val };
                        });

                        const data: DailyQuiz = { ...rawData, questions: normalizedQuestions };
                        setQuizData(data);
                        console.log(`[InlineQuiz] Quiz loaded: ${data.questions.length} Qs`);
                    } else {
                        console.error('[InlineQuiz] Quiz load failed');
                    }

                    if (statsRes.ok) {
                        const stats = await statsRes.json();
                        setQuizStats(stats);
                    }
                    setQuizLoading(false);
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

    const handleGenerate = async (event: React.MouseEvent<HTMLButtonElement>) => {
        try {
            localStorage.removeItem('start_mode');
            await requestExpandedMode(event.nativeEvent, 'game');
        } catch (error) {
            console.error('[Splash] Failed to request expanded mode:', error);
        }
    };

    const handleCreate = async (event: React.MouseEvent<HTMLButtonElement>) => {
        try {
            localStorage.setItem('start_mode', 'create');
            await requestExpandedMode(event.nativeEvent, 'game');
        } catch (error) {
            console.error('[Splash] Failed to request expanded mode (create):', error);
        }
    };

    const handleShareScore = async () => {
        if (hasShared || !quizData) return;
        setHasShared(true); // Optimistic disable
        try {
            const tag = CONFIG.SHARE.TAGS_BY_SCORE[score as keyof typeof CONFIG.SHARE.TAGS_BY_SCORE] || CONFIG.SHARE.TAGS_BY_SCORE[5];
            const text = CONFIG.SHARE.TEMPLATE
                .replace('{score}', String(score))
                .replace('{total}', String(quizData.questions.length))
                .replace('{tag}', tag);

            // CALL SERVER ENDPOINT properly
            const targetId = customQuizMeta?.postId;
            if (targetId) {
                console.log('[Splash] Sharing score to post:', targetId);
                const res = await fetch('/api/share/comment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        postId: targetId,
                        quizId: customQuizMeta.quizId,
                        text: text
                    })
                });

                if (res.ok) {
                    console.log("[SHARE] Comment posted successfully (client view)");
                } else {
                    console.error("[SHARE] Server reported failure", res.status);
                    setHasShared(false); // Re-enable if failed?
                }
            } else {
                console.warn('[Splash] No PostID available to share comment');
            }
        } catch (e) {
            console.error('[Splash] Share failed', e);
        }
    };

    const renderMenu = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            <button type="button" className="nes-btn is-warning" style={{ width: '100%' }} onClick={handleCreate}>Create</button>
            <button type="button" className="nes-btn is-error" style={{ width: '100%' }} onClick={handleGenerate}>Generate</button>
        </div>
    );

    const renderCustomSplash = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
                <p style={{ marginBottom: '8px', fontSize: '0.75rem', color: '#6c757d' }}>TOPIC:</p>
                <p style={{ fontSize: '1.125rem', color: '#d63384' }}>{customQuizMeta?.title}</p>
                {customQuizMeta?.creator && (
                    <p style={{ marginTop: '8px', fontSize: '0.75rem', color: '#adb5bd' }}>Created by {customQuizMeta.creator}</p>
                )}
            </div>

            {quizLoading ? (
                <button type="button" className="nes-btn is-disabled" style={{ width: '100%' }} disabled>
                    Loading Quiz Data...
                </button>
            ) : !quizData ? (
                <button type="button" className="nes-btn is-error" style={{ width: '100%' }} disabled>
                    Error: Quiz Unavailable
                </button>
            ) : (
                <>
                    {quizStats && quizStats.totalPlays >= CONFIG.STATS.MIN_PLAYS && (
                        <div style={{ backgroundColor: '#212529', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.65rem', marginBottom: '8px' }}>
                            🔥 {Math.round((quizStats.perfectScores / quizStats.totalPlays) * 100)}% of players scored 5/5
                        </div>
                    )}
                    <button type="button" className="nes-btn is-primary" style={{ width: '100%' }} onClick={handleStartQuiz}>
                        Play Now!
                    </button>
                </>
            )}
        </div>
    );

    const renderResults = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', alignItems: 'center' }}>
            <h2 style={{ color: '#d63384', fontSize: '1.25rem' }}>Quiz Complete!</h2>

            <div className="nes-container is-rounded" style={{ padding: '1rem', width: '100%', backgroundColor: '#fff' }}>
                <p style={{ marginBottom: '8px' }}>Your Score:</p>
                <p style={{ fontSize: '1.875rem' }}>{score} / {quizData?.questions.length}</p>
            </div>

            {/* Primary Action: Join Community (Native) */}
            <button
                type="button"
                className="nes-btn is-primary"
                style={{ width: '100%' }}
                onClick={() => {
                    void requestCommunitySubscribe();
                }}
            >
                {CONFIG.COMMUNITY.CTA.JOIN}
            </button>

            {/* Custom: Share Score */}
            {mode === 'RESULTS' && customQuizMeta && (
                <button
                    type="button"
                    className={`nes-btn ${hasShared ? 'is-disabled' : 'is-success'}`}
                    style={{ width: '100%', marginTop: '8px' }}
                    disabled={hasShared}
                    onClick={handleShareScore}
                >
                    {hasShared ? 'Shared!' : 'Share My Score'}
                </button>
            )}


        </div>
    );



    return (
        <div style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#fff0f3',
            color: '#212529',
            padding: '16px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'Press Start 2P, Arial',
            overflow: 'hidden'
        }}>
            {/* Background Pattern */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: 0.2,
                backgroundImage: 'radial-gradient(#ff4d6d 2px, transparent 2px)',
                backgroundSize: '24px 24px',
                pointerEvents: 'none',
                zIndex: 1
            }} />

            {/* Main Content Area */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                minHeight: 0,
                position: 'relative',
                zIndex: 10
            }}>
                <div className="nes-container is-rounded" style={{
                    backgroundColor: 'white',
                    borderColor: '#212529',
                    borderWidth: '4px',
                    color: '#212529',
                    width: '100%',
                    padding: '24px 16px 16px 16px',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0
                }}>
                    <div style={{
                        color: '#d63384',
                        backgroundColor: 'white',
                        position: 'absolute',
                        top: '-12px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '0 12px',
                        textShadow: '2px 2px 0px #ffb3c1',
                        whiteSpace: 'nowrap',
                        zIndex: 20,
                        fontSize: '0.875rem'
                    }}>
                        {mode === 'QUIZ' ? 'Streax Game' : (customQuizMeta ? 'Challenger!' : 'Streax Quiz')}
                    </div>

                    {/* Content Router */}
                    <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0 }}>
                        {loading ? (
                            <p>Loading...</p>
                        ) : (
                            <>
                                {mode === 'MENU' && renderMenu()}
                                {mode === 'CUSTOM_SPLASH' && renderCustomSplash()}
                                {mode === 'QUIZ' && (
                                    <InlineQuiz
                                        quizData={quizData}
                                        currentIndex={currentIndex}
                                        selectedAnswerIndex={selectedAnswerIndex}
                                        onOptionSelect={handleOptionSelect}
                                        onNext={handleNext}
                                    />
                                )}
                                {mode === 'RESULTS' && renderResults()}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer style={{
                textAlign: 'center',
                marginTop: '12px',
                color: '#d63384',
                fontSize: '0.75rem',
                flexShrink: 0,
                zIndex: 10,
                position: 'relative'
            }}>
                <span>Powered by Gemini & Reddit</span>
            </footer>
        </div>
    );
};

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <Splash />
    </StrictMode>
);
