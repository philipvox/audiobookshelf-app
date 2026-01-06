# Edit Specification: Pattern Consolidation (v2)

**Version:** 2 (post-validation)
**Changes from v1:** Fixed dependency ordering, corrected useSeriesProgress usage

**Covers Action Plan Items:** 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13
**Priority:** High (Phase 2C)
**Effort:** M (Medium) - 2-3 days

---

## Critical Dependencies

⚠️ **BLOCKING DEPENDENCY:** This spec requires:
- **2.1 Cross-feature imports** - kidModeStore must be moved to `@/shared/stores/` before useFilteredLibrary can be created
- **2.5 getBookMetadata** - Required by useSeriesProgress, useInProgressBooks, useIsFinished

**Execution Order:**
```
2.1 Cross-feature imports
    ↓
2.5 getBookMetadata (parallel track)
    ↓
2.7-2.13 Pattern Consolidation hooks (this spec)
```

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

---

## Specific Changes

### 2.7: Create useFilteredLibrary Hook

⚠️ **Requires:** 2.1 (kidModeStore moved to shared)

**New file:** `src/shared/hooks/useFilteredLibrary.ts`

```typescript
import { useMemo } from 'react';
import { LibraryItem } from '@/core/types';
// NOTE: This import only works AFTER 2.1 completes
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
import { useKidModeStore } from '@/features/profile/stores/kidModeStore';
const { isEnabled: kidModeEnabled } = useKidModeStore();
const filtered = kidModeEnabled ? items.filter(isKidFriendly) : items;

// After
import { useFilteredLibrary } from '@/shared/hooks/useFilteredLibrary';
const { filteredItems } = useFilteredLibrary({ items });
```

---

### 2.8: Standardize EmptyState API

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
      <Icon size={scale(48)} color={themeColors.textTertiary} style={styles.icon} />
      <Text style={[styles.title, { color: themeColors.textPrimary }]}>{title}</Text>
      <Text style={[styles.message, { color: themeColors.textSecondary }]}>{message}</Text>

      {ctaLabel && onCtaPress && (
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: colors.accent }]}
          onPress={onCtaPress}
        >
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      )}

      {secondaryCtaLabel && onSecondaryCtaPress && (
        <TouchableOpacity style={styles.secondaryButton} onPress={onSecondaryCtaPress}>
          <Text style={[styles.secondaryText, { color: themeColors.textSecondary }]}>
            {secondaryCtaLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
```

**Migration from custom props (DownloadsScreen):**
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

---

### 2.9: Create useSwipeGesture Hook

**New file:** `src/shared/hooks/useSwipeGesture.ts`

```typescript
import { useCallback, useRef } from 'react';
import { Animated, PanResponder } from 'react-native';
import { haptics } from '@/core/native/haptics';

interface UseSwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeProgress?: (progress: number, direction: 'left' | 'right') => void;
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
  onSwipeProgress,
  threshold = 80,
  velocityThreshold = 500,
  enableHaptics = true,
}: UseSwipeGestureOptions): UseSwipeGestureReturn {
  const translateX = useRef(new Animated.Value(0)).current;
  const hasTriggeredHaptic = useRef(false);

  const resetPosition = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 40,
      friction: 8,
    }).start();
    hasTriggeredHaptic.current = false;
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

        // Notify progress for visual feedback
        const absX = Math.abs(gestureState.dx);
        const progress = Math.min(absX / threshold, 1);
        const direction = gestureState.dx > 0 ? 'right' : 'left';
        onSwipeProgress?.(progress, direction);

        // Haptic at threshold
        if (absX >= threshold && !hasTriggeredHaptic.current && enableHaptics) {
          haptics.impact('light');
          hasTriggeredHaptic.current = true;
        } else if (absX < threshold * 0.8) {
          hasTriggeredHaptic.current = false;
        }
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

---

### 2.10: Create useSeriesProgress Hook

⚠️ **Requires:** 2.5 (getBookMetadata)

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

/**
 * Calculate progress for a series based on its books
 *
 * @example
 * const { completedBooks, totalBooks, nextBook } = useSeriesProgress(seriesBooks);
 * // Use in SeriesListScreen filter or SeriesDetailScreen display
 */
export function useSeriesProgress(seriesBooks: LibraryItem[]): SeriesProgress {
  const { finishedBookIds } = useFinishedBookIds();
  const finishedSet = useMemo(() => new Set(finishedBookIds), [finishedBookIds]);

  return useMemo(() => {
    let completedBooks = 0;
    let inProgressBooks = 0;
    let nextBook: LibraryItem | null = null;

    // Sort by sequence if available
    const sortedBooks = [...seriesBooks].sort((a, b) => {
      const aSeq = a.media?.metadata?.series?.[0]?.sequence;
      const bSeq = b.media?.metadata?.series?.[0]?.sequence;
      return (Number(aSeq) || 999) - (Number(bSeq) || 999);
    });

    for (const book of sortedBooks) {
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

---

### 2.11: Create useInProgressBooks Hook

⚠️ **Requires:** 2.5 (getBookMetadata)

**New file:** `src/shared/hooks/useInProgressBooks.ts`

```typescript
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LibraryItem } from '@/core/types';
import { apiClient, queryKeys } from '@/core/api';
import { getProgress } from '@/shared/utils/bookMetadata';

interface UseInProgressBooksReturn {
  inProgressBooks: LibraryItem[];
  currentBook: LibraryItem | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * Single source of truth for in-progress books
 * Replaces: useContinueListening, useDiscoverData.inProgressItems, MyLibraryScreen in-progress tab
 */
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

  const currentBook = inProgressBooks.length > 0 ? inProgressBooks[0] : null;

  return {
    inProgressBooks,
    currentBook,
    isLoading,
    isError,
    refetch,
  };
}
```

---

### 2.12: Consolidate Download Status Hooks

**New file:** `src/shared/hooks/useDownloadState.ts`

```typescript
import { useMemo } from 'react';
import { useDownloads } from '@/core/hooks/useDownloads';

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

/**
 * Single hook for all download state checks
 * Replaces: useDownloadStatus, useIsOfflineAvailable, downloadManager.isDownloaded
 */
export function useDownloadState(itemId: string): DownloadState {
  const { downloads } = useDownloads();

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
        isOfflineAvailable: false,
        filePath: null,
        fileSize: null,
      };
    }

    const isComplete = download.status === 'complete';

    return {
      status: download.status as DownloadStatus,
      progress: download.progress,
      isDownloaded: isComplete,
      isDownloading: download.status === 'downloading',
      isPending: download.status === 'pending',
      isPaused: download.status === 'paused',
      isError: download.status === 'error',
      isOfflineAvailable: isComplete && !!download.filePath,
      filePath: download.filePath || null,
      fileSize: download.fileSize || null,
    };
  }, [downloads, itemId]);
}
```

---

### 2.13: Create useIsFinished Hook

⚠️ **Requires:** 2.5 (getBookMetadata)

**New file:** `src/shared/hooks/useIsFinished.ts`

```typescript
import { useCallback, useMemo } from 'react';
import { useFinishedBookIds } from '@/core/hooks/useUserBooks';
import { getProgress } from '@/shared/utils/bookMetadata';
import { LibraryItem } from '@/core/types';

/**
 * Single source of truth for finished book checking
 *
 * Deprecates:
 * - sqliteCache.getUserBook(id)?.isFinished
 * - item.userMediaProgress?.progress >= 0.95
 * - completionStore.isComplete(id)
 */
export function useIsFinished() {
  const { finishedBookIds } = useFinishedBookIds();
  const finishedSet = useMemo(() => new Set(finishedBookIds), [finishedBookIds]);

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

  return { isFinished, finishedBookIds: Array.from(finishedSet) };
}
```

---

## Testing Criteria

- [ ] `useFilteredLibrary` filters Kid Mode content correctly
- [ ] `useSwipeGesture` works in discover, history, downloads
- [ ] `useSwipeGesture` triggers onSwipeProgress for visual feedback
- [ ] `EmptyState` renders consistently across all screens
- [ ] `useSeriesProgress` calculates correctly with sequence sorting
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
| Create useIsFinished | 1 hour | Low |
| Update consumers | 3 hours | Low |
| Testing | 2 hours | - |

**Total: 2-3 days**
