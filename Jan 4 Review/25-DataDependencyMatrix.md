# Data Dependency Matrix

This document maps each screen to its data sources, categorized by origin: **Server** (API calls), **Cache** (AsyncStorage/SQLite), or **Local State** (Zustand stores, React state).

---

## Legend

| Symbol | Meaning |
|--------|---------|
| **S** | Server API call (React Query) |
| **C** | Cache (AsyncStorage/SQLite/libraryCache) |
| **L** | Local state (Zustand store) |
| **P** | Props/Navigation params |

---

## Main Tab Screens

### HomeScreen

| Data | Source | Hook/Store | Stale Time |
|------|--------|------------|------------|
| Current playing book | L | `usePlayerStore` | Real-time |
| Items in progress | S | `useQuery(inProgress)` | 2 min |
| Playlists | S | `useQuery(playlists)` | 5 min |
| Library favorites | L | `useMyLibraryStore.libraryIds` | - |
| Favorite series | L | `useMyLibraryStore.favoriteSeriesNames` | - |
| Library items cache | C | `useLibraryCache` | 30 days |
| Downloads | C | `useDownloads` (SQLite) | Real-time |
| Kid mode state | L | `useKidModeStore` | - |

**Offline:** Partial - shows downloaded books + cached data, in-progress requires network

---

### MyLibraryScreen

| Data | Source | Hook/Store | Stale Time |
|------|--------|------------|------------|
| Downloaded books | C | `useDownloads` (SQLite) | Real-time |
| Library cache | C | `useLibraryCache` | 30 days |
| In-progress books | S | `useContinueListening` | 2 min |
| Favorites (books) | L | `useMyLibraryStore.libraryIds` | - |
| Favorites (series) | L | `useMyLibraryStore.favoriteSeriesNames` | - |
| Favorites (authors/narrators) | L | `usePreferencesStore` | - |
| Completion status | L+C | `useCompletionStore` (SQLite) | - |

**Offline:** Full for Downloaded tab, partial for others

---

### BrowseScreen (Discover)

| Data | Source | Hook/Store | Stale Time |
|------|--------|------------|------------|
| All library items | C | `useLibraryCache.items` | 30 days |
| In-progress items | S | `useContinueListening` | 2 min |
| Downloaded IDs | C | `downloadManager.subscribe()` | Real-time |
| Reading history | C | `useReadingHistory` (SQLite) | - |
| Recommendations | L (computed) | `useRecommendations` | - |
| Mood session | L | `useMoodDiscoveryStore` | 24h expiry |
| Mood recommendations | L (computed) | `useMoodRecommendations` | - |
| Kid mode state | L | `useKidModeStore` | - |

**Offline:** Full - all data from local cache

---

### SearchScreen

| Data | Source | Hook/Store | Stale Time |
|------|--------|------------|------------|
| Library items | C | `useLibraryCache` | 30 days |
| Authors | C | `useLibraryCache.getAllAuthors()` | 30 days |
| Series | C | `useLibraryCache.getAllSeries()` | 30 days |
| Narrators | C | `useLibraryCache.getAllNarrators()` | 30 days |
| Genres | C | `useLibraryCache.getAllGenres()` | 30 days |
| Search history | C | AsyncStorage (`search_history_v1`) | - |
| Kid mode state | L | `useKidModeStore` | - |

**Offline:** Full - entirely local search

---

### ProfileScreen

| Data | Source | Hook/Store | Stale Time |
|------|--------|------------|------------|
| User info | S+L | `useAuthStore` | Cached on login |
| Server info | S+L | `useAuthStore.serverUrl` | - |
| Download count | C | `useDownloads` | Real-time |
| Total downloaded size | C | `downloadManager.getTotalDownloadedSize()` | - |
| Theme settings | L | `useThemeStore` | - |
| Kid mode state | L | `useKidModeStore` | - |

**Offline:** Full - all settings stored locally

---

## Detail Screens

### BookDetailScreen

| Data | Source | Hook/Store | Stale Time |
|------|--------|------------|------------|
| Book details | S+C | `useBookDetails` | 5 min (cache first) |
| Cached book | C | `useLibraryCache.getItem()` | 30 days |
| Download status | C | `useDownloadStatus` (SQLite) | Real-time |
| Player state | L | `usePlayerStore` | Real-time |
| Is favorited | L | `useMyLibraryStore.libraryIds` | - |
| Bookmarks | L | `usePlayerStore.bookmarks` | - |
| Reading history | C | `useReadingHistory` | - |

**Offline:** Partial - cached metadata shown, full details need network

---

### SeriesDetailScreen

| Data | Source | Hook/Store | Stale Time |
|------|--------|------------|------------|
| Series + books | S | `apiClient.getSeries(id)` | Direct fetch |
| Cached series | C | `useLibraryCache.getSeries()` | 30 days |
| Is favorited | L | `useMyLibraryStore.favoriteSeriesNames` | - |
| Download status (per book) | C | `useDownloadStatus` | Real-time |
| Reading history | C | `useReadingHistory` | - |

**Offline:** Partial - cached series shown

---

### AuthorDetailScreen

| Data | Source | Hook/Store | Stale Time |
|------|--------|------------|------------|
| Author + books | S | `apiClient.getAuthor(id)` | Direct fetch |
| Cached author | C | `useLibraryCache.getAuthor()` | 30 days |
| Is favorited | L | `usePreferencesStore.favoriteAuthors` | - |
| Download status (per book) | C | `useDownloadStatus` | Real-time |

**Offline:** Partial - cached author shown

---

### NarratorDetailScreen

| Data | Source | Hook/Store | Stale Time |
|------|--------|------------|------------|
| Narrator books | S | `apiClient.getLibraryItems(narrator filter)` | Direct fetch |
| Is favorited | L | `usePreferencesStore.favoriteNarrators` | - |
| Download status (per book) | C | `useDownloadStatus` | Real-time |

**Offline:** None - requires server

---

## Player Screens

### CDPlayerScreen

| Data | Source | Hook/Store | Stale Time |
|------|--------|------------|------------|
| Current book | L | `usePlayerStore.currentBook` | Real-time |
| Position/Duration | L | `usePlayerStore.position/duration` | Real-time |
| Is playing | L | `usePlayerStore.isPlaying` | Real-time |
| Chapters | L | `usePlayerStore.chapters` | - |
| Current chapter | L | `useCurrentChapterIndex` | - |
| Sleep timer | L | `usePlayerStore.sleepTimer*` | - |
| Playback speed | L | `usePlayerStore.playbackRate` | - |
| Bookmarks | L | `usePlayerStore.bookmarks` | - |
| Queue count | L | `useQueueStore.queue.length` | - |
| Download status | C | `useIsOfflineAvailable` | Real-time |
| Skip intervals | L | `usePlayerStore.skip*Interval` | - |

**Offline:** Full (for downloaded books)

---

### QueueScreen

| Data | Source | Hook/Store | Stale Time |
|------|--------|------------|------------|
| Queue items | L+C | `useQueueStore.queue` | Real-time |
| Autoplay enabled | L | `useQueueStore.autoplayEnabled` | - |
| Auto series book ID | L | `useQueueStore.autoSeriesBookId` | - |

**Offline:** Full - queue persisted to SQLite

---

## List Screens

### AuthorsListScreen

| Data | Source | Hook/Store | Stale Time |
|------|--------|------------|------------|
| Authors | S | `useAuthors(libraryId)` | 10 min |

**Offline:** None - requires server

---

### SeriesListScreen

| Data | Source | Hook/Store | Stale Time |
|------|--------|------------|------------|
| Series | S | `useSeries(libraryId)` | 10 min |

**Offline:** None - requires server

---

### NarratorsListScreen

| Data | Source | Hook/Store | Stale Time |
|------|--------|------------|------------|
| Narrators | S | `useNarrators(libraryId)` | 10 min |

**Offline:** None - requires server

---

### GenresListScreen

| Data | Source | Hook/Store | Stale Time |
|------|--------|------------|------------|
| Genres | C | `getGenresByPopularity()` | 30 days |

**Offline:** Full - from library cache

---

### DownloadsScreen

| Data | Source | Hook/Store | Stale Time |
|------|--------|------------|------------|
| All downloads | C | `useDownloads` (SQLite) | Real-time |
| Active downloads | C | `downloadManager.activeDownloads` | Real-time |
| Download queue | C | SQLite `download_queue` | Real-time |
| Storage info | C | `downloadManager.getTotalDownloadedSize()` | - |
| Library cache | C | `useLibraryCache` | 30 days |
| WiFi-only setting | L | `networkMonitor` | - |

**Offline:** Full

---

## Stats & Settings Screens

### StatsScreen

| Data | Source | Hook/Store | Stale Time |
|------|--------|------------|------------|
| Today stats | C | `sqliteCache.getTodayStats()` | 30 sec |
| Weekly stats | C | `sqliteCache.getWeeklyStats()` | 1 min |
| Streak | C | `sqliteCache.getListeningStreak()` | 1 min |
| All-time stats | C | `sqliteCache.getAllTimeStats()` | 5 min |
| Top books | C | `sqliteCache.getTopBooks()` | 5 min |
| By hour | C | `sqliteCache.getListeningByHour()` | 5 min |

**Offline:** Full - all data from local SQLite

---

### StorageSettingsScreen

| Data | Source | Hook/Store | Stale Time |
|------|--------|------------|------------|
| Downloads | C | `useDownloads` | Real-time |
| Total download size | C | `downloadManager.getTotalDownloadedSize()` | - |
| Library cache | C | `useLibraryCache` | 30 days |
| WiFi-only setting | L | `networkMonitor` | - |

**Offline:** Full

---

### PlaybackSettingsScreen

| Data | Source | Hook/Store | Stale Time |
|------|--------|------------|------------|
| Skip intervals | L | `usePlayerStore.skip*Interval` | - |
| Auto-rewind | L | `usePlayerStore.autoRewindEnabled` | - |
| Shake-to-rewind | L | `usePlayerStore.shakeEnabled` | - |

**Offline:** Full

---

### HapticSettingsScreen

| Data | Source | Hook/Store | Stale Time |
|------|--------|------------|------------|
| Haptic settings | L | `useHapticSettingsStore` | - |

**Offline:** Full

---

### ChapterCleaningSettingsScreen

| Data | Source | Hook/Store | Stale Time |
|------|--------|------------|------------|
| Cleaning level | L | `useChapterCleaningStore.level` | - |
| Show original | L | `useChapterCleaningStore.showOriginalNames` | - |

**Offline:** Full

---

### PreferencesScreen

| Data | Source | Hook/Store | Stale Time |
|------|--------|------------|------------|
| Favorite authors | L | `usePreferencesStore.favoriteAuthors` | - |
| Favorite narrators | L | `usePreferencesStore.favoriteNarrators` | - |
| Genre weights | L | `usePreferencesStore.genreWeights` | - |
| Reading goal | L | `usePreferencesStore.readingGoal` | - |

**Offline:** Full

---

## Data Source Summary

### Server API (React Query)

| Endpoint | Used By | Stale Time |
|----------|---------|------------|
| `/api/me/items-in-progress` | Home, Browse, Library | 2 min |
| `/api/libraries/{id}/items` | Library cache refresh | 30 days |
| `/api/libraries/{id}/authors` | AuthorsListScreen | 10 min |
| `/api/libraries/{id}/series` | SeriesListScreen | 10 min |
| `/api/items/{id}` | BookDetailScreen | 5 min |
| `/api/authors/{id}` | AuthorDetailScreen | Direct |
| `/api/series/{id}` | SeriesDetailScreen | Direct |
| `/api/playlists` | HomeScreen | 5 min |

---

### SQLite Tables

| Table | Used By | Data |
|-------|---------|------|
| `downloads` | DownloadsScreen, Library | Download status, progress |
| `download_queue` | DownloadsScreen | Pending downloads |
| `playback_queue` | QueueScreen | User queue |
| `listening_sessions` | StatsScreen | Session history |
| `user_books` | Library, Stats | Completion status, history |
| `library_cache` | All browse screens | Full library metadata |

---

### AsyncStorage Keys

| Key | Used By | Data |
|-----|---------|------|
| `auth-storage` | Auth | Server URL, token, user |
| `my-library-store` | Library | Favorite book IDs, series |
| `preferences-store` | Browse, Preferences | Authors, narrators, genres |
| `player-settings` | Player | Speed, intervals, bookmarks |
| `haptic-settings` | Haptics | Per-category toggles |
| `chapter-cleaning-settings` | Player | Cleaning level |
| `theme-store` | All | Theme preference |
| `kid-mode-store` | All | Kid mode state |
| `search_history_v1` | Search | Recent searches |
| `queue_autoplay_enabled` | Queue | Autoplay preference |

---

### Zustand Stores (In-Memory + Persisted)

| Store | Persisted | Key Data |
|-------|-----------|----------|
| `usePlayerStore` | Partial | Current book, position, settings |
| `useQueueStore` | SQLite | Queue items, autoplay |
| `useMyLibraryStore` | AsyncStorage | Favorite books, series |
| `usePreferencesStore` | AsyncStorage | Author/narrator favorites |
| `useAuthStore` | AsyncStorage | Server, token, user |
| `useThemeStore` | AsyncStorage | Dark/light mode |
| `useKidModeStore` | AsyncStorage | Kid mode enabled |
| `useHapticSettingsStore` | AsyncStorage | Haptic preferences |
| `useChapterCleaningStore` | AsyncStorage | Cleaning level |
| `useMoodDiscoveryStore` | AsyncStorage | Active mood session |
| `useCompletionStore` | SQLite | Manual completions |

---

## Offline Capability Matrix

| Screen | Offline Support | Notes |
|--------|-----------------|-------|
| HomeScreen | Partial | Downloads + cache shown |
| MyLibraryScreen | Partial | Downloaded tab full |
| BrowseScreen | Full | All from cache |
| SearchScreen | Full | Local search |
| ProfileScreen | Full | Local settings |
| BookDetailScreen | Partial | Cached metadata |
| CDPlayerScreen | Full | For downloaded books |
| QueueScreen | Full | SQLite persisted |
| DownloadsScreen | Full | SQLite persisted |
| StatsScreen | Full | SQLite persisted |
| AuthorsListScreen | None | Server required |
| SeriesListScreen | None | Server required |
| All Settings | Full | Local storage |
