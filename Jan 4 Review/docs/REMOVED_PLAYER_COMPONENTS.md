# Removed Player Components Documentation

This document describes the timeline progress bars and player controls that were removed from CDPlayerScreen.tsx on 2026-01-07 for replacement.

## Backup Location
`src/features/player/screens/CDPlayerScreen.backup2.tsx`

---

## 1. TimelineProgressBar (Book View)

**Purpose**: A simplified horizontal progress bar showing book progress with chapter-normalized positions.

### Key Features:
- **Chapter-normalized progress**: Each chapter takes equal visual width (1/numChapters)
- **Chapter-wide highlight**: Shows current chapter with semi-transparent highlight bar
- **Draggable marker**: Red circular marker that can be dragged to seek
- **Tap-to-seek**: Tap anywhere on timeline to jump to that position
- **Bookmark flags**: Blue flags showing bookmark positions
- **Adaptive tick density**: Major ticks at chapter boundaries, minor ticks based on space

### Props Interface:
```typescript
interface TimelineProgressBarProps {
  position: number;      // Current position in seconds
  duration: number;      // Total duration in seconds
  chapters: TimelineChapter[];  // { start, end, displayTitle }
  onSeek: (position: number) => void;
  bookmarks?: TimelineBookmark[];  // { id, time }
  libraryItemId?: string;
  onScrubStart?: (initialPosition: number) => void;
  onScrubUpdate?: (delta: number) => void;
  onScrubEnd?: () => void;
}
```

### Progress Calculation:
```typescript
// Each chapter takes equal width regardless of actual duration
const chapterWidth = 1 / chapters.length;
const normalizedProgress = (chapterIndex * chapterWidth) + (chapterProgress * chapterWidth);
```

### Gestures:
- **Pan gesture**: Drag marker, reports delta via callbacks
- **Tap gesture**: Jump to tapped position
- Combined with `Gesture.Race()`

### Visual Elements:
- Container: `TIMELINE_WIDTH` wide, height = marker radius * 2 + tick height
- Marker: Red circle with shadow, animated via Reanimated
- Ticks: SVG lines, major (10px) at chapter starts, minor (5px) in between
- Chapter highlight: Full chapter width at 30% opacity
- Progress fill: From chapter start to marker position

---

## 2. ChapterTimelineProgressBar (Chapter/Scrolling View)

**Purpose**: A time-based scrolling timeline with the current position fixed at center. Timeline scrolls left/right as playback progresses.

### Key Features:
- **Fixed center marker**: Red line/dot at screen center, timeline moves behind it
- **Time-based positioning**: Uses `PIXELS_PER_SECOND` for precise time mapping
- **Tick caching**: Pre-generates ticks and caches per book for performance
- **Tick windowing**: Only renders ticks within visible window (120 min total)
- **SVG viewport capping**: Prevents "bitmap too large" crash on Android
- **Fine scrub mode**: Drag down to slow scrub speed (0.1x to 2x)
- **Edge auto-scroll**: Drag to screen edge to accelerate scrolling
- **Snap-to-chapter**: Optional snap to chapter boundaries on release
- **Haptic feedback**: Vibration on chapter/minute crossings
- **Bookmark flags**: Blue flags within scrolling SVG

### Tick Hierarchy:
1. **Chapter ticks**: Tallest (80px), 2.5px wide, with chapter label
2. **10-minute ticks**: Medium (45px), with time label
3. **1-minute ticks**: Small (24px), with time label
4. **15-second ticks**: Smallest (11px), no label

### Scrub Speed Modes:
```typescript
// Based on vertical drag offset (dy)
if (dy > 120) → 0.1x (FINE)
if (dy > 80)  → 0.25x (QUARTER SPEED)
if (dy > 40)  → 0.5x (HALF SPEED)
if (dy < -40) → 2.0x (FAST)
else          → 1.0x (NORMAL)
```

### Constants:
```typescript
CHAPTER_MARKER_X = TIMELINE_WIDTH / 2;  // Fixed center position
PIXELS_PER_SECOND = TIMELINE_WIDTH / (MINUTES_PER_SCREEN * 60);
MINUTES_PER_SCREEN = 5;  // ~5 minutes visible at once
VISIBLE_WINDOW_SECONDS = 60 * 60;  // 60 min each direction
```

### Tick Generation:
- Ticks pre-generated on book load via `generateAndCacheTicks()`
- Stored in IndexedDB/SQLite via `tickCache.ts`
- Visible ticks filtered via `getVisibleTicks()` on each render

---

## 3. Player Controls Bar

**Purpose**: Bottom control bar with playback buttons.

### Layout (5 buttons):
```
[Prev Chapter] | [Skip Back] | [Play/Pause] | [Skip Forward] | [Next Chapter]
```

### Button Behavior:

#### Skip Back/Forward:
- **Tap**: Skip by interval (default 15s back, 30s forward)
- **Hold (300ms+)**: Continuous scrubbing with acceleration
  - First 1s: 2 sec/tick
  - 1-2s: 5 sec/tick
  - 2-4s: 10 sec/tick
  - 4s+: 15 sec/tick

#### Play/Pause:
- Shows play or pause icon based on state
- When sleep timer active: Shows timer countdown + small play/pause icon

#### Chapter Navigation:
- Previous chapter: Jump to start of current/previous chapter
- Next chapter: Jump to start of next chapter
- Uses `prevChapter()` and `nextChapter()` from playerStore

### Seeking Delta Indicator:
When seeking (button hold or timeline scrub), shows indicator above current time:
- Format: `+30s` or `-1:30` for larger values
- Dark semi-transparent background
- Uses theme accent color

### Styles:
```typescript
standardControlsBar: {
  position: 'absolute',
  bottom: 0,
  flexDirection: 'row',
  height: scale(72),
  backgroundColor: themeColors.buttonBackground,
}
standardControlButton: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
}
standardControlDivider: {
  width: 1,
  height: scale(32),
}
```

---

## 4. Related Hooks

### useContinuousSeeking
Provides hold-to-scrub functionality for skip buttons.

```typescript
interface UseContinuousSeekingReturn {
  handleRewindPressIn: () => void;
  handleFastForwardPressIn: () => void;
  handleSeekPressOut: () => void;
  handleSkipBackWithCheck: () => void;
  handleSkipForwardWithCheck: () => void;
  seekingState: {
    isActive: boolean;
    direction: 'back' | 'forward' | null;
    amount: number;
  };
}
```

### useTimelineHaptics
Provides haptic feedback during timeline scrubbing.
- Chapter boundary crossings
- Minute crossings
- Edge reached (start/end of book)
- Mode changes (enter/exit scrub)
- Snap feedback

---

## 5. Icon Components (in PlayerIcons.tsx)

```typescript
// Double-chevron icons for skip
RewindIcon      // <<
FastForwardIcon // >>

// Chapter navigation icons
PrevChapterIcon  // |<<
NextChapterIcon  // >>|

// Other player icons
MoonIcon, DownArrowIcon, BookmarkFlagIcon, SettingsIconCircle
```

---

## 6. Constants (from playerConstants.ts)

```typescript
// Timeline dimensions
TIMELINE_WIDTH = SCREEN_WIDTH - scale(44);
TIMELINE_HEIGHT = scale(32);
TIMELINE_MARKER_RADIUS = 8;
TIMELINE_MAJOR_TICK_HEIGHT = 10;
TIMELINE_MINOR_TICK_HEIGHT = 5;

// Chapter timeline
CHAPTER_MARKER_X = TIMELINE_WIDTH / 2;
CHAPTER_MARKER_CIRCLE_SIZE = scale(100);
CHAPTER_TICK_HEIGHT = scale(80);
TEN_MIN_TICK_HEIGHT = scale(45);
ONE_MIN_TICK_HEIGHT = scale(24);
FIFTEEN_SEC_TICK_HEIGHT = scale(11);
CHAPTER_TIMELINE_TOTAL_HEIGHT = scale(220);
PIXELS_PER_SECOND = TIMELINE_WIDTH / (5 * 60);  // 5 min per screen
```

---

## Notes for Replacement

1. The timeline components use Reanimated for smooth animations
2. Gesture handling via react-native-gesture-handler
3. SVG for tick rendering (react-native-svg)
4. Position updates throttled to 10fps during playback
5. Scrubbing pauses playback and resumes on release
6. Chapter-normalized mode treats all chapters as equal width visually
