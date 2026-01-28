import { motion } from 'framer-motion';
import LoadingDots from './LoadingDots';

interface HotTopicsProps {
  topics: { slug: string; title: string }[];
  loading: boolean;
  onSelect: (slug: string, title: string) => void;
}

export const HotTopics = ({ topics, loading, onSelect }: HotTopicsProps) => {
  // Deterministic hash for stable positions across renders
  const hash = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  };
  return (
    <div className="modern-card p-4 border border-accent/30 relative overflow-hidden" style={{ minHeight: 220 }}>
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <LoadingDots />
        </div>
      )}
      {!loading && topics.length === 0 && (
        <div className="text-center text-secondary text-sm py-10">No recent activity yet.</div>
      )}
      {!loading && (
        <div className="flex flex-wrap gap-3 justify-center items-center h-full content-center p-2">
          {topics.map((t, i) => {
            const h = hash(t.slug + ':' + i);
            const sizeClass = ['text-sm px-4 py-2', 'text-xs px-3 py-1.5', 'text-xs px-2.5 py-1'][h % 3];
            // Randomize order purely by CSS logic isn't easy, so we rely on the map order.
            // But we can add slight scale var to make it feel organic.
            return (
              <motion.button
                key={t.slug}
                className={`rounded-full bg-base-200/80 backdrop-blur-sm hover:bg-accent/30 border border-base-300/40 shadow-sm font-medium ${sizeClass} whitespace-nowrap text-ellipsis max-w-full overflow-hidden`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(var(--color-accent), 0.2)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelect(t.slug, t.title)}
                title={t.title}
              >
                {t.title}
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HotTopics;
