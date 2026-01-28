import React from 'react';
import { motion } from 'framer-motion';

interface NoTopicPromptProps {
    onClose: () => void;
    onChooseTopic: () => void;
}

export const NoTopicPrompt: React.FC<NoTopicPromptProps> = ({
    onClose,
    onChooseTopic,
}) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="modern-card relative w-full max-w-md mx-auto p-6 pt-8 border-2 border-accent/40"
                style={{
                    boxShadow: '0 0 25px rgba(255,69,0,0.35), 0 0 8px rgba(255,255,255,0.15)',
                }}
            >
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-secondary hover:text-primary transition-colors"
                    aria-label="Close"
                >
                    ✕
                </button>
                <h3 className="text-2xl font-extrabold mb-3 text-gradient">Select a Topic</h3>
                <p className="text-secondary mb-6 leading-relaxed">
                    You have not selected a topic. Please pick a topic to generate a quiz.
                </p>
                <div className="flex flex-col gap-3">
                    <button
                        onClick={onChooseTopic}
                        className="modern-button modern-button-primary w-full py-3 font-bold"
                    >
                        Choose Topic
                    </button>
                    <button
                        onClick={onClose}
                        className="modern-button modern-button-secondary w-full py-3 font-bold"
                    >
                        Cancel
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
