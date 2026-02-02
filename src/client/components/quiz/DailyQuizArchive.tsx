import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { KawaiiLoader } from '../loading/KawaiiLoader';

interface DailyQuizArchiveProps {
    onSelectDate: (date: string) => void;
    onClose: () => void;
}

export const DailyQuizArchive: React.FC<DailyQuizArchiveProps> = ({
    onSelectDate,
    onClose
}) => {
    const [dates, setDates] = useState<string[]>([]);
    const [completedDates, setCompletedDates] = useState<string[]>([]); // internal state
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/quiz/daily/list')
            .then(res => res.json())
            .then(data => {
                if (data.dates) {
                    setDates(data.dates);
                }
                if (data.completedDates) {
                    setCompletedDates(data.completedDates);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString(undefined, {
                weekday: 'short',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch { return dateStr; }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="modern-card w-full max-w-lg max-h-[80vh] flex flex-col p-0 overflow-hidden"
            >
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                    <h2 className="text-xl font-bold text-gradient">Past Daily Quizzes</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <KawaiiLoader />
                        </div>
                    ) : dates.length === 0 ? (
                        <div className="text-center text-secondary py-8">
                            No archives found.
                        </div>
                    ) : (
                        dates.map((date) => {
                            const isCompleted = completedDates.includes(date);
                            const isToday = date === new Date().toISOString().slice(0, 10);
                            return (
                                <button
                                    key={date}
                                    onClick={() => onSelectDate(date)}
                                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all group
                    ${isCompleted
                                            ? 'bg-green-900/10 border-green-500/30 hover:bg-green-900/20'
                                            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-primary/50'}
                  `}
                                >
                                    <div className="flex flex-col items-start">
                                        <span className={`font-bold ${isToday ? 'text-accent' : 'text-white'}`}>
                                            {formatDate(date)}
                                        </span>
                                        {isToday && <span className="text-xs text-accent uppercase tracking-wider">Today's Quiz</span>}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {isCompleted ? (
                                            <span className="text-green-400 text-sm font-bold flex items-center gap-1">
                                                ✓ Completed
                                            </span>
                                        ) : (
                                            <span className="text-secondary text-sm group-hover:text-primary transition-colors">
                                                Play →
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </motion.div>
        </div>
    );
};
