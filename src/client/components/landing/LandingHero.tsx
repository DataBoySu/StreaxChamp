import React from 'react';
import { motion } from 'framer-motion';
import { InteractiveRobot } from '../InteractiveRobot';
import LoadingDots from '../LoadingDots';

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
}

export const LandingHero: React.FC<LandingHeroProps> = ({
    username,
    selectedTopic,
    topicQuizStatus,
    onOpenTopicMenu,
    onStartQuiz,
    totalQuestions,
    errorMessage, // NEW
    hasPlayed = false,
    totalPoints = 0,
}) => {
    return (
        <motion.div
            key="start"
            className="text-center py-6 relative"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4 }}
        >
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
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

            {/* Main Hero Section */}
            <motion.div
                className="relative z-10 mb-8"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
            >
                <motion.h1
                    className="text-3xl md:text-4xl font-bold text-gradient mb-4 font-pixel tracking-tighter"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                    Infinity Quiz Generator
                </motion.h1>
                <motion.p
                    className="text-sm md:text-base text-secondary max-w-2xl mx-auto font-pixel leading-relaxed"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                    Test your knowledge and climb the leaderboard!
                </motion.p>

                {/* Interactive Robot */}
                <div className="mx-auto mt-2 mb-4 flex flex-col items-center justify-center w-full">
                    <div className="relative">
                        <InteractiveRobot username={username} errorMessage={errorMessage} hasPlayed={hasPlayed} totalPoints={totalPoints} />
                    </div>
                    {/* Create Quiz Button (Small, under robot) */}
                </div>


                {/* Playful Timeout Message - REMOVED (Robot handles this now) */}

                {/* Topic Select Button */}
                <motion.div className="text-center mb-2">
                    <button
                        onClick={onOpenTopicMenu}
                        className="modern-button modern-button-primary px-4 py-2 font-bold"
                    >
                        {selectedTopic ? `Topic: ${selectedTopic.title}` : 'Topic Select'}
                    </button>
                </motion.div>
            </motion.div>

            {/* Stats Display */}
            <motion.div
                className="grid grid-cols-3 gap-3 max-w-sm mx-auto mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
            >
                <div className="modern-card p-3 bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30">
                    <motion.div
                        className="text-xl font-bold text-accent"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        {totalQuestions}
                    </motion.div>
                    <div className="text-xs text-secondary">Questions</div>
                </div>
                <div className="modern-card p-3 bg-gradient-to-br from-warning/20 to-warning/5 border border-warning/30">
                    <motion.div
                        className="text-xl font-bold text-warning"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    >
                        15s
                    </motion.div>
                    <div className="text-xs text-secondary">Per Question</div>
                </div>
                <div className="modern-card p-3 bg-gradient-to-br from-success/20 to-success/5 border border-success/30">
                    <motion.div
                        className="text-xl font-bold text-success"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                    >
                        1st
                    </motion.div>
                    <div className="text-xs text-secondary">Glory Awaits</div>
                </div>
            </motion.div>

            {/* Epic Start Button */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, type: 'spring', stiffness: 300 }}
            >
                <motion.button
                    onClick={() => {
                        if (selectedTopic && (!topicQuizStatus || topicQuizStatus !== 'ready')) return;
                        // Parent handles "if !selectedTopic then showPrompt" logic
                        onStartQuiz();
                    }}
                    disabled={!!selectedTopic && topicQuizStatus !== 'ready'}
                    className={`relative px-8 py-4 text-xl font-black text-white rounded-xl overflow-hidden group transform transition-all duration-200 ${selectedTopic && topicQuizStatus !== 'ready' ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
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
                            ? topicQuizStatus === 'ready'
                                ? 'START QUIZ'
                                : topicQuizStatus === 'error'
                                    ? 'GENERATION FAILED'
                                    : 'GENERATING…'
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

                    {/* Button shine effect */}
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                    />
                </motion.button>
            </motion.div>
        </motion.div >
    );
};
