import React from 'react';

interface ScoreFaceProps {
    score: number;
    totalQuestions: number;
}

export const ScoreFace: React.FC<ScoreFaceProps> = ({ score, totalQuestions }) => {
    const faceSize = 140;

    // Determine robot face type based on score
    const getRobotFaceData = () => {
        if (score === totalQuestions) {
            // Perfect score - Elite robot
            return {
                faceColor: '#ffd700',
                visorColor: '#000000',
                eyeColor: '#00ff88',
                eyeType: 'elite',
                antennaType: 'dual',
                sidePanels: true,
                glowIntensity: 'high',
            };
        } else if (score >= 4) {
            // 4+ correct - Advanced robot
            return {
                faceColor: '#22c55e',
                visorColor: '#1a1a1a',
                eyeColor: '#00ff88',
                eyeType: 'happy',
                antennaType: 'dual',
                sidePanels: true,
                glowIntensity: 'medium',
            };
        } else if (score === 3) {
            // 3 correct - Standard robot
            return {
                faceColor: '#3b82f6',
                visorColor: '#1a1a1a',
                eyeColor: '#00ff88',
                eyeType: 'content',
                antennaType: 'single',
                sidePanels: true,
                glowIntensity: 'medium',
            };
        } else if (score === 2) {
            // 2 correct - Basic robot
            return {
                faceColor: '#f59e0b',
                visorColor: '#1a1a1a',
                eyeColor: '#ffaa00',
                eyeType: 'neutral',
                antennaType: 'single',
                sidePanels: false,
                glowIntensity: 'low',
            };
        } else if (score === 1) {
            // 1 correct - Malfunctioning robot
            return {
                faceColor: '#f97316',
                visorColor: '#1a1a1a',
                eyeColor: '#ff6600',
                eyeType: 'error',
                antennaType: 'broken',
                sidePanels: false,
                glowIntensity: 'low',
            };
        } else {
            // 0 correct - Damaged robot
            return {
                faceColor: '#ef4444',
                visorColor: '#1a1a1a',
                eyeColor: '#ff3333',
                eyeType: 'offline',
                antennaType: 'broken',
                sidePanels: false,
                glowIntensity: 'none',
            };
        }
    };

    const robotData = getRobotFaceData();

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <svg
                width={faceSize}
                height={faceSize}
                style={{ filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.3))' }}
            >
                {/* Top antennas */}
                {robotData.antennaType === 'dual' && (
                    <>
                        <rect
                            x="40"
                            y="10"
                            width="8"
                            height="8"
                            fill={robotData.faceColor}
                            stroke="#000"
                            strokeWidth="2"
                            rx="2"
                        />
                        <rect
                            x="92"
                            y="10"
                            width="8"
                            height="8"
                            fill={robotData.faceColor}
                            stroke="#000"
                            strokeWidth="2"
                            rx="2"
                        />
                    </>
                )}
                {robotData.antennaType === 'single' && (
                    <rect
                        x="66"
                        y="10"
                        width="8"
                        height="8"
                        fill={robotData.faceColor}
                        stroke="#000"
                        strokeWidth="2"
                        rx="2"
                    />
                )}
                {robotData.antennaType === 'broken' && (
                    <>
                        <rect
                            x="40"
                            y="15"
                            width="6"
                            height="6"
                            fill={robotData.faceColor}
                            stroke="#000"
                            strokeWidth="2"
                            rx="1"
                        />
                        <rect
                            x="94"
                            y="12"
                            width="4"
                            height="4"
                            fill={robotData.faceColor}
                            stroke="#000"
                            strokeWidth="1"
                            rx="1"
                        />
                    </>
                )}

                {/* Side panels */}
                {robotData.sidePanels && (
                    <>
                        <rect
                            x="10"
                            y="50"
                            width="8"
                            height="20"
                            fill={robotData.faceColor}
                            stroke="#000"
                            strokeWidth="2"
                            rx="2"
                        />
                        <rect
                            x="122"
                            y="50"
                            width="8"
                            height="20"
                            fill={robotData.faceColor}
                            stroke="#000"
                            strokeWidth="2"
                            rx="2"
                        />
                    </>
                )}

                {/* Main robot head */}
                <rect
                    x="25"
                    y="25"
                    width="90"
                    height="80"
                    fill={robotData.faceColor}
                    stroke="#000"
                    strokeWidth="3"
                    rx="15"
                />

                {/* Main visor/screen */}
                <rect
                    x="35"
                    y="35"
                    width="70"
                    height="45"
                    fill={robotData.visorColor}
                    stroke="#000"
                    strokeWidth="2"
                    rx="5"
                />

                {/* Visor reflection */}
                <rect x="38" y="38" width="25" height="15" fill="rgba(255,255,255,0.2)" rx="3" />

                {/* Robot eyes based on mood */}
                {robotData.eyeType === 'elite' ? (
                    // Diamond-shaped elite eyes
                    <>
                        <polygon points="50,50 55,45 60,50 55,55" fill={robotData.eyeColor} />
                        <polygon points="80,50 85,45 90,50 85,55" fill={robotData.eyeColor} />
                        {robotData.glowIntensity === 'high' && (
                            <>
                                <circle
                                    cx="55"
                                    cy="50"
                                    r="8"
                                    fill="none"
                                    stroke={robotData.eyeColor}
                                    strokeWidth="1"
                                    opacity="0.6"
                                />
                                <circle
                                    cx="85"
                                    cy="50"
                                    r="8"
                                    fill="none"
                                    stroke={robotData.eyeColor}
                                    strokeWidth="1"
                                    opacity="0.6"
                                />
                            </>
                        )}
                    </>
                ) : robotData.eyeType === 'happy' ? (
                    // Curved happy display lines
                    <>
                        <path
                            d="M 45 48 Q 55 52 65 48"
                            stroke={robotData.eyeColor}
                            strokeWidth="3"
                            fill="none"
                            strokeLinecap="round"
                        />
                        <path
                            d="M 75 48 Q 85 52 95 48"
                            stroke={robotData.eyeColor}
                            strokeWidth="3"
                            fill="none"
                            strokeLinecap="round"
                        />
                    </>
                ) : robotData.eyeType === 'content' ? (
                    // Standard robot eyes
                    <>
                        <rect x="48" y="48" width="8" height="4" fill={robotData.eyeColor} rx="2" />
                        <rect x="84" y="48" width="8" height="4" fill={robotData.eyeColor} rx="2" />
                    </>
                ) : robotData.eyeType === 'neutral' ? (
                    // Dot eyes
                    <>
                        <circle cx="52" cy="50" r="3" fill={robotData.eyeColor} />
                        <circle cx="88" cy="50" r="3" fill={robotData.eyeColor} />
                    </>
                ) : robotData.eyeType === 'error' ? (
                    // Error X patterns
                    <>
                        <path
                            d="M 48 46 L 56 54 M 56 46 L 48 54"
                            stroke={robotData.eyeColor}
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                        <path
                            d="M 84 46 L 92 54 M 92 46 L 84 54"
                            stroke={robotData.eyeColor}
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                    </>
                ) : (
                    // Offline - no eyes
                    <>
                        <rect x="48" y="48" width="8" height="4" fill="#333" rx="2" />
                        <rect x="84" y="48" width="8" height="4" fill="#333" rx="2" />
                    </>
                )}

                {/* Status indicator on visor */}
                {robotData.eyeType !== 'offline' && (
                    <rect x="67" y="65" width="6" height="3" fill={robotData.eyeColor} rx="1" />
                )}

                {/* Bottom chin piece */}
                <rect
                    x="55"
                    y="95"
                    width="30"
                    height="8"
                    fill={robotData.faceColor}
                    stroke="#000"
                    strokeWidth="2"
                    rx="4"
                />

                {/* Glow effects for high-performing robots */}
                {robotData.glowIntensity === 'high' && (
                    <defs>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                )}
            </svg>

            {/* Status indicators floating around elite robot */}
            {robotData.eyeType === 'elite' && (
                <>
                    <div
                        style={{
                            position: 'absolute',
                            top: '15px',
                            left: '15px',
                            width: '6px',
                            height: '6px',
                            backgroundColor: '#00ff88',
                            borderRadius: '50%',
                            boxShadow: '0 0 10px #00ff88',
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            top: '15px',
                            right: '15px',
                            width: '4px',
                            height: '4px',
                            backgroundColor: '#ffd700',
                            borderRadius: '50%',
                            boxShadow: '0 0 8px #ffd700',
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '15px',
                            left: '20px',
                            width: '5px',
                            height: '5px',
                            backgroundColor: '#00ff88',
                            borderRadius: '50%',
                            boxShadow: '0 0 10px #00ff88',
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '15px',
                            right: '20px',
                            width: '6px',
                            height: '6px',
                            backgroundColor: '#ffd700',
                            borderRadius: '50%',
                            boxShadow: '0 0 10px #ffd700',
                        }}
                    />
                </>
            )}
        </div>
    );
};
