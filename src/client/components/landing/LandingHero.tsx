import React from 'react';
import { motion } from 'framer-motion';
import LoadingDots from '../LoadingDots';
import { GeneratorShell } from './GeneratorShell';
import { HeroSection } from './HeroSection';
import { GlobalDashboard } from '../dashboard/GlobalDashboard';
import { CONFIG } from '../../../shared/constants';
import { LandingSummaryData } from '../../hooks/useLandingSummary';

interface RobotError {
    code: string;
    robotDialogue: string;
    timestamp: number;
    persistent?: boolean;
}

interface LandingHeroProps {
    username: string;
    selectedTopic: { title: string; slug: string } | null;
    topicQuizStatus: 'idle' | 'loading' | 'ready' | 'error';
    onOpenTopicMenu: () => void;
    onStartQuiz: () => void;
    totalQuestions: number;
    showTimeoutMessage?: boolean;
    hasPlayed?: boolean;
    totalPoints?: number;
    dailyCompleted?: boolean;
    dailyQuizLoading?: boolean;
    onBrowseArchive?: () => void;
    onClearTopic?: () => void;
    userRank?: number | null;
    timerDuration?: number;
    currentError: RobotError | null;
    queueLength: number;
    clearErrors: () => void;
    landingSummary: LandingSummaryData | null;
    landingSummaryLoading: boolean;
    onSelectTopic: (slug: string, title: string) => void;
    authUser: { nickname: string } | null;
    history: any[];
    historyLoading: boolean;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
    username,
    selectedTopic,
    topicQuizStatus,
    onOpenTopicMenu,
    onStartQuiz,
    totalQuestions,
    hasPlayed = false,
    totalPoints = 0,
    dailyCompleted = false,
    dailyQuizLoading = false,
    onBrowseArchive,
    onClearTopic,
    userRank,
    timerDuration = CONFIG.GAME.TIMER_DURATION,
    currentError,
    queueLength,
    clearErrors,
    landingSummary,
    landingSummaryLoading,
    onSelectTopic,
    authUser,
    history,
    historyLoading
}) => {
    return (
        <GeneratorShell>
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                {/* Floating Gaming Icons */}
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute text-xl opacity-20"
                        style={{
                            left: `${15 + i * 15}%`,
                            top: `${20 + (i % 3) * 20}%`,
                        }}
                        animate={{
                            y: [0, -15, 0],
                            rotate: [0, 360],
                            scale: [1, 1.1, 1],
                        }}
                        transition={{
                            duration: 3 + i,
                            repeat: Infinity,
                            delay: i * 0.5,
                        }}
                    >
                        {['🎮', '🏆', '⚡', '🔥', '💎', '🎯'][i]}
                    </motion.div>
                ))}
            </div>

            {/* Combined Section: Hero, Robot & Quiz Actions */}
            <div
                className="nes-container is-dark w-full relative z-10"
                style={{
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    border: '4px solid #dc2626',
                    borderRadius: 0,
                    boxShadow: '0 0 40px rgba(0, 255, 136, 0.15), 8px 8px 0px rgba(0, 0, 0, 0.3)',
                    padding: '1.5rem 1rem',
                    boxSizing: 'border-box',
                    marginBottom: '2rem',
                }}
            >
                <HeroSection
                    username={username}
                    hasPlayed={hasPlayed}
                    totalPoints={totalPoints}
                    currentError={currentError}
                    queueLength={queueLength}
                    clearErrors={clearErrors}
                />

                {/* Actions & Stats Container - Reduced gap */}
                <div className="relative z-10 w-full flex flex-col items-center gap-6 mt-4">
                    {/* Topic Select & Daily Quiz Buttons - Resized for clarity */}
                    <motion.div
                        className="flex justify-center gap-4 items-center flex-wrap"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <button
                            onClick={onOpenTopicMenu}
                            className="nes-btn is-error"
                            style={{
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: 'clamp(0.65rem, 2.5vw, 0.9rem)', // Increased font size
                                padding: '1.25rem 2rem', // Increased padding
                                boxShadow: '0 0 20px rgba(220, 38, 38, 0.3)',
                                minWidth: '180px',
                            }}
                        >
                            {selectedTopic ? `${selectedTopic.title}` : 'Topic Select'}
                        </button>
                        <button
                            onClick={() => {
                                if (onClearTopic) onClearTopic();
                                if (onBrowseArchive) onBrowseArchive();
                            }}
                            className="nes-btn is-primary"
                            style={{
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: 'clamp(0.65rem, 2.5vw, 0.9rem)', // Increased font size
                                padding: '1.25rem 2rem', // Increased padding
                                boxShadow: '0 0 20px rgba(0, 255, 136, 0.3)',
                                minWidth: '180px',
                            }}
                        >
                            Daily Quiz
                        </button>
                    </motion.div>

                    {/* Stats Display - Cyberpunk Dark Containers */}
                    <motion.div
                        className="grid grid-cols-3 gap-3 max-w-lg w-full px-2"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        {/* Questions - Cyan Neon */}
                        <div
                            className="nes-container is-dark flex flex-col items-center justify-center"
                            style={{
                                backgroundColor: 'rgba(0, 255, 136, 0.05)',
                                border: '3px solid #00ff88',
                                boxShadow: '0 0 15px rgba(0, 255, 136, 0.3)',
                                padding: '0.75rem 0.25rem',
                                minHeight: '80px',
                            }}
                        >
                            <motion.div
                                style={{
                                    fontFamily: "'Press Start 2P', cursive",
                                    fontSize: 'clamp(1.25rem, 3.5vw, 1.75rem)',
                                    color: '#00ff88',
                                    textShadow: '0 0 10px #00ff88',
                                }}
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                {totalQuestions}
                            </motion.div>
                            <div
                                style={{
                                    fontFamily: "'Press Start 2P', cursive",
                                    fontSize: 'clamp(0.4rem, 1.2vw, 0.55rem)',
                                    color: 'rgba(0, 255, 136, 0.7)',
                                    marginTop: '0.4rem',
                                }}
                            >
                                QUESTIONS
                            </div>
                        </div>

                        {/* Timer - Purple/Violet Neon */}
                        <div
                            className="nes-container is-dark flex flex-col items-center justify-center"
                            style={{
                                backgroundColor: 'rgba(124, 58, 237, 0.05)',
                                border: '3px solid #7c3aed',
                                boxShadow: '0 0 15px rgba(124, 58, 237, 0.3)',
                                padding: '0.75rem 0.25rem',
                                minHeight: '80px',
                            }}
                        >
                            <motion.div
                                style={{
                                    fontFamily: "'Press Start 2P', cursive",
                                    fontSize: 'clamp(1.25rem, 3.5vw, 1.75rem)',
                                    color: '#a78bfa',
                                    textShadow: '0 0 10px #7c3aed',
                                }}
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                            >
                                {timerDuration}s
                            </motion.div>
                            <div
                                style={{
                                    fontFamily: "'Press Start 2P', cursive",
                                    fontSize: 'clamp(0.4rem, 1.2vw, 0.55rem)',
                                    color: 'rgba(167, 139, 250, 0.7)',
                                    marginTop: '0.4rem',
                                }}
                            >
                                TIMER
                            </div>
                        </div>

                        {/* Rank - Hot Pink Neon */}
                        <div
                            className="nes-container is-dark flex flex-col items-center justify-center"
                            style={{
                                backgroundColor: 'rgba(255, 105, 180, 0.05)',
                                border: '3px solid #ff69b4',
                                boxShadow: '0 0 15px rgba(255, 105, 180, 0.3)',
                                padding: '0.75rem 0.25rem',
                                minHeight: '80px',
                            }}
                        >
                            <motion.div
                                style={{
                                    fontFamily: "'Press Start 2P', cursive",
                                    fontSize: 'clamp(1.25rem, 3.5vw, 1.75rem)',
                                    color: '#ff69b4',
                                    textShadow: '0 0 10px #ff69b4',
                                }}
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                            >
                                {userRank ? (userRank <= 3 ? ['1st', '2nd', '3rd'][userRank - 1] : `#${userRank}`) : '-'}
                            </motion.div>
                            <div
                                style={{
                                    fontFamily: "'Press Start 2P', cursive",
                                    fontSize: 'clamp(0.4rem, 1.2vw, 0.55rem)',
                                    color: 'rgba(255, 105, 180, 0.7)',
                                    marginTop: '0.4rem',
                                }}
                            >
                                RANK
                            </div>
                        </div>
                    </motion.div>

                    {/* START QUIZ Button - Cyberpunk Red - ENLARGED */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                        className="w-full flex flex-col items-center gap-4 pb-4 px-4"
                    >
                        <button
                            onClick={() => {
                                if (selectedTopic && (!topicQuizStatus || topicQuizStatus !== 'ready')) return;
                                if (!selectedTopic && dailyQuizLoading) return;
                                onStartQuiz();
                            }}
                            disabled={(!!selectedTopic && topicQuizStatus !== 'ready') || (!selectedTopic && dailyQuizLoading)}
                            className={`nes-btn is-error ${(!!selectedTopic && topicQuizStatus !== 'ready') || (!selectedTopic && dailyQuizLoading) ? 'is-disabled' : ''}`}
                            style={{
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: 'clamp(1rem, 4vw, 1.5rem)', // Significantly increased font size
                                padding: '1.75rem 3.5rem', // Significantly increased padding
                                width: '90%', // Larger button width
                                maxWidth: '400px',
                                boxShadow: '0 0 35px rgba(220, 38, 38, 0.6), 8px 8px 0px rgba(0, 0, 0, 0.3)',
                            }}
                        >
                            {selectedTopic
                                ? topicQuizStatus === 'error'
                                    ? 'GENERATION FAILED'
                                    : 'START QUIZ'
                                : dailyQuizLoading
                                    ? 'LOADING...'
                                    : 'START QUIZ'}
                        </button>

                        {/* Status indicators */}
                        {selectedTopic && (
                            <div className="text-center">
                                {topicQuizStatus === 'idle' && (
                                    <span
                                        style={{
                                            fontFamily: "'Press Start 2P', cursive",
                                            fontSize: '0.625rem',
                                            color: '#666',
                                        }}
                                    >
                                        Select a topic to start.
                                    </span>
                                )}
                                {topicQuizStatus === 'loading' && (
                                    <div className="flex flex-col items-center gap-2">
                                        <LoadingDots text="Thinking" />
                                        <span
                                            style={{
                                                fontFamily: "'Press Start 2P', cursive",
                                                fontSize: '0.5rem',
                                                color: '#666',
                                            }}
                                            className="animate-pulse"
                                        >
                                            Gemini is researching and drafting questions...
                                        </span>
                                    </div>
                                )}
                                {topicQuizStatus === 'ready' && (
                                    <span
                                        style={{
                                            fontFamily: "'Press Start 2P', cursive",
                                            fontSize: '0.625rem',
                                            color: '#22C55E',
                                            fontWeight: 'bold',
                                        }}
                                    >
                                        ✓ Quiz Loaded
                                    </span>
                                )}
                                {topicQuizStatus === 'error' && (
                                    <span
                                        style={{
                                            fontFamily: "'Press Start 2P', cursive",
                                            fontSize: '0.625rem',
                                            color: '#EF4444',
                                        }}
                                    >
                                        Failed to load quiz. Try another topic.
                                    </span>
                                )}
                            </div>
                        )}

                        {!selectedTopic && dailyQuizLoading && (
                            <div className="text-center flex flex-col items-center gap-2">
                                <LoadingDots text="Fetching Daily Quiz" />
                            </div>
                        )}

                        {!selectedTopic && !dailyQuizLoading && dailyCompleted && (
                            <div className="text-center flex flex-col items-center gap-2">
                                <span
                                    style={{
                                        fontFamily: "'Press Start 2P', cursive",
                                        fontSize: '0.625rem',
                                        color: '#22C55E',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    ✓ Has Played Today
                                </span>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>


            {/* Global Dashboard Section - Hot Topics + Leaderboard */}
            <GlobalDashboard
                landingSummaryLoading={landingSummaryLoading}
                landingSummary={landingSummary}
                authUser={authUser}
                onSelectTopic={onSelectTopic}
                history={history}
                historyLoading={historyLoading}
            />
        </GeneratorShell>
    );
};
