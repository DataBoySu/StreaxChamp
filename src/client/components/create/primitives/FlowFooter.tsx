import React from 'react';

interface FlowFooterProps {
    primaryAction?: {
        label: React.ReactNode;
        onClick: () => void;
        disabled?: boolean;
    };
    secondaryAction?: {
        label: React.ReactNode;
        onClick: () => void;
        disabled?: boolean;
    };
    className?: string;
    children?: React.ReactNode;
}

export const FlowFooter: React.FC<FlowFooterProps> = ({
    primaryAction,
    secondaryAction,
    className = '',
    children
}) => {
    return (
        <div className={`mt-auto pt-4 flex flex-col gap-3 ${className}`}>
            {children}
            {secondaryAction && (
                <button
                    onClick={secondaryAction.onClick}
                    disabled={secondaryAction.disabled}
                    className="modern-button w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20"
                >
                    {secondaryAction.label}
                </button>
            )}
            {primaryAction && (
                <div className="flex justify-end w-full">
                    <button
                        onClick={primaryAction.onClick}
                        disabled={primaryAction.disabled}
                        className="modern-button modern-button-primary px-8 py-3 font-bold w-full md:w-auto"
                    >
                        {primaryAction.label}
                    </button>
                </div>
            )}
        </div>
    );
};
