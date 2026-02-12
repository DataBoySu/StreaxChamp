
export const requestCommunitySubscribe = async (): Promise<void> => {
    try {
        const response = await fetch('/api/reddit/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            console.log('Successfully subscribed to subreddit!');
            // Optional: Show a toast or feedback?
            // For now, console log is sufficient as the button text change will verify it provided we track state.
            // But for this stateless call, we rely on the action completion.
        } else {
            console.error('Failed to subscribe to subreddit.');
        }
    } catch (error) {
        console.error('Error subscribing to subreddit:', error);
    }
};
