// Multiplier Pop Component - Modernized with NES.css
export const MultiplierPop: React.FC<{
    multiplier: number;
    visible: boolean;
}> = ({ multiplier, visible }) => {
    if (!visible || multiplier === 0) return null;

    // Conditional styling based on multiplier level
    const getMultiplierStyle = (level: number) => {
        if (level >= 5)
            return {
                color: '#ff69b4',
                textShadow: '0 0 20px rgba(255, 105, 180, 0.8)',
                borderColor: '#ff69b4',
                boxShadow: '0 0 30px rgba(255, 105, 180, 0.6)',
            };
        if (level >= 3)
            return {
                color: '#a78bfa',
                textShadow: '0 0 20px rgba(167, 139, 250, 0.8)',
                borderColor: '#7c3aed',
                boxShadow: '0 0 25px rgba(124, 58, 237, 0.6)',
            };
        return {
            color: '#00ff88',
            textShadow: '0 0 20px rgba(0, 255, 136, 0.8)',
            borderColor: '#00ff88',
            boxShadow: '0 0 20px rgba(0, 255, 136, 0.6)',
        };
    };

    const style = getMultiplierStyle(multiplier);

    return (
        <motion.div
            className="nes-container is-dark"
            style={{
                position: 'fixed',
                top: '20%',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                borderRadius: 0,
                background: 'rgba(17, 24, 39, 0.95)',
                border: `4px solid ${style.borderColor}`,
                boxShadow: style.boxShadow,
                padding: '1.5rem 2rem',
                fontFamily: "'Press Start 2P', cursive",
                fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                color: style.color,
                textShadow: style.textShadow,
            }}
            initial={{ scale: 0, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 1.5, opacity: 0, rotate: 10 }}
            transition={{ duration: 1.5 }}
        >
            ×{multiplier}
        </motion.div>
    );
};
