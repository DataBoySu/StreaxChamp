import React from 'react';

interface NoticeCardProps {
    type: 'success' | 'info' | 'error' | 'milestone';
    title?: string;
    message: React.ReactNode;
    icon?: string;
    className?: string;
}

export const NoticeCard: React.FC<NoticeCardProps> = ({ type, title, message, icon, className = '' }) => {
    const styles = {
        success: 'bg-success/10 border-success/30 text-success',
        info: 'bg-primary/10 border-primary/30 text-primary',
        error: 'bg-error', // Usually for toast, might need adjustment if used inline
        milestone: 'bg-primary/10 border-primary/30'
    };

    const defaultIcons = {
        success: '✅',
        info: 'ℹ️',
        error: '⚠️',
        milestone: '🏆'
    };

    const finalIcon = icon || defaultIcons[type];

    if (type === 'error') {
        // Special case for floating validation error
        return (
            <div className={`px-4 py-2 bg-error text-white text-xs font-bold rounded-full shadow-lg whitespace-nowrap ${className}`}>
                {finalIcon} {message}
            </div>
        );
    }

    return (
        <div className={`border-2 rounded-2xl p-4 flex items-center gap-4 ${styles[type]} ${className}`}>
            <div className="text-3xl">{finalIcon}</div>
            <div>
                {title && <p className="font-bold">{title}</p>}
                <div className="text-sm text-secondary">{message}</div>
            </div>
        </div>
    );
};
