// File: src/features/player/stores/playerStore.ts
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
  sleepTimer: number | null; // seconds remaining, -1 = end of chapter, null = off
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
  sleepTimer: null,
  sleepTimerInterval: null,
  bookmarks: [],

  loadAudioFile: async (fileIndex: number, startPosition: number = 0) => {
    const { currentBook } = get();
    if (!currentBook) return;

    const audioFiles = currentBook.media.audioFiles || [];
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

      const token = await getAuthToken();
      if (!token) throw new Error('No authentication token found');

      if (!book.media.audioFiles || book.media.audioFiles.length === 0) {
        throw new Error('No audio files found in book');
      }

      let totalDuration = book.media.duration || 0;
      if (totalDuration <= 0) {
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

      set({
        currentBook: book,
        duration: totalDuration,
        position: position,
        currentFileIndex: fileIndex,
        isPlayerVisible: true,
      });

      await get().loadAudioFile(fileIndex, fileStartPosition);
      await get().loadBookmarks();

      set({ isLoading: false });
      progressService.startAutoSync();
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

      const { currentBook, position, duration } = get();
      if (currentBook) {
        await progressService.syncOnPause({
          itemId: currentBook.id,
          currentTime: position,
          duration: duration,
          progress: position / duration,
          isFinished: false,
        });
      }
    } catch (error) {
      console.error('[PlayerStore] Failed to pause:', error);
      throw error;
    }
  },

  seekTo: async (position: number) => {
    const { currentBook, currentFileIndex, duration } = get();
    if (!currentBook) return;

    try {
      const audioFiles = currentBook.media.audioFiles || [];
      
      if (audioFiles.length === 1) {
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
    const { currentBook, currentFileIndex, duration: bookDuration, isPlaying, sleepTimer } = get();
    if (!currentBook) return;

    const audioFiles = currentBook.media.audioFiles || [];
    
    let absolutePosition = state.position;
    for (let i = 0; i < currentFileIndex; i++) {
      absolutePosition += audioFiles[i]?.duration || 0;
    }

    let newDuration = bookDuration;
    if (bookDuration <= 0 && state.duration > 0) {
      if (audioFiles.length === 1) {
        newDuration = state.duration;
      }
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
      const currentChapter = chapters[currentChapterIndex];
      if (currentChapter && absolutePosition >= currentChapter.end - 1) {
        get().pause();
        get().clearSleepTimer();
      }
    }

    // Auto-advance to next file
    const currentFileDuration = audioFiles[currentFileIndex]?.duration || state.duration;
    if (state.position >= currentFileDuration - 0.5 && currentFileIndex < audioFiles.length - 1) {
      get().loadAudioFile(currentFileIndex + 1, 0).then(() => {
        if (isPlaying) get().play();
      });
    }

    // Auto-save progress
    if (currentBook && state.isPlaying && newDuration > 0) {
      progressService.saveProgress({
        itemId: currentBook.id,
        currentTime: absolutePosition,
        duration: newDuration,
        progress: absolutePosition / newDuration,
        isFinished: false,
      });
    }
  },

  setSleepTimer: (minutes: number) => {
    const { sleepTimerInterval } = get();
    
    // Clear existing timer
    if (sleepTimerInterval) {
      clearInterval(sleepTimerInterval);
    }

    if (minutes === -1) {
      // End of chapter mode
      set({ sleepTimer: -1, sleepTimerInterval: null });
      return;
    }

    const seconds = minutes * 60;
    set({ sleepTimer: seconds });

    // Start countdown
    const interval = setInterval(() => {
      const { sleepTimer, isPlaying } = get();
      if (sleepTimer === null || sleepTimer === -1) {
        clearInterval(interval);
        return;
      }

      if (!isPlaying) return; // Don't countdown while paused

      const newTime = sleepTimer - 1;
      if (newTime <= 0) {
        get().pause();
        get().clearSleepTimer();
      } else {
        set({ sleepTimer: newTime });
      }
    }, 1000);

    set({ sleepTimerInterval: interval });
  },

  clearSleepTimer: () => {
    const { sleepTimerInterval } = get();
    if (sleepTimerInterval) {
      clearInterval(sleepTimerInterval);
    }
    set({ sleepTimer: null, sleepTimerInterval: null });
  },

  addBookmark: (bookmark: Bookmark) => {
    const { bookmarks } = get();
    const newBookmarks = [...bookmarks, bookmark];
    set({ bookmarks: newBookmarks });
    AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(newBookmarks));
  },

  removeBookmark: (bookmarkId: string) => {
    const { bookmarks } = get();
    const newBookmarks = bookmarks.filter(b => b.id !== bookmarkId);
    set({ bookmarks: newBookmarks });
    AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(newBookmarks));
  },

  loadBookmarks: async () => {
    try {
      const stored = await AsyncStorage.getItem(BOOKMARKS_KEY);
      if (stored) {
        set({ bookmarks: JSON.parse(stored) });
      }
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
    }
  },

  cleanup: async () => {
    try {
      progressService.stopAutoSync();
      get().clearSleepTimer();

      const { currentBook, position, duration, isPlaying } = get();
      if (currentBook) {
        if (isPlaying) {
          await audioService.pause();
        }

        await progressService.syncOnPause({
          itemId: currentBook.id,
          currentTime: position,
          duration: duration,
          progress: position / duration,
          isFinished: false,
        });
      }

      await audioService.unloadAudio();

      set({
        currentBook: null,
        currentFileIndex: 0,
        isPlaying: false,
        position: 0,
        duration: 0,
        isPlayerVisible: false,
      });
    } catch (error) {
      console.error('[PlayerStore] Failed to cleanup player:', error);
    }
  },
}));