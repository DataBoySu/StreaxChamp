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
            // THEME LOCK: Force warm parchment background regardless of Reddit theme
            style={{
                backgroundColor: '#F3EFE0', // Warm parchment
                minHeight: '100%',
            }}
            className={`w-full relative flex flex-col items-center py-6 px-4 md:px-8 lg:px-12 ${className}`}
        >
            {/* NES-style main container with subtle shadow for depth */}
            <div
                className="nes-container is-rounded w-full max-w-4xl relative z-10 flex flex-col gap-8 md:gap-12"
                style={{
                    backgroundColor: '#FFFEF9', // Off-white surface
                    border: '4px solid #212529', // High-contrast NES border
                    boxShadow: '8px 8px 0px rgba(0, 0, 0, 0.15)', // Fake 3D depth
                    padding: '2rem',
                }}
            >
                {children}
            </div>
        </motion.div>
    );
};
