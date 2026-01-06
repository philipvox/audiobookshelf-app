# QueueScreen Documentation

**Files:**
- `src/features/queue/screens/QueueScreen.tsx` - UI screen
- `src/features/queue/stores/queueStore.ts` - State management
- `src/core/services/sqliteCache.ts` - Persistence layer

## Overview

The Queue is a user-managed playlist of books to listen to next. It supports manual ordering, auto-population of next series books, and seamless integration with the player for continuous playback.

---

## How the Queue is Built

### Data Structure

```typescript
interface QueueBook {
  id: string;           // Unique queue entry ID (e.g., "queue_1704384000000_abc123")
  bookId: string;       // Library item ID
  book: LibraryItem;    // Full book data (serialized to SQLite)
  position: number;     // Order in queue (0 = next to play)
  addedAt: number;      // Timestamp when added
}
```

### Adding Books to Queue

| Method | Description | Source |
|--------|-------------|--------|
| `addToQueue(book)` | Add single book | User action (book detail, long-press) |
| `addBooksToQueue(books)` | Add multiple books | Series "Add All" action |
| `checkAndAddSeriesBook(currentBook)` | Auto-add next in series | Player (on book load) |

**Add Flow (lines 94-129):**
```typescript
addToQueue: async (book: LibraryItem) => {
  // 1. Check for duplicates
  if (isInQueue(book.id)) return;

  // 2. Clear auto-series book if present (user takes priority)
  if (autoSeriesBookId) {
    await sqliteCache.removeFromQueue(autoSeriesBookId);
    set({ autoSeriesBookId: null });
  }

  // 3. Persist to SQLite
  const id = await sqliteCache.addToQueue(book.id, JSON.stringify(book));

  // 4. Update Zustand state
  set({ queue: [...currentQueue, newItem] });
}
```

### Auto-Series Book Feature

When a book starts playing, the queue automatically checks if it's part of a series and adds the next book:

```typescript
// Triggered in playerStore.ts:1463
checkAndAddSeriesBook: async (currentBook: LibraryItem) => {
  // Only if: autoplay enabled AND queue is empty
  if (!autoplayEnabled || queue.length > 0) return;

  const nextBook = getNextBookInSeries(currentBook);  // From libraryCache
  if (nextBook && !isInQueue(nextBook.id)) {
    const id = await sqliteCache.addToQueue(nextBook.id, bookData);
    set({ queue: [newItem], autoSeriesBookId: nextBook.id });
  }
}
```

**Note:** Auto-added series books are replaced when user manually adds a book.

---

## Persistence (SQLite)

### Database Schema

```sql
CREATE TABLE playback_queue (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL UNIQUE,
  book_data TEXT NOT NULL,      -- JSON-serialized LibraryItem
  position INTEGER NOT NULL,     -- 0-indexed order
  added_at INTEGER NOT NULL      -- Unix timestamp
);
```

### SQLite Operations

| Operation | SQL | File Location |
|-----------|-----|---------------|
| Get queue | `SELECT * FROM playback_queue ORDER BY position ASC` | sqliteCache.ts:1667 |
| Add to queue | `INSERT INTO playback_queue VALUES (?, ?, ?, ?, ?)` | sqliteCache.ts:1691 |
| Remove from queue | `DELETE FROM playback_queue WHERE book_id = ?` | sqliteCache.ts:1715 |
| Clear queue | `DELETE FROM playback_queue` | sqliteCache.ts:1777 |
| Reorder | Transaction with position updates | sqliteCache.ts:1787 |

### Initialization Flow

```typescript
// queueStore.ts:67-91
init: async () => {
  // 1. Load autoplay preference from AsyncStorage
  const autoplaySaved = await AsyncStorage.getItem('queue_autoplay_enabled');

  // 2. Load queue items from SQLite
  const items = await sqliteCache.getQueue();

  // 3. Deserialize book data
  const queue = items.map(item => ({
    ...item,
    book: JSON.parse(item.bookData) as LibraryItem,
  }));

  set({ queue, isInitialized: true, autoplayEnabled });
}
```

---

## Reordering

### UI Interaction

- **"Play Next" button (arrow-up):** Moves item to position 0
- **Swipe left:** Reveals delete action
- **Drag handle:** Visual indicator (actual drag-to-reorder not implemented)

### Reorder Implementation (lines 207-234)

```typescript
reorderQueue: async (fromIndex: number, toIndex: number) => {
  // 1. Validate indices
  if (fromIndex === toIndex) return;
  if (fromIndex < 0 || toIndex >= queue.length) return;

  // 2. Persist to SQLite (handles position recalculation)
  await sqliteCache.reorderQueue(fromIndex, toIndex);

  // 3. Update local state
  const newQueue = [...queue];
  const [movedItem] = newQueue.splice(fromIndex, 1);
  newQueue.splice(toIndex, 0, movedItem);

  // 4. Reindex positions
  const reindexedQueue = newQueue.map((item, index) => ({
    ...item,
    position: index,
  }));

  set({ queue: reindexedQueue });
}
```

### SQLite Reorder Logic (sqliteCache.ts:1787-1822)

```typescript
await db.withTransactionAsync(async () => {
  if (fromPosition < toPosition) {
    // Moving down: shift items up
    await db.runAsync(
      'UPDATE playback_queue SET position = position - 1 WHERE position > ? AND position <= ?',
      [fromPosition, toPosition]
    );
  } else {
    // Moving up: shift items down
    await db.runAsync(
      'UPDATE playback_queue SET position = position + 1 WHERE position >= ? AND position < ?',
      [toPosition, fromPosition]
    );
  }
  // Set final position for moved item
  await db.runAsync(
    'UPDATE playback_queue SET position = ? WHERE id = ?',
    [toPosition, item.id]
  );
});
```

---

## Player Session Integration

### When Book Starts (playerStore.ts:1443-1471)

```typescript
if (autoPlay) {
  const queueStore = useQueueStore.getState();

  // Ensure queue is initialized
  if (!queueStore.isInitialized) {
    await queueStore.init();
  }

  // Check for next series book (with race condition guard)
  const timeSinceLastFinish = Date.now() - lastBookFinishTime;
  if (timeSinceLastFinish > TRANSITION_GUARD_MS && queueStore.autoplayEnabled) {
    await queueStore.checkAndAddSeriesBook(book);
  }
}
```

### When Book Finishes (playerStore.ts:2481-2527)

```typescript
// After marking book as finished...
const queueStore = useQueueStore.getState();

if (queueStore.queue.length > 0) {
  // 1. Get and remove next book from queue
  const nextBook = await queueStore.playNext();

  if (nextBook) {
    // 2. Start playing next book
    get().loadBook(nextBook, { autoPlay: true, showPlayer: false });
  }
}
```

### playNext Operation (queueStore.ts:298-307)

```typescript
playNext: async () => {
  const { queue } = get();
  if (queue.length === 0) return null;

  const nextItem = queue[0];           // Get first item
  await get().removeFromQueue(nextItem.bookId);  // Remove from queue + SQLite

  return nextItem.book;  // Return LibraryItem for player
}
```

---

## Data Flow Diagram

```
+---------------------+     +-----------------------+     +------------------+
|     QueueScreen     |     |     queueStore        |     |   sqliteCache    |
|        (UI)         |     |      (Zustand)        |     |     (SQLite)     |
+---------------------+     +-----------------------+     +------------------+
         |                            |                            |
         | addToQueue(book)           |                            |
         |--------------------------->|                            |
         |                            | sqliteCache.addToQueue()   |
         |                            |--------------------------->|
         |                            |                            |
         |                            |<-- id --------------------|
         |                            |                            |
         |                            | set({ queue: [...] })      |
         |<-- re-render --------------|                            |
         |                            |                            |

+---------------------+     +-----------------------+     +------------------+
|    playerStore      |     |     queueStore        |     |   sqliteCache    |
|  (book finishes)    |     |                       |     |                  |
+---------------------+     +-----------------------+     +------------------+
         |                            |                            |
         | playNext()                 |                            |
         |--------------------------->|                            |
         |                            | removeFromQueue()          |
         |                            |--------------------------->|
         |                            |<---------------------------|
         |<-- LibraryItem ------------|                            |
         |                            |                            |
         | loadBook(nextBook)         |                            |
         |---> (starts playing)       |                            |
```

---

## Autoplay Settings

| Setting | Storage | Default | Description |
|---------|---------|---------|-------------|
| `autoplayEnabled` | AsyncStorage (`queue_autoplay_enabled`) | `true` | Auto-play next in queue when book finishes |

```typescript
setAutoplayEnabled: async (enabled: boolean) => {
  await AsyncStorage.setItem(AUTOPLAY_KEY, enabled ? 'true' : 'false');
  set({ autoplayEnabled: enabled });
}
```

---

## QueueScreen UI Features

### Stats Header
- Book count: `{queue.length} books`
- Total duration: Sum of all `book.media.duration`
- "Clear Queue" button with confirmation alert

### Queue Items (SwipeableQueueItem)
- Cover image, title, author, duration
- **Swipe left:** Reveals red "Remove" action
- **Arrow-up button:** Calls `reorderQueue(currentIndex, 0)` to move to top
- **X button:** Quick remove without swipe
- **Tap:** Navigate to BookDetail

### Empty State
- Headphones icon
- "Nothing in your queue" message
- "Browse Library" CTA button

---

## Selectors (Optimized Hooks)

```typescript
// Get full queue array
export const useQueue = () => useQueueStore(state => state.queue);

// Get queue count (avoids re-render on queue content change)
export const useQueueCount = () => useQueueStore(state => state.queue.length);

// Check if specific book is in queue
export const useIsInQueue = (bookId: string) =>
  useQueueStore(state => state.queue.some(item => item.bookId === bookId));

// Autoplay toggle state
export const useAutoplayEnabled = () => useQueueStore(state => state.autoplayEnabled);

// ID of auto-added series book (if any)
export const useAutoSeriesBookId = () => useQueueStore(state => state.autoSeriesBookId);
```

---

## Key Implementation Notes

1. **Duplicate Prevention:** Books cannot be added twice (`isInQueue` check)

2. **User Priority:** When user manually adds a book, any auto-added series book is removed first

3. **Race Condition Guard:** Series book check is skipped within `TRANSITION_GUARD_MS` after a book finishes to prevent conflicts

4. **Lazy Import:** Queue store is dynamically imported in playerStore to avoid circular dependencies:
   ```typescript
   const { useQueueStore } = await import('@/features/queue/stores/queueStore');
   ```

5. **Book Data Storage:** Full `LibraryItem` is serialized to SQLite, enabling offline queue display without network

6. **Position Recalculation:** Removing items automatically shifts positions to maintain contiguous 0-indexed order
