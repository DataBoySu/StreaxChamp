import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import clsx from 'clsx';

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 120,
  strokeWidth = 8,
  className,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI * 2;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div
      className={`relative ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgb(var(--color-border))"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="opacity-20"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: 'easeInOut' }}
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(99, 102, 241)" />
            <stop offset="100%" stopColor="rgb(139, 92, 246)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-gradient">{Math.round(progress)}%</span>
      </div>
    </div>
  );
};

interface ModernButtonPropsBase {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

type MotionBtnProps = Omit<HTMLMotionProps<'button'>, 'ref'>;

export const ModernButton: React.FC<ModernButtonPropsBase & MotionBtnProps> = ({
  variant = 'primary',
  size = 'md',
  className,
  children,
  onClick,
  disabled,
  type,
  ...props
}) => {
  const baseClasses = 'modern-button';
  const variantClasses = {
    primary: 'modern-button-primary',
    secondary: 'modern-button-secondary',
    ghost: 'hover:bg-opacity-10 hover:bg-white text-current',
  };
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={clsx(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      onClick={onClick}
      disabled={disabled}
      type={type}
      // Spread motion-specific props; typed as MotionBtnProps to avoid 'any'
      {...(props as MotionBtnProps)}
    >
      {children}
    </motion.button>
  );
};

interface QuizOptionProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  isSelected?: boolean;
  isCorrect?: boolean;
  isIncorrect?: boolean;
  className?: string;
}

export const QuizOption: React.FC<QuizOptionProps> = ({
  children,
  onClick,
  disabled = false,
  isSelected = false,
  isCorrect = false,
  isIncorrect = false,
  className,
}) => {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={!disabled ? { scale: 1.02, y: -2 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'quiz-option w-full text-left',
        {
          'correct': isCorrect,
          'incorrect': isIncorrect,
          'opacity-50 cursor-not-allowed': disabled,
        },
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-900 dark:text-gray-100">{children}</span>
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center"
          >
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </motion.div>
        )}
      </div>
    </motion.button>
  );
};

interface ModernCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const ModernCard: React.FC<ModernCardProps> = ({ children, className, hover = true }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hover ? { y: -4 } : {}}
      className={clsx('modern-card', className)}
    >
      {children}
    </motion.div>
  );
};

interface StreakCounterProps {
  count: number;
  className?: string;
}

export const StreakCounter: React.FC<StreakCounterProps> = ({ count, className }) => {
  if (count === 0) return null;

  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      className={clsx('streak-counter', `streak-${Math.min(count, 5)}`, className)}
    >
      <span>×{count}</span>
    </motion.div>
  );
};

interface MultiplierPopProps {
  multiplier: number;
  show: boolean;
}

export const MultiplierPop: React.FC<MultiplierPopProps> = ({ multiplier, show }) => {
  if (!show || multiplier === 0) return null;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 1.5, opacity: 0 }}
      className={clsx('multiplier-pop', `multiplier-pop-${Math.min(multiplier, 5)}`)}
    >
      ×{multiplier}
    </motion.div>
  );
};

interface LeaderboardItemProps {
  rank: number;
  member: string;
  score: number;
  isCurrentUser?: boolean;
}

export const LeaderboardItem: React.FC<LeaderboardItemProps> = ({
  rank,
  member,
  score,
  isCurrentUser = false,
}) => {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return null;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'text-yellow-400';
      case 2:
        return 'text-gray-400';
      case 3:
        return 'text-amber-600';
      default:
        return 'text-gray-600 dark:text-gray-300';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.1 }}
      className={clsx('leaderboard-item modern-card p-4 mb-3', {
        'ring-2 ring-rgb(var(--color-accent)) ring-opacity-50': isCurrentUser,
      })}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={clsx('text-2xl font-bold w-12 text-center', getRankColor(rank))}>
            {getRankIcon(rank) || `#${rank}`}
          </div>
          <div>
            <div
              className={`font-semibold ${
                isCurrentUser
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-900 dark:text-gray-100'
              }`}
            >
              {member}
            </div>
            {isCurrentUser && <div className="text-xs text-gray-500 dark:text-gray-400">You</div>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{score}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">points</div>
        </div>
      </div>
    </motion.div>
  );
};

export const LoadingSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={clsx('skeleton rounded-lg h-4', className)} />
);

// Dramatic Circular Timer Component with liquid-fill effect and vibration animations
export const CircularTimer: React.FC<{
  timeLeft: number;
  totalTime: number;
  className?: string;
}> = ({ timeLeft, totalTime, className = '' }) => {
  const size = 150; // Reduced from 200 to 150 for better mobile fit
  const radius = (size - 16) / 2; // Reduced border width
  const circumference = radius * 2 * Math.PI;
  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Determine urgency level for animations with new 15-second timer
  // 10-15: normal (no effects)
  // 5-10: yellow
  // 1-5: red
  const isUrgent = timeLeft <= 10; // Yellow zone
  const isCritical = timeLeft <= 5; // Red zone
  const isLastSecond = timeLeft <= 1; // Most critical

  // Animation speeds based on urgency - reduced intensity
  const pulseSpeed = isLastSecond ? 0.4 : isCritical ? 0.6 : isUrgent ? 1.0 : 2.0;
  const shakeIntensity = isLastSecond ? 4 : isCritical ? 2 : isUrgent ? 1 : 0;

  return (
    <div className={clsx('relative flex flex-col items-center', className)}>
      <motion.div
        className="relative"
        animate={
          isUrgent
            ? {
                scale: [1, 1.04, 1], // Reduced scale effect
                x: [-shakeIntensity, shakeIntensity, -shakeIntensity, 0],
                y: [-shakeIntensity, shakeIntensity, -shakeIntensity, 0],
              }
            : {}
        }
        transition={{
          duration: pulseSpeed,
          repeat: isUrgent ? Infinity : 0,
          ease: 'easeInOut',
        }}
      >
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
          style={{
            filter: isUrgent
              ? `drop-shadow(0 0 ${isCritical ? 20 : 12}px ${
                  isCritical
                    ? 'rgba(239, 68, 68, 0.6)' // Red shadow for 1-5 seconds
                    : 'rgba(234, 179, 8, 0.4)' // Yellow shadow for 5-10 seconds
                })`
              : 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))',
          }}
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgb(var(--color-border))"
            strokeWidth="8"
            fill="transparent"
            opacity="0.2"
          />

          {/* Liquid-fill progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={
              isCritical
                ? '#ef4444' // Red for 1-5 seconds
                : isUrgent
                  ? '#eab308' // Yellow for 5-10 seconds
                  : 'rgb(var(--color-accent))' // Normal color for 10-15 seconds
            }
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{
              strokeDashoffset: strokeDashoffset,
              stroke: isCritical
                ? '#ef4444' // Red for 1-5 seconds
                : isUrgent
                  ? '#eab308' // Yellow for 5-10 seconds
                  : 'rgb(var(--color-accent))', // Normal color for 10-15 seconds
            }}
            transition={{
              strokeDashoffset: { duration: 0.8, ease: 'easeOut' },
              stroke: { duration: 0.3 },
            }}
            style={{
              filter: isUrgent ? 'brightness(1.3) saturate(1.2)' : 'none',
            }}
          />
        </svg>

        {/* Large timer number in center - Fixed positioning */}
        <div
          className="absolute flex items-center justify-center"
          style={{
            top: 0,
            left: 0,
            width: `${size}px`,
            height: `${size}px`,
            zIndex: 10,
          }}
        >
          <motion.div
            className={`font-black text-center leading-none select-none`}
            style={{
              fontSize: `${size * 0.32}px`, // Slightly increased proportion for readability
              color: 'rgb(var(--color-text-primary))', // Use theme color instead of circle color
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)', // Simple shadow, no glow effects
              lineHeight: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '900',
            }}
            key={timeLeft} // Key change triggers re-animation
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {timeLeft}
          </motion.div>
        </div>
      </motion.div>

      {/* Urgent warning text below timer */}
      <AnimatePresence>
        {isUrgent && (
          <motion.div
            className="mt-3"
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            <motion.span
              className={`text-sm font-bold tracking-wider uppercase ${
                isLastSecond ? 'text-red-500' : isCritical ? 'text-orange-500' : 'text-yellow-500'
              }`}
              animate={{
                opacity: [0.7, 1, 0.7],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: pulseSpeed * 0.8,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              {isLastSecond
                ? '⚠️ HURRY UP!'
                : isCritical
                  ? '⏰ TIME RUNNING OUT!'
                  : '⚡ THINK FAST!'}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
