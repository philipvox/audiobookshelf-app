# ReadingHistoryWizard & Reading History

Documentation of how books are marked as read, synchronization with the server, and impact on "Continue Listening" logic.

---

## Overview

The Reading History system tracks books the user has completed. It provides:

1. **Manual marking** via the ReadingHistoryWizard (swipe-based interface)
2. **Automatic marking** when playback progress reaches 95%
3. **Two-way sync** with the AudiobookShelf server
4. **Filtering from "Continue Listening"** to remove completed books

**Feature Location:** `src/features/reading-history-wizard/`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MARKING SOURCES                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  1. MarkBooksScreen (Swipe Wizard)         → Manual marking             │
│  2. ReadingHistoryScreen (List View)       → Bulk operations            │
│  3. BookDetailScreen                       → "Mark as Finished" button  │
│  4. Player Progress (>=95%)                → Auto-mark on completion    │
│  5. CompletionStore                        → Quick toggle from UI       │
└─────────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      SQLite user_books TABLE                             │
│                   (Single Source of Truth)                               │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  bookId          │ Primary key                                   │    │
│  │  isFinished      │ Boolean flag                                  │    │
│  │  finishSource    │ 'manual' | 'progress' | 'bulk_author' | ...   │    │
│  │  finishedAt      │ Timestamp when marked                         │    │
│  │  finishedSynced  │ Whether synced to server                      │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      SERVER SYNC SERVICE                                 │
│                    finishedBooksSync.ts                                  │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  syncToServer()    → Push local unsynced books to server         │    │
│  │  importFromServer() → Pull finished status from server           │    │
│  │  fullSync()        → Both directions                             │    │
│  │  syncBook()        → Sync single book immediately                │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    DOWNSTREAM CONSUMERS                                  │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  useContinueListening   → Filters out finished books             │    │
│  │  useRecommendations     → Uses history for scoring               │    │
│  │  useReadingHistory      → Provides isFinished() checks           │    │
│  │  HomeScreen             → Excludes finished from "In Progress"   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/core/services/sqliteCache.ts` | SQLite database with `user_books` table |
| `src/core/hooks/useUserBooks.ts` | React hooks for reading/writing user book data |
| `src/core/services/finishedBooksSync.ts` | Two-way sync with server |
| `src/features/reading-history-wizard/hooks/useReadingHistory.ts` | High-level reading history hook |
| `src/features/reading-history-wizard/screens/MarkBooksScreen.tsx` | Swipe wizard interface |
| `src/features/reading-history-wizard/screens/ReadingHistoryScreen.tsx` | List view of finished books |
| `src/features/completion/stores/completionStore.ts` | Zustand store for quick toggles |
| `src/features/home/hooks/useContinueListening.ts` | Filters finished from continue listening |

---

## Data Model

### UserBook Interface (SQLite)

**Location:** `src/core/services/sqliteCache.ts:124-165`

```typescript
export interface UserBook {
  bookId: string;

  // Progress
  currentTime: number;
  duration: number;
  progress: number;           // currentTime / duration
  currentTrackIndex: number;

  // Status flags
  isFavorite: boolean;
  isFinished: boolean;
  finishSource: 'manual' | 'progress' | 'bulk_author' | 'bulk_series' | null;

  // Timestamps
  lastPlayedAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  addedToLibraryAt: string | null;

  // Sync state
  progressSynced: boolean;
  favoriteSynced: boolean;
  finishedSynced: boolean;
  localUpdatedAt: string;

  // Cached metadata for offline display
  title: string | null;
  author: string | null;
  narrator: string | null;
  coverUrl: string | null;
  seriesName: string | null;
  seriesSequence: number | null;

  // Analytics
  timesCompleted: number;
  userRating: number | null;
  genres: string | null;       // JSON array

  // Per-book settings
  playbackSpeed: number;
}
```

### Finished Threshold Constant

**Location:** `src/features/reading-history-wizard/hooks/useReadingHistory.ts:21`

```typescript
export const FINISHED_THRESHOLD = 0.95;  // 95%
```

This constant is the **single source of truth** for when a book is considered "finished" by progress.

---

## How Books Get Marked as Read

### 1. Manual Marking via MarkBooksScreen (Swipe Wizard)

**Location:** `src/features/reading-history-wizard/screens/MarkBooksScreen.tsx`

Users swipe through cards representing books, authors, or series:

| Swipe Direction | Action |
|-----------------|--------|
| Right | Mark as finished |
| Left | Skip (not interested now) |
| Up | Mark all by author/series |

```typescript
// Uses useUndoableMarkFinished hook
const { mark, bulkMark, undo } = useUndoableMarkFinished();

// Single book
await mark(bookId, 'manual');

// Bulk by author/series
await bulkMark(bookIds, 'bulk_author', authorName);
```

### 2. Manual Marking via ReadingHistoryScreen

**Location:** `src/features/reading-history-wizard/screens/ReadingHistoryScreen.tsx`

Users can:
- View all finished books in a list
- Select multiple books and remove from history
- Sync unsynced books to server

### 3. Auto-Marking on Playback Completion

**Location:** `src/features/player/services/progressService.ts:77`

When playback progress reaches 95%, the book is considered finished:

```typescript
isFinished: progress.position >= progress.duration * 0.95
```

The playerStore may trigger:
```typescript
sqliteCache.markUserBookFinished(bookId, true, 'progress');
```

### 4. Quick Toggle via CompletionStore

**Location:** `src/features/completion/stores/completionStore.ts`

For UI components needing quick access:

```typescript
// Mark complete
await completionStore.markComplete(bookId);

// Mark incomplete
await completionStore.markIncomplete(bookId);

// Toggle
await completionStore.toggleComplete(bookId);
```

This store:
1. Updates local SQLite immediately (optimistic)
2. Syncs to server in background
3. Invalidates React Query caches

---

## Server Synchronization

### finishedBooksSync Service

**Location:** `src/core/services/finishedBooksSync.ts`

#### syncToServer()

Pushes local unsynced finished books to server:

```typescript
async syncToServer(): Promise<{ synced: number; failed: number }> {
  const unsynced = await sqliteCache.getUnsyncedUserBooks();
  const toSync = unsynced.filter((b) => !b.finishedSynced);

  for (const book of toSync) {
    if (book.isFinished) {
      await userApi.markAsFinished(book.bookId, book.duration);
    } else {
      await userApi.markAsNotStarted(book.bookId);
    }
    await sqliteCache.markUserBookSynced(book.bookId, { finished: true });
  }
}
```

#### importFromServer()

Pulls finished status from server for books not yet marked locally:

```typescript
async importFromServer(): Promise<number> {
  const items = await apiClient.getLibraryItems({ limit: 1000 });

  for (const item of items) {
    const serverProgress = item.userMediaProgress;

    // Check if server has this book as finished (95% threshold)
    if (serverProgress.isFinished || serverProgress.progress >= 0.95) {
      const existing = await sqliteCache.getUserBook(item.id);

      if (!existing?.isFinished) {
        await sqliteCache.markUserBookFinished(item.id, true, 'progress');
        await sqliteCache.markUserBookSynced(item.id, { finished: true });
      }
    }
  }
}
```

#### fullSync()

Runs both directions: import first, then sync local changes.

```typescript
async fullSync() {
  const imported = await this.importFromServer();
  const { synced, failed } = await this.syncToServer();
  return { imported, synced, failed };
}
```

### Server API Endpoints

**Location:** `src/core/api/endpoints/user.ts`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `markAsFinished(itemId, duration)` | `PATCH /api/me/progress/{itemId}` | Sets `isFinished: true, progress: 1` |
| `markAsNotStarted(itemId)` | `PATCH /api/me/progress/{itemId}` | Resets progress to 0 |

---

## Impact on Continue Listening

### useContinueListening Hook

**Location:** `src/features/home/hooks/useContinueListening.ts`

This hook fetches in-progress items from the server and filters out completed books:

```typescript
export function useContinueListening() {
  // Get completed books from completion store
  const isComplete = useCompletionStore((state) => state.isComplete);

  const { data } = useQuery({
    queryKey: queryKeys.user.inProgress(),
    queryFn: async () => {
      const response = await apiClient.get('/api/me/items-in-progress');
      return response?.libraryItems || [];
    },
  });

  // Filter out completed books
  const items = (data || [])
    .filter(item => {
      // Skip books marked as complete
      if (isComplete(item.id)) {
        return false;
      }

      // Has progress but not finished
      const progress = item.userMediaProgress?.progress;
      const hasProgress = progress !== undefined && progress > 0 && progress < 1;
      return hasProgress || !!item.progressLastUpdate;
    })
    .sort((a, b) => {
      // Sort by most recently played
      const aTime = a.progressLastUpdate || a.userMediaProgress?.lastUpdate || 0;
      const bTime = b.progressLastUpdate || b.userMediaProgress?.lastUpdate || 0;
      return bTime - aTime;
    });

  return { items, isLoading, refetch };
}
```

### Filtering Logic

A book is **excluded** from Continue Listening when:

1. `completionStore.isComplete(bookId) === true`
2. Server progress is 100% (`progress === 1`)
3. Server `isFinished` flag is true

A book is **included** when:
- `0 < progress < 1` (started but not finished)
- Has `progressLastUpdate` (recently played)

---

## useReadingHistory Hook

**Location:** `src/features/reading-history-wizard/hooks/useReadingHistory.ts`

High-level hook combining SQLite data with server progress:

```typescript
export function useReadingHistory(): UseReadingHistoryResult {
  const { data: finishedBooksData = [] } = useFinishedBooks();
  const items = useLibraryCache((s) => s.items);

  // Build set of finished book IDs
  const finishedBookIds = useMemo(() => {
    const finished = new Set<string>();

    // Add books marked finished in SQLite
    for (const book of finishedBooksData) {
      finished.add(book.bookId);
    }

    // Add books with >= 95% server progress (not yet in SQLite)
    for (const item of items) {
      const progress = item.userMediaProgress?.progress || 0;
      if (progress >= FINISHED_THRESHOLD) {
        finished.add(item.id);
      }
    }

    return finished;
  }, [finishedBooksData, items]);

  return {
    isFinished: (itemId) => finishedBookIds.has(itemId),
    hasBeenStarted: (itemId) => getProgress(itemId) > 0,
    finishedBookIds,
    preferences,           // Reading patterns for recommendations
    getPreferenceBoost,    // Score boost for similar books
    filterUnfinished,      // Exclude finished from lists
    hasHistory: finishedBookIds.size > 0,
  };
}
```

### Preference Extraction

The hook extracts reading patterns for recommendations:

```typescript
interface ReadingPreferences {
  favoriteAuthors: Map<string, number>;  // author -> book count
  favoriteSeries: Map<string, number>;   // series -> book count
  favoriteGenres: Map<string, number>;   // genre -> book count
  totalFinished: number;
}
```

### Preference Boosts

Scores books based on similarity to reading history:

```typescript
interface PreferenceBoost {
  authorBoost: number;   // 0-30 points (15 base + 5 per book)
  seriesBoost: number;   // 0-25 points (10 base + 5 per book)
  genreBoost: number;    // 0-20 points (logarithmic)
  totalBoost: number;    // Sum of above
  reasons: string[];     // Human-readable explanations
}
```

---

## React Query Integration

### Query Keys

**Location:** `src/core/hooks/useUserBooks.ts:14-21`

```typescript
export const userBooksKeys = {
  all: ['user-books'],
  one: (bookId) => ['user-books', bookId],
  favorites: () => ['user-books', 'favorites'],
  finished: () => ['user-books', 'finished'],
  inProgress: () => ['user-books', 'in-progress'],
  unsynced: () => ['user-books', 'unsynced'],
};
```

### Key Hooks

| Hook | Returns |
|------|---------|
| `useFinishedBooks()` | All finished books from SQLite |
| `useFinishedBookIds()` | Set of finished book IDs (efficient lookup) |
| `useIsBookFinished(bookId)` | Boolean for single book |
| `useMarkFinished()` | Mutation to mark book finished |
| `useBulkMarkFinished()` | Mutation for bulk operations |
| `useUndoableMarkFinished()` | Marking with 15-second undo window |

### Undo Support

**Location:** `src/core/hooks/useUserBooks.ts:422-553`

The `useUndoableMarkFinished` hook provides:

```typescript
const {
  mark,              // Mark single book
  unmark,            // Unmark single book
  bulkMark,          // Mark multiple books
  bulkUnmark,        // Unmark multiple books
  undo,              // Reverse last action
  canUndo,           // Whether undo is available
  undoTimeRemaining, // Time left for undo (max 15s)
} = useUndoableMarkFinished();
```

---

## Gallery Store (UI State)

**Location:** `src/features/reading-history-wizard/stores/galleryStore.ts`

Manages UI-only state for the wizard:

```typescript
interface GalleryState {
  // Processed items - go to back of list on return
  processedAuthors: Map<string, number>;
  processedSeries: Map<string, number>;

  // Session tracking
  sessionStartedAt: number | null;
  isSessionActive: boolean;

  // View state
  currentView: 'all' | 'smart' | 'author' | 'series';

  // Filters for ReadingHistoryScreen
  filters: FilterState;
}
```

**Note:** This store only handles wizard navigation state. Actual finished book data is in SQLite via `useUserBooks` hooks.

---

## Navigation

### Routes

| Route | Component | Access |
|-------|-----------|--------|
| `ReadingHistoryWizard` | `MarkBooksScreen` | Profile > Reading History > "Mark Books" |
| `ReadingHistory` | `ReadingHistoryScreen` | Profile > Reading History |

### Hidden UI Elements

During the wizard, both `FloatingTabBar` and `GlobalMiniPlayer` are hidden:

```typescript
const hiddenRoutes = ['ReadingHistoryWizard', ...];
```

---

## Data Flow Diagram

```
User Action                    Storage Update                 Downstream Effect
───────────────────────────────────────────────────────────────────────────────

[Swipe right on book]      →  SQLite: isFinished = true      →  Removed from
                              finishSource = 'manual'            Continue Listening
                              finishedSynced = false

[Background sync runs]     →  Server: PATCH /api/me/progress →  Server state
                              SQLite: finishedSynced = true      updated

[Playback reaches 95%]     →  SQLite: isFinished = true      →  Removed from
                              finishSource = 'progress'          Continue Listening

[App startup]              →  Import from server              →  Local state
                              Sync unsynced to server            synchronized

[Remove from history]      →  SQLite: isFinished = false     →  Added back to
                              Server: reset progress             Continue Listening
```

---

## Sync Status Indicators

In `ReadingHistoryScreen`, books show sync status:

| Icon | Status |
|------|--------|
| `CloudCheck` (green) | Synced to server |
| `CloudUpload` (gray) | Not yet synced |

The stats card shows:
- Total finished books count
- Total hours listened
- Synced vs unsynced count
- Progress bar for sync percentage
- "Sync All" button for manual sync

---

## Integration with Recommendations

The `useRecommendations` hook uses reading history to:

1. **Score books** based on author/series/genre from finished books
2. **Group recommendations** by source (e.g., "Because you finished X")
3. **Determine hasPreferences** flag for showing onboarding prompts

```typescript
// From finished books, extract:
- Authors with counts → 40-80 point boost for same author
- Series with counts  → 35-70 point boost for same series
- Genres with counts  → 5-50 point boost for matching genres
```

---

## Summary

The Reading History system:

1. **Stores** finished status in SQLite `user_books` table (local-first)
2. **Syncs** bidirectionally with AudiobookShelf server
3. **Marks** books via swipe wizard, list view, book detail, or auto (95%)
4. **Filters** finished books from Continue Listening
5. **Feeds** recommendation engine with reading patterns
6. **Provides** undo support (15-second window) for accidental marks
