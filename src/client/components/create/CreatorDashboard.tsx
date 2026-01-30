import React, { useState, useEffect } from 'react';
import { CreateQuizView } from './CreateQuizView';
import { Question } from '../../../shared/types/api';

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
            setLoading(true);
            const res = await fetch(`/api/quizzes/user/${username}`);
            if (res.ok) {
                const data = await res.json();
                setQuizzes(data);
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
        // Fetch full quiz details for editing
        try {
            // We assume a route /api/quizzes/:id exists or we use the specific fetch
            // Currently FirestoreRestService has getUserQuiz, but we need an API endpoint for it?
            // Wait, we don't have a direct /api/quizzes/:id endpoint in api.ts yet, only /user/:username
            // But wait, we added getUserQuiz to FS service. Let's check api.ts if we exposed it. 
            // If not, we might need to rely on what we have or add it.
            // Actually, for now, let's assume we can pass what we have if full details were in list, 
            // BUT the list usually doesn't have full questions. 
            // Let's add the fetch logic assuming we will add the endpoint or use an existing one.
            // Actually, let's verify api.ts.
            // If not available, we can add it quickly. 
            // For now, let's try to fetch from a new endpoint we will create: /api/quizzes/:id
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
        <div className="max-w-4xl mx-auto p-4 w-full text-white">
            <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                <h1 className="text-2xl font-bold text-gradient">Creator Studio 🎨</h1>
                <button
                    onClick={() => {
                        setEditData(null);
                        setInEditor(true);
                    }}
                    className="modern-button modern-button-primary px-4 py-2 font-bold flex items-center gap-2"
                >
                    <span>+</span> Create New Quiz
                </button>
            </div>

            {stats && stats.totalQuizzesCreated > 0 && (
                <div className="mb-6 animate-float">
                    <div className="bg-primary/10 border-2 border-primary/30 rounded-2xl p-4 flex items-center gap-4">
                        <div className="text-3xl">🏆</div>
                        <div>
                            <p className="font-bold text-primary">Milestone Reached!</p>
                            <p className="text-sm text-secondary">You've created <span className="text-white font-bold">{stats.totalQuizzesCreated}</span> quizzes! Keep the streak going. ⚡</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                <h2 className="text-lg font-bold text-secondary uppercase tracking-wider text-xs mb-4">Quiz History</h2>
                {loading ? (
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
                    <div className="grid gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                        {quizzes.map(q => (
                            <div key={q.id} className="modern-card p-4 flex justify-between items-center bg-black/40 hover:bg-black/60 transition-colors border border-white/5 group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-lg">
                                        {q.title.charAt(0).toUpperCase()}
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
        </div>
    );
};
