# Edit Specification: Pattern Consolidation

**Covers Action Plan Items:** 2.15, 2.16, 2.17, 2.18, 2.20, 2.21, 2.22, 2.23, 2.24
**Priority:** High (Phase 2)
**Effort:** M (Medium) - 2-3 days

---

## Current State

Based on [31] Alignment Audit, several patterns are duplicated across screens:

### Kid Mode Filtering (4 implementations)
- `HomeScreen` via `useHomeData.ts:55`
- `DiscoverTab` via `useDiscoverData.ts:144`
- `SearchScreen.tsx:232`
- `MyLibraryScreen.tsx:394`

### Continue Listening (3 implementations)
- `useContinueListening` hook
- `useDiscoverData` inProgressItems
- `MyLibraryScreen` in-progress tab

### Download Status (3 ways to check)
- `useDownloadStatus(itemId)`
- `useIsOfflineAvailable(itemId)`
- `downloadManager.isDownloaded(itemId)`

### Series Progress (2 implementations)
- `MyLibraryScreen` calculates series completion
- `SeriesDetailScreen` calculates books read/total

### Swipe Gestures (3 implementations)
- `SwipeableBookCard` in discover (threshold: 80px)
- `MarkBooksScreen` swipe gestures
- `DownloadsScreen` swipe-to-delete

### Empty States (inconsistent)
- Different props across screens
- Some have CTAs, some don't

---

## Issues Identified

| Issue | Source | Severity |
|-------|--------|----------|
| 4 Kid Mode filter implementations | [31] A1, §1.1 | Medium |
| 3 continue listening implementations | [31] §2.2 | Medium |
| 3 download status check patterns | [31] §2.3 | Low |
| 2 series progress calculations | [31] §2.4 | Low |
| 3 swipe gesture implementations | [31] A3, §1.4 | Low |
| Inconsistent EmptyState API | [30] #9, [31] A4 | Low |
| Favorites split across stores | [31] A2, §1.3 | Low |
| Progress storage in 3 places | [31] §4.1 | Medium |
| 3 ways to check finished books | [31] §4.2 | Medium |

---

## Specific Changes

### 2.15: Create useFilteredLibrary Hook

**New file:** `src/shared/hooks/useFilteredLibrary.ts`

```typescript
import { useMemo } from 'react';
import { LibraryItem } from '@/core/types';
import { useKidModeStore } from '@/shared/stores/kidModeStore';
import { isKidFriendly } from '@/shared/utils/kidModeFilter';

interface UseFilteredLibraryOptions {
  items: LibraryItem[];
  additionalFilters?: ((item: LibraryItem) => boolean)[];
}

interface UseFilteredLibraryReturn {
  filteredItems: LibraryItem[];
  isKidModeEnabled: boolean;
  totalCount: number;
  filteredCount: number;
}

export function useFilteredLibrary({
  items,
  additionalFilters = [],
}: UseFilteredLibraryOptions): UseFilteredLibraryReturn {
  const { isEnabled: isKidModeEnabled, settings } = useKidModeStore();

  const filteredItems = useMemo(() => {
    let result = items;

    // Apply Kid Mode filter
    if (isKidModeEnabled) {
      result = result.filter(item => isKidFriendly(item, settings));
    }

    // Apply additional filters
    for (const filter of additionalFilters) {
      result = result.filter(filter);
    }

    return result;
  }, [items, isKidModeEnabled, settings, additionalFilters]);

  return {
    filteredItems,
    isKidModeEnabled,
    totalCount: items.length,
    filteredCount: filteredItems.length,
  };
}
```

**Update consumers:**
```typescript
// Before (in HomeScreen)
const { isEnabled: kidModeEnabled } = useKidModeStore();
const filtered = kidModeEnabled ? items.filter(isKidFriendly) : items;

// After
const { filteredItems } = useFilteredLibrary({ items });
```

### 2.17: Create useSwipeGesture Hook

**New file:** `src/shared/hooks/useSwipeGesture.ts`

```typescript
import { useCallback, useRef } from 'react';
import { Animated, PanResponder, PanResponderGestureState } from 'react-native';
import { haptics } from '@/core/native/haptics';

interface UseSwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  velocityThreshold?: number;
  enableHaptics?: boolean;
}

interface UseSwipeGestureReturn {
  panHandlers: ReturnType<typeof PanResponder.create>['panHandlers'];
  translateX: Animated.Value;
  resetPosition: () => void;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 80,
  velocityThreshold = 500,
  enableHaptics = true,
}: UseSwipeGestureOptions): UseSwipeGestureReturn {
  const translateX = useRef(new Animated.Value(0)).current;

  const resetPosition = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 40,
      friction: 8,
    }).start();
  }, [translateX]);

  const handleSwipeComplete = useCallback(
    (direction: 'left' | 'right') => {
      if (enableHaptics) {
        haptics.impact('medium');
      }

      if (direction === 'left' && onSwipeLeft) {
        onSwipeLeft();
      } else if (direction === 'right' && onSwipeRight) {
        onSwipeRight();
      }
    },
    [onSwipeLeft, onSwipeRight, enableHaptics]
  );

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 10,

      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx);
      },

      onPanResponderRelease: (_, gestureState) => {
        const { dx, vx } = gestureState;
        const shouldTrigger =
          Math.abs(dx) > threshold || Math.abs(vx) > velocityThreshold;

        if (shouldTrigger) {
          const direction = dx > 0 ? 'right' : 'left';
          handleSwipeComplete(direction);
        }

        resetPosition();
      },
    })
  ).current;

  return {
    panHandlers: panResponder.panHandlers,
    translateX,
    resetPosition,
  };
}
```

### 2.18: Standardize EmptyState API

**Update:** `src/shared/components/EmptyState.tsx`

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { scale, spacing, colors } from '@/shared/theme';
import { useThemeColors } from '@/shared/theme/themeStore';

interface EmptyStateProps {
  // Required
  icon: LucideIcon;
  title: string;
  message: string;

  // Optional
  ctaLabel?: string;
  onCtaPress?: () => void;
  secondaryCtaLabel?: string;
  onSecondaryCtaPress?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  message,
  ctaLabel,
  onCtaPress,
  secondaryCtaLabel,
  onSecondaryCtaPress,
}) => {
  const themeColors = useThemeColors();

  return (
    <View style={styles.container}>
      <Icon
        size={scale(48)}
        color={themeColors.textTertiary}
        style={styles.icon}
      />
      <Text style={[styles.title, { color: themeColors.textPrimary }]}>
        {title}
      </Text>
      <Text style={[styles.message, { color: themeColors.textSecondary }]}>
        {message}
      </Text>

      {ctaLabel && onCtaPress && (
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: colors.accent }]}
          onPress={onCtaPress}
        >
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      )}

      {secondaryCtaLabel && onSecondaryCtaPress && (
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onSecondaryCtaPress}
        >
          <Text style={[styles.secondaryText, { color: themeColors.textSecondary }]}>
            {secondaryCtaLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
```

**Update DownloadsScreen to use standard API:**
```typescript
// Before (custom props)
<EmptyState
  onBrowse={() => navigation.navigate('Browse')}
  colors={customColors}
/>

// After (standard API)
<EmptyState
  icon={Download}
  title="No Downloads"
  message="Download audiobooks to listen offline."
  ctaLabel="Browse Library"
  onCtaPress={() => navigation.navigate('Browse')}
/>
```

### 2.20: Create useSeriesProgress Hook

**New file:** `src/shared/hooks/useSeriesProgress.ts`

```typescript
import { useMemo } from 'react';
import { LibraryItem } from '@/core/types';
import { useFinishedBookIds } from '@/core/hooks/useUserBooks';
import { getProgress } from '@/shared/utils/bookMetadata';

interface SeriesProgress {
  totalBooks: number;
  completedBooks: number;
  inProgressBooks: number;
  notStartedBooks: number;
  percentComplete: number;
  nextBook: LibraryItem | null;
}

export function useSeriesProgress(seriesBooks: LibraryItem[]): SeriesProgress {
  const { finishedBookIds } = useFinishedBookIds();
  const finishedSet = useMemo(() => new Set(finishedBookIds), [finishedBookIds]);

  return useMemo(() => {
    let completedBooks = 0;
    let inProgressBooks = 0;
    let nextBook: LibraryItem | null = null;

    for (const book of seriesBooks) {
      const { progress, isFinished } = getProgress(book);

      if (isFinished || finishedSet.has(book.id) || progress >= 0.95) {
        completedBooks++;
      } else if (progress > 0) {
        inProgressBooks++;
        if (!nextBook) nextBook = book;
      } else if (!nextBook) {
        nextBook = book;
      }
    }

    const totalBooks = seriesBooks.length;
    const notStartedBooks = totalBooks - completedBooks - inProgressBooks;
    const percentComplete = totalBooks > 0 ? (completedBooks / totalBooks) * 100 : 0;

    return {
      totalBooks,
      completedBooks,
      inProgressBooks,
      notStartedBooks,
      percentComplete,
      nextBook,
    };
  }, [seriesBooks, finishedSet]);
}
```

### 2.21: Create useInProgressBooks Hook

**New file:** `src/shared/hooks/useInProgressBooks.ts`

```typescript
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LibraryItem } from '@/core/types';
import { apiClient, queryKeys } from '@/core/api';
import { getProgress } from '@/shared/utils/bookMetadata';

interface UseInProgressBooksReturn {
  inProgressBooks: LibraryItem[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useInProgressBooks(): UseInProgressBooksReturn {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.user.inProgress(),
    queryFn: () => apiClient.get<{ items: LibraryItem[] }>('/api/me/items-in-progress'),
    staleTime: 1000 * 60 * 2, // 2 minutes
    placeholderData: (prev) => prev,
  });

  const inProgressBooks = useMemo(() => {
    if (!data?.items) return [];

    return data.items
      .filter((item) => {
        const { progress, isFinished } = getProgress(item);
        return progress > 0 && progress < 0.95 && !isFinished;
      })
      .sort((a, b) => {
        const aUpdate = getProgress(a).lastUpdate;
        const bUpdate = getProgress(b).lastUpdate;
        return bUpdate - aUpdate;
      });
  }, [data]);

  return {
    inProgressBooks,
    isLoading,
    isError,
    refetch,
  };
}
```

### 2.22: Consolidate Download Status Hooks

**New file:** `src/shared/hooks/useDownloadState.ts`

```typescript
import { useMemo } from 'react';
import { useDownloads, useDownloadStatus, useIsOfflineAvailable } from '@/core/hooks/useDownloads';

type DownloadStatus = 'not_downloaded' | 'pending' | 'downloading' | 'paused' | 'complete' | 'error';

interface DownloadState {
  status: DownloadStatus;
  progress: number;
  isDownloaded: boolean;
  isDownloading: boolean;
  isPending: boolean;
  isPaused: boolean;
  isError: boolean;
  isOfflineAvailable: boolean;
  filePath: string | null;
  fileSize: number | null;
}

export function useDownloadState(itemId: string): DownloadState {
  const { downloads } = useDownloads();
  const { isAvailable } = useIsOfflineAvailable(itemId);

  return useMemo(() => {
    const download = downloads.find(d => d.itemId === itemId);

    if (!download) {
      return {
        status: 'not_downloaded',
        progress: 0,
        isDownloaded: false,
        isDownloading: false,
        isPending: false,
        isPaused: false,
        isError: false,
        isOfflineAvailable: isAvailable,
        filePath: null,
        fileSize: null,
      };
    }

    return {
      status: download.status,
      progress: download.progress,
      isDownloaded: download.status === 'complete',
      isDownloading: download.status === 'downloading',
      isPending: download.status === 'pending',
      isPaused: download.status === 'paused',
      isError: download.status === 'error',
      isOfflineAvailable: isAvailable,
      filePath: download.filePath,
      fileSize: download.fileSize,
    };
  }, [downloads, itemId, isAvailable]);
}
```

### 2.23: Document Progress Storage Architecture

**Add to:** `CLAUDE.md` in State Management section:

```markdown
### Progress Storage Architecture

Progress data exists in three layers (intentional redundancy for offline-first):

| Layer | Storage | Purpose | Persistence |
|-------|---------|---------|-------------|
| **SQLite** | `user_books` table | Single source of truth for local | Permanent |
| **playerStore** | Zustand memory | Ephemeral playback state | Session only |
| **Server** | API sync | Cross-device sync target | Remote |

**Flow:**
1. User plays book → position updates in playerStore
2. Every 30s or on pause → position syncs to SQLite
3. When online → SQLite syncs to server
4. On app launch → SQLite hydrates playerStore

**Rule:** For "is finished" checks, always use `useReadingHistory.isFinished(id)`
which checks both SQLite and server data.
```

### 2.24: Standardize Finished Book Checking

**Create:** `src/shared/hooks/useIsFinished.ts`

```typescript
import { useCallback } from 'react';
import { useFinishedBookIds } from '@/core/hooks/useUserBooks';
import { getProgress } from '@/shared/utils/bookMetadata';
import { LibraryItem } from '@/core/types';

export function useIsFinished() {
  const { finishedBookIds } = useFinishedBookIds();
  const finishedSet = new Set(finishedBookIds);

  const isFinished = useCallback(
    (bookOrId: LibraryItem | string): boolean => {
      const id = typeof bookOrId === 'string' ? bookOrId : bookOrId.id;

      // Check SQLite first (local truth)
      if (finishedSet.has(id)) return true;

      // Check server progress if we have the item
      if (typeof bookOrId !== 'string') {
        const { progress, isFinished: serverFinished } = getProgress(bookOrId);
        if (serverFinished || progress >= 0.95) return true;
      }

      return false;
    },
    [finishedSet]
  );

  return { isFinished, finishedBookIds };
}
```

**Deprecate other patterns:**
```typescript
// DEPRECATED - Don't use these directly
sqliteCache.getUserBook(id)?.isFinished  // Use useIsFinished instead
item.userMediaProgress?.progress >= 0.95  // Use useIsFinished instead
completionStore.isComplete(id)            // Use useIsFinished instead
```

---

## Testing Criteria

- [ ] `useFilteredLibrary` filters Kid Mode content correctly
- [ ] `useSwipeGesture` works in discover, history, downloads
- [ ] `EmptyState` renders consistently across all screens
- [ ] `useSeriesProgress` calculates correctly
- [ ] `useInProgressBooks` returns sorted in-progress items
- [ ] `useDownloadState` provides all status info
- [ ] `useIsFinished` is single source of truth

---

## Effort Breakdown

| Task | Effort | Risk |
|------|--------|------|
| Create useFilteredLibrary | 1 hour | Low |
| Create useSwipeGesture | 2 hours | Low |
| Standardize EmptyState | 1.5 hours | Low |
| Create useSeriesProgress | 1 hour | Low |
| Create useInProgressBooks | 1 hour | Low |
| Create useDownloadState | 1 hour | Low |
| Document progress architecture | 30 min | Low |
| Create useIsFinished | 1 hour | Low |
| Update consumers | 3 hours | Low |
| Testing | 2 hours | - |

**Total: 2-3 days**
