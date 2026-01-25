import React, { useEffect, useState, useRef } from 'react';
import TopicButtonNew from './TopicButtonNew';
import { useTopics } from '../../hooks/useTopics';
import './animations.css';

// Utility function to slugify a title
const slugify = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// Predefined topic list
const predefined = ['Elden Ring', 'Dark Souls', 'Witcher', 'Cyberpunk', 'Minecraft'];

interface TopicSelectorProps {
  onClose?: () => void;
  onTopicReady?: (topic: { title: string; slug: string }) => void;
}

export const TopicSelectorNew: React.FC<TopicSelectorProps> = ({ onClose, onTopicReady }) => {
  const { topics, loading: topicsLoading, generateTopic, refresh } = useTopics();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [highlightedTopic, setHighlightedTopic] = useState<string | null>(null);
  const topicRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  // Get all available topics (predefined + loaded from server)
  const allTopics = React.useMemo(() => {
    const serverTitles = Array.isArray(topics) ? topics.map((t: { title?: string }) => t?.title || '').filter(Boolean) : [];
    return [...predefined, ...serverTitles];
  }, [topics]);
  
  useEffect(() => {
    // Refresh topics on mount
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Search suggestions effect
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    
    // Filter topics that match the query (case-insensitive, ignore spaces)
    const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, '');
    const matches = allTopics.filter(topic => 
      topic.toLowerCase().replace(/\s+/g, '').includes(normalizedQuery)
    );
    
    setSuggestions(matches.slice(0, 5)); // Limit to 5 suggestions
  }, [query, allTopics]);
  
  // Handle highlighting a topic button
  const handleHighlightTopic = (topicTitle: string) => {
    setHighlightedTopic(topicTitle);
    
    // Scroll to the topic button
    const topicRef = topicRefs.current[topicTitle];
    if (topicRef) {
      topicRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Remove highlight after animation completes
      setTimeout(() => {
        setHighlightedTopic(null);
      }, 2000);
    }
  };
  
  // Handle search suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setSuggestions([]);
    handleHighlightTopic(suggestion);
  };
  
  // Handle search input keydown
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && suggestions.length > 0 && suggestions[0]) {
      handleSuggestionClick(suggestions[0]);
    }
  };
  
  // Check if user has typed a topic that doesn't exist
  const typedNotFound =
    query.trim().length > 0 &&
    !topics.find((t: { title?: string }) => (t?.title || '').toLowerCase() === query.trim().toLowerCase()) &&
    !predefined.map((p) => p.toLowerCase()).includes(query.trim().toLowerCase());
  
  // Handle topic generation
  async function handleGenerate() {
    const topicName = query.trim();
    if (!topicName) return;
    setLoading(true);
    try {
      const resp = await generateTopic(topicName);
      const slug = (resp && (resp.slug || slugify(resp.title || topicName))) || slugify(topicName);
      onTopicReady?.({ title: resp?.title || topicName, slug });
    } catch (err) {
      console.error('Error generating topic:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      {/* Header with search bar (fixed at top) */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-white/10 shadow-lg px-4 pt-4 pb-4">
        <div className="max-w-3xl mx-auto relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search topics..."
            className="w-full rounded-lg bg-slate-800/70 border border-slate-600/40 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/30 outline-none px-6 py-4 text-lg placeholder-slate-400"
            aria-label="Search topics"
          />
          
          {/* Suggestions dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full px-6 py-3 text-left hover:bg-slate-700 text-white transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-20 px-3 py-2 rounded-md text-sm border border-white/15 hover:bg-white/10"
        aria-label="Close"
      >
        ✕
      </button>
      
      {/* Scrollable grid area with extra bottom padding to clear footer */}
      <div className={`flex-1 overflow-y-auto p-4 md:p-8 ${topicsLoading ? 'pb-40' : 'pb-28'}`}>
        <div className="grid grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto">
          {/* Loading placeholders */}
          {topicsLoading && Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 rounded-xl bg-slate-800/60 border border-slate-700/40 animate-pulse" />
          ))}
          {/* Loading text removed per request; skeletons above are sufficient */}
          
          {/* Render buttons for predefined topics */}
          {!topicsLoading && predefined.map((topic) => {
            const isHighlighted = topic === highlightedTopic;
            return (
              <div 
                key={topic}
                ref={(el) => { topicRefs.current[topic] = el; }}
                className={`${isHighlighted ? 'animate-glow' : ''}`}
              >
                <TopicButtonNew
                  title={topic}
                  onClick={() => {
                    const slug = slugify(topic);
                    onTopicReady?.({ title: topic, slug });
                  }}
                  className={isHighlighted ? 'animate-shake' : ''}
                />
              </div>
            );
          })}
          
          {/* Render buttons for topics from server */}
          {!topicsLoading && topics.map((t: { title?: string; slug?: string }) => {
            const isHighlighted = t.title === highlightedTopic;
            return (
              <div 
                key={(t.slug || t.title) as string}
                ref={(el) => { if (t.title) topicRefs.current[t.title] = el; }}
                className={`${isHighlighted ? 'animate-glow' : ''}`}
              >
                <TopicButtonNew
                  title={t.title || ''}
                  onClick={() => {
                    const title = t.title || '';
                    const slug = (t.slug || slugify(title));
                    onTopicReady?.({ title, slug });
                  }}
                  className={isHighlighted ? 'animate-shake' : ''}
                />
              </div>
            );
          })}
        </div>
        
        {/* Show "Generate" button if user types a topic that doesn't exist */}
        {typedNotFound && (
          <div className="mt-6 flex justify-center">
            <button
              disabled={loading}
              onClick={handleGenerate}
              className="px-8 py-5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-xl font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? `Generating '${query}'...` : `Generate '${query}' Quiz`}
            </button>
          </div>
        )}
      </div>
      
      {/* Fixed footer */}
      <div className="bg-slate-900/90 backdrop-blur-sm border-t border-white/10 p-4 text-center text-sm text-gray-400">
        Custom topics take 1–3 minutes. Cached after first generation.
      </div>
    </div>
  );
};

export default TopicSelectorNew;
