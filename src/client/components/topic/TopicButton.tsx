import React from 'react';

interface Props {
  title: string;
  onClick?: () => void;
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

export const TopicButton: React.FC<Props> = ({ title, onClick }) => {
  // Generate consistent color based on title hash
  const colorIndex = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % buttonColors.length;
  const color = buttonColors[colorIndex] ?? buttonColors[0];
  
  return (
    <button
      onClick={onClick}
      className="group relative w-full h-32 rounded-2xl font-semibold text-white transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 focus:outline-none active:scale-95 overflow-hidden shadow-lg hover:shadow-2xl"
      style={{
        background: color.bg,
        boxShadow: `0 12px 35px ${color.shadow}, 0 4px 15px rgba(0,0,0,0.1)`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05) translateY(-8px)';
        e.currentTarget.style.boxShadow = `0 20px 50px ${color.shadow}, 0 8px 25px rgba(0,0,0,0.2)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1) translateY(0)';
        e.currentTarget.style.boxShadow = `0 12px 35px ${color.shadow}, 0 4px 15px rgba(0,0,0,0.1)`;
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
      <div className="relative flex items-center justify-center h-full px-8">
        <span className="text-3xl font-bold tracking-wide text-center leading-tight">
          {title}
        </span>
      </div>
      
      {/* Border highlight */}
      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20 group-hover:ring-white/40 transition-all duration-300"></div>
    </button>
  );
};

export default TopicButton;
