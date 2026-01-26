import { motion } from 'framer-motion';
import LoadingDots from '../components/LoadingDots';

interface ResultsViewProps {
    score: number;
    totalQuestions: number;
    topicTitle: string;
    leaderboard: { nickname: string; score: number }[] | null;
    loading: boolean;
    onPlayAgain: () => void;
    onHome: () => void;
}

export const ResultsView = ({
    score,
    totalQuestions,
    topicTitle,
    leaderboard,
    loading,
    onPlayAgain,
    onHome
}: ResultsViewProps) => {
    const percentage = (score / totalQuestions) * 100;
    let message = 'Better luck next time!';
    if (percentage >= 100) message = 'Flawless Victory!';
    else if (percentage >= 80) message = 'Outstanding!';
    else if (percentage >= 60) message = 'Great Job!';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="lg:col-span-2 space-y-8">
                <motion.div
                    className="modern-card p-8 text-center"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                >
                    <h2 className="text-3xl font-bold mb-2">Quiz Complete</h2>
                    <p className="text-secondary mb-8">{topicTitle}</p>

                    <div className="text-8xl font-black text-gradient mb-4">
                        {score}/{totalQuestions}
                    </div>
                    <p className="text-2xl font-bold text-accent mb-8">{message}</p>

                    <div className="flex gap-4 justify-center">
                        <button onClick={onPlayAgain} className="modern-button modern-button-primary px-8 py-3">
                            Play Again
                        </button>
                        <button onClick={onHome} className="modern-button modern-button-secondary px-8 py-3">
                            Home
                        </button>
                    </div>
                </motion.div>
            </div>

            <div className="lg:col-span-1">
                <div className="modern-card p-6">
                    <h3 className="font-bold text-lg mb-4 text-secondary">Topic Leaderboard</h3>
                    <div className="space-y-3 min-h-[150px]">
                        {loading && <div className="text-center py-4"><LoadingDots text="Updating" /></div>}
                        {!loading && (!leaderboard || leaderboard.length === 0) && (
                            <div className="text-center py-8 text-secondary text-sm">Be the first to score!</div>
                        )}
                        {!loading && leaderboard && leaderboard.slice(0, 10).map((entry, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-base-200/50 rounded p-3">
                                <div className="flex items-center gap-3">
                                    <span className="font-mono font-bold w-6 text-right text-accent">{idx + 1}.</span>
                                    <span className="font-semibold">{entry.nickname}</span>
                                </div>
                                <span className="font-bold text-success">{entry.score}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
