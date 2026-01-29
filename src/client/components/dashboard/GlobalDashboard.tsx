import React from 'react';
import LoadingDots from '../LoadingDots';
import HotTopics from '../HotTopics';
import { LandingSummaryData } from '../../hooks/useLandingSummary';

interface GlobalDashboardProps {
    landingSummaryLoading: boolean;
    landingSummary: LandingSummaryData | null;
    authUser: { nickname: string } | null;
    onSelectTopic: (slug: string, title: string) => void;
}

export const GlobalDashboard: React.FC<GlobalDashboardProps> = ({
    landingSummaryLoading,
    landingSummary,
    authUser,
    onSelectTopic,
}) => {
    return (
        <div className="mt-12 grid gap-10">
            <div>
                <h2 className="text-xl font-bold mb-4 tracking-wide text-secondary">
                    Global Leaderboard
                </h2>
                <div className="modern-card p-4 md:p-6">
                    <div className="space-y-3">
                        <div className="flex items-center mb-2 px-1">
                            {landingSummaryLoading ? (
                                <LoadingDots text="Loading" />
                            ) : (
                                <span className="text-xs font-medium opacity-50 uppercase tracking-widest">Total Scores</span>
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
                                    <span className="font-semibold truncate min-w-0 tracking-wide" title={e.nickname}>
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
            </div>
            <div>
                <h2 className="text-xl font-bold mb-4 tracking-wide text-secondary">
                    Hot Topics
                </h2>
                <HotTopics
                    topics={landingSummary?.hotTopics || []}
                    loading={landingSummaryLoading}
                    onSelect={onSelectTopic}
                />
            </div>
        </div>
    );
};
