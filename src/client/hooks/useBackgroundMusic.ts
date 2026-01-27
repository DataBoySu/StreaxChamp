import { useState, useEffect, useRef, useCallback } from 'react';

type MusicMode = 'landing' | 'quiz' | 'none';

interface UseBackgroundMusicReturn {
    isMuted: boolean;
    toggleMute: () => void;
    setMode: (mode: MusicMode) => void;
    playClick: () => void;
}

const FADE_DURATION = 2000; // 2 seconds
const FADE_INTERVAL = 50; // Update every 50ms
const FADE_STEP = 1 / (FADE_DURATION / FADE_INTERVAL); // Volume step per interval

export const useBackgroundMusic = (): UseBackgroundMusicReturn => {
    const [isMuted, setIsMuted] = useState<boolean>(() => {
        try {
            return localStorage.getItem('streax:mute') === 'true';
        } catch { return false; } // Default to unmuted
    });

    const [cursorMode, setCursorMode] = useState<MusicMode>('landing');

    // Audio refs
    const landingRef = useRef<HTMLAudioElement | null>(null);
    const quizRef = useRef<HTMLAudioElement | null>(null);

    // Interval refs for fading
    const landingFadeRef = useRef<NodeJS.Timeout | null>(null);
    const quizFadeRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize audio objects once
    useEffect(() => {
        if (!landingRef.current) {
            const a = new Audio('/assets/music/landing_bgm.mp3');
            a.loop = true;
            a.volume = 0; // Start muted for fade-in
            landingRef.current = a;
        }
        if (!quizRef.current) {
            const a = new Audio('/assets/music/quiz_bgm.mp3');
            a.loop = true;
            a.volume = 0;
            quizRef.current = a;
        }

        // Cleanup
        return () => {
            if (landingRef.current) { landingRef.current.pause(); landingRef.current = null; }
            if (quizRef.current) { quizRef.current.pause(); quizRef.current = null; }
        };
    }, []);

    // Helper: Fade audio to target volume
    const fadeTo = useCallback((audio: HTMLAudioElement, targetVol: number, intervalRef: React.MutableRefObject<NodeJS.Timeout | null>) => {
        if (intervalRef.current) clearInterval(intervalRef.current);

        // If muted globally, target is always 0, but we keep playing to allow unmute fade-in
        // Actually, better to just set volume 0 instantly if muted, but specialized mute logic handles that.
        // Here we handle "active track" fading.

        intervalRef.current = setInterval(() => {
            let current = audio.volume;
            // Floating point checks
            if (Math.abs(current - targetVol) < FADE_STEP) {
                audio.volume = targetVol;
                if (targetVol === 0) audio.pause();
                if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
                return;
            }

            if (current < targetVol) {
                current = Math.min(1, current + FADE_STEP);
                if (audio.paused) audio.play().catch(() => { }); // Ensure playing if fading in
            } else {
                current = Math.max(0, current - FADE_STEP);
            }
            audio.volume = current;
        }, FADE_INTERVAL);
    }, []);

    // Effect: Handle Mode Switching
    useEffect(() => {
        const landing = landingRef.current;
        const quiz = quizRef.current;
        if (!landing || !quiz) return;

        // If global mute is ON, we just pause everything or set volume 0
        // But for smoother experience, we might want to keep "logical" volume up and just set actual volume to 0.
        // However, standard HTML Audio mute is simpler.
        landing.muted = isMuted;
        quiz.muted = isMuted;

        if (cursorMode === 'landing') {
            // Fade IN landing, Fade OUT quiz
            fadeTo(landing, 1.0, landingFadeRef);
            fadeTo(quiz, 0.0, quizFadeRef);
        } else if (cursorMode === 'quiz') {
            // Fade OUT landing, Fade IN quiz
            fadeTo(landing, 0.0, landingFadeRef);
            fadeTo(quiz, 1.0, quizFadeRef);
        } else {
            // None: Fade both out
            fadeTo(landing, 0.0, landingFadeRef);
            fadeTo(quiz, 0.0, quizFadeRef);
        }

    }, [cursorMode, isMuted, fadeTo]);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => {
            const next = !prev;
            localStorage.setItem('streax:mute', String(next));
            return next;
        });
    }, []);

    const playClick = useCallback(() => {
        // Optional: Could add UI click sounds here later
    }, []);

    return {
        isMuted,
        toggleMute,
        setMode: setCursorMode,
        playClick
    };
};
