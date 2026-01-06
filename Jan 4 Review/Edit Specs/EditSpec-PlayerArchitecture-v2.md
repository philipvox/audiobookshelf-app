# Edit Specification: Player Architecture (v2)

**Version:** 2 (post-validation)
**Changes from v1:** Defined StandardPlayerScreen with feature comparison table

**Covers Action Plan Items:** 1.2, 1.3, 2.16, 3.1, 3.9
**Priority:** Critical
**Effort:** L (Large) - 5-8 days combined

---

## Current State

### CDPlayerScreen.tsx
- **File:** `src/features/player/screens/CDPlayerScreen.tsx`
- **Lines:** 4,398 (largest file in codebase)
- **Contains inline:** Timeline, Transport controls, Chapter list, Bookmarks, Sleep timer, Speed sheet

### playerStore.ts
- **File:** `src/features/player/stores/playerStore.ts`
- **Lines:** 2,838 (second largest)
- **Critical feature:** `isSeeking` flag blocks position updates during scrubbing (DO NOT BREAK)

### StandardPlayerScreen
- **Status:** Does not exist (0% implementation)
- **Spec requirement:** Audible-style alternative player

---

## StandardPlayerScreen Definition

### Feature Comparison: CDPlayerScreen vs StandardPlayerScreen

| Feature | CDPlayerScreen | StandardPlayerScreen |
|---------|----------------|---------------------|
| **Timeline** | Chapter-normalized with markers | Linear progress bar |
| **Cover Art** | Spinning CD disc (large) | Static cover (large) |
| **Chapter Navigation** | Visual ticks + chapter sheet | Simple prev/next buttons |
| **Bookmark Markers** | Visible on timeline | Hidden (sheet only) |
| **Seek Gesture** | Long-press pan on timeline | Tap + drag scrubber |
| **Skip Controls** | Configurable (rewind/chapter) | Fixed 30s skip |
| **Complexity** | High (power users) | Low (casual listeners) |
| **Animation** | Disc spin, timeline effects | Minimal |

### StandardPlayerScreen Target Design

```
┌─────────────────────────────────────┐
│  ← Back                    ⋮ More   │  Header
├─────────────────────────────────────┤
│                                     │
│         ┌─────────────────┐         │
│         │                 │         │
│         │   Book Cover    │         │  40% height
│         │     (static)    │         │
│         │                 │         │
│         └─────────────────┘         │
│                                     │
│         Book Title                  │
│         by Author Name              │  Metadata
│         Narrator: Name              │
│                                     │
│  ──●───────────────────────────  │  Linear scrubber
│  1:30:45              3:45:00       │  Time display
│                                     │
│      ⏪30   ▶️/⏸️   30⏩           │  Transport
│                                     │
│   🌙 Sleep    ⚡ 1.0x    📋 Queue   │  Quick actions
│                                     │
└─────────────────────────────────────┘
```

### When to Use Each Player

| Use Case | Recommended Player |
|----------|-------------------|
| Focused listening session | CDPlayerScreen |
| Background listening | StandardPlayerScreen |
| Navigating chapters frequently | CDPlayerScreen |
| Simple play/pause | StandardPlayerScreen |
| Visual feedback lover | CDPlayerScreen |
| Minimal UI preference | StandardPlayerScreen |

### User Preference Storage

```typescript
// In playerStore or settingsStore
preferredPlayerType: 'cd' | 'standard';
setPreferredPlayerType: (type: 'cd' | 'standard') => void;
```

---

## Specific Changes

### 1.2: Create StandardPlayerScreen

**New file:** `src/features/player/screens/StandardPlayerScreen.tsx`

```typescript
import React, { useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, MoreVertical, Moon, Gauge, List } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { usePlayerStore } from '../stores/playerStore';
import { useNavigation } from '@react-navigation/native';
import { getBookMetadata } from '@/shared/utils/bookMetadata';
import { formatTime } from '@/shared/utils/time';
import { scale, spacing, colors, radius } from '@/shared/theme';

export const StandardPlayerScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const {
    currentBook,
    position,
    duration,
    isPlaying,
    playbackRate,
    sleepTimer,
    play,
    pause,
    seekTo,
  } = usePlayerStore();

  const { title, authorName, narratorName } = getBookMetadata(currentBook);
  const coverUrl = currentBook?.media?.coverPath
    ? getCoverUrl(currentBook.id, currentBook.media.coverPath)
    : null;

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const handleSkip = useCallback((seconds: number) => {
    const newPosition = Math.max(0, Math.min(duration, position + seconds));
    seekTo(newPosition);
  }, [position, duration, seekTo]);

  const handleSliderChange = useCallback((value: number) => {
    seekTo(value);
  }, [seekTo]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <ChevronLeft size={scale(28)} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
        <TouchableOpacity style={styles.headerButton}>
          <MoreVertical size={scale(24)} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Cover Art */}
      <View style={styles.coverContainer}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]} />
        )}
      </View>

      {/* Metadata */}
      <View style={styles.metadata}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <Text style={styles.author}>by {authorName}</Text>
        {narratorName && (
          <Text style={styles.narrator}>Narrated by {narratorName}</Text>
        )}
      </View>

      {/* Progress Slider */}
      <View style={styles.progressContainer}>
        <Slider
          style={styles.slider}
          value={position}
          minimumValue={0}
          maximumValue={duration}
          onSlidingComplete={handleSliderChange}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor={colors.backgroundTertiary}
          thumbTintColor={colors.accent}
        />
        <View style={styles.timeRow}>
          <Text style={styles.time}>{formatTime(position)}</Text>
          <Text style={styles.time}>{formatTime(duration)}</Text>
        </View>
      </View>

      {/* Transport Controls */}
      <View style={styles.transport}>
        <TouchableOpacity onPress={() => handleSkip(-30)} style={styles.skipButton}>
          <Text style={styles.skipText}>30</Text>
          <ChevronLeft size={scale(24)} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity onPress={handlePlayPause} style={styles.playButton}>
          {isPlaying ? (
            <Pause size={scale(32)} color="#000" fill="#000" />
          ) : (
            <Play size={scale(32)} color="#000" fill="#000" />
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleSkip(30)} style={styles.skipButton}>
          <ChevronRight size={scale(24)} color={colors.textPrimary} />
          <Text style={styles.skipText}>30</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickAction}>
          <Moon size={scale(20)} color={colors.textSecondary} />
          <Text style={styles.quickActionText}>
            {sleepTimer ? formatTimeRemaining(sleepTimer) : 'Sleep'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickAction}>
          <Gauge size={scale(20)} color={colors.textSecondary} />
          <Text style={styles.quickActionText}>{playbackRate}x</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickAction}>
          <List size={scale(20)} color={colors.textSecondary} />
          <Text style={styles.quickActionText}>Queue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: scale(56),
  },
  headerButton: {
    padding: spacing.sm,
  },
  headerSpacer: {
    flex: 1,
  },
  coverContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  cover: {
    width: scale(280),
    height: scale(280),
    borderRadius: radius.lg,
  },
  coverPlaceholder: {
    backgroundColor: colors.backgroundSecondary,
  },
  metadata: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.xs,
  },
  title: {
    fontSize: scale(20),
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  author: {
    fontSize: scale(16),
    color: colors.textSecondary,
  },
  narrator: {
    fontSize: scale(14),
    color: colors.textTertiary,
  },
  progressContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  slider: {
    width: '100%',
    height: scale(40),
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: {
    fontSize: scale(12),
    color: colors.textTertiary,
  },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.xl,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skipText: {
    fontSize: scale(12),
    color: colors.textPrimary,
  },
  playButton: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingTop: spacing.lg,
  },
  quickAction: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  quickActionText: {
    fontSize: scale(12),
    color: colors.textSecondary,
  },
});
```

### Navigation: Switching Between Players

**Update AppNavigator.tsx:**
```typescript
// Add setting for preferred player
const { preferredPlayerType } = usePlayerStore();

// Player screen with dynamic component
<Stack.Screen
  name="Player"
  component={preferredPlayerType === 'standard' ? StandardPlayerScreen : CDPlayerScreen}
/>

// Or use single screen with internal switch
<Stack.Screen name="Player" component={PlayerScreen} />

// PlayerScreen.tsx
const PlayerScreen: React.FC = () => {
  const { preferredPlayerType } = usePlayerStore();
  return preferredPlayerType === 'standard'
    ? <StandardPlayerScreen />
    : <CDPlayerScreen />;
};
```

---

## CDPlayerScreen Extraction (1.3)

*[Original extraction plan remains the same]*

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
│   └── LinearProgressBar.tsx     (NEW for StandardPlayer)
└── hooks/
    ├── usePlayerGestures.ts      (~200 lines)
    └── useTimelineInteraction.ts (~150 lines)
```

---

## playerStore Split (2.16)

**CRITICAL:** Preserve `isSeeking` behavior exactly. This is flagged as "working well" in [30].

Split into domain stores:
```
src/features/player/stores/
├── playerStore.ts        (~800 lines - core playback + isSeeking)
├── chapterStore.ts       (~400 lines)
├── bookmarksStore.ts     (~300 lines)
├── sleepTimerStore.ts    (~200 lines)
├── speedStore.ts         (~150 lines)
└── playerUIStore.ts      (~200 lines - visibility, sheets, preferredPlayerType)
```

---

## Testing Criteria

### StandardPlayerScreen
- [ ] Linear progress bar shows correct position
- [ ] Slider drag updates position
- [ ] 30s skip forward/backward works
- [ ] Play/pause toggles correctly
- [ ] Quick actions (sleep, speed, queue) are tappable
- [ ] Back navigation works
- [ ] Cover art displays correctly

### Player Switching
- [ ] User can select preferred player in settings
- [ ] Player preference persists across app restarts
- [ ] Both players share same playback state

### CDPlayerScreen Extraction
- [ ] All existing functionality works identically
- [ ] Timeline scrubbing works without jitter
- [ ] **CRITICAL: Seeking mode blocks position updates**

---

## Effort Breakdown

| Task | Effort | Risk |
|------|--------|------|
| Create StandardPlayerScreen | 6-8 hours | Medium |
| Add player switching logic | 2 hours | Low |
| Extract CDPlayerScreen components | 16-24 hours | Medium |
| Split playerStore | 12-18 hours | High |
| Performance optimization | 4-6 hours | Low |
| Testing & fixes | 8-12 hours | - |

**Total: 5-8 days**
