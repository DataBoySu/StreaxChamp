import React from 'react';
import LoadingDots from '../LoadingDots';
import HotTopics from '../HotTopics';
import { LandingSummaryData } from '../../hooks/useLandingSummary';

interface GlobalDashboardProps {
    landingSummaryLoading: boolean;
    landingSummary: LandingSummaryData | null;
    authUser: { nickname: string } | null;
    onSelectTopic: (slug: string, title: string) => void;
    history: any[];
    historyLoading: boolean;
}

const formatRelativeTime = (timestamp: number | undefined): string => {
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

export const GlobalDashboard: React.FC<GlobalDashboardProps> = ({
    landingSummaryLoading,
    landingSummary,
    authUser,
    onSelectTopic,
    history,
    historyLoading,
}) => {
    return (
        <div className="grid gap-6 md:gap-10 w-full" style={{ marginRight: '0.5rem' }}>
            {/* Window 3: Global Leaderboard */}
            <div
                className="nes-container is-dark with-title w-full"
                style={{
                    backgroundColor: '#111827',
                    border: '4px solid #dc2626',
                    borderRadius: 0,
                    boxShadow: '8px 8px 0px rgba(0, 0, 0, 0.3)',
                    padding: '1rem',
                    boxSizing: 'border-box',
                }}
            >
                <p className="title" style={{ backgroundColor: '#dc2626', color: '#fff', fontSize: '0.75rem', padding: '0 10px' }}>
                    Global Leaderboard
                </p>
                <div className="space-y-3">
                    <div className="flex items-center mb-2 px-1">
                        {landingSummaryLoading ? (
                            <LoadingDots text="Loading" />
                        ) : (
                            <span className="text-xs font-medium opacity-50 uppercase tracking-widest" style={{ color: '#fff' }}>Total Scores</span>
                        )}
                    </div>
                    <div className="overflow-y-auto pr-1 space-y-3" style={{ maxHeight: '600px' }}>
                        {(landingSummary?.globalTop || []).slice(0, 50).map((e, i) => {
                            let rankClass = 'bg-base-200/40 border-base-300/40 text-base-content';
                            let rankNumberStyle = 'text-accent';
                            const rank = i + 1;
                            let trophyIcon = '';
                            let nameClass = 'font-semibold truncate text-white';
                            let scoreClass = 'font-extrabold text-right text-success';

                            if (rank === 1) {
                                rankClass = 'bg-yellow-900/40 border-yellow-400 text-yellow-100 shadow-[0_0_20px_rgba(255,215,0,0.4)] scale-[1.03] z-10 border-2';
                                rankNumberStyle = 'text-yellow-400 text-2xl drop-shadow-[0_0_8px_rgba(255,215,0,0.8)] font-pixel';
                                trophyIcon = '🥇';
                                nameClass = 'font-black truncate text-yellow-100';
                                scoreClass = 'font-black text-right text-yellow-400';
                            } else if (rank === 2) {
                                rankClass = 'bg-slate-700/40 border-slate-300 text-slate-100 shadow-[0_0_15px_rgba(192,192,192,0.3)] border-2';
                                rankNumberStyle = 'text-slate-300 text-xl drop-shadow-[0_0_6px_rgba(192,192,192,0.6)] font-pixel';
                                trophyIcon = '🥈';
                                nameClass = 'font-bold truncate text-slate-100';
                                scoreClass = 'font-bold text-right text-slate-300';
                            } else if (rank === 3) {
                                rankClass = 'bg-orange-950/40 border-orange-700 text-orange-100 shadow-[0_0_12px_rgba(205,127,50,0.2)] border-2';
                                rankNumberStyle = 'text-orange-600 text-xl drop-shadow-[0_0_4px_rgba(205,127,50,0.5)] font-pixel';
                                trophyIcon = '🥉';
                                nameClass = 'font-bold truncate text-orange-100';
                                scoreClass = 'font-bold text-right text-orange-600';
                            } else {
                                scoreClass = `font-extrabold text-right ${rank <= 3 ? 'text-white' : 'text-success'}`;
                            }

                            return (
                                <div
                                    key={`${e.userKey}-${i}`}
                                    className={`grid items-center border px-3 py-2.5 transition-all ${rankClass} hover:bg-white/5`}
                                    style={{
                                        gridTemplateColumns: rank <= 3 ? '50px 1fr 60px' : '40px 1fr 60px',
                                        gap: '0.75rem',
                                        borderRadius: 0
                                    }}
                                >
                                    <span className={`font-black text-center ${rankNumberStyle}`} style={{ fontSize: rank <= 3 ? 'clamp(0.9rem, 2.5vw, 1.2rem)' : 'clamp(0.75rem, 2vw, 1rem)' }}>
                                        {trophyIcon ? `${trophyIcon} ${rank}` : rank}
                                    </span>
                                    <span className={nameClass} style={{ fontSize: rank <= 3 ? 'clamp(0.85rem, 2.2vw, 1rem)' : 'clamp(0.75rem, 2vw, 0.9rem)' }} title={e.nickname}>
                                        {e.nickname}
                                    </span>
                                    <span className={scoreClass} style={{ fontSize: rank <= 3 ? 'clamp(0.85rem, 2.2vw, 1rem)' : 'clamp(0.75rem, 2vw, 0.9rem)' }}>
                                        {e.score}
                                    </span>
                                </div>
                            );
                        })}
                        {(landingSummary?.globalTop?.length || 0) === 0 && (
                            <div className="col-span-full text-center text-secondary py-6 text-sm">
                                {authUser?.nickname || 'You'}, showcase your streak!
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Window 4: Hot Topics */}
            <div
                className="nes-container is-dark with-title w-full"
                style={{
                    backgroundColor: '#111827',
                    border: '4px solid #dc2626',
                    borderRadius: 0,
                    boxShadow: '8px 8px 0px rgba(0, 0, 0, 0.3)',
                    padding: '1rem',
                    boxSizing: 'border-box',
                }}
            >
                <p className="title" style={{ backgroundColor: '#dc2626', color: '#fff', fontSize: '0.75rem', padding: '0 10px' }}>
                    Hot Topics
                </p>
                <HotTopics
                    topics={landingSummary?.hotTopics || []}
                    loading={landingSummaryLoading}
                    onSelect={onSelectTopic}
                />
            </div>

            {/* Window 5: Recent Plays */}
            <div
                className="nes-container is-dark with-title w-full"
                style={{
                    backgroundColor: '#111827',
                    border: '4px solid #dc2626',
                    borderRadius: 0,
                    boxShadow: '8px 8px 0px rgba(0, 0, 0, 0.3)',
                    padding: '1rem',
                    boxSizing: 'border-box',
                }}
            >
                <p className="title" style={{ backgroundColor: '#dc2626', color: '#fff', fontSize: '0.75rem', padding: '0 10px' }}>
                    Recent Plays
                </p>
                <div className="relative min-h-[160px] max-h-[400px] overflow-y-auto space-y-2 pr-1">
                    {historyLoading && (
                        <div className="text-center py-4 text-secondary text-xs">
                            <LoadingDots text="Loading" />
                        </div>
                    )}

                    {!historyLoading && (history || []).length === 0 && (
                        <div className="text-center py-8 text-secondary text-sm">
                            No plays yet.
                        </div>
                    )}
                    {(history || []).map((h, i) => {
                        const timeAgo = formatRelativeTime(h.timestamp);
                        return (
                            <div
                                key={h.id || i}
                                className="border-b border-white/10 last:border-0 hover:bg-white/5 transition-colors"
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '30px 1fr auto',
                                    gap: '0.75rem',
                                    alignItems: 'center',
                                    padding: '0.625rem 0.75rem',
                                }}
                            >
                                <span className="font-bold text-accent" style={{ fontSize: 'clamp(0.7rem, 1.8vw, 0.85rem)' }}>
                                    {i + 1}.
                                </span>
                                <span className="font-semibold text-white truncate" style={{ fontSize: 'clamp(0.7rem, 1.8vw, 0.85rem)' }} title={h.nickname}>
                                    {h.nickname || 'Player'}
                                </span>
                                <span className="text-secondary text-right whitespace-nowrap" style={{ fontSize: 'clamp(0.65rem, 1.5vw, 0.75rem)' }}>
                                    {timeAgo}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
