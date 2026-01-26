import { motion } from "framer-motion";
import { useEffect } from "react";
import LoadingDots from "../components/LoadingDots";

export const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
    useEffect(() => {
        // Reduced to 2s for better UX, and ensured it's robust
        const timer = setTimeout(() => {
            console.log("[SplashScreen] Finished");
            onComplete();
        }, 2500);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <motion.div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950 text-white"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-center"
            >
                <div className="mb-6">
                    <div className="w-24 h-24 mx-auto bg-gradient-to-tr from-secondary to-accent rounded-2xl rotate-12 shadow-2xl shadow-primary/20 flex items-center justify-center">
                        <span className="text-4xl text-white font-black -rotate-12">S</span>
                    </div>
                </div>
                <h1 className="text-6xl md:text-8xl font-black mb-4 tracking-tighter">
                    <span className="text-secondary text-gradient">STREAX</span>
                </h1>
                <p className="text-xl md:text-2xl font-light text-secondary/60 tracking-[0.3em] uppercase">
                    CHAMP
                </p>
            </motion.div>
            <div className="mt-12">
                <LoadingDots text="INITIALIZING" />
            </div>
        </motion.div>
    );
};
