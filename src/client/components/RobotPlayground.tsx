import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InteractiveRobot } from './InteractiveRobot';

interface RobotError {
    code: string;
    robotDialogue: string;
    timestamp: number;
    persistent?: boolean;
}

interface RobotPlaygroundProps {
    username: string;
    hasPlayed?: boolean;
    totalPoints?: number;
    // Error state from parent
    currentError: RobotError | null;
    queueLength: number;
    clearErrors: () => void;
}

export const RobotPlayground: React.FC<RobotPlaygroundProps> = ({
    username,
    hasPlayed,
    totalPoints,
    currentError,
    queueLength,
    clearErrors
}) => {
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Total notification count (current + queued)
    const notificationCount = (currentError ? 1 : 0) + queueLength;

    return (
        <div style={{ position: 'relative', width: '100%', overflow: 'visible' }}>
            {/* Notification Bell - Always Visible */}
            <motion.button
                onClick={() => setDrawerOpen(!drawerOpen)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    zIndex: 40,
                    width: '56px',
                    height: '56px',
                    background: notificationCount > 0 ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                    border: '4px solid #000',
                    boxShadow: notificationCount > 0 ? '0 4px 15px rgba(239, 68, 68, 0.5), inset 0 -4px 0 rgba(0,0,0,0.2)' : '0 4px 10px rgba(0,0,0,0.3), inset 0 -4px 0 rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px',
                    imageRendering: 'pixelated',
                }}
                title={notificationCount > 0 ? `${notificationCount} Notification${notificationCount > 1 ? 's' : ''}` : 'No Notifications'}
            >
                <svg
                    viewBox="0 0 24 24"
                    style={{
                        width: '32px',
                        height: '32px',
                        fill: notificationCount > 0 ? '#fbbf24' : '#9ca3af',
                        filter: notificationCount > 0 ? 'drop-shadow(0 0 5px rgba(251, 191, 36, 0.5))' : 'none',
                    }}
                >
                    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                </svg>
                {/* Badge - Always show count */}
                <motion.div
                    animate={notificationCount > 0 ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                    style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        minWidth: '28px',
                        height: '28px',
                        borderRadius: '0',
                        background: notificationCount > 0 ? '#fbbf24' : '#9ca3af',
                        border: '3px solid #000',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '10px',
                        color: '#000',
                        fontWeight: 'bold',
                    }}
                >
                    {notificationCount}
                </motion.div>
            </motion.button>

            {/* Robot */}
            <InteractiveRobot
                username={username}
                errorMessage={currentError?.robotDialogue}
                hasPlayed={hasPlayed ?? false}
                totalPoints={totalPoints ?? 0}
            />

            {/* Notification Drawer - Scoped to RobotPlayground */}
            <AnimatePresence>
                {drawerOpen && (
                    <>
                        {/* Backdrop - Scoped to container */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setDrawerOpen(false)}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'rgba(0, 0, 0, 0.3)',
                                zIndex: 50,
                            }}
                        />
                        {/* Drawer */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="nes-container is-dark"
                            style={{
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                bottom: 0,
                                width: '50%', // User requested 50% of page width
                                minWidth: '280px', // Safeguard for very small screens
                                zIndex: 60,
                                background: '#212529',
                                border: '4px solid #dc2626',
                                boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)',
                                overflowY: 'auto',
                                padding: '1.5rem',
                            }}
                        >
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2
                                    style={{
                                        fontFamily: "'Press Start 2P', cursive",
                                        fontSize: '1rem',
                                        color: '#ef4444',
                                        margin: 0,
                                    }}
                                >
                                    Notifications
                                </h2>
                                <button
                                    onClick={() => setDrawerOpen(false)}
                                    className="nes-btn is-error"
                                    style={{
                                        fontFamily: "'Press Start 2P', cursive",
                                        fontSize: '0.625rem',
                                        padding: '0.5rem',
                                    }}
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Notifications List */}
                            {currentError ? (
                                <div
                                    className="nes-container is-rounded"
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '3px solid #ef4444',
                                        padding: '1rem',
                                        marginBottom: '1rem',
                                    }}
                                >
                                    <div
                                        style={{
                                            fontFamily: "'Press Start 2P', cursive",
                                            fontSize: '0.625rem',
                                            color: '#fca5a5',
                                            marginBottom: '0.5rem',
                                        }}
                                    >
                                        {currentError.code.toUpperCase()}
                                    </div>
                                    <div
                                        style={{
                                            fontFamily: "'Share Tech Mono', monospace",
                                            fontSize: '0.875rem',
                                            color: '#fff',
                                            lineHeight: '1.6',
                                            fontWeight: 'bold',
                                        }}
                                    >
                                        {/* Formal messages for notifications */}
                                        {currentError.code === 'GEN_LIMIT' ? 'Daily generation limit reached for your account.' :
                                            currentError.code === 'GLOBAL_LIMIT' ? 'Global system capacity has been reached.' :
                                                currentError.code === 'CIRCUIT_BREAK' ? 'The system is currently undergoing maintenance.' :
                                                    currentError.robotDialogue}
                                    </div>
                                    <div
                                        style={{
                                            fontFamily: "'Share Tech Mono', monospace",
                                            fontSize: '0.75rem',
                                            color: '#9ca3af',
                                            marginTop: '0.5rem',
                                        }}
                                    >
                                        {new Date(currentError.timestamp).toLocaleTimeString()}
                                    </div>
                                </div>
                            ) : (
                                <div
                                    style={{
                                        fontFamily: "'Share Tech Mono', monospace",
                                        fontSize: '0.875rem',
                                        color: '#9ca3af',
                                        textAlign: 'center',
                                        padding: '2rem',
                                    }}
                                >
                                    No notifications
                                </div>
                            )}

                            {/* Clear Button */}
                            {currentError && (
                                <button
                                    onClick={() => {
                                        clearErrors();
                                        setDrawerOpen(false);
                                    }}
                                    className="nes-btn is-warning"
                                    style={{
                                        fontFamily: "'Press Start 2P', cursive",
                                        fontSize: '0.625rem',
                                        width: '100%',
                                        marginTop: '1rem',
                                    }}
                                >
                                    Clear All
                                </button>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
