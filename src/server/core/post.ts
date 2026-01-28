import { context } from '@devvit/web/server';
import { CONFIG } from '../../shared/constants';

export const createPost = async (redditClient: any, subredditNameArg?: string) => {
  const ctx = context as unknown;
  const ctxSubreddit = (ctx && typeof ctx === 'object' && 'subredditName' in (ctx as Record<string, unknown>))
    ? String((ctx as Record<string, unknown>).subredditName as unknown || '')
    : undefined;
  const subredditName = String(subredditNameArg || ctxSubreddit || process.env.DEVVIT_SUBREDDIT || CONFIG.SERVER.DEFAULT_SUBREDDIT);

  console.log(`[createPost] Submitting custom post to r/${subredditName} with entry 'default'`);
  try {
    const post = await redditClient.submitCustomPost({
      subredditName,
      title: `⚡ Can you beat the 5-Question Streak? Play now! 🏆`,
      entry: 'default'
    });
    console.log(`[createPost] Success! Post ID: ${post.id}`);
    return post;
  } catch (e) {
    console.error('[createPost] Error submitting custom post:', e);
    throw e;
  }
};
