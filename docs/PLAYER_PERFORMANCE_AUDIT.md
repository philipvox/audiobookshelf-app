# Player Performance Audit Report

**Date:** 2026-01-01
**Files Analyzed:**
- `src/features/player/stores/playerStore.ts` (~2400 lines)
- `src/features/player/screens/CDPlayerScreen.tsx` (~3000 lines)

---

## Executive Summary

This audit identifies performance issues that cause unnecessary re-renders, callback recreations, and potential UI lag in the player. Issues are categorized by severity.

---

## 🔴 CRITICAL Issues (High Impact)

### 1. `enterDirectScrub` callback recreates on every position update

**File:** `CDPlayerScreen.tsx:881-892`
```typescript
const enterDirectScrub = useCallback(() => {
  setIsDirectScrubbing(true);
  setScrubViewPosition(position);  // <-- Uses position from render
  // ...
  lastScrubPosition.current = position;
  audioService.setScrubbing(true);
}, [position, timelineHaptics]);  // <-- position in deps!
```

**Problem:** This callback is in the dependency array with `position`, which updates ~2 times/second during playback. Every position update recreates this callback and triggers re-renders in any child components that receive it.

**Fix:** Use `usePlayerStore.getState().position` inside the callback:
```typescript
const enterDirectScrub = useCallback(() => {
  const currentPosition = usePlayerStore.getState().position;
  setIsDirectScrubbing(true);
  setScrubViewPosition(currentPosition);
  timelineHaptics.triggerModeChange('enter');
  timelineHaptics.resetTracking();
  lastScrubPosition.current = currentPosition;
  audioService.setScrubbing(true);
}, [timelineHaptics]); // Remove position dependency
```

---

### 2. `ChapterTimelineProgressBar` useEffect runs on every position change

**File:** `CDPlayerScreen.tsx:779-794`
```typescript
useEffect(() => {
  if (isDirectScrubbing) return;

  const positionX = position * PIXELS_PER_SECOND;
  const newOffset = -positionX + CHAPTER_MARKER_X;

  const positionDelta = Math.abs(position - lastPosition.current);
  lastPosition.current = position;

  if (positionDelta > 0.1) {
    timelineOffset.value = newOffset;
  }
}, [position, isDirectScrubbing]);
```

**Problem:** This useEffect runs on every position update (~2x/sec). While it has early return logic, the effect still executes its setup phase every time.

**Fix:** Use `useDerivedValue` from Reanimated instead:
```typescript
const timelineOffset = useDerivedValue(() => {
  if (isDirectScrubbing) return timelineOffset.value;
  return -position * PIXELS_PER_SECOND + CHAPTER_MARKER_X;
}, [position, isDirectScrubbing]);
```

---

### 3. Inline functions in JSX cause child re-renders

**File:** `CDPlayerScreen.tsx` - Multiple locations

Found 27+ inline arrow functions in `onPress` handlers:

| Line | Code | Impact |
|------|------|--------|
| 1841 | `onPress={() => setActiveSheet('none')}` | Medium |
| 1862 | `onPress={() => handleChapterSelect(chapter.start)}` | High (in list) |
| 1968-2124 | Multiple sleep/speed option buttons | Medium |
| 2526 | `onPress={() => setActiveSheet('chapters')}` | Medium |
| 2650 | `onPress={() => setActiveSheet('none')}` | Medium |

**Problem:** These functions are recreated on every render. While React handles this for static content, it breaks `React.memo` optimizations for child components.

**Fix (Priority):** The most critical one in a list is line 1862:
```typescript
// Before - creates new function for each chapter on every render
onPress={() => handleChapterSelect(chapter.start)}

// After - stable callback, chapter passed as data
const ChapterItem = React.memo(({ chapter, onSelect }) => (
  <TouchableOpacity onPress={() => onSelect(chapter.start)}>
    ...
  </TouchableOpacity>
));
```

---

## 🟡 MODERATE Issues (Medium Impact)

### 4. Multiple individual store subscriptions instead of batched

**File:** `CDPlayerScreen.tsx:1362-1375`
```typescript
const closePlayer = usePlayerStore((s) => s.closePlayer);
const play = usePlayerStore((s) => s.play);
const pause = usePlayerStore((s) => s.pause);
const setPlaybackRate = usePlayerStore((s) => s.setPlaybackRate);
const setSleepTimer = usePlayerStore((s) => s.setSleepTimer);
const clearSleepTimer = usePlayerStore((s) => s.clearSleepTimer);
const seekTo = usePlayerStore((s) => s.seekTo);
const nextChapter = usePlayerStore((s) => s.nextChapter);
const prevChapter = usePlayerStore((s) => s.prevChapter);
const addBookmark = usePlayerStore((s) => s.addBookmark);
const skipForwardInterval = usePlayerStore((s) => s.skipForwardInterval ?? 30);
const skipBackInterval = usePlayerStore((s) => s.skipBackInterval ?? 15);
```

**Problem:** Each `usePlayerStore((s) => s.action)` creates a separate subscription. While actions are stable, this pattern creates 12+ subscription objects.

**Fix:** Batch action selectors:
```typescript
const actions = usePlayerStore(
  useShallow((s) => ({
    closePlayer: s.closePlayer,
    play: s.play,
    pause: s.pause,
    setPlaybackRate: s.setPlaybackRate,
    setSleepTimer: s.setSleepTimer,
    clearSleepTimer: s.clearSleepTimer,
    seekTo: s.seekTo,
    nextChapter: s.nextChapter,
    prevChapter: s.prevChapter,
    addBookmark: s.addBookmark,
  }))
);

const { skipForwardInterval, skipBackInterval } = usePlayerStore(
  useShallow((s) => ({
    skipForwardInterval: s.skipForwardInterval ?? 30,
    skipBackInterval: s.skipBackInterval ?? 15,
  }))
);
```

---

### 5. Inline style objects recreate on every render

**File:** `CDPlayerScreen.tsx:258-283, 369, 1142, 2294, 2642`

```typescript
<View style={{ width: size, height: size, backgroundColor: '#FFFFFF', ... }}>
```

**Problem:** Object literals in JSX are recreated on every render, causing unnecessary style recalculations.

**Fix:** Move to StyleSheet or useMemo:
```typescript
// For dynamic styles
const dynamicStyles = useMemo(() => ({
  container: { width: size, height: size }
}), [size]);

// For static styles
const styles = StyleSheet.create({
  container: { width: 24, height: 24, backgroundColor: '#FFFFFF' }
});
```

---

### 6. `TimelineProgressBar` normalizedProgress recalculates on every position

**File:** `CDPlayerScreen.tsx:417-442`
```typescript
const normalizedProgress = useMemo(() => {
  if (duration <= 0) return 0;
  // ... calculation
}, [position, duration, chapters]);
```

**Problem:** This is expected behavior for a progress bar, but the component should be isolated to prevent parent re-renders.

**Status:** ✅ Already using `React.memo` - this is acceptable.

---

### 7. `scrubViewPosition` state initialized with position

**File:** `CDPlayerScreen.tsx:849`
```typescript
const [scrubViewPosition, setScrubViewPosition] = useState(position);
```

**Problem:** `useState` initial value is only used on mount, but developers might expect it to update. This is fine but could be confusing.

**Status:** ✅ Correct behavior - initial value only used once.

---

## 🟢 LOW Priority Issues

### 8. useEffect for FPS monitoring has empty cleanup

**File:** `CDPlayerScreen.tsx:939-945`
```typescript
useEffect(() => {
  if (isDirectScrubbing) {
    fpsMonitor.start('scrubbing');
  } else {
    fpsMonitor.stop();
  }
}, [isDirectScrubbing]);
```

**Status:** ✅ Acceptable - simple state-based toggle.

---

### 9. Multiple `formatTime` functions could be cached

**File:** `CDPlayerScreen.tsx` - Time formatting happens frequently

**Recommendation:** Consider memoizing expensive string formatting:
```typescript
const formattedPosition = useMemo(() => formatTimeHHMMSS(position), [Math.floor(position)]);
const formattedDuration = useMemo(() => formatTimeHHMMSS(duration), [duration]);
```

---

## ✅ Already Optimized (Good Patterns Found)

### Good: Skip handlers use getState()

**File:** `CDPlayerScreen.tsx:1569-1583`
```typescript
const handleSkipBack = useCallback(() => {
  haptics.skip();
  const currentPos = usePlayerStore.getState().position;  // ✅ Good!
  const newPosition = Math.max(0, currentPos - skipBackInterval);
  seekTo?.(newPosition);
}, [skipBackInterval, seekTo]);
```

### Good: Play/pause uses getState()

**File:** `CDPlayerScreen.tsx:1599-1606` (Just fixed!)
```typescript
const handlePlayPause = useCallback(() => {
  const { isPlaying: playing } = usePlayerStore.getState();  // ✅ Good!
  if (playing) pause(); else play();
}, [pause, play]);
```

### Good: Main state uses useShallow

**File:** `CDPlayerScreen.tsx:1340-1355`
```typescript
const { currentBook, isPlayerVisible, ... } = usePlayerStore(
  useShallow((s) => ({ ... }))  // ✅ Good!
);
```

### Good: Position isolated from main selector

**File:** `CDPlayerScreen.tsx:1359`
```typescript
const position = usePlayerStore((s) => s.isSeeking ? s.seekPosition : s.position);
```
This is separate from the main selector to prevent position updates from triggering full component re-renders.

---

## playerStore.ts Analysis

### Good Architecture Patterns ✅

1. **Seeking mode blocks position updates** - Prevents jitter during scrubbing
2. **Module-level state for intervals** - Avoids store pollution
3. **Smart rewind state persistence** - Survives app restart
4. **subscribeWithSelector middleware** - Enables fine-grained subscriptions

### Potential Improvements

1. **PROGRESS_SAVE_INTERVAL could be dynamic** - Save more frequently when battery is good
2. **Download listener recreates on each book** - Could be singleton pattern

---

## Recommended Fix Priority

| Priority | Issue | Est. Impact | Est. Effort |
|----------|-------|-------------|-------------|
| 1 | Fix `enterDirectScrub` position dependency | High | 5 min |
| 2 | Convert position useEffect to useDerivedValue | High | 15 min |
| 3 | Batch store action subscriptions | Medium | 10 min |
| 4 | Memoize chapter list item callbacks | Medium | 20 min |
| 5 | Move inline styles to StyleSheet | Low | 30 min |

---

## Quick Wins Checklist

- [ ] Remove `position` from `enterDirectScrub` deps, use getState()
- [ ] Use `useDerivedValue` for timeline offset calculation
- [ ] Batch action selectors with useShallow
- [ ] Extract chapter list item to memoized component
- [ ] Move inline style objects to StyleSheet

---

## Performance Testing Recommendations

1. **Use React DevTools Profiler** to identify components re-rendering during playback
2. **Enable FPS overlay** during scrubbing to catch frame drops
3. **Test on low-end Android device** - Performance issues are more visible
4. **Profile with Flipper** to identify JS thread bottlenecks

---

*Report generated by Claude Code audit*
