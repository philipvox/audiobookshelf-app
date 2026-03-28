// Re-export from shared location for backward compatibility
export {
  findChapterForPosition,
  getChapterStartPosition,
  getNextChapterIndex,
  getPreviousChapterIndex,
  getChapterProgress,
  getChapterTimeRemaining,
  getRemainingChaptersCount,
  getChapterAtIndex,
  getChapterDuration,
  findNearestChapterStart,
  type ChapterInfo,
} from '@/shared/utils/chapters/chapterNavigator';
