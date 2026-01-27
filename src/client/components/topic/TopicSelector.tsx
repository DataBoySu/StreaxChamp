import React, { useEffect, useState, useRef } from 'react';
import TopicButtonNew from './TopicButton';
import './animations.css';
import FirebaseTopics, { TopicDoc } from '../../services/FirebaseTopics';
import { firebaseQuizService } from '../../services/FirebaseQuizService';
import { useBackoffPolling } from '../../hooks/useBackoffPolling';
import { QuizGenerationLoader } from '../ui/QuizGenerationLoader';

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
  // onTopicReady now provides the generated quiz (if successful) so parent can gate UI
  onTopicReady?: (topic: { title: string; slug: string; quizId?: string; quiz?: { questions?: { question: string; options?: string[]; answers?: string[]; correctAnswer: number | string }[] }; bonus?: { question: string; options: string[]; correctIndex: number } | null }) => void;
}> = ({ onClose, onTopicReady }) => {
  const [topics, setTopics] = useState<TopicDoc[]>([]);
  const [query, setQuery] = useState('');
  const [addingTopic, setAddingTopic] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatingSlug, setGeneratingSlug] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [exclusiveSlug, setExclusiveSlug] = useState<string | null>(null);
  const [inlineSuggestion, setInlineSuggestion] = useState('');
  const [highlightedTopic, setHighlightedTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [popularSlugs] = useState<string[]>(['science', 'technology', 'history', 'movies', 'sports']);
  const topicRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const optimisticRef = useRef<Record<string, TopicDoc>>({});

  // Fetch topics from REST API with client-side caching
  useEffect(() => {
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

    const fetchTopics = async () => {
      // Check cache first
      const cached = getCachedTopics();
      if (cached) {
        setTopics(cached);
        return;
      }

      // Cache miss - fetch from API
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
    setGenerationError(null);
    setExclusiveSlug(slug); // lock exclusive vibe on the chosen topic
    console.log('[QuizGen] Requesting quiz for topic', slug);
    try {
      const result = await firebaseQuizService.getOrGenerateTopicQuiz(slug);
      console.log('[QuizGen] Response', result);
      // Pass through bonus if present on server response
      // result usually has top-level id (quizId)
      onTopicReady?.({ title: topic.name, slug, quizId: result.id, quiz: result?.quiz || result, bonus: result?.bonus || null });
    } catch (e) {
      console.warn('[QuizGen] Failed', e);
      setGenerationError((e as Error).message || 'Quiz generation failed');
    } finally {
      setGeneratingSlug(null);
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
        if (!resp.ok) throw new Error('Generate failed');
        const data = await resp.json();
        console.log('[GenerateTopic] provider:', data.provider, data.fallbackReason ? `reason=${data.fallbackReason}` : '');
        setProgress(85);
        // Optimistic add to local list if not already present (since snapshot may be unavailable in CSP)
        setTopics((prev) => {
          if (prev.some((t) => t.slug === data.slug)) return prev;
          const urlMap: Record<string, string> = {};
          (data.sources || []).forEach((url: string, i: number) => { urlMap[`src${i + 1}`] = url; });
          const optimistic: TopicDoc = {
            id: data.slug,
            name: data.title,
            createdAt: Date.now(),
            slug: data.slug,
            urls: urlMap,
            hasQuiz: false,
            status: 'ready',
          };
          if (optimistic.slug) optimisticRef.current[optimistic.slug] = optimistic;
          return [optimistic, ...prev];
        });
      }
      setQuery('');
      // Trigger immediate poll to refresh list
      resetTopicPolling();
    } catch (err) {
      console.error('Error adding topic:', err);
    } finally {
      setProgress(100);
      setTimeout(() => { setAddingTopic(false); setProgress(0); }, 500);
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

          {/* Close Action */}
          <div className="flex-[1] flex justify-center">
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
        {/* Loading indicator */}
        {/* Loading indicator (unified for topic & quiz gen) */}
        {(loading || addingTopic || generatingSlug) && (
          <div className="w-full max-w-4xl mx-auto px-5 pt-6 pb-2">
            <div className="bg-slate-800/60 rounded-lg p-4 mb-5">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 via-red-500 to-red-600 transition-all duration-300"
                  style={{ width: `${addingTopic ? progress : 100}%` }}
                />
              </div>
              <div className="mt-3 text-center text-sm text-slate-400">
                {addingTopic
                  ? (progress < 90 ? 'Generating topic with AI...' : 'Finalizing...')
                  : (generatingSlug ? 'Generating specific quiz...' : 'Loading topics...')}
              </div>
            </div>
            {/* Spacer to avoid overlap with footer note while loading */}
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
                  {topics.filter(t => (t.name && t.name.trim().length > 0)).map((topic) => {
                    const isHighlighted = topic.name === highlightedTopic;
                    // Display a title-cased label for neatness
                    const displayName = toTitleCase(topic.name || '');
                    const slug = topic.slug || slugify(topic.name);
                    const isPopular = popularSlugs.includes(slug);
                    const isExclusive = exclusiveSlug === slug;
                    const vibeClass = exclusiveSlug ? (isExclusive ? 'vibe-beacon' : '') : (isPopular ? 'vibe-beacon' : '');
                    // If it's the only topic, center it and limit width so it doesn't stretch
                    if (topics.length === 1) {
                      return (
                        <div
                          key={topic.id}
                          ref={(el) => { topicRefs.current[topic.name] = el; }}
                          className={`${isHighlighted ? 'animate-glow' : ''} w-full mx-auto flex justify-center`}
                        >
                          <div className="relative w-full flex justify-center">
                            <TopicButtonNew
                              title={displayName}
                              compact
                              onClick={() => requestQuiz(topic)}
                              className={`${isHighlighted ? 'animate-shake' : ''} ${vibeClass} ${generatingSlug === (slug) ? 'opacity-60 pointer-events-none' : ''}`}
                            />
                            {/* Loader handled globally */}
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
                          {/* Loader handled globally */}
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

      <QuizGenerationLoader
        isVisible={!!generatingSlug}
        topicName={generatingSlug ? toTitleCase(topics.find(t => (t.slug === generatingSlug || slugify(t.name) === generatingSlug))?.name || generatingSlug) : undefined}
      />
    </div>
  );
};

export default TopicSelector;
