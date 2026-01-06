# Edit Specification: SQLite Cache

**Covers Action Plan Items:** 1.6
**Priority:** Critical (Phase 1)
**Effort:** L (Large) - 2-3 days

---

## Current State

### sqliteCache.ts
- **File:** `src/core/services/sqliteCache.ts`
- **Lines:** 3,310 (third largest file)
- **Console.log statements:** 116 (highest in codebase)
- **Domains mixed in single file:**
  - Downloads management
  - Listening stats
  - Queue persistence
  - User books (finished, progress)
  - Bookmarks
  - Playback progress
  - Sync metadata
  - Favorites

### Tables Managed
```sql
-- From file analysis
downloads          -- Download records with status
listening_stats    -- Per-session playback stats
queue              -- Playback queue items
user_books         -- User reading state per book
bookmarks          -- User bookmarks per book
playback_progress  -- Position/duration sync
sync_metadata      -- Key-value sync state
favorites          -- Favorited items
sync_queue         -- Offline actions queue
sync_log           -- Sync operation history
```

---

## Issues Identified

| Issue | Source | Severity |
|-------|--------|----------|
| 3,310 lines in single file - unmaintainable | [28], [29], [30] #5 | High |
| 116 console.log statements | [28] | Medium |
| Mixed domains - downloads, stats, queue, user_books | [28] | High |
| No clear domain separation | [29] | Medium |
| Difficult to test individual domains | [28] | Medium |

---

## Alignment Requirements

From [30] Executive Summary:
- libraryCache.ts (771 lines) has 39 dependents and "works well" - different file, do not confuse
- sqliteCache is internal service, changes should not affect public API

From [31] Alignment Audit:
- Progress storage uses sqliteCache as "single source of truth" - must maintain this
- Queue persistence via sqliteCache must remain intact

---

## Target State

Split into domain-specific files with a facade for backwards compatibility:

```
src/core/services/sqlite/
├── index.ts              (facade - re-exports for backwards compat)
├── sqliteDownloads.ts    (~500 lines)
├── sqliteStats.ts        (~400 lines)
├── sqliteQueue.ts        (~300 lines)
├── sqliteUserBooks.ts    (~400 lines)
├── sqliteBookmarks.ts    (~200 lines)
├── sqliteProgress.ts     (~300 lines)
├── sqliteSync.ts         (~400 lines)
├── sqliteCore.ts         (~200 lines - db connection, migrations)
└── types.ts              (~100 lines - shared interfaces)
```

---

## Specific Changes

### Step 1: Create sqlite directory and types

**New file:** `src/core/services/sqlite/types.ts`

```typescript
// All interfaces from current sqliteCache.ts
export interface CachedAuthor { ... }
export interface CachedSeries { ... }
export interface CachedNarrator { ... }
export interface PlaybackProgress { ... }
export interface SyncMetadata { ... }
export interface FavoriteItem { ... }
export interface SyncQueueItem { ... }
export interface DownloadRecord { ... }
export interface SyncLogEntry { ... }
export interface QueueItem { ... }
export interface BookmarkRecord { ... }
export interface UserBook { ... }
export interface ListeningSession { ... }
```

### Step 2: Extract sqliteCore.ts

**New file:** `src/core/services/sqlite/sqliteCore.ts`

```typescript
// Database connection and migrations only
import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('audiobookshelf.db');
  await runMigrations(db);
  return db;
}

export async function runMigrations(database: SQLite.SQLiteDatabase) {
  // All CREATE TABLE statements
}

export async function closeDatabase() {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}
```

### Step 3: Extract sqliteDownloads.ts

**From:** `sqliteCache.ts` lines ~200-700 (download-related functions)
**To:** `src/core/services/sqlite/sqliteDownloads.ts`

```typescript
import { getDatabase } from './sqliteCore';
import { DownloadRecord } from './types';

export async function getDownloadRecord(itemId: string): Promise<DownloadRecord | null> { ... }
export async function upsertDownloadRecord(record: DownloadRecord): Promise<void> { ... }
export async function getAllDownloads(): Promise<DownloadRecord[]> { ... }
export async function deleteDownloadRecord(itemId: string): Promise<void> { ... }
export async function updateDownloadStatus(itemId: string, status: string, progress?: number): Promise<void> { ... }
export async function getDownloadsByStatus(status: string): Promise<DownloadRecord[]> { ... }
```

### Step 4: Extract sqliteStats.ts

**From:** `sqliteCache.ts` listening stats functions
**To:** `src/core/services/sqlite/sqliteStats.ts`

```typescript
import { getDatabase } from './sqliteCore';
import { ListeningSession } from './types';

export async function recordListeningSession(session: ListeningSession): Promise<void> { ... }
export async function getSessionsForPeriod(start: Date, end: Date): Promise<ListeningSession[]> { ... }
export async function getTotalListeningTime(): Promise<number> { ... }
export async function getListeningStreak(): Promise<number> { ... }
export async function getDailyStats(date: Date): Promise<DailyStats> { ... }
export async function getHourlyHeatmap(): Promise<HourlyHeatmap> { ... }
```

### Step 5: Extract sqliteQueue.ts

**From:** `sqliteCache.ts` queue functions
**To:** `src/core/services/sqlite/sqliteQueue.ts`

```typescript
import { getDatabase } from './sqliteCore';
import { QueueItem } from './types';

export async function getQueue(): Promise<QueueItem[]> { ... }
export async function addToQueue(item: QueueItem): Promise<void> { ... }
export async function removeFromQueue(id: string): Promise<void> { ... }
export async function reorderQueue(items: QueueItem[]): Promise<void> { ... }
export async function clearQueue(): Promise<void> { ... }
```

### Step 6: Extract sqliteUserBooks.ts

**From:** `sqliteCache.ts` user_books functions
**To:** `src/core/services/sqlite/sqliteUserBooks.ts`

```typescript
import { getDatabase } from './sqliteCore';
import { UserBook } from './types';

export async function getUserBook(bookId: string): Promise<UserBook | null> { ... }
export async function markBookFinished(bookId: string): Promise<void> { ... }
export async function unmarkBookFinished(bookId: string): Promise<void> { ... }
export async function getFinishedBooks(): Promise<string[]> { ... }
export async function updateUserBookProgress(bookId: string, progress: number): Promise<void> { ... }
```

### Step 7: Extract sqliteBookmarks.ts

**From:** `sqliteCache.ts` bookmark functions
**To:** `src/core/services/sqlite/sqliteBookmarks.ts`

```typescript
import { getDatabase } from './sqliteCore';
import { BookmarkRecord } from './types';

export async function getBookmarks(bookId: string): Promise<BookmarkRecord[]> { ... }
export async function addBookmark(bookmark: BookmarkRecord): Promise<void> { ... }
export async function updateBookmark(id: string, updates: Partial<BookmarkRecord>): Promise<void> { ... }
export async function deleteBookmark(id: string): Promise<void> { ... }
```

### Step 8: Extract sqliteProgress.ts

**From:** `sqliteCache.ts` playback progress functions
**To:** `src/core/services/sqlite/sqliteProgress.ts`

```typescript
import { getDatabase } from './sqliteCore';
import { PlaybackProgress } from './types';

export async function getProgress(itemId: string): Promise<PlaybackProgress | null> { ... }
export async function saveProgress(progress: PlaybackProgress): Promise<void> { ... }
export async function getUnsyncedProgress(): Promise<PlaybackProgress[]> { ... }
export async function markProgressSynced(itemId: string): Promise<void> { ... }
```

### Step 9: Extract sqliteSync.ts

**From:** `sqliteCache.ts` sync queue and log functions
**To:** `src/core/services/sqlite/sqliteSync.ts`

```typescript
import { getDatabase } from './sqliteCore';
import { SyncQueueItem, SyncLogEntry, SyncMetadata } from './types';

// Sync queue
export async function addToSyncQueue(action: string, payload: object): Promise<void> { ... }
export async function getSyncQueue(): Promise<SyncQueueItem[]> { ... }
export async function removeSyncQueueItem(id: number): Promise<void> { ... }

// Sync log
export async function logSyncOperation(entry: Omit<SyncLogEntry, 'id'>): Promise<void> { ... }
export async function getSyncLog(limit?: number): Promise<SyncLogEntry[]> { ... }

// Sync metadata
export async function getSyncMetadata(key: string): Promise<string | null> { ... }
export async function setSyncMetadata(key: string, value: string): Promise<void> { ... }
```

### Step 10: Create facade (index.ts)

**New file:** `src/core/services/sqlite/index.ts`

```typescript
// Re-export all for backwards compatibility
export * from './types';
export * from './sqliteCore';
export * from './sqliteDownloads';
export * from './sqliteStats';
export * from './sqliteQueue';
export * from './sqliteUserBooks';
export * from './sqliteBookmarks';
export * from './sqliteProgress';
export * from './sqliteSync';

// Legacy sqliteCache object for existing imports
import * as downloads from './sqliteDownloads';
import * as stats from './sqliteStats';
import * as queue from './sqliteQueue';
import * as userBooks from './sqliteUserBooks';
import * as bookmarks from './sqliteBookmarks';
import * as progress from './sqliteProgress';
import * as sync from './sqliteSync';
import * as core from './sqliteCore';

export const sqliteCache = {
  // Core
  initialize: core.getDatabase,
  close: core.closeDatabase,

  // Downloads
  ...downloads,

  // Stats
  ...stats,

  // Queue
  ...queue,

  // User books
  ...userBooks,

  // Bookmarks
  ...bookmarks,

  // Progress
  ...progress,

  // Sync
  ...sync,
};
```

### Step 11: Update imports throughout codebase

**Files to update:**
```
src/features/player/stores/playerStore.ts
src/features/queue/stores/queueStore.ts
src/features/downloads/services/downloadManager.ts
src/features/stats/hooks/useStats.ts
src/core/services/finishedBooksSync.ts
+ any other files importing from sqliteCache
```

Pattern:
```typescript
// Before
import { sqliteCache } from '@/core/services/sqliteCache';

// After (unchanged for backwards compat)
import { sqliteCache } from '@/core/services/sqlite';

// Or for specific imports
import { getDownloadRecord, getUserBook } from '@/core/services/sqlite';
```

### Step 12: Replace console.log with logger

In each extracted file, replace:
```typescript
// Before
console.log('[sqliteCache] Loading downloads...');

// After
import { logger } from '@/shared/utils/logger';
logger.debug('sqlite:downloads', 'Loading downloads...');
```

---

## Cross-Screen Dependencies

| Consumer | Functions Used | Impact |
|----------|---------------|--------|
| playerStore | getProgress, saveProgress, getBookmarks | Update imports |
| queueStore | getQueue, addToQueue, reorderQueue | Update imports |
| downloadManager | getDownloadRecord, upsertDownloadRecord | Update imports |
| useStats | getSessionsForPeriod, getTotalListeningTime | Update imports |
| finishedBooksSync | getUserBook, markBookFinished | Update imports |
| useReadingHistory | getFinishedBooks, getUserBook | Update imports |

---

## Testing Criteria

### Functional Tests
- [ ] All existing sqliteCache functions work identically
- [ ] Downloads persist and load correctly
- [ ] Queue persists across app restarts
- [ ] Stats accumulate properly
- [ ] Bookmarks save and load per book
- [ ] Progress syncs correctly
- [ ] Finished books state persists

### Migration Tests
- [ ] Existing data is preserved after split
- [ ] No duplicate table creation
- [ ] Schema migrations still run

### Performance Tests
- [ ] App startup time unchanged
- [ ] Query performance unchanged
- [ ] Memory usage unchanged

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing imports | Use facade pattern with identical API |
| Data loss during migration | No schema changes, only code organization |
| Circular dependencies | Each domain module imports only from sqliteCore |
| Regression in sync | Comprehensive test of sync queue operations |

---

## Effort Breakdown

| Task | Effort | Risk |
|------|--------|------|
| Create types.ts | 1 hour | Low |
| Extract sqliteCore.ts | 2 hours | Low |
| Extract sqliteDownloads.ts | 3 hours | Low |
| Extract sqliteStats.ts | 2 hours | Low |
| Extract sqliteQueue.ts | 2 hours | Low |
| Extract sqliteUserBooks.ts | 2 hours | Low |
| Extract sqliteBookmarks.ts | 1 hour | Low |
| Extract sqliteProgress.ts | 2 hours | Low |
| Extract sqliteSync.ts | 2 hours | Low |
| Create facade index.ts | 2 hours | Medium |
| Update imports | 3 hours | Low |
| Replace console.log | 2 hours | Low |
| Testing | 4 hours | - |

**Total: 2-3 days**
