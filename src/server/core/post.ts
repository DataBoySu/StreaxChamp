import { context } from '@devvit/web/server';
import { CONFIG } from '../../shared/constants';

export const createPost = async (redditClient: any, subredditNameArg?: string) => {
  const ctx = context as unknown;
  const ctxSubreddit = (ctx && typeof ctx === 'object' && 'subredditName' in (ctx as Record<string, unknown>))
    ? String((ctx as Record<string, unknown>).subredditName as unknown || '')
    : undefined;
  const subredditName = String(subredditNameArg || ctxSubreddit || process.env.DEVVIT_SUBREDDIT || CONFIG.SERVER.DEFAULT_SUBREDDIT);

  const post = await redditClient.submitCustomPost({
    subredditName,
    title: `${CONFIG.GAME.NAME} — Daily Quiz`,
    entry: 'default'
  });

  return post;
};
