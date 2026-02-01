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

const CREATOR_THEME = {
    appBg: "#FFF7ED",        // warm cream
    panelBg: "#FFFFFF",     // pure white cards
    border: "#2B2B2B",      // pixel black
    textPrimary: "#1F1F1F",
    textSecondary: "#5A5A5A",
    accent: "#FF7A00",      // Streax orange
    accentSoft: "#FFE1C4",
};

// Define strict state shape to prevent incorrect "empty" states
type LibraryState =
    | { status: "loading"; items: [] }
    | { status: "empty"; items: [] }
    | { status: "ready"; items: UserQuiz[] };

export const CreatorDashboard: React.FC<CreatorDashboardProps> = ({ username, onSave, onPost, isSaving }) => {
    const [inEditor, setInEditor] = useState(false);

    // 1️⃣ Fix Library Disappearing: Explicit state machine
    const [library, setLibrary] = useState<LibraryState>({
        status: "loading",
        items: [],
    });

    const [stats, setStats] = useState<{ totalQuizzesCreated: number } | null>(null);
    const [editData, setEditData] = useState<{ topic: string; questions: Question[] } | null>(null);

    // Initial load effect - runs once per mount/username change
    useEffect(() => {
        let cancelled = false;

        async function load() {
            // Stats
            try {
                const sRes = await fetch(`/api/users/${username}/stats`);
                if (!cancelled && sRes.ok) setStats(await sRes.json());
            } catch (e) { console.error(e); }

            // Library
            try {
                const res = await fetch(`/api/quizzes/user/${username}`);
                if (cancelled) return;

                if (res.ok) {
                    const data = await res.json();
                    if (cancelled) return;

                    if (Array.isArray(data) && data.length > 0) {
                        setLibrary({ status: "ready", items: data });
                    } else {
                        setLibrary({ status: "empty", items: [] });
                    }
                } else {
                    setLibrary({ status: "empty", items: [] });
                }
            } catch (e) {
                if (!cancelled) setLibrary({ status: "empty", items: [] });
            }
        }

        load();

        return () => { cancelled = true; };
    }, [username]);

    // Helper for manual re-fetches (e.g. after save)
    const refreshLibrary = async () => {
        try {
            const res = await fetch(`/api/quizzes/user/${username}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    setLibrary({ status: "ready", items: data });
                } else {
                    setLibrary({ status: "empty", items: [] });
                }
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
                    refreshLibrary();
                }}
                onPost={async (t, q) => {
                    if (onPost) {
                        await onPost(t, q);
                        setInEditor(false);
                        refreshLibrary();
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
        <div
            style={{
                backgroundColor: CREATOR_THEME.appBg,
                color: CREATOR_THEME.textPrimary,
                minHeight: '100vh',
                width: '100%',
                position: 'relative',
                isolation: 'isolate' // Create new stacking context
            }}
            className="font-sans"
        >
            {/* Custom Header Locked to Theme */}
            <div className="w-full p-6 border-b-2" style={{ borderColor: CREATOR_THEME.border }}>
                <h1 className="text-3xl font-black uppercase tracking-tight" style={{ color: CREATOR_THEME.accent }}>
                    Creator Studio
                </h1>
            </div>

            <div className="max-w-4xl mx-auto p-6">
                {/* 1. Milestone Note (Accent Soft, NES Border) */}
                {stats && stats.totalQuizzesCreated > 0 && (
                    <div
                        className="mb-8 flex items-center justify-center gap-3 py-3 px-6 mx-auto max-w-lg rounded-lg"
                        style={{
                            backgroundColor: CREATOR_THEME.accentSoft,
                            border: `2px solid ${CREATOR_THEME.border}`,
                            color: CREATOR_THEME.textPrimary
                        }}
                    >
                        <span className="text-xl">⚡</span>
                        <span className="text-sm font-bold">You've created {stats.totalQuizzesCreated} quizzes. Keep building!</span>
                    </div>
                )}

                {/* 2. Primary CTA: "Create New Quiz" (Locked White, Thick Border) */}
                <div className="mb-10">
                    <button
                        onClick={() => {
                            setEditData(null);
                            setInEditor(true);
                        }}
                        className="w-full group relative overflow-hidden p-10 text-center transition-all"
                        style={{
                            backgroundColor: CREATOR_THEME.panelBg,
                            border: `4px solid ${CREATOR_THEME.border}`,
                            boxShadow: `8px 8px 0 0 ${CREATOR_THEME.border}`,
                            color: CREATOR_THEME.textPrimary
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translate(2px, 2px)";
                            e.currentTarget.style.boxShadow = `6px 6px 0 0 ${CREATOR_THEME.border}`;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translate(0, 0)";
                            e.currentTarget.style.boxShadow = `8px 8px 0 0 ${CREATOR_THEME.border}`;
                        }}
                    >
                        <div className="flex flex-col items-center gap-4">
                            <div className="text-4xl transition-transform group-hover:scale-110 group-hover:rotate-12">✨</div>
                            <h2 className="text-2xl font-black tracking-wide uppercase" style={{ color: CREATOR_THEME.textPrimary }}>Create New Quiz</h2>
                            <p className="text-sm font-bold max-w-xs mx-auto" style={{ color: CREATOR_THEME.textSecondary }}>
                                Combine a topic and 5 questions to challenge the community.
                            </p>
                        </div>
                    </button>
                </div>

                {/* 3. Quiz Library Section */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between border-b-4 pb-2 mb-6" style={{ borderColor: CREATOR_THEME.border }}>
                        <h2 className="text-lg font-black uppercase tracking-wider" style={{ color: CREATOR_THEME.accent }}>Your Library</h2>
                        {library.status === 'ready' && (
                            <span className="text-sm font-bold" style={{ color: CREATOR_THEME.textSecondary }}>{library.items.length} PROJECTS</span>
                        )}
                    </div>

                    {/* RENDERING LOGIC: Strict State Machine */}
                    {library.status === 'loading' && (
                        <div className="text-center py-12 font-bold" style={{ color: CREATOR_THEME.textSecondary }}>
                            <span className="animate-pulse">Loading workspace...</span>
                        </div>
                    )}

                    {library.status === 'empty' && (
                        <div
                            className="text-center py-12 font-bold border-2 border-dashed"
                            style={{
                                borderColor: CREATOR_THEME.textSecondary,
                                backgroundColor: 'rgba(255,255,255,0.5)',
                                color: CREATOR_THEME.textSecondary
                            }}
                        >
                            <p>Your library is empty.</p>
                        </div>
                    )}

                    {library.status === 'ready' && (
                        <div className="grid gap-6 pr-2">
                            {/* Cards (Locked White, Pixel Depth) */}
                            {library.items.map(q => (
                                <div
                                    key={q.id}
                                    className="relative p-6 flex flex-col sm:flex-row sm:items-center justify-between transition-all"
                                    style={{
                                        backgroundColor: CREATOR_THEME.panelBg,
                                        border: `2px solid ${CREATOR_THEME.border}`,
                                        boxShadow: `4px 4px 0 0 ${CREATOR_THEME.border}`,
                                        color: CREATOR_THEME.textPrimary
                                    }}
                                >
                                    <div className="flex items-center gap-5 mb-4 sm:mb-0">
                                        {/* 2️⃣ Fix First-Letter Bug: Removed avatar container completely */}
                                        <div>
                                            {/* Fix: Plain text title only. No splits, no derived letters. */}
                                            <h3 className="font-black text-lg leading-tight mb-2" style={{ color: CREATOR_THEME.textPrimary }}>
                                                {q.title}
                                            </h3>
                                            <div className="text-xs font-bold flex flex-wrap gap-4 font-mono uppercase px-2 py-1 border inline-flex"
                                                style={{
                                                    backgroundColor: CREATOR_THEME.appBg,
                                                    borderColor: '#E5E5E5', // subtle internal border
                                                    color: CREATOR_THEME.textSecondary
                                                }}
                                            >
                                                <span>{new Date(q.createdAt).toLocaleDateString()}</span>
                                                <span style={{ opacity: 0.3 }}>|</span>
                                                <span>{q.questionCount} Qs</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 self-end sm:self-auto">
                                        <button
                                            onClick={() => handleEdit(q.id)}
                                            className="px-6 py-2 text-xs font-bold uppercase tracking-wide transition-colors"
                                            style={{
                                                backgroundColor: CREATOR_THEME.panelBg,
                                                border: `2px solid ${CREATOR_THEME.border}`,
                                                color: CREATOR_THEME.textPrimary
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = CREATOR_THEME.appBg}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = CREATOR_THEME.panelBg}
                                        >
                                            Edit
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
