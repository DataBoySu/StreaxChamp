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
    const [completedDates, setCompletedDates] = useState<string[]>([]);
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
                className="nes-container is-dark w-full max-w-lg max-h-[80vh] flex flex-col p-0"
                style={{
                    borderRadius: 0,
                    background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.95))',
                    border: '4px solid #00ff88',
                    boxShadow: '0 0 30px rgba(0, 255, 136, 0.4), 8px 8px 0px rgba(0, 0, 0, 0.5)',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1.5rem',
                        borderBottom: '3px solid rgba(0, 255, 136, 0.3)',
                        background: 'rgba(0, 255, 136, 0.05)',
                    }}
                >
                    <h2
                        style={{
                            fontFamily: "'Press Start 2P', cursive",
                            fontSize: 'clamp(0.75rem, 2vw, 0.9rem)',
                            color: '#00ff88',
                            textShadow: '0 0 10px rgba(0, 255, 136, 0.5)',
                            margin: 0,
                        }}
                    >
                        Past Daily Quizzes
                    </h2>
                    <button
                        onClick={onClose}
                        className="nes-btn is-error"
                        style={{
                            fontFamily: "'Press Start 2P', cursive",
                            fontSize: '0.625rem',
                            padding: '0.5rem',
                            borderRadius: 0,
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div
                    className="flex-1 overflow-y-auto p-4 space-y-3"
                    style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#00ff88 rgba(255, 255, 255, 0.1)',
                    }}
                >
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <KawaiiLoader />
                        </div>
                    ) : dates.length === 0 ? (
                        <div
                            style={{
                                textAlign: 'center',
                                padding: '2rem',
                                fontFamily: "'VT323', monospace",
                                fontSize: '1.2rem',
                                color: '#9ca3af',
                            }}
                        >
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
                                    className={`nes-btn w-full ${isCompleted ? 'is-success' : 'is-primary'}`}
                                    style={{
                                        fontFamily: "'VT323', monospace",
                                        fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
                                        padding: '1rem',
                                        borderRadius: 0,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        textAlign: 'left',
                                        boxShadow: isCompleted
                                            ? '0 0 15px rgba(0, 255, 136, 0.3)'
                                            : '0 0 10px rgba(150, 206, 180, 0.2)',
                                    }}
                                >
                                    <div>
                                        <div
                                            style={{
                                                fontFamily: "'Press Start 2P', cursive",
                                                fontSize: 'clamp(0.5rem, 1.5vw, 0.65rem)',
                                                color: isToday ? '#ff69b4' : isCompleted ? '#00ff88' : '#96ceb4',
                                                marginBottom: '0.25rem',
                                            }}
                                        >
                                            {formatDate(date)}
                                        </div>
                                        {isToday && (
                                            <div
                                                style={{
                                                    fontFamily: "'VT323', monospace",
                                                    fontSize: '0.75rem',
                                                    color: '#ff69b4',
                                                    textTransform: 'uppercase',
                                                }}
                                            >
                                                Today's Quiz
                                            </div>
                                        )}
                                    </div>
                                    <div
                                        style={{
                                            fontFamily: "'VT323', monospace",
                                            fontSize: '0.9rem',
                                            color: isCompleted ? '#00ff88' : '#96ceb4',
                                        }}
                                    >
                                        {isCompleted ? '✓ Done' : 'Play →'}
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
