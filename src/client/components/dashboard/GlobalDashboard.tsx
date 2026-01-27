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
                                <span className="text-xs font-medium opacity-50 uppercase tracking-widest">Top scores today</span>
                            )}
                        </div>
                        {(landingSummary?.globalTop || []).slice(0, 10).map((e, i) => (
                            <div
                                key={`${e.slug}-${e.nickname}-${i}`}
                                className="grid grid-cols-[2.5rem_1.5fr_1fr_4rem] items-center gap-3 bg-base-200/40 border border-base-300/40 rounded-lg px-4 py-3 hover:bg-base-200/60 transition-colors"
                            >
                                <span className="font-bold text-accent text-right pr-2">
                                    {i + 1}.
                                </span>
                                <span className="font-semibold truncate min-w-0" title={e.nickname}>
                                    {e.nickname}
                                </span>
                                <div className="flex justify-start overflow-hidden">
                                    <button
                                        onClick={() => onSelectTopic(e.slug, e.title)}
                                        className="text-[10px] px-2 py-0.5 rounded bg-accent/15 hover:bg-accent/25 border border-accent/20 font-medium truncate max-w-full"
                                        title={e.title}
                                    >
                                        {e.title}
                                    </button>
                                </div>
                                <span className="text-success font-extrabold text-lg text-right">
                                    {e.score}
                                </span>
                            </div>
                        ))}
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
