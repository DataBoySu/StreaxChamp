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
      {!loading && topics.map((t, i) => {
        const h = hash(t.slug + ':' + i);
        // Spread inside 10%-90% to avoid clipping edges
        const top = 10 + (h % 70); // 10..80
        const left = 10 + ((h / 97) % 80); // pseudo-random using different divisor
        const sizeClass = ['text-xs px-3 py-1', 'text-xs px-2.5 py-1', 'text-[11px] px-2.5 py-1'][h % 3];
        return (
          <motion.button
            key={t.slug}
            className={`absolute rounded-full bg-base-200/80 backdrop-blur-sm hover:bg-accent/30 border border-base-300/40 shadow-sm font-medium ${sizeClass} whitespace-nowrap max-w-[40%] overflow-hidden text-ellipsis`}
            style={{ top: `${top}%`, left: `${left}%`, transform: 'translate(-50%, -50%)' }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => onSelect(t.slug, t.title)}
            title={t.title}
          >
            {t.title}
          </motion.button>
        );
      })}
    </div>
  );
};

export default HotTopics;
