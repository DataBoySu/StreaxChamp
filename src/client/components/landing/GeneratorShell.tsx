import React from 'react';
import { motion } from 'framer-motion';

interface GeneratorShellProps {
    children: React.ReactNode;
    className?: string; // Allow extra styling hooks if needed
}

export const GeneratorShell: React.FC<GeneratorShellProps> = ({ children, className = '' }) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`min-h-full w-full bg-primary text-primary generator-theme-locked relative flex flex-col items-center py-8 px-4 md:px-6 lg:px-8 ${className}`}
        >
            {/* Background Pattern/Texture - kept subtle to match "Warm Parchment" or "Cyber Slate" */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
                    backgroundSize: '24px 24px'
                }}
            />

            {/* Main Content Container - Centered and constrained */}
            <div className="w-full max-w-4xl relative z-10 flex flex-col gap-6 md:gap-10">
                {children}
            </div>
        </motion.div>
    );
};
