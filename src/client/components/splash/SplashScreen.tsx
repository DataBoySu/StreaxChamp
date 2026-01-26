import React from 'react';
import { motion } from 'framer-motion';

interface SplashScreenProps {
    onDismiss: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onDismiss }) => {
    return (
        <motion.div
            key="splash"
            className="splash-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            onClick={onDismiss}
        >
            <div className="splash-content">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 1, type: 'spring' }}
                >
                    <h1 className="splash-title">STREAX CHAMP</h1>
                    <p className="splash-subtitle">Press anywhere to start</p>
                </motion.div>
            </div>
        </motion.div>
    );
};
