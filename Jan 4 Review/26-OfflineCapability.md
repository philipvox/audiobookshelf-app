# Offline Capability Documentation

## Overview

The app implements an **offline-first architecture** with multiple layers of caching and fallback behavior. Key components:

1. **Library Cache** - 30-day AsyncStorage cache of library items
2. **SQLite Storage** - Local database for downloads, progress, stats, favorites
3. **Sync Queue** - Queues mutations when offline for later sync
4. **Network Monitor** - Tracks connectivity and WiFi status
5. **Downloaded Content** - Full offline playback for downloaded books

---

## Screen-by-Screen Offline Capability

### Fully Offline-Capable Screens

| Screen | Data Source | Offline Behavior |
|--------|-------------|------------------|
| **CDPlayerScreen** | Downloaded files + SQLite progress | Full playback of downloaded books. Streaming fails gracefully with error. |
| **DownloadsScreen** | SQLite downloads table | Full functionality - manages local files |
| **StatsScreen** | SQLite listening_sessions | Full functionality - all data is local |
| **QueueScreen** | SQLite queue table | Full functionality - queue is local |
| **PlaybackSettingsScreen** | AsyncStorage/Zustand | Full functionality - all settings local |
| **JoystickSeekSettingsScreen** | AsyncStorage/Zustand | Full functionality |
| **HapticSettingsScreen** | AsyncStorage/Zustand | Full functionality |
| **ChapterCleaningSettingsScreen** | AsyncStorage/Zustand | Full functionality |
| **StorageSettingsScreen** | SQLite + AsyncStorage | Full functionality for viewing/clearing |
| **SleepTimerPanel** | Zustand store | Full functionality |
| **SpeedPanel** | Zustand store | Full functionality |
| **KidModeSettingsScreen** | Zustand store | Full functionality |

### Partially Offline-Capable Screens (Cached Data)

| Screen | Data Source | Offline Behavior |
|--------|-------------|------------------|
| **HomeScreen** | Library cache + SQLite | Shows cached data. Continue Listening works. Hero section shows cached books. |
| **MyLibraryScreen** | Downloads + Library cache | Downloaded tab: full function. Other tabs: cached data only. |
| **BrowseScreen (Discover)** | Library cache + Recommendations | Shows cached library items. Recommendations based on local history. |
| **BookDetailScreen** | Library cache + SQLite progress | Cached metadata works. Download button works. Play streams or plays offline. |
| **SeriesDetailScreen** | Library cache | Shows cached series/books. Download actions work. |
| **AuthorDetailScreen** | Library cache | Shows cached author info and books. |
| **NarratorDetailScreen** | Library cache | Shows cached narrator info and books. |
| **FilteredBooksScreen** | Library cache | Shows filtered cached books. |
| **SearchScreen** | Library cache (local search) | **Client-side search works** on cached data. Server search fails. |
| **GenreDetailScreen** | Library cache | Shows cached genre books. |
| **GenresListScreen** | Library cache | Shows cached genres. |
| **AuthorsListScreen** | Library cache | Shows cached authors. |
| **NarratorsListScreen** | Library cache | Shows cached narrators. |
| **SeriesListScreen** | Library cache | Shows cached series. |
| **ProfileScreen** | Mixed (user data cached) | Shows cached user info. Some actions may fail. |
| **PreferencesScreen** | SQLite + AsyncStorage | Preferences saved locally. Genre/author preferences work. |
| **ReadingHistoryScreen** | SQLite user_books | Full functionality - local data. |
| **MarkBooksScreen** | Library cache + SQLite | Marking works (queued for sync). |
| **HiddenItemsScreen** | AsyncStorage | Full functionality - local data. |
| **MoodDiscoveryScreen** | Library cache | Mood matching on cached books. |
| **MoodResultsScreen** | Library cache | Shows cached mood-matched books. |
| **CollectionDetailScreen** | Library cache + API | Shows cached collection. Add/remove queued. |
| **WishlistScreen** | AsyncStorage | Full functionality - local wishlist. |

### Network-Required Screens

| Screen | Reason | Offline Behavior |
|--------|--------|------------------|
| **LoginScreen** | Authentication requires server | Shows error. Cannot authenticate offline. |
| **PreferencesOnboardingScreen** | Saves to server | Onboarding fails. Consider caching. |
| **ManualAddScreen (Wishlist)** | Searches external sources | Cannot search without network. |

---

## Degradation Behavior by Feature

### Audio Playback

**Location:** `src/features/player/stores/playerStore.ts:671-710`

```
┌─────────────────────────────────────────────────────────────┐
│                    PLAYBACK DECISION                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Is book downloaded?                                        │
│       │                                                     │
│       ├── YES ──► Play from local files                     │
│       │           /audiobooks/{itemId}/*.m4b                │
│       │                                                     │
│       └── NO ──► Is partial download available?             │
│                       │                                     │
│                       ├── YES ──► Play available files      │
│                       │           Queue remaining           │
│                       │                                     │
│                       └── NO ──► Is online?                 │
│                                       │                     │
│                                       ├── YES ──► Stream    │
│                                       │                     │
│                                       └── NO ──► ERROR      │
│                                           "No connection"   │
└─────────────────────────────────────────────────────────────┘
```

**Auto-Switch to Local:** When a streaming book completes downloading, playback automatically switches to local files without interruption.

### Progress Sync

**Location:** `src/core/api/offlineApi.ts:42-72`

```typescript
// Progress is always saved locally first (instant)
await sqliteCache.setProgress(itemId, currentTime, duration, false);

if (isOnline) {
  try {
    await userApi.updateProgress(...);
    await sqliteCache.markProgressSynced(itemId);
  } catch (error) {
    if (isNetworkError(error)) {
      await syncQueue.enqueue('progress', {...});
    }
  }
} else {
  await syncQueue.enqueue('progress', {...});
}
```

**Behavior:**
- Progress saved to SQLite immediately (< 10ms)
- Server sync attempted if online
- Queued in `sync_queue` table if offline/fails
- Processed when connectivity restored

### Favorites

**Location:** `src/core/api/offlineApi.ts:77-91`

- Saved to SQLite `user_books.is_favorite` immediately
- Queued for server sync (if server supports favorites)
- Optimistic UI update

### Library Data

**Location:** `src/core/cache/libraryCache.ts:225-345`

```
┌─────────────────────────────────────────────────────────────┐
│                    LIBRARY CACHE FLOW                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Try AsyncStorage cache                                  │
│       │                                                     │
│       ├── Found & Valid (< 30 days, same library)           │
│       │       │                                             │
│       │       └── Use cached data immediately               │
│       │           Refresh in background if online           │
│       │                                                     │
│       └── Not found / Expired / Different library           │
│               │                                             │
│               ├── Online ──► Fetch from server              │
│               │              Save to cache                  │
│               │                                             │
│               └── Offline ──► Show error / empty state      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Search

**Location:** `src/features/search/screens/SearchScreen.tsx`

| Search Type | Offline Behavior |
|-------------|------------------|
| **Local search** | Uses `useLibraryCache()` with fuzzy matching - **works offline** |
| **Server search** | Uses `apiClient.searchLibrary()` - **requires network** |

The SearchScreen primarily uses **client-side search** on cached library items, which works offline. Server search is used as a fallback for comprehensive results.

### Downloads

**Location:** `src/core/services/downloadManager.ts`

| State | Behavior |
|-------|----------|
| **Online (WiFi)** | Downloads proceed normally |
| **Online (Cellular)** | Downloads proceed if WiFi-only disabled, else wait |
| **Offline** | Queue paused, resume when connected |
| **WiFi-only enabled** | Cellular downloads show "waiting_wifi" status |

### Cover Images

**Location:** `src/core/cache/useCoverUrl.ts`

- Cover URLs include cache-busting version
- React Native Image component caches downloaded images
- Offline: Shows previously loaded covers, blank for uncached

---

## Network Status UI

### NetworkStatusBar

**Location:** `src/shared/components/NetworkStatusBar.tsx`

Global banner that appears when offline:
- Red background with cloud-off icon
- Message: "No internet connection"
- Slides down from top with animation
- Automatically hides when connection restored

### useNetworkStatus Hook

**Location:** `src/core/hooks/useNetworkStatus.ts`

```typescript
const { isConnected, connectionType, canDownload } = useNetworkStatus();

// Check offline state
const isOffline = useIsOffline();

// Check WiFi
const onWifi = useIsOnWifi();

// Check download permission
const canDownload = useCanDownload();
```

---

## Sync Queue System

**Location:** `src/core/services/syncQueue.ts`

### Queued Actions

| Action | Payload | Processing |
|--------|---------|------------|
| `progress` | `{ itemId, currentTime, duration }` | `apiClient.updateProgress()` |
| `favorite` | `{ itemId }` | Logged (server may not support) |
| `unfavorite` | `{ itemId }` | Logged (server may not support) |
| `add_to_collection` | `{ collectionId, itemId }` | `apiClient.updateCollection()` |
| `remove_from_collection` | `{ collectionId, itemId }` | `apiClient.updateCollection()` |

### Queue Processing

- Triggered on network reconnection
- Maximum 3 retries per item
- Items removed after max retries
- Processes in FIFO order

### Persistence

Queue stored in SQLite `sync_queue` table:
```sql
CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  retry_count INTEGER DEFAULT 0
);
```

---

## Data Freshness

### Cache TTLs

| Cache | TTL | Storage |
|-------|-----|---------|
| Library cache | 30 days | AsyncStorage |
| React Query (library) | 5 minutes | Memory |
| React Query (stats) | 30s - 5min | Memory |
| Cover images | Browser cache | File system |
| Progress | Indefinite (SQLite) | SQLite |
| Downloads | Indefinite | SQLite + Files |

### Stale-While-Revalidate Pattern

Most screens use cached data immediately, then refresh in background:

```typescript
// Non-blocking loading pattern
const cached = cache.get(id);
if (cached) showUI(cached);           // Instant display
fetchFresh(id).then(updateUI);        // Background refresh
```

---

## Error Handling

### OfflineError

**Location:** `src/core/api/errors.ts`

```typescript
export class OfflineError extends Error {
  constructor() {
    super('No internet connection');
    this.name = 'OfflineError';
  }
}
```

### Error Messages

**Location:** `src/core/errors/errorMessages.ts`

| Error | User Message |
|-------|--------------|
| Network timeout | "Connection timed out. Check your internet and try again." |
| Server unreachable | "Couldn't reach the server. Check your connection." |
| Offline action | "This action requires an internet connection." |

### useOfflineAware Hook

**Location:** `src/core/hooks/useNetworkStatus.ts:52-144`

Pattern for offline-aware data fetching:

```typescript
const { data, isLoading, isOfflineData, refetch } = useOfflineAware({
  fetchOnline: () => apiClient.getItems(),
  fetchOffline: () => sqliteCache.getItems(),
  offlineFirst: true,  // Show cached immediately
});
```

---

## SQLite Tables for Offline Support

| Table | Purpose |
|-------|---------|
| `downloads` | Track download status, progress, file paths |
| `user_books` | Progress, favorites, finished state |
| `listening_sessions` | Listening stats (fully offline) |
| `daily_stats` | Aggregated daily stats |
| `sync_queue` | Pending server syncs |
| `library_items` | Cached library metadata |

---

## Recommendations for Improvement

### Currently Missing

1. **Offline onboarding** - PreferencesOnboardingScreen requires network
2. **Cover image pre-caching** - Could pre-cache covers for downloaded books
3. **Offline collection editing** - Collections require network for full sync
4. **Server search fallback** - Could show "search cached items only" message

### Future Enhancements

1. **Sync status indicator** - Show pending sync count in UI
2. **Conflict resolution** - Handle progress conflicts after long offline periods
3. **Selective cache refresh** - Refresh only stale portions of library
4. **Offline mode toggle** - User-controlled offline mode for data saving

---

## Testing Offline Behavior

### Simulate Offline

1. Enable Airplane Mode on device
2. Disable WiFi and cellular in simulator
3. Use `networkMonitor.setWifiOnlyEnabled(true)` + cellular only

### Verify Behavior

| Test | Expected |
|------|----------|
| Play downloaded book | Works fully |
| Play non-downloaded book | Shows "No connection" error |
| View library | Shows cached data |
| Search | Works on cached data |
| View stats | Works (all local) |
| Manage downloads | Works (local operations) |
| Sync progress | Queued, syncs on reconnect |
| Login | Fails with network error |

---

## Summary Table

| Category | # Screens | Offline Support |
|----------|-----------|-----------------|
| **Fully Offline** | 12 | No network needed |
| **Cached/Partial** | 24 | Works with cached data |
| **Network Required** | 3 | Must be online |
| **Total** | 39 | 92% offline-capable |
