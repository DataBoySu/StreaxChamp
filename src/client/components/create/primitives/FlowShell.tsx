import React from 'react';

interface FlowShellProps {
    children: React.ReactNode;
    className?: string;
}

export const FlowShell: React.FC<FlowShellProps> = ({ children, className = '' }) => {
    return (
        <div className={`flex flex-col h-full w-full max-w-5xl mx-auto p-4 relative ${className}`}>
            {children}
        </div>
    );
};

export const FlowBody: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`flex-1 overflow-y-auto custom-scrollbar pb-20 ${className}`}>
        {children}
    </div>
);
