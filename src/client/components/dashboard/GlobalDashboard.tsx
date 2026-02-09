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

const getTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
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
        <div className="grid gap-10 w-full">
            {/* Window 3: Global Leaderboard */}
            <div
                className="nes-container is-dark with-title is-rounded w-full"
                style={{
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    border: '4px solid #dc2626',
                    boxShadow: '0 0 30px rgba(220, 38, 38, 0.1), 8px 8px 0px rgba(0, 0, 0, 0.3)',
                    padding: '1.5rem',
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
                    {(landingSummary?.globalTop || []).slice(0, 50).map((e, i) => {
                        let rankClass = 'bg-base-200/40 border-base-300/40 text-base-content';
                        let rankNumberStyle = 'text-accent';
                        const rank = i + 1;

                        if (rank === 1) {
                            rankClass = 'bg-yellow-900/40 border-yellow-400 text-yellow-100 shadow-[0_0_20px_rgba(255,215,0,0.4)] scale-[1.03] z-10 border-2';
                            rankNumberStyle = 'text-yellow-400 text-2xl drop-shadow-[0_0_8px_rgba(255,215,0,0.8)] font-pixel';
                        } else if (rank === 2) {
                            rankClass = 'bg-slate-700/40 border-slate-300 text-slate-100 shadow-[0_0_15px_rgba(192,192,192,0.3)] border-2';
                            rankNumberStyle = 'text-slate-300 text-xl drop-shadow-[0_0_6px_rgba(192,192,192,0.6)] font-pixel';
                        } else if (rank === 3) {
                            rankClass = 'bg-orange-950/40 border-orange-700 text-orange-100 shadow-[0_0_12px_rgba(205,127,50,0.2)] border-2';
                            rankNumberStyle = 'text-orange-600 text-xl drop-shadow-[0_0_4px_rgba(205,127,50,0.5)] font-pixel';
                        }

                        return (
                            <div
                                key={`${e.userKey}-${i}`}
                                className={`grid grid-cols-[3rem_1fr_auto] items-center gap-3 border rounded-lg px-4 py-3 transition-all ${rankClass} hover:bg-base-200/60`}
                            >
                                <span className={`font-black text-right pr-2 ${rankNumberStyle}`}>
                                    {rank}
                                </span>
                                <span className="font-semibold truncate min-w-0 tracking-wide text-white" title={e.nickname}>
                                    {e.nickname}
                                </span>
                                <span className={`font-extrabold text-lg text-right ${rank <= 3 ? 'text-white' : 'text-success'}`}>
                                    {e.score} PTS
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

            {/* Window 4: Hot Topics */}
            <div
                className="nes-container is-dark with-title is-rounded w-full"
                style={{
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    border: '4px solid #dc2626',
                    boxShadow: '0 0 30px rgba(220, 38, 38, 0.1), 8px 8px 0px rgba(0, 0, 0, 0.3)',
                    padding: '1.5rem',
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
                className="nes-container is-dark with-title is-rounded w-full"
                style={{
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    border: '4px solid #dc2626',
                    boxShadow: '0 0 30px rgba(220, 38, 38, 0.1), 8px 8px 0px rgba(0, 0, 0, 0.3)',
                    padding: '1.5rem',
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
                        const timeAgo = getTimeAgo(h.ts || Date.now());
                        return (
                            <div
                                key={h.id || i}
                                className="px-3 py-2 bg-base-200/40 border-b border-base-300/40 last:border-0 hover:bg-base-200/60 transition-colors"
                            >
                                <div className="flex items-center gap-3 text-xs w-full">
                                    <span className="font-bold text-accent shrink-0 min-w-[1.2rem]">{i + 1}.</span>
                                    <span className="font-semibold text-white truncate min-w-0 flex-1" title={h.nickname}>
                                        {h.nickname || 'Player'}
                                    </span>
                                    <span className="opacity-60 text-[10px] whitespace-nowrap shrink-0 text-white">played</span>
                                    <span className="font-medium text-secondary truncate max-w-[130px] shrink-0" title={h.title}>
                                        {h.title}
                                    </span>
                                    <span className="opacity-40 text-[9px] whitespace-nowrap shrink-0 ml-1 min-w-[35px] text-right text-white">
                                        {timeAgo}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
