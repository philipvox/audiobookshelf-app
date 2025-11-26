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

async function getVerifiedDownloadPath(bookId: string): Promise<string | null> {
  try {
    const { downloadService } = await import('@/features/downloads');
    
    if (downloadService.isDownloading(bookId)) {
      console.log('[PlayerStore] Book is still downloading');
      return null;
    }
    
    const downloadedBook = await downloadService.getDownloadedBook(bookId);
    if (!downloadedBook?.localAudioPath) {
      return null;
    }

    // Verify file exists and has content
    const FileSystem = await import('expo-file-system/legacy');
    const fileInfo = await FileSystem.getInfoAsync(downloadedBook.localAudioPath);
    
    if (!fileInfo.exists) {
      console.log('[PlayerStore] Downloaded file missing, cleaning up metadata');
      await downloadService.deleteDownload(bookId);
      return null;
    }

    const size = (fileInfo as any).size || 0;
    console.log('[PlayerStore] Download file size:', size, 'bytes');
    
    if (size < 10000) { // Less than 10KB is likely corrupt
      console.log('[PlayerStore] Downloaded file too small, likely corrupt');
      await downloadService.deleteDownload(bookId);
      return null;
    }

    return downloadedBook.localAudioPath;
  } catch (error) {
    console.error('Failed to verify downloaded book:', error);
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
    const { currentBook, isOffline, playbackRate } = get();
    if (!currentBook) return;

    const audioFiles = currentBook.media.audioFiles || [];

    try {
      if (isOffline) {
        const localPath = await getVerifiedDownloadPath(currentBook.id);
        if (localPath) {
          console.log('[PlayerStore] Loading offline audio:', localPath, 'at position:', startPosition);
          await audioService.loadAudio(localPath, startPosition);
          audioService.setStatusUpdateCallback((state) => {
            get().updatePlaybackState(state);
          });
          if (playbackRate !== 1.0) {
            await audioService.setPlaybackRate(playbackRate);
          }
          set({ currentFileIndex: 0 });
          return;
        } else {
          console.log('[PlayerStore] Offline file invalid, falling back to streaming');
          set({ isOffline: false });
        }
      }

      if (fileIndex < 0 || fileIndex >= audioFiles.length) {
        throw new Error(`Invalid file index: ${fileIndex}`);
      }

      const token = await getAuthToken();
      if (!token) throw new Error('No authentication token');

      const serverUrl = apiClient.getBaseURL();
      const audioFile = audioFiles[fileIndex];
      const audioUrl = `${serverUrl}/api/items/${currentBook.id}/file/${audioFile.ino}?token=${token}`;

      console.log('[PlayerStore] Loading streaming audio, file:', fileIndex, 'at position:', startPosition);
      await audioService.loadAudio(audioUrl, startPosition);

      audioService.setStatusUpdateCallback((state) => {
        get().updatePlaybackState(state);
      });

      if (playbackRate !== 1.0) {
        await audioService.setPlaybackRate(playbackRate);
      }

      set({ currentFileIndex: fileIndex });
    } catch (error) {
      console.error('[PlayerStore] Failed to load audio file:', error);
      throw error;
    }
  },

  loadBook: async (book: LibraryItem, startPosition?: number) => {
    const { currentBook, position, isOffline: wasOffline, isPlaying } = get();

    try {
      const isSameBook = currentBook?.id === book.id;
      
      if (isSameBook) {
        console.log('[PlayerStore] Same book - showing player');
        set({ isPlayerVisible: true });
        if (!isPlaying) {
          try {
            await get().play();
          } catch (e) {
            console.log('[PlayerStore] Audio not loaded, will reload');
          }
        }
        return;
      }

      console.log('[PlayerStore] Loading new book:', book.id);
      set({ isLoading: true });

      if (currentBook) {
        const progressData = {
          itemId: currentBook.id,
          currentTime: position,
          duration: get().duration,
          progress: get().duration > 0 ? position / get().duration : 0,
          isFinished: false,
        };
        
        try {
          if (wasOffline) {
            await progressService.saveLocalOnly(progressData);
          } else {
            await progressService.syncOnPause(progressData);
          }
        } catch (e) {
          console.error('[PlayerStore] Failed to save previous book progress:', e);
        }
      }

      try {
        await audioService.unloadAudio();
      } catch (e) {
        // Ignore
      }
      progressService.stopAutoSync();

      // Check if book is downloaded AND valid
      const localPath = await getVerifiedDownloadPath(book.id);
      const shouldBeOffline = !!localPath;

      console.log('[PlayerStore] Book', book.id, 'offline:', shouldBeOffline);

      if (!shouldBeOffline) {
        const token = await getAuthToken();
        if (!token) throw new Error('No authentication token found');
      }

      if (!shouldBeOffline && (!book.media.audioFiles || book.media.audioFiles.length === 0)) {
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

      let targetPosition = startPosition;
      if (targetPosition === undefined) {
        const localProgress = await progressService.getLocalProgress(book.id);
        const serverProgress = book.userMediaProgress?.currentTime || 0;
        targetPosition = Math.max(localProgress, serverProgress);
      }

      if (totalDuration > 0 && targetPosition >= totalDuration) {
        console.log('[PlayerStore] Position exceeds duration, resetting to 0');
        targetPosition = 0;
      }
      if (targetPosition < 0) {
        targetPosition = 0;
      }

      console.log('[PlayerStore] Starting at position:', targetPosition, 'duration:', totalDuration);

      let fileIndex = 0;
      let fileStartPosition = targetPosition;

      if (!shouldBeOffline && book.media.audioFiles && book.media.audioFiles.length > 1) {
        let accumulatedDuration = 0;
        for (let i = 0; i < book.media.audioFiles.length; i++) {
          const fileDuration = book.media.audioFiles[i].duration || 0;
          if (targetPosition < accumulatedDuration + fileDuration) {
            fileIndex = i;
            fileStartPosition = targetPosition - accumulatedDuration;
            break;
          }
          accumulatedDuration += fileDuration;
        }
      }

      set({
        currentBook: book,
        duration: totalDuration,
        position: targetPosition,
        currentFileIndex: fileIndex,
        isPlayerVisible: true,
        isOffline: shouldBeOffline,
        isPlaying: false,
        isBuffering: false,
      });

      await get().loadAudioFile(fileIndex, fileStartPosition);
      await get().loadBookmarks();

      set({ isLoading: false });

      if (!shouldBeOffline) {
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
      if (!currentBook) return;

      const progressData = {
        itemId: currentBook.id,
        currentTime: position,
        duration: duration,
        progress: duration > 0 ? position / duration : 0,
        isFinished: false,
      };

      if (isOffline) {
        await progressService.saveLocalOnly(progressData);
      } else {
        await progressService.syncOnPause(progressData);
      }
    } catch (error) {
      console.error('[PlayerStore] Failed to pause:', error);
      throw error;
    }
  },

  seekTo: async (position: number) => {
    const { currentBook, currentFileIndex, isOffline, duration } = get();
    if (!currentBook) return;

    const clampedPosition = Math.max(0, Math.min(position, duration));

    try {
      const audioFiles = currentBook.media.audioFiles || [];

      if (isOffline || audioFiles.length <= 1) {
        await audioService.seekTo(clampedPosition);
        set({ position: clampedPosition });

        const progressData = {
          itemId: currentBook.id,
          currentTime: clampedPosition,
          duration: duration,
          progress: duration > 0 ? clampedPosition / duration : 0,
          isFinished: false,
        };

        if (isOffline) {
          await progressService.saveLocalOnly(progressData);
        } else {
          await progressService.saveProgress(progressData);
        }
        return;
      }

      let accumulatedDuration = 0;
      for (let i = 0; i < audioFiles.length; i++) {
        const fileDuration = audioFiles[i].duration || 0;
        if (clampedPosition < accumulatedDuration + fileDuration) {
          const filePosition = clampedPosition - accumulatedDuration;

          if (i === currentFileIndex) {
            await audioService.seekTo(filePosition);
          } else {
            await get().loadAudioFile(i, filePosition);
          }

          set({ position: clampedPosition });
          return;
        }
        accumulatedDuration += fileDuration;
      }
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
    if (!currentBook?.media.chapters) return;

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
    const { currentBook, currentFileIndex, sleepTimer, duration: bookDuration } = get();
    if (!currentBook) return;

    const audioFiles = currentBook.media.audioFiles || [];

    let absolutePosition = state.position;
    if (!get().isOffline && audioFiles.length > 1) {
      absolutePosition = 0;
      for (let i = 0; i < currentFileIndex; i++) {
        absolutePosition += audioFiles[i]?.duration || 0;
      }
      absolutePosition += state.position;
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

    if (sleepTimer === -1 && state.isPlaying) {
      const chapters = currentBook.media.chapters || [];
      const currentChapterIndex = chapters.findIndex(
        (ch, idx) =>
          absolutePosition >= ch.start &&
          (idx === chapters.length - 1 || absolutePosition < chapters[idx + 1].start)
      );

      if (currentChapterIndex >= 0) {
        const currentChapter = chapters[currentChapterIndex];
        const chapterEnd =
          currentChapter.end || chapters[currentChapterIndex + 1]?.start || newDuration;

        if (absolutePosition >= chapterEnd - 2) {
          get().pause();
          get().clearSleepTimer();
        }
      }
    }
  },

  cleanup: async () => {
    const { currentBook, position, duration, isOffline } = get();

    get().clearSleepTimer();

    if (currentBook) {
      const progressData = {
        itemId: currentBook.id,
        currentTime: position,
        duration: duration,
        progress: duration > 0 ? position / duration : 0,
        isFinished: false,
      };

      if (isOffline) {
        await progressService.saveLocalOnly(progressData);
      } else {
        await progressService.syncOnPause(progressData);
      }
    }

    progressService.stopAutoSync();
    await audioService.unloadAudio();

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
      AsyncStorage.setItem(`${BOOKMARKS_KEY}_${currentBook.id}`, JSON.stringify(newBookmarks));
    }
  },

  removeBookmark: (bookmarkId: string) => {
    const { bookmarks, currentBook } = get();
    const newBookmarks = bookmarks.filter((b) => b.id !== bookmarkId);
    set({ bookmarks: newBookmarks });

    if (currentBook) {
      AsyncStorage.setItem(`${BOOKMARKS_KEY}_${currentBook.id}`, JSON.stringify(newBookmarks));
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