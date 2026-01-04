# AudiobookShelf Player System - Deep Dive

**Total Lines of Code:** ~6,000+ across all player-related files
**Core Files:** playerStore.ts (2,579), audioService.ts (1,237), audioMachine.ts (517)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [File Inventory](#file-inventory)
3. [playerStore.ts - The Brain](#playerstorerts---the-brain)
4. [audioService.ts - The Muscles](#audioservicets---the-muscles)
5. [audioMachine.ts - The Nervous System](#audiomachinets---the-nervous-system)
6. [Seeking System - The Critical Fix](#seeking-system---the-critical-fix)
7. [Multi-Track Playback](#multi-track-playback)
8. [Progress Sync Pipeline](#progress-sync-pipeline)
9. [Smart Rewind Algorithm](#smart-rewind-algorithm)
10. [Sleep Timer & Shake Detection](#sleep-timer--shake-detection)
11. [Joystick Seek Controls](#joystick-seek-controls)
12. [Session Management](#session-management)
13. [Offline Playback](#offline-playback)
14. [Lock Screen & Media Controls](#lock-screen--media-controls)
15. [State Flow Diagrams](#state-flow-diagrams)
16. [Race Conditions & Guards](#race-conditions--guards)
17. [Performance Optimizations](#performance-optimizations)
18. [Testing](#testing)

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              UI LAYER                                       │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────────────────┐ │
│  │ CDPlayerScreen  │  │ GlobalMiniPlayer │  │ PlaybackSettingsSheet       │ │
│  │ (Full player)   │  │ (Floating bar)   │  │ (Speed, timer, etc.)        │ │
│  └────────┬────────┘  └────────┬─────────┘  └─────────────┬───────────────┘ │
│           │                    │                          │                 │
│           └────────────────────┼──────────────────────────┘                 │
│                                │                                            │
│                                ▼                                            │
├────────────────────────────────────────────────────────────────────────────┤
│                          STATE LAYER (Zustand)                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     playerStore.ts (2,579 lines)                      │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐  │  │
│  │  │   Content   │ │  Playback   │ │  Seeking    │ │    Features     │  │  │
│  │  │ currentBook │ │ position    │ │ isSeeking   │ │ sleepTimer      │  │  │
│  │  │ chapters    │ │ duration    │ │ seekPosition│ │ bookmarks       │  │  │
│  │  │ viewingBook │ │ isPlaying   │ │ seekStart   │ │ bookSpeedMap    │  │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                │                                            │
│                                ▼                                            │
├────────────────────────────────────────────────────────────────────────────┤
│                          SERVICE LAYER                                      │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────────┐ │
│  │ audioService.ts     │  │ sessionService.ts   │  │ backgroundSync.ts    │ │
│  │ (1,237 lines)       │  │ (300 lines)         │  │ (474 lines)          │ │
│  │                     │  │                     │  │                      │ │
│  │ • loadAudio()       │  │ • startSession()    │  │ • saveProgress()     │ │
│  │ • loadTracks()      │  │ • syncProgress()    │  │ • processSyncQueue() │ │
│  │ • seekToGlobal()    │  │ • closeSession()    │  │ • forceSyncAll()     │ │
│  │ • play()/pause()    │  │ • getStreamUrl()    │  │ • conflict detect    │ │
│  └──────────┬──────────┘  └─────────────────────┘  └──────────────────────┘ │
│             │                                                               │
│             ▼                                                               │
├────────────────────────────────────────────────────────────────────────────┤
│                          NATIVE LAYER                                       │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────────┐ │
│  │ expo-audio          │  │ expo-media-control  │  │ expo-sensors         │ │
│  │ (AudioPlayer)       │  │ (Lock screen)       │  │ (Shake detection)    │ │
│  └─────────────────────┘  └─────────────────────┘  └──────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Single Source of Truth**: playerStore owns ALL playback state
2. **Dumb Service Layer**: audioService just plays audio, no business logic
3. **Seeking Mode**: Critical pattern that blocks position updates during seek
4. **Offline-First**: Check local files before network
5. **Non-Blocking Sync**: Progress saves never block UI

---

## File Inventory

### Core Files

| File | Lines | Purpose |
|------|-------|---------|
| `stores/playerStore.ts` | 2,579 | Main state management, all actions |
| `services/audioService.ts` | 1,237 | expo-audio wrapper, multi-track support |
| `machines/audioMachine.ts` | 517 | XState FSM for audio states |
| `services/sessionService.ts` | 300 | Server session management |
| `services/progressService.ts` | 153 | Local SQLite progress |
| `services/backgroundSyncService.ts` | 474 | Background progress sync |
| `services/shakeDetector.ts` | 144 | Accelerometer shake detection |

### Utility Files

| File | Lines | Purpose |
|------|-------|---------|
| `utils/smartRewindCalculator.ts` | 63 | Ebbinghaus-based rewind calculation |
| `utils/chapterNavigator.ts` | 231 | Pure chapter navigation functions |
| `utils/trackNavigator.ts` | 140 | Pure track navigation functions |
| `utils/progressCalculator.ts` | ~100 | Progress percentage calculations |
| `utils/playbackRateResolver.ts` | ~80 | Per-book speed resolution |
| `stores/joystickSeekStore.ts` | 261 | Joystick seek settings |
| `stores/settingsStore.ts` | ~150 | Player settings persistence |
| `stores/progressStore.ts` | ~100 | Progress tracking |
| `stores/uiStore.ts` | ~80 | Player UI state |
| `constants.ts` | 24 | Layout and timing constants |

### Total: ~6,000+ lines of player-specific code

---

## playerStore.ts - The Brain

### Location
`src/features/player/stores/playerStore.ts` (2,579 lines)

### State Shape

```typescript
interface PlayerState {
  // === CONTENT ===
  currentBook: LibraryItem | null;  // Book whose audio is loaded
  viewingBook: LibraryItem | null;  // Book shown in PlayerScreen (can differ!)
  viewingChapters: Chapter[];       // Chapters for viewing book
  chapters: Chapter[];              // Chapters for playing book

  // === PLAYBACK STATE (from audioService) ===
  position: number;                 // Current position in seconds
  duration: number;                 // Total duration in seconds
  isPlaying: boolean;
  isLoading: boolean;
  isBuffering: boolean;
  playbackRate: number;             // 0.5 - 3.0

  // === SEEKING STATE (THE KEY IMPROVEMENT) ===
  isSeeking: boolean;               // TRUE = block position updates
  seekPosition: number;             // Position during seek (UI displays THIS)
  seekStartPosition: number;        // Where seek started (for delta display)
  seekDirection: 'backward' | 'forward' | null;

  // === UI STATE ===
  isPlayerVisible: boolean;         // Full player open
  isOffline: boolean;               // Playing local file

  // === FEATURES ===
  sleepTimer: number | null;        // Seconds remaining
  sleepTimerInterval: NodeJS.Timeout | null;
  bookmarks: Bookmark[];
  controlMode: 'rewind' | 'chapter';   // Skip button behavior
  progressMode: 'bar' | 'chapters';    // Progress display style

  // === PER-BOOK SPEED ===
  bookSpeedMap: Record<string, number>;  // { bookId: 1.25, ... }
  globalDefaultRate: number;             // Default for new books

  // === SMART REWIND ===
  smartRewindEnabled: boolean;
  smartRewindMaxSeconds: number;         // Default: 30

  // === SLEEP TIMER SHAKE ===
  shakeToExtendEnabled: boolean;
  isShakeDetectionActive: boolean;

  // === SKIP INTERVALS ===
  skipForwardInterval: number;           // Default: 30
  skipBackInterval: number;              // Default: 15

  // === PLAYER APPEARANCE ===
  discAnimationEnabled: boolean;
  useStandardPlayer: boolean;

  // === BOOK COMPLETION ===
  showCompletionPrompt: boolean;
  autoMarkFinished: boolean;
  showCompletionSheet: boolean;
  completionSheetBook: LibraryItem | null;
}
```

### Key Actions

```typescript
interface PlayerActions {
  // Lifecycle
  loadBook(book, options?): Promise<void>;
  cleanup(): Promise<void>;

  // View vs Play (the distinction matters!)
  viewBook(book): Promise<void>;      // Open player without affecting playback
  playViewingBook(): Promise<void>;   // Start playing the viewed book
  isViewingDifferentBook(): boolean;

  // Playback Control
  play(): Promise<void>;
  pause(): Promise<void>;

  // SEEKING (THE FIX)
  startSeeking(direction?): void;           // Begin seek, block updates
  updateSeekPosition(position): Promise<void>;
  commitSeek(): Promise<void>;              // Finalize seek
  cancelSeek(): Promise<void>;              // Revert to start position
  seekTo(position): Promise<void>;          // Convenience: start+update+commit

  // Continuous Seeking (hold button)
  startContinuousSeeking(direction): Promise<void>;
  stopContinuousSeeking(): Promise<void>;

  // Skip
  skipForward(seconds?): Promise<void>;
  skipBackward(seconds?): Promise<void>;

  // Chapter Navigation
  jumpToChapter(index): Promise<void>;
  nextChapter(): Promise<void>;
  prevChapter(): Promise<void>;
  getCurrentChapter(): Chapter | null;

  // Settings
  setPlaybackRate(rate): Promise<void>;
  setSleepTimer(minutes): void;
  extendSleepTimer(minutes): void;
  clearSleepTimer(): void;
  // ... many more
}
```

### Module-Level Variables (Hidden State)

```typescript
// Location: playerStore.ts:341-370

let currentLoadId = 0;           // Tracks load requests for cancellation
let lastProgressSave = 0;        // Throttle progress saves
let lastFinishedBookId = null;   // Prevent double-handling book finish
let seekInterval = null;         // Continuous seeking timer
let lastLoadTime = 0;            // Debounce rapid loads
let lastBookFinishTime = 0;      // Guard against queue races

// Smart rewind state (persisted to AsyncStorage)
let smartRewindPauseTimestamp = null;
let smartRewindPauseBookId = null;
let smartRewindPausePosition = null;

// Download listener for streaming → local switch
let downloadListenerUnsubscribe = null;
let currentStreamingBookId = null;

// Listening session tracking
let activeSession = null;
```

---

## audioService.ts - The Muscles

### Location
`src/features/player/services/audioService.ts` (1,237 lines)

### Class Structure

```typescript
class AudioService {
  // === PLAYERS ===
  private player: AudioPlayer | null = null;
  private preloadPlayer: AudioPlayer | null = null;  // Next track pre-buffer
  private preloadedTrackIndex: number = -1;

  // === STATE ===
  private isSetup = false;
  private isLoaded = false;
  private currentUrl: string | null = null;
  private statusCallback: StatusCallback | null = null;

  // === MULTI-TRACK ===
  private tracks: AudioTrackInfo[] = [];
  private currentTrackIndex = 0;
  private totalDuration = 0;

  // === POSITION TRACKING ===
  private lastKnownGoodPosition = 0;  // Cache during track switch
  private progressInterval: NodeJS.Timeout | null = null;

  // === POLLING RATES ===
  private readonly POLL_RATE_PLAYING = 100;   // 10 updates/sec
  private readonly POLL_RATE_PAUSED = 2000;   // Save battery
  private currentPollRate = 100;

  // === PRE-BUFFER ===
  private readonly PRELOAD_THRESHOLD = 30;  // Seconds before track end

  // === SCRUBBING OPTIMIZATION ===
  private isScrubbing = false;
  private skipNextSmartRewind = false;
  private pendingTrackSwitch: { trackIndex, positionInTrack } | null = null;
  private trackSwitchTimeout: NodeJS.Timeout | null = null;

  // === TRACK SWITCH SYNC ===
  private trackSwitchInProgress = false;
  private trackSwitchStartTime = 0;
}
```

### Key Methods

#### Setup

```typescript
// Location: audioService.ts:145-186
private async setup(): Promise<void> {
  // 1. Configure audio mode for background playback
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    shouldRouteThroughEarpiece: false,
  });

  // 2. Create main player
  this.player = createAudioPlayer({ uri: '' });

  // 3. Create preload player for seamless transitions
  this.preloadPlayer = createAudioPlayer({ uri: '' });

  // 4. Set up event listeners
  this.setupEventListeners();

  // 5. Initialize media controls
  await this.setupMediaControls();
}
```

#### Load Audio (Single Track)

```typescript
// Location: audioService.ts:639-754
async loadAudio(
  url: string,
  startPositionSec: number = 0,
  metadata?: { title, artist, artwork },
  autoPlay: boolean = true,
  knownDuration?: number  // Skip duration detection!
): Promise<void> {
  const thisLoadId = ++this.loadId;

  // 1. Ensure setup
  await this.ensureSetup();
  if (this.loadId !== thisLoadId) return; // Cancelled

  // 2. Reset state
  this.tracks = [];
  this.currentTrackIndex = 0;
  this.lastKnownGoodPosition = 0;
  this.hasReachedEnd = false;
  this.totalDuration = knownDuration || 0;

  // 3. Load audio
  this.player.replace({ uri: url });

  // 4. Wait for duration (skip if known!)
  if (!knownDuration) {
    await this.waitForDuration(2000);
    this.totalDuration = this.player?.duration || 0;
  }

  // 5. Seek to start position
  if (startPositionSec > 0) {
    this.player?.seekTo(startPositionSec);
  }

  // 6. Play or prime
  if (autoPlay) {
    this.player?.play();
  } else {
    // WORKAROUND: expo-audio buffering bug
    // See expo/expo#34162
    this.player?.play();
    await new Promise(r => setTimeout(r, 500));
    this.player?.pause();
  }

  // 7. Update media controls
  await this.updateMediaControlMetadata();
  await this.updateMediaControlPlaybackState(autoPlay, startPositionSec);
}
```

#### Load Tracks (Multi-File)

```typescript
// Location: audioService.ts:771-876
async loadTracks(
  tracks: AudioTrackInfo[],
  startPositionSec: number = 0,
  metadata?: { title, artist, artwork },
  autoPlay: boolean = true,
  knownTotalDuration?: number
): Promise<void> {
  // 1. Store tracks
  this.tracks = tracks;
  this.totalDuration = knownTotalDuration || tracks.reduce((sum, t) => sum + t.duration, 0);

  // 2. Find which track contains start position
  let targetTrackIndex = 0;
  let positionInTrack = startPositionSec;

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    if (startPositionSec >= track.startOffset &&
        startPositionSec < track.startOffset + track.duration) {
      targetTrackIndex = i;
      positionInTrack = startPositionSec - track.startOffset;
      break;
    }
  }

  // 3. Load first track
  this.currentTrackIndex = targetTrackIndex;
  this.player.replace({ uri: tracks[targetTrackIndex].url });

  // 4. Seek within track
  if (positionInTrack > 0) {
    this.player?.seekTo(positionInTrack);
  }

  // 5. Start playback
  // ... (same pattern as single track)
}
```

#### Global Position Calculation

```typescript
// Location: audioService.ts:504-532
// CRITICAL: Single source of truth for position

private getGlobalPositionSync(): number {
  if (!this.player) return this.lastKnownGoodPosition;

  // During track switch or scrubbing, return cached position
  // This prevents UI flash to chapter 1
  if (this.trackSwitchInProgress || this.isScrubbing) {
    return this.lastKnownGoodPosition;
  }

  let position: number;

  // Multi-track: add startOffset
  if (this.tracks.length > 0 && this.currentTrackIndex < this.tracks.length) {
    position = this.tracks[this.currentTrackIndex].startOffset + this.player.currentTime;
  } else {
    position = this.player.currentTime;
  }

  // Validate: prevent big jumps backwards (stale data from wrong track)
  const positionDelta = Math.abs(position - this.lastKnownGoodPosition);
  const seemsValid = position > 0 && (this.lastKnownGoodPosition === 0 || positionDelta < 60);

  if (seemsValid) {
    this.lastKnownGoodPosition = position;
  }

  return this.lastKnownGoodPosition;
}
```

#### Seek to Global Position

```typescript
// Location: audioService.ts:883-953
async seekToGlobal(globalPositionSec: number): Promise<void> {
  if (!this.player) return;

  // Single track: seek directly
  if (this.tracks.length === 0) {
    await this.player.seekTo(globalPositionSec);
    return;
  }

  // Find target track
  let targetTrackIndex = 0;
  let positionInTrack = globalPositionSec;

  for (let i = 0; i < this.tracks.length; i++) {
    const track = this.tracks[i];
    if (globalPositionSec >= track.startOffset &&
        globalPositionSec < track.startOffset + track.duration) {
      targetTrackIndex = i;
      positionInTrack = globalPositionSec - track.startOffset;
      break;
    }
  }

  // Near track end? Bump to next track to prevent immediate end event
  const track = this.tracks[targetTrackIndex];
  if (positionInTrack >= track.duration - 0.5 && targetTrackIndex < this.tracks.length - 1) {
    targetTrackIndex++;
    positionInTrack = 0;
  }

  // Same track: fast path
  if (targetTrackIndex === this.currentTrackIndex) {
    await this.player.seekTo(positionInTrack);
    return;
  }

  // Different track: need to switch
  if (this.isScrubbing) {
    // Debounce during scrub to avoid rapid track loading
    this.pendingTrackSwitch = { trackIndex: targetTrackIndex, positionInTrack };
    if (this.trackSwitchTimeout) clearTimeout(this.trackSwitchTimeout);
    this.trackSwitchTimeout = setTimeout(() => {
      if (this.pendingTrackSwitch) {
        this.executeTrackSwitch(
          this.pendingTrackSwitch.trackIndex,
          this.pendingTrackSwitch.positionInTrack
        );
        this.pendingTrackSwitch = null;
      }
    }, 50);
    return;
  }

  // Not scrubbing: switch immediately
  await this.executeTrackSwitch(targetTrackIndex, positionInTrack);
}
```

#### Track End Handling

```typescript
// Location: audioService.ts:407-501
private async handleTrackEnd(): Promise<void> {
  if (!this.isLoaded) return;

  // Multi-track with more tracks?
  if (this.tracks.length > 0 && this.currentTrackIndex < this.tracks.length - 1) {
    // Advance to next track
    this.currentTrackIndex++;
    const nextTrack = this.tracks[this.currentTrackIndex];

    // Use preloaded player if available (SEAMLESS!)
    if (this.preloadedTrackIndex === this.currentTrackIndex && this.preloadPlayer) {
      // CRITICAL: Stop old player FIRST to prevent multiple audio streams
      this.player?.pause();

      // Swap players
      const temp = this.player;
      this.player = this.preloadPlayer;
      this.preloadPlayer = temp;

      this.player?.play();
      this.preloadedTrackIndex = -1;
      this.preloadNextTrack();
    } else {
      // Fallback: load directly (may have brief gap)
      this.player.replace({ uri: nextTrack.url });
      this.player.play();
    }
    return;
  }

  // Last track or single-track: book complete
  if (this.tracks.length === 0) {
    // Single track: check if actually at end
    const currentPos = await this.getPosition();
    const nearEnd = this.totalDuration > 0 && currentPos >= this.totalDuration - 5;

    if (nearEnd) {
      this.hasReachedEnd = true;
      this.statusCallback?.({
        isPlaying: false,
        position: this.totalDuration,
        duration: this.totalDuration,
        isBuffering: false,
        didJustFinish: true,
      });
    } else {
      // Stream segment ended but book not finished - resume
      this.player?.play();
    }
  } else {
    // Multi-track last track finished
    this.hasReachedEnd = true;
    this.statusCallback?.({
      isPlaying: false,
      position: this.totalDuration,
      duration: this.totalDuration,
      isBuffering: false,
      didJustFinish: true,
    });
  }
}
```

---

## audioMachine.ts - The Nervous System

### Location
`src/features/player/machines/audioMachine.ts` (517 lines)

### State Diagram

```
                              ┌─────────┐
                              │  idle   │
                              └────┬────┘
                                   │ LOAD
                                   ▼
                              ┌─────────┐
                              │ loading │
                              └────┬────┘
                                   │ LOADED
                                   ▼
                              ┌─────────┐
               ┌──────────────│  ready  │──────────────┐
               │              └────┬────┘              │
               │ ERROR             │ PLAY              │ ERROR
               │                   ▼                   │
               │              ┌─────────┐              │
               │    ┌─────────│ playing │─────────┐    │
               │    │         └────┬────┘         │    │
               │    │ PAUSE        │              │    │
               │    │              │ PAUSE        │    │
               │    ▼              ▼              │    │
               │ ┌──────┐     ┌─────────┐         │    │
               │ │paused│◀───▶│buffering│         │    │
               │ └──────┘     └─────────┘         │    │
               │                                  │    │
               │    SEEK                          │    │
               │        │                         │    │
               │        ▼                         │    │
               │    ┌─────────┐                   │    │
               │    │ seeking │ ◀── NO POSITION_UPDATE EVENTS!
               │    └────┬────┘                   │    │
               │         │ SEEK_COMPLETE          │    │
               │         ▼                        │    │
               │    (returns to previous state)   │    │
               │                                  │    │
               ▼                                  ▼    ▼
          ┌─────────────────────────────────────────────────┐
          │                    error                        │
          └─────────────────────────────────────────────────┘
```

### Context

```typescript
interface AudioContext {
  position: number;
  duration: number;
  playbackRate: number;

  currentTrackIndex: number;
  trackCount: number;

  seekPosition: number | null;

  bookId: string | null;
  bookTitle: string | null;

  errorMessage: string | null;
  errorCode: string | null;

  bufferedPosition: number;

  lastPauseTime: number | null;  // For smart rewind
}
```

### Events

```typescript
type AudioEvent =
  | { type: 'LOAD'; bookId: string; bookTitle: string; trackCount: number }
  | { type: 'LOADED'; duration: number; position: number }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'STOP' }
  | { type: 'SEEK'; position: number }
  | { type: 'SEEK_COMPLETE'; position: number }
  | { type: 'POSITION_UPDATE'; position: number }  // BLOCKED IN SEEKING STATE!
  | { type: 'RATE_CHANGE'; rate: number }
  | { type: 'TRACK_CHANGE'; trackIndex: number }
  | { type: 'BUFFER_START' }
  | { type: 'BUFFER_END' }
  | { type: 'ERROR'; message: string; code?: string }
  | { type: 'RETRY' }
  | { type: 'RESET' };
```

### Critical: Seeking State

```typescript
// Location: audioMachine.ts:382-422
seeking: {
  // CRITICAL: No POSITION_UPDATE events handled here
  // This prevents UI jitter during seek operations
  on: {
    SEEK_COMPLETE: {
      target: 'paused',
      actions: [
        { type: 'setPosition', params: ({ event }) => ({ position: event.position }) },
        'clearSeekPosition',
      ],
    },
    SEEK: {
      // Allow chained seeks (e.g., scrubbing)
      actions: [
        { type: 'setSeekPosition', params: ({ event }) => ({ position: event.position }) },
      ],
    },
    ERROR: {
      target: 'error',
      actions: ['setError', 'clearSeekPosition'],
    },
    RESET: {
      target: 'idle',
      actions: 'resetContext',
    },
    // NOTE: No POSITION_UPDATE handler! This is intentional.
  },
},
```

### Helper Functions

```typescript
// Location: audioMachine.ts:454-516

function canUpdatePosition(state: AudioState): boolean {
  return state !== 'seeking' && state !== 'loading' && state !== 'idle';
}

function canControl(state: AudioState): boolean {
  return state === 'ready' || state === 'playing' || state === 'paused' || state === 'buffering';
}

function isPlayable(state: AudioState): boolean {
  return state === 'ready' || state === 'paused';
}

function isSeeking(state: AudioState): boolean {
  return state === 'seeking';
}
```

---

## Seeking System - The Critical Fix

### The Problem

Before the fix, position updates from `audioService` would fight with user's drag position, causing:
- UI jitter during scrubbing
- Position jumping back to audio position mid-drag
- Inconsistent behavior between iOS and Android

### The Solution: Two Seek Paths

The player has **two different seek mechanisms** for different use cases:

| Mechanism | Use Case | State Variable | Position Tracking | Update Rate |
|-----------|----------|----------------|-------------------|-------------|
| **Timeline Scrubbing** | Long-press + pan on CDPlayerScreen timeline | `isDirectScrubbing` (local UI) | Reanimated shared values | 60fps worklet |
| **Continuous Seeking** | Hold FF/RW buttons | `isSeeking` (playerStore) | `seekPosition` in store | Throttled interval |

---

### Path 1: Timeline Scrubbing (CDPlayerScreen)

Uses **Reanimated shared values** for smooth 60fps animations without store updates:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         TIMELINE SCRUBBING                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   1. User long-presses timeline (300ms)                                  │
│      └─▶ enterDirectScrub() → isDirectScrubbing = true (local state)     │
│      └─▶ audioService.setScrubbing(true) → blocks track switches         │
│                                                                          │
│   2. User pans (60fps in Reanimated worklet)                             │
│      └─▶ timelineOffset.value updated                                    │
│      └─▶ scrubCurrentPosition.value calculated                           │
│      └─▶ NO playerStore updates during drag!                             │
│                                                                          │
│   3. User releases                                                       │
│      └─▶ exitDirectScrub(finalPosition)                                  │
│      └─▶ handleSeek() → seekTo(position)                                 │
│      └─▶ audioService.setScrubbing(false)                                │
│      └─▶ isDirectScrubbing = false                                       │
│                                                                          │
│   KEY: isSeeking in playerStore is NEVER touched!                        │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

Shared values used:
- `timelineOffset` - tracks horizontal pan position
- `scrubCurrentPosition` - calculated time position
- `scrubStartOffset` - initial timeline offset
- `edgeScrollAccumulator` - auto-scroll at edges

---

### Path 2: Continuous Seeking (FF/RW Buttons)

Uses **playerStore.isSeeking** to block position updates:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         NORMAL MODE (isSeeking = false)                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   audioService ──── position updates ────▶ playerStore.position          │
│                                                   │                      │
│                                                   ▼                      │
│                                              UI displays                 │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                               │
                               │ User holds FF/RW button
                               │ startContinuousSeeking()
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         SEEKING MODE (isSeeking = true)                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   audioService ──── position updates ────▶ BLOCKED (ignored)             │
│                                                                          │
│   Interval timer ────────────────────────▶ playerStore.seekPosition      │
│                                                   │                      │
│                                                   ▼                      │
│                                              UI displays                 │
│                                                                          │
│   (Send seek commands to audioService at intervals)                      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                               │
                               │ User releases button
                               │ stopContinuousSeeking() → commitSeek()
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         COMMIT                                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   1. audioService.seekTo(seekPosition)   // Final seek                   │
│   2. set({ isSeeking: false })           // Exit seeking mode            │
│   3. Position updates resume normally                                    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### Code

```typescript
// Location: playerStore.ts:1548-1592

startSeeking: (direction?: SeekDirection) => {
  const { position } = get();
  log(`startSeeking: position=${position.toFixed(1)}, direction=${direction || 'none'}`);
  set({
    isSeeking: true,
    seekPosition: position,
    seekStartPosition: position,
    seekDirection: direction || null,
  });
},

updateSeekPosition: async (newPosition: number) => {
  const { duration, isSeeking } = get();

  if (!isSeeking) {
    get().startSeeking();
  }

  const clampedPosition = Math.max(0, Math.min(duration, newPosition));
  set({ seekPosition: clampedPosition });

  // Send seek command to audio service (for audio preview)
  await audioService.seekTo(clampedPosition);
},

commitSeek: async () => {
  const { seekPosition, isSeeking } = get();

  if (!isSeeking) return;

  log(`commitSeek: finalPosition=${seekPosition.toFixed(1)}`);

  // Ensure audio is at final position
  await audioService.seekTo(seekPosition);

  // Exit seeking mode
  set({
    isSeeking: false,
    seekDirection: null,
  });
},
```

### Position Update Guard

```typescript
// Location: playerStore.ts (updatePlaybackState)

updatePlaybackState: (state: PlaybackState) => {
  // CRITICAL: Skip position updates while seeking
  if (get().isSeeking) {
    // Only update non-position fields
    set({
      isPlaying: state.isPlaying,
      isBuffering: state.isBuffering,
    });
    return;
  }

  // Normal update
  set({
    position: state.position,
    duration: state.duration,
    isPlaying: state.isPlaying,
    isBuffering: state.isBuffering,
  });

  // Handle book completion, progress saves, etc.
  // ...
}
```

---

## Multi-Track Playback

### Overview

Many audiobooks are split into multiple files (one per CD, chapter, etc.). The player handles this transparently.

### Data Structures

```typescript
interface AudioTrackInfo {
  url: string;          // Full URL or local path
  title: string;        // Track title
  startOffset: number;  // Global start position (seconds from book start)
  duration: number;     // Track duration in seconds
}

// Example for a 3-track book:
// Track 0: startOffset=0,     duration=3600   (0:00 - 1:00:00)
// Track 1: startOffset=3600,  duration=3600   (1:00:00 - 2:00:00)
// Track 2: startOffset=7200,  duration=1800   (2:00:00 - 2:30:00)
// Total duration: 9000 seconds (2:30:00)
```

### Global Position Mapping

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       MULTI-TRACK BOOK TIMELINE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Track 0              Track 1              Track 2                     │
│   ┌───────────────────┬───────────────────┬──────────────┐              │
│   │                   │                   │              │              │
│   │    01.mp3         │    02.mp3         │   03.mp3     │              │
│   │    (1 hour)       │    (1 hour)       │   (30 min)   │              │
│   │                   │                   │              │              │
│   └───────────────────┴───────────────────┴──────────────┘              │
│   0               3600                7200           9000               │
│                                                                         │
│   Example: Global position 4500 seconds                                 │
│   = Track 1 @ local position 900 seconds                                │
│   = 4500 - 3600 = 900                                                   │
│                                                                         │
│   Formula:                                                              │
│   globalPosition = tracks[currentTrack].startOffset + localPosition     │
│   localPosition = globalPosition - tracks[currentTrack].startOffset     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Track Preloading

```typescript
// Location: audioService.ts:388-405
// Pre-buffer next track 30 seconds before current track ends

private async preloadNextTrack(): Promise<void> {
  const nextIndex = this.currentTrackIndex + 1;

  // Don't preload if already done or no more tracks
  if (nextIndex >= this.tracks.length) return;
  if (this.preloadedTrackIndex === nextIndex) return;

  const nextTrack = this.tracks[nextIndex];
  log(`Pre-buffering track ${nextIndex}: ${nextTrack.title}`);

  try {
    this.preloadPlayer.replace({ uri: nextTrack.url });
    this.preloadedTrackIndex = nextIndex;
  } catch (err) {
    audioLog.warn('Preload failed:', err.message);
  }
}
```

### Seamless Track Transition

```typescript
// When track ends and preload is ready:
if (this.preloadedTrackIndex === this.currentTrackIndex && this.preloadPlayer) {
  // CRITICAL: Stop old player FIRST
  this.player?.pause();

  // Swap players (instant!)
  const temp = this.player;
  this.player = this.preloadPlayer;
  this.preloadPlayer = temp;

  // Start playback immediately
  this.player?.play();

  // Start preloading next-next track
  this.preloadedTrackIndex = -1;
  this.preloadNextTrack();
}
```

---

## Progress Sync Pipeline

### 3-Tier Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PROGRESS SYNC PIPELINE                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  TIER 1: Real-Time (In-Memory)                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ playerStore.position                                             │    │
│  │ Updated: Every 100ms from audioService                           │    │
│  │ Used for: UI display, seeking                                    │    │
│  │ Persistence: None (lost on app kill)                             │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                           │                                             │
│                           │ Every 5 seconds OR on pause                 │
│                           ▼                                             │
│  TIER 2: Local (SQLite)                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ sqliteCache.playback_progress table                              │    │
│  │ Updated: progressService.saveLocalOnly()                         │    │
│  │ Used for: App restart recovery, offline progress                 │    │
│  │ Fields: book_id, position, duration, synced, updated_at          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                           │                                             │
│                           │ Every 30 seconds OR on pause                │
│                           ▼                                             │
│  TIER 3: Server                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ backgroundSyncService.saveProgress()                             │    │
│  │ Endpoint: PATCH /api/me/progress/{itemId}                        │    │
│  │ Conflict resolution: Last-write-wins (by timestamp)              │    │
│  │ Retry: 3 attempts, exponential backoff                           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Conflict Resolution

```typescript
// Location: backgroundSyncService.ts:239-301

private async syncToServer(item: SyncQueueItem): Promise<boolean> {
  // 1. Fetch server progress first
  let serverProgress = await apiClient.get(`/api/me/progress/${item.itemId}`);

  // 2. Compare timestamps
  if (serverProgress && serverProgress.lastUpdate > item.localUpdatedAt) {
    // SERVER IS NEWER - conflict detected
    audioLog.warn(`CONFLICT: Server progress is newer for ${item.itemId}`);

    // Resolution: Keep server version (last-write-wins)
    eventBus.emit('progress:conflict', {
      bookId: item.itemId,
      localPosition: item.position,
      serverPosition: serverProgress.currentTime,
      winner: 'server',
    });

    // Update local cache with server's value
    await sqliteCache.setPlaybackProgress(
      item.itemId,
      serverProgress.currentTime,
      item.duration,
      true  // Mark as synced
    );

    this.syncQueue.delete(item.itemId);
    return true;
  }

  // 3. LOCAL IS NEWER - upload to server
  await apiClient.patch(`/api/me/progress/${item.itemId}`, {
    currentTime: item.position,
    duration: item.duration,
    progress: item.duration > 0 ? item.position / item.duration : 0,
  });

  await sqliteCache.markProgressSynced(item.itemId);
  this.syncQueue.delete(item.itemId);
  return true;
}
```

---

## Smart Rewind Algorithm

### Based on Ebbinghaus Forgetting Curve

The longer you've been away from an audiobook, the more context you've lost.

### Location
`src/features/player/utils/smartRewindCalculator.ts` (63 lines)

### Anchor Points

| Pause Duration | Rewind Amount | Rationale |
|----------------|---------------|-----------|
| < 3 seconds | 0 seconds | Echoic memory intact |
| 3 seconds | 3 seconds | Just lost the last sentence |
| 10 seconds | 5 seconds | Phone call started |
| 30 seconds | 10 seconds | Quick interruption |
| 2 minutes | 15 seconds | Longer distraction |
| 5 minutes | 20 seconds | Coffee break |
| 15 minutes | 25 seconds | Short break |
| 1 hour | 30 seconds | Significant gap |
| 24+ hours | Max setting | Next day |

### Algorithm

```typescript
// Location: smartRewindCalculator.ts:24-62

export function calculateSmartRewindSeconds(
  pauseDurationMs: number,
  maxRewindSeconds: number
): number {
  const pauseSeconds = pauseDurationMs / 1000;

  // No rewind for very brief pauses
  if (pauseSeconds < 3) return 0;

  let rewind: number;

  if (pauseSeconds < 10) {
    // 3-10s: quick ramp from 3s to 5s
    rewind = 3 + ((pauseSeconds - 3) * 2) / 7;
  } else if (pauseSeconds < 30) {
    // 10-30s: gradual from 5s to 10s
    rewind = 5 + ((pauseSeconds - 10) * 5) / 20;
  } else if (pauseSeconds < 120) {
    // 30s-2min: 10s to 15s
    rewind = 10 + ((pauseSeconds - 30) * 5) / 90;
  } else if (pauseSeconds < 300) {
    // 2-5min: 15s to 20s
    rewind = 15 + ((pauseSeconds - 120) * 5) / 180;
  } else if (pauseSeconds < 900) {
    // 5-15min: 20s to 25s
    rewind = 20 + ((pauseSeconds - 300) * 5) / 600;
  } else if (pauseSeconds < 3600) {
    // 15min-1hr: 25s to 30s
    rewind = 25 + ((pauseSeconds - 900) * 5) / 2700;
  } else if (pauseSeconds < 86400) {
    // 1hr-24hr: 30s to 45s
    rewind = 30 + ((pauseSeconds - 3600) * 15) / 82800;
  } else {
    // 24hr+: maximum
    rewind = maxRewindSeconds;
  }

  return Math.min(Math.round(rewind), maxRewindSeconds);
}
```

### Persistence (Across App Restart)

```typescript
// Location: playerStore.ts:387-457

// Persisted to AsyncStorage:
const SMART_REWIND_PAUSE_TIMESTAMP_KEY = 'smartRewindPauseTimestamp';
const SMART_REWIND_PAUSE_BOOK_ID_KEY = 'smartRewindPauseBookId';
const SMART_REWIND_PAUSE_POSITION_KEY = 'smartRewindPausePosition';

async function persistSmartRewindState(bookId: string, position: number) {
  const now = Date.now();
  smartRewindPauseTimestamp = now;
  smartRewindPauseBookId = bookId;
  smartRewindPausePosition = position;

  await Promise.all([
    AsyncStorage.setItem(SMART_REWIND_PAUSE_TIMESTAMP_KEY, now.toString()),
    AsyncStorage.setItem(SMART_REWIND_PAUSE_BOOK_ID_KEY, bookId),
    AsyncStorage.setItem(SMART_REWIND_PAUSE_POSITION_KEY, position.toString()),
  ]);
}
```

---

## Sleep Timer & Shake Detection

### Sleep Timer

```typescript
// Location: playerStore.ts (setSleepTimer action)

setSleepTimer: (minutes: number) => {
  const { sleepTimerInterval, shakeToExtendEnabled } = get();

  // Clear existing timer
  if (sleepTimerInterval) {
    clearInterval(sleepTimerInterval);
  }

  const seconds = minutes * 60;
  set({ sleepTimer: seconds });

  // Start countdown
  const interval = setInterval(async () => {
    const { sleepTimer, isPlaying } = get();
    if (sleepTimer === null) return;

    const remaining = sleepTimer - 1;

    if (remaining <= 0) {
      // Timer expired - pause playback
      clearInterval(interval);
      await get().pause();
      set({
        sleepTimer: null,
        sleepTimerInterval: null,
        isShakeDetectionActive: false,
      });
      haptics.notificationSuccess();  // Feedback
    } else {
      set({ sleepTimer: remaining });

      // Start shake detection when < 60 seconds remaining
      if (remaining <= SLEEP_TIMER_SHAKE_THRESHOLD && shakeToExtendEnabled && !get().isShakeDetectionActive) {
        set({ isShakeDetectionActive: true });
        shakeDetector.start(() => {
          get().extendSleepTimer(SLEEP_TIMER_EXTEND_MINUTES);
          haptics.notificationSuccess();
        });
      }
    }
  }, 1000);

  set({ sleepTimerInterval: interval });
},
```

### Shake Detection

```typescript
// Location: shakeDetector.ts

const SHAKE_THRESHOLD = 2.5;      // Acceleration magnitude
const SHAKE_COOLDOWN_MS = 1500;   // Prevent rapid triggers

class ShakeDetector {
  private handleAccelerometerData = (data: { x, y, z }) => {
    // Calculate magnitude (minus gravity ~1g)
    const magnitude = Math.sqrt(x*x + y*y + z*z);
    const acceleration = Math.abs(magnitude - 1);

    if (acceleration >= SHAKE_THRESHOLD) {
      const now = Date.now();
      if (now - this.lastShakeTime >= SHAKE_COOLDOWN_MS) {
        this.lastShakeTime = now;

        // Haptic feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Invoke callback (extends sleep timer)
        this.callback?.();
      }
    }
  };
}
```

---

## Joystick Seek Controls

### Location
`src/features/player/stores/joystickSeekStore.ts` (261 lines)

### Settings

```typescript
interface JoystickSeekSettings {
  enabled: boolean;
  minSpeed: number;              // 0.1-30 (default: 1)
  maxSpeed: number;              // 30-600 (default: 300)
  curvePreset: CurvePreset;      // 'fine' | 'swift' | 'even' | 'rush' | 'custom'
  curveExponent: number;         // 0.2-4.0 (default: 4.0)
  deadzone: number;              // 0-30 points (default: 12)
  hapticEnabled: boolean;
}

// Curve presets
const CURVE_PRESETS = {
  fine: 1.5,    // Expo curve - precision at low drag
  swift: 0.65,  // Balanced
  even: 1.0,    // Linear
  rush: 0.4,    // Quick to high speeds
};
```

### Speed Calculation

```typescript
// Location: joystickSeekStore.ts:108-127

export function calculateSeekSpeed(
  dragDistance: number,  // 0-1 normalized
  settings: JoystickSeekSettings
): number {
  // Clamp to 0-1
  const clamped = Math.max(0, Math.min(1, dragDistance));

  // Apply curve: output = input ^ exponent
  const curved = Math.pow(clamped, settings.curveExponent);

  // Map to speed range
  const speedRange = settings.maxSpeed - settings.minSpeed;
  const speed = settings.minSpeed + curved * speedRange;

  // Round appropriately
  if (speed < 1) return Math.round(speed * 10) / 10;
  return Math.round(speed);
}

// Example with default settings (exponent 4.0):
// dragDistance 0.25 → speed ~1× (still near deadzone)
// dragDistance 0.5  → speed ~19×
// dragDistance 0.75 → speed ~95×
// dragDistance 1.0  → speed 300×
```

### Deadzone

```typescript
// Location: joystickSeekStore.ts:137-153

export function applyDeadzone(
  displacement: number,    // Raw pixels
  maxDisplacement: number, // Max drag distance
  deadzone: number         // Deadzone in pixels
): number {
  const absDisplacement = Math.abs(displacement);

  if (absDisplacement <= deadzone) return 0;

  // Normalize remaining range to 0-1
  const effectiveRange = maxDisplacement - deadzone;
  const effectiveDisplacement = absDisplacement - deadzone;

  return Math.min(1, effectiveDisplacement / effectiveRange);
}
```

---

## Session Management

### Location
`src/features/player/services/sessionService.ts` (300 lines)

### Session Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SESSION LIFECYCLE                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   1. START SESSION                                                      │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ POST /api/items/{itemId}/play                                   │   │
│   │                                                                 │   │
│   │ Request:                                                        │   │
│   │ {                                                               │   │
│   │   deviceInfo: { clientName, clientVersion, deviceId },          │   │
│   │   forceDirectPlay: true,                                        │   │
│   │   supportedMimeTypes: ['audio/mpeg', 'audio/mp4', ...]          │   │
│   │ }                                                               │   │
│   │                                                                 │   │
│   │ Response: PlaybackSession                                       │   │
│   │ {                                                               │   │
│   │   id: "session-uuid",                                           │   │
│   │   libraryItemId: "book-id",                                     │   │
│   │   duration: 36000,                                              │   │
│   │   currentTime: 1234,        // Resume position from server!     │   │
│   │   audioTracks: [...],       // Streaming URLs                   │   │
│   │   chapters: [...]           // Chapter markers                  │   │
│   │ }                                                               │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│   2. SYNC PROGRESS (every 30s + on pause)                               │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ POST /api/session/{sessionId}/sync                              │   │
│   │ { currentTime: 5678, timeListened: 0 }                          │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│   3. CLOSE SESSION (on book switch or app exit)                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ POST /api/session/{sessionId}/close                             │   │
│   │ { currentTime: 9999, timeListened: 0 }                          │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Non-Blocking Session Close

```typescript
// Location: sessionService.ts:244-265

closeSessionAsync(finalTime?: number): void {
  this.stopAutoSync();

  if (!this.currentSession) return;

  const sessionId = this.currentSession.id;
  this.currentSession = null;  // Clear immediately

  // Fire and forget - don't await!
  apiClient.post(`/api/session/${sessionId}/close`, {
    currentTime: finalTime,
    timeListened: 0,
  }).catch((error) => {
    audioLog.warn('Close session failed (non-blocking):', error.message);
  });
}
```

---

## Offline Playback

### Detection Priority

```typescript
// Location: playerStore.ts:968-1066

// 1. Check for local download FIRST (fast ~10ms)
const localPath = await getDownloadPath(book.id);

if (localPath) {
  // OFFLINE PLAYBACK - FAST PATH
  cleanupDownloadCompletionListener();
  chapters = extractChaptersFromBook(book);

  // Fire session in BACKGROUND (non-blocking!)
  sessionService.startSession(book.id).then(() => {
    sessionService.startAutoSync(() => get().position);
  }).catch(() => {});

  // Enumerate audio files in directory
  if (pathInfo.isDirectory) {
    // Multi-file audiobook
    const dirContents = await FileSystem.readDirectoryAsync(localPath);
    const audioFiles = dirContents.filter(name =>
      ['.m4b', '.m4a', '.mp3', '.opus'].some(ext => name.endsWith(ext))
    ).sort();

    audioTrackInfos = audioFiles.map((fileName, index) => ({
      url: `${localPath}${fileName}`,
      title: fileName,
      startOffset: /* calculated */,
      duration: /* from metadata */,
    }));
  } else {
    // Single file
    streamUrl = localPath;
  }
} else {
  // ONLINE PLAYBACK
  // ... create session, get streaming URLs
}
```

### Download Completion Auto-Switch

```typescript
// Location: playerStore.ts:528-610

async function setupDownloadCompletionListener(bookId: string) {
  const { downloadManager } = await import('@/core/services/downloadManager');

  downloadListenerUnsubscribe = downloadManager.subscribe((tasks) => {
    const task = tasks.find(t => t.itemId === currentStreamingBookId);

    if (task?.status === 'complete' && currentStreamingBookId) {
      const state = usePlayerStore.getState();
      const { currentBook, position, isPlaying } = state;

      if (currentBook?.id === currentStreamingBookId) {
        // Show toast
        Toast.show({ text1: 'Download Complete', text2: 'Switched to offline playback' });

        // Reload book from local files (maintains position!)
        state.loadBook(currentBook, {
          startPosition: position,
          autoPlay: isPlaying,
          showPlayer: state.isPlayerVisible,
        });
      }
    }
  });
}
```

---

## Lock Screen & Media Controls

### Setup

```typescript
// Location: audioService.ts:222-273

private async setupMediaControls() {
  await MediaControl.enableMediaControls({
    capabilities: [
      Command.PLAY,
      Command.PAUSE,
      Command.SKIP_FORWARD,
      Command.SKIP_BACKWARD,
      Command.SEEK,
      Command.NEXT_TRACK,      // Chapter navigation
      Command.PREVIOUS_TRACK,
    ],
    notification: { color: '#1a1a1a' },
    ios: { skipInterval: 30 },
    android: {
      skipInterval: 30,
      compactCapabilities: [
        Command.SKIP_BACKWARD,
        Command.PLAY,
        Command.PAUSE,
        Command.SKIP_FORWARD,
      ],
    },
  });

  this.removeMediaControlListener = MediaControl.addListener(
    this.handleMediaControlEvent
  );
}
```

### Event Handling

```typescript
// Location: audioService.ts:278-320

private handleMediaControlEvent(event) {
  switch (event.command) {
    case Command.PLAY:
      this.play();
      break;
    case Command.PAUSE:
      this.pause();
      break;
    case Command.SKIP_FORWARD:
      this.getPosition().then(pos => this.seekTo(Math.min(pos + 30, this.totalDuration)));
      break;
    case Command.SKIP_BACKWARD:
      this.getPosition().then(pos => this.seekTo(Math.max(pos - 30, 0)));
      break;
    case Command.SEEK:
      if (event.data?.position !== undefined) {
        this.seekTo(event.data.position);
      }
      break;
    case Command.NEXT_TRACK:
      remoteCommandCallback?.('nextChapter');
      break;
    case Command.PREVIOUS_TRACK:
      remoteCommandCallback?.('prevChapter');
      break;
  }
}
```

### Metadata Update

```typescript
// Location: audioService.ts:333-359

private async updateMediaControlMetadata() {
  const metadata = {
    title: this.metadata.title || 'Unknown Title',
    artist: this.metadata.artist || 'Unknown Author',
    duration: this.totalDuration,
    artwork: this.metadata.artwork ? { uri: this.metadata.artwork } : undefined,
  };

  await MediaControl.updateMetadata(metadata);
}
```

---

## State Flow Diagrams

### Play Book Flow

```
User taps "Play"
       │
       ▼
┌──────────────────┐
│  playerStore.    │
│  loadBook()      │
└────────┬─────────┘
         │
         ├─── Check if same book already loaded
         │    └─── Yes: just resume, skip load
         │
         ├─── Unload any existing audio
         │
         ├─── Check for local download
         │    ├─── Found: OFFLINE PATH (fast)
         │    └─── Not found: ONLINE PATH
         │
         ├─── [OFFLINE] Enumerate audio files
         │    └─── Build audioTrackInfos[]
         │
         ├─── [ONLINE] Start session
         │    └─── Get streaming URLs + chapters
         │
         ├─── Set up audioService callback
         │
         ├─── audioService.loadTracks() or loadAudio()
         │    ├─── Create expo-audio player
         │    ├─── Seek to resume position
         │    └─── Start playback
         │
         ├─── Apply per-book playback rate
         │
         ├─── Start background sync
         │
         └─── Emit 'book:started' event
```

### Pause Flow

```
User taps "Pause"
       │
       ▼
┌──────────────────┐
│  playerStore.    │
│  pause()         │
└────────┬─────────┘
         │
         ├─── audioService.pause()
         │
         ├─── set({ isPlaying: false })
         │
         ├─── Emit 'book:paused' event
         │
         ├─── [If smart rewind enabled]
         │    └─── persistSmartRewindState(bookId, position)
         │
         ├─── End listening session tracking
         │
         └─── backgroundSyncService.saveProgress()
```

### Seek Flow

```
User drags slider
       │
       ▼
┌──────────────────┐
│  startSeeking()  │
│  isSeeking=true  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  updateSeek-     │◄─────── (repeat as user drags)
│  Position()      │
└────────┬─────────┘
         │
         ├─── set({ seekPosition: newPos })
         │
         └─── audioService.seekTo(newPos)
              └─── [Multi-track] seekToGlobal()
                   ├─── Same track: direct seek
                   └─── Different track:
                        ├─── [Scrubbing] debounce 50ms
                        └─── [Not scrubbing] executeTrackSwitch()

User releases slider
       │
       ▼
┌──────────────────┐
│  commitSeek()    │
│  isSeeking=false │
└────────┬─────────┘
         │
         ├─── audioService.seekTo(seekPosition)
         │
         └─── set({ isSeeking: false })
              └─── Position updates resume normally
```

---

## Race Conditions & Guards

### 1. Double Load Prevention

```typescript
// Location: playerStore.ts:876-892

// Prevent loading same book twice
if (isLoading && currentBook?.id === book.id) {
  log('Already loading this book, ignoring duplicate');
  return;
}

// Debounce rapid load requests (300ms)
const now = Date.now();
if (now - lastLoadTime < LOAD_DEBOUNCE_MS) {
  log('Debouncing rapid load request');
  return;
}
lastLoadTime = now;
```

### 2. Load Cancellation

```typescript
// Location: throughout playerStore.ts

const loadId = ++currentLoadId;  // Increment for new load

// After every async operation:
if (loadId !== currentLoadId) {
  log('Load cancelled - newer load started');
  return;
}
```

### 3. Track Switch Synchronization

```typescript
// Location: audioService.ts:959-1019

private async executeTrackSwitch(targetTrackIndex, positionInTrack) {
  // Set flag FIRST to prevent race condition
  this.trackSwitchInProgress = true;
  this.trackSwitchStartTime = Date.now();

  // ... do the switch ...

  // Clear flag after seek complete
  this.trackSwitchInProgress = false;
}

// In progress updates:
if (this.trackSwitchInProgress) {
  const elapsed = Date.now() - this.trackSwitchStartTime;
  if (elapsed >= 500) {  // Timeout fallback
    this.trackSwitchInProgress = false;
  }
}
```

### 4. Book Finish Guard

```typescript
// Location: playerStore.ts:343

let lastFinishedBookId: string | null = null;

// In updatePlaybackState:
if (state.didJustFinish) {
  if (currentBook?.id === lastFinishedBookId) {
    log('Already handled finish for this book');
    return;
  }
  lastFinishedBookId = currentBook?.id || null;
  // Handle book completion...
}
```

### 5. Queue Transition Guard

```typescript
// Location: playerStore.ts:351-352

let lastBookFinishTime = 0;
const TRANSITION_GUARD_MS = 500;

// Skip series check if a book just finished
const timeSinceLastFinish = Date.now() - lastBookFinishTime;
if (timeSinceLastFinish <= TRANSITION_GUARD_MS) {
  log('Skipping series check - book just finished, avoiding race');
  return;
}
```

---

## Performance Optimizations

### 1. Known Duration Skip

```typescript
// Location: audioService.ts:697-702

// Pass known duration to skip waiting for detection
if (!knownDuration) {
  await this.waitForDuration(2000);  // Reduced from 5s
  this.totalDuration = this.player?.duration || 0;
}
// Else: use knownDuration immediately, 0ms wait!
```

### 2. Dynamic Poll Rate

```typescript
// Location: audioService.ts:85-88, 587-592

private readonly POLL_RATE_PLAYING = 100;  // Fast for UI
private readonly POLL_RATE_PAUSED = 2000;  // Save battery

// Automatically switch:
const targetRate = isPlaying ? POLL_RATE_PLAYING : POLL_RATE_PAUSED;
if (targetRate !== this.currentPollRate) {
  this.currentPollRate = targetRate;
  this.restartProgressUpdates();
}
```

### 3. Pre-buffered Track Transitions

```typescript
// 30 seconds before track ends, start preloading next
if (timeRemaining < this.PRELOAD_THRESHOLD) {
  this.preloadNextTrack();
}

// On track end: swap players (instant!)
const temp = this.player;
this.player = this.preloadPlayer;
this.preloadPlayer = temp;
```

### 4. Non-Blocking Session Operations

```typescript
// Session close: fire and forget
sessionService.closeSessionAsync();  // No await!

// Progress sync: fire and forget
backgroundSyncService.saveProgress(...).catch(() => {});
```

### 5. Parallel Initialization

```typescript
// Location: playerStore.ts:1074-1081

// Start audio setup in parallel with session request
const [session] = await Promise.all([
  sessionService.startSession(book.id),
  audioService.ensureSetup(),
]);
```

---

## Testing

### Test Files

| File | Purpose |
|------|---------|
| `stores/__tests__/playerStore.integration.test.ts` | Store integration tests |
| `machines/__tests__/audioMachine.test.ts` | State machine tests |
| `utils/__tests__/chapterNavigator.test.ts` | Chapter navigation |
| `utils/__tests__/trackNavigator.test.ts` | Track navigation |
| `utils/__tests__/progressCalculator.test.ts` | Progress calculations |
| `utils/__tests__/smartRewindCalculator.test.ts` | Smart rewind algorithm |
| `utils/__tests__/playbackRateResolver.test.ts` | Per-book speed |
| `hooks/__tests__/useSmartRewind.test.ts` | Smart rewind hook |
| `stores/__tests__/settingsStore.test.ts` | Settings persistence |
| `stores/__tests__/progressStore.test.ts` | Progress tracking |
| `stores/__tests__/uiStore.test.ts` | UI state |

### Pure Function Testing

All utility functions are pure (no side effects), making them trivial to test:

```typescript
// Example: chapterNavigator.test.ts

describe('findChapterForPosition', () => {
  const chapters = [
    { id: 0, start: 0, end: 1000, title: 'Ch 1' },
    { id: 1, start: 1000, end: 2000, title: 'Ch 2' },
    { id: 2, start: 2000, end: 3000, title: 'Ch 3' },
  ];

  it('finds correct chapter at start', () => {
    const result = findChapterForPosition(chapters, 0);
    expect(result?.index).toBe(0);
  });

  it('finds correct chapter in middle', () => {
    const result = findChapterForPosition(chapters, 1500);
    expect(result?.index).toBe(1);
  });

  it('handles position past end', () => {
    const result = findChapterForPosition(chapters, 5000);
    expect(result?.index).toBe(2);
  });
});
```

---

*Document generated from comprehensive code analysis. Last updated: 2025-12-29*
