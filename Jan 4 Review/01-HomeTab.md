# HomeTab Complete Documentation

## Overview

The HomeTab is a **resume-focused dashboard** that provides quick access to the user's current listening progress. It matches the Browse page design with a blurred hero background and consistent grid sections.

**File:** `src/features/home/screens/HomeScreen.tsx`

---

## Data Sources

### 1. Primary Data Hook: `useHomeData()`

**File:** `src/features/home/hooks/useHomeData.ts`

| Data | Source | API/Query | Stale Time |
|------|--------|-----------|------------|
| In-Progress Books | Server API | `GET /api/me/items-in-progress` | 2 minutes |
| Playlists | Server API | `apiClient.getPlaylists()` | 5 minutes |
| Library Books | `useMyLibraryStore.libraryIds` | Local + API fetch | Reactive |
| Series Data | `useLibraryCache.getSeries()` | In-memory cache | Session |
| Downloads | `useDownloads()` | SQLite | Reactive |
| Player State | `usePlayerStore` | Zustand | Realtime |

### 2. Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        useHomeData()                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐  │
│  │ React Query     │    │ Zustand Stores  │    │ Library      │  │
│  │ inProgressItems │    │ playerStore     │    │ Cache        │  │
│  │ playlists       │    │ myLibraryStore  │    │ getSeries()  │  │
│  └────────┬────────┘    │ kidModeStore    │    │ getItem()    │  │
│           │             └────────┬────────┘    └──────┬───────┘  │
│           │                      │                     │          │
│           └──────────────────────┼─────────────────────┘          │
│                                  ▼                                │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │                    Computed Values                         │   │
│  │  • heroBook           • continueListeningGrid              │   │
│  │  • seriesInProgress   • recentlyAdded                      │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Hero Book State Calculation

**File:** `src/features/home/hooks/useHomeData.ts` (lines 428-488)

### Selection Logic
1. Takes `recentlyListened[0]` (most recently played in-progress book)
2. Books are sorted by `progressLastUpdate` or `userMediaProgress.lastUpdate` (descending)

### Progress Calculation
```typescript
// If this book is currently in player, use live player state
if (playerCurrentBook?.id === book.id) {
  currentPosition = position;  // from playerStore
  progress = bookDuration > 0 ? position / bookDuration : 0;
} else {
  // Otherwise use stored server progress
  progress = userProgress?.progress || 0;
  currentPosition = userProgress?.currentTime || 0;
}
```

### State Determination
| State | Condition |
|-------|-----------|
| `just-finished` | `isBookComplete(currentPosition, bookDuration)` returns true |
| `final-chapter` | `progress >= 0.95` |
| `almost-done` | `progress >= 0.75` |
| `in-progress` | Default state |

### Chapter Info
- Uses `findChapterForPosition()` utility from player
- Calculates `currentChapter` (1-indexed) and `totalChapters`
- `timeRemainingSeconds` via `calculateTimeRemaining()`

### Hero Recommendation Badge Text
```typescript
reason: state === 'almost-done' ? 'Almost finished!' :
        state === 'final-chapter' ? 'Final chapter!' :
        state === 'just-finished' ? 'Just finished' :
        'Continue listening'
```

---

## Section Data Sources

### Continue Listening Grid
```typescript
// Excludes hero book, takes positions 1-6
continueListeningGrid = recentlyListened.slice(1, 7);
```
- Source: `inProgressItems` from API
- Filtered by Kid Mode
- Sorted by last listened (most recent first)

### Series In Progress
```typescript
seriesInProgress = userSeries
  .filter(series => seriesLastListened.has(series.name) || series.booksInProgress > 0)
  .sort((a, b) => b.lastListened - a.lastListened)  // Most recent first
  .slice(0, 5);  // Max 5 series
```

**Enhanced Data Includes:**
- `bookStatuses[]`: `'done' | 'current' | 'not-started'` per book
- `seriesProgressPercent`: Weighted by duration
- `seriesTimeRemainingSeconds`: Sum of remaining time across all books
- `currentBookTitle`: Title of first in-progress book
- `currentBookIndex`: Index of current book (0-indexed)

### Recently Added
```typescript
recentlyAdded = libraryBooks
  .filter(book => progress === 0)  // Not started
  .sort((a, b) => b.addedAt - a.addedAt)  // Most recent first
  .slice(0, 20);
```
- Source: `libraryIds` from `useMyLibraryStore`
- Only books with 0% progress
- Filtered by Kid Mode

---

## Refresh Behavior

### Pull-to-Refresh
```typescript
const refresh = async () => {
  await Promise.all([
    refetchProgress(),     // Re-fetch /api/me/items-in-progress
    refetchPlaylists(),    // Re-fetch playlists
    refetchLibrary(),      // Re-fetch all libraryIds items
  ]);
};
```

### Automatic Updates
| Trigger | What Updates |
|---------|--------------|
| Player position changes | Hero progress (if same book) |
| Book added to library | `libraryIds` reactive → `libraryBooks` |
| Book removed from library | `libraryIds` reactive → cleanup cache |
| Download completes | `userSeries` (includes downloaded books) |
| Kid Mode toggle | All lists re-filtered |

### Cache Strategy
- **Local book cache** (`bookCacheRef`): Persists across re-renders to avoid flicker
- **placeholderData**: React Query shows previous data while refetching
- **Pre-warming**: Tick cache pre-warmed for current book chapters

---

## Components Used

### From Discover Feature (Reused)
| Component | File | Purpose |
|-----------|------|---------|
| `HeroSection` | `features/discover/components/HeroSection.tsx` | Large centered cover with overlay buttons |
| `ContentRowCarousel` | `features/discover/components/ContentRowCarousel.tsx` | 2x2 grid sections |

### Home Feature Components
| Component | File | Purpose |
|-----------|------|---------|
| `SectionHeader` | `features/home/components/SectionHeader.tsx` | Title + "View All" button |
| `SeriesCard` | `features/home/components/SeriesCard.tsx` | Fanned covers + progress badge |

### Shared Components
| Component | Purpose |
|-----------|---------|
| `SeriesHeartButton` | Favorite toggle on series cards |
| `SeriesProgressBadge` | Completed/in-progress/total dots |

---

## Visual Layout

```
┌─────────────────────────────────────────────┐
│ [Blurred Hero Background - scrolls]         │
│                                             │
│     ┌─────────────────────────┐             │
│     │                         │             │
│     │    [Large Cover 300px]  │  ← HeroSection
│     │    Play/Download btns   │             │
│     │                         │             │
│     └─────────────────────────┘             │
│         Book Title                          │
│      Written by Author                      │
│       Read by Narrator                      │
│      "Continue listening"                   │
│                                             │
├─────────────────────────────────────────────┤
│ Continue Listening          [View All]      │ ← ContentRowCarousel
│ ┌─────┐ ┌─────┐                             │
│ │ 📖  │ │ 📖  │  (2x2 grid)                 │
│ └─────┘ └─────┘                             │
│ ┌─────┐ ┌─────┐                             │
│ │ 📖  │ │ 📖  │                             │
│ └─────┘ └─────┘                             │
├─────────────────────────────────────────────┤
│ Series In Progress                          │ ← SectionHeader + SeriesCard
│ ┌──────────┐ ┌──────────┐                   │
│ │ [Fanned] │ │ [Fanned] │                   │
│ │ Series A │ │ Series B │                   │
│ │ ●●○○ 4hr │ │ ●○○○ 8hr │                   │
│ └──────────┘ └──────────┘                   │
├─────────────────────────────────────────────┤
│ Recently Added                              │ ← ContentRowCarousel
│ ┌─────┐ ┌─────┐                             │
│ │ 📖  │ │ 📖  │  (2x2 grid)                 │
│ └─────┘ └─────┘                             │
└─────────────────────────────────────────────┘
```

---

## Empty State

When `isCompletelyEmpty` (no hero, no continue listening, no series, no recently added):

- Headphones icon
- "Welcome" title
- "Browse Library" CTA button → navigates to LibraryTab

---

## Theme Support

| Element | Dark Mode | Light Mode |
|---------|-----------|------------|
| Background | `themeColors.background` | `themeColors.background` |
| Hero blur tint | `'dark'` | `'light'` |
| Bottom gradient | `rgba(0,0,0,...)` → background | `rgba(255,255,255,...)` → background |
| Text | `themeColors.text` | `themeColors.text` |
| Secondary text | `themeColors.textSecondary` | `themeColors.textSecondary` |

---

## Kid Mode Filtering

Applied via `filterForKidMode()` utility to:
- `recentlyListened` (in-progress books)
- `recentBooks` (library books)
- `recentlyAdded` (discovery books)

Filters out books where `isKidFriendly(item)` returns false based on genre/explicit markers.

---

## Type Definitions

**File:** `src/features/home/types.ts`

### HeroBookData
```typescript
interface HeroBookData {
  book: LibraryItem;
  progress: number;              // 0-1
  currentChapter: number;        // 1-indexed
  totalChapters: number;
  timeRemainingSeconds: number;
  narratorName: string;
  state: HeroBookState;
}

type HeroBookState = 'in-progress' | 'almost-done' | 'final-chapter' | 'just-finished';
```

### EnhancedSeriesData
```typescript
interface EnhancedSeriesData extends SeriesWithBooks {
  bookStatuses: BookStatus[];           // Per-book: 'done' | 'current' | 'not-started'
  seriesProgressPercent: number;        // 0-100
  seriesTimeRemainingSeconds: number;
  currentBookTitle: string;
  currentBookIndex: number;             // 0-indexed
}
```

### UseHomeDataReturn
```typescript
interface UseHomeDataReturn {
  // Now playing
  currentBook: LibraryItem | null;
  currentProgress: PlaybackProgress | null;

  // Lists
  recentlyListened: LibraryItem[];
  recentBooks: LibraryItem[];
  userSeries: SeriesWithBooks[];
  userPlaylists: PlaylistDisplay[];

  // Homepage sections
  heroBook: HeroBookData | null;
  continueListeningGrid: LibraryItem[];
  seriesInProgress: EnhancedSeriesData[];
  recentlyAdded: LibraryItem[];

  // State
  isLoading: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
}
```

---

## Related Files

| File | Purpose |
|------|---------|
| `src/features/home/screens/HomeScreen.tsx` | Main screen component |
| `src/features/home/hooks/useHomeData.ts` | Data aggregation hook |
| `src/features/home/types.ts` | TypeScript interfaces |
| `src/features/home/components/SectionHeader.tsx` | Section title component |
| `src/features/home/components/SeriesCard.tsx` | Series card with fanned covers |
| `src/features/discover/components/HeroSection.tsx` | Hero display (reused) |
| `src/features/discover/components/ContentRowCarousel.tsx` | 2x2 grid (reused) |
| `src/shared/utils/kidModeFilter.ts` | Kid mode filtering utility |
| `src/features/player/utils/progressCalculator.ts` | Time remaining calculation |
| `src/features/player/utils/chapterNavigator.ts` | Chapter position lookup |
