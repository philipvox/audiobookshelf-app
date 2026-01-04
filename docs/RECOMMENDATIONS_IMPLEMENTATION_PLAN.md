# Recommendations Feature Implementation Plan

Based on UX Specification analysis. Organized by priority phases.

---

## Phase 1: Data Models & Dismissal Storage (2-3 hours)

### 1.1 Add Dismissal Types to PreferencesStore

**File:** `src/features/recommendations/stores/preferencesStore.ts`

Add these fields to `UserPreferences`:

```typescript
export interface UserPreferences {
  // ... existing fields ...

  // Dismissal tracking
  dismissedBooks: string[];      // Book IDs marked "not interested"
  dismissedAuthors: string[];    // Authors to exclude from recommendations
  dismissedGenres: string[];     // Genres to exclude

  // Positive feedback
  wantToListen: string[];        // Book IDs user wants to listen to
}
```

Add these actions to `PreferencesState`:

```typescript
// Dismissal actions
dismissBook: (bookId: string) => void;
undoDismissBook: (bookId: string) => void;
dismissAuthor: (author: string) => void;
dismissGenre: (genre: string) => void;
clearDismissals: () => void;

// Positive feedback
addToWantToListen: (bookId: string) => void;
removeFromWantToListen: (bookId: string) => void;
```

### 1.2 Create RecommendationReason Type

**File:** `src/features/discover/types.ts`

Add:

```typescript
export type RecommendationReasonType =
  | 'author'      // More by this author
  | 'narrator'    // More by this narrator
  | 'genre'       // Matches your genre preferences
  | 'series'      // Next in series
  | 'completion'  // Because you finished [book]
  | 'popular'     // Popular in library
  | 'new'         // Recently added
  | 'hidden_gem'; // Highly rated, less discovered

export interface RecommendationReason {
  type: RecommendationReasonType;
  sourceId?: string;      // ID of book/author that triggered this
  sourceName?: string;    // Display name: "The Way of Kings"
  label: string;          // Full label: "Because you finished The Way of Kings"
}

export interface RecommendationWithReason {
  book: BookSummary;
  reason: RecommendationReason;
  score: number;          // 0-1 relevance score
}

// Update ContentRow to include reasons
export interface ContentRow {
  // ... existing fields ...
  reasonType?: RecommendationReasonType;
  sourceBook?: {
    id: string;
    title: string;
  };
}
```

---

## Phase 2: "Because You Listened To" Rows (3-4 hours)

### 2.1 Track Finished Books with Attribution

**File:** `src/features/discover/hooks/useDiscoverData.ts`

Add a new function to generate "Because you listened to" rows:

```typescript
// Get recently finished books (last 30 days)
const becauseYouListenedRows = useMemo((): ContentRow[] => {
  if (!isLoaded || !libraryItems.length) return [];

  const { finishedBooks } = useReadingHistory();

  // Get last 3 finished books
  const recentlyFinished = finishedBooks
    .sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0))
    .slice(0, 3);

  const rows: ContentRow[] = [];

  for (const finishedBook of recentlyFinished) {
    // Find similar books by same author, narrator, or genre
    const similar = findSimilarBooks(libraryItems, finishedBook, {
      excludeIds: [finishedBook.id, ...preferences.dismissedBooks],
      excludeAuthors: preferences.dismissedAuthors,
      minScore: 0.3,
      limit: 10,
    });

    if (similar.length >= 3) {
      rows.push({
        id: `because_${finishedBook.id}`,
        type: 'because_you_liked',
        title: `Because you finished "${finishedBook.title}"`,
        reasonType: 'completion',
        sourceBook: {
          id: finishedBook.id,
          title: finishedBook.title,
        },
        items: similar.map(item => convertToBookSummary(item)),
        totalCount: similar.length,
        priority: 2.5,
        refreshPolicy: 'daily',
      });
    }
  }

  return rows;
}, [libraryItems, isLoaded, finishedBooks, preferences]);
```

### 2.2 Similarity Scoring Function

**File:** `src/features/discover/utils/similarityScoring.ts` (new file)

```typescript
export function calculateSimilarityScore(
  candidate: LibraryItem,
  source: LibraryItem
): number {
  let score = 0;

  const candidateMeta = (candidate.media?.metadata as any) || {};
  const sourceMeta = (source.media?.metadata as any) || {};

  // Same author: +0.4
  if (candidateMeta.authorName === sourceMeta.authorName) {
    score += 0.4;
  }

  // Same narrator: +0.3
  if (candidateMeta.narratorName === sourceMeta.narratorName) {
    score += 0.3;
  }

  // Genre overlap: +0.1 per shared genre (max 0.3)
  const candidateGenres: string[] = candidateMeta.genres || [];
  const sourceGenres: string[] = sourceMeta.genres || [];
  const sharedGenres = candidateGenres.filter(g =>
    sourceGenres.some(sg => sg.toLowerCase() === g.toLowerCase())
  );
  score += Math.min(sharedGenres.length * 0.1, 0.3);

  // Same series: +0.5
  const candidateSeries = candidateMeta.series?.[0]?.name;
  const sourceSeries = sourceMeta.series?.[0]?.name;
  if (candidateSeries && candidateSeries === sourceSeries) {
    score += 0.5;
  }

  // Similar duration (within 20%): +0.1
  const candidateDuration = (candidate.media as any)?.duration || 0;
  const sourceDuration = (source.media as any)?.duration || 0;
  if (sourceDuration > 0) {
    const ratio = candidateDuration / sourceDuration;
    if (ratio > 0.8 && ratio < 1.2) {
      score += 0.1;
    }
  }

  return Math.min(score, 1.0);
}

export function findSimilarBooks(
  library: LibraryItem[],
  sourceBook: LibraryItem,
  options: {
    excludeIds?: string[];
    excludeAuthors?: string[];
    minScore?: number;
    limit?: number;
  }
): LibraryItem[] {
  const { excludeIds = [], excludeAuthors = [], minScore = 0.3, limit = 10 } = options;

  return library
    .filter(b => b.id !== sourceBook.id)
    .filter(b => !excludeIds.includes(b.id))
    .filter(b => {
      const author = (b.media?.metadata as any)?.authorName;
      return !excludeAuthors.includes(author);
    })
    .map(book => ({
      book,
      score: calculateSimilarityScore(book, sourceBook),
    }))
    .filter(r => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(r => r.book);
}
```

---

## Phase 3: "Almost Done" Row (1-2 hours)

### 3.1 Add Almost Done Row

**File:** `src/features/discover/hooks/useDiscoverData.ts`

Add after `continueSeriesRow`:

```typescript
// Almost Done row (books at 75-95% progress)
const almostDoneRow = useMemo((): ContentRow | null => {
  if (!isLoaded || !inProgressItems.length) return null;

  // Filter to books that are 75-95% complete
  const almostDone = inProgressItems.filter(item => {
    const progress = item.progress || 0;
    return progress >= 0.75 && progress < 0.95;
  });

  if (almostDone.length === 0) return null;

  // Sort by progress (highest first - closest to done)
  const sorted = [...almostDone].sort((a, b) =>
    (b.progress || 0) - (a.progress || 0)
  );

  const items = sorted.slice(0, 10).map(item =>
    convertToBookSummary(item, item.progress)
  );

  return {
    id: 'almost_done',
    type: 'continue_listening',
    title: 'Almost Done',
    subtitle: 'Finish what you started',
    items,
    totalCount: almostDone.length,
    priority: 1.5, // Very high priority
    refreshPolicy: 'realtime',
  };
}, [inProgressItems, isLoaded, convertToBookSummary]);
```

Add to rows array:

```typescript
const rows = useMemo((): ContentRow[] => {
  const staticRows = [
    almostDoneRow,        // NEW - highest priority
    newThisWeekRow,
    continueSeriesRow,
    // ...
  ].filter((row): row is ContentRow => row !== null);
  // ...
}, [almostDoneRow, ...]);
```

---

## Phase 4: Dismissal UI (3-4 hours)

### 4.1 Create Dismissal Context Menu Component

**File:** `src/features/discover/components/DismissalMenu.tsx` (new file)

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Portal } from '@gorhom/portal';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, scale, spacing } from '@/shared/theme';
import { BookSummary } from '../types';
import * as Haptics from 'expo-haptics';

interface DismissalMenuProps {
  book: BookSummary;
  visible: boolean;
  position: { x: number; y: number };
  onDismissBook: () => void;
  onDismissAuthor: () => void;
  onDismissGenre: () => void;
  onAddToWantToListen: () => void;
  onClose: () => void;
}

export function DismissalMenu({
  book,
  visible,
  position,
  onDismissBook,
  onDismissAuthor,
  onDismissGenre,
  onAddToWantToListen,
  onClose,
}: DismissalMenuProps) {
  if (!visible) return null;

  const handleOption = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action();
    onClose();
  };

  return (
    <Portal>
      <TouchableOpacity
        style={styles.overlay}
        onPress={onClose}
        activeOpacity={1}
      >
        <Animated.View
          entering={SlideInDown.duration(200)}
          exiting={FadeOut.duration(150)}
          style={[styles.menu, { top: position.y, left: position.x }]}
        >
          <TouchableOpacity
            style={styles.option}
            onPress={() => handleOption(onAddToWantToListen)}
          >
            <Ionicons name="heart-outline" size={20} color={colors.accent} />
            <Text style={styles.optionText}>Want to Listen</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.option}
            onPress={() => handleOption(onDismissBook)}
          >
            <Ionicons name="eye-off-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.optionText}>Not interested</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={() => handleOption(onDismissAuthor)}
          >
            <Ionicons name="person-remove-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.optionText}>Don't recommend {book.author}</Text>
          </TouchableOpacity>

          {book.genres?.[0] && (
            <TouchableOpacity
              style={styles.option}
              onPress={() => handleOption(onDismissGenre)}
            >
              <Ionicons name="bookmark-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.optionText}>Less {book.genres[0]}</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Portal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  menu: {
    position: 'absolute',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: scale(12),
    padding: spacing.sm,
    minWidth: scale(200),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: spacing.md,
  },
  optionText: {
    color: colors.textPrimary,
    fontSize: scale(14),
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
});
```

### 4.2 Add Long-Press Handler to BookCard

**File:** `src/shared/components/BookCard.tsx`

Add long-press handling:

```typescript
interface BookCardProps {
  // ... existing props ...
  onLongPress?: (position: { x: number; y: number }) => void;
}

export function BookCard({ onLongPress, ...props }: BookCardProps) {
  const handleLongPress = (event: GestureResponderEvent) => {
    if (onLongPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onLongPress({
        x: event.nativeEvent.pageX,
        y: event.nativeEvent.pageY,
      });
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={handleLongPress}
      delayLongPress={500}
      // ...
    />
  );
}
```

### 4.3 Filter Dismissed Content

**File:** `src/features/discover/hooks/useDiscoverData.ts`

Add filter function:

```typescript
const { dismissedBooks, dismissedAuthors, dismissedGenres } = usePreferencesStore();

const filterDismissed = useCallback((items: LibraryItem[]): LibraryItem[] => {
  return items.filter(item => {
    // Filter dismissed books
    if (dismissedBooks.includes(item.id)) return false;

    // Filter dismissed authors
    const author = (item.media?.metadata as any)?.authorName;
    if (author && dismissedAuthors.includes(author)) return false;

    // Filter dismissed genres
    const genres: string[] = (item.media?.metadata as any)?.genres || [];
    if (genres.some(g => dismissedGenres.includes(g))) return false;

    return true;
  });
}, [dismissedBooks, dismissedAuthors, dismissedGenres]);

// Apply to all row generation:
// newItems = filterDismissed(filterByGenre(newItems, selectedGenre));
```

---

## Phase 5: Hidden Gems Row (2-3 hours)

### 5.1 Calculate "Hidden Gem" Score

**File:** `src/features/discover/utils/hiddenGemScoring.ts` (new file)

```typescript
interface HiddenGemScore {
  book: LibraryItem;
  score: number;
  qualityScore: number;
  obscurityScore: number;
}

export function calculateHiddenGemScore(
  book: LibraryItem,
  allBooks: LibraryItem[],
  finishedBooks: string[]
): HiddenGemScore {
  const metadata = (book.media?.metadata as any) || {};

  // Quality signals (0-1)
  let qualityScore = 0;

  // Rating (if available)
  if (metadata.rating) {
    qualityScore += (metadata.rating / 5) * 0.5; // Max 0.5
  }

  // Has good metadata (description, series, narrator)
  if (metadata.description?.length > 100) qualityScore += 0.1;
  if (metadata.series?.length > 0) qualityScore += 0.1;
  if (metadata.narratorName) qualityScore += 0.1;

  // Recent addition bonus
  const addedAt = book.addedAt || 0;
  const daysSinceAdded = (Date.now() - addedAt * 1000) / (1000 * 60 * 60 * 24);
  if (daysSinceAdded < 30) qualityScore += 0.1;

  // Obscurity signals (0-1) - how "hidden" is it?
  let obscurityScore = 0;

  // Not from popular authors
  const authorBooks = allBooks.filter(b =>
    (b.media?.metadata as any)?.authorName === metadata.authorName
  );
  if (authorBooks.length <= 2) obscurityScore += 0.3;

  // Not in heavily-listened genre
  const genres: string[] = metadata.genres || [];
  // TODO: Compare against genre listen counts
  if (genres.length > 0) obscurityScore += 0.2;

  // Older in library (been overlooked)
  if (daysSinceAdded > 90) obscurityScore += 0.3;

  // Not started by user
  if (!finishedBooks.includes(book.id)) obscurityScore += 0.2;

  // Combined score: high quality + high obscurity = hidden gem
  const score = qualityScore * obscurityScore;

  return {
    book,
    score,
    qualityScore,
    obscurityScore,
  };
}

export function findHiddenGems(
  library: LibraryItem[],
  finishedBooks: string[],
  limit: number = 10
): LibraryItem[] {
  return library
    .map(book => calculateHiddenGemScore(book, library, finishedBooks))
    .filter(r => r.qualityScore >= 0.3 && r.obscurityScore >= 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(r => r.book);
}
```

### 5.2 Add Hidden Gems Row

**File:** `src/features/discover/hooks/useDiscoverData.ts`

```typescript
// Hidden Gems row
const hiddenGemsRow = useMemo((): ContentRow | null => {
  if (!isLoaded || !libraryItems.length) return null;

  const { finishedBookIds } = useReadingHistory();

  let gems = findHiddenGems(libraryItems, finishedBookIds, 15);
  gems = filterDismissed(gems);
  gems = filterByGenre(gems, selectedGenre);

  if (gems.length < 3) return null;

  return {
    id: 'hidden_gems',
    type: 'recommended',
    title: 'Discover Something New',
    subtitle: 'Hidden gems in your library',
    items: gems.slice(0, 10).map(item => convertToBookSummary(item)),
    totalCount: gems.length,
    priority: 7,
    refreshPolicy: 'daily',
  };
}, [libraryItems, isLoaded, filterDismissed, filterByGenre, selectedGenre, convertToBookSummary]);
```

---

## Phase 6: Dedicated Narrator Rows (2 hours)

### 6.1 Add "More by [Narrator]" Rows

**File:** `src/features/discover/hooks/useDiscoverData.ts`

```typescript
// More by Narrator rows (top 2 narrators)
const narratorRows = useMemo((): ContentRow[] => {
  if (!isLoaded || !libraryItems.length) return [];

  const { topNarrators } = useReadingHistory();
  const rows: ContentRow[] = [];

  // Get top 2 narrators user has finished 2+ books with
  const qualifiedNarrators = topNarrators
    .filter(n => n.count >= 2)
    .slice(0, 2);

  for (const narrator of qualifiedNarrators) {
    let unlistened = libraryItems.filter(item => {
      const narratorName = (item.media?.metadata as any)?.narratorName;
      return narratorName === narrator.name && !isFinished(item.id);
    });

    unlistened = filterDismissed(unlistened);

    if (unlistened.length >= 2) {
      rows.push({
        id: `narrator_${narrator.name}`,
        type: 'narrator_follow',
        title: `More from ${narrator.name}`,
        reasonType: 'narrator',
        sourceBook: { id: '', title: narrator.name },
        items: unlistened.slice(0, 10).map(item => convertToBookSummary(item)),
        totalCount: unlistened.length,
        priority: 6,
        refreshPolicy: 'daily',
      });
    }
  }

  return rows;
}, [libraryItems, isLoaded, isFinished, filterDismissed, convertToBookSummary]);
```

---

## Phase 7: Real-Time Updates (2-3 hours)

### 7.1 Invalidate Recommendations on Book Completion

**File:** `src/features/player/stores/playerStore.ts`

After marking a book as finished:

```typescript
// In the markAsFinished action or when progress >= 95%
import { queryClient } from '@/core/api';

// Invalidate recommendation queries
queryClient.invalidateQueries({ queryKey: ['recommendations'] });
queryClient.invalidateQueries({ queryKey: ['discover'] });

// Or use an event emitter
import { eventBus } from '@/core/events';
eventBus.emit('book:finished', { bookId, title, author });
```

### 7.2 Listen for Updates in useDiscoverData

```typescript
useEffect(() => {
  const unsubscribe = eventBus.on('book:finished', () => {
    // Trigger refresh
    refresh();
  });

  return () => unsubscribe();
}, [refresh]);
```

---

## Phase 8: Cold Start Fallback (1-2 hours)

### 8.1 Add "Popular in Library" Row

**File:** `src/features/discover/hooks/useDiscoverData.ts`

```typescript
// Popular in Library (for cold start users)
const popularRow = useMemo((): ContentRow | null => {
  // Only show if user has no listening history
  if (hasHistory) return null;
  if (!isLoaded || !libraryItems.length) return null;

  // Sort by "popularity" - for now, use rating or random
  // In future, could track play counts
  let popular = [...libraryItems]
    .filter(item => {
      const rating = (item.media?.metadata as any)?.rating;
      return rating && rating >= 3.5;
    })
    .sort((a, b) => {
      const ratingA = (a.media?.metadata as any)?.rating || 0;
      const ratingB = (b.media?.metadata as any)?.rating || 0;
      return ratingB - ratingA;
    });

  if (popular.length < 3) {
    // Fall back to recently added
    popular = [...libraryItems].sort((a, b) =>
      (b.addedAt || 0) - (a.addedAt || 0)
    );
  }

  return {
    id: 'popular',
    type: 'popular',
    title: 'Popular in Your Library',
    subtitle: 'Great place to start',
    items: popular.slice(0, 15).map(item => convertToBookSummary(item)),
    totalCount: popular.length,
    priority: 1,
    refreshPolicy: 'daily',
  };
}, [libraryItems, isLoaded, hasHistory, convertToBookSummary]);
```

---

## Phase 9: Animations (2-3 hours)

### 9.1 Row Load Stagger Animation

**File:** `src/features/discover/components/ContentRowCarousel.tsx`

```typescript
import Animated, {
  FadeInDown,
  Layout,
} from 'react-native-reanimated';

interface ContentRowCarouselProps {
  index: number; // Row index for stagger
}

export function ContentRowCarousel({ index, ...props }: ContentRowCarouselProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).duration(300)}
      layout={Layout.springify()}
    >
      {/* Row content */}
    </Animated.View>
  );
}
```

### 9.2 Dismissal Animation

```typescript
// When dismissing a book
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: withTiming(dismissed ? 0.8 : 1, { duration: 250 }) }],
  opacity: withTiming(dismissed ? 0 : 1, { duration: 250 }),
}));
```

---

## Summary Checklist

| Phase | Feature | Hours | Priority |
|-------|---------|-------|----------|
| 1 | Data models & dismissal storage | 2-3 | High |
| 2 | "Because You Listened To" rows | 3-4 | High |
| 3 | "Almost Done" row | 1-2 | High |
| 4 | Dismissal UI (long-press menu) | 3-4 | High |
| 5 | Hidden Gems row | 2-3 | Medium |
| 6 | Dedicated Narrator rows | 2 | Medium |
| 7 | Real-time updates | 2-3 | Medium |
| 8 | Cold start fallback | 1-2 | Medium |
| 9 | Animations | 2-3 | Low |

**Total: 18-26 hours**

---

## Files to Create

1. `src/features/discover/utils/similarityScoring.ts`
2. `src/features/discover/utils/hiddenGemScoring.ts`
3. `src/features/discover/components/DismissalMenu.tsx`

## Files to Modify

1. `src/features/recommendations/stores/preferencesStore.ts` - Add dismissal fields
2. `src/features/discover/types.ts` - Add RecommendationReason types
3. `src/features/discover/hooks/useDiscoverData.ts` - Add new rows
4. `src/shared/components/BookCard.tsx` - Add long-press handler
5. `src/features/player/stores/playerStore.ts` - Emit completion events
