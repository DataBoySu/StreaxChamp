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

                {/* Topic Select & Daily Quiz Buttons - NES Style */}
                <motion.div
                    className="flex justify-center gap-6 items-center flex-wrap"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <button
                        onClick={onOpenTopicMenu}
                        className="nes-btn is-primary"
                        style={{
                            fontFamily: "'Press Start 2P', cursive",
                            fontSize: 'clamp(0.5rem, 2vw, 0.75rem)',
                            padding: '1rem 1.5rem',
                        }}
                    >
                        {selectedTopic ? `Topic: ${selectedTopic.title}` : 'Topic Select'}
                    </button>
                    <button
                        onClick={() => {
                            if (onClearTopic) onClearTopic();
                            if (onBrowseArchive) onBrowseArchive();
                        }}
                        className="nes-btn"
                        style={{
                            fontFamily: "'Press Start 2P', cursive",
                            fontSize: 'clamp(0.5rem, 2vw, 0.75rem)',
                            padding: '1rem 1.5rem',
                        }}
                    >
                        Daily Quiz
                    </button>
                </motion.div>

                {/* Stats Display - NES Containers with depth */}
                <motion.div
                    className="grid grid-cols-3 gap-4 max-w-lg w-full px-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    {/* Questions */}
                    <div
                        className="nes-container is-rounded flex flex-col items-center justify-center"
                        style={{
                            backgroundColor: '#FFEBE6',
                            border: '4px solid #FF4500',
                            boxShadow: '4px 4px 0px rgba(255, 69, 0, 0.3)',
                            padding: '1rem 0.5rem',
                            minHeight: '90px',
                        }}
                    >
                        <motion.div
                            style={{
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: 'clamp(1.25rem, 4vw, 1.75rem)',
                                color: '#FF4500',
                                textShadow: '2px 2px 0px rgba(0, 0, 0, 0.1)',
                            }}
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            {totalQuestions}
                        </motion.div>
                        <div
                            style={{
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: 'clamp(0.45rem, 1.5vw, 0.55rem)',
                                color: '#666',
                                marginTop: '0.5rem',
                            }}
                        >
                            QUESTIONS
                        </div>
                    </div>

                    {/* Timer */}
                    <div
                        className="nes-container is-rounded flex flex-col items-center justify-center"
                        style={{
                            backgroundColor: '#FFF9E6',
                            border: '4px solid #F59E0B',
                            boxShadow: '4px 4px 0px rgba(245, 158, 11, 0.3)',
                            padding: '1rem 0.5rem',
                            minHeight: '90px',
                        }}
                    >
                        <motion.div
                            style={{
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: 'clamp(1.25rem, 4vw, 1.75rem)',
                                color: '#F59E0B',
                                textShadow: '2px 2px 0px rgba(0, 0, 0, 0.1)',
                            }}
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                        >
                            {timerDuration}s
                        </motion.div>
                        <div
                            style={{
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: 'clamp(0.45rem, 1.5vw, 0.55rem)',
                                color: '#666',
                                marginTop: '0.5rem',
                            }}
                        >
                            TIMER
                        </div>
                    </div>

                    {/* Rank */}
                    <div
                        className="nes-container is-rounded flex flex-col items-center justify-center"
                        style={{
                            backgroundColor: '#E6FFF0',
                            border: '4px solid #22C55E',
                            boxShadow: '4px 4px 0px rgba(34, 197, 94, 0.3)',
                            padding: '1rem 0.5rem',
                            minHeight: '90px',
                        }}
                    >
                        <motion.div
                            style={{
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: 'clamp(1.25rem, 4vw, 1.75rem)',
                                color: '#22C55E',
                                textShadow: '2px 2px 0px rgba(0, 0, 0, 0.1)',
                            }}
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                        >
                            {userRank ? (userRank <= 3 ? ['1st', '2nd', '3rd'][userRank - 1] : `#${userRank}`) : '-'}
                        </motion.div>
                        <div
                            style={{
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: 'clamp(0.45rem, 1.5vw, 0.55rem)',
                                color: '#666',
                                marginTop: '0.5rem',
                            }}
                        >
                            RANK
                        </div>
                    </div>
                </motion.div>

                {/* START QUIZ Button - NES Style */}
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
                        className={`nes-btn is-warning ${(!!selectedTopic && topicQuizStatus !== 'ready') || (!selectedTopic && dailyQuizLoading) ? 'is-disabled' : ''}`}
                        style={{
                            fontFamily: "'Press Start 2P', cursive",
                            fontSize: 'clamp(0.75rem, 3vw, 1.25rem)',
                            padding: '1.5rem 3rem',
                            boxShadow: '8px 8px 0px rgba(0, 0, 0, 0.2)',
                            backgroundColor: '#FF4500',
                            borderColor: '#212529',
                            color: '#FFF',
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
