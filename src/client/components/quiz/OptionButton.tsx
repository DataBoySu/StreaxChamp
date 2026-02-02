import React from 'react';

interface OptionButtonProps {
    label: string;
    index: number;
    isSelected: boolean;
    isCorrect: boolean;
    isAnswered: boolean;
    onSelect: (index: number) => void;
    fontSize?: string;
}

export const OptionButton: React.FC<OptionButtonProps> = ({
    label,
    index,
    isSelected,
    isCorrect,
    isAnswered,
    onSelect,
    fontSize = '0.8rem'
}) => {
    let btnClass = 'nes-btn';
    if (isAnswered) {
        if (isCorrect) btnClass += ' is-success';
        else if (isSelected) btnClass += ' is-error';
        else btnClass += ' is-disabled';
    } else {
        if (isSelected) btnClass += ' is-primary'; // fallback, though un-answered selection usually doesn't stay
    }

    return (
        <button
            className={btnClass}
            style={{
                width: '100%',
                textAlign: 'left',
                fontSize: fontSize,
                minHeight: '36px',
                height: 'auto',
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center'
            }}
            disabled={isAnswered}
            onClick={() => !isAnswered && onSelect(index)}
        >
            <span style={{
                display: 'block',
                width: '100%',
                lineHeight: '1.2',
                wordBreak: 'break-word'
            }}>
                {label}
            </span>
        </button>
    );
};
