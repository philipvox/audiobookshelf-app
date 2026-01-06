# StorageSettings Documentation

## Overview

The StorageSettings system manages downloaded audiobook files, cache, and network preferences. It provides controls for offline content, WiFi-only downloads, and space management.

**Key Files:**
- `src/features/profile/screens/StorageSettingsScreen.tsx` - Main settings screen
- `src/features/library/components/StorageSummary.tsx` - Storage progress bar component
- `src/core/services/downloadManager.ts` - Download file management
- `src/core/services/networkMonitor.ts` - Network preferences and connectivity
- `src/features/downloads/screens/DownloadsScreen.tsx` - Individual download management

---

## Storage Location

### Download Directory

**Location:** `src/core/services/downloadManager.ts:94`

```typescript
private readonly DOWNLOAD_DIR = `${FileSystem.documentDirectory}audiobooks/`;
```

All downloaded audiobooks are stored in the app's document directory under `audiobooks/`. Each book gets its own subdirectory:

```
{documentDirectory}/audiobooks/
├── {itemId-1}/
│   ├── 000_chapter1.m4b
│   ├── 001_chapter2.m4b
│   └── ...
├── {itemId-2}/
│   └── ...
└── ...
```

### Supported Audio Formats

**Location:** `src/core/services/downloadManager.ts:552`

```typescript
const audioExtensions = ['.m4b', '.m4a', '.mp3', '.mp4', '.opus', '.ogg', '.flac', '.aac'];
```

### Path Resolution

```typescript
// Get local path for a book's files
getLocalPath(itemId: string): string {
  return `${this.DOWNLOAD_DIR}${itemId}/`;
}

// Get all downloaded audio files for playback
async getDownloadedFiles(itemId: string): Promise<string[]> {
  // Returns sorted array of file paths (000_, 001_, etc.)
}
```

---

## Storage Location Options

The current implementation uses a **fixed storage location** - the app's document directory. There is no user-configurable storage location option (e.g., external SD card).

| Platform | Storage Path |
|----------|-------------|
| iOS | `{appDocuments}/audiobooks/` |
| Android | `{appDocuments}/audiobooks/` |

**Note:** Unlike some competitor apps, there's no option to move downloads to external storage on Android. All downloads remain in the app's private document directory.

---

## Cache Clearing

### Library Cache Refresh

**Location:** `src/features/profile/screens/StorageSettingsScreen.tsx:193-205`

```typescript
const handleRefreshCache = useCallback(async () => {
  setIsRefreshingCache(true);
  try {
    await refreshCache();  // From useLibraryCache hook
    Alert.alert('Success', 'Library cache refreshed successfully.');
  } catch (error) {
    Alert.alert('Error', 'Failed to refresh library cache.');
  } finally {
    setIsRefreshingCache(false);
  }
}, []);
```

**Effect:** Re-fetches all library items from the server, rebuilds indexes (authors, narrators, series, genres), and updates AsyncStorage cache.

### Clear All Downloads

**Location:** `src/features/profile/screens/StorageSettingsScreen.tsx:211-242`

```typescript
const handleClearAllDownloads = useCallback(() => {
  Alert.alert(
    'Clear All Downloads',
    `This will remove all ${downloadCount} downloaded books and free up ${formatBytes(totalStorage)}. Are you sure?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          await downloadManager.clearAllDownloads();
          Alert.alert('Success', 'All downloads have been cleared.');
        },
      },
    ]
  );
}, [downloadCount, totalStorage]);
```

**Implementation:** `downloadManager.clearAllDownloads()` iterates through all downloads and calls `deleteDownload()` on each, which:
1. Removes the record from SQLite
2. Deletes the files from the filesystem

### Individual Download Deletion

**Location:** `src/core/services/downloadManager.ts:412-418`

```typescript
async deleteDownload(itemId: string): Promise<void> {
  log(`Deleting download: ${itemId}`);
  await sqliteCache.deleteDownload(itemId);
  await this.deleteFiles(itemId);
  this.notifyListeners();
}
```

Users can delete individual downloads via:
- Swipe-to-delete on DownloadsScreen
- Long-press context menu on book cards

---

## Download Quality Settings

### Current Implementation

**There are no configurable download quality settings.** The app downloads the **original audio files** from the server without transcoding or quality selection.

This differs from some streaming apps that offer quality tiers (e.g., "Standard", "High", "Very High").

### What Gets Downloaded

The download manager fetches the original audio files directly:

```typescript
const fileUrl = `${serverUrl}/api/items/${itemId}/file/${file.ino}`;
```

**Implications:**
- File sizes match the original library files
- No bandwidth savings from lower quality options
- Consistent quality with server playback

### Potential Future Enhancement

A quality setting could use the AudiobookShelf server's transcoding API:
```typescript
// Theoretical API for transcoded stream
`/api/items/${itemId}/play?format=mp3&bitrate=128`
```

This would require server-side transcoding support.

---

## Network Preferences

### WiFi-Only Mode

**Location:** `src/core/services/networkMonitor.ts:122-134`

```typescript
// Storage key
const WIFI_ONLY_KEY = 'downloadWifiOnly';

// Default: enabled (true)
isWifiOnlyEnabled(): boolean {
  return this.wifiOnlyEnabled;
}

async setWifiOnlyEnabled(enabled: boolean): Promise<void> {
  this.wifiOnlyEnabled = enabled;
  await AsyncStorage.setItem(WIFI_ONLY_KEY, enabled.toString());
  this.notifyListeners();
}
```

**Behavior when enabled:**
- Downloads pause when device switches from WiFi to cellular
- Queue processing stops until WiFi reconnects
- User sees "waiting_wifi" status on pending downloads

### Auto-Download Series

**Location:** `src/core/services/networkMonitor.ts:136-150`

```typescript
// Storage key
const AUTO_DOWNLOAD_SERIES_KEY = 'autoDownloadNextInSeries';

// Default: enabled (true)
isAutoDownloadSeriesEnabled(): boolean {
  return this.autoDownloadSeriesEnabled;
}
```

**Behavior when enabled:**
- When user reaches 80% progress on a book in a series
- App automatically queues the next book in the series for download
- Respects WiFi-only setting

### Network State Tracking

**Location:** `src/core/services/networkMonitor.ts:156-235`

```typescript
type ConnectionType = 'wifi' | 'cellular' | 'none' | 'unknown';

interface NetworkState {
  isConnected: boolean;
  connectionType: ConnectionType;
  canDownload: boolean;
}

// Check if downloads are currently allowed
canDownload(): boolean {
  if (!this.isConnected()) return false;
  if (this.wifiOnlyEnabled && !this.isOnWifi()) return false;
  return true;
}

// User-friendly message for blocked downloads
getDownloadBlockedReason(): string | null {
  if (!this.isConnected()) return 'No internet connection';
  if (this.wifiOnlyEnabled && this.isOnCellular()) {
    return 'WiFi-only mode is enabled. Connect to WiFi or disable in settings.';
  }
  return null;
}
```

---

## Space Management

### Storage Overview Card

**Location:** `src/features/profile/screens/StorageSettingsScreen.tsx:146-158`

The StorageSettingsScreen shows a prominent storage overview:
- Total bytes used by downloads
- Number of downloaded books
- Visual icon indicator

```typescript
const totalStorage = completedDownloads.reduce((sum, d) => sum + (d.totalBytes || 0), 0);
```

### StorageSummary Component

**Location:** `src/features/library/components/StorageSummary.tsx`

A reusable component shown on MyLibraryScreen with:
- Visual progress bar
- Used space / Available space
- Book count
- "Manage" button linking to DownloadsScreen

```typescript
interface StorageSummaryProps {
  usedBytes: number;
  bookCount?: number;
  onManagePress?: () => void;
}
```

**Storage Calculation:**

```typescript
// Get available device storage
const info = await FileSystem.getFreeDiskStorageAsync();
setAvailableBytes(info);

// Calculate percentage of device storage used by downloads
const totalStorage = availableBytes + usedBytes;
const usagePercent = Math.min((usedBytes / totalStorage) * 100, 100);
```

### Download Size Tracking

**Location:** `src/core/services/downloadManager.ts:605-608`

```typescript
async getTotalDownloadedSize(): Promise<number> {
  const downloads = await sqliteCache.getDownloadsByStatus('complete');
  return downloads.reduce((sum, d) => sum + (d.fileSize || 0), 0);
}
```

Each download record stores:
- `fileSize` - Total size in bytes
- `bytesDownloaded` - Current progress
- `progress` - Percentage (0-1)

---

## Settings Screen Sections

### StorageSettingsScreen Layout

**Location:** `src/features/profile/screens/StorageSettingsScreen.tsx`

| Section | Contents |
|---------|----------|
| **Storage Overview** | Total used space, book count, visual meter |
| **Downloads** | Manage Downloads (→ DownloadsScreen), WiFi Only toggle, Auto-Download Series toggle |
| **Cache** | Refresh Library Cache button |
| **Danger Zone** | Clear All Downloads (destructive) |
| **Info Note** | Explanation that clearing downloads doesn't affect server progress |

### Settings Row Options

| Setting | Type | Default | Storage Key |
|---------|------|---------|-------------|
| WiFi Only | Toggle | `true` | `downloadWifiOnly` |
| Auto-Download Series | Toggle | `true` | `autoDownloadNextInSeries` |
| Manage Downloads | Navigation | - | - |
| Refresh Library Cache | Button | - | - |
| Clear All Downloads | Button | - | - |

---

## DownloadsScreen Features

**Location:** `src/features/downloads/screens/DownloadsScreen.tsx`

A dedicated screen for managing individual downloads:

### Sections

1. **Storage Card** - Visual bar showing used/available space
2. **Downloading** - Active downloads with progress bars, pause/resume
3. **Queued** - Pending downloads with cancel option
4. **Downloaded** - Completed downloads with swipe-to-delete

### Actions

| Action | Gesture | Effect |
|--------|---------|--------|
| Delete download | Swipe left | Removes files, shows undo snackbar |
| Cancel download | Tap X | Stops download, removes from queue |
| Pause download | Tap pause | Pauses active download |
| Resume download | Tap play | Resumes paused download |
| Open settings | Tap gear | Navigates to StorageSettingsScreen |

---

## Data Flow Diagram

```
User Changes Setting
        │
        ▼
┌───────────────────────────┐
│  StorageSettingsScreen    │
│  or DownloadsScreen       │
└────────────┬──────────────┘
             │
             ├─────────────────────────────┐
             │                             │
             ▼                             ▼
┌────────────────────────┐    ┌────────────────────────┐
│  networkMonitor        │    │  downloadManager       │
│  ├─ setWifiOnlyEnabled │    │  ├─ deleteDownload     │
│  └─ setAutoDownload... │    │  ├─ clearAllDownloads  │
└────────────┬───────────┘    │  └─ cancelAllDownloads │
             │                └────────────┬───────────┘
             ▼                             │
┌────────────────────────┐                 │
│  AsyncStorage          │                 ▼
│  downloadWifiOnly      │    ┌────────────────────────┐
│  autoDownloadNext...   │    │  FileSystem            │
└────────────────────────┘    │  deleteAsync(path)     │
                              └────────────────────────┘
                                           │
                                           ▼
                              ┌────────────────────────┐
                              │  SQLite                │
                              │  deleteDownload()      │
                              └────────────────────────┘
```

---

## Storage Keys Reference

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `downloadWifiOnly` | string ('true'/'false') | 'true' | WiFi-only download preference |
| `autoDownloadNextInSeries` | string ('true'/'false') | 'true' | Auto-download series preference |
| `library_cache_v1` | JSON | - | Cached library items (30-day TTL) |

---

## Important Implementation Notes

### Progress Syncs to Server

The info note in StorageSettingsScreen clarifies:

> "Downloads are stored locally on your device. Clearing downloads will not affect your listening progress, which is synced with the server."

This means:
- Deleting downloads only removes local files
- User's listening position is preserved on the server
- Re-downloading a book resumes from previous position

### File Size Limitations

**Location:** `src/core/cache/libraryCache.ts:338`

```typescript
// Android CursorWindow limit is 2MB, stay well under to be safe
if (cacheJson.length < 1.5 * 1024 * 1024) {
  await AsyncStorage.setItem(CACHE_KEY, cacheJson);
} else {
  console.warn('[LibraryCache] Cache too large to persist, using in-memory only');
}
```

Large libraries may exceed AsyncStorage limits on Android, falling back to in-memory caching.

### Download Status States

```typescript
type DownloadStatus =
  | 'pending'      // Queued, waiting to start
  | 'downloading'  // Active download in progress
  | 'complete'     // Finished successfully
  | 'error'        // Failed with error message
  | 'paused'       // User paused
  | 'waiting_wifi' // WiFi-only mode, on cellular
```

### Partial Download Playback

The app supports "play while downloading":

```typescript
async canPlayPartially(itemId: string): Promise<boolean> {
  const files = await this.getDownloadedFiles(itemId);
  return files.length > 0;  // At least first chapter downloaded
}
```

This allows users to start listening before a download completes.
