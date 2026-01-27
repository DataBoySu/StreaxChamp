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
            const stored = localStorage.getItem('streax:mute');
            // User requested default OFF (muted), so only be unmuted if explicitly set to 'false'
            return stored === null ? true : stored === 'true';
        } catch { return true; } // Default to muted (Music Off)
    });

    const [cursorMode, setCursorMode] = useState<MusicMode>('landing');
    const [hasInteracted, setHasInteracted] = useState<boolean>(false);

    // Audio refs
    const landingRef = useRef<HTMLAudioElement | null>(null);
    const quizRef = useRef<HTMLAudioElement | null>(null);

    // Interval refs for fading
    const landingFadeRef = useRef<NodeJS.Timeout | null>(null);
    const quizFadeRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize audio objects once
    useEffect(() => {
        if (!landingRef.current) {
            // User requested fallback to single bgm.mp3
            const a = new Audio('/assets/bgm.mp3');
            a.loop = true;
            a.volume = 0; // Start muted for fade-in
            landingRef.current = a;
        }
        if (!quizRef.current) {
            // User requested fallback to single bgm.mp3
            const a = new Audio('/assets/bgm.mp3');
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

        // Don't start playing if we haven't interacted yet
        if (targetVol > 0 && !hasInteracted) return;

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
                if (audio.paused && hasInteracted) audio.play().catch(() => { }); // Ensure playing if fading in
            } else {
                current = Math.max(0, current - FADE_STEP);
            }
            audio.volume = current;
        }, FADE_INTERVAL);
    }, [hasInteracted]);

    // Effect: Handle Mode Switching
    useEffect(() => {
        const landing = landingRef.current;
        const quiz = quizRef.current;
        if (!landing || !quiz) return;

        // Sync muted state
        landing.muted = isMuted;
        quiz.muted = isMuted;

        // If muted and we haven't started playing, don't do anything
        if (isMuted && !hasInteracted) return;

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

    }, [cursorMode, isMuted, fadeTo, hasInteracted]);

    const toggleMute = useCallback(() => {
        // Mark first interaction to allow playback
        setHasInteracted(true);

        setIsMuted(prev => {
            const next = !prev;
            localStorage.setItem('streax:mute', String(next));

            // If we are Unmuting (next is false), try to play the active track immediately
            // This satisfies browser interaction requirements
            if (!next) {
                const activeAudio = cursorMode === 'quiz' ? quizRef.current : landingRef.current;
                if (activeAudio) {
                    activeAudio.muted = false;
                    activeAudio.play().catch(e => console.warn('Audio play failed:', e));
                }
            }
            return next;
        });
    }, [cursorMode]);

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
