import { useState, useEffect } from 'react';

export const usePostId = () => {
    const [postId, setPostId] = useState<string | null>(null);

    useEffect(() => {
        const fetchInit = async () => {
            try {
                // In Devvit Web, /api/init returns context info including postId
                const res = await fetch('/api/init');
                if (res.ok) {
                    const data = await res.json();
                    if (data.postId) {
                        setPostId(data.postId);
                    }
                }
            } catch (e) {
                console.warn('[usePostId] Failed to fetch postId', e);
            }
        };
        void fetchInit();
    }, []);

    return postId;
};
