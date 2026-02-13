import React from 'react';
import { motion } from 'framer-motion';
import LoadingDots from '../LoadingDots';

interface LeaderboardEntry {
    userKey: string;
    nickname: string;
    score: number;
}

interface HistoryEntry {
    id: string;
    slug: string;
    title: string;
    score?: number;
    timestamp: number; // Changed from ts to match server response
    nickname?: string;
}

interface GameSidebarProps {
    showScore: boolean;
    selectedTopicTitle: string | undefined;
    topicLbLoading: boolean;
    topicLeaderboard: LeaderboardEntry[];
    historyLoading: boolean;
    history: HistoryEntry[];
    hideRecentPlays?: boolean;
}

// Fresh robust timestamp formatting - handles seconds, milliseconds, and edge cases
const formatRelativeTime = (timestamp: number | undefined): string => {
    // console.log('[GameSidebar] Formatting timestamp:', timestamp); // Debug log
    if (!timestamp || timestamp === 0) return 'just now';

    // Auto-detect: if timestamp is < 10 billion, it's seconds, convert to ms
    const timestampMs = timestamp < 10000000000 ? timestamp * 1000 : timestamp;

    // Calculate difference
    const nowMs = Date.now();
    const diffMs = nowMs - timestampMs;

    // Handle future timestamps or invalid
    if (diffMs < 0) return 'just now';

    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return 'just now';

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;

    const years = Math.floor(months / 12);
    return `${years}y ago`;
};

export const GameSidebar: React.FC<GameSidebarProps> = ({
    showScore,
    selectedTopicTitle,
    topicLbLoading,
    topicLeaderboard,
    historyLoading,
    history,
    hideRecentPlays = false,
}) => {
    return (
        <div className="lg:col-span-1">
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="w-full"
            >
                {showScore ? (
                    <div
                        className="nes-container is-dark with-title w-full"
                        style={{
                            backgroundColor: '#111827',
                            border: '4px solid #dc2626',
                            borderRadius: 0,
                            boxShadow: '8px 8px 0px rgba(0, 0, 0, 0.4)',
                            padding: '1.25rem 0.75rem',
                        }}
                    >
                        <p className="title" style={{ backgroundColor: '#dc2626', color: '#fff', fontSize: '0.75rem', padding: '0 10px', margin: 0 }}>
                            {selectedTopicTitle || 'Topic'} Leaderboard
                        </p>
                        <div
                            className="overflow-y-auto overflow-x-hidden pr-8 space-y-3"
                            style={{
                                maxHeight: '480px',
                                scrollbarGutter: 'stable',
                                scrollbarWidth: 'thin',
                                scrollbarColor: '#dc2626 rgba(17, 24, 39, 0.95)'
                            }}
                        >
                            {topicLbLoading && (
                                <div className="py-2 text-center">
                                    <LoadingDots text="Loading" />
                                </div>
                            )}
                            {(!topicLeaderboard || topicLeaderboard.length === 0) &&
                                !topicLbLoading && (
                                    <div className="text-center py-8 text-slate-400 text-sm font-vt323" style={{ fontSize: '1.2rem' }}>
                                        No rankings detected in this sector.
                                    </div>
                                )}
                            {topicLeaderboard &&
                                topicLeaderboard.slice(0, 50).map((e, i) => {
                                    const rank = i + 1;
                                    let rankClass = 'bg-slate-800/40 border-slate-700/50';
                                    let rankNumberStyle = 'text-slate-400';
                                    let trophyIcon = '';
                                    let nameClass = 'font-semibold truncate text-white';
                                    let scoreClass = 'font-extrabold text-right text-success';

                                    if (rank === 1) {
                                        rankClass = 'bg-yellow-900/40 border-yellow-400 shadow-[0_0_15px_rgba(255,215,0,0.3)] border-2';
                                        rankNumberStyle = 'text-yellow-400';
                                        trophyIcon = '🥇';
                                        nameClass = 'font-black truncate text-yellow-100';
                                        scoreClass = 'font-black text-right text-yellow-400';
                                    } else if (rank === 2) {
                                        rankClass = 'bg-slate-700/40 border-slate-300 border-2';
                                        rankNumberStyle = 'text-slate-300';
                                        trophyIcon = '🥈';
                                        nameClass = 'font-bold truncate text-slate-100';
                                        scoreClass = 'font-bold text-right text-slate-300';
                                    } else if (rank === 3) {
                                        rankClass = 'bg-orange-950/40 border-orange-700 border-2';
                                        rankNumberStyle = 'text-orange-600';
                                        trophyIcon = '🥉';
                                        nameClass = 'font-bold truncate text-orange-100';
                                        scoreClass = 'font-bold text-right text-orange-600';
                                    }

                                    return (
                                        <div
                                            key={`${e.userKey}-${i}`}
                                            className={`grid items-center border px-3 py-2.5 transition-all ${rankClass} hover:bg-white/5 w-full`}
                                            style={{
                                                gridTemplateColumns: '40px 1fr 50px',
                                                gap: '0.75rem',
                                                borderRadius: 0,
                                                boxSizing: 'border-box'
                                            }}
                                        >
                                            <span className={`font-black text-center ${rankNumberStyle}`} style={{
                                                fontSize: rank <= 3 ? '1.2rem' : '0.8rem',
                                                fontFamily: "'Press Start 2P', cursive"
                                            }}>
                                                {trophyIcon ? trophyIcon : rank}
                                            </span>
                                            <span className={nameClass} style={{
                                                fontSize: rank <= 3 ? 'clamp(0.85rem, 2.2vw, 1rem)' : 'clamp(0.75rem, 2vw, 0.9rem)',
                                                fontFamily: "'VT323', monospace",
                                                minWidth: 0
                                            }} title={e.nickname}>
                                                {e.nickname}
                                            </span>
                                            <span className={scoreClass} style={{
                                                fontSize: rank <= 3 ? 'clamp(0.85rem, 2.2vw, 1rem)' : 'clamp(0.75rem, 2vw, 0.9rem)',
                                                fontFamily: "'VT323', monospace"
                                            }}>
                                                {e.score}
                                            </span>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                ) : (
                    !hideRecentPlays && (
                        <div
                            className="nes-container is-dark with-title w-full"
                            style={{
                                backgroundColor: '#111827',
                                border: '4px solid #2097f3',
                                borderRadius: 0,
                                boxShadow: '8px 8px 0px rgba(0, 0, 0, 0.4)',
                                padding: '1.25rem 0.75rem',
                            }}
                        >
                            <p className="title" style={{ backgroundColor: '#2097f3', color: '#fff', fontSize: '0.75rem', padding: '0 10px', margin: 0 }}>
                                Recent Plays
                            </p>
                            <div
                                className="overflow-y-auto overflow-x-hidden pr-8 space-y-2"
                                style={{
                                    maxHeight: '400px',
                                    scrollbarGutter: 'stable',
                                    scrollbarWidth: 'thin',
                                    scrollbarColor: '#2097f3 rgba(17, 24, 39, 0.95)'
                                }}
                            >
                                {historyLoading && (
                                    <div className="text-center py-4">
                                        <LoadingDots text="Loading" />
                                    </div>
                                )}
                                {!historyLoading && history.length === 0 && (
                                    <div className="text-center py-8 text-slate-400 text-sm font-vt323" style={{ fontSize: '1.2rem' }}>
                                        No plays detected in this sector.
                                    </div>
                                )}
                                {history.map((h, i) => {
                                    const timeAgo = formatRelativeTime(h.timestamp);
                                    return (
                                        <div
                                            key={h.id || i}
                                            className="px-3 py-2 bg-slate-800/40 border-b border-slate-700/30 last:border-0 hover:bg-slate-700/40 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 w-full">
                                                <span className="font-bold text-blue-400 shrink-0 min-w-[1.2rem] font-pixel text-[10px]">{i + 1}.</span>
                                                <span className="font-semibold text-slate-100 truncate min-w-0 flex-1 font-vt323 text-lg" title={h.nickname}>
                                                    {h.nickname || 'Player'}
                                                </span>
                                                <span className="text-slate-500 font-vt323 text-sm italic">played</span>
                                                <span className="font-medium text-blue-300 truncate max-w-[130px] shrink-0 font-vt323 text-base" title={h.title}>
                                                    {h.title}
                                                </span>
                                                <span className="text-slate-600 font-vt323 text-xs ml-1 min-w-[45px] text-right">
                                                    {timeAgo}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
                )}
            </motion.div>
        </div>
    );

};
