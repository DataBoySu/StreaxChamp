import { CONFIG } from '../../shared/constants';

/**
 * Capability-gated function to trigger a native subreddit subscription.
 *
 * NOTE: This function is currently a no-op until NATIVE_SUBSCRIBE_ENABLED is set to true.
 * It is designed to safely fail silently or log intent in development.
 *
 * @returns {Promise<boolean>} true if subscription was attempted/simulated, false if disabled/failed.
 */
export const requestCommunitySubscribe = async (): Promise<boolean> => {
    // 1. Check capability flag
    if (!CONFIG.FEATURES.NATIVE_SUBSCRIBE_ENABLED) {
        if (CONFIG.INTERNAL.BUILD_ENV === 'development') {
            console.log('[NativeSubscribe] Feature disabled. No-op intent logged.');
        }
        return false;
    }

    // 2. Attempt native subscribe
    try {
        if (CONFIG.INTERNAL.BUILD_ENV === 'development') {
            console.log('[NativeSubscribe] Attempting native join for:', CONFIG.COMMUNITY.SUBREDDIT_NAME);
        }

        // TODO: UNCOMMENT WHEN PERMISSION GRANTED AND API AVAILABLE
        // const { reddit } = window.devvit.context; 
        // if (reddit && reddit.subscribeToCurrentSubreddit) {
        //     await reddit.subscribeToCurrentSubreddit();
        //     return true;
        // }

        // Fallback log if API missing at runtime even if enabled
        console.warn('[NativeSubscribe] Native API not found in this context.');
        return false;

    } catch (error) {
        // 3. Catch and swallow permission/runtime errors
        console.error('[NativeSubscribe] Silent failure:', error);
        return false;
    }
};
