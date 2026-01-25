import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { LandingSummaryData } from '../hooks/useLandingSummary';

interface Props {
  summary: LandingSummaryData | null;
  loading: boolean;
  onSelectTopic: (slug: string, title: string) => void;
}

// Generate non-overlapping-ish random positions using a simple rejection sampling within a grid
function useRandomPositions(count: number) {
  return useMemo(() => {
    const positions: { top: string; left: string; rotation: number }[] = [];
    let attempts = 0;
    while (positions.length < count && attempts < count * 30) {
      attempts++;
      const topPct = 10 + Math.random() * 55; // keep inside container
      const leftPct = 5 + Math.random() * 70;
      const rotation = (Math.random() - 0.5) * 16; // -8..8 deg
      const tooClose = positions.some(p => {
        const dy = parseFloat(p.top) - topPct;
        const dx = parseFloat(p.left) - leftPct;
        return Math.sqrt(dx * dx + dy * dy) < 12; // distance threshold in percentage space
      });
      if (!tooClose) positions.push({ top: topPct.toFixed(2) + '%', left: leftPct.toFixed(2) + '%', rotation });
    }
    return positions;
  }, [count]);
}

export const LandingSummary = ({ summary, loading, onSelectTopic }: Props) => {
  const top3 = summary?.top3 || [];
  const popular = summary?.popular || [];
  const combined = [...top3.map(t => ({ ...t, kind: 'top' as const })), ...popular.map(p => ({ ...p, kind: 'popular' as const }))];
  const positions = useRandomPositions(combined.length);

  return (
  <div className="relative w-full min-h-[260px] md:min-h-[320px] rounded-xl border border-accent/30 overflow-hidden modern-card p-2">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-success/5" />
      <div className="absolute top-2 left-3 text-xs font-semibold text-secondary uppercase tracking-wider z-10">
        Hot Topics
      </div>
      {loading && (
        <div className="absolute inset-0 p-4 grid grid-cols-2 gap-3 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 rounded-md bg-base-200/60 border border-base-300/40" />
          ))}
        </div>
      )}
      {combined.map((item, idx) => {
        const pos = positions[idx] || { top: '50%', left: '50%', rotation: 0 };
        const label = item.kind === 'top' ? `${item.title} · ${item.topScore}` : `${item.title} · ${item.totalCompletions}`;
        const flair = item.kind === 'top' ? '🏆' : '🔥';
        return (
          <motion.button
            key={item.slug + item.kind}
            className={`absolute text-xs md:text-sm font-bold px-3 py-2 rounded-lg shadow-md backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-accent/60 ${item.kind === 'top' ? 'bg-accent/25 border border-accent/40 hover:bg-accent/35' : 'bg-success/25 border border-success/40 hover:bg-success/35'}`}
            style={{ top: pos.top, left: pos.left, transform: `translate(-50%, -50%) rotate(${pos.rotation}deg)` }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelectTopic(item.slug, item.title)}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: idx * 0.05 }}
          >
            <span className="mr-1">{flair}</span>{label}
          </motion.button>
        );
      })}
    </div>
  );
};

export default LandingSummary;
