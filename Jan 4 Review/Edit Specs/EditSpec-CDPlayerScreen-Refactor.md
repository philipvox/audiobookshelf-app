# CDPlayerScreen Refactor - Edit Specification

## Overview
- **File:** `src/features/player/screens/CDPlayerScreen.tsx`
- **Current Lines:** 4,403
- **Target:** < 800 lines main screen, extracted components < 300 lines each
- **Date:** 2026-01-05

---

## 1. Current Responsibilities (with Line Ranges)

### 1.1 Imports & Dependencies (Lines 1-88)
- React, React Native core imports
- Reanimated (useSharedValue, useAnimatedStyle, runOnJS, useDerivedValue)
- react-native-gesture-handler (Gesture, GestureDetector)
- react-native-svg (Svg, Circle, Line, Rect, Path, Text)
- expo-blur, expo-linear-gradient, expo-image
- lucide-react-native icons
- Internal stores, hooks, services

### 1.2 Theme System (Lines 88-186)
- `playerColors` object with light/dark mode variants (87 lines)
- `usePlayerColors()` hook for theme access
- Color definitions: background, text, buttons, sheets, accents

### 1.3 Types & Constants (Lines 181-234)
- `SheetType` union: 'none' | 'chapters' | 'settings' | 'queue' | 'sleep' | 'speed' | 'bookmarks' | 'sleepPanel' | 'speedPanel'
- `ProgressMode` type: 'book' | 'chapter'
- `SPEED_QUICK_OPTIONS`: [0.75, 1, 1.25, 1.5, 2]
- `SLEEP_QUICK_OPTIONS`: [15, 30, 45, 60, 90, 120]
- Timeline constants: TIMELINE_WIDTH, PIXELS_PER_SECOND, tick heights, etc.

### 1.4 Helper Functions (Lines 200-234)
- `formatTime(seconds)` - MM:SS or H:MM:SS format
- `formatTimeHHMMSS(seconds)` - Always HH:MM:SS format
- `formatTimeVerbose(seconds)` - "X hr Y min" format

### 1.5 CircularProgress Component (Lines 240-290)
- SVG-based circular download progress indicator
- Props: progress (0-1)
- ~50 lines, self-contained

### 1.6 SVG Icon Components (Lines 292-381)
- `MoonIcon` - Sleep timer icon
- `RewindIcon` - Skip back with interval label
- `FastForwardIcon` - Skip forward with interval label
- `DownArrowIcon` - Close player arrow
- `SettingsIconCircle` - Gear icon in circle
- ~90 lines total

### 1.7 TimelineProgressBar Component (Lines 386-702)
- Book-level progress bar with chapter markers
- **State:** pan gesture, tick generation, bookmark rendering
- **Gestures:** Pan for seeking (lines 496-572)
- **Features:**
  - Chapter segment normalization
  - Memoized tick generation with caching
  - Bookmark flag rendering
- ~316 lines

### 1.8 ChapterTimelineProgressBar Component (Lines 704-1252)
- **THE MOST COMPLEX COMPONENT** - 549 lines
- Scrolling chapter-level timeline with long-press + pan scrubbing
- **State:**
  - `isDirectScrubbing` - scrub mode active
  - `showScrubTooltip` - "DRAG TO SCRUB" tooltip
  - `scrubSpeedMode` - current speed mode indicator
  - `scrubViewPosition` - position for tick windowing
  - `lastHapticMinute`, `lastHapticChapter` - haptic tracking
- **Shared Values (Reanimated):**
  - `timelineOffset` - timeline scroll position
  - `scrubStartOffset`, `scrubStartX`, `scrubStartY`
  - `edgeScrollAccumulator` - edge auto-scroll
  - `scrubCurrentPosition`
- **Gestures:** LongPress + Pan composed gesture (lines 978-1083)
- **Features:**
  - Variable speed scrubbing (0.1x, 0.25x, 0.5x, 1x, 2x based on vertical drag)
  - Edge auto-scroll with cubic easing
  - Haptic feedback on chapter/minute crossings
  - Snap-to-chapter settings integration
  - Tick windowing (60 min each direction) for performance
  - SVG viewport capping to prevent Android "bitmap too large" crash

### 1.9 ChapterListItem Component (Lines 1343-1437)
- Memoized chapter list item
- Props: chapter, index, isCurrentChapter, onSelect, themeColors, isDarkMode
- ~95 lines including styles

### 1.10 Main CDPlayerScreen Component (Lines 1443-2910)

#### 1.10.1 Performance & Setup (Lines 1443-1461)
- `useScreenLoadTime('CDPlayerScreen')`
- `useRenderTracker`, `useLifecycleTracker` (dev only)
- `useFpsMonitor('fullPlayer')`
- `useSafeAreaInsets()`

#### 1.10.2 Store Subscriptions (Lines 1467-1564)
- Primary state via `useShallow`: currentBook, isPlayerVisible, isPlaying, isLoading, isBuffering, duration, playbackRate, chapters, bookmarks
- Sleep timer with coarse granularity (separate subscription)
- Position with floored equality selector
- Actions batch: closePlayer, play, pause, setPlaybackRate, setSleepTimer, clearSleepTimer, seekTo, nextChapter, prevChapter, addBookmark
- Skip intervals (separate subscriptions with defaults)

#### 1.10.3 Derived State & Hooks (Lines 1556-1622)
- `chapterIndex` via useCurrentChapterIndex()
- `coverUrl` via useCoverUrl()
- `isDownloaded` via useIsOfflineAvailable()
- `queueCount` via useQueueCount()
- Theme colors via usePlayerColors()
- Book metadata extraction (title, author, narrator, description)
- `normalizedChapters` via useNormalizedChapters()
- `timelineChapters` mapping

#### 1.10.4 Local State (Lines 1586-1588)
- `activeSheet` - current sheet type
- `progressMode` - 'book' | 'chapter'
- `interactionsReady` - deferred initialization

#### 1.10.5 Pan Responder - Swipe to Close (Lines 1649-1689)
- Captures vertical swipe gestures
- Animates slide out then closes player
- Snap-back spring if swipe threshold not met

#### 1.10.6 Handler Functions (Lines 1703-1791)
- `handleClose()` - close player
- `closeSheet()`, `openChapters()`, `openSettings()`, `openQueue()`, `openBookmarks()`
- `handleChapterSelect(chapterStart)` - seek to chapter
- `handleSkipBack()`, `handleSkipForward()` - skip by interval
- `handlePrevChapter()`, `handleNextChapter()` - chapter navigation
- `handlePlayPause()` - toggle playback
- Android back button handling (lines 1720-1735)

#### 1.10.7 Continuous Seeking - Hold to Scrub (Lines 1796-1902)
- `seekIntervalRef`, `seekDelayRef`, `seekStartTimeRef`, `seekDirectionRef`, `didStartSeekingRef`
- `getSeekAmount()` - accelerating seek (2s → 5s → 10s → 15s per tick)
- `beginContinuousSeeking(direction)` - starts 100ms interval
- `handleRewindPressIn()`, `handleFastForwardPressIn()` - start delay timer
- `handleSeekPressOut()` - stop seeking
- `handleSkipBackWithCheck()`, `handleSkipForwardWithCheck()` - only skip if not holding

#### 1.10.8 Bookmark Management (Lines 1903-2009)
- `showBookmarkPill`, `bookmarkPillAnim` - pill popup state
- `lastCreatedBookmarkId`, `showNoteInput`, `noteInputValue`, `editingBookmarkId`
- `deletedBookmark` - undo state with timeout
- `handleAddBookmark()` - create bookmark with pill popup animation
- `handleAddNoteFromPill()` - open note editor from pill
- `handleSaveNote()` - save bookmark note
- `handleDeleteBookmark()`, `handleUndoDelete()` - delete with undo

#### 1.10.9 Render Helpers (Lines 2017-2401)
- `renderChaptersSheet()` - chapters list (lines 2021-2048)
- Custom speed/sleep input state management (lines 2050-2105)
- `renderSettingsSheet()` - settings panel (lines 2106-2300)
- `renderBookmarksSheet()` - bookmarks list (lines 2302-2401)

#### 1.10.10 Main Render (Lines 2403-2910)
- Early return if !isPlayerVisible || !currentBook
- Animated.View container with slideAnim transform
- Background blur layer (BlurView + LinearGradient)
- Buffering indicator
- Cover image with overlay buttons:
  - Top-left: Download status (check/progress/download button)
  - Top-center: Close arrow
  - Top-right: Settings
  - Bottom: Queue button, Bookmark button
- Title section with author/narrator (tappable)
- Chapter title & time display
- Progress bar (book/chapter mode switching)
- Player controls bar (rewind, play/pause with sleep timer, forward)
- Inline bottom sheets container
- Bookmark deleted toast with undo
- Note input modal

### 1.11 Styles (Lines 2912-4400)
- ~1,488 lines of StyleSheet definitions
- Major sections:
  - Container & background styles
  - Header & navigation styles
  - Standard player mode styles
  - Cover overlay styles
  - Progress bar styles
  - Control bar styles
  - Sheet styles (overlay, container, header)
  - Chapter list styles
  - Settings sheet styles
  - Bookmarks styles
  - Toast & modal styles

---

## 2. Proposed Component Extraction

### 2.1 Timeline Components (Keep/Refine)

| Component | Current Lines | Target | Notes |
|-----------|---------------|--------|-------|
| TimelineProgressBar | 316 | < 250 | Extract tick caching to hook |
| ChapterTimelineProgressBar | 549 | < 350 | Extract gesture logic to hooks |

### 2.2 New Extracted Components

| Component | Source Lines | Target Lines | Responsibility |
|-----------|--------------|--------------|----------------|
| PlayerCoverOverlay | 2477-2586 | ~120 | Cover with all overlay buttons |
| PlayerMetadata | 2587-2697 | ~120 | Title, author, narrator section |
| PlayerControlsBar | 2738-2817 | ~100 | Rewind, play/pause, forward |
| ChaptersSheet | 2021-2048 | ~80 | Chapters list panel |
| SettingsSheet | 2106-2300 | ~200 | Settings with speed/sleep/actions |
| BookmarksSheet | 2302-2401 | ~150 | Bookmarks list with edit/delete |
| BookmarkToast | 2851-2860 | ~50 | Delete undo toast |
| NoteInputModal | 2862-2906 | ~80 | Bookmark note editor |
| SleepTimerDisplay | 2765-2785 | ~40 | Inline sleep countdown |

### 2.3 New Hooks to Extract

| Hook | Source Lines | Target Lines | Responsibility |
|------|--------------|--------------|----------------|
| useTimelineTicks | 598-650 (TimelineProgressBar) | ~60 | Tick generation & caching |
| useChapterScrubGesture | 978-1083 | ~120 | Long-press + pan gesture logic |
| useContinuousSeeking | 1796-1902 | ~110 | Hold-to-scrub logic |
| useBookmarkActions | 1903-2009 | ~120 | Bookmark CRUD with undo |
| usePlayerSheets | 2050-2105 + state | ~80 | Sheet state management |

### 2.4 Proposed File Structure

```
src/features/player/
├── screens/
│   └── CDPlayerScreen.tsx (~600 lines - composition only)
├── components/
│   ├── timeline/
│   │   ├── TimelineProgressBar.tsx (~250 lines)
│   │   ├── ChapterTimelineProgressBar.tsx (~300 lines)
│   │   └── index.ts
│   ├── PlayerCoverOverlay.tsx (~120 lines)
│   ├── PlayerMetadata.tsx (~120 lines)
│   ├── PlayerControlsBar.tsx (~100 lines)
│   └── sheets/
│       ├── ChaptersSheet.tsx (~80 lines)
│       ├── SettingsSheet.tsx (~200 lines)
│       ├── BookmarksSheet.tsx (~150 lines)
│       └── index.ts
├── hooks/
│   ├── useTimelineTicks.ts (~60 lines)
│   ├── useChapterScrubGesture.ts (~120 lines)
│   ├── useContinuousSeeking.ts (~110 lines)
│   ├── useBookmarkActions.ts (~120 lines)
│   └── usePlayerSheets.ts (~80 lines)
├── utils/
│   ├── playerTheme.ts (~100 lines - theme colors)
│   └── timeFormatters.ts (~40 lines)
└── constants/
    └── playerConstants.ts (~50 lines)
```

---

## 3. Gesture Handling Map

| Gesture | Component | Lines | Type | Purpose |
|---------|-----------|-------|------|---------|
| Swipe down to close | CDPlayerScreen | 1649-1689 | PanResponder | Close player on vertical swipe |
| Timeline pan seek | TimelineProgressBar | 496-572 | Gesture.Pan | Seek by dragging progress bar |
| Long-press + pan scrub | ChapterTimelineProgressBar | 978-1083 | Gesture.LongPress + Gesture.Pan | Direct timeline scrubbing |
| Hold rewind/forward | CDPlayerScreen | 1845-1882 | onPressIn/onPressOut | Continuous seeking acceleration |
| Tap chapter | ChapterListItem | 1367-1369 | TouchableOpacity | Jump to chapter |
| Tap title → BookDetail | CDPlayerScreen | 1738-1743 | TouchableOpacity | Navigate to book details |
| Tap author → AuthorDetail | CDPlayerScreen | 2602-2641 | TouchableOpacity | Navigate to author (with ActionSheet for multiple) |
| Tap narrator → NarratorDetail | CDPlayerScreen | 2650-2688 | TouchableOpacity | Navigate to narrator |
| Long-press bookmark → Edit | BookmarksSheet | 2341-2346 | onLongPress | Open note editor |

### Gesture Interactions & Conflicts

1. **Swipe vs Timeline Scrub:** Pan responder uses capture phase with threshold (dy > 30, vertical > horizontal * 1.5) to avoid capturing horizontal timeline scrubs.

2. **Long-press vs Pan:** ChapterTimelineProgressBar uses composed gesture (LongPress.Pan) - long-press activates scrub mode, then pan moves the timeline.

3. **Hold vs Tap on Skip Buttons:** Uses didStartSeekingRef to track if continuous seeking started. If true, tap handler returns early.

---

## 4. Animation Inventory

### 4.1 React Native Animated

| Animation | Variable | Lines | Trigger | Purpose |
|-----------|----------|-------|---------|---------|
| Slide open/close | slideAnim | 1464 | isPlayerVisible change | Player entrance/exit |
| Bookmark pill grow | bookmarkPillAnim | 1905 | Add bookmark | Pulse effect on bookmark button |
| Snap back spring | slideAnim | 1679-1685 | Swipe cancelled | Return to full screen |

### 4.2 Reanimated (useSharedValue)

| Shared Value | Component | Lines | Purpose |
|--------------|-----------|-------|---------|
| timelineOffset | ChapterTimelineProgressBar | 858 | Scrolling timeline position |
| scrubStartOffset | ChapterTimelineProgressBar | 981 | Starting offset for scrub gesture |
| scrubStartX | ChapterTimelineProgressBar | 982 | Starting X for delta calculation |
| scrubStartY | ChapterTimelineProgressBar | 983 | Starting Y for speed mode |
| edgeScrollAccumulator | ChapterTimelineProgressBar | 1042-1048 | Edge auto-scroll accumulation |
| scrubCurrentPosition | ChapterTimelineProgressBar | 1062 | Current position during scrub |

### 4.3 Animated Styles (useAnimatedStyle)

| Style | Component | Lines | Properties |
|-------|-----------|-------|------------|
| timelineStyle | ChapterTimelineProgressBar | 1086-1090 | transform: [{ translateX }] |

### 4.4 Worklet Functions

| Function | Lines | Purpose |
|----------|-------|---------|
| LongPress.onStart worklet | 997-1001 | Initialize scrub state |
| Pan.onUpdate worklet | 1003-1068 | Calculate scrub position with speed modes |
| Pan.onEnd worklet | 1070-1080 | Finalize scrub and seek |

---

## 5. Store Dependencies

### 5.1 usePlayerStore

**State Subscriptions:**
| Selector | Lines | Re-render Impact |
|----------|-------|------------------|
| currentBook | 1469 | Low - changes on book load |
| isPlayerVisible | 1470 | Low - changes on open/close |
| isPlaying | 1471 | Medium - changes on play/pause |
| isLoading | 1472 | Low - changes on load |
| isBuffering | 1473 | Medium - changes during streaming |
| duration | 1475 | Low - changes on book load |
| playbackRate | 1476 | Low - changes on speed change |
| chapters | 1477 | Low - changes on book load |
| bookmarks | 1474 | Low - changes on bookmark CRUD |
| sleepTimer | 1497-1503 | High - countdown every ~10 seconds |
| position | 1507-1510 | High - every second (floored) |
| skipForwardInterval | 1550 | Low - settings change |
| skipBackInterval | 1551 | Low - settings change |

**Actions Used:**
- closePlayer, play, pause
- setPlaybackRate, setSleepTimer, clearSleepTimer
- seekTo, nextChapter, prevChapter
- addBookmark, updateBookmark, removeBookmark

### 5.2 useThemeStore

| Selector | Lines | Purpose |
|----------|-------|---------|
| mode | 1583 | Determine dark/light theme |

### 5.3 useQueueStore

| Selector | Lines | Purpose |
|----------|-------|---------|
| clearQueue | 1563 | Clear queue action |
| queueCount | 1562 | Badge count |

### 5.4 Other Hooks

| Hook | Lines | Store/Source |
|------|-------|--------------|
| useCurrentChapterIndex | 1556 | Derived from playerStore |
| useCoverUrl | 1558 | API client |
| useIsOfflineAvailable | 1559 | Download manager |
| useDownloads | 1560 | Download manager |
| useDownloadStatus | 1561 | Download manager |
| useQueueCount | 1562 | Queue store |
| useNormalizedChapters | 1612 | Derived from chapters |
| useReducedMotion | 1579 | Accessibility |

---

## 6. Migration Path (Phases)

### Phase 1: Extract Utilities (Low Risk)
**Duration:** 1 session
**Files:**
1. Create `src/features/player/utils/timeFormatters.ts`
   - Move formatTime, formatTimeHHMMSS, formatTimeVerbose
2. Create `src/features/player/utils/playerTheme.ts`
   - Move playerColors object, usePlayerColors hook
3. Create `src/features/player/constants/playerConstants.ts`
   - Move SPEED_QUICK_OPTIONS, SLEEP_QUICK_OPTIONS, timeline constants
4. Update imports in CDPlayerScreen.tsx

**Test:** TypeScript compiles, player renders correctly

### Phase 2: Extract Simple Components (Low Risk)
**Duration:** 1 session
**Files:**
1. Create `src/features/player/components/CircularProgress.tsx`
2. Create `src/features/player/components/PlayerIcons.tsx`
   - MoonIcon, RewindIcon, FastForwardIcon, DownArrowIcon, SettingsIconCircle
3. Create `src/features/player/components/ChapterListItem.tsx`

**Test:** Player renders, icons display correctly

### Phase 3: Extract Sheets (Medium Risk)
**Duration:** 2 sessions
**Files:**
1. Create `src/features/player/components/sheets/ChaptersSheet.tsx`
2. Create `src/features/player/components/sheets/SettingsSheet.tsx`
3. Create `src/features/player/components/sheets/BookmarksSheet.tsx`
4. Create `src/features/player/hooks/usePlayerSheets.ts`

**Test:** All sheets open/close correctly, settings persist

### Phase 4: Extract Hooks (Medium Risk)
**Duration:** 2 sessions
**Files:**
1. Create `src/features/player/hooks/useContinuousSeeking.ts`
   - Move hold-to-scrub logic
2. Create `src/features/player/hooks/useBookmarkActions.ts`
   - Move bookmark CRUD with undo
3. Create `src/features/player/hooks/useTimelineTicks.ts`
   - Move tick generation & caching

**Test:** Seeking works, bookmarks work with undo, timeline renders

### Phase 5: Extract Timeline Components (High Risk)
**Duration:** 2 sessions
**Files:**
1. Move TimelineProgressBar to `src/features/player/components/timeline/`
2. Create `src/features/player/hooks/useChapterScrubGesture.ts`
3. Refactor ChapterTimelineProgressBar using extracted hook

**Test:** Both timeline modes work, scrubbing smooth, haptics fire

### Phase 6: Extract UI Components (Medium Risk)
**Duration:** 1 session
**Files:**
1. Create `src/features/player/components/PlayerCoverOverlay.tsx`
2. Create `src/features/player/components/PlayerMetadata.tsx`
3. Create `src/features/player/components/PlayerControlsBar.tsx`
4. Create `src/features/player/components/NoteInputModal.tsx`
5. Create `src/features/player/components/BookmarkToast.tsx`

**Test:** Full player UI renders correctly

### Phase 7: Final Composition (Low Risk)
**Duration:** 1 session
**Tasks:**
1. Simplify CDPlayerScreen to pure composition
2. Move remaining styles to component files
3. Create index.ts exports
4. Final cleanup and optimization

**Test:** Full regression test of all player functionality

---

## 7. Files Affected

### New Files to Create (21)
```
src/features/player/
├── components/
│   ├── CircularProgress.tsx
│   ├── PlayerIcons.tsx
│   ├── ChapterListItem.tsx
│   ├── PlayerCoverOverlay.tsx
│   ├── PlayerMetadata.tsx
│   ├── PlayerControlsBar.tsx
│   ├── NoteInputModal.tsx
│   ├── BookmarkToast.tsx
│   ├── timeline/
│   │   ├── TimelineProgressBar.tsx
│   │   ├── ChapterTimelineProgressBar.tsx
│   │   └── index.ts
│   └── sheets/
│       ├── ChaptersSheet.tsx
│       ├── SettingsSheet.tsx
│       ├── BookmarksSheet.tsx
│       └── index.ts
├── hooks/
│   ├── useTimelineTicks.ts
│   ├── useChapterScrubGesture.ts
│   ├── useContinuousSeeking.ts
│   ├── useBookmarkActions.ts
│   └── usePlayerSheets.ts
├── utils/
│   ├── playerTheme.ts
│   └── timeFormatters.ts
└── constants/
    └── playerConstants.ts
```

### Modified Files (1)
- `src/features/player/screens/CDPlayerScreen.tsx` - Simplified to composition

### Index Updates (3)
- `src/features/player/components/index.ts` - Export new components
- `src/features/player/hooks/index.ts` - Export new hooks
- `src/features/player/index.ts` - Update public exports

---

## 8. Risk Assessment

### High Risk Areas

| Area | Risk | Mitigation |
|------|------|------------|
| ChapterTimelineProgressBar gesture | Reanimated worklets, shared values, composed gestures | Test on both iOS/Android, profile FPS |
| Continuous seeking refs | Multiple refs with timing dependencies | Ensure cleanup on unmount, test edge cases |
| Sleep timer rendering | Coarse granularity optimization | Verify countdown display accuracy |
| Position updates | Floored equality selector | Test seeking UI responsiveness |

### Medium Risk Areas

| Area | Risk | Mitigation |
|------|------|------------|
| Sheet state management | Multiple sheet types, navigation between sheets | Test all sheet transitions |
| Bookmark undo | Timeout-based undo with refs | Test rapid delete/undo sequences |
| Theme switching | Dynamic color application | Test light/dark mode in all states |
| Android gesture capture | Pan responder vs Gesture Handler | Test swipe-to-close vs timeline scrub |

### Low Risk Areas

| Area | Risk | Mitigation |
|------|------|------------|
| Utility extraction | Pure functions, no side effects | Unit tests |
| Icon components | Static SVGs | Visual inspection |
| Style extraction | Just moving StyleSheet | Snapshot tests if available |

---

## 9. Test Criteria

### 9.1 Core Playback
- [ ] Play/pause works
- [ ] Skip forward/back works with configured intervals
- [ ] Hold to scrub accelerates (2s → 5s → 10s → 15s)
- [ ] Chapter navigation works (tap chapter in list, next/prev)
- [ ] Sleep timer countdown displays and pauses at end

### 9.2 Timeline (Book Mode)
- [ ] Progress bar shows correct position
- [ ] Chapter markers display at correct positions
- [ ] Bookmark flags render at correct times
- [ ] Pan gesture seeks smoothly
- [ ] Seek position updates immediately

### 9.3 Timeline (Chapter Mode)
- [ ] Long-press activates scrub mode with "DRAG TO SCRUB" tooltip
- [ ] Tooltip hides when dragging starts
- [ ] Vertical drag changes speed mode (0.1x, 0.25x, 0.5x, 1x, 2x)
- [ ] Speed mode indicator shows current mode
- [ ] Edge auto-scroll works near screen edges
- [ ] Haptic feedback fires on chapter crossings
- [ ] Haptic feedback fires on minute boundaries
- [ ] Timeline scrolls smoothly during scrub
- [ ] Tick windowing doesn't cause visual gaps
- [ ] Long books (10+ hours) render without crash

### 9.4 Sheets
- [ ] Chapters sheet opens and lists all chapters
- [ ] Current chapter highlighted in list
- [ ] Settings sheet shows current speed/sleep values
- [ ] Custom speed input accepts 0.1-4 range
- [ ] Custom sleep input accepts 1-720 minutes
- [ ] Progress mode toggle switches between book/chapter
- [ ] Bookmarks sheet shows all bookmarks
- [ ] Bookmark play button seeks to time
- [ ] Bookmark long-press opens note editor

### 9.5 Bookmarks
- [ ] Add bookmark creates bookmark at current position
- [ ] Bookmark pill popup animates in
- [ ] "Add Note" from pill opens note editor
- [ ] Note saves correctly
- [ ] Delete bookmark shows undo toast
- [ ] Undo restores bookmark
- [ ] Toast auto-dismisses after 5 seconds

### 9.6 Navigation
- [ ] Swipe down closes player (threshold: 100px or velocity 0.5)
- [ ] Swipe cancelled snaps back to full screen
- [ ] Tap title navigates to BookDetail
- [ ] Tap author navigates to AuthorDetail (ActionSheet if multiple)
- [ ] Tap narrator navigates to NarratorDetail
- [ ] Android back button closes sheet first, then player

### 9.7 Visual
- [ ] Dark mode renders correctly
- [ ] Light mode renders correctly
- [ ] Cover blur background displays
- [ ] Speed badge shows when not 1.0x
- [ ] Download status icons show correctly (check/progress/download)
- [ ] Buffering indicator shows when streaming
- [ ] Queue badge shows count

### 9.8 Performance
- [ ] FPS stays above 55 during normal playback
- [ ] FPS stays above 45 during timeline scrub
- [ ] No jank when opening/closing sheets
- [ ] Position updates don't cause excessive re-renders
- [ ] Long press doesn't block UI thread

---

## 10. Effort Estimate

| Phase | Effort | Cumulative |
|-------|--------|------------|
| Phase 1: Extract Utilities | 1 session | 1 session |
| Phase 2: Extract Simple Components | 1 session | 2 sessions |
| Phase 3: Extract Sheets | 2 sessions | 4 sessions |
| Phase 4: Extract Hooks | 2 sessions | 6 sessions |
| Phase 5: Extract Timeline Components | 2 sessions | 8 sessions |
| Phase 6: Extract UI Components | 1 session | 9 sessions |
| Phase 7: Final Composition | 1 session | 10 sessions |

**Total Estimated Effort:** 10 sessions (incremental, each phase leaves app working)

---

## 11. Rollback Plan

### Per-Phase Rollback
Each phase is designed to be independently revertible:

1. **Git Commits:** One commit per extracted component/hook
2. **Feature Flags:** Not needed - extraction is internal refactoring
3. **Incremental:** Each phase leaves app fully functional

### Full Rollback
```bash
git revert --no-commit HEAD~N  # Where N is number of refactor commits
git commit -m "revert: CDPlayerScreen refactor"
```

### Partial Rollback
If specific extraction causes issues:
1. Identify problematic component/hook
2. Inline the code back into CDPlayerScreen
3. Delete the extracted file
4. Update imports

### Smoke Test After Rollback
1. Open player
2. Play/pause
3. Seek via both timelines
4. Open each sheet type
5. Add/delete bookmark
6. Close player

---

## Summary

The CDPlayerScreen refactor will transform a 4,403-line monolithic file into a well-organized feature module with:
- **21 new files** created
- **Main screen reduced from 4,403 to ~600 lines**
- **Largest extracted component:** ChapterTimelineProgressBar (~300 lines)
- **7 phases** allowing incremental, safe migration
- **10 sessions** estimated effort

Key challenges:
1. Reanimated gesture handling must be carefully extracted
2. Store subscriptions are optimized and must maintain performance
3. Multiple ref-based systems (seeking, bookmarks) need careful cleanup

Benefits:
1. Individual components can be tested in isolation
2. Timeline components can be reused elsewhere
3. Easier to add new player features
4. Better code organization for onboarding
