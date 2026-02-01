import React from 'react';

interface FlowHeaderProps {
    title: string;
    onBack?: () => void;
    currentStep?: number;
    totalSteps?: number;
    rightElement?: React.ReactNode;
}

export const FlowHeader: React.FC<FlowHeaderProps> = ({
    title,
    onBack,
    currentStep,
    totalSteps,
    rightElement
}) => {
    return (
        <div className="flex items-center justify-between mb-6">
            {onBack ? (
                <button onClick={onBack} className="modern-button px-3 py-1 text-sm bg-accent/20">
                    ← Back
                </button>
            ) : <div className="w-16" />} {/* Spacer or button */}

            <div className="text-center">
                <h2 className="text-lg font-bold text-gradient">{title}</h2>
                {currentStep !== undefined && totalSteps !== undefined && (
                    <div className="flex gap-1 justify-center mt-1">
                        {Array.from({ length: totalSteps + 1 }).map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 w-6 rounded-full transition-colors ${i <= currentStep ? 'bg-primary' : 'bg-white/20'}`}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="w-16 flex justify-end">
                {rightElement}
            </div>
        </div>
    );
};
