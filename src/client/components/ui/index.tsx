import React from 'react';
import { motion } from 'framer-motion';

// Modern Card Component
export const ModernCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}> = ({ children, className = '', hover = true }) => (
  <motion.div
    className={`modern-card ${className}`}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    whileHover={hover ? { y: -4 } : {}}
  >
    {children}
  </motion.div>
);

// Modern Button Component
export const ModernButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  className = '',
  size = 'md',
}) => {
    const sizeClasses = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    };

    return (
      <motion.button
        className={`modern-button modern-button-${variant} ${sizeClasses[size]} ${className}`}
        onClick={onClick}
        disabled={disabled}
        whileHover={disabled ? {} : { scale: 1.02 }}
        whileTap={disabled ? {} : { scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        {children}
      </motion.button>
    );
  };

// Quiz Option Component
export const QuizOption: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  state?: 'default' | 'correct' | 'incorrect' | 'selected';
  className?: string;
}> = ({ children, onClick, disabled = false, state = 'default', className = '' }) => {
  const stateClasses = {
    default: '',
    correct: 'correct',
    incorrect: 'incorrect',
    selected: 'border-accent',
  };

  return (
    <motion.button
      className={`quiz-option ${stateClasses[state]} ${className}`}
      onClick={onClick}
      disabled={disabled}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
    >
      <span className="relative z-10 font-medium text-left">{children}</span>
    </motion.button>
  );
};

// Streak Counter Component
export const StreakCounter: React.FC<{
  count: number;
  visible: boolean;
}> = ({ count, visible }) => {
  if (!visible || count === 0) return null;

  return (
    <motion.div
      className={`streak-counter streak-${Math.min(count, 5)}`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      <span className="text-sm font-bold">×{count}</span>
    </motion.div>
  );
};

// Multiplier Pop Component
export const MultiplierPop: React.FC<{
  multiplier: number;
  visible: boolean;
}> = ({ multiplier, visible }) => {
  if (!visible || multiplier === 0) return null;

  return (
    <motion.div
      className={`multiplier-pop multiplier-pop-${Math.min(multiplier, 5)}`}
      initial={{ scale: 0, opacity: 0, rotate: -10 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      exit={{ scale: 1.5, opacity: 0, rotate: 10 }}
      transition={{ duration: 1.5 }}
    >
      ×{multiplier}
    </motion.div>
  );
};

// Leaderboard Item Component
export const LeaderboardItem: React.FC<{
  entry: { member: string; score: number };
  index: number;
  delay?: number;
}> = ({ entry, index, delay = 0 }) => {
  const getRankIcon = (position: number) => {
    switch (position) {
      case 0:
        return '🥇';
      case 1:
        return '🥈';
      case 2:
        return '🥉';
      default:
        return `${position + 1}.`;
    }
  };

  const getRankColor = (position: number) => {
    switch (position) {
      case 0:
        return 'text-yellow-400';
      case 1:
        return 'text-gray-300';
      case 2:
        return 'text-amber-600';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <motion.div
      className="leaderboard-item modern-card p-4 mb-3 bg-card-hover"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`text-lg font-bold w-8 text-center ${getRankColor(index)}`}>
            {getRankIcon(index)}
          </span>
          <span className="font-semibold text-primary truncate max-w-32">{entry.member}</span>
        </div>
        <div className="flex items-center">
          <motion.span
            className="text-xl font-bold text-success"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: delay * 0.1 + 0.2, type: 'spring' }}
          >
            {entry.score}
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
};

// Loading Skeleton Component
export const LoadingSkeleton: React.FC<{
  className?: string;
  lines?: number;
}> = ({ className = '', lines = 1 }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className="skeleton h-4 rounded-lg" />
    ))}
  </div>
);

// Progress Ring Component
export const ProgressRing: React.FC<{
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}> = ({ progress, size = 120, strokeWidth = 8, className = '' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={`relative ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgb(var(--color-border))"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgb(var(--color-accent))"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-primary">{Math.round(progress)}%</span>
      </div>
    </div>
  );
};

// Timer Component
export const TimerDisplay: React.FC<{
  timeLeft: number;
  totalTime: number;
}> = ({ timeLeft, totalTime }) => {
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <ProgressRing progress={progress} size={60} strokeWidth={4} />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            className="text-lg font-bold text-primary"
            key={timeLeft}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            {timeLeft}
          </motion.span>
        </div>
      </div>
      <div className="text-sm text-secondary">seconds left</div>
    </div>
  );
};

// Timer Component with Circular Progress
export const CircularTimer: React.FC<{
  timeLeft: number;
  totalTime: number;
  isWarning?: boolean;
  className?: string;
}> = ({ timeLeft, totalTime, isWarning = false, className = '' }) => {
  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
  const circumference = 2 * Math.PI * 36; // radius of 36
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={`circular-timer ${isWarning ? 'warning' : ''} ${className}`}>
      <div className="relative w-20 h-20">
        {/* Background circle */}
        <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r="36"
            stroke="rgb(var(--color-border))"
            strokeOpacity="0.3"
            strokeWidth="4"
            fill="transparent"
          />
          {/* Progress circle */}
          <motion.circle
            cx="40"
            cy="40"
            r="36"
            stroke={isWarning ? 'rgb(var(--color-error))' : 'rgb(var(--color-accent))'}
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          />
        </svg>

        {/* Timer text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            className={`text-xl font-bold ${isWarning ? 'text-error' : 'text-primary'}`}
            key={timeLeft}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            {timeLeft}
          </motion.span>
        </div>
      </div>
    </div>
  );
};
export const QuestionHeader: React.FC<{
  currentQuestion: number;
  totalQuestions: number;
  timeLeft: number;
  totalTime: number;
}> = ({ currentQuestion, totalQuestions, timeLeft, totalTime }) => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-4">
      <motion.div
        className="text-lg font-semibold text-secondary"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Question {currentQuestion} of {totalQuestions}
      </motion.div>
      <div className="flex gap-1">
        {Array.from({ length: totalQuestions }).map((_, i) => (
          <motion.div
            key={i}
            className={`w-2 h-2 rounded-full ${i < currentQuestion
              ? 'bg-success'
              : i === currentQuestion - 1
                ? 'bg-accent'
                : 'bg-border'
              }`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.05 }}
          />
        ))}
      </div>
    </div>
    <TimerDisplay timeLeft={timeLeft} totalTime={totalTime} />
  </div>
);
