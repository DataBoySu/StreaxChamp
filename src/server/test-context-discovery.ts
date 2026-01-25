/**
 * Test script to validate subreddit context extraction
 * Run this within the Devvit environment to test context discovery
 */

import { Devvit } from '@devvit/public-api';

export async function testSubredditContext(context: any, subredditName: string = 'streax_app_test') {
  console.log(`🧪 Testing context extraction for r/${subredditName}`);
  
  try {
    // Get subreddit information
    const subreddit = await context.reddit.getSubredditByName(subredditName);
    
    const contextData = {
      name: subreddit.name,
      displayName: subreddit.displayName,
      title: subreddit.title,
      description: subreddit.description,
      publicDescription: subreddit.publicDescription,
      subscribers: subreddit.subscribers,
      created: subreddit.createdAt
    };
    
    console.log('📋 Extracted Context:', JSON.stringify(contextData, null, 2));
    
    // Test source discovery logic
    const sources = discoverSources(contextData);
    console.log('🎯 Discovered Sources:', sources);
    
    return { contextData, sources };
    
  } catch (error) {
    console.error('❌ Error testing context extraction:', error);
    return null;
  }
}

function discoverSources(context: any): string[] {
  const { name, description = '', title = '', displayName = '' } = context;
  const allText = `${name} ${description} ${title} ${displayName}`.toLowerCase();
  
  // Gaming patterns
  const gamingPatterns = {
    'darksouls': ['darksouls.wiki.fextralife.com'],
    'eldenring': ['eldenring.wiki.fextralife.com'],
    'bloodborne': ['bloodborne.wiki.fextralife.com'],
    'sekiro': ['sekiroshadowsdietwice.wiki.fextralife.com'],
    'witcher': ['witcher.fandom.com'],
    'cyberpunk': ['cyberpunk.fandom.com'],
    'fallout': ['fallout.fandom.com'],
    'skyrim': ['elderscrolls.fandom.com'],
    'minecraft': ['minecraft.fandom.com'],
    'pokemon': ['pokemon.fandom.com']
  };
  
  // Category patterns
  const categoryPatterns = {
    gaming: ['game', 'gaming', 'gamer', 'rpg', 'mmo', 'fps', 'strategy', 'indie'],
    science: ['science', 'research', 'laboratory', 'experiment', 'physics', 'chemistry', 'biology'],
    technology: ['tech', 'technology', 'programming', 'coding', 'software', 'hardware', 'ai', 'ml'],
    history: ['history', 'historical', 'ancient', 'medieval', 'war', 'civilization'],
    education: ['education', 'learning', 'study', 'academic', 'university', 'school']
  };
  
  const discoveredSources: string[] = [];
  
  // Check for specific gaming sources
  for (const [keyword, sources] of Object.entries(gamingPatterns)) {
    if (allText.includes(keyword)) {
      discoveredSources.push(...sources);
      console.log(`🎮 Found gaming keyword: ${keyword}`);
    }
  }
  
  // Check for general categories
  for (const [category, keywords] of Object.entries(categoryPatterns)) {
    const matches = keywords.filter(keyword => allText.includes(keyword));
    if (matches.length > 0) {
      console.log(`📚 Found category: ${category} (matches: ${matches.join(', ')})`);
      
      switch (category) {
        case 'gaming':
          if (discoveredSources.length === 0) {
            discoveredSources.push('gaming.fandom.com', 'gamepedia.com');
          }
          break;
        case 'science':
          discoveredSources.push('en.wikipedia.org/wiki/Portal:Science');
          break;
        case 'technology':
          discoveredSources.push('en.wikipedia.org/wiki/Portal:Technology');
          break;
        case 'history':
          discoveredSources.push('en.wikipedia.org/wiki/Portal:History');
          break;
        case 'education':
          discoveredSources.push('en.wikipedia.org');
          break;
      }
    }
  }
  
  // Fallback to general Wikipedia if no specific sources found
  if (discoveredSources.length === 0) {
    console.log('📖 No specific sources found, using Wikipedia fallback');
    discoveredSources.push('en.wikipedia.org');
  }
  
  return [...new Set(discoveredSources)]; // Remove duplicates
}

// Add this as a test menu item in your Devvit app
export const testContextMenuItem = Devvit.addMenuItem({
  label: 'Test Context Discovery',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (event, context) => {
    try {
      const currentSubreddit = await context.reddit.getCurrentSubreddit();
      const result = await testSubredditContext(context, currentSubreddit.name);
      
      if (result) {
        context.ui.showToast(
          `Context extracted! Found ${result.sources.length} sources. Check logs for details.`
        );
      } else {
        context.ui.showToast('Failed to extract context. Check logs for errors.');
      }
    } catch (error) {
      console.error('Error in test context menu:', error);
      context.ui.showToast('Error testing context discovery.');
    }
  },
});
