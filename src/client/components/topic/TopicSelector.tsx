import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TopicButtonNew from './TopicButton';
import './animations.css';
import FirebaseTopics, { TopicDoc } from '../../services/FirebaseTopics';
import { firebaseQuizService } from '../../services/FirebaseQuizService';
import { useBackoffPolling } from '../../hooks/useBackoffPolling';
import { KawaiiLoader } from '../ui/KawaiiLoader';

// Utility function to slugify a title (kept local)
const slugify = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// Convert input like "lies of p" -> "Lies Of P"
const toTitleCase = (s: string) =>
  s
    .trim()
    .split(/\s+/)
    .map((w) => {
      const raw = w ?? '';
      const word = String(raw);
      if (!word) return '';
      return word.length > 1 ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : word.toUpperCase();
    })
    .filter(Boolean)
    .join(' ');

import { useSystemStatus } from '../../hooks/useSystemStatus'; // NEW

export const TopicSelector: React.FC<{
  onClose?: () => void;
  initialQuery?: string;
  onTopicReady?: (topic: { title: string; slug: string; quizId?: string; quiz?: { questions?: { question: string; options?: string[]; answers?: string[]; correctAnswer: number | string }[] }; bonus?: { question: string; options: string[]; correctIndex: number } | null }) => void;
  onError?: (code: string, robotDialogue: string, persistent?: boolean) => void;
}> = ({ onClose, initialQuery, onTopicReady, onError }) => {
  const [topics, setTopics] = useState<TopicDoc[]>([]);
  const [query, setQuery] = useState(initialQuery || '');
  const [addingTopic, setAddingTopic] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatingSlug, setGeneratingSlug] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [exclusiveSlug, setExclusiveSlug] = useState<string | null>(null);
  const [highlightedTopic] = useState('');
  const [loading] = useState(false);
  const [popularSlugs] = useState<string[]>(['science', 'technology', 'history', 'movies', 'sports']);
  const [popupMessage, setPopupMessage] = useState<string | null>(null);

  // Auto-dismiss popup after 3s
  useEffect(() => {
    if (popupMessage) {
      const timer = setTimeout(() => setPopupMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [popupMessage]);

  // REFACTORED: Use centralized hook
  const { status, checkSystem } = useSystemStatus();
  const limitReached = status === 'limit_reached' || status === 'maintenance';
  const topicRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Show notification when limit reached, but DON'T close selector
  // Users can browse and play existing quizzes, just can't generate new ones
  useEffect(() => {
    if (limitReached) {
      // Trigger notification/robot dialogue without closing selector
      const msg = "Daily generation limit reached. You can still play existing quizzes!";
      onError?.('GEN_LIMIT', msg, false); // false = don't close selector
    }
  }, [limitReached, onError]);


  // Fetch topics from REST API with client-side caching
  const CACHE_KEY = 'streax:topics_selector';
  const CACHE_TTL = 600000; // 10 minutes

  const getCachedTopics = (): TopicDoc[] | null => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed.ts || !parsed.data) return null;
      if (Date.now() - parsed.ts > CACHE_TTL) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      return parsed.data;
    } catch {
      return null;
    }
  };

  const fetchTopics = async (force = false) => {
    // Check cache first (unless forced)
    if (!force) {
      const cached = getCachedTopics();
      if (cached) {
        setTopics(cached);
        return;
      }
    }

    // Cache miss or forced refresh - fetch from API
    try {
      const resp = await fetch('/api/topics');
      if (!resp.ok) return;
      const data = await resp.json();

      // Map to TopicDoc format
      const mapped: TopicDoc[] = (data || []).map((t: any) => ({
        id: t.slug || '',
        name: t.title || '',
        slug: t.slug || '',
        urls: {},
        hasQuiz: false,
        status: 'ready',
        createdAt: Date.now()
      }));

      setTopics(mapped);
      // Cache with timestamp
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: mapped }));
    } catch (err) {
      console.error('[TopicSelector] Failed to fetch topics:', err);
    }
  };

  useEffect(() => {
    void fetchTopics();
    // void checkLimits(); // REMOVED: Handled by hook
  }, []);

  // checkLimits removed

  // Backoff polling for topic refresh
  const { reset: resetTopicPolling } = useBackoffPolling(
    async () => {
      // Optional: explicit refresh if needed
    },
    { enabled: false }
  );

  const handleClose = () => {
    onClose?.();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Ignore Enter if limit reached - can only browse existing topics
      if (limitReached) return;
      handleAddTopic();
    }
  };

  const handleHighlightTopic = (name: string) => {
    const topic = topics.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (topic) {
      requestQuiz(topic);
    }
  };

  // Single quiz request guard
  const requestQuiz = async (topic: TopicDoc) => {
    if (generatingSlug) return; // Already generating
    const slug = topic.slug || slugify(topic.name);

    setGeneratingSlug(slug);
    // NEW: Also trigger progress for the Kawaii Loader
    setProgress(10);

    setGenerationError(null);
    setExclusiveSlug(slug); // lock exclusive vibe on the chosen topic
    console.log('[QuizGen] Requesting quiz for topic', slug);

    // Simulate progress while fetching
    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 500);

    try {
      const result = await firebaseQuizService.getOrGenerateTopicQuiz(slug);
      console.log('[QuizGen] Response', result);

      clearInterval(progressTimer);
      setProgress(100);

      // Pass through bonus if present on server response
      // result usually has top-level id (quizId)

      // Delay slightly for effect
      await new Promise(r => setTimeout(r, 800));

      onTopicReady?.({ title: topic.name, slug, quizId: result.id, quiz: result?.quiz || result, bonus: result?.bonus || null });
    } catch (e) {
      console.warn('[QuizGen] Failed', e);
      setGenerationError((e as Error).message || 'Quiz generation failed');
      clearInterval(progressTimer);
      setProgress(0);
    } finally {
      // Generating slug stays explicitly true until onTopicReady unmounts us or we fail
      if (generationError) {
        setGeneratingSlug(null);
      }
    }
  };

  // Check if user has typed a topic that doesn't exist
  const topicExists = topics.some(
    (topic) => topic.name.toLowerCase() === query.trim().toLowerCase()
  );

  const canAddNewTopic = query.trim().length > 0 && !topicExists;

  // Handle adding a new topic to Firestore
  async function handleAddTopic() {
    const topicName = query.trim();
    if (!topicName) return;

    // If topic already exists, just highlight it
    if (topicExists) {
      const existingTopic = topics.find(
        t => t.name.toLowerCase() === topicName.toLowerCase()
      );
      if (existingTopic) {
        handleHighlightTopic(existingTopic.name);
        return;
      }
    }

    setAddingTopic(true);
    console.log('[TopicSelector] setAddingTopic(true) called');
    setProgress(5);
    try {
      const formatted = toTitleCase(topicName);
      // Attempt direct Firestore create (non-CSP) else fallback to REST generation endpoint
      try {
        await FirebaseTopics.createTopic(formatted, {});
        setProgress(90);
      } catch (sdkErr) {
        // Fallback: call generate endpoint which performs Gemini + saveTopic via REST
        setProgress(20);
        const resp = await fetch('/api/topics/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: formatted }),
        });
        setProgress(60);
        if (!resp.ok) {
          // Try to parse structured error
          try {
            const errorData = await resp.json();
            if (errorData.code && errorData.robotDialogue) {
              onError?.(errorData.code, errorData.robotDialogue);
            }
            if (errorData.limitReached || errorData.code === 'LIMIT_REACHED') {
              void checkSystem(); // Force refresh status
            }
            throw new Error(errorData.message || 'Generate failed');
          } catch (parseErr) {
            throw new Error('Generate failed');
          }
        }
        const data = await resp.json();
        console.log('[GenerateTopic] provider:', data.provider, data.fallbackReason ? `reason=${data.fallbackReason}` : '');

        // Success! Now initiate the smooth fill for the artificial delay.
        setProgress(90);

        // USER REQUEST: Extend loading state by 3s + Smoothly fill progress bar
        const delayDuration = 3000;
        const startTime = Date.now();
        const startVal = 90;

        await new Promise<void>(resolve => {
          const timer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const p = Math.min(100, startVal + (elapsed / delayDuration) * (100 - startVal));
            setProgress(p);

            if (elapsed >= delayDuration) {
              clearInterval(timer);
              resolve();
            }
          }, 30); // ~30fps smooth update
        });

        // Invalidate selector cache
        localStorage.removeItem('streax:topics_selector');

        // Fetch fresh list from server (now that we waited for indexing)
        await fetchTopics(true);
      }

      setQuery('');
      // Trigger immediate poll to refresh list
      resetTopicPolling();
    } catch (err) {
      console.error('Error adding topic:', err);
    } finally {
      setProgress(100);
      // Small delay before unmounting to show 100% complete
      setTimeout(() => {
        setAddingTopic(false);
        setProgress(0);
      }, 500);
    }
  }

  return (
    <div
      // THEME LOCK: Force light warm parchment, ignore Reddit theme
      style={{
        backgroundColor: '#F3EFE0',
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100dvh',
        overflow: 'hidden',
      }}
    >

      {/* Search Bar Header - NES Style */}
      <div
        className="flex-none z-10 w-full px-4 py-4"
        style={{
          backgroundColor: '#FFFEF9',
          borderBottom: '4px solid #212529',
          boxShadow: '0 4px 0px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div className="max-w-[95%] mx-auto flex gap-3 items-center flex-wrap">
          {/* Search Input - NES Style */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={limitReached ? "Search existing topics (limit reached)" : "Search or add topics..."}
              className="nes-input w-full"
              style={{
                fontFamily: "'Press Start 2P', cursive",
                fontSize: 'clamp(0.625rem, 2vw, 0.875rem)',
                padding: '0.75rem 1rem',
              }}
              aria-label="Search or add topics"
              autoComplete="off"
            />
          </div>

          {/* Action Buttons - NES Style */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchTopics(true)}
              className="nes-btn"
              style={{
                fontFamily: "'Press Start 2P', cursive",
                fontSize: '0.625rem',
                padding: '0.75rem',
              }}
              title="Refresh Topics"
            >
              ↻
            </button>

            <button
              onClick={handleClose}
              className="nes-btn is-error"
              style={{
                fontFamily: "'Press Start 2P', cursive",
                fontSize: '0.625rem',
                padding: '0.75rem 1rem',
              }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Add Button */}
          {limitReached ? (
            <button
              disabled
              className="nes-btn is-disabled"
              style={{
                fontFamily: "'Press Start 2P', cursive",
                fontSize: '0.625rem',
                padding: '0.75rem 1.5rem',
                opacity: 0.8
              }}
            >
              MAX
            </button>
          ) : (query.trim().length > 0 && (
            <button
              disabled={addingTopic || !canAddNewTopic}
              onClick={handleAddTopic}
              className={`nes-btn ${canAddNewTopic ? 'is-primary' : ''}`}
              style={{
                fontFamily: "'Press Start 2P', cursive",
                fontSize: '0.625rem',
                padding: '0.75rem 1.5rem',
              }}
            >
              {addingTopic ? '...' : (topicExists ? 'Go' : 'Add')}
            </button>
          ))}
        </div>
      </div>

      {/* Informational Banner - NES Container */}
      <div
        className="flex-none w-full py-4 px-6 z-20 flex flex-col items-center gap-2"
        style={{
          backgroundColor: '#F3EFE0',
          borderBottom: '4px solid #212529',
        }}
      >
        <div className="w-full flex justify-center">
          <div
            className="nes-container is-rounded"
            style={{
              backgroundColor: '#FFE6E6',
              border: '4px solid #FF4500',
              boxShadow: '4px 4px 0px rgba(255, 69, 0, 0.2)',
              padding: '1rem 1.5rem',
              maxWidth: '600px',
            }}
          >
            <span
              style={{
                fontFamily: "'Press Start 2P', cursive",
                fontSize: 'clamp(0.5rem, 1.5vw, 0.65rem)',
                color: '#8B0000',
                lineHeight: '1.6',
                display: 'block',
                textAlign: 'center',
              }}
            >
              Custom topics take 1–3 minutes. Cached after first generation.
            </span>
          </div>
        </div>
        {generationError && (
          <div className="flex justify-center">
            <div
              className="nes-container is-rounded is-dark"
              style={{
                backgroundColor: '#FFE6E6',
                padding: '0.75rem 1rem',
                fontSize: '0.625rem',
              }}
            >
              {generationError}
            </div>
          </div>
        )}
      </div>

      {/* Main content area - flex-1 to take available space */}
      <div className="flex-1 w-full overflow-y-auto overscroll-contain min-h-0">
        {/* Content wrapper with INCREASED padding to avoid footer overlap */}
        <div className="w-full px-4 sm:px-5 pt-6 pb-20">
          <div className="w-full max-w-4xl mx-auto">

            {/* Loading State */}
            {(loading && !addingTopic && !generatingSlug) && (
              <div className="bg-slate-800/60 rounded-lg p-4 mb-5 animate-pulse">
                <div className="text-center text-sm text-slate-400">Loading topics...</div>
              </div>
            )}

            {!loading && topics.length === 0 && (
              <div className="text-center text-slate-400 py-10">
                <p>No topics found. Add your first topic!</p>
              </div>
            )}

            {!loading && topics.length > 0 && (
              <div className="w-full">
                {/* Always use 2-column grid */}
                <div className="grid grid-cols-2 gap-3 w-full">
                  {topics
                    .filter(t => (t.name && t.name.trim().length > 0))
                    // [SEARCH FILTER] Real-time filtering (starts with query, case-insensitive)
                    .filter(t => !query || t.name.toLowerCase().startsWith(query.trim().toLowerCase()))
                    .map((topic) => {
                      const isHighlighted = topic.name === highlightedTopic;
                      const displayName = toTitleCase(topic.name || '');
                      const slug = topic.slug || slugify(topic.name);
                      const isPopular = popularSlugs.includes(slug);
                      const isExclusive = exclusiveSlug === slug;
                      const vibeClass = exclusiveSlug ? (isExclusive ? 'vibe-beacon' : '') : (isPopular ? 'vibe-beacon' : '');

                      return (
                        <div
                          key={topic.id}
                          ref={(el) => { topicRefs.current[topic.name] = el; }}
                          className={`${isHighlighted ? 'animate-glow' : ''} w-full`}
                        >
                          <div className="relative w-full">
                            <TopicButtonNew
                              title={displayName}
                              onClick={() => requestQuiz(topic)}
                              className={`${isHighlighted ? 'animate-shake' : ''} ${vibeClass} ${generatingSlug === (slug) ? 'opacity-60 pointer-events-none' : ''}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  {topics.length > 0 && topics.filter(t => (t.name && t.name.trim().length > 0)).length === 0 && (
                    <div className="text-sm text-red-400 col-span-2">
                      Topics fetched but missing 'name' field. Check seeding / backfill.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>



      {/* UNIVERSAL KAWAII LOADER */}
      {/* Shows for addingTopic (Add) OR generatingSlug (Quiz Gen) */}
      <KawaiiLoader
        isVisible={addingTopic || !!generatingSlug}
        progress={progress}
        message={addingTopic ? "loading" : "generating quiz"}
      />

      {/* Popup Toast - Auto-dismissing Limit Alert */}
      <AnimatePresence>
        {popupMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed',
              bottom: '32px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 100,
              pointerEvents: 'none',
            }}
          >
            <div
              className="nes-container is-dark is-rounded"
              style={{
                padding: '1rem 1.5rem',
                border: '4px solid #ef4444',
                boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
                maxWidth: '400px',
              }}
            >
              <p style={{
                margin: 0,
                color: 'white',
                fontFamily: "'Press Start 2P', cursive",
                fontSize: '0.7rem',
                lineHeight: '1.6',
                textAlign: 'center',
              }}>
                {popupMessage}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TopicSelector;
