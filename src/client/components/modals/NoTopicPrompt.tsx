import React from 'react';
import { motion } from 'framer-motion';

interface NoTopicPromptProps {
    onClose: () => void;
    onChooseTopic: () => void;
    onPlayDaily: () => void;
}

export const NoTopicPrompt: React.FC<NoTopicPromptProps> = ({
    onClose,
    onChooseTopic,
    onPlayDaily,
}) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="nes-container is-dark relative w-full max-w-md mx-auto p-6 pt-8"
                style={{
                    backgroundColor: '#111827',
                    border: '4px solid #dc2626',
                    borderRadius: 0,
                    boxShadow: '0 0 30px rgba(220, 38, 38, 0.4), 8px 8px 0px rgba(0, 0, 0, 0.5)',
                }}
            >
                <button
                    onClick={onClose}
                    className="nes-btn is-error"
                    style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '0.625rem',
                        padding: '0.5rem',
                    }}
                    aria-label="Close"
                >
                    ✕
                </button>
                <h3
                    style={{
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: 'clamp(1rem, 3vw, 1.25rem)',
                        color: '#00ff88',
                        textShadow: '0 0 15px rgba(0, 255, 136, 0.5)',
                        marginBottom: '1rem',
                        lineHeight: '1.6',
                    }}
                >
                    Ready to Play?
                </h3>
                <p
                    style={{
                        fontFamily: "'VT323', monospace",
                        fontSize: '1rem',
                        color: '#9ca3af',
                        marginBottom: '1.5rem',
                        lineHeight: '1.6',
                    }}
                >
                    Start a generated quiz for a specific topic, or challenge yourself with the official Daily Quiz.
                </p>
                <div className="flex flex-col gap-3">
                    <button
                        onClick={onChooseTopic}
                        className="nes-btn is-error w-full"
                        style={{
                            fontFamily: "'Press Start 2P', cursive",
                            fontSize: 'clamp(0.65rem, 2vw, 0.8rem)',
                        }}
                    >
                        Choose Topic
                    </button>
                    <button
                        onClick={onPlayDaily}
                        className="nes-btn is-primary w-full"
                        style={{
                            fontFamily: "'Press Start 2P', cursive",
                            fontSize: 'clamp(0.65rem, 2vw, 0.8rem)',
                        }}
                    >
                        Play Daily Quiz
                    </button>
                    <button
                        onClick={onClose}
                        className="nes-btn w-full"
                        style={{
                            fontFamily: "'Press Start 2P', cursive",
                            fontSize: 'clamp(0.6rem, 1.8vw, 0.75rem)',
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
