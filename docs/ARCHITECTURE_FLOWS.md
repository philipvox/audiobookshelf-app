# AudiobookShelf App - Comprehensive Architecture & Flow Documentation

This document provides a complete architectural review of all pipelines, flows, and state machines in the AudiobookShelf React Native/Expo app.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Player System](#player-system)
3. [Download System](#download-system)
4. [Sync & Network System](#sync--network-system)
5. [Lifecycle & Cache System](#lifecycle--cache-system)
6. [Navigation System](#navigation-system)
7. [Authentication System](#authentication-system)
8. [API Client System](#api-client-system)
9. [State Machine Reference](#state-machine-reference)
10. [Error Handling Reference](#error-handling-reference)

---

## System Overview

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRESENTATION LAYER                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  Screens          │  Navigation           │  Global Overlays                │
│  ├─ HomeScreen    │  ├─ AppNavigator      │  ├─ GlobalMiniPlayer            │
│  ├─ MyLibrary     │  ├─ MainTabs          │  ├─ CDPlayerScreen              │
│  ├─ BrowseScreen  │  └─ FloatingTabBar    │  └─ TopNav                      │
│  └─ ProfileScreen │                       │                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                              STATE MANAGEMENT                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  Zustand Stores              │  React Query           │  XState Machines    │
│  ├─ playerStore (2579 lines) │  ├─ queryClient        │  ├─ audioMachine    │
│  ├─ queueStore               │  ├─ useLibraryItems    │  └─ syncMachine     │
│  ├─ myLibraryStore           │  └─ useBookDetails     │                     │
│  └─ downloadStore            │                        │                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                              SERVICE LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Audio             │  Sync              │  Network           │  Cache       │
│  ├─ audioService   │  ├─ syncService    │  ├─ baseClient     │  ├─ library  │
│  ├─ sessionService │  ├─ syncQueue      │  ├─ networkMonitor │  ├─ sqlite   │
│  └─ progressSvc    │  └─ backgroundSync │  └─ websocketSvc   │  └─ query    │
├─────────────────────────────────────────────────────────────────────────────┤
│                              PERSISTENCE LAYER                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  SQLite (abs_cache.db)       │  AsyncStorage          │  SecureStore       │
│  ├─ downloads                │  ├─ library_cache      │  ├─ auth_token     │
│  ├─ download_queue           │  ├─ user_preferences   │  └─ server_url     │
│  ├─ playback_progress        │  └─ theme_settings     │                    │
│  └─ user_books               │                        │                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                              EXTERNAL SYSTEMS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  AudiobookShelf Server       │  Device Audio          │  File System       │
│  ├─ REST API                 │  ├─ expo-av            │  ├─ Downloads dir  │
│  └─ WebSocket (socket.io)    │  └─ media-control      │  └─ Cover cache    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Files Quick Reference

| System | Primary File | Lines | Purpose |
|--------|--------------|-------|---------|
| Player State | `src/features/player/stores/playerStore.ts` | 2579 | Main player state management |
| Audio Service | `src/features/player/services/audioService.ts` | 1237 | expo-av audio control |
| Audio Machine | `src/features/player/machines/audioMachine.ts` | 517 | XState player FSM |
| Download Manager | `src/core/services/downloadManager.ts` | ~900 | Download queue & execution |
| SQLite Cache | `src/core/services/sqliteCache.ts` | ~700 | Local database operations |
| Background Sync | `src/features/player/services/backgroundSyncService.ts` | ~400 | Progress sync to server |
| WebSocket | `src/core/services/websocketService.ts` | ~400 | Real-time server events |
| API Client | `src/core/api/baseClient.ts` | ~200 | Axios instance & interceptors |
| Network Optimizer | `src/core/api/networkOptimizer.ts` | ~350 | Dedup, cache, queue |
| Library Cache | `src/core/cache/libraryCache.ts` | ~500 | In-memory library cache |
| App Initializer | `src/core/services/appInitializer.ts` | ~150 | Startup orchestration |
| Auth Context | `src/core/auth/authContext.tsx` | ~200 | Authentication provider |

---

## Player System

### Overview

The player system handles audiobook playback with support for multi-track files, chapter navigation, seeking, and per-book playback speeds.

### Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         UI COMPONENTS                            │
├──────────────────────────────────────────────────────────────────┤
│  CDPlayerScreen          │  GlobalMiniPlayer                     │
│  ├─ Play/Pause button    │  ├─ Timeline with ticks               │
│  ├─ Seek controls        │  ├─ Progress indicator                │
│  ├─ Chapter list         │  └─ Swipe-to-open gesture             │
│  └─ Speed controls       │                                       │
├──────────────────────────────────────────────────────────────────┤
│                         playerStore                              │
│                    (Zustand, 2579 lines)                         │
├─────────────────────┬────────────────────────────────────────────┤
│  State              │  Actions                                   │
│  ├─ currentBook     │  ├─ loadBook() ─────────────┐              │
│  ├─ currentTrack    │  ├─ play() / pause()        │              │
│  ├─ isPlaying       │  ├─ seekToPosition()        │              │
│  ├─ position        │  ├─ jumpToChapter()         ▼              │
│  ├─ duration        │  ├─ nextTrack() / prevTrack()              │
│  ├─ chapters        │  ├─ setPlaybackRate()                      │
│  ├─ isSeeking  ◄────┼──┼─ CRITICAL: Blocks updates during seek  │
│  ├─ seekPosition    │  ├─ startSeeking()                         │
│  └─ bookSpeedMap    │  ├─ commitSeek()                           │
│                     │  └─ cancelSeek()                           │
├─────────────────────┴────────────────────────────────────────────┤
│                         audioService                             │
│                      (1237 lines)                                │
├──────────────────────────────────────────────────────────────────┤
│  loadAudio()      │  seekToGlobal()  │  getGlobalPositionSync()  │
│  play() / pause() │  (50ms debounce) │  (track-aware position)   │
├──────────────────────────────────────────────────────────────────┤
│                         audioMachine                             │
│                      (XState, 517 lines)                         │
├──────────────────────────────────────────────────────────────────┤
│  States: idle → loading → ready → playing/paused/buffering      │
│          ↓ seeking (blocks POSITION_UPDATE events)               │
│          ↓ error                                                 │
├──────────────────────────────────────────────────────────────────┤
│                         expo-av                                  │
│                    (Native audio playback)                       │
└──────────────────────────────────────────────────────────────────┘
```

### Flow: Play Book

```
User taps "Play"
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ playerStore.loadBook(bookId)                                    │
│ Location: src/features/player/stores/playerStore.ts:863-1319    │
├─────────────────────────────────────────────────────────────────┤
│ 1. Check if same book already loaded → resume                   │
│ 2. Set isLoading = true                                         │
│ 3. Fetch book details from cache/server                         │
│ 4. Calculate tracks from audioFiles                             │
│ 5. Build chapters array                                         │
│ 6. Restore progress from SQLite                                 │
│ 7. Get per-book playback rate from bookSpeedMap                 │
│ 8. Call audioService.loadAudio(tracks, startPosition)           │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ audioService.loadAudio()                                        │
│ Location: src/features/player/services/audioService.ts:639-754  │
├─────────────────────────────────────────────────────────────────┤
│ 1. Determine which track contains startPosition                 │
│ 2. Calculate position within track                              │
│ 3. Create expo-av Audio.Sound instance                          │
│ 4. Configure playback settings (rate, volume)                   │
│ 5. Set up playback status callback                              │
│ 6. Register with expo-media-control for lock screen             │
│ 7. Transition audioMachine to 'ready' state                     │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ audioMachine transitions: idle → loading → ready                │
│ Location: src/features/player/machines/audioMachine.ts:79-120   │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ User presses play → audioMachine: ready → playing               │
│ Playback status updates flow back to playerStore                │
└─────────────────────────────────────────────────────────────────┘
```

### Flow: Seeking (Critical Pattern)

The seeking flow has a critical design to prevent UI jitter during scrubbing:

```
User starts dragging timeline
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ playerStore.startSeeking()                                      │
│ Location: src/features/player/stores/playerStore.ts:1548-1571   │
├─────────────────────────────────────────────────────────────────┤
│ set({ isSeeking: true, seekPosition: currentPosition })         │
│                                                                 │
│ CRITICAL: While isSeeking === true:                             │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ • Position updates from audio are BLOCKED                   │ │
│ │ • audioMachine in 'seeking' state ignores POSITION_UPDATE   │ │
│ │ • UI shows seekPosition instead of actual position          │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
      │
      │ User drags slider
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ playerStore updates seekPosition continuously                   │
│ (No audio seeks during drag - only visual feedback)             │
└─────────────────────────────────────────────────────────────────┘
      │
      │ User releases slider
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ playerStore.commitSeek()                                        │
│ Location: src/features/player/stores/playerStore.ts:1573-1605   │
├─────────────────────────────────────────────────────────────────┤
│ 1. Call audioService.seekToGlobal(seekPosition)                 │
│ 2. Wait for seek to complete (50ms debounce for track switch)   │
│ 3. set({ isSeeking: false })                                    │
│ 4. Resume position updates from audio                           │
└─────────────────────────────────────────────────────────────────┘
```

### Flow: Track Navigation

```
┌─────────────────────────────────────────────────────────────────┐
│ Multi-Track Book Structure                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Track 0      Track 1      Track 2      Track 3                 │
│  ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐                   │
│  │ 0:00 │    │ 1:30 │    │ 2:45 │    │ 3:30 │                   │
│  │  to  │    │  to  │    │  to  │    │  to  │                   │
│  │ 1:30 │    │ 2:45 │    │ 3:30 │    │ 4:00 │                   │
│  └──────┘    └──────┘    └──────┘    └──────┘                   │
│      │           │           │           │                       │
│      └───────────┴───────────┴───────────┘                       │
│                        │                                         │
│              Global Position: 2:30                               │
│              = Track 1 @ 1:00 (local position)                   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ audioService.getGlobalPositionSync()                            │
│ Location: src/features/player/services/audioService.ts:504-532  │
├─────────────────────────────────────────────────────────────────┤
│ Converts track-local position to global book position:          │
│                                                                 │
│ globalPosition = sum(tracks[0..currentTrack-1].duration)        │
│                + currentTrackPosition                           │
└─────────────────────────────────────────────────────────────────┘
```

### Flow: Chapter Jump

```
User taps chapter in list
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ playerStore.jumpToChapter(chapterIndex)                         │
│ Location: src/features/player/stores/playerStore.ts:1452-1501   │
├─────────────────────────────────────────────────────────────────┤
│ 1. Get chapter = chapters[chapterIndex]                         │
│ 2. targetPosition = chapter.start                               │
│ 3. set({ isSeeking: true, seekPosition: targetPosition })       │
│ 4. Call audioService.seekToGlobal(targetPosition)               │
│ 5. Wait for completion                                          │
│ 6. set({ isSeeking: false })                                    │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ chapterNavigator.ts                                             │
│ Location: src/features/player/utils/chapterNavigator.ts         │
├─────────────────────────────────────────────────────────────────┤
│ Helper functions:                                               │
│ ├─ getCurrentChapter(position, chapters)                        │
│ ├─ getNextChapter(position, chapters)                           │
│ ├─ getPreviousChapter(position, chapters)                       │
│ └─ getChapterProgress(position, chapter)                        │
└─────────────────────────────────────────────────────────────────┘
```

### Per-Book Playback Speed

```
┌─────────────────────────────────────────────────────────────────┐
│ bookSpeedMap: Record<string, number>                            │
│ Location: src/features/player/stores/playerStore.ts:145         │
├─────────────────────────────────────────────────────────────────┤
│ {                                                               │
│   "book-123": 1.25,    // User prefers 1.25x for this book      │
│   "book-456": 1.5,     // Different book, different speed       │
│   "book-789": 1.0,     // Normal speed                          │
│ }                                                               │
├─────────────────────────────────────────────────────────────────┤
│ On loadBook():                                                  │
│ 1. Check bookSpeedMap[bookId]                                   │
│ 2. If exists, restore that speed                                │
│ 3. If not, use default (1.0)                                    │
│                                                                 │
│ On setPlaybackRate(rate):                                       │
│ 1. Update audioService playback rate                            │
│ 2. Update bookSpeedMap[currentBookId] = rate                    │
│ 3. Persist to AsyncStorage                                      │
└─────────────────────────────────────────────────────────────────┘
```

### Progress Sync (3-Tier System)

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROGRESS TRACKING TIERS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Tier 1: Real-Time (Memory)                                     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ playerStore.position (updated every ~100ms)                 ││
│  │ Used for: UI display, seeking                               ││
│  └─────────────────────────────────────────────────────────────┘│
│                           │                                     │
│                           │ Throttled (5 seconds)               │
│                           ▼                                     │
│  Tier 2: Local Persistence (SQLite)                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ sqliteCache.saveProgress()                                  ││
│  │ Table: playback_progress                                    ││
│  │ Fields: book_id, position, duration, updated_at             ││
│  │ Used for: App restart recovery, offline progress            ││
│  └─────────────────────────────────────────────────────────────┘│
│                           │                                     │
│                           │ Throttled (30 seconds or pause)     │
│                           ▼                                     │
│  Tier 3: Server Sync                                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ backgroundSyncService.saveProgress()                        ││
│  │ POST /api/me/progress/:itemId                               ││
│  │ Conflict resolution: Last-write-wins (by timestamp)         ││
│  │ Retry: 3 attempts, exponential backoff                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Download System

### Overview

The download system manages a queue of audiobook downloads with support for WiFi-only mode, pause/resume, and integrity verification.

### Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         DOWNLOAD FLOW                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Request          Queue Management         File Operations  │
│  ┌──────────┐         ┌──────────────┐         ┌──────────────┐  │
│  │ Download │────────▶│ downloadMgr  │────────▶│ expo-file-   │  │
│  │  Button  │         │ addToQueue() │         │   system     │  │
│  └──────────┘         └──────────────┘         └──────────────┘  │
│                              │                        │          │
│                              ▼                        ▼          │
│                       ┌──────────────┐         ┌──────────────┐  │
│                       │   SQLite     │         │  Downloads   │  │
│                       │ download_    │         │  Directory   │  │
│                       │   queue      │         └──────────────┘  │
│                       └──────────────┘                           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Download State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                    DOWNLOAD STATE MACHINE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐    start()    ┌─────────────┐                      │
│  │ pending │──────────────▶│ downloading │                      │
│  └─────────┘               └─────────────┘                      │
│       ▲                          │                              │
│       │                          ├─────────────┬────────────┐   │
│       │                          │             │            │   │
│       │                          ▼             ▼            ▼   │
│  ┌─────────┐              ┌──────────┐  ┌─────────┐  ┌───────┐  │
│  │ waiting │◀─────────────│  paused  │  │ complete│  │ error │  │
│  │  _wifi  │  pause()     └──────────┘  └─────────┘  └───────┘  │
│  └─────────┘                   │              │           │     │
│       │                        │              │           │     │
│       │ resume()               │ resume()     │           │     │
│       │ (wifi on)              │              │           │     │
│       └────────────────────────┴──────────────┘           │     │
│                                                           │     │
│                            ◀────────────── retry() ───────┘     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ Location: src/core/services/downloadManager.ts                  │
└─────────────────────────────────────────────────────────────────┘
```

### Flow: Add to Download Queue

```
User taps "Download"
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ downloadManager.addToQueue(bookId)                              │
│ Location: src/core/services/downloadManager.ts:234-298          │
├─────────────────────────────────────────────────────────────────┤
│ 1. Check if already downloaded/queued → early return            │
│ 2. Fetch book details from cache/server                         │
│ 3. Calculate total size from audioFiles                         │
│ 4. Create download task:                                        │
│    {                                                            │
│      id: bookId,                                                │
│      status: 'pending',                                         │
│      progress: 0,                                               │
│      totalSize: sum(audioFiles.size),                           │
│      tracks: audioFiles.map(f => ({                             │
│        ino: f.ino,                                              │
│        url: f.url,                                              │
│        size: f.size,                                            │
│        status: 'pending'                                        │
│      }))                                                        │
│    }                                                            │
│ 5. Insert into SQLite download_queue                            │
│ 6. Trigger processQueue()                                       │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ downloadManager.processQueue()                                  │
│ Location: src/core/services/downloadManager.ts:669-748          │
├─────────────────────────────────────────────────────────────────┤
│ 1. Check network state via networkMonitor                       │
│ 2. If WiFi-only mode and not on WiFi:                           │
│    → Move task to 'waiting_wifi' state                          │
│ 3. Get next 'pending' task from queue                           │
│ 4. Set task status to 'downloading'                             │
│ 5. Call downloadBook(task)                                      │
└─────────────────────────────────────────────────────────────────┘
```

### Flow: Download Execution

```
┌─────────────────────────────────────────────────────────────────┐
│ downloadManager.downloadBook(task)                              │
│ Location: src/core/services/downloadManager.ts:753-836          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ for each track in task.tracks:                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 1. Create DownloadResumable (expo-file-system)            │   │
│ │                                                           │   │
│ │ 2. Set up progress callback:                              │   │
│ │    ┌─────────────────────────────────────────────────────┐│   │
│ │    │ onProgress(downloadProgress, totalBytes)            ││   │
│ │    │ → Update task.tracks[i].downloaded                  ││   │
│ │    │ → Calculate overall progress                        ││   │
│ │    │ → Update SQLite                                     ││   │
│ │    │ → Emit progress event                               ││   │
│ │    └─────────────────────────────────────────────────────┘│   │
│ │                                                           │   │
│ │ 3. Start download with retry logic:                       │   │
│ │    ┌─────────────────────────────────────────────────────┐│   │
│ │    │ for attempt = 0 to 3:                               ││   │
│ │    │   try:                                              ││   │
│ │    │     await downloadResumable.downloadAsync()         ││   │
│ │    │     break                                           ││   │
│ │    │   catch:                                            ││   │
│ │    │     if attempt < 3:                                 ││   │
│ │    │       delay = 2^attempt * 1000 (exponential)        ││   │
│ │    │       await sleep(delay)                            ││   │
│ │    │     else:                                           ││   │
│ │    │       mark track as 'error'                         ││   │
│ │    └─────────────────────────────────────────────────────┘│   │
│ │                                                           │   │
│ │ 4. Verify file integrity:                                 │   │
│ │    → Check file exists                                    │   │
│ │    → Verify file size matches expected                    │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ After all tracks complete:                                      │
│ → Mark task status = 'complete'                                 │
│ → Download cover image                                          │
│ → Update SQLite downloads table                                 │
│ → Trigger processQueue() for next item                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### File Storage Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ FileSystem.documentDirectory/downloads/                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ downloads/                                                      │
│ ├── {libraryItemId}/                                            │
│ │   ├── {audioFile1.ino}.m4b                                    │
│ │   ├── {audioFile2.ino}.mp3                                    │
│ │   ├── cover.jpg                                               │
│ │   └── metadata.json                                           │
│ ├── {libraryItemId2}/                                           │
│ │   └── ...                                                     │
│ └── ...                                                         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ Naming Convention:                                              │
│ - Audio files: {ino}.{ext} (uses server's ino for uniqueness)   │
│ - Cover: cover.{ext} (preserves original extension)             │
│ - Metadata: metadata.json (book details for offline use)        │
└─────────────────────────────────────────────────────────────────┘
```

### SQLite Schema: Downloads

```sql
-- Location: src/core/services/sqliteCache.ts:222-280

CREATE TABLE downloads (
  id TEXT PRIMARY KEY,           -- libraryItemId
  title TEXT NOT NULL,
  author TEXT,
  cover_path TEXT,
  total_size INTEGER,
  downloaded_size INTEGER,
  duration REAL,
  status TEXT DEFAULT 'complete',
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE download_queue (
  id TEXT PRIMARY KEY,           -- libraryItemId
  book_data TEXT NOT NULL,       -- JSON: book details
  tracks TEXT NOT NULL,          -- JSON: track download status
  status TEXT DEFAULT 'pending',
  progress REAL DEFAULT 0,
  total_size INTEGER,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE download_tracks (
  id TEXT PRIMARY KEY,           -- track ino
  download_id TEXT NOT NULL,     -- foreign key to downloads
  file_path TEXT,
  file_size INTEGER,
  duration REAL,
  status TEXT DEFAULT 'pending',
  FOREIGN KEY (download_id) REFERENCES downloads(id)
);
```

---

## Sync & Network System

### Overview

The sync system handles bidirectional data synchronization between the app and server, with support for offline operation, conflict resolution, and real-time updates via WebSocket.

### Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      SYNC ARCHITECTURE                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐  │
│  │ backgroundSync │    │   syncQueue    │    │ websocketSvc   │  │
│  │    Service     │    │                │    │                │  │
│  └───────┬────────┘    └───────┬────────┘    └───────┬────────┘  │
│          │                     │                     │           │
│          ▼                     ▼                     ▼           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                      Network Layer                         │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │  │
│  │  │ networkMon.  │  │  baseClient  │  │  networkOptim.   │  │  │
│  │  │ (WiFi state) │  │  (Axios)     │  │  (dedup/cache)   │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│                    ┌──────────────────┐                          │
│                    │  ABS Server API  │                          │
│                    └──────────────────┘                          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Flow: Progress Sync to Server

```
Playback position changes
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ Throttle gate (30 seconds since last sync OR playback pause)   │
│ Location: src/features/player/services/backgroundSyncService.ts│
├─────────────────────────────────────────────────────────────────┤
│ if (timeSinceLastSync < 30s && !isPaused) return;              │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ backgroundSyncService.saveProgress()                            │
│ Location: src/features/player/services/backgroundSyncService.ts:91-130
├─────────────────────────────────────────────────────────────────┤
│ 1. Save to SQLite first (offline-first)                         │
│    → sqliteCache.savePlaybackProgress(bookId, position, ...)    │
│                                                                 │
│ 2. Check network status                                         │
│    → If offline, queue for later                                │
│                                                                 │
│ 3. If online, sync to server:                                   │
│    POST /api/me/progress/{itemId}                               │
│    {                                                            │
│      currentTime: position,                                     │
│      duration: totalDuration,                                   │
│      progress: position / totalDuration,                        │
│      isFinished: position >= totalDuration - 30                 │
│    }                                                            │
│                                                                 │
│ 4. Retry logic on failure:                                      │
│    ┌─────────────────────────────────────────────────────────┐  │
│    │ for attempt = 0 to 3:                                   │  │
│    │   try:                                                  │  │
│    │     await api.updateProgress(...)                       │  │
│    │     break                                               │  │
│    │   catch:                                                │  │
│    │     delay = 2^attempt * 1000                            │  │
│    │     await sleep(delay)                                  │  │
│    └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Flow: Conflict Resolution

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONFLICT RESOLUTION                           │
│        Location: backgroundSyncService.ts:240-301                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Strategy: LAST-WRITE-WINS (by timestamp)                        │
│                                                                 │
│ On app foreground:                                              │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 1. Fetch server progress: GET /api/me/progress/{itemId}  │   │
│ │                                                           │   │
│ │ 2. Fetch local progress: sqliteCache.getProgress(itemId) │   │
│ │                                                           │   │
│ │ 3. Compare timestamps:                                    │   │
│ │    ┌─────────────────────────────────────────────────┐    │   │
│ │    │ if (server.updatedAt > local.updatedAt) {       │    │   │
│ │    │   // Server wins - apply server progress        │    │   │
│ │    │   playerStore.seekToPosition(server.currentTime)│    │   │
│ │    │   sqliteCache.saveProgress(server.*)            │    │   │
│ │    │ } else if (local.updatedAt > server.updatedAt) {│    │   │
│ │    │   // Local wins - push to server                │    │   │
│ │    │   api.updateProgress(local.*)                   │    │   │
│ │    │ } else {                                        │    │   │
│ │    │   // Same timestamp - no action                 │    │   │
│ │    │ }                                               │    │   │
│ │    └─────────────────────────────────────────────────┘    │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### WebSocket Real-Time Events

```
┌─────────────────────────────────────────────────────────────────┐
│                    WEBSOCKET SERVICE                             │
│           Location: src/core/services/websocketService.ts        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Connection:                                                     │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ socket = io(serverUrl, {                                  │   │
│ │   auth: { token: authToken },                             │   │
│ │   transports: ['websocket'],                              │   │
│ │   reconnection: true,                                     │   │
│ │   reconnectionAttempts: 10,                               │   │
│ │   reconnectionDelay: 1000,                                │   │
│ │   reconnectionDelayMax: 30000                             │   │
│ │ })                                                        │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ Events Handled:                                                 │
│ ├─ user_item_progress_updated                                   │
│ │  → Update local progress, sync playerStore if same book       │
│ │                                                               │
│ ├─ item_added                                                   │
│ │  → Invalidate library cache, trigger refresh                  │
│ │                                                               │
│ ├─ item_updated                                                 │
│ │  → Update local cache for specific item                       │
│ │                                                               │
│ └─ item_removed                                                 │
│    → Remove from cache, handle if currently playing             │
│                                                                 │
│ Reconnection Strategy:                                          │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Attempt 1: 1s delay                                       │   │
│ │ Attempt 2: 2s delay                                       │   │
│ │ Attempt 3: 4s delay                                       │   │
│ │ ...                                                       │   │
│ │ Attempt 10: 30s delay (capped)                            │   │
│ │ After 10 attempts: Stop, wait for app foreground          │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Network State Handling

```
┌─────────────────────────────────────────────────────────────────┐
│                    NETWORK MONITOR                               │
│           Location: src/core/services/networkMonitor.ts          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ State:                                                          │
│ ├─ isConnected: boolean                                         │
│ ├─ isWifi: boolean                                              │
│ └─ connectionType: 'wifi' | 'cellular' | 'none'                 │
│                                                                 │
│ Events:                                                         │
│ ├─ 'online'  → Resume pending syncs, process download queue    │
│ ├─ 'offline' → Pause downloads, switch to offline mode         │
│ └─ 'wifi_changed' → Check WiFi-only download setting           │
│                                                                 │
│ Usage:                                                          │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ // Check before download                                  │   │
│ │ if (downloadSettings.wifiOnly && !networkMonitor.isWifi) {│   │
│ │   task.status = 'waiting_wifi';                           │   │
│ │   return;                                                 │   │
│ │ }                                                         │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Lifecycle & Cache System

### Overview

The lifecycle system manages app startup, background/foreground transitions, and cache invalidation/refresh strategies.

### App Initialization Flow

```
App Launch
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ AppNavigator (entry point)                                      │
│ Location: src/navigation/AppNavigator.tsx                       │
├─────────────────────────────────────────────────────────────────┤
│ 1. Mount <AuthProvider>                                         │
│ 2. Mount <QueryClientProvider>                                  │
│ 3. Start useAppBootstrap() hook                                 │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ useAppBootstrap()                                               │
│ Location: src/core/hooks/useAppBootstrap.ts                     │
├─────────────────────────────────────────────────────────────────┤
│ PARALLEL EXECUTION:                                             │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Promise.all([                                             │   │
│ │   authService.restoreSession(),    // Restore auth        │   │
│ │   sqliteCache.initialize(),        // Open SQLite DB      │   │
│ │   libraryCache.loadFromStorage(),  // Load library cache  │   │
│ │ ])                                                        │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ If authenticated:                                               │
│ → appInitializer.initialize()                                   │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ appInitializer.initialize()                                     │
│ Location: src/core/services/appInitializer.ts:32-90             │
├─────────────────────────────────────────────────────────────────┤
│ PARALLEL TASKS:                                                 │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 1. Fetch user libraries (for library selector)           │   │
│ │ 2. Prefetch library items (background)                    │   │
│ │ 3. Initialize download manager                            │   │
│ │ 4. Connect WebSocket                                      │   │
│ │ 5. Register app state listener                            │   │
│ │ 6. Initialize automotive services (CarPlay/Android Auto)  │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ SEQUENTIAL (after parallel):                                    │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 1. Restore player state (last playing book)              │   │
│ │ 2. Resume download queue if any pending                  │   │
│ └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Cold Start vs Warm Start

```
┌─────────────────────────────────────────────────────────────────┐
│                    STARTUP OPTIMIZATION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ COLD START (app killed, first launch):                          │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Time: ~2-3 seconds                                        │   │
│ │                                                           │   │
│ │ 1. Load auth from SecureStore                             │   │
│ │ 2. Verify token with server (if online)                   │   │
│ │ 3. Load library cache from AsyncStorage                   │   │
│ │ 4. Initialize SQLite                                      │   │
│ │ 5. Full initialization sequence                           │   │
│ │                                                           │   │
│ │ Optimization: Show cached library immediately             │   │
│ │              Fetch fresh data in background               │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ WARM START (app backgrounded, returning):                       │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Time: <500ms                                              │   │
│ │                                                           │   │
│ │ 1. Check time since background                            │   │
│ │    - <5s:   No refresh needed                             │   │
│ │    - 5s-1m: Refresh progress only                         │   │
│ │    - >1m:   Full library refresh                          │   │
│ │                                                           │   │
│ │ 2. Reconnect WebSocket if disconnected                    │   │
│ │ 3. Resume downloads if pending                            │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ Location: src/core/lifecycle/appStateListener.ts:82-111         │
└─────────────────────────────────────────────────────────────────┘
```

### Library Cache System

```
┌─────────────────────────────────────────────────────────────────┐
│                    LIBRARY CACHE                                 │
│           Location: src/core/cache/libraryCache.ts               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Storage: AsyncStorage (key: 'library_cache_v2')                 │
│ TTL: 30 days                                                    │
│ Max Size: 1.5MB (Android AsyncStorage limit consideration)      │
│                                                                 │
│ Structure:                                                      │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ {                                                         │   │
│ │   version: 2,                                             │   │
│ │   timestamp: Date.now(),                                  │   │
│ │   libraries: {                                            │   │
│ │     [libraryId]: {                                        │   │
│ │       items: LibraryItem[],                               │   │
│ │       series: Series[],                                   │   │
│ │       authors: Author[],                                  │   │
│ │       genres: string[]                                    │   │
│ │     }                                                     │   │
│ │   }                                                       │   │
│ │ }                                                         │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ Load Strategy:                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 1. Load from AsyncStorage on app start                    │   │
│ │ 2. If cache exists and not expired:                       │   │
│ │    → Show cached data immediately                         │   │
│ │    → Fetch fresh in background                            │   │
│ │ 3. If cache expired or missing:                           │   │
│ │    → Show loading skeleton                                │   │
│ │    → Fetch and cache                                      │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ Invalidation Triggers:                                          │
│ ├─ WebSocket: item_added, item_updated, item_removed            │
│ ├─ Manual: Pull-to-refresh                                      │
│ ├─ Login/logout                                                 │
│ └─ Library switch                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### React Query Configuration

```
┌─────────────────────────────────────────────────────────────────┐
│                    REACT QUERY CONFIG                            │
│           Location: src/core/queryClient.ts                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Default Options:                                                │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ {                                                         │   │
│ │   queries: {                                              │   │
│ │     staleTime: 5 * 60 * 1000,    // 5 minutes            │   │
│ │     gcTime: 30 * 60 * 1000,      // 30 minutes           │   │
│ │     retry: 2,                                             │   │
│ │     retryDelay: (attempt) => Math.min(1000 * 2^attempt,   │   │
│ │                                        30000),            │   │
│ │   },                                                      │   │
│ │   mutations: {                                            │   │
│ │     retry: 1,                                             │   │
│ │   }                                                       │   │
│ │ }                                                         │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ Query Keys Factory:                                             │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ queryKeys = {                                             │   │
│ │   libraryItems: (libraryId) =>                            │   │
│ │     ['library', libraryId, 'items'],                      │   │
│ │   bookDetail: (bookId) =>                                 │   │
│ │     ['book', bookId],                                     │   │
│ │   userProgress: (bookId) =>                               │   │
│ │     ['progress', bookId],                                 │   │
│ │   series: (libraryId) =>                                  │   │
│ │     ['library', libraryId, 'series'],                     │   │
│ │   authors: (libraryId) =>                                 │   │
│ │     ['library', libraryId, 'authors'],                    │   │
│ │ }                                                         │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### SQLite Schema Overview

```sql
-- Location: src/core/services/sqliteCache.ts

-- Core tables
CREATE TABLE user_books (
  id TEXT PRIMARY KEY,
  library_id TEXT,
  title TEXT,
  author TEXT,
  data TEXT,              -- Full JSON for offline
  updated_at INTEGER
);

CREATE TABLE playback_progress (
  book_id TEXT PRIMARY KEY,
  current_time REAL,
  duration REAL,
  progress REAL,
  is_finished INTEGER DEFAULT 0,
  updated_at INTEGER
);

CREATE TABLE downloads (
  id TEXT PRIMARY KEY,
  title TEXT,
  author TEXT,
  cover_path TEXT,
  total_size INTEGER,
  status TEXT,
  created_at INTEGER
);

CREATE TABLE download_queue (
  id TEXT PRIMARY KEY,
  book_data TEXT,
  tracks TEXT,
  status TEXT,
  progress REAL,
  created_at INTEGER
);

CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT,              -- 'progress', 'rating', etc.
  payload TEXT,           -- JSON data
  status TEXT,            -- 'pending', 'syncing', 'failed'
  retry_count INTEGER,
  created_at INTEGER
);
```

---

## Navigation System

### Overview

The navigation system uses React Navigation v7 with a tab-based structure and modal screens.

### Navigation Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    NAVIGATION HIERARCHY                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ AppNavigator (root)                                             │
│ ├─ LoginScreen (unauthenticated)                                │
│ │                                                               │
│ └─ MainTabs (authenticated)                                     │
│    ├─ HomeTab                                                   │
│    │  └─ HomeScreen                                             │
│    │                                                            │
│    ├─ DiscoverTab                                               │
│    │  └─ BrowseScreen                                           │
│    │                                                            │
│    └─ ProfileTab                                                │
│       └─ ProfileScreen                                          │
│                                                                 │
│ Modal Screens (stack on top of tabs):                           │
│ ├─ BookDetail                                                   │
│ ├─ SeriesDetail                                                 │
│ ├─ AuthorDetail                                                 │
│ ├─ NarratorDetail                                               │
│ ├─ Search                                                       │
│ ├─ Downloads                                                    │
│ ├─ Stats                                                        │
│ ├─ QueueScreen                                                  │
│ ├─ PlaybackSettings                                             │
│ ├─ StorageSettings                                              │
│ └─ Preferences                                                  │
│                                                                 │
│ Global Overlays (always visible when applicable):               │
│ ├─ CDPlayerScreen (full-screen player)                          │
│ ├─ GlobalMiniPlayer (floating at bottom)                        │
│ ├─ TopNav (custom navigation bar)                               │
│ └─ FloatingTabBar                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Player Visibility Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    PLAYER TRANSITIONS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Mini Player → Full Player:                                      │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Trigger: Tap on MiniPlayer OR Swipe up (threshold: -50px) │   │
│ │ Location: GlobalMiniPlayer.tsx:447-461                    │   │
│ │                                                           │   │
│ │ playerStore.setPlayerVisible(true)                        │   │
│ │ → CDPlayerScreen renders (was returning null)             │   │
│ │ → Animated slide up transition                            │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ Full Player → Mini Player:                                      │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Trigger: Tap close button OR Swipe down (threshold: 50px) │   │
│ │ Location: CDPlayerScreen.tsx:1487-1511                    │   │
│ │                                                           │   │
│ │ playerStore.setPlayerVisible(false)                       │   │
│ │ → Animated slide down transition                          │   │
│ │ → CDPlayerScreen returns null                             │   │
│ │ → MiniPlayer visible                                      │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ Visibility Logic:                                               │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ // CDPlayerScreen.tsx:2118                                │   │
│ │ if (!isPlayerVisible) return null;                        │   │
│ │                                                           │   │
│ │ // GlobalMiniPlayer visibility                            │   │
│ │ visible = hasBook && !isPlayerVisible                     │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Deep Linking

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEEP LINK HANDLING                            │
│           Location: src/navigation/AppNavigator.tsx              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ URL Schemes:                                                    │
│ ├─ audiobookshelf://book/{bookId}                               │
│ ├─ audiobookshelf://series/{seriesName}                         │
│ ├─ audiobookshelf://author/{authorId}                           │
│ └─ audiobookshelf://play/{bookId}                               │
│                                                                 │
│ Handler:                                                        │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Linking.addEventListener('url', ({ url }) => {            │   │
│ │   const parsed = parseUrl(url);                           │   │
│ │   switch (parsed.type) {                                  │   │
│ │     case 'book':                                          │   │
│ │       navigation.navigate('BookDetail', { id: parsed.id })│   │
│ │       break;                                              │   │
│ │     case 'play':                                          │   │
│ │       playerStore.loadBook(parsed.id);                    │   │
│ │       playerStore.play();                                 │   │
│ │       break;                                              │   │
│ │   }                                                       │   │
│ │ });                                                       │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Authentication System

### Overview

The authentication system handles login, session persistence, token refresh, and logout with secure storage.

### Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────┐      ┌────────────┐      ┌────────────────────┐  │
│  │ AuthContext│      │ authService│      │    SecureStore     │  │
│  │  (React)   │─────▶│  (logic)   │─────▶│  & AsyncStorage    │  │
│  └────────────┘      └────────────┘      └────────────────────┘  │
│        │                   │                       │             │
│        │                   │                       │             │
│        ▼                   ▼                       ▼             │
│  ┌────────────┐      ┌────────────┐      ┌────────────────────┐  │
│  │  UI State  │      │ API Client │      │   ABS Server       │  │
│  │isAuth, user│      │ (headers)  │      │   /api/authorize   │  │
│  └────────────┘      └────────────┘      └────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Flow: Login

```
User enters server URL, username, password
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ AuthContext.login()                                             │
│ Location: src/core/auth/authContext.tsx:126-154                 │
├─────────────────────────────────────────────────────────────────┤
│ 1. Validate server URL format                                   │
│ 2. Call authService.login(serverUrl, username, password)        │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ authService.login()                                             │
│ Location: src/core/auth/authService.ts:82-130                   │
├─────────────────────────────────────────────────────────────────┤
│ 1. POST {serverUrl}/login                                       │
│    Body: { username, password }                                 │
│                                                                 │
│ 2. Response:                                                    │
│    { user: {...}, userDefaultLibraryId: "...", token: "..." }  │
│                                                                 │
│ 3. Store credentials:                                           │
│    ┌─────────────────────────────────────────────────────────┐  │
│    │ SecureStore.setItem('auth_token', token)                │  │
│    │ SecureStore.setItem('server_url', serverUrl)            │  │
│    │ AsyncStorage.setItem('user_data', JSON.stringify(user)) │  │
│    └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│ 4. Configure API client:                                        │
│    apiClient.setAuthToken(token)                                │
│    apiClient.setServerUrl(serverUrl)                            │
│                                                                 │
│ 5. Connect WebSocket                                            │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ AuthContext updates state                                       │
│ → isAuthenticated = true                                        │
│ → user = { ... }                                                │
│ → Navigation switches to MainTabs                               │
└─────────────────────────────────────────────────────────────────┘
```

### Flow: Session Restore (Optimized)

```
App Launch
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ authService.restoreSessionOptimized()                           │
│ Location: src/core/auth/authService.ts:288-355                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ PARALLEL READ (3x faster than sequential):                      │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ const [token, serverUrl, userData] = await Promise.all([  │   │
│ │   SecureStore.getItemAsync('auth_token'),                 │   │
│ │   SecureStore.getItemAsync('server_url'),                 │   │
│ │   AsyncStorage.getItem('user_data'),                      │   │
│ │ ]);                                                       │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ If any missing → return { success: false }                      │
│                                                                 │
│ Configure API client immediately (optimistic):                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ apiClient.setAuthToken(token);                            │   │
│ │ apiClient.setServerUrl(serverUrl);                        │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ Background verification (non-blocking):                         │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ verifyTokenAsync().then(valid => {                        │   │
│ │   if (!valid) authContext.handleAuthFailure();            │   │
│ │ });                                                       │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Flow: 401 Error Handling

```
API Request fails with 401
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ baseClient response interceptor                                 │
│ Location: src/core/api/baseClient.ts:47-75                      │
├─────────────────────────────────────────────────────────────────┤
│ 1. Detect 401 status                                            │
│                                                                 │
│ 2. Attempt token verification:                                  │
│    ┌─────────────────────────────────────────────────────────┐  │
│    │ const isValid = await tryVerifyAuth();                  │  │
│    │                                                         │  │
│    │ // tryVerifyAuth: baseClient.ts:82-102                  │  │
│    │ try {                                                   │  │
│    │   const response = await api.get('/api/me');            │  │
│    │   return response.status === 200;                       │  │
│    │ } catch {                                               │  │
│    │   return false;                                         │  │
│    │ }                                                       │  │
│    └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│ 3. If verification fails:                                       │
│    → Emit 'auth_failure' event                                  │
│    → AuthContext.handleAuthFailure()                            │
│    → Clear stored credentials                                   │
│    → Navigate to LoginScreen                                    │
│                                                                 │
│ 4. If verification succeeds:                                    │
│    → Original request was for a protected resource user         │
│      doesn't have access to                                     │
│    → Show appropriate error message                             │
└─────────────────────────────────────────────────────────────────┘
```

### Secure Storage Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    STORAGE STRATEGY                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ SecureStore (expo-secure-store):                                │
│ ├─ auth_token      → JWT token                                  │
│ ├─ server_url      → Server URL                                 │
│ └─ Note: 2048 byte limit on iOS per item                        │
│                                                                 │
│ AsyncStorage:                                                   │
│ ├─ user_data       → User profile JSON                          │
│ ├─ library_cache   → Library items (large)                      │
│ └─ preferences     → User settings                              │
│                                                                 │
│ Why split?                                                      │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ • SecureStore: Encrypted, limited size, critical secrets  │   │
│ │ • AsyncStorage: Larger capacity, non-sensitive data       │   │
│ │ • SQLite: Structured data, queries, relationships         │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Client System

### Overview

The API client provides a centralized HTTP layer with request/response interceptors, retry logic, caching, and request deduplication.

### Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    API CLIENT STACK                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Application Code                                                │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ const book = await apiClient.getLibraryItem(bookId);       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  apiClient (high-level)      │                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Location: src/core/api/apiClient.ts                        │  │
│  │ Methods: getLibraryItem, getLibraries, updateProgress, etc │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  networkOptimizer            │                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Location: src/core/api/networkOptimizer.ts                 │  │
│  │ Features: Deduplication, Caching, Queue, Retry             │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  baseClient (Axios)          │                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Location: src/core/api/baseClient.ts                       │  │
│  │ Features: Interceptors, Auth headers, 401 handling         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│                    ┌────────────────┐                            │
│                    │  ABS Server    │                            │
│                    └────────────────┘                            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Request/Response Interceptors

```
┌─────────────────────────────────────────────────────────────────┐
│                    AXIOS INTERCEPTORS                            │
│           Location: src/core/api/baseClient.ts                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ REQUEST INTERCEPTOR (lines 35-45):                              │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ axios.interceptors.request.use(config => {                │   │
│ │   if (authToken) {                                        │   │
│ │     config.headers.Authorization = `Bearer ${authToken}`; │   │
│ │   }                                                       │   │
│ │   config.timeout = 30000; // 30 seconds                   │   │
│ │   return config;                                          │   │
│ │ });                                                       │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ RESPONSE INTERCEPTOR (lines 47-75):                             │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ axios.interceptors.response.use(                          │   │
│ │   response => response,                                   │   │
│ │   async error => {                                        │   │
│ │     if (error.response?.status === 401) {                 │   │
│ │       const isValid = await tryVerifyAuth();              │   │
│ │       if (!isValid) {                                     │   │
│ │         eventEmitter.emit('auth_failure');                │   │
│ │       }                                                   │   │
│ │     }                                                     │   │
│ │     throw error;                                          │   │
│ │   }                                                       │   │
│ │ );                                                        │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Network Optimizer Features

```
┌─────────────────────────────────────────────────────────────────┐
│                    NETWORK OPTIMIZER                             │
│           Location: src/core/api/networkOptimizer.ts             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 1. REQUEST DEDUPLICATION (lines 23-60)                          │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ • Window: 100ms                                           │   │
│ │ • Key: method + url + body hash                           │   │
│ │ • Multiple callers share same promise                     │   │
│ │                                                           │   │
│ │ Example:                                                  │   │
│ │ // Two components request same book simultaneously        │   │
│ │ apiClient.getBook('123'); // Makes request                │   │
│ │ apiClient.getBook('123'); // Returns same promise         │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ 2. RESPONSE CACHING (lines 72-151)                              │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ • TTL: 30 seconds (default)                               │   │
│ │ • GET requests only                                       │   │
│ │ • Configurable per endpoint                               │   │
│ │                                                           │   │
│ │ Cache key: url + params                                   │   │
│ │ Invalidation: On related mutation                         │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ 3. REQUEST QUEUE (lines 226-302)                                │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ • Max concurrent: 6                                       │   │
│ │ • Priority levels: high, normal, low                      │   │
│ │ • FIFO within same priority                               │   │
│ │                                                           │   │
│ │ Priority examples:                                        │   │
│ │ • high: Current book details, playback progress           │   │
│ │ • normal: Library items, search                           │   │
│ │ • low: Cover images, prefetch                             │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ 4. RETRY LOGIC (lines 176-209)                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ • Max attempts: 3                                         │   │
│ │ • Backoff: exponential (500ms, 1500ms, 3000ms)            │   │
│ │ • Retryable: 5xx, network errors, timeout                 │   │
│ │ • Non-retryable: 4xx (except 429)                         │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### API Endpoints Reference

```
┌─────────────────────────────────────────────────────────────────┐
│                    API ENDPOINTS                                 │
│           Location: src/core/api/endpoints.ts                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Authentication:                                                 │
│ ├─ POST /login                      → Login                     │
│ ├─ POST /logout                     → Logout                    │
│ └─ GET  /api/me                     → Current user              │
│                                                                 │
│ Libraries:                                                      │
│ ├─ GET  /api/libraries              → List libraries            │
│ └─ GET  /api/libraries/:id/items    → Library items             │
│                                                                 │
│ Items:                                                          │
│ ├─ GET  /api/items/:id              → Item details              │
│ ├─ GET  /api/items/:id/cover        → Cover image               │
│ └─ GET  /api/items/:id/play         → Playback session          │
│                                                                 │
│ Progress:                                                       │
│ ├─ GET  /api/me/progress/:itemId    → Get progress              │
│ └─ PATCH /api/me/progress/:itemId   → Update progress           │
│                                                                 │
│ Collections:                                                    │
│ ├─ GET  /api/libraries/:id/series   → All series                │
│ ├─ GET  /api/libraries/:id/authors  → All authors               │
│ └─ GET  /api/series/:id             → Series details            │
│                                                                 │
│ Search:                                                         │
│ └─ GET  /api/libraries/:id/search   → Search library            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## State Machine Reference

### Player State Machine (audioMachine.ts)

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUDIO STATE MACHINE                           │
│           Location: src/features/player/machines/audioMachine.ts │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                         ┌─────────┐                             │
│                         │  idle   │                             │
│                         └────┬────┘                             │
│                              │ LOAD                             │
│                              ▼                                  │
│                         ┌─────────┐                             │
│                         │ loading │                             │
│                         └────┬────┘                             │
│                              │ LOAD_SUCCESS                     │
│                              ▼                                  │
│                         ┌─────────┐                             │
│          ┌──────────────│  ready  │──────────────┐              │
│          │              └────┬────┘              │              │
│          │ ERROR             │ PLAY              │ ERROR        │
│          │                   ▼                   │              │
│          │              ┌─────────┐              │              │
│          │    ┌─────────│ playing │─────────┐    │              │
│          │    │         └────┬────┘         │    │              │
│          │    │ PAUSE        │              │    │              │
│          │    │              │ PAUSE        │    │              │
│          │    ▼              ▼              │    │              │
│          │ ┌──────┐     ┌─────────┐         │    │              │
│          │ │paused│◀───▶│buffering│         │    │              │
│          │ └──────┘     └─────────┘         │    │              │
│          │                                  │    │              │
│          │    SEEK_START                    │    │              │
│          │        │                         │    │              │
│          │        ▼                         │    │              │
│          │    ┌─────────┐                   │    │              │
│          │    │ seeking │ ◀── BLOCKS POSITION_UPDATE            │
│          │    └────┬────┘                   │    │              │
│          │         │ SEEK_COMPLETE          │    │              │
│          │         ▼                        │    │              │
│          │    (returns to previous state)   │    │              │
│          │                                  │    │              │
│          ▼                                  ▼    ▼              │
│     ┌─────────────────────────────────────────────────┐         │
│     │                    error                        │         │
│     └─────────────────────────────────────────────────┘         │
│                                                                 │
│ Events:                                                         │
│ ├─ LOAD, LOAD_SUCCESS, LOAD_ERROR                               │
│ ├─ PLAY, PAUSE                                                  │
│ ├─ SEEK_START, SEEK_COMPLETE                                    │
│ ├─ POSITION_UPDATE (blocked in seeking state!)                  │
│ ├─ TRACK_END                                                    │
│ └─ ERROR, RESET                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Download State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                    DOWNLOAD STATE MACHINE                        │
│           Location: src/core/services/downloadManager.ts         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│           ┌─────────┐                                           │
│           │ pending │                                           │
│           └────┬────┘                                           │
│                │ start()                                        │
│                │                                                │
│      ┌─────────┴─────────┐                                      │
│      │                   │                                      │
│      ▼                   ▼                                      │
│ ┌─────────────┐    ┌─────────────┐                              │
│ │ downloading │    │ waiting_wifi│ (if WiFi-only mode)          │
│ └──────┬──────┘    └──────┬──────┘                              │
│        │                  │                                     │
│  ┌─────┼─────┐            │ (WiFi connected)                    │
│  │     │     │            │                                     │
│  │     │     │            ▼                                     │
│  │     │     │      ┌─────────────┐                             │
│  │     │     └─────▶│ downloading │                             │
│  │     │            └─────────────┘                             │
│  │     │                                                        │
│  │     │ pause()                                                │
│  │     ▼                                                        │
│  │ ┌────────┐                                                   │
│  │ │ paused │                                                   │
│  │ └────┬───┘                                                   │
│  │      │ resume()                                              │
│  │      ▼                                                       │
│  │ ┌─────────────┐                                              │
│  │ │ downloading │                                              │
│  │ └─────────────┘                                              │
│  │                                                              │
│  │ success                      failure                         │
│  ▼                              ▼                               │
│ ┌──────────┐              ┌─────────┐                           │
│ │ complete │              │  error  │                           │
│ └──────────┘              └────┬────┘                           │
│                                │ retry() (if retries < 3)       │
│                                ▼                                │
│                          ┌─────────┐                            │
│                          │ pending │                            │
│                          └─────────┘                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Sync State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                    SYNC STATE MACHINE                            │
│           Location: src/features/player/services/syncService.ts  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    ┌──────────┐                                 │
│                    │   idle   │                                 │
│                    └────┬─────┘                                 │
│                         │ data changed                          │
│                         ▼                                       │
│                    ┌──────────┐                                 │
│                    │  dirty   │                                 │
│                    └────┬─────┘                                 │
│                         │ throttle expires                      │
│                         ▼                                       │
│                    ┌──────────┐                                 │
│                    │ syncing  │                                 │
│                    └────┬─────┘                                 │
│              ┌──────────┼──────────┐                            │
│              │          │          │                            │
│          success     failure    conflict                        │
│              │          │          │                            │
│              ▼          ▼          ▼                            │
│         ┌──────┐   ┌────────┐  ┌──────────┐                     │
│         │ idle │   │ retry  │  │ resolving│                     │
│         └──────┘   └────┬───┘  └────┬─────┘                     │
│                         │           │                           │
│                         │ backoff   │ resolve                   │
│                         ▼           ▼                           │
│                    ┌──────────┐  ┌──────┐                       │
│                    │ syncing  │  │ idle │                       │
│                    └──────────┘  └──────┘                       │
│                                                                 │
│ Conflict Resolution: Last-write-wins (by timestamp)            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Network State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                    NETWORK STATE MACHINE                         │
│           Location: src/core/services/networkMonitor.ts          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│     ┌─────────────────────────────────────────────────────┐     │
│     │                                                     │     │
│     │                     ┌────────┐                      │     │
│     │                     │ online │                      │     │
│     │                     └───┬────┘                      │     │
│     │                         │                           │     │
│     │    ┌────────────────────┼────────────────────┐      │     │
│     │    │                    │                    │      │     │
│     │    ▼                    ▼                    ▼      │     │
│     │ ┌──────┐           ┌─────────┐         ┌────────┐   │     │
│     │ │ wifi │           │cellular │         │ethernet│   │     │
│     │ └──────┘           └─────────┘         └────────┘   │     │
│     │                                                     │     │
│     └──────────────────────────┬──────────────────────────┘     │
│                                │                                │
│                                │ connection lost                │
│                                ▼                                │
│                           ┌─────────┐                           │
│                           │ offline │                           │
│                           └────┬────┘                           │
│                                │                                │
│                                │ connection restored            │
│                                ▼                                │
│                           ┌────────┐                            │
│                           │ online │                            │
│                           └────────┘                            │
│                                                                 │
│ Events Emitted:                                                 │
│ ├─ 'online'       → Resume syncs, process download queue       │
│ ├─ 'offline'      → Pause downloads, enable offline mode       │
│ └─ 'wifi_changed' → Check WiFi-only download settings          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Error Handling Reference

### Error Service

```
┌─────────────────────────────────────────────────────────────────┐
│                    ERROR SERVICE                                 │
│           Location: src/core/errors/errorService.ts              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Error Types:                                                    │
│ ├─ NetworkError    → Connectivity issues, timeouts              │
│ ├─ AuthError       → 401, 403, token expired                    │
│ ├─ APIError        → 4xx, 5xx responses                         │
│ ├─ StorageError    → SQLite, AsyncStorage failures              │
│ ├─ PlaybackError   → Audio loading, codec issues                │
│ └─ DownloadError   → Download failures, disk space              │
│                                                                 │
│ Error Handling Strategy:                                        │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 1. Catch at service layer                                 │   │
│ │ 2. Classify error type                                    │   │
│ │ 3. Log with context                                       │   │
│ │ 4. Determine recovery action:                             │   │
│ │    • Retry (network, timeout)                             │   │
│ │    • Re-authenticate (401)                                │   │
│ │    • Show user message (unrecoverable)                    │   │
│ │ 5. Propagate or handle                                    │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ User-Facing Messages:                                           │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Network:  "Unable to connect. Check your connection."     │   │
│ │ Auth:     "Session expired. Please log in again."         │   │
│ │ Server:   "Server error. Please try again later."         │   │
│ │ Playback: "Unable to play. Try downloading first."        │   │
│ │ Download: "Download failed. Check storage space."         │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Error Recovery Patterns

```
┌─────────────────────────────────────────────────────────────────┐
│                    ERROR RECOVERY PATTERNS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Pattern 1: Retry with Exponential Backoff                       │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Used by: API requests, downloads, sync                    │   │
│ │                                                           │   │
│ │ async function withRetry(fn, maxAttempts = 3) {           │   │
│ │   for (let i = 0; i < maxAttempts; i++) {                 │   │
│ │     try {                                                 │   │
│ │       return await fn();                                  │   │
│ │     } catch (error) {                                     │   │
│ │       if (i === maxAttempts - 1) throw error;             │   │
│ │       await delay(Math.pow(2, i) * 1000);                 │   │
│ │     }                                                     │   │
│ │   }                                                       │   │
│ │ }                                                         │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ Pattern 2: Fallback to Cache                                    │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Used by: Library data, book details                       │   │
│ │                                                           │   │
│ │ async function getWithFallback(id) {                      │   │
│ │   try {                                                   │   │
│ │     return await api.get(id);                             │   │
│ │   } catch {                                               │   │
│ │     return cache.get(id); // Stale better than nothing    │   │
│ │   }                                                       │   │
│ │ }                                                         │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ Pattern 3: Queue for Later                                      │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Used by: Progress sync when offline                       │   │
│ │                                                           │   │
│ │ async function syncOrQueue(data) {                        │   │
│ │   if (networkMonitor.isOnline) {                          │   │
│ │     await api.sync(data);                                 │   │
│ │   } else {                                                │   │
│ │     syncQueue.add(data);                                  │   │
│ │     // Will be processed when online                      │   │
│ │   }                                                       │   │
│ │ }                                                         │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ Pattern 4: Graceful Degradation                                 │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Used by: Cover images, metadata                           │   │
│ │                                                           │   │
│ │ <Image                                                    │   │
│ │   source={coverUrl}                                       │   │
│ │   onError={() => setShowPlaceholder(true)}                │   │
│ │   placeholder={<BookPlaceholder />}                       │   │
│ │ />                                                        │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Reference Tables

### Timing Constants

| Constant | Value | Location | Purpose |
|----------|-------|----------|---------|
| Seek debounce | 50ms | audioService.ts | Prevent rapid track switches |
| Progress throttle (UI) | 100ms | playerStore.ts | UI update frequency |
| Progress throttle (SQLite) | 5s | playerStore.ts | Local save frequency |
| Progress throttle (Server) | 30s | backgroundSyncService.ts | Server sync frequency |
| API timeout | 30s | baseClient.ts | Request timeout |
| Request dedup window | 100ms | networkOptimizer.ts | Deduplication window |
| Response cache TTL | 30s | networkOptimizer.ts | Cache duration |
| Query staleTime | 5min | queryClient.ts | React Query staleness |
| Query gcTime | 30min | queryClient.ts | Garbage collection |
| Library cache TTL | 30 days | libraryCache.ts | Cache expiration |
| WebSocket reconnect max | 30s | websocketService.ts | Max reconnect delay |

### Storage Keys

| Key | Storage | Purpose |
|-----|---------|---------|
| auth_token | SecureStore | JWT token |
| server_url | SecureStore | Server URL |
| user_data | AsyncStorage | User profile |
| library_cache_v2 | AsyncStorage | Library items |
| theme_settings | AsyncStorage | Theme preferences |
| download_settings | AsyncStorage | WiFi-only, etc. |

### SQLite Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| user_books | Offline book data | id, library_id, data (JSON) |
| playback_progress | Local progress | book_id, current_time, updated_at |
| downloads | Completed downloads | id, title, cover_path, status |
| download_queue | Pending downloads | id, tracks (JSON), progress |
| sync_queue | Pending syncs | type, payload, retry_count |

---

*Document generated from comprehensive codebase analysis. Last updated: 2025-01-29*
