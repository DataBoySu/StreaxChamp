import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import LoadingDots from '../LoadingDots';

interface NicknameModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (redditUsername: string, nickname: string) => Promise<void>;
    lookupState: 'idle' | 'checking' | 'need-nickname';
}

export const NicknameModal = ({ isOpen, onClose, onSubmit, lookupState }: NicknameModalProps) => {
    const [redditUsername, setRedditUsername] = useState('');
    const [nickname, setNickname] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(redditUsername, nickname);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="modern-card max-w-md w-full p-6 relative"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-secondary hover:text-base-content"
                        >
                            ✕
                        </button>
                        <h2 className="text-2xl font-bold mb-6 text-gradient">Identify Yourself</h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-secondary mb-1">Reddit Username</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary opacity-50">u/</span>
                                    <input
                                        type="text"
                                        value={redditUsername}
                                        onChange={(e) => setRedditUsername(e.target.value)}
                                        className="w-full bg-base-200 border-none rounded-lg py-3 pl-8 pr-4 focus:ring-2 focus:ring-primary"
                                        placeholder="username"
                                        disabled={lookupState !== 'idle'}
                                    />
                                </div>
                            </div>

                            {lookupState === 'need-nickname' && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                >
                                    <label className="block text-sm font-bold text-secondary mb-1">Choose a Nickname</label>
                                    <input
                                        type="text"
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        className="w-full bg-base-200 border-none rounded-lg py-3 px-4 focus:ring-2 focus:ring-accent"
                                        placeholder="Display Name"
                                        maxLength={15}
                                    />
                                    <p className="text-xs text-secondary mt-1">This will appear on the leaderboard.</p>
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                disabled={!redditUsername || (lookupState === 'need-nickname' && !nickname)}
                                className="modern-button modern-button-primary w-full py-3 mt-4"
                            >
                                {lookupState === 'checking' ? <LoadingDots text="Checking" /> : lookupState === 'need-nickname' ? 'Register' : 'Connect'}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
