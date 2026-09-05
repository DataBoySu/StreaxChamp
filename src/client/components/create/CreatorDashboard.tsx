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
    appBg: "#FFF6E5",        // darker warm paper
    panelBg: "#FFFFFF",     // pure white cards
    border: "#2B2B2B",      // pixel black
    textPrimary: "#1F1F1F",
    textSecondary: "#5A5A5A",
    accent: "#FF7A00",      // Streax orange
    accentSoft: "#FFE1C4",
};

import { motion, AnimatePresence } from "framer-motion";

// Define strict state shape to prevent incorrect "empty" states
type LibraryState =
    | { status: "loading"; items: [] }
    | { status: "empty"; items: [] }
    | { status: "ready"; items: UserQuiz[] };

export const CreatorDashboard: React.FC<CreatorDashboardProps> = ({ username, onSave, onPost, isSaving }) => {
    const [inEditor, setInEditor] = useState(false);
    // Spotlight Effect State
    const [hoveredId, setHoveredId] = useState<string | null>(null);

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

        void load();

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
                    await refreshLibrary();
                }}
                onPost={async (t, q) => {
                    if (onPost) {
                        await onPost(t, q);
                        setInEditor(false);
                        await refreshLibrary();
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
                isolation: 'isolate',
                // REGRESSION FIX: Rectangular only, no device frame
                // USER REQUEST: Add border to the canvas
                border: `3px solid ${CREATOR_THEME.border}`,
                backgroundImage: 'radial-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
                // FIX OVERSCROLL/OVERFLOW
                boxSizing: 'border-box'
            }}
            className="font-sans"
        >
            {/* Custom Header Locked to Theme */}
            <div className="w-full px-6 py-8 border-b-2" style={{ borderColor: CREATOR_THEME.border }}>
                <h1 className="text-4xl font-black uppercase tracking-tight" style={{ color: CREATOR_THEME.accent }}>
                    Creator Studio
                </h1>
            </div>

            {/* FIX: Use px-4 on mobile, px-8 on larger screens to prevent overflow */}
            <div className="max-w-4xl mx-auto p-4 md:p-8">

                {/* === MILESTONE COMPONENT START === */}
                {/* Use this section to modify the 'Milestone Reached' banner. */}
                {stats && stats.totalQuizzesCreated > 0 && (
                    <div
                        className="mb-12 flex flex-col md:flex-row items-center justify-between gap-4 py-6 px-8 mx-auto w-full rounded-xl shadow-sm"
                        style={{
                            backgroundColor: CREATOR_THEME.panelBg,
                            border: `2px solid ${CREATOR_THEME.border}`,
                            color: CREATOR_THEME.textPrimary
                        }}
                    >
                        <div className="flex items-center gap-4">
                            <span className="text-3xl">⚡</span>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Milestone Reached</span>
                                <span className="text-lg font-bold leading-tight">You've created {stats.totalQuizzesCreated} quizzes. Keep building!</span>
                            </div>
                        </div>
                    </div>
                )}
                {/* === MILESTONE COMPONENT END === */}

                {/* 2. Primary CTA: "Create New Quiz" (Locked White, Thick Border) */}
                <div className="mb-12">
                    <button
                        onClick={() => {
                            setEditData(null);
                            setInEditor(true);
                        }}
                        className="w-full group relative overflow-hidden py-14 px-6 md:px-10 text-center transition-all"
                        style={{
                            backgroundColor: CREATOR_THEME.panelBg,
                            border: `4px solid ${CREATOR_THEME.border}`,
                            boxShadow: `8px 8px 0 0 ${CREATOR_THEME.border}`,
                            color: CREATOR_THEME.textPrimary,
                            transform: 'translate(0, 0)' // Reset transform for base state
                        }}
                        // HOVER & PRESS LOGIC RESTORED
                        onMouseEnter={(e) => {
                            // Hover state: slight depress
                            e.currentTarget.style.transform = "translate(2px, 2px)";
                            e.currentTarget.style.boxShadow = `6px 6px 0 0 ${CREATOR_THEME.border}`;
                        }}
                        onMouseLeave={(e) => {
                            // Reset to base
                            e.currentTarget.style.transform = "translate(0, 0)";
                            e.currentTarget.style.boxShadow = `8px 8px 0 0 ${CREATOR_THEME.border}`;
                        }}
                        onMouseDown={(e) => {
                            // Deep press
                            e.currentTarget.style.transform = "translate(6px, 6px)";
                            e.currentTarget.style.boxShadow = `2px 2px 0 0 ${CREATOR_THEME.border}`;
                        }}
                        onMouseUp={(e) => {
                            // Return to Hover state (since mouse is likely still over)
                            e.currentTarget.style.transform = "translate(2px, 2px)";
                            e.currentTarget.style.boxShadow = `6px 6px 0 0 ${CREATOR_THEME.border}`;
                        }}
                    >
                        <div className="flex flex-col items-center gap-6">
                            <div className="text-6xl transition-transform group-hover:scale-110 group-hover:rotate-12">✨</div>
                            <h2 className="text-3xl md:text-4xl font-black tracking-wide uppercase" style={{ color: CREATOR_THEME.textPrimary }}>Create New Quiz</h2>
                            <p className="text-lg font-medium max-w-sm mx-auto opacity-75" style={{ color: CREATOR_THEME.textSecondary }}>
                                Combine a topic and 5 questions to challenge the community.
                            </p>
                        </div>
                    </button>
                </div>

                {/* 3. Quiz Library Section */}
                <div className="space-y-6">
                    {/* Header with Quiz Count */}
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b-4 pb-4 mb-8" style={{ borderColor: CREATOR_THEME.border }}>
                        <h2 className="text-xl font-black uppercase tracking-wider" style={{ color: CREATOR_THEME.accent }}>Your Library</h2>
                        {library.status === 'ready' && (
                            <span
                                className="px-4 py-2 text-xs font-black bg-black text-white rounded-md uppercase tracking-wider whitespace-nowrap"
                                style={{ backgroundColor: CREATOR_THEME.textPrimary, color: CREATOR_THEME.panelBg }}
                            >
                                {library.items.length} Quizzes
                            </span>
                        )}
                    </div>

                    {/* RENDERING LOGIC: Strict State Machine */}
                    {library.status === 'loading' && (
                        <div className="text-center py-16 font-bold text-xl" style={{ color: CREATOR_THEME.textSecondary }}>
                            <span className="animate-pulse">Loading workspace...</span>
                        </div>
                    )}

                    {library.status === 'empty' && (
                        <div
                            className="text-center py-20 font-bold border-4 border-dashed rounded-xl"
                            style={{
                                borderColor: '#E5E5E5',
                                backgroundColor: 'rgba(255,255,255,0.5)',
                                color: CREATOR_THEME.textSecondary
                            }}
                        >
                            <p className="text-xl">Your library is empty.</p>
                        </div>
                    )}

                    {library.status === 'ready' && (
                        <div className="grid gap-6 pr-2">
                            <AnimatePresence>
                                {/* Cards (Locked White, Pixel Depth) */}
                                {library.items.map(q => (
                                    <motion.div
                                        key={q.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{
                                            opacity: hoveredId && hoveredId !== q.id ? 0.4 : 1, // SPOTLIGHT EFFECT
                                            scale: hoveredId === q.id ? 1.01 : 1,
                                            y: 0
                                        }}
                                        transition={{ duration: 0.2 }}
                                        className="relative p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between transition-none" // Disable CSS transition to let Framer handle it
                                        style={{
                                            backgroundColor: CREATOR_THEME.panelBg,
                                            border: `3px solid ${CREATOR_THEME.border}`,
                                            boxShadow: `6px 6px 0 0 ${CREATOR_THEME.border}`,
                                            color: CREATOR_THEME.textPrimary
                                        }}
                                        onMouseEnter={() => setHoveredId(q.id)}
                                        onMouseLeave={() => setHoveredId(null)}
                                    >
                                        <div className="flex items-center gap-6 mb-6 md:mb-0">
                                            <div>
                                                {/* Title with overflow protection */}
                                                <h3 className="uppercase font-black text-2xl leading-none mb-4 tracking-tight break-words" style={{ color: CREATOR_THEME.textPrimary }}>
                                                    {q.title}
                                                </h3>

                                                {/* Metadata Chips - Aggressive Spacing Fix */}
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <span
                                                        className="inline-flex items-center px-4 py-2 text-xs font-bold border-2"
                                                        style={{
                                                            borderColor: CREATOR_THEME.textSecondary,
                                                            color: CREATOR_THEME.textSecondary,
                                                            borderRadius: '8px',
                                                            lineHeight: '1.4'
                                                        }}
                                                    >
                                                        {new Date(q.createdAt).toLocaleDateString()}
                                                    </span>
                                                    <span
                                                        className="inline-flex items-center px-4 py-2 text-xs font-bold border-2"
                                                        style={{
                                                            borderColor: CREATOR_THEME.textSecondary,
                                                            backgroundColor: '#F3F4F6',
                                                            color: CREATOR_THEME.textPrimary,
                                                            borderRadius: '8px',
                                                            lineHeight: '1.4'
                                                        }}
                                                    >
                                                        {q.questionCount} Questions
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 self-end md:self-auto">
                                            {/* POLISH: "Edit Quiz" with proper semantics */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent card hover interference
                                                    void handleEdit(q.id);
                                                }}
                                                className="px-6 py-4 text-sm font-black uppercase tracking-wider"
                                                style={{
                                                    backgroundColor: CREATOR_THEME.panelBg,
                                                    border: `3px solid ${CREATOR_THEME.border}`,
                                                    boxShadow: `6px 6px 0 0 ${CREATOR_THEME.border}`,
                                                    color: CREATOR_THEME.textPrimary,
                                                    transform: 'translate(0, 0)'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = "translate(2px, 2px)";
                                                    e.currentTarget.style.boxShadow = `4px 4px 0 0 ${CREATOR_THEME.border}`;
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = "translate(0, 0)";
                                                    e.currentTarget.style.boxShadow = `6px 6px 0 0 ${CREATOR_THEME.border}`;
                                                }}
                                                onMouseDown={(e) => {
                                                    e.currentTarget.style.transform = "translate(4px, 4px)";
                                                    e.currentTarget.style.boxShadow = `2px 2px 0 0 ${CREATOR_THEME.border}`;
                                                }}
                                                onMouseUp={(e) => {
                                                    e.currentTarget.style.transform = "translate(2px, 2px)";
                                                    e.currentTarget.style.boxShadow = `4px 4px 0 0 ${CREATOR_THEME.border}`;
                                                }}
                                            >
                                                Edit Quiz
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
