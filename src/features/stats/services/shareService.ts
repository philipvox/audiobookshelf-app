/**
 * src/features/stats/services/shareService.ts
 *
 * Service for generating shareable progress cards and stats summaries.
 * Creates images and text for sharing to social platforms.
 */

import { Share, Platform } from 'react-native';
import { LibraryItem } from '@/core/types';
import { sqliteCache } from '@/core/services/sqliteCache';

// Optional capture (only if react-native-view-shot is installed)
let captureRef: ((viewRef: any, options?: any) => Promise<string>) | null = null;
try {
  captureRef = require('react-native-view-shot').captureRef;
} catch {
  // Not installed - sharing will work without image capture
}

export interface BookProgress {
  book: LibraryItem;
  position: number;
  duration: number;
  percentComplete: number;
  chaptersCompleted?: number;
  totalChapters?: number;
}

export interface ShareableStats {
  type: 'progress' | 'completed' | 'weekly' | 'streak' | 'milestone';
  title: string;
  subtitle?: string;
  stats: Record<string, string | number>;
  bookTitle?: string;
  authorName?: string;
  coverUrl?: string;
}

/**
 * Format duration for sharing (human-readable)
 */
function formatShareDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  if (minutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  return `${hours}h ${minutes}m`;
}

/**
 * Generate share text for book progress
 */
export function generateProgressShareText(progress: BookProgress): string {
  const { book, percentComplete, position, duration } = progress;
  const metadata = book.media?.metadata as any;
  const title = metadata?.title || 'Unknown Title';
  const author = metadata?.authorName || metadata?.authors?.[0]?.name || 'Unknown Author';

  const timeRemaining = duration - position;
  const remainingFormatted = formatShareDuration(timeRemaining);
  const percent = Math.round(percentComplete * 100);

  let text = `I'm ${percent}% through "${title}" by ${author}`;

  if (progress.chaptersCompleted && progress.totalChapters) {
    text += ` (${progress.chaptersCompleted}/${progress.totalChapters} chapters)`;
  }

  text += `\n\n${remainingFormatted} to go!`;
  text += '\n\n#audiobook #reading #audiobookshelf';

  return text;
}

/**
 * Generate share text for completing a book
 */
export function generateCompletedShareText(book: LibraryItem, listenTime?: number): string {
  const metadata = book.media?.metadata as any;
  const title = metadata?.title || 'Unknown Title';
  const author = metadata?.authorName || metadata?.authors?.[0]?.name || 'Unknown Author';

  let text = `Just finished "${title}" by ${author}!`;

  if (listenTime && listenTime > 0) {
    text += `\n\nTotal listening time: ${formatShareDuration(listenTime)}`;
  }

  text += '\n\n#audiobook #bookfinished #audiobookshelf';

  return text;
}

/**
 * Generate share text for weekly stats
 */
export async function generateWeeklyShareText(): Promise<string> {
  const weekly = await sqliteCache.getWeeklyStats();
  const streak = await sqliteCache.getListeningStreak();

  const timeFormatted = formatShareDuration(weekly.totalSeconds);

  let text = `My audiobook week:\n`;
  text += `\n${timeFormatted} listened`;
  text += `\n${weekly.sessionCount} listening sessions`;
  text += `\n${weekly.uniqueBooks} book${weekly.uniqueBooks !== 1 ? 's' : ''}`;

  if (streak.currentStreak > 1) {
    text += `\n${streak.currentStreak} day streak!`;
  }

  text += '\n\n#audiobook #readinggoals #audiobookshelf';

  return text;
}

/**
 * Generate share text for streak milestone
 */
export function generateStreakShareText(streakDays: number): string {
  let text = `${streakDays} day listening streak!`;

  if (streakDays >= 365) {
    text = `One year of daily listening!`;
  } else if (streakDays >= 100) {
    text = `100+ days of listening streak!`;
  } else if (streakDays >= 30) {
    text = `30+ days of listening streak!`;
  } else if (streakDays >= 7) {
    text = `One week of listening streak!`;
  }

  text += '\n\n#audiobook #readingstreak #audiobookshelf';

  return text;
}

/**
 * Generate share text for listening milestone (hours)
 */
export function generateMilestoneShareText(totalHours: number): string {
  let milestone = '';

  if (totalHours >= 1000) {
    milestone = '1,000 hours';
  } else if (totalHours >= 500) {
    milestone = '500 hours';
  } else if (totalHours >= 100) {
    milestone = '100 hours';
  } else if (totalHours >= 50) {
    milestone = '50 hours';
  } else if (totalHours >= 24) {
    milestone = '24 hours (one full day!)';
  } else if (totalHours >= 10) {
    milestone = '10 hours';
  } else {
    milestone = `${Math.round(totalHours)} hours`;
  }

  let text = `I've listened to ${milestone} of audiobooks!`;
  text += '\n\n#audiobook #milestone #audiobookshelf';

  return text;
}

/**
 * Capture a view as an image for sharing
 */
export async function captureShareImage(viewRef: React.RefObject<any>): Promise<string | null> {
  if (!captureRef) {
    console.warn('[ShareService] react-native-view-shot not installed, skipping image capture');
    return null;
  }

  try {
    const uri = await captureRef(viewRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });
    return uri;
  } catch (error) {
    console.error('[ShareService] Failed to capture share image:', error);
    return null;
  }
}

/**
 * Share text with optional image
 */
export async function shareContent(
  text: string,
  imageUri?: string | null
): Promise<boolean> {
  try {
    const shareOptions: { message: string; url?: string } = {
      message: text,
    };

    // On iOS, we can include an image URL directly
    // On Android, react-native-share is better for image sharing, but Share API works for text
    if (imageUri && Platform.OS === 'ios') {
      shareOptions.url = imageUri;
    }

    const result = await Share.share(shareOptions);

    if (result.action === Share.sharedAction) {
      console.log('[ShareService] Shared successfully');
      return true;
    } else if (result.action === Share.dismissedAction) {
      console.log('[ShareService] Share dismissed');
      return false;
    }

    return false;
  } catch (error) {
    console.error('[ShareService] Share failed:', error);
    return false;
  }
}

/**
 * Share book progress
 */
export async function shareProgress(progress: BookProgress): Promise<boolean> {
  const text = generateProgressShareText(progress);
  return shareContent(text);
}

/**
 * Share book completion
 */
export async function shareCompletion(book: LibraryItem, listenTime?: number): Promise<boolean> {
  const text = generateCompletedShareText(book, listenTime);
  return shareContent(text);
}

/**
 * Share weekly stats
 */
export async function shareWeeklyStats(): Promise<boolean> {
  const text = await generateWeeklyShareText();
  return shareContent(text);
}

/**
 * Share streak
 */
export async function shareStreak(streakDays: number): Promise<boolean> {
  const text = generateStreakShareText(streakDays);
  return shareContent(text);
}

/**
 * Share milestone
 */
export async function shareMilestone(totalHours: number): Promise<boolean> {
  const text = generateMilestoneShareText(totalHours);
  return shareContent(text);
}

/**
 * Check if user has reached a shareable milestone
 */
export async function checkForMilestones(): Promise<{
  type: 'hours' | 'streak' | null;
  value: number;
}> {
  try {
    const allTime = await sqliteCache.getAllTimeStats();
    const streak = await sqliteCache.getListeningStreak();

    const totalHours = Math.floor(allTime.totalSeconds / 3600);

    // Check hour milestones (in order of significance)
    const hourMilestones = [1000, 500, 100, 50, 24, 10];
    for (const milestone of hourMilestones) {
      // Simple check - in a real app you'd track which milestones have been shared
      if (totalHours >= milestone && totalHours < milestone + 1) {
        return { type: 'hours', value: totalHours };
      }
    }

    // Check streak milestones
    const streakMilestones = [365, 100, 30, 7];
    for (const milestone of streakMilestones) {
      if (streak.currentStreak === milestone) {
        return { type: 'streak', value: streak.currentStreak };
      }
    }

    return { type: null, value: 0 };
  } catch (error) {
    console.error('[ShareService] Error checking milestones:', error);
    return { type: null, value: 0 };
  }
}
