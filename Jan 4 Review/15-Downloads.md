# Downloads Documentation

**Files:**
- `src/features/downloads/screens/DownloadsScreen.tsx` - UI screen
- `src/core/services/downloadManager.ts` - Download orchestration
- `src/core/hooks/useDownloads.ts` - React hooks for download state
- `src/core/services/sqliteCache.ts` - SQLite persistence layer

## Overview

The download system manages offline audiobook storage with queue-based downloading, network-aware behavior (WiFi-only mode), and per-file progress tracking. Files are stored in the app's document directory and persist across app restarts.

---

## Queue States

### DownloadTask Status Values

| Status | Description | UI Display |
|--------|-------------|------------|
| `pending` | Queued, waiting to start | "Waiting..." in Queued section |
| `downloading` | Actively downloading | Progress bar with bytes/total |
| `paused` | User-paused download | "Paused" label, Play button visible |
| `waiting_wifi` | Blocked by WiFi-only setting | Resumes when WiFi available |
| `complete` | Download finished | In Downloaded section |
| `error` | Download failed | Error message, retry available |

### State Machine

```
                    +----------------+
                    |    pending     |
                    +-------+--------+
                            |
                            v
             +--------------+--------------+
             |                             |
             v                             v
     +-------+--------+           +--------+-------+
     |  downloading   |<--------->|    paused      |
     +-------+--------+           +----------------+
             |                             ^
             |                             |
             +-----------------------------+
             |
     +-------+--------+
     |    complete    |
     +----------------+
             |
             v
     +-------+--------+
     |     error      |<-------- (retry) -----> pending
     +----------------+
```

### Network-Aware State Transitions

```typescript
// downloadManager.ts:149-163
handleNetworkChange(state: NetworkState) {
  if (wasDownloading && !canDownloadNow) {
    // WiFi -> Cellular: pause all, set to 'waiting_wifi'
    pauseAllForNetwork();
  } else if (!wasDownloading && canDownloadNow) {
    // Cellular -> WiFi: resume waiting downloads
    resumeWaitingDownloads();
  }
}
```

---

## Progress Tracking

### Data Structure

```typescript
interface DownloadTask {
  itemId: string;           // Library item ID
  status: string;           // Current state
  progress: number;         // 0.0 to 1.0
  bytesDownloaded: number;  // Bytes completed
  totalBytes: number;       // Total file size
  error?: string;           // Error message if failed
  completedAt?: number;     // Completion timestamp
  libraryItem?: LibraryItem; // Metadata (for complete downloads)
}
```

### Progress Update Flow

```
File Download -> onProgress callback -> updateProgress()
                                              |
                     +------------------------+------------------------+
                     |                        |                        |
                     v                        v                        v
              SQLite update           progressListeners          notifyListeners
           (status, progress)         (byte-level detail)        (throttled 500ms)
                     |                        |                        |
                     v                        v                        v
              Persisted state          useDownloadProgress      useDownloadStatus
                                      (real-time progress)      (status changes)
```

### Throttling

```typescript
// downloadManager.ts:84-86
private readonly NOTIFY_THROTTLE_MS = 500; // Notify UI every 500ms max

// Only fire notifications every 500ms to avoid excessive UI updates
if (now - this.lastNotifyTime >= this.NOTIFY_THROTTLE_MS) {
  this.notifyListeners();
}
```

### Per-File Progress

For multi-file audiobooks, progress is calculated across all files:

```typescript
// downloadManager.ts:947-958
const overallProgress = totalSize > 0
  ? currentBytesDownloaded / totalSize
  : (currentIndex + bytesWritten / (fileSize || 1)) / audioFiles.length;
```

---

## Pause/Resume/Cancel

### Pause

```typescript
// downloadManager.ts:352-377
async pauseDownload(itemId: string) {
  const download = this.activeDownloads.get(itemId);
  if (download) {
    await download.pauseAsync();              // Pause file download
    this.activeDownloads.delete(itemId);      // Remove from active map

    // Save current progress to SQLite
    await sqliteCache.setDownload({
      itemId,
      status: 'paused',
      progress: currentProgress,
      // ...
    });

    this.notifyListeners();                   // Update UI
  }
}
```

### Resume

```typescript
// downloadManager.ts:382-406
async resumeDownload(itemId: string) {
  const download = await sqliteCache.getDownload(itemId);

  if (download?.status === 'paused') {
    // Reset to pending and add to queue with high priority
    await sqliteCache.setDownload({ ...download, status: 'pending' });
    await sqliteCache.addToDownloadQueue(itemId, 10); // Priority 10 = high
    this.processQueue();
  } else if (download?.status === 'error') {
    // Retry failed downloads
    await sqliteCache.setDownload({ ...download, status: 'pending', error: null });
    await sqliteCache.addToDownloadQueue(itemId, 10);
    this.processQueue();
  }
}
```

### Cancel

```typescript
// downloadManager.ts:322-347
async cancelDownload(itemId: string) {
  // 1. Stop active download
  const download = this.activeDownloads.get(itemId);
  if (download) {
    await download.pauseAsync();
    this.activeDownloads.delete(itemId);
  }

  // 2. Remove from database and queue
  await sqliteCache.deleteDownload(itemId);

  // 3. Delete downloaded files
  await this.deleteFiles(itemId);

  this.notifyListeners();
}
```

### Cancel All

```typescript
// downloadManager.ts:633-664
async cancelAllDownloads() {
  // Cancel active downloads
  for (const [itemId, download] of this.activeDownloads) {
    await download.cancelAsync();
    await sqliteCache.failDownload(itemId, 'Cancelled by user');
  }
  this.activeDownloads.clear();

  // Fail all pending/downloading in database
  const pending = await sqliteCache.getDownloadsByStatus('pending');
  const downloading = await sqliteCache.getDownloadsByStatus('downloading');
  for (const item of [...pending, ...downloading]) {
    await sqliteCache.failDownload(item.itemId, 'Cancelled by user');
  }

  // Clear the queue
  await sqliteCache.clearDownloadQueue();
}
```

---

## File Storage Location

### Directory Structure

```
{documentDirectory}/audiobooks/
  └── {itemId}/
      ├── 000_{fileIno}.m4a    # First audio file
      ├── 001_{fileIno}.m4a    # Second audio file
      ├── ...
      └── cover.jpg            # Cover image
```

### Path Construction

```typescript
// downloadManager.ts:94
private readonly DOWNLOAD_DIR = `${FileSystem.documentDirectory}audiobooks/`;

// downloadManager.ts:534-536
getLocalPath(itemId: string): string {
  return `${this.DOWNLOAD_DIR}${itemId}/`;
}

// File naming (line 927)
const destPath = `${destDir}${i.toString().padStart(3, '0')}_${file.ino}.m4a`;
// Results in: 000_abc123.m4a, 001_def456.m4a, etc.
```

### Supported Audio Extensions

```typescript
// downloadManager.ts:552
const audioExtensions = ['.m4b', '.m4a', '.mp3', '.mp4', '.opus', '.ogg', '.flac', '.aac'];
```

### Storage Calculation

```typescript
// downloadManager.ts:605-608
async getTotalDownloadedSize(): Promise<number> {
  const downloads = await sqliteCache.getDownloadsByStatus('complete');
  return downloads.reduce((sum, d) => sum + (d.fileSize || 0), 0);
}
```

---

## Cleanup Behavior

### Delete Single Download

```typescript
// downloadManager.ts:412-418
async deleteDownload(itemId: string) {
  await sqliteCache.deleteDownload(itemId);  // Remove from SQLite
  await this.deleteFiles(itemId);             // Delete audio files
  this.notifyListeners();
}

// downloadManager.ts:1100-1114
private async deleteFiles(itemId: string) {
  const path = this.getLocalPath(itemId);
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) {
    await FileSystem.deleteAsync(path, { idempotent: true });
  }
}
```

### Delete All Downloads

```typescript
// downloadManager.ts:621-628
async clearAllDownloads() {
  const downloads = await this.getAllDownloads();
  for (const download of downloads) {
    await this.deleteDownload(download.itemId);
  }
}
```

### Undo Delete (UI Feature)

The DownloadsScreen implements a 5-second undo window:

```typescript
// DownloadsScreen.tsx:540-565
onPress: () => {
  // Store items for potential undo
  const itemsToDelete = [...completed];

  // Set up delayed deletion (5.5s)
  const timeoutId = setTimeout(() => {
    executePendingDeletion();
  }, 5500);

  setPendingDeletion({ items: itemsToDelete, timeoutId });

  // Show undo snackbar
  showUndo(`Deleted ${itemCount} downloads`, handleUndoDeletion, 5000);
}
```

### Stuck Download Recovery

On app init, downloads marked as "downloading" are reset:

```typescript
// downloadManager.ts:122-134
// Clear any stuck downloads from previous session
const downloading = await sqliteCache.getDownloadsByStatus('downloading');
if (downloading.length > 0) {
  for (const item of downloading) {
    await sqliteCache.addToDownloadQueue(item.itemId, 0);
    await sqliteCache.updateDownloadProgress(item.itemId, 0);
  }
}
```

---

## SQLite Schema

### Downloads Table

```sql
CREATE TABLE downloads (
  item_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,           -- 'pending'|'downloading'|'complete'|'error'|'paused'
  progress REAL DEFAULT 0,        -- 0.0 to 1.0
  file_path TEXT,                 -- Local path when complete
  file_size INTEGER,              -- Bytes
  downloaded_at TEXT,             -- ISO timestamp
  error TEXT,                     -- Error message if failed
  last_played_at TEXT             -- For sorting by recent play
);
```

### Download Queue Table

```sql
CREATE TABLE download_queue (
  item_id TEXT PRIMARY KEY,
  priority INTEGER DEFAULT 0,     -- Higher = download first
  added_at TEXT NOT NULL          -- For FIFO within same priority
);

-- Queue ordering: priority DESC, added_at ASC
SELECT item_id FROM download_queue ORDER BY priority DESC, added_at ASC LIMIT 1;
```

---

## React Hooks

### useDownloads

Full download list with actions:

```typescript
const {
  downloads,           // DownloadTask[]
  isLoading,           // boolean
  queueDownload,       // (item, priority) => void
  cancelDownload,      // (itemId) => void
  pauseDownload,       // (itemId) => void
  resumeDownload,      // (itemId) => void
  deleteDownload,      // (itemId) => void
  completedCount,      // number
  pendingCount,        // number
  downloadingCount,    // number
} = useDownloads();
```

### useDownloadStatus

Single item status tracking:

```typescript
const {
  status,              // DownloadTask | null
  isLoading,           // boolean
  isDownloaded,        // boolean
  isDownloading,       // boolean
  isPending,           // boolean
  isPaused,            // boolean
  hasError,            // boolean
  progress,            // number (0-1)
  bytesDownloaded,     // number
  totalBytes,          // number
  error,               // string | undefined
} = useDownloadStatus(itemId);
```

### useDownloadProgress

Real-time byte-level progress:

```typescript
const progress = useDownloadProgress(itemId); // 0.0 to 1.0
```

### useIsOfflineAvailable

Quick check if playable offline:

```typescript
const { isAvailable, isLoading } = useIsOfflineAvailable(itemId);
```

---

## Download Queue Processing

### Single-Threaded Processing

Only one download runs at a time:

```typescript
// downloadManager.ts:696-704
private async processQueue() {
  if (this.isProcessingQueue) return;        // Already processing
  if (this.activeDownloads.size > 0) return; // Download in progress
  if (!networkMonitor.canDownload()) return; // Network blocked

  this.isProcessingQueue = true;
  // ... process next item
}
```

### Priority System

```typescript
// Priority values:
// 10 = High (resumed downloads)
// 5  = Normal (paused downloads on resume)
// 0  = Default (new downloads)

await sqliteCache.addToDownloadQueue(itemId, priority);
```

### Retry Logic

Downloads retry up to 3 times with exponential backoff:

```typescript
// downloadManager.ts:796-860
async downloadFileWithRetry(url, destPath, token, itemId, fileIndex, totalFiles, onProgress, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // ... download attempt
    } catch (error) {
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await sleep(delay);
      }
    }
  }
}
```

---

## Events

The download manager emits events via eventBus:

| Event | Payload | When |
|-------|---------|------|
| `download:file_complete` | `{ bookId, fileIndex, totalFiles, filePath }` | Each file finishes |
| `download:complete` | `{ bookId, totalSize, filePath }` | Entire book finishes |
| `download:failed` | `{ bookId, error }` | Download fails |

---

## UI Sections (DownloadsScreen)

| Section | Shows | Actions |
|---------|-------|---------|
| **Storage Card** | Used/free space bar | Clear cache button |
| **Downloading** | Active + paused downloads | Pause/Resume, Cancel |
| **Queued** | Pending downloads | Cancel |
| **Downloaded** | Completed downloads | Swipe to delete, tap to open |
| **Settings Link** | Download settings CTA | Navigate to StorageSettings |

### Empty State

- Headphones icon
- "No Downloads Yet" message
- "Browse Library" CTA button

---

## Key Implementation Notes

1. **Single concurrent download:** Only one book downloads at a time to manage bandwidth and battery

2. **Resume on restart:** Paused/interrupted downloads are re-queued on app init

3. **Metadata caching:** LibraryItem is cached to SQLite when queued, enabling offline display

4. **Cover download:** Cover image is downloaded after audio files complete (non-blocking)

5. **Timeline pre-generation:** After download completes, timeline ticks are pre-generated for smooth playback

6. **Haptic feedback:** Distinct haptics for download complete (`downloadComplete`) and failed (`downloadFailed`)

7. **Failed fetch cooldown:** API fetch failures for deleted books are cached for 5 minutes to avoid repeated requests

8. **Partial playback support:** `getDownloadedFiles()` and `canPlayPartially()` enable playing while downloading (currently unused)
