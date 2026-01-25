import React from 'react';

interface Props {
  title: string;
  onClick?: () => void;
  className?: string; // Add className prop for animations
  compact?: boolean; // render smaller, non-stretched button
}

const buttonColors = [
  { bg: 'linear-gradient(135deg, #ff4500 0%, #ff6b35 100%)', shadow: 'rgba(255, 69, 0, 0.3)' }, // Reddit orange
  { bg: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)', shadow: 'rgba(139, 92, 246, 0.3)' }, // Purple
  { bg: 'linear-gradient(135deg, #06b6d4 0%, #67e8f9 100%)', shadow: 'rgba(6, 182, 212, 0.3)' }, // Cyan
  { bg: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)', shadow: 'rgba(16, 185, 129, 0.3)' }, // Green
  { bg: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', shadow: 'rgba(245, 158, 11, 0.3)' }, // Amber
  { bg: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)', shadow: 'rgba(239, 68, 68, 0.3)' }, // Red
  { bg: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)', shadow: 'rgba(99, 102, 241, 0.3)' }, // Indigo
  { bg: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)', shadow: 'rgba(236, 72, 153, 0.3)' }, // Pink
];

export const TopicButtonNew: React.FC<Props> = ({ title, onClick, className = '', compact = false }) => {
  // Generate consistent color based on title hash
  const colorIndex = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % buttonColors.length;
  
  // Default values
  const defaultBg = 'linear-gradient(135deg, #ff4500 0%, #ff6b35 100%)';
  const defaultShadow = 'rgba(0,0,0,0.2)';
  
  // Safely get color values with non-nullable defaults
  const background = buttonColors[colorIndex]?.bg || defaultBg;
  const shadow = buttonColors[colorIndex]?.shadow || defaultShadow;
  
  // compact mode: smaller, inline, doesn't force full width
  const baseClass = compact
    ? `group relative inline-flex h-14 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-103 focus:outline-none active:scale-95 overflow-hidden shadow-lg hover:shadow-2xl border-2 border-black ${className}`
    : `group relative w-full h-40 rounded-2xl font-semibold text-white transition-all duration-300 transform hover:scale-103 hover:-translate-y-1 focus:outline-none active:scale-95 overflow-hidden shadow-lg hover:shadow-2xl border-4 border-black ${className}`;

  return (
    <button
      onClick={onClick}
      className={baseClass}
      style={{
        background: background,
        boxShadow: `0 12px 35px ${shadow}, 0 4px 15px rgba(0,0,0,0.1)`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.03) translateY(-5px)';
        e.currentTarget.style.boxShadow = `0 20px 50px ${shadow}, 0 8px 25px rgba(0,0,0,0.2)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1) translateY(0)';
        e.currentTarget.style.boxShadow = `0 12px 35px ${shadow}, 0 4px 15px rgba(0,0,0,0.1)`;
      }}
      aria-label={`Select topic ${title}`}
    >
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300 rounded-2xl"></div>
      
      {/* Shimmer animation */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-out"
        />
      </div>
      
      {/* Content */}
      <div className="relative flex items-center justify-center h-full px-6">
        <span className="text-3xl font-bold tracking-wide text-center leading-tight">
          {title}
        </span>
      </div>
      
  {/* Border highlight overlay (kept subtle over black outline) */}
  <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 group-hover:ring-white/30 transition-all duration-300 pointer-events-none"></div>
    </button>
  );
};

export default TopicButtonNew;
