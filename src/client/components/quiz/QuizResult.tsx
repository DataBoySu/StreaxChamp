import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CelebrationBackground } from './CelebrationBackground';
import { ScoreFace } from './ScoreFace';

interface QuizResultProps {
    score: number;
    totalQuestions: number;
    sources?: string[];
    topicTitle?: string | undefined;
    postId?: string | null;
    isDailyQuiz?: boolean;
    quizId?: string;
    nickname?: string;
    onGoHome: () => void;
}


export const QuizResult: React.FC<QuizResultProps> = ({
    score,
    totalQuestions,
    sources = [],
    topicTitle = '',
    postId = null,
    isDailyQuiz = false,
    quizId,
    nickname = 'Player',
    onGoHome
}) => {



    const [subscribed, setSubscribed] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [shared, setShared] = useState(false);

    const percentage = (score / totalQuestions) * 100;
    const isExcellent = percentage >= 80;
    const isGood = percentage >= 60;

    const handleJoin = async () => {
        if (subscribed) return;
        try {
            const res = await fetch('/api/community/subscribe', { method: 'POST' });
            if (res.ok) {
                setSubscribed(true);
            }
        } catch (err) {
            console.error('Subscribe failed', err);
        }
    };

    const handleShare = async () => {
        if (sharing || shared) return;
        setSharing(true);
        try {
            // [NEW] Single Line Share Format
            // Requested: "telling their rank, username and score"
            // Since rank is TBD on client, we show TBD.
            const dateStr = isDailyQuiz && quizId ? quizId : new Date().toISOString().slice(0, 10);

            // Format: 🏆 Rank: TBD | 👤 Username | 🎯 Score: X/Y
            const text = `🏆 Rank: TBD | 👤 ${nickname} | 🎯 Score: ${score}/${totalQuestions}`;
            const slug = quizId || topicTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

            const res = await fetch('/api/share/comment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId,
                    quizId: slug,
                    text,
                    score // [NEW] Pass score explicitly for Memory Leaderboard reliability
                })
            });


            if (res.ok) {
                setShared(true);
            }
        } catch (err) {
            console.error('Share failed', err);
        } finally {
            setSharing(false);
        }
    };


    return (
        <motion.div
            key="score"
            className="text-center py-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4 }}
            style={{ position: 'relative', zIndex: 10 }}
        >
            {/* Celebration Background Animation */}
            <CelebrationBackground score={score} />

            {/* Main Result Card - NES.css Dark Container */}
            <div
                className="nes-container is-dark relative z-20 mx-auto max-w-2xl"
                style={{
                    borderRadius: 0,
                    background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.95))',
                    border: '4px solid #dc2626',
                    boxShadow: '0 0 30px rgba(220, 38, 38, 0.4), 8px 8px 0px rgba(0, 0, 0, 0.5)',
                }}
            >
                {/* Robot/Score Face */}
                <motion.div
                    className="mb-6"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                >
                    <ScoreFace score={score} totalQuestions={totalQuestions} />
                </motion.div>

                {/* Title */}
                <h2
                    style={{
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                        color: '#00ff88',
                        textShadow: '0 0 20px rgba(0, 255, 136, 0.5)',
                        marginBottom: '1.5rem',
                    }}
                >
                    Quiz Complete!
                </h2>

                {/* Score Display */}
                <div className="mb-6">
                    <p
                        style={{
                            fontFamily: "'VT323', monospace",
                            fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
                            color: '#9ca3af',
                            marginBottom: '1rem',
                        }}
                    >
                        Your Final Score:
                    </p>

                    <motion.div
                        className="nes-container is-dark inline-block"
                        style={{
                            borderRadius: 0,
                            background: isExcellent
                                ? 'linear-gradient(135deg, rgba(220, 38, 38, 0.2), rgba(239, 68, 68, 0.2))'
                                : isGood
                                    ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(167, 139, 250, 0.2))'
                                    : 'linear-gradient(135deg, rgba(107, 114, 128, 0.2), rgba(156, 163, 175, 0.2))',
                            border: `4px solid ${isExcellent ? '#dc2626' : isGood ? '#7c3aed' : '#6b7280'}`,
                            boxShadow: isExcellent
                                ? '0 0 25px rgba(220, 38, 38, 0.4)'
                                : isGood
                                    ? '0 0 25px rgba(124, 58, 237, 0.4)'
                                    : '0 0 15px rgba(107, 114, 128, 0.3)',
                            padding: '1.5rem 2.5rem',
                        }}
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.3, type: 'spring', damping: 8 }}
                    >
                        <span
                            style={{
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: 'clamp(2.5rem, 6vw, 4rem)',
                                color: isExcellent ? '#ff6b6b' : isGood ? '#a78bfa' : '#d1d5db',
                                textShadow: `0 0 20px ${isExcellent ? 'rgba(255, 107, 107, 0.5)' : isGood ? 'rgba(167, 139, 250, 0.5)' : 'rgba(209, 213, 219, 0.3)'}`,
                            }}
                        >
                            {score}/{totalQuestions}
                        </span>
                    </motion.div>
                </div>

                {/* Feedback Message */}
                <motion.p
                    style={{
                        fontFamily: "'VT323', monospace",
                        fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)',
                        color: isExcellent ? '#ff69b4' : isGood ? '#00ff88' : '#9ca3af',
                        marginBottom: '2rem',
                        fontWeight: 'bold',
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    {isExcellent
                        ? '🏆 Outstanding Performance!'
                        : isGood
                            ? '⭐ Great Job!'
                            : '💪 Keep Practicing!'}
                </motion.p>

                {/* Action Buttons Container */}
                <div
                    className="flex flex-col gap-4 w-full max-w-md mx-auto mt-8"
                    style={{
                        fontFamily: "'Press Start 2P', cursive",
                    }}
                >
                    {/* Button 1: Join Sub */}
                    <button
                        onClick={handleJoin}
                        className={`nes-btn ${subscribed ? 'is-success' : 'is-error'} transition-transform hover:scale-105 active:scale-95`}
                        style={{
                            fontFamily: "'Press Start 2P', cursive",
                            fontSize: 'clamp(0.65rem, 1.8vw, 0.85rem)',
                            padding: '1rem 1.5rem',
                            borderRadius: 0,
                            boxShadow: subscribed ? 'none' : '0 0 15px rgba(220, 38, 38, 0.3)',
                        }}
                        disabled={subscribed}
                    >
                        {subscribed ? 'Joined! 🎉' : 'Join Sub'}
                    </button>

                    {/* Button 2: Share Score (ONLY for Daily Quiz) */}
                    {isDailyQuiz && (
                        <button
                            onClick={handleShare}
                            className={`nes-btn ${shared ? 'is-success' : 'is-warning'} transition-transform hover:scale-105 active:scale-95`}
                            style={{
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: 'clamp(0.65rem, 1.8vw, 0.85rem)',
                                padding: '1rem 1.5rem',
                                borderRadius: 0,
                                boxShadow: shared ? 'none' : '0 0 15px rgba(243, 156, 18, 0.3)',
                                marginTop: '0.5rem'
                            }}
                            disabled={sharing || shared}
                        >
                            {shared ? 'Score Shared! 🏆' : sharing ? 'Sharing...' : 'Share Score'}
                        </button>
                    )}


                    {/* Button 3: Explore Past Quizzes (Return Home) */}
                    <button
                        onClick={onGoHome}
                        className="nes-btn is-primary transition-transform hover:scale-105 active:scale-95"
                        style={{
                            fontFamily: "'Press Start 2P', cursive",
                            fontSize: 'clamp(0.65rem, 1.8vw, 0.85rem)',
                            padding: '1rem 1.5rem',
                            borderRadius: 0,
                            boxShadow: '0 0 15px rgba(32, 151, 243, 0.3)',
                            marginTop: '0.5rem'
                        }}
                    >
                        Return Home
                    </button>
                </div>


                {/* Sources Section */}
                {sources && sources.length > 0 && (
                    <div className="mt-8 text-center">
                        <p
                            className="mb-4 text-xs tracking-wider text-slate-400 uppercase"
                            style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '0.6rem' }}
                        >
                            Knowledge Sources
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                            {sources.map((url, i) => {
                                try {
                                    const domain = new URL(url).hostname.replace('www.', '');
                                    return (
                                        <a
                                            key={i}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="nes-badge is-splited"
                                            style={{ textDecoration: 'none' }}
                                        >
                                            <span className="is-dark" style={{ fontSize: '0.6rem' }}>LINK</span>
                                            <span className="is-primary" style={{ fontSize: '0.6rem' }}>{domain}</span>
                                        </a>
                                    );
                                } catch (e) {
                                    return null;
                                }
                            })}
                        </div>
                    </div>
                )}
            </div>
        </motion.div >
    );
};
