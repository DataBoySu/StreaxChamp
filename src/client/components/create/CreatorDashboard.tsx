import React, { useState, useEffect } from 'react';
import { CreateQuizView } from './CreateQuizView';
import { Question } from '../../../shared/types/api';
import { FlowShell, FlowBody } from './primitives/FlowShell';
import { FlowHeader } from './primitives/FlowHeader';
import { NoticeCard } from './primitives/NoticeCard';

interface UserQuiz {
    id: string;
    topic: string;
    title: string;
    createdAt: string;
    questionCount: number;
}

interface CreatorDashboardProps {
    username: string;
    onSave: (topic: string, questions: Question[]) => Promise<void>;
    onPost?: (topic: string, questions: Question[]) => Promise<void>;
    isSaving?: boolean | undefined;
}

export const CreatorDashboard: React.FC<CreatorDashboardProps> = ({ username, onSave, onPost, isSaving }) => {
    const [inEditor, setInEditor] = useState(false);
    const [quizzes, setQuizzes] = useState<UserQuiz[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<{ totalQuizzesCreated: number } | null>(null);
    const [editData, setEditData] = useState<{ topic: string; questions: Question[] } | null>(null);

    useEffect(() => {
        if (!inEditor) {
            fetchQuizzes();
            fetchUserStats();
        }
    }, [inEditor, username]);

    const fetchQuizzes = async () => {
        try {
            // Only show full loading state if we have no data
            if (quizzes.length === 0) {
                setLoading(true);
            }
            const res = await fetch(`/api/quizzes/user/${username}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setQuizzes(data);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserStats = async () => {
        try {
            const res = await fetch(`/api/users/${username}/stats`);
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleEdit = async (quizId: string) => {
        try {
            const res = await fetch(`/api/quizzes/${quizId}`);
            if (res.ok) {
                const data = await res.json();
                setEditData({
                    topic: data.title || data.metadata?.title || '',
                    questions: data.questions
                });
                setInEditor(true);
            }
        } catch (e) {
            console.error("Failed to load quiz for editing", e);
        }
    };

    if (inEditor) {
        return (
            <CreateQuizView
                username={username}
                onSave={async (t, q) => {
                    await onSave(t, q);
                    setInEditor(false);
                    fetchQuizzes();
                }}
                onPost={async (t, q) => {
                    if (onPost) {
                        await onPost(t, q);
                        setInEditor(false);
                        fetchQuizzes();
                    }
                }}
                onBack={() => {
                    setInEditor(false);
                    setEditData(null);
                }}
                isSaving={isSaving}
                initialData={editData}
            />
        );
    }

    return (
        <FlowShell>
            <FlowHeader
                title="Creator Studio 🎨"
                rightElement={
                    <button
                        onClick={() => {
                            setEditData(null);
                            setInEditor(true);
                        }}
                        className="modern-button modern-button-primary px-4 py-2 font-bold flex items-center gap-2 text-sm"
                    >
                        <span>+</span> New
                    </button>
                }
            />

            <FlowBody>
                {stats && stats.totalQuizzesCreated > 0 && (
                    <div className="mb-6 animate-float">
                        <NoticeCard
                            type="milestone"
                            title="Milestone Reached!"
                            message={
                                <span>You've created <span className="text-white font-bold">{stats.totalQuizzesCreated}</span> quizzes! Keep the streak going. ⚡</span>
                            }
                        />
                    </div>
                )}

                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-secondary uppercase tracking-wider text-xs mb-4">Quiz History</h2>
                    {loading && quizzes.length === 0 ? (
                        <div className="text-center text-secondary py-12">
                            <span className="animate-pulse">Loading creation history...</span>
                        </div>
                    ) : quizzes.length === 0 ? (
                        <div className="text-center text-secondary py-16 bg-white/5 rounded-xl border border-white/10 border-dashed">
                            <div className="text-4xl mb-4">📝</div>
                            <p className="mb-4">You haven't created any quizzes yet.</p>
                            <button
                                onClick={() => setInEditor(true)}
                                className="text-primary hover:underline text-sm"
                            >
                                Start your first quiz now
                            </button>
                        </div>
                    ) : (
                        <div className="grid gap-3 pr-2">
                            {/* The internal scroll is handled by FlowBody now, so we remove max-h logic here */}
                            {quizzes.map(q => (
                                <div key={q.id} className="modern-card p-4 flex justify-between items-center bg-black/40 hover:bg-black/60 transition-colors border border-white/5 group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-lg">
                                            {(q.title || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-base">{q.title}</h3>
                                            <div className="text-xs text-secondary flex gap-2 mt-1">
                                                <span>📅 {new Date(q.createdAt).toLocaleDateString()}</span>
                                                <span>•</span>
                                                <span>❓ {q.questionCount} Questions</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleEdit(q.id)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg border border-white/10"
                                        >
                                            Edit
                                        </button>
                                        <span className="text-[10px] uppercase font-bold bg-success/10 text-success px-2 py-1 rounded border border-success/20">
                                            Saved
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </FlowBody>
        </FlowShell>
    );
};
