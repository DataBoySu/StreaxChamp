import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface MemoryScore {
    userKey: string;
    nickname: string;
    score: number;
    timeTakenMs: number;
    rank?: number;
}

interface InMemoryLeaderboardProps {
    slug: string;
    topicTitle: string;
    currentUser: string | null;
    isDaily?: boolean; // NEW: Toggle between memory and firestore logic
}

export const InMemoryLeaderboard: React.FC<InMemoryLeaderboardProps> = ({ slug, topicTitle, currentUser, isDaily = false }) => {
    const [scores, setScores] = useState<MemoryScore[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchScores = async () => {
        setLoading(true);
        try {
            // If Daily, we can fetch from the "daily leaderboard" endpoint which is persistent
            const url = isDaily
                ? `/api/quiz/daily/leaderboard?date=${slug.replace('daily:', '')}`
                : `/api/leaderboard/memory/${encodeURIComponent(slug)}`;

            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                const entries = isDaily ? data.entries : data.entries;
                setScores(entries || []);
            }
        } catch (e) {
            console.error('Failed to load leaderboard', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchScores();
        const interval = setInterval(fetchScores, 15000); // Poll slower for results
        return () => clearInterval(interval);
    }, [slug, isDaily]);

    return (
        <motion.div
            className="mt-12 w-full max-w-2xl mx-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
        >
            <div
                className="nes-container is-dark with-title"
                style={{
                    borderRadius: 0,
                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                    border: `4px solid ${isDaily ? '#00ff88' : '#facc15'}`,
                    boxShadow: `0 0 30px ${isDaily ? 'rgba(0, 255, 136, 0.2)' : 'rgba(250, 204, 21, 0.2)'}`,
                    padding: '2rem 1.5rem',
                }}
            >
                <p className="title px-4" style={{
                    color: isDaily ? '#00ff88' : '#facc15',
                    fontFamily: "'Press Start 2P', cursive",
                    fontSize: '0.7rem',
                    background: '#111827'
                }}>
                    {isDaily ? '[ LIVE RANKINGS ]' : '[ SESSION STANDINGS ]'}
                </p>

                <div className="text-center mb-8">
                    <h3 style={{
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '1rem',
                        color: isDaily ? '#00ff88' : '#e879f9',
                        textShadow: '3px 3px 0px rgba(0,0,0,0.5)',
                        marginBottom: '0.5rem'
                    }}>
                        {topicTitle || (isDaily ? 'Daily Quiz' : 'Leaderboard')}
                    </h3>
                    <div className="h-1 w-24 mx-auto" style={{ background: isDaily ? '#00ff88' : '#e879f9', boxShadow: `0 0 10px ${isDaily ? '#00ff88' : '#e879f9'}` }} />
                </div>

                {loading && scores.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-8">
                        <div className="animate-pulse text-gray-500 font-vt323 text-2xl">SCANNING DATABASE...</div>
                    </div>
                ) : scores.length === 0 ? (
                    <div className="text-center py-10">
                        <p className="font-vt323 text-2xl text-gray-500 italic">No rankings detected in this sector.</p>
                        <p className="font-vt323 text-lg text-gray-600 mt-2">Be the first to leave a mark.</p>
                    </div>
                ) : (
                    <div className="overflow-hidden">
                        <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                            <thead>
                                <tr className="text-gray-500" style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '0.6rem' }}>
                                    <th className="pb-4 text-left pl-4">#</th>
                                    <th className="pb-4 text-left">PLAYER</th>
                                    <th className="pb-4 text-right">SCORE</th>
                                    <th className="pb-4 text-right pr-4">TIME</th>
                                </tr>
                            </thead>
                            <tbody style={{ fontFamily: "'VT323', monospace", fontSize: '1.4rem' }}>
                                {scores.slice(0, 10).map((entry, idx) => {
                                    const isMe = entry.nickname === currentUser || entry.userKey === currentUser;
                                    const rank = idx + 1;

                                    return (
                                        <motion.tr
                                            key={idx}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            style={{
                                                backgroundColor: isMe ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                                borderLeft: isMe ? '4px solid #3b82f6' : 'none',
                                            }}
                                        >
                                            <td className="py-3 pl-4" style={{
                                                color: rank === 1 ? '#fbbf24' : rank === 2 ? '#9ca3af' : rank === 3 ? '#b45309' : '#4b5563',
                                                fontWeight: 'bold'
                                            }}>
                                                {rank.toString().padStart(2, '0')}
                                            </td>
                                            <td className="py-3" style={{
                                                color: isMe ? '#60a5fa' : '#e5e7eb',
                                            }}>
                                                <span className="flex items-center gap-2">
                                                    {isMe && <span style={{ fontSize: '0.8rem' }}>▶</span>}
                                                    {entry.nickname || 'Unknown'}
                                                </span>
                                            </td>
                                            <td className="py-3 text-right font-bold" style={{ color: '#00ff88' }}>
                                                {entry.score}
                                            </td>
                                            <td className="py-3 text-right pr-4 text-gray-500" style={{ fontSize: '1.1rem' }}>
                                                {((entry.timeTakenMs || 0) / 1000).toFixed(1)}s
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-800">
                    <div className="text-[0.6rem] text-gray-600" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                        REFRESHING_V2.0
                    </div>
                    {isDaily && (
                        <div className="text-[0.6rem] text-success/60" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                            VERIFIED_DATA
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};
