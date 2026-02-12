import { motion } from 'framer-motion';
import LoadingDots from './LoadingDots';

interface HotTopicsProps {
  topics: { slug: string; title: string }[];
  loading: boolean;
  onSelect: (slug: string, title: string) => void;
}

export const HotTopics = ({ topics, loading, onSelect }: HotTopicsProps) => {
  // Deterministic hash for stable sizing across renders
  const hash = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  };

  return (
    <div className="relative overflow-hidden" style={{ minHeight: 180 }}>
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
            // Scale button size based on hash (simulating play frequency)
            // In a real implementation, you'd use actual play count data
            const sizeVariant = h % 3;
            const sizeClass = sizeVariant === 0 ? '' : sizeVariant === 1 ? 'is-small' : '';
            const textSize = sizeVariant === 0 ? 'text-sm' : sizeVariant === 1 ? 'text-xs' : 'text-[10px]';

            return (
              <motion.button
                key={t.slug}
                className={`nes-btn ${sizeClass} ${textSize} whitespace-nowrap max-w-full overflow-hidden text-ellipsis`}
                style={{
                  fontFamily: "'Press Start 2P', cursive",
                  borderRadius: 0,
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
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
