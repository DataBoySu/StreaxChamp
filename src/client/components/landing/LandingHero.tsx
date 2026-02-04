import React from 'react';
import { motion } from 'framer-motion';
import LoadingDots from '../LoadingDots';
import { GeneratorShell } from './GeneratorShell';
import { HeroSection } from './HeroSection';
import { CONFIG } from '../../../shared/constants';

interface LandingHeroProps {
    username: string;
    selectedTopic: { title: string; slug: string } | null;
    topicQuizStatus: 'idle' | 'loading' | 'ready' | 'error';
    onOpenTopicMenu: () => void;
    // onStartCreate removed
    onStartQuiz: () => void;
    totalQuestions: number;
    showTimeoutMessage?: boolean;
    errorMessage?: string | undefined;
    hasPlayed?: boolean;
    totalPoints?: number;
    dailyCompleted?: boolean;
    dailyQuizLoading?: boolean;
    onBrowseArchive?: () => void;
    onClearTopic?: () => void;
    userRank?: number | null;
    timerDuration?: number;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
    username,
    selectedTopic,
    topicQuizStatus,
    onOpenTopicMenu,
    onStartQuiz,
    totalQuestions,
    errorMessage,
    hasPlayed = false,
    totalPoints = 0,
    dailyCompleted = false,
    dailyQuizLoading = false,
    onBrowseArchive,
    onClearTopic,
    userRank,
    timerDuration = CONFIG.GAME.TIMER_DURATION,
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

            {/* Hero Section: Title, Subtitle, Robot Mascot (with fixed height & dialogue) */}
            <HeroSection
                username={username}
                errorMessage={errorMessage}
                hasPlayed={hasPlayed}
                totalPoints={totalPoints}
            />

            {/* Actions & Stats Container */}
            <div className="relative z-10 w-full flex flex-col items-center gap-8">

                {/* Topic Select & Daily Quiz Buttons - Cyberpunk Style */}
                <motion.div
                    className="flex justify-center gap-6 items-center flex-wrap"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <button
                        onClick={onOpenTopicMenu}
                        className="nes-btn is-error" // Red accent matching robot
                        style={{
                            fontFamily: "'Press Start 2P', cursive",
                            fontSize: 'clamp(0.5rem, 2vw, 0.75rem)',
                            padding: '1rem 1.5rem',
                            boxShadow: '0 0 20px rgba(220, 38, 38, 0.3)',
                        }}
                    >
                        {selectedTopic ? `Topic: ${selectedTopic.title}` : 'Topic Select'}
                    </button>
                    <button
                        onClick={() => {
                            if (onClearTopic) onClearTopic();
                            if (onBrowseArchive) onBrowseArchive();
                        }}
                        className="nes-btn is-primary" // Cyan accent
                        style={{
                            fontFamily: "'Press Start 2P', cursive",
                            fontSize: 'clamp(0.5rem, 2vw, 0.75rem)',
                            padding: '1rem 1.5rem',
                            boxShadow: '0 0 20px rgba(0, 255, 136, 0.3)',
                        }}
                    >
                        Daily Quiz
                    </button>
                </motion.div>

                {/* Stats Display - Cyberpunk Dark Containers */}
                <motion.div
                    className="grid grid-cols-3 gap-4 max-w-lg w-full px-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    {/* Questions - Cyan Neon */}
                    <div
                        className="nes-container is-dark is-rounded flex flex-col items-center justify-center"
                        style={{
                            backgroundColor: 'rgba(0, 255, 136, 0.05)',
                            border: '3px solid #00ff88',
                            boxShadow: '0 0 20px rgba(0, 255, 136, 0.4), inset 0 0 20px rgba(0, 255, 136, 0.1)',
                            padding: '1rem 0.5rem',
                            minHeight: '90px',
                        }}
                    >
                        <motion.div
                            style={{
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                                color: '#00ff88',
                                textShadow: '0 0 15px #00ff88, 0 0 30px rgba(0, 255, 136, 0.5)',
                            }}
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            {totalQuestions}
                        </motion.div>
                        <div
                            style={{
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: 'clamp(0.5rem, 1.5vw, 0.65rem)',
                                color: 'rgba(0, 255, 136, 0.7)',
                                marginTop: '0.5rem',
                            }}
                        >
                            QUESTIONS
                        </div>
                    </div>

                    {/* Timer - Purple/Violet Neon */}
                    <div
                        className="nes-container is-dark is-rounded flex flex-col items-center justify-center"
                        style={{
                            backgroundColor: 'rgba(124, 58, 237, 0.05)',
                            border: '3px solid #7c3aed',
                            boxShadow: '0 0 20px rgba(124, 58, 237, 0.4), inset 0 0 20px rgba(124, 58, 237, 0.1)',
                            padding: '1rem 0.5rem',
                            minHeight: '90px',
                        }}
                    >
                        <motion.div
                            style={{
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                                color: '#a78bfa',
                                textShadow: '0 0 15px #7c3aed, 0 0 30px rgba(124, 58, 237, 0.5)',
                            }}
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                        >
                            {timerDuration}s
                        </motion.div>
                        <div
                            style={{
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: 'clamp(0.5rem, 1.5vw, 0.65rem)',
                                color: 'rgba(167, 139, 250, 0.7)',
                                marginTop: '0.5rem',
                            }}
                        >
                            TIMER
                        </div>
                    </div>

                    {/* Rank - Hot Pink Neon */}
                    <div
                        className="nes-container is-dark is-rounded flex flex-col items-center justify-center"
                        style={{
                            backgroundColor: 'rgba(255, 105, 180, 0.05)',
                            border: '3px solid #ff69b4',
                            boxShadow: '0 0 20px rgba(255, 105, 180, 0.4), inset 0 0 20px rgba(255, 105, 180, 0.1)',
                            padding: '1rem 0.5rem',
                            minHeight: '90px',
                        }}
                    >
                        <motion.div
                            style={{
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                                color: '#ff69b4',
                                textShadow: '0 0 15px #ff69b4, 0 0 30px rgba(255, 105, 180, 0.5)',
                            }}
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                        >
                            {userRank ? (userRank <= 3 ? ['1st', '2nd', '3rd'][userRank - 1] : `#${userRank}`) : '-'}
                        </motion.div>
                        <div
                            style={{
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: 'clamp(0.5rem, 1.5vw, 0.65rem)',
                                color: 'rgba(255, 105, 180, 0.7)',
                                marginTop: '0.5rem',
                            }}
                        >
                            RANK
                        </div>
                    </div>
                </motion.div>

                {/* START QUIZ Button - Cyberpunk Red */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                    className="w-full flex flex-col items-center gap-4 pb-8 px-4"
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
                            fontSize: 'clamp(0.75rem, 3vw, 1.25rem)',
                            padding: '1.5rem 3rem',
                            boxShadow: '0 0 30px rgba(220, 38, 38, 0.5), 8px 8px 0px rgba(0, 0, 0, 0.3)',
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
        </GeneratorShell>
    );
};
