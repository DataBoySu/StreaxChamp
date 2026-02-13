
export const requestCommunitySubscribe = async (): Promise<boolean> => {
    try {
        const response = await fetch('/api/community/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            console.log('Successfully subscribed to subreddit!');
            return true;
        } else {
            console.error('Failed to subscribe to subreddit.');
            return false;
        }
    } catch (error) {
        console.error('Error subscribing to subreddit:', error);
        return false;
    }
};
