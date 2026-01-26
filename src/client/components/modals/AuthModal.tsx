import React from 'react';
import { motion } from 'framer-motion';

interface AuthModalProps {
    onClose: () => void;
    pendingReddit: string;
    setPendingReddit: (val: string) => void;
    pendingNickname: string;
    setPendingNickname: (val: string) => void;
    lookupState: 'idle' | 'checking' | 'need-nickname';
    setLookupState: (val: 'idle' | 'checking' | 'need-nickname') => void;
    signupError: string | null;
    onSubmit: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
    onClose,
    pendingReddit,
    setPendingReddit,
    pendingNickname,
    setPendingNickname,
    lookupState,
    setLookupState,
    signupError,
    onSubmit,
}) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="modern-card w-full max-w-md p-6 border-2 border-accent/40"
            >
                <h2 className="text-2xl font-extrabold mb-4 text-gradient">Sign In</h2>
                <div className="mb-4">
                    <label className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1 block">
                        Reddit Username
                    </label>
                    <div className="flex items-center gap-2">
                        <span className="text-accent font-bold">u/</span>
                        <input
                            value={pendingReddit}
                            onChange={(e) => {
                                setPendingReddit(e.target.value);
                                if (lookupState !== 'idle') setLookupState('idle');
                            }}
                            placeholder="yourname"
                            className="flex-1 px-3 py-2 rounded border border-accent/40 bg-base-200 focus:outline-none focus:ring-2 focus:ring-accent"
                            maxLength={40}
                        />
                    </div>
                </div>
                {lookupState === 'need-nickname' && (
                    <div className="mb-4">
                        <label className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1 block">
                            Nickname (new)
                        </label>
                        <input
                            value={pendingNickname}
                            onChange={(e) => setPendingNickname(e.target.value)}
                            placeholder="Choose nickname"
                            className="w-full px-3 py-2 rounded border border-accent/40 bg-base-200 focus:outline-none focus:ring-2 focus:ring-accent"
                            maxLength={40}
                        />
                        <p className="mt-2 text-[10px] opacity-60">
                            Username not found. Create a nickname to register.
                        </p>
                    </div>
                )}
                {signupError && (
                    <div className="text-error text-xs font-semibold mb-2">{signupError}</div>
                )}
                <div className="flex gap-3 items-stretch">
                    <button
                        onClick={onClose}
                        className="modern-button modern-button-secondary flex-1 py-3 font-bold"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={
                            !pendingReddit.trim() ||
                            (lookupState === 'need-nickname' && !pendingNickname.trim())
                        }
                        className="modern-button modern-button-primary flex-1 py-3 font-bold disabled:opacity-50"
                    >
                        {lookupState === 'checking'
                            ? 'Checking…'
                            : lookupState === 'need-nickname'
                                ? 'Register'
                                : 'Continue'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
