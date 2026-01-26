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
    score: number;
    ts: number;
}

interface GameSidebarProps {
    showScore: boolean;
    selectedTopicTitle: string | undefined;
    topicLbLoading: boolean;
    topicLeaderboard: LeaderboardEntry[];
    historyLoading: boolean;
    authUser: { nickname: string } | null;
    history: HistoryEntry[];
    onSelectHistoryTopic: (slug: string, title: string) => void;
}

export const GameSidebar: React.FC<GameSidebarProps> = ({
    showScore,
    selectedTopicTitle,
    topicLbLoading,
    topicLeaderboard,
    historyLoading,
    authUser,
    history,
    onSelectHistoryTopic,
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
                                            key={e.userKey + i}
                                            className="flex items-center gap-4 bg-base-200/40 border border-base-300/40 rounded-lg px-4 py-2"
                                        >
                                            <span className="font-bold text-accent w-7 text-right">
                                                {i + 1}.
                                            </span>
                                            <span className="font-semibold truncate max-w-[120px]">
                                                {e.nickname}
                                            </span>
                                            <span className="ml-auto text-success font-extrabold text-lg">
                                                {e.score}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 mb-6">
                                <h2 className="text-2xl font-bold text-gradient">History</h2>
                            </div>
                            <div className="relative min-h-[160px] space-y-3">
                                {historyLoading && (
                                    <div className="text-center py-4 text-secondary text-xs">
                                        <LoadingDots text="Loading" />
                                    </div>
                                )}
                                {!authUser && !historyLoading && (
                                    <div className="text-center py-8 text-secondary text-sm italic">
                                        Log in to save history.
                                    </div>
                                )}
                                {authUser && !historyLoading && history.length === 0 && (
                                    <div className="text-center py-8 text-secondary text-sm">
                                        No plays yet.
                                    </div>
                                )}
                                {history.slice(0, 10).map((h, i) => (
                                    <div
                                        key={h.id}
                                        className="flex items-center gap-3 bg-base-200/40 border border-base-300/40 rounded-lg px-3 py-2"
                                    >
                                        <span className="text-accent font-bold w-6 text-right">
                                            {i + 1}.
                                        </span>
                                        <button
                                            onClick={() => onSelectHistoryTopic(h.slug, h.title)}
                                            className="text-xs px-3 py-1 rounded-md bg-accent/15 hover:bg-accent/25 border border-accent/30 font-medium truncate max-w-[110px]"
                                        >
                                            {h.title}
                                        </button>
                                        <span className="ml-auto text-success font-extrabold text-lg">
                                            {h.score}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </motion.div>
            </div>
        </div>
    );
};
