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
}

export const InMemoryLeaderboard: React.FC<InMemoryLeaderboardProps> = ({ slug, topicTitle, currentUser }) => {
    const [scores, setScores] = useState<MemoryScore[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchScores = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/leaderboard/memory/${encodeURIComponent(slug)}`);
            if (res.ok) {
                const data = await res.json();
                setScores(data.entries || []);
            }
        } catch (e) {
            console.error('Failed to load memory leaderboard', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchScores();
        // Poll every 5s for live updates since it's transient
        const interval = setInterval(fetchScores, 5000);
        return () => clearInterval(interval);
    }, [slug]);

    return (
        <motion.div
            className="mt-8 w-full max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
        >
            <div
                className="nes-container is-dark with-title"
                style={{
                    borderColor: '#facc15', // Yellow border for "Special/Generated" feel
                    boxShadow: '0 0 20px rgba(250, 204, 21, 0.3)',
                    background: '#111827' // Consistent dark bg
                }}
            >
                <p className="title" style={{ color: '#facc15', fontFamily: "'Press Start 2P', cursive", fontSize: '0.8rem' }}>
                    ⚡ Session Leaderboard ⚡
                </p>

                <h3 className="text-center mb-6" style={{
                    fontFamily: "'Press Start 2P', cursive",
                    color: '#e879f9', // Pinkish purple
                    textShadow: '2px 2px #000'
                }}>
                    {topicTitle}
                </h3>

                {loading && scores.length === 0 ? (
                    <div className="text-center p-4">Loading...</div>
                ) : scores.length === 0 ? (
                    <div className="text-center p-4 text-gray-400 font-vt323 text-xl">
                        Be the first to conquer this topic!
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="nes-table is-bordered is-dark w-full text-sm">
                            <thead>
                                <tr style={{ color: '#60a5fa' }}>
                                    <th style={{ width: '60px' }}>#</th>
                                    <th>Player</th>
                                    <th className="text-right">Score</th>
                                    <th className="text-right">Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scores.map((entry, idx) => {
                                    const isMe = entry.nickname === currentUser;
                                    const rank = idx + 1;
                                    let rankColor = '#9ca3af';
                                    if (rank === 1) rankColor = '#ffd700';
                                    if (rank === 2) rankColor = '#c0c0c0';
                                    if (rank === 3) rankColor = '#cd7f32';

                                    return (
                                        <tr key={idx} style={{
                                            background: isMe ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                            fontWeight: isMe ? 'bold' : 'normal'
                                        }}>
                                            <td style={{ color: rankColor }}>{rank}</td>
                                            <td style={{
                                                color: isMe ? '#60a5fa' : '#e5e7eb',
                                                maxWidth: '140px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {entry.nickname}
                                            </td>
                                            <td className="text-right text-green-400">{entry.score}</td>
                                            <td className="text-right text-gray-400">{(entry.timeTakenMs / 1000).toFixed(1)}s</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="text-center mt-4 text-xs text-gray-500 font-vt323">
                    * This board resets on server restart
                </div>
            </div>
        </motion.div>
    );
};
