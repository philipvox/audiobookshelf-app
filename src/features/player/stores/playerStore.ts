/**
 * src/features/player/stores/playerStore.ts
 */

import { create } from 'zustand';
import { LibraryItem } from '@/core/types';
import { audioService, PlaybackState } from '../services/audioService';
import { progressService } from '../services/progressService';
import { apiClient } from '@/core/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Bookmark {
  id: string;
  title: string;
  time: number;
  createdAt: number;
}

interface PlayerState {
  currentBook: LibraryItem | null;
  currentFileIndex: number;
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
  togglePlayer: () => void;
  closePlayer: () => void;
  updatePlaybackState: (state: PlaybackState) => void;
  cleanup: () => Promise<void>;
  loadAudioFile: (fileIndex: number, startPosition?: number) => Promise<void>;
  setSleepTimer: (minutes: number) => void;
  clearSleepTimer: () => void;
  addBookmark: (bookmark: Bookmark) => void;
  removeBookmark: (bookmarkId: string) => void;
  loadBookmarks: () => Promise<void>;
}

const BOOKMARKS_KEY = 'player_bookmarks';

async function getAuthToken(): Promise<string | null> {
  try {
    const { authService } = await import('@/core/auth');
    return await authService.getStoredToken();
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
}

async function getDownloadedBookPath(bookId: string): Promise<string | null> {
  try {
    const { downloadService } = await import('@/features/downloads');
    const downloadedBook = await downloadService.getDownloadedBook(bookId);
    return downloadedBook?.localAudioPath || null;
  } catch (error) {
    console.error('Failed to check for downloaded book:', error);
    return null;
  }
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentBook: null,
  currentFileIndex: 0,
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

  loadAudioFile: async (fileIndex: number, startPosition: number = 0) => {
    const { currentBook, isOffline } = get();
    if (!currentBook) return;

    const audioFiles = currentBook.media.audioFiles || [];
    
    // For offline playback with single downloaded file
    if (isOffline) {
      const localPath = await getDownloadedBookPath(currentBook.id);
      if (localPath) {
        await audioService.loadAudio(localPath, startPosition);
        audioService.setStatusUpdateCallback((state) => {
          get().updatePlaybackState(state);
        });
        set({ currentFileIndex: 0 });
        return;
      }
    }

    if (fileIndex < 0 || fileIndex >= audioFiles.length) return;

    const token = await getAuthToken();
    if (!token) throw new Error('No authentication token');

    const serverUrl = apiClient.getBaseURL();
    const audioFile = audioFiles[fileIndex];
    const audioUrl = `${serverUrl}/api/items/${currentBook.id}/file/${audioFile.ino}?token=${token}`;

    await audioService.loadAudio(audioUrl, startPosition);
    
    audioService.setStatusUpdateCallback((state) => {
      get().updatePlaybackState(state);
    });

    set({ currentFileIndex: fileIndex });
  },

  loadBook: async (book: LibraryItem, startPosition?: number) => {
    try {
      set({ isLoading: true });

      // Check if book is downloaded for offline playback
      const localPath = await getDownloadedBookPath(book.id);
      const isOffline = !!localPath;

      // Only require token for online playback
      if (!isOffline) {
        const token = await getAuthToken();
        if (!token) throw new Error('No authentication token found');
      }

      // For online playback, require audio files
      if (!isOffline && (!book.media.audioFiles || book.media.audioFiles.length === 0)) {
        throw new Error('No audio files found in book');
      }

      let totalDuration = book.media.duration || 0;
      if (totalDuration <= 0 && book.media.audioFiles) {
        totalDuration = book.media.audioFiles.reduce((sum, f) => sum + (f.duration || 0), 0);
      }
      if (totalDuration <= 0 && book.media.chapters?.length) {
        const lastChapter = book.media.chapters[book.media.chapters.length - 1];
        totalDuration = lastChapter.end || 0;
      }

      let position = startPosition;
      if (position === undefined) {
        const savedPosition = await progressService.getLocalProgress(book.id);
        position = savedPosition || book.userMediaProgress?.currentTime || 0;
      }

      let fileIndex = 0;
      let fileStartPosition = position;

      // For online playback, calculate which file to start from
      if (!isOffline && book.media.audioFiles) {
        let accumulatedDuration = 0;
        for (let i = 0; i < book.media.audioFiles.length; i++) {
          const fileDuration = book.media.audioFiles[i].duration || 0;
          if (position < accumulatedDuration + fileDuration) {
            fileIndex = i;
            fileStartPosition = position - accumulatedDuration;
            break;
          }
          accumulatedDuration += fileDuration;
        }
      } else {
        // For offline, single file - use position directly
        fileStartPosition = position;
      }

      set({
        currentBook: book,
        duration: totalDuration,
        position: position,
        currentFileIndex: fileIndex,
        isPlayerVisible: true,
        isOffline,
      });

      await get().loadAudioFile(fileIndex, fileStartPosition);
      await get().loadBookmarks();

      set({ isLoading: false });
      
      // Only start auto-sync if online
      if (!isOffline) {
        progressService.startAutoSync();
      }
      
      await get().play();
    } catch (error) {
      console.error('[PlayerStore] Failed to load book:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  play: async () => {
    try {
      await audioService.play();
      set({ isPlaying: true });
    } catch (error) {
      console.error('[PlayerStore] Failed to play:', error);
      throw error;
    }
  },

  pause: async () => {
    try {
      await audioService.pause();
      set({ isPlaying: false });

      const { currentBook, position, duration, isOffline } = get();
      if (currentBook && !isOffline) {
        await progressService.syncOnPause({
          itemId: currentBook.id,
          currentTime: position,
          duration: duration,
          progress: position / duration,
          isFinished: false,
        });
      }
      
      // Save local progress regardless of online status
      if (currentBook) {
        await AsyncStorage.setItem(`progress_${currentBook.id}`, String(position));
      }
    } catch (error) {
      console.error('[PlayerStore] Failed to pause:', error);
      throw error;
    }
  },

  seekTo: async (position: number) => {
    const { currentBook, currentFileIndex, isOffline } = get();
    if (!currentBook) return;

    try {
      const audioFiles = currentBook.media.audioFiles || [];
      
      // For offline or single file, seek directly
      if (isOffline || audioFiles.length <= 1) {
        await audioService.seekTo(position);
        set({ position });
        return;
      }

      let accumulatedDuration = 0;
      for (let i = 0; i < audioFiles.length; i++) {
        const fileDuration = audioFiles[i].duration || 0;
        if (position < accumulatedDuration + fileDuration) {
          const filePosition = position - accumulatedDuration;
          
          if (i === currentFileIndex) {
            await audioService.seekTo(filePosition);
          } else {
            await get().loadAudioFile(i, filePosition);
            await get().play();
          }
          set({ position });
          return;
        }
        accumulatedDuration += fileDuration;
      }

      set({ position });
    } catch (error) {
      console.error('[PlayerStore] Failed to seek:', error);
      throw error;
    }
  },

  skipForward: async (seconds: number = 30) => {
    const { position, duration } = get();
    const newPosition = Math.min(position + seconds, duration);
    await get().seekTo(newPosition);
  },

  skipBackward: async (seconds: number = 30) => {
    const { position } = get();
    const newPosition = Math.max(position - seconds, 0);
    await get().seekTo(newPosition);
  },

  setPlaybackRate: async (rate: number) => {
    try {
      await audioService.setPlaybackRate(rate);
      set({ playbackRate: rate });
    } catch (error) {
      console.error('[PlayerStore] Failed to set playback rate:', error);
      throw error;
    }
  },

  jumpToChapter: async (chapterIndex: number) => {
    const { currentBook } = get();
    if (!currentBook || !currentBook.media.chapters) return;

    const chapter = currentBook.media.chapters[chapterIndex];
    if (chapter) {
      await get().seekTo(chapter.start);
    }
  },

  togglePlayer: () => {
    set((state) => ({ isPlayerVisible: !state.isPlayerVisible }));
  },

  closePlayer: () => {
    set({ isPlayerVisible: false });
  },

  updatePlaybackState: (state: PlaybackState) => {
    const { currentBook, currentFileIndex, duration: bookDuration, isPlaying, sleepTimer, isOffline } = get();
    if (!currentBook) return;

    const audioFiles = currentBook.media.audioFiles || [];
    
    let absolutePosition = state.position;
    
    // For online multi-file playback, calculate absolute position
    if (!isOffline && audioFiles.length > 1) {
      for (let i = 0; i < currentFileIndex; i++) {
        absolutePosition += audioFiles[i]?.duration || 0;
      }
    }

    let newDuration = bookDuration;
    if (bookDuration <= 0 && state.duration > 0) {
      newDuration = state.duration;
    }

    set({
      isPlaying: state.isPlaying,
      position: absolutePosition,
      duration: newDuration,
      isBuffering: state.isBuffering,
    });

    // Check end of chapter for sleep timer
    if (sleepTimer === -1 && state.isPlaying) {
      const chapters = currentBook.media.chapters || [];
      const currentChapterIndex = chapters.findIndex(
        (ch, idx) =>
          absolutePosition >= ch.start &&
          (idx === chapters.length - 1 || absolutePosition < chapters[idx + 1].start)
      );
      
      if (currentChapterIndex >= 0) {
        const currentChapter = chapters[currentChapterIndex];
        const chapterEnd = currentChapter.end || chapters[currentChapterIndex + 1]?.start || newDuration;
        
        if (absolutePosition >= chapterEnd - 2) {
          get().pause();
          get().clearSleepTimer();
        }
      }
    }
  },

  cleanup: async () => {
    const { currentBook, position, isOffline } = get();
    
    get().clearSleepTimer();
    
    if (currentBook && !isOffline) {
      await progressService.syncOnPause({
        itemId: currentBook.id,
        currentTime: position,
        duration: get().duration,
        progress: position / get().duration,
        isFinished: false,
      });
    }
    
    // Save local progress regardless
    if (currentBook) {
      await AsyncStorage.setItem(`progress_${currentBook.id}`, String(position));
    }
    
    progressService.stopAutoSync();
    await audioService.cleanup();
    
    set({
      currentBook: null,
      isPlaying: false,
      position: 0,
      duration: 0,
      isPlayerVisible: false,
      isOffline: false,
      bookmarks: [],
    });
  },

  setSleepTimer: (minutes: number) => {
    const { sleepTimerInterval } = get();
    
    if (sleepTimerInterval) {
      clearInterval(sleepTimerInterval);
    }

    if (minutes === -1) {
      set({ sleepTimer: -1, sleepTimerInterval: null });
      return;
    }

    const seconds = minutes * 60;
    
    const interval = setInterval(() => {
      const { sleepTimer, isPlaying } = get();
      
      if (sleepTimer === null || sleepTimer === -1) {
        clearInterval(interval);
        return;
      }
      
      if (!isPlaying) return;
      
      const newTime = sleepTimer - 1;
      
      if (newTime <= 0) {
        get().pause();
        get().clearSleepTimer();
      } else {
        set({ sleepTimer: newTime });
      }
    }, 1000);

    set({ sleepTimer: seconds, sleepTimerInterval: interval });
  },

  clearSleepTimer: () => {
    const { sleepTimerInterval } = get();
    if (sleepTimerInterval) {
      clearInterval(sleepTimerInterval);
    }
    set({ sleepTimer: null, sleepTimerInterval: null });
  },

  addBookmark: (bookmark: Bookmark) => {
    const { bookmarks, currentBook } = get();
    const newBookmarks = [...bookmarks, bookmark];
    set({ bookmarks: newBookmarks });
    
    if (currentBook) {
      AsyncStorage.setItem(
        `${BOOKMARKS_KEY}_${currentBook.id}`,
        JSON.stringify(newBookmarks)
      );
    }
  },

  removeBookmark: (bookmarkId: string) => {
    const { bookmarks, currentBook } = get();
    const newBookmarks = bookmarks.filter((b) => b.id !== bookmarkId);
    set({ bookmarks: newBookmarks });
    
    if (currentBook) {
      AsyncStorage.setItem(
        `${BOOKMARKS_KEY}_${currentBook.id}`,
        JSON.stringify(newBookmarks)
      );
    }
  },

  loadBookmarks: async () => {
    const { currentBook } = get();
    if (!currentBook) return;

    try {
      const stored = await AsyncStorage.getItem(`${BOOKMARKS_KEY}_${currentBook.id}`);
      if (stored) {
        set({ bookmarks: JSON.parse(stored) });
      } else {
        set({ bookmarks: [] });
      }
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
      set({ bookmarks: [] });
    }
  },
}));