import './index.css';
import 'nes.css/css/nes.min.css';
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';

const Splash = () => {
    // 1. Introduce mode state (Single Canvas State)
    const [mode, setMode] = useState<'MENU' | 'QUIZ'>('MENU');

    const handleStartQuiz = () => {
        console.log('[Splash] Starting hardcoded quiz...');
        setMode('QUIZ');
    };

    const handleOptionClick = (option: string) => {
        console.log(`[Splash] Option clicked: ${option}`);
    };

    return (
        <div className="flex flex-col items-center min-h-screen p-4 font-['Press_Start_2P'] relative overflow-hidden"
            style={{ backgroundColor: '#fff0f3', color: '#212529' }}>

            {/* Background Pattern: Polka dots */}
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

                    {/* Title */}
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
                        {mode === 'MENU' ? 'Streax Quiz' : 'Quiz Time!'}
                    </p>

                    {/* SINGLE CANVAS LOGIC SWITCH */}
                    {mode === 'MENU' ? (
                        /* MENU MODE UI */
                        <div className="flex flex-col md:flex-row w-full mt-6 mb-2 md:justify-center"
                            style={{
                                gap: '24px',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                            {/* Create Button - TRANSITION TO QUIZ */}
                            <button
                                type="button"
                                className="nes-btn is-warning"
                                style={{
                                    height: 'auto',
                                    minHeight: '60px',
                                    fontSize: '1.1rem',
                                    padding: '10px',
                                    color: '#212529',
                                    margin: '0',
                                    width: '100%'
                                }}
                                onClick={handleStartQuiz}
                            >
                                Play Demo
                            </button>

                            {/* Generate Button - TRANSITION TO QUIZ */}
                            <button
                                type="button"
                                className="nes-btn is-error"
                                style={{
                                    height: 'auto',
                                    minHeight: '60px',
                                    fontSize: '1.1rem',
                                    padding: '10px',
                                    margin: '0',
                                    width: '100%'
                                }}
                                onClick={handleStartQuiz}
                            >
                                Generate
                            </button>
                        </div>
                    ) : (
                        /* QUIZ MODE UI (Hardcoded) */
                        <div className="w-full text-left">
                            <div className="mb-6">
                                <p style={{ fontSize: '1.2rem', marginBottom: '1rem', lineHeight: '1.5' }}>
                                    What is 2 + 2?
                                </p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {['3', '4', '5', '6'].map((opt) => (
                                    <button
                                        key={opt}
                                        type="button"
                                        className="nes-btn"
                                        style={{ width: '100%', textAlign: 'left' }}
                                        onClick={() => handleOptionClick(opt)}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>

                            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '10px', color: '#aaa' }}>
                                INLINE SINGLE CANVAS TEST
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Sticky Bottom Footer */}
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
