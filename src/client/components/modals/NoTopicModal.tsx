import { motion, AnimatePresence } from 'framer-motion';

interface NoTopicModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectTopic: (slug: string, title: string) => void;
    dailyTopic?: { title: string; slug: string };
}

export const NoTopicModal = ({ isOpen, onClose, onSelectTopic, dailyTopic }: NoTopicModalProps) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="modern-card max-w-sm w-full p-6 text-center"
                    >
                        <h3 className="text-xl font-bold mb-4">No Topic Selected</h3>
                        <p className="text-secondary mb-6">Whoa there, champion! You need to pick a topic before you can start a streak.</p>

                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    if (dailyTopic) onSelectTopic(dailyTopic.slug, dailyTopic.title);
                                    onClose();
                                }}
                                className="modern-button modern-button-primary w-full py-3"
                            >
                                Play Daily Quiz
                            </button>
                            <button
                                onClick={onClose}
                                className="modern-button modern-button-secondary w-full py-3"
                            >
                                Select a Topic
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
