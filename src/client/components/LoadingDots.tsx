import { useEffect, useState } from 'react';

interface LoadingDotsProps { text?: string; intervalMs?: number; pingPong?: boolean; }
export const LoadingDots = ({ text = 'Loading', intervalMs = 400, pingPong = true }: LoadingDotsProps) => {
  const [count, setCount] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  useEffect(() => {
    const id = setInterval(() => {
      setCount(prev => {
        const next = prev + dir;
        if (pingPong) {
          if (next >= 3) { setDir(-1); return 3; }
          if (next <= 0) { setDir(1); return 0; }
          return next;
        }
        return next > 3 ? 0 : next;
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, dir, pingPong]);
  const dots = '.'.repeat(count);
  return <span className="font-mono opacity-75 tracking-wider">{text}{dots || '.'}</span>;
};
export default LoadingDots;
