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
            <div className="modern-card p-6 sticky top-6">
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                >
                    {showScore ? (
                        <>
                            <div className="flex items-center gap-3 mb-6">
                                <h2 className="text-2xl font-bold text-gradient">
                                    {selectedTopicTitle || 'Topic'} Leaderboard
                                </h2>
                            </div>
                            <div className="relative min-h-[160px] space-y-3">
                                {topicLbLoading && (
                                    <div className="py-2 text-center">
                                        <LoadingDots text="Loading" />
                                    </div>
                                )}
                                {(!topicLeaderboard || topicLeaderboard.length === 0) &&
                                    !topicLbLoading && (
                                        <div className="text-center py-8 text-secondary text-sm">
                                            No scores yet.
                                        </div>
                                    )}
                                {topicLeaderboard &&
                                    topicLeaderboard.slice(0, 10).map((e, i) => (
                                        <div
                                            key={`${e.userKey}-${i}`}
                                            className="grid grid-cols-[2rem_1fr_3rem] items-center gap-3 bg-base-200/40 border border-base-300/40 rounded-lg px-4 py-2"
                                        >
                                            <span className="font-bold text-accent text-right pr-2">
                                                {i + 1}.
                                            </span>
                                            <span className="font-semibold truncate min-w-0" title={e.nickname}>
                                                {e.nickname}
                                            </span>
                                            <span className="text-success font-extrabold text-lg text-right">
                                                {e.score}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </>
                    ) : (
                        !hideRecentPlays && (
                            <>
                                <div className="flex items-center gap-3 mb-6">
                                    <h2 className="text-2xl font-bold text-gradient">Recent Plays</h2>
                                </div>
                                <div className="relative min-h-[160px] max-h-[400px] overflow-y-auto space-y-2 pr-1">
                                    {historyLoading && (
                                        <div className="text-center py-4 text-secondary text-xs">
                                            <LoadingDots text="Loading" />
                                        </div>
                                    )}

                                    {!historyLoading && history.length === 0 && (
                                        <div className="text-center py-8 text-secondary text-sm">
                                            No plays yet.
                                        </div>
                                    )}
                                    {history.map((h, i) => {
                                        const timeAgo = formatRelativeTime(h.timestamp);
                                        return (
                                            <div
                                                key={h.id || i}
                                                className="px-3 py-2 bg-base-200/40 border-b border-base-300/40 last:border-0 hover:bg-base-200/60 transition-colors"
                                            >
                                                <div className="flex items-center gap-3 text-xs w-full">
                                                    <span className="font-bold text-accent shrink-0 min-w-[1.2rem]">{i + 1}.</span>
                                                    <span className="font-semibold text-primary truncate min-w-0 flex-1" title={h.nickname}>
                                                        {h.nickname || 'Player'}
                                                    </span>
                                                    <span className="opacity-60 text-[10px] whitespace-nowrap shrink-0">played</span>
                                                    <span className="font-medium text-secondary truncate max-w-[130px] shrink-0" title={h.title}>
                                                        {h.title}
                                                    </span>
                                                    <span className="opacity-40 text-[9px] whitespace-nowrap shrink-0 ml-1 min-w-[35px] text-right">
                                                        {timeAgo}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )
                    )}
                </motion.div>
            </div>
        </div>
    );
};
