import React from 'react';
import { motion } from 'framer-motion';

interface GeneratorShellProps {
    children: React.ReactNode;
    className?: string;
}

export const GeneratorShell: React.FC<GeneratorShellProps> = ({ children, className = '' }) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            // CYBERPUNK THEME: Match robot's dark aesthetic (generate pipeline only)
            style={{
                backgroundColor: '#111827', // Dark slate from robot's gradient
                minHeight: '100dvh', // Changed from 100% to ensure full viewport coverage
                backgroundImage: `
                    repeating-linear-gradient(0deg, transparent, transparent 49px, rgba(0, 255, 136, 0.03) 49px, rgba(0, 255, 136, 0.03) 50px),
                    repeating-linear-gradient(90deg, transparent, transparent 49px, rgba(220, 38, 38, 0.03) 49px, rgba(220, 38, 38, 0.03) 50px)
                `,
                backgroundSize: '50px 50px',
            }}
            className={`w-full relative flex flex-col items-center py-6 px-4 md:px-8 lg:px-12 generator-theme-locked ${className}`}
        >
            {/* Removed giant monolithic container to allow separate section windows */}
            <div className="w-full max-w-4xl relative z-10 flex flex-col gap-6 md:gap-10 items-center">
                {children}
            </div>
        </motion.div>
    );
};
