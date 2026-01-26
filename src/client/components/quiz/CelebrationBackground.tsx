import React from 'react';
import { motion } from 'framer-motion';

interface CelebrationBackgroundProps {
    score: number;
}

export const CelebrationBackground: React.FC<CelebrationBackgroundProps> = ({ score }) => {
    const isSuccess = score >= 3;
    const balloonColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'];

    // lightweight render
    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                overflow: 'hidden',
                zIndex: 1000,
                width: '100vw',
                height: '100vh',
            }}
        >
            {isSuccess ? (
                // Balloons for good performance
                <>
                    {/* Balloons rendering */}
                    {Array.from({ length: 8 }).map((_, i) => (
                        <motion.div
                            key={i}
                            style={{
                                position: 'absolute',
                                left: `${10 + ((i * 10) % 80)}%`,
                                bottom: '0px',
                                width: '50px',
                                height: '65px',
                                zIndex: 1001,
                            }}
                            initial={{ y: 100, opacity: 1, rotate: 0 }}
                            animate={{
                                y: -900,
                                opacity: [1, 1, 1, 0.8, 0],
                                rotate: [0, 10, -10, 5, 0],
                                x: [0, 30, -20, 10, 0],
                            }}
                            transition={{
                                duration: 8,
                                delay: i * 0.7,
                                ease: 'easeOut',
                                repeat: 0,
                            }}
                        >
                            {/* Balloon */}
                            <div
                                style={{
                                    width: '40px',
                                    height: '50px',
                                    backgroundColor: balloonColors[i % balloonColors.length] || '#ff6b6b',
                                    borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                                    position: 'relative',
                                    boxShadow: `inset -8px -8px 0 rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.2)`,
                                    border: '3px solid rgba(255,255,255,0.4)',
                                    background: `linear-gradient(135deg, ${balloonColors[i % balloonColors.length] || '#ff6b6b'} 0%, ${balloonColors[i % balloonColors.length] || '#ff6b6b'}CC 100%)`,
                                }}
                            >
                                {/* Balloon highlight */}
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '8px',
                                        left: '8px',
                                        width: '12px',
                                        height: '16px',
                                        backgroundColor: 'rgba(255,255,255,0.5)',
                                        borderRadius: '50%',
                                        transform: 'rotate(-20deg)',
                                    }}
                                />
                            </div>
                            {/* String */}
                            <div
                                style={{
                                    width: '2px',
                                    height: '40px',
                                    backgroundColor: '#444',
                                    margin: '0 auto',
                                    position: 'relative',
                                    boxShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                                }}
                            />
                        </motion.div>
                    ))}
                </>
            ) : (
                // Sludge bombs for poor performance
                <>
                    {/* Sludge bombs rendering */}
                    {Array.from({ length: 6 }).map((_, i) => (
                        <motion.div
                            key={i}
                            style={{
                                position: 'absolute',
                                left: `${15 + ((i * 12) % 70)}%`,
                                top: '-10px',
                                width: '35px',
                                height: '35px',
                                zIndex: 1001,
                            }}
                            initial={{ y: -100, opacity: 1, rotate: 0 }}
                            animate={{
                                y: 900,
                                opacity: [1, 1, 1, 0.8, 0],
                                rotate: [0, 180, 360, 540],
                                x: [0, -25, 15, -10, 0],
                            }}
                            transition={{
                                duration: 6,
                                delay: i * 0.8,
                                ease: 'easeIn',
                                repeat: 0,
                            }}
                        >
                            {/* Sludge Bomb */}
                            <div
                                style={{
                                    width: '30px',
                                    height: '30px',
                                    backgroundColor: '#4a5d23',
                                    borderRadius: '40% 60% 30% 70%',
                                    position: 'relative',
                                    boxShadow: '3px 3px 8px rgba(0,0,0,0.5), inset -3px -3px 0 rgba(0,0,0,0.3)',
                                    border: '3px solid #3a4d13',
                                    background: 'radial-gradient(circle at 30% 30%, #6b7c3a, #4a5d23, #3a4d13)',
                                }}
                            >
                                {/* Stench lines */}
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '-15px',
                                        left: '8px',
                                        width: '2px',
                                        height: '10px',
                                        backgroundColor: '#7a8b4a',
                                        borderRadius: '1px',
                                        opacity: 0.7,
                                    }}
                                />
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '-12px',
                                        left: '15px',
                                        width: '1px',
                                        height: '8px',
                                        backgroundColor: '#7a8b4a',
                                        borderRadius: '1px',
                                        opacity: 0.5,
                                    }}
                                />
                                {/* Drips */}
                                <div
                                    style={{
                                        position: 'absolute',
                                        bottom: '-5px',
                                        left: '8px',
                                        width: '4px',
                                        height: '12px',
                                        backgroundColor: '#4a5d23',
                                        borderRadius: '0 0 50% 50%',
                                        opacity: 0.8,
                                    }}
                                />
                                <div
                                    style={{
                                        position: 'absolute',
                                        bottom: '-3px',
                                        right: '5px',
                                        width: '3px',
                                        height: '8px',
                                        backgroundColor: '#4a5d23',
                                        borderRadius: '0 0 50% 50%',
                                        opacity: 0.6,
                                    }}
                                />
                            </div>
                        </motion.div>
                    ))}
                </>
            )}
        </div>
    );
};
