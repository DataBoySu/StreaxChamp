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
                minHeight: '100%',
                backgroundImage: `
                    repeating-linear-gradient(0deg, transparent, transparent 49px, rgba(0, 255, 136, 0.03) 49px, rgba(0, 255, 136, 0.03) 50px),
                    repeating-linear-gradient(90deg, transparent, transparent 49px, rgba(220, 38, 38, 0.03) 49px, rgba(220, 38, 38, 0.03) 50px)
                `,
                backgroundSize: '50px 50px',
            }}
            className={`w-full relative flex flex-col items-center py-6 px-4 md:px-8 lg:px-12 ${className}`}
        >
            {/* Dark cyberpunk container */}
            <div
                className="nes-container is-dark is-rounded w-full max-w-4xl relative z-10 flex flex-col gap-8 md:gap-12"
                style={{
                    backgroundColor: 'rgba(17, 24, 39, 0.95)', // Semi-transparent dark
                    border: '4px solid #dc2626', // Red border matching robot
                    boxShadow: '0 0 30px rgba(0, 255, 136, 0.15), 8px 8px 0px rgba(0, 0, 0, 0.3)', // Cyan glow + depth shadow
                    padding: '2rem',
                }}
            >
                {children}
            </div>
        </motion.div>
    );
};
