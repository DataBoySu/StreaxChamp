import React from 'react';
import LoadingDots from '../LoadingDots';
import HotTopics from '../HotTopics';
import { LandingSummaryData } from '../../hooks/useLandingSummary';

interface GlobalDashboardProps {
    landingSummaryLoading: boolean;
    landingSummary: LandingSummaryData | null;
    refreshLanding: () => void;
    authUser: { nickname: string } | null;
    onSelectTopic: (slug: string, title: string) => void;
}

export const GlobalDashboard: React.FC<GlobalDashboardProps> = ({
    landingSummaryLoading,
    landingSummary,
    refreshLanding,
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
                        <div className="flex items-center justify-between mb-1">
                            {landingSummaryLoading ? (
                                <LoadingDots text="Loading" />
                            ) : (
                                <span className="text-xs opacity-60">Top scores today</span>
                            )}
                            <button
                                onClick={refreshLanding}
                                className="p-1 rounded hover:bg-base-300"
                                aria-label="Refresh"
                                title="Refresh"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    className="w-5 h-5"
                                >
                                    <path d="M12 6V3L8 7l4 4V8c2.757 0 5 2.243 5 5a5 5 0 0 1-8.594 3.5 1 1 0 1 0-1.414 1.414A7 7 0 0 0 19 13c0-3.86-3.141-7-7-7Z" />
                                </svg>
                            </button>
                        </div>
                        {(landingSummary?.globalTop || []).slice(0, 10).map((e, i) => (
                            <div
                                key={e.slug + e.nickname + i}
                                className="flex items-center gap-4 bg-base-200/40 border border-base-300/40 rounded-lg px-4 py-3"
                            >
                                <span className="font-bold text-accent min-w-7 text-right">
                                    {i + 1}.
                                </span>
                                <span className="font-semibold truncate max-w-[120px]">
                                    {e.nickname}
                                </span>
                                <button
                                    onClick={() => onSelectTopic(e.slug, e.title)}
                                    className="text-xs px-3 py-1 rounded-md bg-accent/15 hover:bg-accent/25 border border-accent/30 font-medium mr-auto"
                                >
                                    {e.title}
                                </button>
                                <span className="text-success font-extrabold text-xl tracking-wide">
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
