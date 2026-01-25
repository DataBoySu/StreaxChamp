import { context, reddit } from '@devvit/web/server';
import { CONFIG } from '../../shared/constants';

export const createPost = async (subredditNameArg?: string) => {
  const ctx = context as unknown;
  const ctxSubreddit = (ctx && typeof ctx === 'object' && 'subredditName' in (ctx as Record<string, unknown>))
    ? String((ctx as Record<string, unknown>).subredditName as unknown || '')
    : undefined;
  const subredditName = String(subredditNameArg || ctxSubreddit || process.env.DEVVIT_SUBREDDIT || CONFIG.SERVER.DEFAULT_SUBREDDIT);

  // Build consistent splash payload (matches /api/splash/create)
  const splashPayload = {
    appDisplayName: CONFIG.GAME.NAME,
    backgroundUri: 'splash-background.png',
    appIconUri: 'app-icon.png',
    heading: 'Ready to Streak?',
    description: 'Prove Your Fandom. Master the Streak. Own the Leaderboard.',
    buttonLabel: 'Start Today\'s Quiz',
    entry: 'default',
  };

  const post = await reddit.submitCustomPost({
    subredditName,
    title: `${CONFIG.GAME.NAME} — Daily Quiz`,
    splash: splashPayload
  });

  return post;
};
