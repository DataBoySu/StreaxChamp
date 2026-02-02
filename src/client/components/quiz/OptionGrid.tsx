import React, { ReactNode } from 'react';

interface OptionGridProps {
    options: string[];
    children: ReactNode;
    optionFontSize?: string;
}

export const OptionGrid: React.FC<OptionGridProps> = ({ options, children, optionFontSize }) => {
    // Deterministic Layout Policy: Grid if 4 options and all are short (<= 18 chars)
    const isGrid = (() => {
        if (options.length !== 4) return false;
        return options.every(opt => opt.length <= 18);
    })();

    return (
        <div
            className={`flex-1 grid ${isGrid ? 'grid-cols-2 gap-4' : 'grid-cols-1 gap-y-4'}`}
            style={{
                marginBottom: '0.4rem',
                minHeight: 0,
                fontSize: optionFontSize
            }}
        >
            {children}
        </div>
    );
};
