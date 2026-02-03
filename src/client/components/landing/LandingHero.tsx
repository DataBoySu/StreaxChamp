import React from 'react';
import { motion } from 'framer-motion';
import LoadingDots from '../LoadingDots';
import { GeneratorShell } from './GeneratorShell';
import { HeroSection } from './HeroSection';

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

                {/* Topic Select & Daily Quiz Buttons */}
                <motion.div
                    className="flex justify-center gap-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <button
                        onClick={onOpenTopicMenu}
                        className="modern-button modern-button-primary px-6 py-3 font-bold text-sm md:text-base shadow-lg hover:shadow-xl font-pixel border-2 border-transparent hover:border-white/20 transition-all active:scale-95"
                    >
                        {selectedTopic ? `Topic: ${selectedTopic.title}` : 'Topic Select'}
                    </button>
                    <button
                        onClick={() => {
                            if (onClearTopic) onClearTopic();
                            if (onBrowseArchive) onBrowseArchive();
                        }}
                        className="modern-button modern-button-secondary px-6 py-3 font-bold text-sm md:text-base shadow-md hover:shadow-lg font-pixel transition-all active:scale-95"
                    >
                        Daily Quiz
                    </button>
                </motion.div>

                {/* Stats Display */}
                <motion.div
                    className="grid grid-cols-3 gap-4 max-w-lg w-full"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="modern-card p-4 bg-gradient-to-br from-accent/10 to-transparent border border-accent/20 flex flex-col items-center backdrop-blur-sm">
                        <motion.div
                            className="text-2xl font-black text-accent font-pixel"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            {totalQuestions}
                        </motion.div>
                        <div className="text-[10px] uppercase tracking-wider text-secondary font-bold mt-1">Questions</div>
                    </div>
                    <div className="modern-card p-4 bg-gradient-to-br from-warning/10 to-transparent border border-warning/20 flex flex-col items-center backdrop-blur-sm">
                        <motion.div
                            className="text-2xl font-black text-warning font-pixel"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                        >
                            15s
                        </motion.div>
                        <div className="text-[10px] uppercase tracking-wider text-secondary font-bold mt-1">Timer</div>
                    </div>
                    <div className="modern-card p-4 bg-gradient-to-br from-success/10 to-transparent border border-success/20 flex flex-col items-center backdrop-blur-sm">
                        <motion.div
                            className="text-2xl font-black text-success font-pixel"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                        >
                            1st
                        </motion.div>
                        <div className="text-[10px] uppercase tracking-wider text-secondary font-bold mt-1">Rank 1</div>
                    </div>
                </motion.div>

                {/* Epic Start Button */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                    className="w-full flex justify-center pb-8"
                >
                    <motion.button
                        onClick={() => {
                            if (selectedTopic && (!topicQuizStatus || topicQuizStatus !== 'ready')) return;
                            if (!selectedTopic && dailyQuizLoading) return; // Prevent start if loading daily
                            onStartQuiz();
                        }}
                        disabled={(!!selectedTopic && topicQuizStatus !== 'ready') || (!selectedTopic && dailyQuizLoading)}
                        className={`relative px-8 py-4 text-xl font-black text-white rounded-xl overflow-hidden group transform transition-all duration-200 ${((selectedTopic && topicQuizStatus !== 'ready') || (!selectedTopic && dailyQuizLoading)) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                        style={{
                            background:
                                'linear-gradient(45deg, #ff4500, #ff6b35, #ff8c00, #ffa500, #ff4500)',
                            backgroundSize: '300% 300%',
                        }}
                        animate={{
                            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: 'linear',
                        }}
                        whileHover={{
                            boxShadow: [
                                '0 10px 30px rgba(255, 69, 0, 0.4)',
                                '0 10px 30px rgba(255, 107, 53, 0.4)',
                                '0 10px 30px rgba(255, 140, 0, 0.4)',
                            ],
                        }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <span className="relative z-10 flex items-center gap-3">
                            <motion.span
                                animate={{ rotate: [0, 360] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            >
                                _
                            </motion.span>
                            {selectedTopic
                                ? topicQuizStatus === 'error'
                                    ? 'GENERATION FAILED'
                                    : 'START QUIZ'
                                : dailyQuizLoading
                                    ? 'LOADING...'
                                    : 'START QUIZ'}
                            <motion.span
                                animate={{ rotate: [0, -360] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            >
                                _
                            </motion.span>
                        </span>

                        {selectedTopic && (
                            <div className="mt-4 text-center">
                                {topicQuizStatus === 'idle' && <span className="text-secondary text-sm">Select a topic to start.</span>}
                                {topicQuizStatus === 'loading' && (
                                    <div className="flex flex-col items-center gap-2">
                                        <LoadingDots text="Thinking" />
                                        <span className="text-xs text-secondary animate-pulse">Gemini is researching and drafting questions...</span>
                                    </div>
                                )}
                                {topicQuizStatus === 'ready' && <span className="text-success text-sm font-bold">✓ Quiz Loaded</span>}
                                {topicQuizStatus === 'error' && <span className="text-error text-sm">Failed to load quiz. Try another topic.</span>}
                            </div>
                        )}

                        {!selectedTopic && dailyQuizLoading && (
                            <div className="mt-4 text-center flex flex-col items-center gap-2">
                                <LoadingDots text="Fetching Daily Quiz" />
                            </div>
                        )}

                        {!selectedTopic && !dailyQuizLoading && dailyCompleted && (
                            <div className="mt-2 text-center flex flex-col items-center gap-2">
                                <span className="text-success text-sm font-bold">✓ Has Played Today</span>
                            </div>
                        )}

                        {/* Button shine effect */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                        />
                    </motion.button>
                </motion.div>
            </div>
        </GeneratorShell>
    );
};
