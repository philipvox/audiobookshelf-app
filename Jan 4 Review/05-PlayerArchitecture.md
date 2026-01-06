# Player Architecture Documentation

## Overview

The player system consists of three main components that coordinate through a central Zustand store:

1. **CDPlayerScreen** - Full-screen player interface
2. **GlobalMiniPlayer** - Floating mini player at bottom of screen
3. **BookCompletionSheet** - Modal shown when a book finishes

All three components read from and write to `playerStore.ts`, which is the single source of truth for all playback state.

---

## State Coordination

### Central Store: `playerStore.ts`

**File:** `src/features/player/stores/playerStore.ts`

The playerStore manages all player state including:

| State | Type | Purpose |
|-------|------|---------|
| `currentBook` | `LibraryItem \| null` | Currently loaded book |
| `isPlaying` | `boolean` | Playback active |
| `position` | `number` | Current position in seconds |
| `duration` | `number` | Total book duration |
| `chapters` | `Chapter[]` | Chapter information |
| `isPlayerVisible` | `boolean` | Full player shown |
| `isLoading` | `boolean` | Loading state |
| `showCompletionSheet` | `boolean` | Completion modal visible |
| `completionSheetBook` | `LibraryItem \| null` | Book that just finished |

### Key Actions

```typescript
// Player visibility
togglePlayer: () => void;       // Toggle full player
closePlayer: () => void;        // Close full player

// Playback control
play: () => Promise<void>;
pause: () => Promise<void>;
seekTo: (position: number) => Promise<void>;

// Completion handling
markBookFinished: (bookId?: string) => Promise<void>;
dismissCompletionSheet: () => void;
```

---

## Component Architecture

### 1. CDPlayerScreen

**File:** `src/features/player/screens/CDPlayerScreen.tsx`

The full-screen player with complete controls.

#### Visibility Control
```typescript
// Only renders when player is visible AND book is loaded
if (!isPlayerVisible || !currentBook) return null;
```

#### Key Features
- Large cover art display (360px centered)
- Timeline progress bar with chapter ticks
- Play/pause, skip forward/back, rewind/fast-forward
- Speed control, sleep timer, bookmarks
- Chapter list sheet
- Queue panel
- Swipe down to close

#### Close Behavior
```typescript
const handleClose = useCallback(() => {
  setActiveSheet('none');  // Close any open sheets
  closePlayer();           // Set isPlayerVisible: false
}, [closePlayer]);
```

#### Android Back Button
```typescript
useEffect(() => {
  if (!isPlayerVisible) return;

  const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
    if (activeSheet !== 'none') {
      setActiveSheet('none');  // Close sheet first
      return true;
    }
    handleClose();  // Then close player
    return true;
  });

  return () => backHandler.remove();
}, [isPlayerVisible, activeSheet, handleClose]);
```

#### Theme Support
```typescript
const playerColors = {
  light: {
    background: '#FFFFFF',
    textPrimary: '#000000',
    tickActive: '#F50101',
    // ...
  },
  dark: {
    background: '#000000',
    textPrimary: '#FFFFFF',
    tickActive: '#F50101',
    // ...
  },
};
```

---

### 2. GlobalMiniPlayer

**File:** `src/navigation/components/GlobalMiniPlayer.tsx`

Floating mini player shown at the bottom of all screens.

#### Visibility Control
```typescript
// Hide when: no book, full player open, or on specific screens
const hiddenRoutes = ['ReadingHistoryWizard', 'MoodDiscovery', 'MoodResults', 'PreferencesOnboarding'];
if (!currentBook || isPlayerVisible || hiddenRoutes.includes(currentRouteName)) {
  return null;
}
```

#### Key Features
- Circular cover image
- Book title (truncated)
- Skip back/forward buttons
- Play/pause button
- Timeline progress bar with ruler ticks
- Swipe up to open full player

#### Swipe Up Gesture
```typescript
const SWIPE_THRESHOLD = -50;  // -50px vertical movement

const panGesture = Gesture.Pan()
  .onUpdate((event) => {
    'worklet';
    if (event.translationY < 0) {
      translateY.value = event.translationY;
    }
  })
  .onEnd((event) => {
    'worklet';
    if (event.translationY < SWIPE_THRESHOLD) {
      runOnJS(handleOpenPlayer)();  // Calls togglePlayer()
    }
    translateY.value = withTiming(0, { duration: 150 });
  });
```

#### Tap to Open
```typescript
<Pressable
  style={styles.content}
  onPress={handleOpenPlayer}  // togglePlayer()
  accessibilityRole="button"
  accessibilityLabel={`Now playing: ${title}. Tap to open player.`}
>
```

---

### 3. BookCompletionSheet

**File:** `src/features/player/components/BookCompletionSheet.tsx`

Bottom sheet modal shown when a book finishes.

#### Visibility Control
```typescript
if (!showCompletionSheet || !completionSheetBook) {
  return null;
}
```

#### Key Features
- Book cover and metadata display
- "You finished" celebration message
- Checkmark celebration icon
- Three action buttons:
  - **Mark as Finished** - Calls `markBookFinished()`
  - **Listen Again** - Calls `dismissCompletionSheet()`
  - **Close** - Calls `dismissCompletionSheet()`

#### Actions
```typescript
const handleMarkFinished = useCallback(async () => {
  if (completionSheetBook) {
    await markBookFinished(completionSheetBook.id);
  }
}, [completionSheetBook, markBookFinished]);

const handleKeepListening = useCallback(() => {
  dismissCompletionSheet();
}, [dismissCompletionSheet]);
```

---

## Transitions Between States

### Mini → Full Player

```
┌─────────────────────────────────────────┐
│  User Action                            │
│  ├─ Tap on mini player                  │
│  └─ Swipe up on mini player             │
│                                         │
│  ↓                                      │
│                                         │
│  togglePlayer() called                  │
│  ↓                                      │
│  set({ isPlayerVisible: true })         │
│                                         │
│  ↓                                      │
│                                         │
│  GlobalMiniPlayer: returns null         │
│  CDPlayerScreen: renders full UI        │
└─────────────────────────────────────────┘
```

### Full → Mini Player

```
┌─────────────────────────────────────────┐
│  User Action                            │
│  ├─ Tap close (X) button                │
│  ├─ Swipe down gesture                  │
│  └─ Android back button                 │
│                                         │
│  ↓                                      │
│                                         │
│  closePlayer() called                   │
│  ↓                                      │
│  set({ isPlayerVisible: false })        │
│                                         │
│  ↓                                      │
│                                         │
│  CDPlayerScreen: returns null           │
│  GlobalMiniPlayer: renders mini UI      │
└─────────────────────────────────────────┘
```

### Book Completion Trigger

```
┌─────────────────────────────────────────┐
│  Audio reaches end of book              │
│  (position >= duration - threshold)     │
│                                         │
│  ↓                                      │
│                                         │
│  onPlaybackStatusUpdate() detects       │
│  playback finished                      │
│                                         │
│  ↓                                      │
│                                         │
│  Check user preferences:                │
│  ├─ showCompletionPrompt: true?         │
│  │   → Show completion sheet            │
│  ├─ autoMarkFinished: true?             │
│  │   → Auto-mark finished               │
│  └─ Neither?                            │
│      → Just add to history              │
│                                         │
│  ↓ (if showCompletionPrompt)            │
│                                         │
│  set({                                  │
│    showCompletionSheet: true,           │
│    completionSheetBook: currentBook     │
│  })                                     │
│                                         │
│  ↓                                      │
│                                         │
│  BookCompletionSheet: renders modal     │
└─────────────────────────────────────────┘
```

---

## State Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            playerStore                                    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐                        ┌─────────────────────────┐  │
│  │ Playback State  │                        │ Visibility State        │  │
│  │                 │                        │                         │  │
│  │ currentBook     │                        │ isPlayerVisible         │  │
│  │ isPlaying       │                        │ showCompletionSheet     │  │
│  │ position        │                        │ completionSheetBook     │  │
│  │ duration        │                        │                         │  │
│  │ chapters        │                        │                         │  │
│  └────────┬────────┘                        └────────────┬────────────┘  │
│           │                                              │               │
│           │ subscribed by all 3 components               │               │
│           │                                              │               │
└───────────┼──────────────────────────────────────────────┼───────────────┘
            │                                              │
            ▼                                              ▼
┌───────────────────────┐    ┌───────────────────────┐    ┌─────────────────────┐
│  GlobalMiniPlayer     │    │  CDPlayerScreen       │    │ BookCompletionSheet │
├───────────────────────┤    ├───────────────────────┤    ├─────────────────────┤
│                       │    │                       │    │                     │
│ Shows when:           │    │ Shows when:           │    │ Shows when:         │
│ • currentBook exists  │    │ • isPlayerVisible     │    │ • showCompletion-   │
│ • !isPlayerVisible    │    │ • currentBook exists  │    │   Sheet             │
│ • not on hidden route │    │                       │    │ • completionSheet-  │
│                       │    │                       │    │   Book exists       │
│ Actions:              │    │ Actions:              │    │                     │
│ • togglePlayer()      │    │ • closePlayer()       │    │ Actions:            │
│ • play/pause          │    │ • play/pause          │    │ • markBookFinished  │
│ • skip ±30s           │    │ • seekTo              │    │ • dismissSheet      │
│ • seekTo              │    │ • setPlaybackRate     │    │                     │
│                       │    │ • addBookmark         │    │                     │
└───────────────────────┘    └───────────────────────┘    └─────────────────────┘
```

---

## Timeline Progress Bar

Both CDPlayerScreen and GlobalMiniPlayer implement timeline progress bars with similar features:

### Features
- Red circle marker at current position
- Tick marks (major/minor)
- Drag/pan gesture for scrubbing
- Tap to seek

### CDPlayerScreen Timeline
- Chapter-normalized: each chapter takes equal visual width
- Bookmark flags displayed on timeline
- Adaptive tick density based on chapter count

### GlobalMiniPlayer Timeline
- Time-based linear progress
- Chapter-aware ticks (highlight when near chapter boundaries)
- Hybrid approach: time-based ticks with chapter visual hints

---

## Related Files

| File | Purpose |
|------|---------|
| `src/features/player/stores/playerStore.ts` | Central state management (~2000 lines) |
| `src/features/player/screens/CDPlayerScreen.tsx` | Full-screen player |
| `src/navigation/components/GlobalMiniPlayer.tsx` | Mini player |
| `src/features/player/components/BookCompletionSheet.tsx` | Completion modal |
| `src/features/player/services/audioService.ts` | Audio playback engine |
| `src/features/player/stores/settingsStore.ts` | Playback preferences |
| `src/features/queue/stores/queueStore.ts` | Playback queue |

---

## Theme Support

All three components support light and dark modes via `useThemeStore`:

| Component | Theme Hook | Color Config |
|-----------|------------|--------------|
| CDPlayerScreen | `usePlayerColors()` | `playerColors.light/dark` |
| GlobalMiniPlayer | `useMiniPlayerColors()` | `miniPlayerColors.light/dark` |
| BookCompletionSheet | Hardcoded dark | `#1c1c1e` background |

---

## Key Design Decisions

1. **Single Source of Truth**: All playback state lives in `playerStore`, preventing sync issues between components.

2. **Mutually Exclusive Visibility**: CDPlayerScreen and GlobalMiniPlayer never render simultaneously - controlled by `isPlayerVisible`.

3. **Gesture-Based Navigation**: Swipe up opens full player, swipe down closes it - natural mobile patterns.

4. **Non-Blocking Updates**: Position updates flow from audio engine → store → UI without blocking user interactions.

5. **Seeking Protection**: `isSeeking` flag prevents position jitter during user scrubbing.
