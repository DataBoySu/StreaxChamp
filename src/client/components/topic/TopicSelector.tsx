import React, { useEffect, useState, useRef } from 'react';
import TopicButtonNew from './TopicButton';
import './animations.css';
import { RefreshCw, X } from 'lucide-react';
import FirebaseTopics, { TopicDoc } from '../../services/FirebaseTopics';
import { firebaseQuizService } from '../../services/FirebaseQuizService';
import { useBackoffPolling } from '../../hooks/useBackoffPolling';
import { KawaiiLoader } from '../ui/KawaiiLoader'; // [NEW] Import

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

export const TopicSelector: React.FC<{
  onClose?: () => void;
  // onTopicReady now provides the generated quiz (if successful) so parent can gate UI
  onTopicReady?: (topic: { title: string; slug: string; quizId?: string; quiz?: { questions?: { question: string; options?: string[]; answers?: string[]; correctAnswer: number | string }[] }; bonus?: { question: string; options: string[]; correctIndex: number } | null }) => void;
  onError?: (code: string, robotDialogue: string) => void; // NEW: Callback for robot errors
}> = ({ onClose, onTopicReady, onError }) => {
  const [topics, setTopics] = useState<TopicDoc[]>([]);
  const [query, setQuery] = useState('');
  const [addingTopic, setAddingTopic] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatingSlug, setGeneratingSlug] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [exclusiveSlug, setExclusiveSlug] = useState<string | null>(null);
  const [inlineSuggestion] = useState('');
  const [highlightedTopic] = useState('');
  const [loading] = useState(false);
  const [popularSlugs] = useState<string[]>(['science', 'technology', 'history', 'movies', 'sports']);
  const topicRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const optimisticRef = useRef<Record<string, TopicDoc>>({});

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
  }, []);

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
    <div className="fixed inset-0 z-50 flex flex-col w-full min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">

      {/* Search Bar Header */}
      <div className="sticky top-0 z-10 w-full bg-slate-900/95 backdrop-blur-sm border-b border-white/10 shadow-lg px-4 py-4 mb-5">
        <div className="max-w-[90%] mx-auto flex gap-2 items-center">
          {/* Search Input */}
          <div className="relative flex-[8]">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search or add topics..."
              className="w-full rounded-lg bg-slate-800/70 border border-slate-600/40 
                      focus:border-orange-400 focus:ring-2 focus:ring-orange-500/30 
                      outline-none px-4 py-3 text-lg placeholder-slate-400 font-mono tracking-wide"
              aria-label="Search or add topics"
              autoComplete="off"
            />
            {inlineSuggestion && inlineSuggestion.toLowerCase() !== query.toLowerCase() && (
              <div className="pointer-events-none absolute inset-0 flex items-center px-4 text-lg font-mono tracking-wide select-none" style={{ color: 'rgba(255,255,255,0.25)' }} aria-hidden>
                <span>{query}<span style={{ color: 'rgba(255,255,255,0.35)' }}>{inlineSuggestion.slice(query.length)}</span></span>
              </div>
            )}
          </div>

          {/* Close/Refresh Action */}
          <div className="flex-[1] flex justify-center items-center gap-2">
            <button
              onClick={() => fetchTopics(true)}
              className="p-3 rounded-lg bg-slate-800/80 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all transform hover:rotate-180"
              title="Refresh Topics"
            >
              <RefreshCw size={20} />
            </button>

            <button
              onClick={handleClose}
              className="p-3 rounded-lg bg-slate-800/80 border border-white/10 text-slate-300 hover:bg-red-500/20 hover:text-white transition-all transform hover:rotate-90"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Submit/Add Action */}
          <div className="flex-[1] flex justify-end">
            {query.trim().length > 0 && (
              <button
                disabled={addingTopic || !canAddNewTopic}
                onClick={handleAddTopic}
                className="w-full px-3 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 
                        disabled:bg-slate-600 disabled:opacity-50 text-white font-semibold 
                        transition-colors duration-200 whitespace-nowrap overflow-hidden text-ellipsis"
              >
                {addingTopic ? '...' : (topicExists ? 'Go' : 'Add')}
              </button>
            )}
          </div>
        </div>
        {/* Visible glowing red separator for clear header/content distinction */}
        <div className="w-full mt-3">
          <div
            aria-hidden
            className="mx-auto max-w-4xl h-1 rounded-md"
            style={{
              background: 'linear-gradient(90deg, rgba(255,69,0,0.05), rgba(255,0,0,0.9), rgba(255,69,0,0.05))',
              boxShadow: '0 4px 18px rgba(255,0,0,0.35)',
            }}
          />
        </div>
      </div>

      {/* Main content area - flex-1 to take available space between header and footer */}
      <div className="flex-1 w-full max-w-full overflow-y-auto">

        {/* Keep generic loading for fetch only */}
        {(loading && !addingTopic && !generatingSlug) && (
          <div className="w-full max-w-4xl mx-auto px-5 pt-6 pb-2">
            <div className="bg-slate-800/60 rounded-lg p-4 mb-5 animate-pulse">
              <div className="text-center text-sm text-slate-400">Loading topics...</div>
            </div>
            <div className="h-8" aria-hidden />
          </div>
        )}

        {/* Content wrapper - top-aligned so it doesn't overlap the sticky header */}
        <div className="w-full h-full flex items-start justify-center px-4 sm:px-5 pt-8 pb-24" style={{ paddingTop: 'calc(2rem + 35px)' }}>
          <div className="w-full max-w-4xl mx-auto">
            {!loading && topics.length === 0 && (
              <div className="text-center text-slate-400 py-10">
                <p>No topics found. Add your first topic!</p>
              </div>
            )}

            {!loading && topics.length > 0 && (
              <div className={`w-full ${topics.length === 1 ? 'flex justify-center' : ''}`}>
                <div className={topics.length === 1 ? 'w-full max-w-md' : 'grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full'}>
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

                      if (topics.length === 1) {
                        return (
                          <div
                            key={topic.id}
                            ref={(el) => { topicRefs.current[topic.name] = el; }}
                          >
                            <div className="relative w-full flex justify-center">
                              <TopicButtonNew
                                title={displayName}
                                compact
                                onClick={() => requestQuiz(topic)}
                                className={`${isHighlighted ? 'animate-shake' : ''} ${vibeClass} ${generatingSlug === (slug) ? 'opacity-60 pointer-events-none' : ''}`}
                              />
                            </div>
                          </div>
                        );
                      }

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
                    <div className="text-sm text-red-400 col-span-full">
                      Topics fetched but missing 'name' field. Check seeding / backfill.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed footer at bottom */}
      <div className="fixed bottom-0 left-0 right-0 py-8 px-6 pointer-events-none">
        {/* Separation line with glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent shadow-lg shadow-red-500/20"></div>

        {/* Centered content with more top space */}
        <div className="w-full flex justify-center mt-2">
          <div className="inline-block px-6 py-3 rounded-lg backdrop-blur-md 
                         bg-gradient-to-r from-red-950/40 via-red-900/40 to-red-950/40
                         shadow-lg shadow-red-500/20 border border-red-500/30
                         animate-pulse-subtle" style={{ transform: 'translateY(20px)' }}>
            <span className="text-sm text-red-100/90 font-medium tracking-wide
                           drop-shadow-lg shadow-red-500">
              Custom topics take 1–3 minutes. Cached after first generation.
            </span>
          </div>
        </div>
        {generationError && (
          <div className="mt-4 flex justify-center">
            <div className="px-4 py-2 rounded bg-red-900/60 border border-red-600 text-red-200 text-sm">
              {generationError}
            </div>
          </div>
        )}
      </div>

      {/* UNIVERSAL KAWAII LOADER */}
      {/* Shows for addingTopic (Add) OR generatingSlug (Quiz Gen) */}
      <KawaiiLoader
        isVisible={addingTopic || !!generatingSlug}
        progress={progress}
        message={addingTopic ? "loading" : "generating quiz"}
      />

    </div>
  );
};

export default TopicSelector;
