import { motion } from 'framer-motion';
import { InteractiveRobot } from '../components/InteractiveRobot';
import HotTopics from '../components/HotTopics';
import LoadingDots from '../components/LoadingDots';
import { useLandingSummary } from '../hooks/useLandingSummary';

interface LandingPageProps {
    onStartQuiz: () => void;
    onSelectTopic: (slug: string, title: string) => void;
    selectedTopic: { title: string; slug: string } | null;
    authUser: { nickname: string } | null;
    showTopicMenu: () => void;
}

export const LandingPage = ({ onStartQuiz, onSelectTopic, selectedTopic, authUser, showTopicMenu }: LandingPageProps) => {
    const { data: landingSummary, loading: landingSummaryLoading, refresh: refreshLanding } = useLandingSummary(true);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 gap-4 lg:gap-8 lg:grid-cols-3 max-w-7xl mx-auto"
        >
            {/* Robot & Main Action */}
            <div className="lg:col-span-2 flex flex-col items-center justify-center py-8">
                <div className="text-center mb-6 w-full relative z-10">
                    <h1 className="text-5xl md:text-7xl font-black text-gradient mb-4 tracking-tighter">
                        DAILY QUIZ
                    </h1>
                    <p className="text-lg text-slate-400 max-w-lg mx-auto mb-8">
                        Master the streak. Own the leaderboard.
                    </p>

                    <div className="mx-auto mb-10 block relative">
                        <InteractiveRobot username={authUser?.nickname || 'Guest'} />
                    </div>

                    <div className="flex flex-col items-center gap-6 relative z-20">
                        <motion.button
                            whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(255, 69, 0, 0.4)" }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onStartQuiz}
                            className="modern-button modern-button-primary text-2xl px-16 py-5 shadow-2xl shadow-primary/30 min-w-[280px]"
                        >
                            Start Quiz
                        </motion.button>

                        <button
                            onClick={showTopicMenu}
                            className="text-sm font-bold text-slate-400 hover:text-primary transition-colors flex items-center gap-2 group p-2"
                        >
                            <span className="opacity-60">TOPIC:</span>
                            <span className="text-slate-100 group-hover:underline decoration-primary">
                                {selectedTopic ? selectedTopic.title : 'General Knowledge (Random)'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Sidebar: Global Leaderboard */}
            <div className="lg:col-span-1">
                <div className="modern-card p-6 sticky top-6 bg-slate-900/40 backdrop-blur-xl border-slate-800/60 shadow-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-6 bg-primary rounded-full" />
                            <h2 className="text-xl font-bold tracking-tight text-white">Global Ranking</h2>
                        </div>
                        <button onClick={() => refreshLanding()} className="p-2 rounded-lg hover:bg-slate-800/80 transition-colors text-slate-400" title="Refresh">
                            ⟳
                        </button>
                    </div>

                    <div className="space-y-3 min-h-[300px]">
                        {landingSummaryLoading && (
                            <div className="flex justify-center py-10">
                                <LoadingDots text="Updating" />
                            </div>
                        )}
                        {!landingSummaryLoading && (landingSummary?.globalTop || []).length === 0 && (
                            <div className="text-center py-20 text-slate-500 text-sm italic">
                                Be the first to claim today's throne!
                            </div>
                        )}
                        {!landingSummaryLoading && (landingSummary?.globalTop || []).slice(0, 10).map((e: any, i: number) => (
                            <div key={i} className="flex items-center gap-4 bg-slate-800/30 hover:bg-slate-800/50 transition-all rounded-xl px-4 py-3 border border-slate-700/30 group">
                                <span className={`font-black w-6 text-center ${i < 3 ? 'text-primary' : 'text-slate-500'}`}>
                                    {i + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-100 truncate">{e.nickname}</p>
                                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider truncate">{e.title}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-black text-primary leading-none">{e.score}</p>
                                    <p className="text-[10px] font-bold text-slate-500 mt-1">XP</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom: Hot Topics */}
            <div className="col-span-full mt-10">
                <div className="flex items-center gap-4 mb-6">
                    <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">Hot Topics</h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent" />
                </div>
                <HotTopics
                    topics={landingSummary?.hotTopics || []}
                    loading={landingSummaryLoading}
                    onSelect={onSelectTopic}
                />
            </div>
        </motion.div>
    );
};
