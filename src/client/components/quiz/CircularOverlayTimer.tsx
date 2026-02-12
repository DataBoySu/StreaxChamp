import React from 'react';
import { motion } from 'framer-motion';

interface CircularOverlayTimerProps {
    timeLeft: number;
    totalTime: number;
}

export const CircularOverlayTimer: React.FC<CircularOverlayTimerProps> = ({
    timeLeft,
    totalTime,
}) => {
    // Progressive opacity: invisible until final 15s, then 0→60%
    const calculateOpacity = () => {
        if (timeLeft > 15) return 0;
        // Linear progression from 0 to 0.6 as time goes from 15s to 0s
        return Math.min(0.6, ((15 - timeLeft) / 15) * 0.6);
    };

    // Conditional colors based on time remaining
    const getTimerColor = () => {
        if (timeLeft <= 5) return '#ff6b6b'; // Red - critical
        if (timeLeft <= 10) return '#ffa500'; // Orange - warning
        return '#00ff88'; // Green - safe
    };

    const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;
    const timerColor = getTimerColor();
    const opacity = calculateOpacity();

    return (
        <motion.div
            style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 9999,
                pointerEvents: 'none',
                opacity,
                transition: 'opacity 0.5s ease-in-out',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity }}
        >
            {/* Pixel-art circular timer */}
            <div
                className="nes-container is-dark"
                style={{
                    borderRadius: 0,
                    background: 'rgba(17, 24, 39, 0.85)',
                    border: `4px solid ${timerColor}`,
                    boxShadow: `0 0 40px ${timerColor}80`,
                    padding: '2rem',
                    width: '220px',
                    height: '220px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <div style={{ position: 'relative', width: '180px', height: '180px' }}>
                    {/* SVG Circle */}
                    <svg
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            transform: 'rotate(-90deg)',
                        }}
                        viewBox="0 0 180 180"
                    >
                        {/* Background circle */}
                        <circle
                            cx="90"
                            cy="90"
                            r={radius}
                            stroke="rgba(255, 255, 255, 0.1)"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray="4 4"
                        />
                        {/* Progress circle */}
                        <motion.circle
                            cx="90"
                            cy="90"
                            r={radius}
                            stroke={timerColor}
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="square"
                            style={{
                                filter: `drop-shadow(0 0 8px ${timerColor})`,
                            }}
                            animate={{ strokeDashoffset }}
                            transition={{ duration: 0.5, ease: 'linear' }}
                        />
                    </svg>

                    {/* Timer number */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}
                    >
                        <motion.div
                            key={timeLeft}
                            initial={{ scale: 1.3 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.2 }}
                            style={{
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: 'clamp(2rem, 5vw, 3rem)',
                                color: timerColor,
                                textShadow: `0 0 20px ${timerColor}`,
                                lineHeight: 1,
                            }}
                        >
                            {timeLeft}
                        </motion.div>
                        <div
                            style={{
                                fontFamily: "'VT323', monospace",
                                fontSize: 'clamp(0.7rem, 2vw, 0.9rem)',
                                color: 'rgba(255, 255, 255, 0.6)',
                                textTransform: 'uppercase',
                            }}
                        >
                            seconds
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
