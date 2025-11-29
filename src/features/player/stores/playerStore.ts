/**
 * src/features/player/stores/playerStore.ts
 * 
 * Player store using session-based streaming API
 * Updated to use autoDownloadService for offline playback
 */

import { create } from 'zustand';
import { LibraryItem } from '@/core/types';
import { audioService, PlaybackState } from '../services/audioService';
import { sessionService, SessionChapter } from '../services/sessionService';
import { progressService } from '../services/progressService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEBUG = true;
const log = (msg: string, ...args: any[]) => {
  if (DEBUG) console.log(`[Player] ${msg}`, ...args);
};
const logError = (msg: string, ...args: any[]) => {
  console.error(`[Player] ❌ ${msg}`, ...args);
};

export interface Chapter {
  id: number;
  start: number;
  end: number;
  title: string;
}

interface Bookmark {
  id: string;
  title: string;
  time: number;
  createdAt: number;
}

interface PlayerState {
  currentBook: LibraryItem | null;
  chapters: Chapter[];
  isPlaying: boolean;
  isLoading: boolean;
  position: number;
  duration: number;
  playbackRate: number;
  isBuffering: boolean;
  isPlayerVisible: boolean;
  isOffline: boolean;
  sleepTimer: number | null;
  sleepTimerInterval: NodeJS.Timeout | null;
  bookmarks: Bookmark[];

  loadBook: (book: LibraryItem, startPosition?: number) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  skipForward: (seconds?: number) => Promise<void>;
  skipBackward: (seconds?: number) => Promise<void>;
  setPlaybackRate: (rate: number) => Promise<void>;
  jumpToChapter: (chapterIndex: number) => Promise<void>;
  nextChapter: () => Promise<void>;
  prevChapter: () => Promise<void>;
  getCurrentChapter: () => Chapter | null;
  togglePlayer: () => void;
  closePlayer: () => void;
  updatePlaybackState: (state: PlaybackState) => void;
  cleanup: () => Promise<void>;
  setSleepTimer: (minutes: number) => void;
  clearSleepTimer: () => void;
  addBookmark: (bookmark: Bookmark) => void;
  removeBookmark: (bookmarkId: string) => void;
  loadBookmarks: () => Promise<void>;
}

const BOOKMARKS_KEY = 'player_bookmarks';
let currentLoadId = 0;

async function getDownloadPath(bookId: string): Promise<string | null> {
  try {
    // Use autoDownloadService instead of old downloadService
    const { autoDownloadService } = await import('@/features/downloads');
    
    // Check if still downloading
    if (autoDownloadService.isDownloading(bookId)) {
      log('Book still downloading');
      return null;
    }
    
    // Get local path from autoDownloadService
    const localPath = autoDownloadService.getLocalPath(bookId);
    if (!localPath) return null;

    // Verify file exists
    const FileSystem = await import('expo-file-system/legacy');
    const info = await FileSystem.getInfoAsync(localPath);
    
    if (!info.exists || ((info as any).size || 0) < 10000) {
      log('Downloaded file missing or corrupt, cleaning up');
      await autoDownloadService.removeDownload(bookId);
      return null;
    }

    // Update last played timestamp
    autoDownloadService.updateLastPlayed(bookId);

    return localPath;
  } catch (error) {
    logError('Failed to verify download:', error);
    return null;
  }
}

function mapSessionChapters(sessionChapters: SessionChapter[]): Chapter[] {
  return sessionChapters.map((ch, i) => ({
    id: i,
    start: ch.start,
    end: ch.end,
    title: ch.title || `Chapter ${i + 1}`,
  }));
}

function extractChaptersFromBook(book: LibraryItem): Chapter[] {
  const bookChapters = book.media?.chapters;
  if (!bookChapters?.length) return [];
  
  return bookChapters.map((ch, i) => ({
    id: i,
    start: ch.start || 0,
    end: ch.end || bookChapters[i + 1]?.start || book.media?.duration || 0,
    title: ch.title || `Chapter ${i + 1}`,
  }));
}

function getBookDuration(book: LibraryItem): number {
  if (book.media?.duration && book.media.duration > 0) {
    return book.media.duration;
  }
  
  if (book.media?.audioFiles?.length) {
    const sum = book.media.audioFiles.reduce((acc, f) => acc + (f.duration || 0), 0);
    if (sum > 0) return sum;
  }
  
  const chapters = book.media?.chapters;
  if (chapters?.length) {
    const last = chapters[chapters.length - 1];
    if (last.end && last.end > 0) return last.end;
  }
  
  return 0;
}

function findChapterIndex(chapters: Chapter[], position: number): number {
  for (let i = chapters.length - 1; i >= 0; i--) {
    if (position >= chapters[i].start) {
      return i;
    }
  }
  return 0;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentBook: null,
  chapters: [],
  isPlaying: false,
  isLoading: false,
  position: 0,
  duration: 0,
  playbackRate: 1.0,
  isBuffering: false,
  isPlayerVisible: false,
  isOffline: false,
  sleepTimer: null,
  sleepTimerInterval: null,
  bookmarks: [],

  loadBook: async (book: LibraryItem, startPosition?: number) => {
    const { currentBook, position: prevPosition, isOffline: wasOffline } = get();
    
    const thisLoadId = ++currentLoadId;
    
    log('=== loadBook ===');
    log('Book:', book.id, '-', book.media?.metadata?.title);

    // Same book already loaded?
    if (currentBook?.id === book.id && audioService.getIsLoaded()) {
      log('Same book already loaded');
      set({ isPlayerVisible: true });
      if (!get().isPlaying) {
        await get().play();
      }
      return;
    }

    set({ isLoading: true, isPlayerVisible: true });

    try {
      // Save progress for previous book
      if (currentBook && currentBook.id !== book.id && prevPosition > 0) {
        log('Saving progress for previous book');
        if (wasOffline) {
          progressService.saveLocalOnly({
            itemId: currentBook.id,
            currentTime: prevPosition,
            duration: get().duration,
            progress: get().duration > 0 ? prevPosition / get().duration : 0,
            isFinished: false,
          }).catch(() => {});
        } else {
          await sessionService.syncProgress(prevPosition);
        }
      }

      // Release previous audio
      await audioService.unloadAudio();

      if (thisLoadId !== currentLoadId) {
        log('Load cancelled - newer load started');
        return;
      }

      // Check for offline download
      const localPath = await getDownloadPath(book.id);
      const isOffline = !!localPath;
      log('Offline mode:', isOffline);

      let streamUrl: string;
      let chapters: Chapter[] = [];
      let resumePosition = startPosition ?? 0;
      let totalDuration = getBookDuration(book);

      if (isOffline && localPath) {
        // OFFLINE PLAYBACK - use local file
        streamUrl = localPath;
        chapters = extractChaptersFromBook(book);
        log('Using offline path:', localPath);
        
        // Get local progress for offline playback
        if (!startPosition) {
          const localProgress = await progressService.getLocalProgress(book.id);
          if (localProgress && localProgress.currentTime > 0) {
            resumePosition = localProgress.currentTime;
            log('Resuming from local progress:', resumePosition);
          }
        }
      } else {
        // ONLINE PLAYBACK - use session API
        log('Starting playback session...');
        
        const session = await sessionService.startSession(book.id);

        if (thisLoadId !== currentLoadId) {
          log('Load cancelled after session start');
          return;
        }

        const url = sessionService.getStreamUrl();
        if (!url) {
          throw new Error('No stream URL from session');
        }
        streamUrl = url;

        // Use chapters from session
        chapters = mapSessionChapters(session.chapters || []);
        
        // Use duration from session
        if (session.duration > 0) {
          totalDuration = session.duration;
        }

        // Use server's resume position if we don't have one
        if (!startPosition && session.currentTime > 0) {
          resumePosition = session.currentTime;
          log('Resuming from server position:', resumePosition);
        }

        // Start auto-sync
        sessionService.startAutoSync(() => get().position);
      }

      // Set state before loading audio
      set({
        currentBook: book,
        chapters,
        duration: totalDuration,
        position: resumePosition,
        isOffline,
        isPlaying: false,
        isBuffering: false,
      });

      if (thisLoadId !== currentLoadId) {
        log('Load cancelled before audio load');
        return;
      }

      // Load audio
      log('Loading audio from:', streamUrl.substring(0, 80) + '...');
      await audioService.loadAudio(streamUrl, resumePosition);

      if (thisLoadId !== currentLoadId) {
        log('Load cancelled after audio load');
        return;
      }

      // Set up status callback
      audioService.setStatusUpdateCallback((state) => {
        get().updatePlaybackState(state);
      });

      // Apply playback rate
      const { playbackRate } = get();
      if (playbackRate !== 1.0) {
        await audioService.setPlaybackRate(playbackRate);
      }

      // Load bookmarks
      await get().loadBookmarks();

      set({ isLoading: false });

      // Auto-play
      log('Starting playback');
      await get().play();

    } catch (error: any) {
      if (thisLoadId === currentLoadId) {
        logError('Failed to load book:', error.message);
        set({ isLoading: false });
      }
      throw error;
    }
  },

  play: async () => {
    if (!audioService.getIsLoaded()) {
      logError('Cannot play - no audio loaded');
      throw new Error('No audio loaded');
    }
    await audioService.play();
    set({ isPlaying: true });
  },

  pause: async () => {
    await audioService.pause();
    set({ isPlaying: false });

    const { currentBook, position, duration, isOffline } = get();
    if (!currentBook) return;

    // Sync progress on pause
    if (isOffline) {
      progressService.saveLocalOnly({
        itemId: currentBook.id,
        currentTime: position,
        duration,
        progress: duration > 0 ? position / duration : 0,
        isFinished: false,
      }).catch(() => {});
    } else {
      sessionService.syncProgress(position).catch(() => {});
    }
  },

  seekTo: async (position: number) => {
    await audioService.seekTo(position);
    set({ position });
  },

  skipForward: async (seconds = 30) => {
    const { position, duration } = get();
    const newPosition = Math.min(position + seconds, duration);
    await audioService.seekTo(newPosition);
    set({ position: newPosition });
  },

  skipBackward: async (seconds = 30) => {
    const { position } = get();
    const newPosition = Math.max(position - seconds, 0);
    await audioService.seekTo(newPosition);
    set({ position: newPosition });
  },

  setPlaybackRate: async (rate: number) => {
    await audioService.setPlaybackRate(rate);
    set({ playbackRate: rate });
    
    try {
      await AsyncStorage.setItem('playbackRate', rate.toString());
    } catch {}
  },

  jumpToChapter: async (chapterIndex: number) => {
    const { chapters } = get();
    if (chapterIndex >= 0 && chapterIndex < chapters.length) {
      const chapter = chapters[chapterIndex];
      await audioService.seekTo(chapter.start);
      set({ position: chapter.start });
    }
  },

  nextChapter: async () => {
    const { chapters, position } = get();
    const currentIndex = findChapterIndex(chapters, position);
    if (currentIndex < chapters.length - 1) {
      await get().jumpToChapter(currentIndex + 1);
    }
  },

  prevChapter: async () => {
    const { chapters, position } = get();
    const currentIndex = findChapterIndex(chapters, position);
    const currentChapter = chapters[currentIndex];
    
    // If more than 3 seconds into chapter, go to start of current chapter
    if (currentChapter && position - currentChapter.start > 3) {
      await get().jumpToChapter(currentIndex);
    } else if (currentIndex > 0) {
      await get().jumpToChapter(currentIndex - 1);
    }
  },

  getCurrentChapter: () => {
    const { chapters, position } = get();
    const index = findChapterIndex(chapters, position);
    return chapters[index] || null;
  },

  togglePlayer: () => {
    set((state) => ({ isPlayerVisible: !state.isPlayerVisible }));
  },

  closePlayer: () => {
    set({ isPlayerVisible: false });
  },

  updatePlaybackState: (state: PlaybackState) => {
    const { duration: storeDuration } = get();

    set({
      isPlaying: state.isPlaying,
      position: state.position,
      duration: state.duration > 0 ? state.duration : storeDuration,
      isBuffering: state.isBuffering,
    });

    // Handle track finished
    if ((state as any).didJustFinish) {
      log('Track finished');
      set({ isPlaying: false });
    }
  },

  cleanup: async () => {
    const { position, isOffline, sleepTimerInterval } = get();

    // Clear sleep timer
    if (sleepTimerInterval) {
      clearInterval(sleepTimerInterval);
    }

    // Final sync
    if (!isOffline) {
      await sessionService.closeSession(position);
    }

    // Release audio
    await audioService.unloadAudio();

    set({
      currentBook: null,
      chapters: [],
      isPlaying: false,
      position: 0,
      duration: 0,
      isPlayerVisible: false,
      sleepTimer: null,
      sleepTimerInterval: null,
      bookmarks: [],
    });
  },

  setSleepTimer: (minutes: number) => {
    const { sleepTimerInterval } = get();

    if (sleepTimerInterval) {
      clearInterval(sleepTimerInterval);
    }

    const endTime = Date.now() + minutes * 60 * 1000;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      
      if (remaining <= 0) {
        clearInterval(interval);
        get().pause();
        set({ sleepTimer: null, sleepTimerInterval: null });
      } else {
        set({ sleepTimer: remaining });
      }
    }, 1000);

    set({ sleepTimer: minutes * 60, sleepTimerInterval: interval });
  },

  clearSleepTimer: () => {
    const { sleepTimerInterval } = get();
    if (sleepTimerInterval) {
      clearInterval(sleepTimerInterval);
    }
    set({ sleepTimer: null, sleepTimerInterval: null });
  },

  addBookmark: (bookmark: Bookmark) => {
    const { currentBook, bookmarks } = get();
    if (!currentBook) return;

    const updated = [...bookmarks, bookmark];
    set({ bookmarks: updated });

    AsyncStorage.setItem(
      `${BOOKMARKS_KEY}_${currentBook.id}`,
      JSON.stringify(updated)
    ).catch(() => {});
  },

  removeBookmark: (bookmarkId: string) => {
    const { currentBook, bookmarks } = get();
    if (!currentBook) return;

    const updated = bookmarks.filter((b) => b.id !== bookmarkId);
    set({ bookmarks: updated });

    AsyncStorage.setItem(
      `${BOOKMARKS_KEY}_${currentBook.id}`,
      JSON.stringify(updated)
    ).catch(() => {});
  },

  loadBookmarks: async () => {
    const { currentBook } = get();
    if (!currentBook) return;

    try {
      const data = await AsyncStorage.getItem(`${BOOKMARKS_KEY}_${currentBook.id}`);
      if (data) {
        set({ bookmarks: JSON.parse(data) });
      } else {
        set({ bookmarks: [] });
      }
    } catch {
      set({ bookmarks: [] });
    }
  },
}));