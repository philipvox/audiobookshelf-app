# Edit Specification: Player Architecture

**Covers Action Plan Items:** 1.2, 1.3, 2.2, 3.1, 3.9
**Priority:** Critical
**Effort:** L (Large) - 5-8 days combined

---

## Current State

### CDPlayerScreen.tsx
- **File:** `src/features/player/screens/CDPlayerScreen.tsx`
- **Lines:** 4,398 (largest file in codebase)
- **Imports:** 32 modules
- **useEffect hooks:** 11
- **Contains inline:**
  - Timeline component (~800 lines)
  - Transport controls (~400 lines)
  - Chapter list sheet (~300 lines)
  - Bookmarks sheet (~250 lines)
  - Sleep timer sheet (~150 lines)
  - Speed sheet (~100 lines)
  - Queue panel integration
  - Complex gesture handling (PanResponder)
  - Theme colors definition (lines 86-180)

### playerStore.ts
- **File:** `src/features/player/stores/playerStore.ts`
- **Lines:** 2,838 (second largest)
- **Imports:** 43 modules
- **Manages:** playback, seeking, chapters, speed, sleep timer, bookmarks, completion, position syncing
- **`as any` casts:** 8 occurrences
- **Console.log:** 8 debug statements
- **Critical feature:** `isSeeking` flag blocks position updates during scrubbing (DO NOT BREAK)

### StandardPlayerScreen
- **Status:** Does not exist (0% implementation)
- **Spec requirement:** Audible-style alternative player with linear progress bar

### GlobalMiniPlayer.tsx
- **File:** `src/navigation/components/GlobalMiniPlayer.tsx`
- **Lines:** 649
- **Status:** Well-organized, no changes required

---

## Issues Identified

| Issue | Source | Severity |
|-------|--------|----------|
| CDPlayerScreen is 4,398 lines - unmaintainable | [28], [29], [30] #1 | Critical |
| playerStore is 2,838 lines - god object | [28], [29], [30] #2 | Critical |
| StandardPlayerScreen missing from spec | [27], [30] #7 | Medium |
| CDPlayerScreen has 11 useEffect hooks | [28] | High |
| Complex gesture handling inline | [28] | High |
| Volume icon behavior unclear | [27] | Low |
| CDPlayerScreen re-renders from Animated.Values | [28] | Medium |

---

## Alignment Requirements

From [31] Alignment Audit:
- Progress display format: Player should show elapsed/total time (not percentage)
- Theme support: Must support light/dark via `useThemeStore`
- Seeking mode: `isSeeking` flag is documented as "working well" in [30] - preserve exactly

From [30] Executive Summary:
- "Systems Working Well" includes seeking mode implementation - do NOT modify
- playerStore is heavily documented - maintain documentation quality during split

---

## Target State

### CDPlayerScreen.tsx → <1,000 lines

Extract to separate files:
```
src/features/player/
├── screens/
│   ├── CDPlayerScreen.tsx        (~500 lines - composition only)
│   └── StandardPlayerScreen.tsx  (NEW ~400 lines)
├── components/
│   ├── PlayerHeader.tsx          (~100 lines)
│   ├── PlayerCoverArt.tsx        (~150 lines)
│   ├── PlayerTimeline.tsx        (~800 lines)
│   ├── PlayerControls.tsx        (~400 lines)
│   ├── ChapterListSheet.tsx      (~300 lines)
│   ├── BookmarksSheet.tsx        (~250 lines)
│   ├── SleepTimerPanel.tsx       (exists, update)
│   └── SpeedPanel.tsx            (exists, update)
└── hooks/
    ├── usePlayerGestures.ts      (~200 lines)
    └── useTimelineInteraction.ts (~150 lines)
```

### playerStore.ts → <800 lines

Split into domain stores:
```
src/features/player/stores/
├── playerStore.ts        (~800 lines - core playback only)
├── chapterStore.ts       (~400 lines)
├── bookmarksStore.ts     (~300 lines)
├── sleepTimerStore.ts    (~200 lines)
├── speedStore.ts         (~150 lines) [may merge with existing settingsStore]
└── playerUIStore.ts      (~200 lines - visibility, sheets)
```

---

## Specific Changes

### 1.3: CDPlayerScreen Extraction

#### Step 1: Extract PlayerTimeline.tsx
**From:** `CDPlayerScreen.tsx` lines ~1200-2000
**To:** `src/features/player/components/PlayerTimeline.tsx`

```typescript
// PlayerTimeline.tsx
interface PlayerTimelineProps {
  position: number;
  duration: number;
  chapters: Chapter[];
  bookmarks: Bookmark[];
  isSeeking: boolean;
  onSeekStart: () => void;
  onSeekUpdate: (position: number) => void;
  onSeekEnd: (position: number) => void;
  onChapterTap: (chapterIndex: number) => void;
  themeColors: PlayerColors;
}

export const PlayerTimeline: React.FC<PlayerTimelineProps> = React.memo(({ ... }) => {
  // Move all timeline rendering logic here
  // Keep gesture handling as props callbacks
});
```

#### Step 2: Extract PlayerControls.tsx
**From:** `CDPlayerScreen.tsx` lines ~2000-2400
**To:** `src/features/player/components/PlayerControls.tsx`

```typescript
interface PlayerControlsProps {
  isPlaying: boolean;
  playbackRate: number;
  controlMode: 'rewind' | 'chapter';
  onPlay: () => void;
  onPause: () => void;
  onSkipForward: () => void;
  onSkipBackward: () => void;
  onSpeedPress: () => void;
  themeColors: PlayerColors;
}
```

#### Step 3: Extract Sheets
**From:** `CDPlayerScreen.tsx` lines ~2400-3200
**To:** Individual sheet components

- `ChapterListSheet.tsx` - chapter navigation with scroll-to-current
- `BookmarksSheet.tsx` - bookmark list, add/edit/delete
- Update existing `SleepTimerPanel.tsx` and `SpeedPanel.tsx`

#### Step 4: Extract usePlayerGestures.ts
**From:** `CDPlayerScreen.tsx` PanResponder setup
**To:** `src/features/player/hooks/usePlayerGestures.ts`

```typescript
export function usePlayerGestures({
  onSwipeDown,
  onTimelinePress,
  onTimelinePan,
}: PlayerGestureCallbacks) {
  // All PanResponder and Gesture.Pan logic here
  return { panGesture, swipeGesture };
}
```

### 2.2: playerStore Split

**CRITICAL:** Preserve `isSeeking` behavior exactly. The seeking logic must remain in core playback store.

#### Step 1: Extract sleepTimerStore.ts (safest first)
**From:** `playerStore.ts` sleep timer related state and actions
**To:** `src/features/player/stores/sleepTimerStore.ts`

```typescript
interface SleepTimerState {
  sleepTimer: number | null;
  sleepTimerInterval: NodeJS.Timeout | null;
  shakeToExtendEnabled: boolean;
  // Actions
  setSleepTimer: (minutes: number | null) => void;
  extendSleepTimer: (minutes: number) => void;
  clearSleepTimer: () => void;
}
```

#### Step 2: Extract bookmarksStore.ts
**From:** `playerStore.ts` bookmark CRUD
**To:** `src/features/player/stores/bookmarksStore.ts`

```typescript
interface BookmarksState {
  bookmarks: Bookmark[];
  // Scoped to current book
  loadBookmarks: (bookId: string) => Promise<void>;
  addBookmark: (time: number, note?: string) => Promise<void>;
  updateBookmark: (id: string, updates: Partial<Bookmark>) => Promise<void>;
  deleteBookmark: (id: string) => Promise<void>;
}
```

#### Step 3: Extract chapterStore.ts
**From:** `playerStore.ts` chapter navigation
**To:** `src/features/player/stores/chapterStore.ts`

```typescript
interface ChapterState {
  chapters: Chapter[];
  viewingChapters: Chapter[];
  currentChapterIndex: number;
  // Actions
  loadChapters: (book: LibraryItem) => void;
  goToChapter: (index: number) => Promise<void>;
  goToNextChapter: () => Promise<void>;
  goToPreviousChapter: () => Promise<void>;
}
```

#### Step 4: Keep core playback in playerStore.ts
After extraction, playerStore should contain ONLY:
- `currentBook`, `viewingBook`
- `position`, `duration`, `isPlaying`, `isLoading`, `isBuffering`
- **`isSeeking`, `seekPosition`, `seekStartPosition`, `seekDirection`** (MUST STAY)
- `playbackRate`, `bookSpeedMap`, `globalDefaultRate`
- Core actions: `play`, `pause`, `seekTo`, `loadBook`

### 1.2: Create StandardPlayerScreen

**New file:** `src/features/player/screens/StandardPlayerScreen.tsx`

Based on [27] UX spec:
- Linear progress bar (not chapter-normalized)
- Cover art at ~40% screen height
- Play/pause with skip buttons
- Speed and sleep timer access
- Simpler UI compared to CD player

```typescript
// StandardPlayerScreen.tsx (~400 lines)
export const StandardPlayerScreen: React.FC = () => {
  const { currentBook, position, duration, isPlaying } = usePlayerStore();
  // Simpler Audible-style layout
  return (
    <View style={styles.container}>
      <PlayerHeader onClose={closePlayer} />
      <CoverArt book={currentBook} size="large" />
      <LinearProgressBar
        position={position}
        duration={duration}
        onSeek={seekTo}
      />
      <TimeDisplay position={position} duration={duration} />
      <SimpleControls
        isPlaying={isPlaying}
        onPlay={play}
        onPause={pause}
        onSkipForward={skipForward}
        onSkipBackward={skipBackward}
      />
      <QuickActions />
    </View>
  );
};
```

### 3.1: Performance Optimization

After extraction, memoize all extracted components:

```typescript
// Each extracted component should use React.memo
export const PlayerTimeline = React.memo(({ ... }) => { ... });
export const PlayerControls = React.memo(({ ... }) => { ... });

// Use useMemo for expensive calculations
const visibleTicks = useMemo(() =>
  getVisibleTicks(chapters, containerWidth),
  [chapters, containerWidth]
);

// Use useCallback for all callbacks passed to children
const handleSeekStart = useCallback(() => {
  setIsSeeking(true);
}, []);
```

### 3.9: Volume Icon Behavior

**In PlayerHeader.tsx:**
```typescript
// Current: Volume2 icon with unclear tap behavior
// Target: Tap opens system volume control or shows volume slider

<TouchableOpacity
  onPress={handleVolumePress}
  accessibilityLabel="Adjust volume"
  accessibilityHint="Opens volume control"
>
  <Volume2 size={scale(24)} color={themeColors.iconPrimary} />
</TouchableOpacity>
```

---

## Cross-Screen Dependencies

| Screen | Depends On | Impact of Changes |
|--------|------------|-------------------|
| GlobalMiniPlayer | playerStore (position, isPlaying) | Must update imports if stores split |
| BookCompletionSheet | playerStore (completionSheetBook) | Move completion state to playerUIStore |
| QueueScreen | playerStore (currentBook) | Update import path |
| BookDetailScreen | playerStore (currentBook, play) | Update import path |

---

## Testing Criteria

### CDPlayerScreen Extraction
- [ ] All existing functionality works identically
- [ ] Timeline scrubbing works without jitter
- [ ] Chapter ticks render correctly
- [ ] Bookmark flags display on timeline
- [ ] Sleep timer countdown works
- [ ] Speed change applies immediately
- [ ] Swipe-down-to-close works
- [ ] Android back button behavior preserved
- [ ] Theme switching (light/dark) works

### playerStore Split
- [ ] **CRITICAL: Seeking mode blocks position updates** (test by scrubbing quickly)
- [ ] Play/pause works
- [ ] Sleep timer fires at correct time
- [ ] Bookmarks persist across app restarts
- [ ] Chapter navigation works
- [ ] Per-book speed memory works
- [ ] Position syncs to server

### StandardPlayerScreen
- [ ] Linear progress bar shows correct position
- [ ] All transport controls work
- [ ] User can switch between CD and Standard player
- [ ] Both players share same playback state

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking seeking mode | Add comprehensive tests before refactoring. Keep `isSeeking` in core store. |
| Regression in playback | Extract one component at a time. Test after each extraction. |
| Store subscription issues | Keep all stores using `subscribeWithSelector`. Test selectors. |
| Performance regression | Profile before and after. Memoize extracted components. |

---

## Effort Breakdown

| Task | Effort | Risk |
|------|--------|------|
| Extract PlayerTimeline | 4-6 hours | Medium |
| Extract PlayerControls | 2-4 hours | Low |
| Extract Sheets | 4-6 hours | Low |
| Extract usePlayerGestures | 2-4 hours | Medium |
| Compose CDPlayerScreen | 2-4 hours | Low |
| Extract sleepTimerStore | 2-4 hours | Low |
| Extract bookmarksStore | 2-4 hours | Low |
| Extract chapterStore | 4-6 hours | Medium |
| Clean up playerStore | 4-8 hours | High |
| Create StandardPlayerScreen | 6-8 hours | Medium |
| Performance optimization | 4-6 hours | Low |
| Testing & fixes | 8-12 hours | - |

**Total: 5-8 days**
