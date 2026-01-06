# LibraryTab (MyLibraryScreen) Documentation

**File:** `src/features/library/screens/MyLibraryScreen.tsx`

## Overview

The LibraryTab is the user's personal collection view, displaying downloaded content, favorites, and listening progress. It uses a **hybrid data architecture**: local-first for downloads (offline-capable) with server-side in-progress data.

---

## 5 Filter States (Tabs)

| Tab | Type | What It Shows |
|-----|------|---------------|
| **All** | `'all'` | Union of downloaded + favorited + in-progress books (deduplicated) |
| **Downloaded** | `'downloaded'` | Only locally downloaded books (`status === 'complete'`) |
| **In Progress** | `'in-progress'` | Books from server API with `0 < progress < 0.95` |
| **Completed** | `'completed'` | Books with `progress >= 0.95` OR marked finished |
| **Favorites** | `'favorites'` | Heart-favorited books, authors, series, narrators |

### Tab Implementation (lines 629-650)

```typescript
const currentTabBooks = useMemo(() => {
  switch (activeTab) {
    case 'downloaded':
      return enrichedBooks;  // From downloadManager
    case 'in-progress':
      return serverInProgressBooks;  // From API
    case 'completed':
      const downloadedCompleted = enrichedBooks.filter(
        b => b.progress >= 0.95 || isMarkedFinished(b.id)
      );
      return [...downloadedCompleted, ...markedFinishedBooks];
    case 'favorites':
      return favoritedBooks;
    default: // 'all'
      return allLibraryBooks;  // Union with deduplication
  }
}, [...]);
```

---

## Data Sources & Fetching

### 1. Downloads (Local - SQLite)
- **Source:** `useDownloads()` -> `downloadManager` (`:370`)
- **Storage:** SQLite via `downloadManager.ts`
- **Status values:** `'pending' | 'downloading' | 'paused' | 'complete' | 'error'`
- **Available offline:** Yes - stored locally

```typescript
const { downloads } = useDownloads();
const completedDownloads = downloads.filter(d => d.status === 'complete');
```

### 2. In-Progress Books (Server API)
- **Source:** `useContinueListening()` (`:391`)
- **API endpoint:** `GET /api/me/items-in-progress`
- **Cache:** React Query with 2-minute stale time
- **Available offline:** No - requires server

```typescript
// From useContinueListening.ts:30-38
const { data } = useQuery({
  queryKey: queryKeys.user.inProgress(),
  queryFn: () => apiClient.get('/api/me/items-in-progress'),
  staleTime: 1000 * 60 * 2,  // 2 minutes
  placeholderData: (prev) => prev,  // Show stale data while refetching
});
```

### 3. Library Cache (Server + Local)
- **Source:** `useLibraryCache()` (`:369`)
- **Storage:** AsyncStorage with 30-day TTL
- **Purpose:** Metadata lookup for downloaded books
- **Available offline:** Yes - cached locally

### 4. Favorites (Local - AsyncStorage)
- **Books:** `useMyLibraryStore().libraryIds` (`:375`)
- **Series:** `useMyLibraryStore().favoriteSeriesNames` (`:376`)
- **Authors/Narrators:** `usePreferencesStore()` (`:377-378`)
- **Available offline:** Yes - stored in AsyncStorage

---

## Data Fetching vs Local Filtering

| Data Type | Fetch Source | Where Filtered |
|-----------|--------------|----------------|
| Downloaded books | `downloadManager` (SQLite) | **Locally** in screen |
| In-progress | API `/api/me/items-in-progress` | API returns filtered, **locally** sorted |
| Completed | Local downloads + SQLite `user_books` | **Locally** by progress >= 0.95 |
| Favorites | AsyncStorage (Zustand stores) | **Locally** - IDs matched to cache |
| Book metadata | `libraryCache` (AsyncStorage) | N/A - used for enrichment |

### Enrichment Flow (lines 424-460)

```typescript
const enrichedBooks = useMemo<EnrichedBook[]>(() => {
  return completedDownloads.map((download) => {
    const item = getItem(download.itemId);  // From cache
    return {
      id: download.itemId,
      item,
      title: metadata.title,
      progress: getProgress(item),  // From userMediaProgress
      isDownloaded: true,
      // ... more fields
    };
  });
}, [completedDownloads, getItem]);
```

---

## Sort Options

**File:** `src/features/library/components/SortPicker.tsx`

| Sort Option | Value | Sort Logic |
|-------------|-------|------------|
| Recently Played | `'recently-played'` | `lastPlayedAt` descending |
| Recently Added | `'recently-added'` | `addedAt` descending |
| Title A-Z | `'title-asc'` | `title.localeCompare()` |
| Title Z-A | `'title-desc'` | `title.localeCompare()` reversed |
| Author A-Z | `'author-asc'` | `author.localeCompare()` |
| Duration (short first) | `'duration-asc'` | Shortest first |
| Duration (long first) | `'duration-desc'` | Longest first |

### Sort Implementation (lines 653-674)

```typescript
const sortedBooks = useMemo(() => {
  const sorted = [...currentTabBooks];
  switch (sort) {
    case 'recently-played':
      return sorted.sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0));
    case 'title-asc':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    // ... other cases
  }
}, [currentTabBooks, sort]);
```

**Note:** Sort picker is hidden on **Favorites** and **In Progress** tabs (line 1341).

---

## Offline Behavior

### What Works Offline

| Feature | Offline Support | Reason |
|---------|-----------------|--------|
| Downloaded tab | Full | Data from local SQLite |
| Play downloaded books | Full | Audio files stored locally |
| Favorites list | Full | IDs in AsyncStorage |
| Search within downloads | Full | Local filtering |
| Sort controls | Full | Local operations |
| All tab (downloads only) | Partial | Shows downloaded + cached |

### What Requires Network

| Feature | Offline Behavior |
|---------|------------------|
| In Progress tab | Shows stale data or empty |
| Refresh (pull-to-refresh) | Fails silently |
| Book metadata (for non-cached) | Falls back to "Unknown Title" |
| Cover images (uncached) | Shows placeholder |

### Offline Detection Pattern

The screen doesn't explicitly detect offline state but handles it gracefully:

```typescript
// Refresh handler (lines 751-764)
const handleRefresh = useCallback(async () => {
  try {
    await Promise.all([
      loadCache(currentLibraryId, true),
      refetchContinueListening(),
    ]);
  } catch (error) {
    // Silently fail - cache will show stale data
  }
}, [...]);
```

### Cache Strategy

| Cache | Storage | TTL | Offline Persistence |
|-------|---------|-----|---------------------|
| Library items | AsyncStorage | 30 days | Yes |
| Downloads | SQLite | Permanent | Yes |
| In-progress | React Query | 2 min | Memory only |
| Favorites | AsyncStorage | Permanent | Yes |

---

## Data Flow Diagram

```
+------------------------------------------------------------------+
|                       MyLibraryScreen                             |
+------------------------------------------------------------------+
|                                                                   |
|  +------------------+    +------------------+                     |
|  |  downloadManager |    |   libraryCache   |                     |
|  |     (SQLite)     |    |  (AsyncStorage)  |                     |
|  +--------+---------+    +--------+---------+                     |
|           |                       |                               |
|           v                       v                               |
|  +--------------------------------------------------------+      |
|  |                    enrichedBooks                        |      |
|  |         (downloads + metadata from cache)               |      |
|  +--------------------------------------------------------+      |
|                              |                                    |
|           +------------------+------------------+                  |
|           v                  v                  v                  |
|  +---------------+   +---------------+   +---------------+        |
|  |  Downloaded   |   |  In Progress  |   |   Favorites   |        |
|  |     Tab       |   |     Tab       |   |     Tab       |        |
|  |   (local)     |   |  (API data)   |   |   (local)     |        |
|  +---------------+   +---------------+   +---------------+        |
|                                                                   |
|  +--------------------------------------------------------+      |
|  |                 useContinueListening()                  |      |
|  |           GET /api/me/items-in-progress                 |      |
|  |                  (server-side)                          |      |
|  +--------------------------------------------------------+      |
|                                                                   |
+------------------------------------------------------------------+
```

---

## Key Stores

| Store | File | Purpose |
|-------|------|---------|
| `useMyLibraryStore` | `stores/myLibraryStore.ts` | Book favorites, series favorites |
| `usePreferencesStore` | `recommendations/stores/preferencesStore.ts` | Author/narrator favorites |
| `useCompletionStore` | `features/completion` | Manual "mark as complete" |
| `useLibraryCache` | `core/cache/libraryCache.ts` | Full library metadata cache |

---

## Related Files

- `src/features/library/stores/myLibraryStore.ts` - Favorite books/series state
- `src/features/library/components/SortPicker.tsx` - Sort dropdown component
- `src/features/library/components/LibraryEmptyState.tsx` - Tab-specific empty states
- `src/features/home/hooks/useContinueListening.ts` - In-progress API hook
- `src/core/cache/libraryCache.ts` - Library metadata cache
- `src/core/hooks/useDownloads.ts` - Download status hooks
- `src/features/recommendations/stores/preferencesStore.ts` - Author/narrator favorites
