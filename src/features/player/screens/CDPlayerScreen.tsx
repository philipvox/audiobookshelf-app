/**
 * src/features/player/screens/CDPlayerScreen.tsx
 *
 * Full-screen audiobook player with cover art and timeline controls.
 * Features scrolling chapter timeline, book progress view, and
 * modern glass-morphic UI with light/dark theme support.
 */

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  PanResponder,
  ScrollView,
  UIManager,
  Platform,
  InteractionManager,
  TextInput,
  Keyboard,
  Dimensions,
  BackHandler,
  ActionSheetIOS,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Path, Circle, Line, Rect, Text as SvgText } from 'react-native-svg';

import ReanimatedAnimated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  X,
  Volume2,
  Check,
  CheckCircle,
  Cloud,
  Download,
  Play,
  Layers,
  Hourglass,
  Bookmark,
  Settings,
  Trash2,
  Moon,
  Gauge,
  ArrowDown,
  Clock,
  List,
} from 'lucide-react-native';
import { useShallow } from 'zustand/react/shallow';
import { useNavigation } from '@react-navigation/native';

import { usePlayerStore, useCurrentChapterIndex } from '../stores/playerStore';
import { useSnapToChapterSettings } from '../stores/settingsStore';
import { SleepTimerSheet, SpeedSheet } from '../sheets';
import { QueuePanel } from '@/features/queue/components/QueuePanel';
import { useQueueCount, useQueueStore } from '@/features/queue/stores/queueStore';
import { useReducedMotion } from 'react-native-reanimated';
import { useCoverUrl } from '@/core/cache';
import { apiClient } from '@/core/api';
import { useIsOfflineAvailable, useDownloads, useDownloadStatus } from '@/core/hooks/useDownloads';
import { useRenderTracker, useLifecycleTracker } from '@/utils/perfDebug';
import { useFpsMonitor, fpsMonitor } from '@/utils/runtimeMonitor';
import { useNormalizedChapters } from '@/shared/hooks';
// CoverPlayButton removed - using long-press + pan on timeline instead
import { haptics } from '@/core/native/haptics';
import { useTimelineHaptics, Chapter as HapticChapter } from '../hooks/useTimelineHaptics';
import { useContinuousSeeking } from '../hooks/useContinuousSeeking';
import { useBookmarkActions } from '../hooks/useBookmarkActions';
import { getCachedTicks, generateAndCacheTicks, TimelineTick, ChapterInput } from '../services/tickCache';
import { getVisibleTicks } from '../utils/tickGenerator';
import { audioService } from '../services/audioService';
import { colors, spacing, radius, scale, wp, hp, layout, typography, fontSize, fontWeight } from '@/shared/theme';
import { useThemeStore } from '@/shared/theme/themeStore';
import { logger } from '@/shared/utils/logger';
import { useToast } from '@/shared/hooks/useToast';
import { useScreenLoadTime } from '@/core/hooks/useScreenLoadTime';

// Extracted utilities
import { formatTime, formatTimeHHMMSS, formatTimeVerbose, formatSleepCountdown } from '../utils/timeFormatters';
import { usePlayerColors } from '../utils/playerTheme';
// Extracted components
import { CircularProgress } from '../components/CircularProgress';
import {
  MoonIcon,
  RewindIcon,
  FastForwardIcon,
  DownArrowIcon,
  BookmarkFlagIcon,
  SettingsIconCircle,
  PrevChapterIcon,
  NextChapterIcon,
} from '../components/PlayerIcons';
import { ChapterListItem } from '../components/ChapterListItem';
import { ChaptersSheet, SettingsSheet, BookmarksSheet, type Bookmark as BookmarkType } from '../components/sheets';
import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  COVER_SIZE,
  ACCENT_COLOR,
  SPEED_QUICK_OPTIONS,
  SLEEP_QUICK_OPTIONS,
  TIMELINE_WIDTH,
  TIMELINE_MARKER_RADIUS,
  TIMELINE_MAJOR_TICK_HEIGHT,
  TIMELINE_MINOR_TICK_HEIGHT,
  CHAPTER_MARKER_X,
  CHAPTER_MARKER_CIRCLE_SIZE,
  CHAPTER_TICK_HEIGHT,
  TEN_MIN_TICK_HEIGHT,
  ONE_MIN_TICK_HEIGHT,
  FIFTEEN_SEC_TICK_HEIGHT,
  CHAPTER_LABEL_Y,
  MINUTES_PER_SCREEN,
  PIXELS_PER_SECOND,
  CHAPTER_TIMELINE_TOTAL_HEIGHT,
  CHAPTER_TICKS_AREA_HEIGHT,
  CHAPTER_MARKER_LINE_HEIGHT,
  EDGE_ZONE,
  SPEED_MODE_LABELS,
} from '../constants/playerConstants';

// =============================================================================
// TYPES
// =============================================================================

type SheetType = 'none' | 'chapters' | 'settings' | 'queue' | 'sleep' | 'speed' | 'bookmarks';
type ProgressMode = 'chapter' | 'book';

interface TimelineChapter {
  start: number;
  end: number;
  displayTitle?: string;
}

// =============================================================================
// SIMPLE PROGRESS BAR (New Design - 2026-01-07)
// =============================================================================

interface SimpleProgressBarProps {
  /** Position within the current scope (chapter or book) in seconds */
  position: number;
  /** Duration of the current scope (chapter or book) in seconds */
  duration: number;
  /** Called with the new position within scope when user seeks */
  onSeek: (position: number) => void;
  /** Accent color for the progress bar and marker */
  accentColor?: string;
  /** Track background color */
  trackColor?: string;
  /** Track border color */
  borderColor?: string;
  /** Time label text color */
  timeLabelColor?: string;
  /** Called when scrubbing starts */
  onScrubStart?: () => void;
  /** Called with delta in seconds and progress (0-1) during scrubbing */
  onScrubUpdate?: (delta: number, progress: number) => void;
  /** Called when scrubbing ends */
  onScrubEnd?: () => void;
  /** Called when the chapter label (startTimeLabel) is pressed */
  onChapterPress?: () => void;
}

// Floating widget progress bar design
const PROGRESS_BAR_HEIGHT = scale(20);
const PROGRESS_MARKER_SIZE = scale(24); // Larger marker
const PROGRESS_STEM_HEIGHT = scale(6); // Shorter stem
const FLOATING_WIDGET_MARGIN = scale(20); // Gap from bottom of screen
const FLOATING_WIDGET_RADIUS = scale(10); // Subtle rounded corners

const SimpleProgressBar = React.memo(({
  position,
  duration,
  onSeek,
  accentColor = '#F50101',
  trackColor = '#E0E0E0',
  borderColor = 'rgba(255,255,255,0.2)',
  timeLabelColor = '#FFFFFF',
  startTimeLabel,
  endTimeLabel,
  onScrubStart,
  onScrubUpdate,
  onScrubEnd,
  onChapterPress,
}: SimpleProgressBarProps & { startTimeLabel?: string; endTimeLabel?: string; onChapterPress?: () => void }) => {
  const progress = duration > 0 ? Math.min(1, Math.max(0, position / duration)) : 0;
  const markerPosition = useSharedValue(progress);
  const isDragging = useSharedValue(false);
  const startPositionRef = useRef(0); // Track starting position for delta
  const barWidth = useRef(SCREEN_WIDTH); // Full width

  // Update marker when position changes (but not while dragging)
  // Use withTiming for smooth animation between whole-second updates
  useEffect(() => {
    if (!isDragging.value) {
      markerPosition.value = withTiming(progress, { duration: 300 });
    }
  }, [progress]);

  const handleSeek = useCallback((normalizedProgress: number) => {
    const clampedProgress = Math.max(0, Math.min(1, normalizedProgress));
    const newPosition = clampedProgress * duration;
    onSeek(newPosition);
  }, [duration, onSeek]);

  const handleScrubStart = useCallback(() => {
    startPositionRef.current = position;
    onScrubStart?.();
  }, [position, onScrubStart]);

  const handleScrubUpdate = useCallback((normalizedProgress: number) => {
    const currentPos = normalizedProgress * duration;
    const delta = currentPos - startPositionRef.current;
    onScrubUpdate?.(delta, normalizedProgress);
  }, [duration, onScrubUpdate]);

  const handleScrubEnd = useCallback(() => {
    onScrubEnd?.();
  }, [onScrubEnd]);

  // Pan gesture for scrubbing - works on marker and track
  const panGesture = Gesture.Pan()
    .onStart((event) => {
      'worklet';
      isDragging.value = true;
      // Update marker to where user touched
      const newProgress = Math.max(0, Math.min(1, event.x / barWidth.current));
      markerPosition.value = newProgress;
      runOnJS(handleScrubStart)();
    })
    .onUpdate((event) => {
      'worklet';
      const newProgress = Math.max(0, Math.min(1, event.x / barWidth.current));
      markerPosition.value = newProgress;
      runOnJS(handleScrubUpdate)(newProgress);
    })
    .onEnd((event) => {
      'worklet';
      isDragging.value = false;
      const finalProgress = Math.max(0, Math.min(1, event.x / barWidth.current));
      runOnJS(handleSeek)(finalProgress);
      runOnJS(handleScrubEnd)();
    });

  // Tap gesture for seeking
  const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      'worklet';
      const newProgress = Math.max(0, Math.min(1, event.x / barWidth.current));
      markerPosition.value = newProgress;
      runOnJS(handleSeek)(newProgress);
    });

  const combinedGesture = Gesture.Race(panGesture, tapGesture);

  const fillStyle = useAnimatedStyle(() => ({
    width: markerPosition.value * barWidth.current,
  }));

  const onLayout = useCallback((event: any) => {
    barWidth.current = event.nativeEvent.layout.width;
  }, []);

  const hasLabels = startTimeLabel || endTimeLabel;

  return (
    <GestureDetector gesture={combinedGesture}>
      <View style={[progressBarStyles.gestureContainer, !hasLabels && { height: PROGRESS_BAR_HEIGHT }]} onLayout={onLayout}>
        {/* Time labels - only show if provided */}
        {hasLabels && (
          <View style={progressBarStyles.timeRow}>
            {onChapterPress ? (
              <TouchableOpacity onPress={onChapterPress} activeOpacity={0.7}>
                <Text style={[progressBarStyles.timeLabel, { color: timeLabelColor }]} numberOfLines={1}>{startTimeLabel}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={[progressBarStyles.timeLabel, { color: timeLabelColor }]}>{startTimeLabel}</Text>
            )}
            <Text style={[progressBarStyles.timeLabel, { color: timeLabelColor }]}>{endTimeLabel}</Text>
          </View>
        )}

        {/* Track */}
        <View style={[progressBarStyles.track, { backgroundColor: trackColor, borderColor }]}>
          <View style={progressBarStyles.trackClip}>
            <ReanimatedAnimated.View
              style={[progressBarStyles.fill, { backgroundColor: accentColor }, fillStyle]}
            />
          </View>
        </View>
      </View>
    </GestureDetector>
  );
});

const TIME_ROW_HEIGHT = scale(24);
const MARKER_AREA_HEIGHT = 0; // Time labels now shown above, not in progress bar

const progressBarStyles = StyleSheet.create({
  // Gesture container covers time row + track
  gestureContainer: {
    width: '100%',
    height: MARKER_AREA_HEIGHT + PROGRESS_BAR_HEIGHT,
  },
  timeRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    height: TIME_ROW_HEIGHT,
    alignItems: 'center',
  },
  timeLabel: {
    color: '#FFFFFF',
    fontSize: scale(14),
    fontWeight: '600',
    marginBottom: 10,
  },
  // Track at the bottom of the gesture container - top corners rounded, top border only
  track: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: PROGRESS_BAR_HEIGHT,
    borderTopLeftRadius: FLOATING_WIDGET_RADIUS,
    borderTopRightRadius: FLOATING_WIDGET_RADIUS,
    borderTopWidth: 1,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  // Inner clip view to ensure fill respects rounded corners on Android
  trackClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: FLOATING_WIDGET_RADIUS,
    borderTopRightRadius: FLOATING_WIDGET_RADIUS,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    height: '100%',
    // Apply left border radius directly to fill - Android doesn't clip with overflow:hidden properly
    borderTopLeftRadius: FLOATING_WIDGET_RADIUS,
  },
});

// =============================================================================
// PLAYER CONTROL BAR (New Design - 2026-01-07)
// =============================================================================

interface PlayerControlBarProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onRewindPressIn?: () => void;
  onFastForwardPressIn?: () => void;
  onSeekPressOut?: () => void;
  accentColor?: string;
  backgroundColor?: string;
  iconColor?: string;
  dividerColor?: string;
  bottomInset?: number;
}

const CONTROL_BAR_HEIGHT = scale(72);
const CONTROL_ICON_SIZE = scale(32);
const PLAY_ICON_SIZE = scale(40);

// Icon components for control bar
const PrevChapterControlIcon = ({ color }: { color: string }) => (
  <Svg width={CONTROL_ICON_SIZE} height={CONTROL_ICON_SIZE} viewBox="0 0 24 24" fill="none">
    <Rect x="4" y="5" width="3" height="14" fill={color} />
    <Path d="M19 5L9 12L19 19V5Z" fill={color} />
  </Svg>
);

const RewindControlIcon = ({ color }: { color: string }) => (
  <Svg width={CONTROL_ICON_SIZE} height={CONTROL_ICON_SIZE} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5L2 12L12 19V5Z" fill={color} />
    <Path d="M22 5L12 12L22 19V5Z" fill={color} />
  </Svg>
);

const FastForwardControlIcon = ({ color }: { color: string }) => (
  <Svg width={CONTROL_ICON_SIZE} height={CONTROL_ICON_SIZE} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5L22 12L12 19V5Z" fill={color} />
    <Path d="M2 5L12 12L2 19V5Z" fill={color} />
  </Svg>
);

const NextChapterControlIcon = ({ color }: { color: string }) => (
  <Svg width={CONTROL_ICON_SIZE} height={CONTROL_ICON_SIZE} viewBox="0 0 24 24" fill="none">
    <Path d="M5 5L15 12L5 19V5Z" fill={color} />
    <Rect x="17" y="5" width="3" height="14" fill={color} />
  </Svg>
);

const PlayControlIcon = ({ color }: { color: string }) => (
  <Svg width={PLAY_ICON_SIZE} height={PLAY_ICON_SIZE} viewBox="0 0 24 24" fill="none">
    <Path d="M8 5V19L19 12L8 5Z" fill={color} />
  </Svg>
);

const PauseControlIcon = ({ color }: { color: string }) => (
  <Svg width={PLAY_ICON_SIZE} height={PLAY_ICON_SIZE} viewBox="0 0 24 24" fill="none">
    <Rect x="6" y="5" width="4" height="14" fill={color} />
    <Rect x="14" y="5" width="4" height="14" fill={color} />
  </Svg>
);

const PlayerControlBar = React.memo(({
  isPlaying,
  onPlayPause,
  onSkipBack,
  onSkipForward,
  onPrevChapter,
  onNextChapter,
  onRewindPressIn,
  onFastForwardPressIn,
  onSeekPressOut,
  accentColor = '#F50101',
  backgroundColor = '#000000',
  iconColor = '#FFFFFF',
  dividerColor = 'rgba(255,255,255,0.2)',
  bottomInset = 0,
}: PlayerControlBarProps) => {
  return (
    <View style={[controlBarStyles.container, { height: CONTROL_BAR_HEIGHT + bottomInset, backgroundColor }]}>
      {/* Previous Chapter - rounded bottom-left corner */}
      <TouchableOpacity
        style={[
          controlBarStyles.navButton,
          { paddingBottom: bottomInset, borderBottomLeftRadius: FLOATING_WIDGET_RADIUS }
        ]}
        onPress={onPrevChapter}
        activeOpacity={0.7}
        accessibilityLabel="Previous chapter"
      >
        <PrevChapterControlIcon color={iconColor} />
      </TouchableOpacity>

      <View style={[controlBarStyles.divider, { backgroundColor: dividerColor }]} />

      {/* Rewind */}
      <TouchableOpacity
        style={[controlBarStyles.navButton, { paddingBottom: bottomInset }]}
        onPress={onSkipBack}
        onPressIn={onRewindPressIn}
        onPressOut={onSeekPressOut}
        activeOpacity={0.7}
        accessibilityLabel="Skip back"
      >
        <RewindControlIcon color={iconColor} />
      </TouchableOpacity>

      <View style={[controlBarStyles.divider, { backgroundColor: dividerColor }]} />

      {/* Fast Forward */}
      <TouchableOpacity
        style={[controlBarStyles.navButton, { paddingBottom: bottomInset }]}
        onPress={onSkipForward}
        onPressIn={onFastForwardPressIn}
        onPressOut={onSeekPressOut}
        activeOpacity={0.7}
        accessibilityLabel="Skip forward"
      >
        <FastForwardControlIcon color={iconColor} />
      </TouchableOpacity>

      <View style={[controlBarStyles.divider, { backgroundColor: dividerColor }]} />

      {/* Next Chapter */}
      <TouchableOpacity
        style={[controlBarStyles.navButton, { paddingBottom: bottomInset }]}
        onPress={onNextChapter}
        activeOpacity={0.7}
        accessibilityLabel="Next chapter"
      >
        <NextChapterControlIcon color={iconColor} />
      </TouchableOpacity>

      <View style={[controlBarStyles.divider, { backgroundColor: dividerColor }]} />

      {/* Play/Pause - rounded bottom-right corner, accent colored */}
      <TouchableOpacity
        style={[
          controlBarStyles.navButton,
          {
            backgroundColor: accentColor,
            paddingBottom: bottomInset,
            borderBottomRightRadius: FLOATING_WIDGET_RADIUS,
          }
        ]}
        onPress={onPlayPause}
        activeOpacity={0.8}
        accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <PauseControlIcon color="#FFFFFF" />
        ) : (
          <PlayControlIcon color="#FFFFFF" />
        )}
      </TouchableOpacity>
    </View>
  );
});

const controlBarStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: CONTROL_BAR_HEIGHT,
  },
  divider: {
    width: 1,
    alignSelf: 'center',
    height: scale(32),
  },
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CDPlayerScreen() {
  useScreenLoadTime('CDPlayerScreen');

  // Performance tracking (dev only)
  if (__DEV__) {
    useRenderTracker('CDPlayerScreen');
    useLifecycleTracker('CDPlayerScreen');
  }

  // FPS monitoring for the full player screen
  useFpsMonitor('fullPlayer');

  const insets = useSafeAreaInsets();

  // Memoize insets-based styles to avoid inline object recreation
  const safeAreaStyles = useMemo(() => ({
    topSpacer: { height: insets.top },
    bottomSpacer: { height: insets.bottom },
  }), [insets.top, insets.bottom]);

  const navigation = useNavigation<any>();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const wasVisibleRef = useRef(false); // Track previous visibility to prevent stutter

  // Store state
  const {
    currentBook,
    isPlayerVisible,
    isPlaying,
    isLoading,
    isBuffering,
    duration,
    playbackRate,
    chapters,
    bookmarks,
  } = usePlayerStore(
    useShallow((s) => ({
      currentBook: s.currentBook,
      isPlayerVisible: s.isPlayerVisible,
      isPlaying: s.isPlaying,
      isLoading: s.isLoading,
      isBuffering: s.isBuffering,
      bookmarks: s.bookmarks,
      // NOTE: position removed - causes excessive re-renders (2x/sec)
      // Use usePlaybackPosition() hook below for position-dependent UI
      duration: s.duration,
      playbackRate: s.playbackRate,
      // NOTE: sleepTimer moved to separate subscription below to reduce re-renders
      chapters: s.chapters,
    }))
  );

  // Sleep timer - separate subscription with coarse granularity
  // Only re-render when displayed value changes (every ~10 seconds or minute boundary)
  const sleepTimer = usePlayerStore((s) => {
    if (!s.sleepTimer) return null;
    // For timers > 5 minutes, round to nearest minute to reduce re-renders
    if (s.sleepTimer > 300) return Math.ceil(s.sleepTimer / 60) * 60;
    // For timers <= 5 minutes, round to nearest 10 seconds for countdown display
    return Math.ceil(s.sleepTimer / 10) * 10;
  });

  // Position-dependent state - optimized to only trigger re-render on whole-second changes
  // This dramatically reduces re-renders from ~2/sec to ~1/sec during playback
  // Math.floor ensures we only re-render when the floored value changes
  const position = usePlayerStore(
    (s) => Math.floor(s.isSeeking ? s.seekPosition : s.position)
  );

  // Formatted position string - recalculates only when position changes (already floored)
  const formattedPosition = useMemo(
    () => formatTimeHHMMSS(position),
    [position]
  );
  const formattedDuration = useMemo(
    () => formatTimeHHMMSS(duration),
    [duration]
  );

  // Actions - batched into single subscription for efficiency
  const {
    closePlayer,
    play,
    pause,
    setPlaybackRate,
    setSleepTimer,
    clearSleepTimer,
    seekTo,
    nextChapter,
    prevChapter,
    addBookmark,
  } = usePlayerStore(
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

  // Skip interval settings (separate - have default value logic)
  const skipForwardInterval = usePlayerStore((s) => s.skipForwardInterval ?? 30);
  const skipBackInterval = usePlayerStore((s) => s.skipBackInterval ?? 15);

  // NOTE: sleepTimerState hook removed - was unused and could cause re-renders during countdown
  // sleepTimer is already available from the main useShallow selector above

  const chapterIndex = useCurrentChapterIndex();
  // NOTE: bookProgress removed - was unused and caused extra re-renders on every position tick
  const coverUrl = useCoverUrl(currentBook?.id || '');
  const backgroundCoverUrl = useCoverUrl(currentBook?.id || '', { width: 1200 });
  const { isAvailable: isDownloaded } = useIsOfflineAvailable(currentBook?.id || '');
  const { queueDownload } = useDownloads();
  const { isDownloading, progress: downloadProgress } = useDownloadStatus(currentBook?.id || '');
  const queueCount = useQueueCount();
  const clearQueue = useQueueStore((s) => s.clearQueue);
  const { showError } = useToast();

  // Handle starting download for current book
  const handleStartDownload = useCallback(async () => {
    if (!currentBook || isDownloaded) return;
    try {
      await queueDownload(currentBook);
      haptics.success();
    } catch (err) {
      logger.warn('[CDPlayerScreen] Failed to start download:', err);
      showError('Failed to start download. Please try again.');
    }
  }, [currentBook, isDownloaded, queueDownload]);

  // Accessibility: respect reduced motion preference
  const reducedMotion = useReducedMotion();

  // Theme colors
  const themeColors = usePlayerColors();
  const isDarkMode = useThemeStore((s) => s.mode === 'dark');

  // Local state
  const [activeSheet, setActiveSheet] = useState<SheetType>('none');
  const [progressMode, setProgressMode] = useState<ProgressMode>('chapter');

  // Deferred initialization - wait for navigation animation to complete
  // This improves perceived performance by not blocking the initial render
  const [interactionsReady, setInteractionsReady] = useState(false);
  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      setInteractionsReady(true);
    });
    return () => handle.cancel();
  }, []);

  // Book metadata
  const metadata = currentBook?.media?.metadata as any;
  const title = metadata?.title || 'Unknown Title';
  const author = metadata?.authorName || metadata?.authors?.[0]?.name || 'Unknown Author';
  const description = metadata?.description || '';
  // Narrator: try narratorName, then narrators array
  const narrator = metadata?.narratorName ||
    (metadata?.narrators?.length > 0
      ? metadata.narrators.map((n: any) => typeof n === 'string' ? n : n.name).filter(Boolean).join(', ')
      : '');

  // Series info - try series array first (expanded), then seriesName string (same as BookDetailScreen)
  const series = metadata?.series?.[0] || metadata?.seriesName || null;
  const seriesName = typeof series === 'string' ? series : series?.name || '';
  const seriesSequence = metadata?.series?.[0]?.sequence || null;

  // Format duration as "Xh Ym" (e.g., "28h 40m")
  const formattedTotalDuration = useMemo(() => {
    if (!duration || duration <= 0) return '';
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  }, [duration]);

  // Chapter count
  const chapterCount = chapters.length;

  // Dynamic title font size and lines - shorter titles get bigger fonts
  const { titleFontSize, titleLines } = useMemo(() => {
    const len = title.length;
    if (len <= 12) return { titleFontSize: scale(42), titleLines: 1 };
    if (len <= 18) return { titleFontSize: scale(38), titleLines: 1 };
    if (len <= 25) return { titleFontSize: scale(34), titleLines: 1 };
    if (len <= 35) return { titleFontSize: scale(30), titleLines: 2 };
    return { titleFontSize: scale(26), titleLines: 2 };
  }, [title]);

  const currentChapter = chapters[chapterIndex];

  // Get normalized chapter names based on user settings
  const normalizedChapters = useNormalizedChapters(chapters, { bookTitle: title });
  const currentNormalizedChapter = normalizedChapters[chapterIndex];

  // Chapters with display titles for timeline
  const timelineChapters: TimelineChapter[] = useMemo(() => {
    return chapters.map((ch, index) => ({
      start: ch.start,
      end: ch.end,
      displayTitle: normalizedChapters[index]?.displayTitle,
    }));
  }, [chapters, normalizedChapters]);

  // Format sleep timer display - live countdown with seconds
  const formatSleepTimer = (seconds: number | null): string => {
    if (!seconds || seconds <= 0) return 'Off';

    // For timers > 1 hour, show hours and minutes
    if (seconds >= 3600) {
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
    }

    // For timers > 5 minutes, show minutes and seconds
    if (seconds >= 300) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // For timers <= 5 minutes, show live countdown MM:SS
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  
  // Pan responder for swipe down to close
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      // Use capture phase to grab gestures before children
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        // Only capture if swiping down significantly and mostly vertical
        return gestureState.dy > 30 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 30 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const screenHeight = Dimensions.get('window').height;
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          // Animate slide out then close
          Animated.timing(slideAnim, {
            toValue: screenHeight,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            closePlayer();
            slideAnim.setValue(0);
          });
        } else {
          // Snap back with spring
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
        }
      },
    })
  ).current;

  // Instant open - no animation
  React.useEffect(() => {
    if (isPlayerVisible && currentBook) {
      if (!wasVisibleRef.current) {
        slideAnim.setValue(0);
      }
      wasVisibleRef.current = true;
    } else {
      wasVisibleRef.current = false;
    }
  }, [isPlayerVisible, currentBook?.id]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleClose = useCallback(() => {
    setActiveSheet('none');
    closePlayer();
  }, [closePlayer]);

  // Sheet navigation callbacks - stable references to avoid inline function recreation
  const closeSheet = useCallback(() => setActiveSheet('none'), []);
  const openChapters = useCallback(() => setActiveSheet('chapters'), []);
  const openSettings = useCallback(() => setActiveSheet('settings'), []);
  const openQueue = useCallback(() => setActiveSheet('queue'), []);
  const openBookmarks = useCallback(() => setActiveSheet('bookmarks'), []);

  // Android hardware back button support
  useEffect(() => {
    if (!isPlayerVisible) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // If a sheet is open, close it first
      if (activeSheet !== 'none') {
        setActiveSheet('none');
        return true;
      }
      // Otherwise close the player
      handleClose();
      return true;
    });

    return () => backHandler.remove();
  }, [isPlayerVisible, activeSheet, handleClose]);

  // Navigate to book details
  const handleTitlePress = useCallback(() => {
    if (!currentBook) return;
    haptics.selection();
    handleClose();
    navigation.navigate('BookDetail', { id: currentBook.id });
  }, [currentBook, handleClose, navigation]);

  // Chapter select
  const handleChapterSelect = useCallback((chapterStart: number) => {
    haptics.selection();
    seekTo?.(chapterStart);
    setActiveSheet('none');
  }, [seekTo]);

  // Skip backward using configured interval
  // NOTE: Uses getState() to avoid callback recreation on position updates
  const handleSkipBack = useCallback(() => {
    haptics.skip();  // Use category-specific haptic for playback controls
    const currentPos = usePlayerStore.getState().position;
    const newPosition = Math.max(0, currentPos - skipBackInterval);
    seekTo?.(newPosition);
  }, [skipBackInterval, seekTo]);

  // Skip forward using configured interval
  // NOTE: Uses getState() to avoid callback recreation on position updates
  const handleSkipForward = useCallback(() => {
    haptics.skip();  // Use category-specific haptic for playback controls
    const state = usePlayerStore.getState();
    const newPosition = Math.min(state.duration, state.position + skipForwardInterval);
    seekTo?.(newPosition);
  }, [skipForwardInterval, seekTo]);

  // Long-press: Skip to previous chapter
  const handlePrevChapter = useCallback(() => {
    haptics.chapterChange();  // Use chapter-specific haptic
    prevChapter?.();
  }, [prevChapter]);

  // Long-press: Skip to next chapter
  const handleNextChapter = useCallback(() => {
    haptics.chapterChange();  // Use chapter-specific haptic
    nextChapter?.();
  }, [nextChapter]);

  // Toggle between chapter and book progress mode
  const toggleProgressMode = useCallback(() => {
    setProgressMode((prev) => (prev === 'chapter' ? 'book' : 'chapter'));
    haptics.selection();
  }, []);

  // Calculate chapter position and duration
  const chapterPosition = useMemo(() => {
    if (!currentChapter) return 0;
    return Math.max(0, position - currentChapter.start);
  }, [position, currentChapter]);

  const chapterDuration = useMemo(() => {
    if (!currentChapter) return 0;
    return currentChapter.end - currentChapter.start;
  }, [currentChapter]);

  // Formatted chapter position and duration
  const formattedChapterPosition = useMemo(
    () => formatTimeHHMMSS(chapterPosition),
    [chapterPosition]
  );
  const formattedChapterDuration = useMemo(
    () => formatTimeHHMMSS(chapterDuration),
    [chapterDuration]
  );

  // Seek handler for chapter mode - converts chapter-relative position to book position
  const handleChapterSeek = useCallback((chapterRelativePosition: number) => {
    if (!currentChapter || !seekTo) return;
    const bookPosition = currentChapter.start + chapterRelativePosition;
    seekTo(bookPosition);
  }, [currentChapter, seekTo]);

  // Play/pause toggle
  // NOTE: Uses getState() to avoid callback recreation on position/isPlaying updates
  const handlePlayPause = useCallback(() => {
    const { isPlaying: playing } = usePlayerStore.getState();
    if (playing) {
      pause();
    } else {
      play();
    }
  }, [pause, play]);

  // ==========================================================================
  // CONTINUOUS SEEKING (hold to scrub) - extracted to hook
  // ==========================================================================
  const {
    handleRewindPressIn,
    handleFastForwardPressIn,
    handleSeekPressOut,
    handleSkipBackWithCheck,
    handleSkipForwardWithCheck,
    seekingState,
  } = useContinuousSeeking({
    seekTo,
    handleSkipBack,
    handleSkipForward,
  });

  // ==========================================================================
  // TIMELINE SCRUBBING DELTA - for visual indicator
  // ==========================================================================
  const [timelineScrubDelta, setTimelineScrubDelta] = useState<number | null>(null);

  const handleTimelineScrubStart = useCallback(() => {
    // Delta starts at 0 when scrubbing begins
    setTimelineScrubDelta(0);
  }, []);

  const handleTimelineScrubUpdate = useCallback((delta: number, _progress: number) => {
    setTimelineScrubDelta(delta);
  }, []);

  const handleTimelineScrubEnd = useCallback(() => {
    setTimelineScrubDelta(null);
  }, []);

  // Animated font size for time display - shrinks and moves up when showing delta
  const isSeeking = seekingState.isActive || timelineScrubDelta !== null;
  const [showDelta, setShowDelta] = useState(false);
  const timeFontSize = useSharedValue(scale(64));
  const timeTranslateY = useSharedValue(0);
  const timeTranslateX = useSharedValue(0); // Shift left when delta visible
  const deltaOpacity = useSharedValue(0);
  const deltaTranslateX = useSharedValue(scale(-20));

  useEffect(() => {
    // Animate font size smaller and move UP when seeking (fast in, normal out)
    const duration = isSeeking ? 80 : 150;
    timeFontSize.value = withTiming(isSeeking ? scale(28) : scale(64), { duration });
    timeTranslateY.value = withTiming(isSeeking ? scale(-30) : 0, { duration });
    // Shift left to visually center time+delta group
    timeTranslateX.value = withTiming(isSeeking ? scale(-50) : 0, { duration });

    // Delay showing delta so resize animation completes first
    if (isSeeking) {
      const timer = setTimeout(() => {
        setShowDelta(true);
        // Animate delta sliding out from center to right
        deltaOpacity.value = withTiming(1, { duration: 120 });
        deltaTranslateX.value = withTiming(0, { duration: 120 });
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setShowDelta(false);
      deltaOpacity.value = 0;
      deltaTranslateX.value = scale(-20);
    }
  }, [isSeeking]);

  const timeRowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: timeTranslateX.value },
      { translateY: timeTranslateY.value },
    ],
  }));

  const timeTextAnimatedStyle = useAnimatedStyle(() => ({
    fontSize: timeFontSize.value,
  }));

  const deltaAnimatedStyle = useAnimatedStyle(() => ({
    opacity: deltaOpacity.value,
    transform: [{ translateX: deltaTranslateX.value }],
  }));

  // ==========================================================================
  // BOOKMARK ACTIONS - extracted to hook
  // ==========================================================================
  const {
    showBookmarkPill,
    bookmarkPillAnim,
    showNoteInput,
    noteInputValue,
    editingBookmarkId,
    setNoteInputValue,
    setShowNoteInput,
    setEditingBookmarkId,
    deletedBookmark,
    handleAddBookmark,
    handleAddNoteFromPill,
    handleSaveNote,
    handleDeleteBookmark,
    handleUndoDelete,
  } = useBookmarkActions({
    chapters,
    chapterIndex,
    bookmarks,
    addBookmark,
  });

  // ==========================================================================
  // MAIN RENDER
  // (Sheets extracted to components/sheets/)
  // ==========================================================================

  if (!isPlayerVisible || !currentBook) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          backgroundColor: themeColors.pageBackground,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <StatusBar barStyle={themeColors.statusBar} />

      {/* Background blur layer - matches BookDetailScreen */}
      <View style={styles.backgroundContainer}>
        {backgroundCoverUrl ? (
          <Image
            source={backgroundCoverUrl}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        ) : null}
        {/* Fade to background at bottom */}
        <LinearGradient
          colors={['transparent', themeColors.pageBackground]}
          locations={[0.3, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Header spacer for safe area */}
      <View style={safeAreaStyles.topSpacer} />

      {/* Buffering indicator - only show when streaming (not for downloaded files) */}
      {isBuffering && !isDownloaded && (
        <View style={[styles.bufferingBadgeContainer, { top: scale(200) }]}>
          <View style={styles.bufferingBadge}>
            <Hourglass size={scale(10)} color="#FFF" strokeWidth={2} />
            <Text style={styles.bufferingBadgeText}>Buffering...</Text>
          </View>
        </View>
      )}


      {/* Content area */}
      <View style={styles.contentArea}>
        {/* Overview Section - hidden for now */}
        {false && description ? (
          <View style={styles.overviewSection}>
            <Text style={styles.overviewTitle}>Overview</Text>
            <View style={styles.overviewDivider} />
            <Text style={styles.overviewText} numberOfLines={5}>
              {description}
            </Text>
          </View>
        ) : null}

        {/* Cover overlay buttons */}
        {/* Header row with icons */}
        <View style={[styles.playerHeader, { paddingTop: insets.top + scale(8) }]}>
          {/* Left: Download/Check status */}
          {isDownloaded ? (
            <View style={styles.headerIconButtonShadow}>
              <Check size={scale(20)} color={themeColors.iconPrimary} strokeWidth={2.5} />
            </View>
          ) : isDownloading ? (
            <View style={styles.headerIconButtonShadow}>
              <CircularProgress progress={downloadProgress} size={scale(20)} />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.headerIconButtonShadow}
              onPress={handleStartDownload}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Download for offline"
            >
              <Download size={scale(20)} color={themeColors.iconPrimary} strokeWidth={2} />
            </TouchableOpacity>
          )}

          {/* Center: Down arrow (close) */}
          <TouchableOpacity
            style={styles.headerCloseButtonShadow}
            onPress={handleClose}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close player"
          >
            <DownArrowIcon color={themeColors.iconPrimary} />
          </TouchableOpacity>

          {/* Right: Bookmark + Settings */}
          <View style={styles.headerRightGroup}>
            <TouchableOpacity
              style={styles.headerIconButtonShadow}
              onPress={handleAddBookmark}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Add bookmark"
            >
              <Animated.View
                style={{
                  transform: [
                    {
                      scale: bookmarkPillAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [1, 1.2, 1],
                      }),
                    },
                  ],
                }}
              >
                {showBookmarkPill ? (
                  <Check size={scale(20)} color="#22C55E" strokeWidth={2.5} />
                ) : (
                  <Bookmark size={scale(20)} color={themeColors.iconPrimary} strokeWidth={2} />
                )}
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconButtonShadow}
              onPress={openSettings}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <Settings size={scale(20)} color={themeColors.iconPrimary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Cover image container */}
        <View style={styles.standardCoverContainerFull}>
            {/* Speed badge when not 1.0x */}
            {playbackRate !== 1 && (
              <View style={styles.speedBadgeStandard}>
                <Text style={styles.speedBadgeOnDiscText}>{playbackRate}x</Text>
              </View>
            )}
          </View>


        {/* Title and metadata */}
          <View style={styles.standardTitleSection}>
            {/* Metadata row - duration, chapters, series (above title like BookDetail) */}
            <View style={styles.metadataRowInline}>
              {formattedTotalDuration ? (
                <View style={styles.metadataItem}>
                  <Clock size={scale(14)} color={themeColors.textSecondary} strokeWidth={2} />
                  <Text style={[styles.metadataText, { color: themeColors.textSecondary }]}>{formattedTotalDuration}</Text>
                </View>
              ) : null}
              {chapterCount > 0 ? (
                <>
                  <Text style={[styles.metadataDot, { color: themeColors.textSecondary }]}>·</Text>
                  <View style={styles.metadataItem}>
                    <List size={scale(14)} color={themeColors.textSecondary} strokeWidth={2} />
                    <Text style={[styles.metadataText, { color: themeColors.textSecondary }]}>{chapterCount} ch</Text>
                  </View>
                </>
              ) : null}
              {seriesName ? (
                <>
                  <Text style={[styles.metadataDot, { color: themeColors.textSecondary }]}>·</Text>
                  <TouchableOpacity
                    onPress={() => {
                      handleClose();
                      setTimeout(() => {
                        navigation.navigate('SeriesDetail' as never, { seriesName } as never);
                      }, 100);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.metadataSeriesText, { color: themeColors.textSecondary }]}>
                      {seriesName}{seriesSequence ? ` #${seriesSequence}` : ''}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>

            <TouchableOpacity onPress={handleTitlePress} activeOpacity={0.7}>
              <Text
                style={[styles.standardTitle, { color: themeColors.textPrimary, fontSize: titleFontSize }]}
                numberOfLines={titleLines}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {title}
              </Text>
            </TouchableOpacity>
            <View style={styles.standardMetaRow}>
              <View style={styles.standardMetaCell}>
                <Text style={[styles.standardMetaLabel, { color: themeColors.textTertiary }]}>Written By</Text>
                <TouchableOpacity
                  onPress={() => {
                    const authors = author.split(',').map((a: string) => a.trim()).filter(Boolean);
                    const navigateToAuthor = (authorName: string) => {
                      handleClose();
                      setTimeout(() => {
                        (navigation as any).navigate('AuthorDetail', { authorName });
                      }, 100);
                    };
                    if (authors.length === 1) {
                      navigateToAuthor(authors[0]);
                    } else if (authors.length > 1) {
                      if (Platform.OS === 'ios') {
                        ActionSheetIOS.showActionSheetWithOptions(
                          {
                            options: ['Cancel', ...authors],
                            cancelButtonIndex: 0,
                            title: 'Select Author',
                          },
                          (buttonIndex) => {
                            if (buttonIndex > 0) {
                              navigateToAuthor(authors[buttonIndex - 1]);
                            }
                          }
                        );
                      } else {
                        Alert.alert(
                          'Select Author',
                          undefined,
                          [
                            ...authors.map((a: string) => ({
                              text: a,
                              onPress: () => navigateToAuthor(a),
                            })),
                            { text: 'Cancel', style: 'cancel' as const },
                          ]
                        );
                      }
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.standardMetaValue, { color: themeColors.textSecondary }]} numberOfLines={2}>{author}</Text>
                </TouchableOpacity>
              </View>
              {narrator ? (
                <View style={styles.standardMetaCell}>
                  <Text style={[styles.standardMetaLabel, { color: themeColors.textTertiary }]}>Narrated By</Text>
                  <TouchableOpacity
                    onPress={() => {
                      const narrators = narrator.split(',').map((n: string) => n.trim()).filter(Boolean);
                      const navigateToNarrator = (narratorName: string) => {
                        handleClose();
                        setTimeout(() => {
                          (navigation as any).navigate('NarratorDetail', { narratorName });
                        }, 100);
                      };
                      if (narrators.length === 1) {
                        navigateToNarrator(narrators[0]);
                      } else if (narrators.length > 1) {
                        if (Platform.OS === 'ios') {
                          ActionSheetIOS.showActionSheetWithOptions(
                            {
                              options: ['Cancel', ...narrators],
                              cancelButtonIndex: 0,
                              title: 'Select Narrator',
                            },
                            (buttonIndex) => {
                              if (buttonIndex > 0) {
                                navigateToNarrator(narrators[buttonIndex - 1]);
                              }
                            }
                          );
                        } else {
                          Alert.alert(
                            'Select Narrator',
                            undefined,
                            [
                              ...narrators.map((n: string) => ({
                                text: n,
                                onPress: () => navigateToNarrator(n),
                              })),
                              { text: 'Cancel', style: 'cancel' as const },
                            ]
                          );
                        }
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.standardMetaValue, { color: themeColors.textSecondary }]} numberOfLines={2}>{narrator}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </View>

        {/* Current time and seeking delta - above floating widget */}
        <View style={[styles.chapterInfoAboveProgress, { bottom: insets.bottom + FLOATING_WIDGET_MARGIN + CONTROL_BAR_HEIGHT + PROGRESS_BAR_HEIGHT + MARKER_AREA_HEIGHT + scale(8) }]}>
          {/* Chapter info row - above current time */}
          <TouchableOpacity onPress={openChapters} activeOpacity={0.7} style={styles.chapterLabelRow}>
            <Text style={[styles.chapterLabelText, { color: themeColors.textSecondary }]} numberOfLines={1}>
              {currentNormalizedChapter?.displayTitle || `Chapter ${chapterIndex + 1}`}
            </Text>
            <Text style={[styles.chapterLabelText, { color: themeColors.textSecondary }]}>
              {progressMode === 'chapter' ? formattedChapterDuration : formattedDuration}
            </Text>
          </TouchableOpacity>
          {/* Time and delta row - centered together, moves up when seeking */}
          <ReanimatedAnimated.View style={[styles.timeAndDeltaRow, timeRowAnimatedStyle]}>
            {/* Time wrapper - delta is positioned absolutely relative to this */}
            <View style={styles.timeWrapper}>
              <ReanimatedAnimated.Text style={[styles.currentTimeDisplay, { color: themeColors.textPrimary }, timeTextAnimatedStyle]}>
                {progressMode === 'chapter' ? formattedChapterPosition : formattedPosition}
              </ReanimatedAnimated.Text>
              {/* Separator - lower opacity, appears with delta */}
              {showDelta && (
                <ReanimatedAnimated.Text style={[styles.timeSeparator, { color: themeColors.textPrimary }, deltaAnimatedStyle]}>
                  |
                </ReanimatedAnimated.Text>
              )}
              {/* Delta indicator - absolutely positioned so length changes don't shift time */}
              {showDelta && seekingState.isActive && (
                <ReanimatedAnimated.Text style={[styles.deltaDisplay, { color: themeColors.accent }, deltaAnimatedStyle]}>
                  {seekingState.direction === 'back' ? '−' : '+'}
                  {seekingState.amount >= 60
                    ? `${Math.floor(seekingState.amount / 60)}m ${seekingState.amount % 60}s`
                    : `${seekingState.amount}s`
                  }
                </ReanimatedAnimated.Text>
              )}
              {showDelta && timelineScrubDelta !== null && !seekingState.isActive && (
                <ReanimatedAnimated.Text style={[styles.deltaDisplay, { color: themeColors.accent }, deltaAnimatedStyle]}>
                  {timelineScrubDelta >= 0 ? '+' : '−'}
                  {Math.abs(timelineScrubDelta) >= 60
                    ? `${Math.floor(Math.abs(timelineScrubDelta) / 60)}m ${Math.floor(Math.abs(timelineScrubDelta) % 60)}s`
                    : `${Math.floor(Math.abs(timelineScrubDelta))}s`
                  }
                </ReanimatedAnimated.Text>
              )}
            </View>
          </ReanimatedAnimated.View>
        </View>

        {/* Floating Player Widget - contains progress bar + controls */}
        <View style={[styles.floatingWidgetContainer, { bottom: insets.bottom + FLOATING_WIDGET_MARGIN }]}>
          {/* Progress bar with marker (marker floats above widget visually) */}
          <SimpleProgressBar
            position={progressMode === 'chapter' ? chapterPosition : position}
            duration={progressMode === 'chapter' ? chapterDuration : duration}
            onSeek={progressMode === 'chapter' ? handleChapterSeek : seekTo}
            accentColor={themeColors.accent}
            trackColor={themeColors.widgetTrack}
            borderColor={themeColors.widgetBorder}
            onScrubStart={handleTimelineScrubStart}
            onScrubUpdate={handleTimelineScrubUpdate}
            onScrubEnd={handleTimelineScrubEnd}
          />

          {/* Floating widget with rounded corners - contains control bar */}
          <View style={[styles.floatingWidget, { backgroundColor: themeColors.widgetButtonBg, borderColor: themeColors.widgetBorder }]}>
            <PlayerControlBar
              isPlaying={isPlaying}
              onPlayPause={handlePlayPause}
              onSkipBack={handleSkipBackWithCheck}
              onSkipForward={handleSkipForwardWithCheck}
              onPrevChapter={handlePrevChapter}
              onNextChapter={handleNextChapter}
              onRewindPressIn={handleRewindPressIn}
              onFastForwardPressIn={handleFastForwardPressIn}
              onSeekPressOut={handleSeekPressOut}
              accentColor={themeColors.accent}
              backgroundColor={themeColors.widgetButtonBg}
              iconColor={themeColors.widgetIcon}
              dividerColor={themeColors.widgetDivider}
              bottomInset={0}
            />
          </View>
        </View>
      </View>

      {/* Inline Bottom Sheets (chapters, settings, queue, sleep, speed, bookmarks) */}
      {activeSheet !== 'none' && (
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={closeSheet}
        >
          <View style={[styles.sheetContainer, { marginBottom: insets.bottom + scale(90) }]}>
            {activeSheet === 'chapters' && (
              <ChaptersSheet
                chapters={normalizedChapters}
                currentChapterIndex={chapterIndex}
                onChapterSelect={handleChapterSelect}
                onClose={closeSheet}
              />
            )}
            {activeSheet === 'settings' && (
              <SettingsSheet
                progressMode={progressMode}
                setProgressMode={setProgressMode}
                playbackRate={playbackRate}
                setPlaybackRate={setPlaybackRate}
                sleepTimer={sleepTimer}
                setSleepTimer={setSleepTimer}
                clearSleepTimer={clearSleepTimer}
                bookmarksCount={bookmarks.length}
                queueCount={queueCount}
                clearQueue={clearQueue}
                onOpenBookmarks={() => setActiveSheet('bookmarks')}
                onClose={closeSheet}
              />
            )}
            {activeSheet === 'queue' && (
              <QueuePanel
                onClose={() => setActiveSheet('none')}
                maxHeight={SCREEN_HEIGHT * 0.6}
              />
            )}
            {activeSheet === 'sleep' && (
              <SleepTimerSheet onClose={() => setActiveSheet('none')} />
            )}
            {activeSheet === 'speed' && (
              <SpeedSheet onClose={() => setActiveSheet('none')} />
            )}
            {activeSheet === 'bookmarks' && (
              <BookmarksSheet
                bookmarks={bookmarks}
                coverUrl={coverUrl}
                onGoBack={openSettings}
                onClose={closeSheet}
                onSeekTo={seekTo}
                onEditBookmark={(bookmark: BookmarkType) => {
                  setEditingBookmarkId(bookmark.id);
                  setNoteInputValue(bookmark.note || '');
                  setShowNoteInput(true);
                }}
                onDeleteBookmark={handleDeleteBookmark}
              />
            )}
          </View>
        </TouchableOpacity>
      )}


      {/* Bookmark Deleted Toast with Undo - Modernist white/black */}
      {deletedBookmark && (
        <View style={[styles.bookmarkToast, styles.bookmarkDeletedToast, { bottom: insets.bottom + scale(100) }]}>
          <Trash2 size={20} color="#000000" strokeWidth={2} />
          <Text style={styles.bookmarkToastText}>Bookmark deleted</Text>
          <TouchableOpacity onPress={handleUndoDelete}>
            <Text style={styles.bookmarkToastAction}>Undo</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Note Input Modal - Modernist white/black */}
      {showNoteInput && (
        <TouchableOpacity
          style={styles.noteInputOverlay}
          activeOpacity={1}
          onPress={() => {
            Keyboard.dismiss();
            setShowNoteInput(false);
          }}
        >
          <View
            style={[styles.noteInputContainer, { paddingBottom: insets.bottom + scale(24) }]}
            onStartShouldSetResponder={() => true}
          >
            {/* Handle bar */}
            <View style={styles.noteInputHandle} />

            <View style={styles.noteInputHeader}>
              <Text style={styles.noteInputTitle}>Add Note</Text>
              <TouchableOpacity
                onPress={() => setShowNoteInput(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={24} color="#000000" strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.noteInput}
              value={noteInputValue}
              onChangeText={setNoteInputValue}
              placeholder="What makes this moment special?"
              placeholderTextColor="#999999"
              multiline
              autoFocus
              maxLength={500}
            />
            <View style={styles.noteInputFooter}>
              <Text style={styles.noteCharCount}>{noteInputValue.length}/500</Text>
              <TouchableOpacity style={styles.noteInputSaveButton} onPress={handleSaveNote}>
                <Text style={styles.noteInputSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      )}

    </Animated.View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.backgroundPrimary,
  },
  containerStandard: {
    backgroundColor: '#FFFFFF',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: scale(600),
    overflow: 'hidden',
  },
  topGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: hp(35), // Goes down to about halfway of cover
    zIndex: 5,
  },
  arrowCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  arrowButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(8),
  },
  arrowButtonCentered: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(8),
  },
  headerSpacer: {
    width: scale(44),  // Same as settings button
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 0,
    zIndex: 100,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: scale(22),
    marginBottom: scale(4),
  },
  sourceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: scale(28),
  },
  sourceIconCircle: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceIconCircleWhite: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceIconCircleWhiteFilled: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Disc overlay positions for CD mode
  discOverlayTopLeft: {
    position: 'absolute',
    top: scale(16),
    left: scale(16),
    zIndex: 25, // Higher than center to ensure touch priority
  },
  discOverlayTopRight: {
    position: 'absolute',
    top: scale(16),
    right: scale(16),
    zIndex: 25, // Higher than center to ensure touch priority
  },
  discOverlayCenter: {
    position: 'absolute',
    top: scale(16),
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  sourceText: {
    ...typography.labelMedium,
    fontWeight: fontWeight.medium,
    color: colors.textTertiary,
    overflow: 'visible',
  },
  sourceTextDownloaded: {
    color: colors.success,
    overflow: 'visible',
  },
  settingsButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.headlineMedium,
    color: colors.textPrimary,
    textAlign: 'center',
    overflow: 'visible',
  },
  author: {
    ...typography.bodyMedium,
    color: colors.textTertiary,
    marginTop: scale(6),
    textAlign: 'center',
  },
  // Standard player mode styles (white background, dark text)
  titleStandard: {
    color: '#000',
  },
  authorStandard: {
    color: 'rgba(0,0,0,0.6)',
  },
  // Standard player - Book Detail style title/author (absolute positioning)
  // Positioned to overlap gradient 50/50 - gradient starts fading at 50% screen height
  standardTitleSection: {
    position: 'absolute',
    top: hp(55), // User-set position
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: scale(10),
    paddingTop: scale(16), // Breathing room for top content (icons)
    overflow: 'visible',
    zIndex: 20,
  },
  standardTitle: {
    fontSize: fontSize['4xl'], // 32px
    fontWeight: '700',
    letterSpacing: -0.5,
    color: '#000',
    marginBottom: scale(10),
    textAlign: 'center',
  },
  standardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scale(40),
  },
  standardMetaCell: {
    alignItems: 'center',
  },
  standardMetaLabel: {
    fontSize: scale(10),
    fontWeight: '500',
    textTransform: 'capitalize',
    marginBottom: scale(0),
    textAlign: 'center',
  },
  standardMetaValue: {
    fontSize: scale(13),
    fontWeight: '500',
    textAlign: 'center',
  },
  sourceTextStandard: {
    color: 'rgba(0,0,0,0.5)',
  },
  contentArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    paddingTop: scale(10),
    overflow: 'visible', // Allow absolutely positioned children to extend beyond bounds
  },
  overviewSection: {
    paddingHorizontal: scale(22),
    marginBottom: scale(10),
  },
  overviewTitle: {
    ...typography.bodyMedium,
    fontWeight: fontWeight.regular,
    color: colors.textPrimary,
    letterSpacing: 0,
    marginBottom: scale(10),
  },
  overviewDivider: {
    height: 1,
    backgroundColor: colors.overlay.medium,
    borderRadius: scale(14),
    marginBottom: scale(5),
  },
  overviewText: {
    ...typography.bodySmall,
    fontWeight: fontWeight.regular,
    color: colors.textSecondary,
    lineHeight: scale(18),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(22),
    marginTop: scale(6),
    marginBottom: scale(8),
  },
  infoRowCentered: {
    position: 'absolute',
    bottom: scale(20), // Above the marker dot
    left: 0,
    right: 0,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  chapterCentered: {
    ...typography.bodyLarge,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: scale(4),
  },
  chapterTimeCentered: {
    ...typography.displaySmall,
    color: colors.accent,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  chapter: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    letterSpacing: 0.28,
    maxWidth: SCREEN_WIDTH * 0.5,
  },
  time: {
    ...typography.bodyMedium,
    color: colors.textTertiary,
    letterSpacing: 0.28,
    fontVariant: ['tabular-nums'],
  },
  chapterRemaining: {
    ...typography.bodyLarge,
    fontWeight: fontWeight.regular,
    color: colors.accent,
    letterSpacing: 0.28,
    fontVariant: ['tabular-nums'],
  },
  // Standard player mode (white background) - dark text
  chapterStandard: {
    color: 'rgba(0,0,0,0.6)',
  },
  chapterRemainingStandard: {
    color: '#E53935', // Keep accent red for remaining time
  },
  progressTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: scale(6),
  },
  progressTimeText: {
    ...typography.caption,
    color: colors.textTertiary,
    letterSpacing: 0.18,
    fontVariant: ['tabular-nums'],
  },
  progressTimeTextStandard: {
    color: 'rgba(0,0,0,0.5)',
  },
  progressWrapper: {
    paddingHorizontal: scale(22),
    marginBottom: scale(4),
  },
  progressWrapperStandard: {
    position: 'absolute',
    // bottom is set dynamically with insets.bottom + scale(80)
    left: 0,
    right: 0,
    paddingHorizontal: 0,
  },
  progressContainer: {
    height: scale(16),
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
  },
  progressTrack: {
    height: scale(2),
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: scale(14),
    position: 'relative',
    overflow: 'hidden',
  },
  progressBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: 'rgba(80,80,80,0.5)',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: scale(2),
    backgroundColor: colors.progressFill,
    borderRadius: scale(14),
  },
  chapterMarker: {
    position: 'absolute',
    top: scale(6),
    width: 1,
    height: scale(4),
    backgroundColor: colors.textMuted,
    zIndex: 5,
  },
  progressShadow: {
    display: 'none', // Hide shadow for thin bar
  },
  progressThumb: {
    position: 'absolute',
    top: 0,
    width: scale(16),
    height: scale(16),
    backgroundColor: colors.accent,
    borderRadius: scale(8),
    shadowColor: colors.backgroundPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pillsOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 15,
  },
  pillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: scale(22),
  },
  pillsColumn: {
    flexDirection: 'column',
    gap: scale(8),
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: scale(14),
    paddingVertical: scale(8),
    paddingHorizontal: scale(14),
    minHeight: scale(36),
    position: 'relative',
    overflow: 'hidden',
  },
  pillBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: 'rgba(80,80,80,0.5)',
  },
  pillText: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
  },
  pillTextActive: {
    color: colors.accent,
  },
  pillTextSmall: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  speedPill: {
    minWidth: scale(40),
    paddingHorizontal: scale(12),
  },
  queuePill: {
    minWidth: scale(40),
    paddingHorizontal: scale(12),
  },
  queueBadge: {
    backgroundColor: colors.accent,
    borderRadius: scale(8),
    paddingHorizontal: scale(5),
    paddingVertical: scale(1),
    marginLeft: scale(2),
  },
  queueBadgeText: {
    ...typography.labelSmall,
    fontWeight: fontWeight.bold,
    color: colors.backgroundPrimary,
  },
  scrubButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonBorder: {
    width: scale(76),
    height: scale(76),
    borderRadius: scale(38),
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay.light,
    overflow: 'visible',
  },
  // Standard player mode - scrub button above progress bar
  standardScrubContainer: {
    alignItems: 'center',
    marginBottom: scale(0),
  },
  standardTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  standardTimeText: {
    color: '#000',
    fontSize: fontSize['2xl'], // 22px - display time
    fontWeight: fontWeight.regular,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  standardTimeSeparator: {
    color: 'rgba(0,0,0,0.3)',
    fontSize: fontSize['2xl'], // 22px
    fontWeight: fontWeight.regular,
    marginHorizontal: scale(8),
  },
  playButtonBorderStandard: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderColor: '#000',
  },
  controlsRowStandard: {
    justifyContent: 'center',
    gap: scale(60),
  },
  skipButtonStandard: {
    opacity: 1,
  },
  skipButtonLabelStandard: {
    color: 'rgba(0,0,0,0.5)',
  },
  // Standard player 3-button control bar (absolute positioning at bottom)
  standardControlsBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    height: scale(72),
  },
  standardControlButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    minHeight: scale(48),
  },
  standardControlDivider: {
    width: 1,
    height: scale(32),
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  // Standard player chapter row above progress bar
  standardChapterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(22),
    marginBottom: scale(0),
  },
  standardChapterTouch: {
    alignSelf: 'center',
  },
  standardChapterText: {
    ...typography.bodyLarge,
    fontWeight: fontWeight.regular,
    color: '#000',
  },
  standardChapterTime: {
    ...typography.bodyLarge,
    fontWeight: fontWeight.medium,
    color: '#E53935',
    fontVariant: ['tabular-nums'],
  },
  // Current time centered above marker
  currentTimeAboveMarker: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  currentTimeText: {
    fontSize: scale(14),
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  // Chapter info above progress bar
  chapterInfoAboveProgress: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: scale(16),
    zIndex: 10,
  },
  chapterLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: scale(4),
    marginBottom: scale(8),
  },
  chapterLabelText: {
    fontSize: scale(14),
    fontWeight: '500',
  },
  chapterTitleText: {
    fontSize: scale(16),
    fontWeight: '600',
    textAlign: 'center',
  },
  timeAndDeltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  timeWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currentTimeDisplay: {
    fontSize: scale(64),
    fontWeight: '800',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
  },
  timeSeparator: {
    fontSize: scale(28),
    fontWeight: '800',
    opacity: 0.4,
    marginLeft: scale(8),
    marginRight: scale(4),
  },
  deltaDisplay: {
    fontSize: scale(24),
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    width: scale(120), // Fixed width for centering (fits "| +59m 59s")
    position: 'absolute',
    left: '100%',
    marginLeft: scale(4),
  },
  // Metadata row - duration, chapters, series (inline above title)
  metadataRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(4),
    flexWrap: 'wrap',
    overflow: 'visible',
    minHeight: scale(20), // Ensure enough height for icons
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    overflow: 'visible',
  },
  metadataText: {
    fontSize: scale(14),
    fontWeight: '500',
  },
  metadataDot: {
    fontSize: scale(14),
    marginHorizontal: scale(8),
  },
  metadataSeriesText: {
    fontSize: scale(14),
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  // Chapter (left) and Duration (right) row below timeline
  chapterDurationRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: scale(22),
    zIndex: 10,
  },
  chapterTouchLeft: {
    maxWidth: '50%',
  },
  chapterTextBelow: {
    fontSize: scale(12),
    fontWeight: '500',
  },
  durationTextRight: {
    fontSize: scale(12),
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  // Centered cover for standard player - absolute positioning
  standardCoverContainerFull: {
    position: 'absolute',
    top: scale(90),
    left: (wp(100) - COVER_SIZE) / 2,
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: radius.md,
    overflow: 'visible', // Allow buttons to extend past edges
    // // Drop shadow like book detail page
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 8 },
    // shadowOpacity: 0.3,
    // shadowRadius: 12,
    // elevation: 8,
    zIndex: 10,
  },
  standardCoverFull: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
  },
  // Player header row
  playerHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    zIndex: 100,
  },
  headerIconButton: {
    width: scale(44),
    height: scale(44),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconButtonShadow: {
    width: scale(44),
    height: scale(44),
    alignItems: 'center',
    justifyContent: 'center',
    // Drop shadow for visibility over cover
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  headerCloseButton: {
    width: scale(44),
    height: scale(44),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCloseButtonShadow: {
    position: 'absolute',
    left: '50%',
    marginLeft: scale(-22), // Half of width to center
    width: scale(44),
    height: scale(44),
    alignItems: 'center',
    justifyContent: 'center',
    // Drop shadow for visibility over cover
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coverOverlayCircle: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // White filled circle for download button
  downloadCircleFilled: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(36),
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverOverlayArrowShadow: {
    // White stroke arrow with drop shadow, no circle background
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 6,
  },
  // Edge buttons positioned at cover edges
  coverEdgeButtonLeft: {
    position: 'absolute',
    top: scale(250) + COVER_SIZE * 0.55,
    left: (wp(80) - COVER_SIZE) / 2 - scale(18),
    width: scale(36),
    height: scale(36),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  coverEdgeButtonRight: {
    position: 'absolute',
    top: scale(300) + COVER_SIZE * 0.55,
    left: (wp(120) - COVER_SIZE) / 2 + COVER_SIZE - scale(18),
    width: scale(36),
    height: scale(36),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  coverButtonBadge: {
    position: 'absolute',
    top: -scale(4),
    right: -scale(4),
    backgroundColor: colors.accent,
    borderRadius: scale(10),
    minWidth: scale(18),
    height: scale(18),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(4),
  },
  coverButtonBadgeText: {
    ...typography.labelSmall,
    fontWeight: fontWeight.bold,
    color: '#000',
  },

  // Bottom Sheet styles
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay.medium,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  // Sheet container - no background (individual sheets set their own)
  sheetContainer: {
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    borderBottomLeftRadius: scale(24),
    borderBottomRightRadius: scale(24),
    overflow: 'hidden',
  },
  fullScreenPanel: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  sheet: {
    padding: spacing.lg,
    backgroundColor: '#FFFFFF',
    paddingTop: scale(20),
    paddingBottom: scale(24),
  },
  chaptersSheet: {
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(20),
  },
  sheetTitle: {
    ...typography.displaySmall,
    fontSize: fontSize.xl, // 20px
    color: '#000000',
  },
  sheetClose: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Options Grid (Speed)
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionButton: {
    width: (SCREEN_WIDTH - 80) / 3,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardBackground,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: colors.accent,
  },
  optionText: {
    ...typography.headlineMedium,
    fontSize: fontSize.md, // 16px
    color: colors.textPrimary,
  },
  optionTextActive: {
    color: colors.backgroundPrimary,
  },

  // Options List (Sleep)
  optionsList: {
    gap: 4,
  },
  listOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  listOptionActive: {
    backgroundColor: colors.accentSubtle,
  },
  listOptionText: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
  },
  listOptionTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },

  // Chapters List - Modernist white/black
  chaptersList: {
    maxHeight: SCREEN_HEIGHT * 0.45,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(12),
    paddingHorizontal: scale(12),
    borderRadius: scale(8),
  },
  chapterItemActive: {
    backgroundColor: '#F0F0F0',
  },
  chapterNumber: {
    ...typography.bodyMedium,
    width: scale(28),
    color: '#999999',
  },
  chapterInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  chapterTitle: {
    ...typography.headlineMedium,
    color: '#000000',
    marginBottom: 2,
  },
  chapterTitleActive: {
    color: '#000000',
    fontWeight: '600',
  },
  chapterDuration: {
    ...typography.bodySmall,
    color: '#666666',
  },

  // Settings Sheet - Modernist white/black
  settingsSection: {
    marginBottom: scale(20),
  },
  settingsSectionTitle: {
    ...typography.labelMedium,
    color: '#888888',
    marginBottom: scale(14),
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingsOptions: {
    gap: 4,
  },
  settingsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  settingsOptionActive: {
    backgroundColor: colors.accentSubtle,
  },
  settingsOptionText: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
  },
  settingsOptionTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  settingsOptionValue: {
    ...typography.headlineMedium,
    color: colors.textSecondary,
  },
  // Speed grid for Standard Player settings
  speedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  speedGridOption: {
    paddingVertical: scale(10),
    paddingHorizontal: scale(16),
    borderRadius: scale(8),
    backgroundColor: 'rgba(255,255,255,0.1)',
    minWidth: scale(60),
    alignItems: 'center',
  },
  speedGridOptionActive: {
    backgroundColor: colors.accent,
  },
  speedGridText: {
    ...typography.labelLarge,
    color: colors.textPrimary,
  },
  speedGridTextActive: {
    color: '#000',
    fontWeight: '700',
  },

  // Settings panel - new two-column layout
  settingsRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  settingsColumn: {
    flex: 1,
  },
  settingsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: scale(8),
  },
  toggleOption: {
    flex: 1,
    paddingVertical: scale(12),
    paddingHorizontal: scale(12),
    borderRadius: scale(10),
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  toggleOptionActive: {
    backgroundColor: '#000000',
  },
  toggleOptionText: {
    ...typography.labelLarge,
    color: '#333333',
  },
  toggleOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  speedOptionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  speedQuickOption: {
    paddingVertical: scale(8),
    paddingHorizontal: scale(10),
    borderRadius: scale(6),
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  speedQuickOptionActive: {
    backgroundColor: colors.accent,
  },
  speedQuickText: {
    ...typography.labelMedium,
    color: colors.textPrimary,
  },
  speedQuickTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  speedGearButton: {
    padding: scale(8),
    marginLeft: 2,
  },
  sleepTimerStatus: {
    ...typography.labelMedium,
    fontWeight: fontWeight.semibold,
    color: colors.accent,
    marginLeft: 'auto',
  },
  sleepOptionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  sleepQuickOption: {
    paddingVertical: scale(8),
    paddingHorizontal: scale(12),
    borderRadius: scale(6),
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  sleepQuickOptionActive: {
    backgroundColor: colors.accent,
  },
  sleepQuickText: {
    ...typography.labelMedium,
    color: colors.textPrimary,
  },
  sleepQuickTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  sleepCustomButton: {
    paddingVertical: scale(8),
    paddingHorizontal: scale(12),
    borderRadius: scale(6),
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sleepCustomText: {
    ...typography.labelMedium,
    color: colors.textSecondary,
  },
  sleepOffButton: {
    padding: scale(8),
  },
  // Modernist unified settings styles
  settingStatusText: {
    ...typography.bodyMedium,
    fontWeight: fontWeight.semibold,
    color: '#000000',
    marginLeft: 'auto',
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: scale(8),
    marginTop: scale(12),
  },
  quickOption: {
    paddingVertical: scale(10),
    paddingHorizontal: scale(14),
    borderRadius: scale(8),
    backgroundColor: '#F0F0F0',
  },
  quickOptionActive: {
    backgroundColor: '#000000',
  },
  quickOptionText: {
    ...typography.bodyMedium,
    fontWeight: fontWeight.medium,
    color: '#333333',
  },
  quickOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  customInputContainer: {
    backgroundColor: '#F0F0F0',
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: scale(54),
  },
  customInput: {
    ...typography.bodyMedium,
    fontWeight: fontWeight.medium,
    color: '#000000',
    paddingVertical: scale(8),
    paddingHorizontal: scale(12),
    textAlign: 'center',
  },
  offButtonSmall: {
    padding: scale(4),
    marginLeft: scale(8),
  },
  settingsActionsColumn: {
    gap: scale(10),
    marginTop: scale(12),
  },
  settingsActionButtonFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(10),
    paddingVertical: scale(14),
    paddingHorizontal: scale(16),
    borderRadius: scale(12),
    backgroundColor: '#F0F0F0',
  },
  // Sleep timer in play button
  sleepTimerControl: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sleepTimerText: {
    ...typography.labelLarge,
    fontWeight: fontWeight.bold,
    color: '#E53935',
    marginTop: scale(2),
  },
  settingsActionsRow: {
    flexDirection: 'row',
    gap: scale(10),
    marginTop: scale(12),
  },
  settingsActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(10),
    paddingVertical: scale(14),
    paddingHorizontal: scale(16),
    borderRadius: scale(12),
    backgroundColor: '#F0F0F0',
  },
  settingsActionButtonDisabled: {
    opacity: 0.4,
  },
  settingsActionText: {
    ...typography.bodyLarge,
    fontWeight: fontWeight.medium,
    color: '#000000',
  },
  settingsActionTextDisabled: {
    color: '#999999',
  },
  settingsActionBadge: {
    backgroundColor: '#000000',
    borderRadius: scale(10),
    minWidth: scale(22),
    height: scale(22),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(6),
  },
  settingsActionBadgeText: {
    ...typography.labelMedium,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },

  // Bookmarks sheet styles - Modernist white/black
  sheetBackButton: {
    paddingVertical: scale(6),
    paddingHorizontal: scale(10),
  },
  sheetBackText: {
    ...typography.bodyLarge,
    color: '#666666',
  },
  bookmarksScrollView: {
    maxHeight: hp(40),
  },
  bookmarksEmpty: {
    alignItems: 'center',
    paddingVertical: scale(48),
  },
  bookmarksEmptyText: {
    ...typography.headlineLarge,
    color: '#000000',
    marginTop: scale(20),
  },
  bookmarksEmptySubtext: {
    ...typography.bodyLarge,
    color: '#666666',
    marginTop: scale(10),
    textAlign: 'center',
    paddingHorizontal: scale(20),
  },
  bookmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(14),
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  bookmarkInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  bookmarkTitle: {
    ...typography.headlineMedium,
    fontWeight: fontWeight.medium,
    color: '#000000',
  },
  bookmarkChapter: {
    ...typography.bodyMedium,
    fontWeight: fontWeight.medium,
    color: '#333333',
    marginTop: 2,
  },
  bookmarkTime: {
    ...typography.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: '#000000',
    marginTop: scale(2),
  },
  bookmarksEmptyHint: {
    ...typography.bodyMedium,
    color: '#999999',
    marginTop: scale(6),
    textAlign: 'center',
    paddingHorizontal: scale(20),
  },
  // Enhanced bookmark cards - Modernist white/black
  bookmarkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(14),
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  bookmarkCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookmarkCover: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(6),
    marginRight: spacing.md,
  },
  bookmarkNote: {
    ...typography.bodyMedium,
    fontStyle: 'italic',
    color: '#666666',
    marginTop: scale(4),
  },
  bookmarkDate: {
    ...typography.bodySmall,
    color: '#999999',
    marginTop: scale(4),
  },
  bookmarkActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    marginLeft: spacing.md,
  },
  bookmarkPlayButton: {
    padding: scale(10),
    backgroundColor: '#F0F0F0',
    borderRadius: scale(20),
  },
  bookmarkDeleteButton: {
    padding: scale(10),
  },
  // Bookmark pill - grows from bookmark button on cover
  bookmarkPill: {
    position: 'absolute',
    top: scale(100) + scale(320) - scale(16) - scale(22), // Aligned with bookmark button
    right: scale(16) + scale(44) + scale(8), // To the left of bookmark button
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: scale(10),
    paddingLeft: scale(14),
    paddingRight: scale(6),
    borderRadius: scale(24),
    gap: scale(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  bookmarkPillText: {
    ...typography.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: '#000000',
  },
  bookmarkPillNoteButton: {
    backgroundColor: '#F0F0F0',
    paddingVertical: scale(6),
    paddingHorizontal: scale(12),
    borderRadius: scale(16),
  },
  bookmarkPillNoteText: {
    ...typography.bodyMedium,
    fontWeight: fontWeight.semibold,
    color: '#666666',
  },
  // Bookmark toast (for delete undo)
  // Modernist Toast - Clean white/black design
  bookmarkToast: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: scale(18),
    paddingHorizontal: scale(20),
    borderRadius: scale(16),
    gap: scale(14),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  bookmarkDeletedToast: {
    // Same white design for consistency
  },
  bookmarkToastText: {
    ...typography.headlineMedium,
    flex: 1,
    fontWeight: fontWeight.medium,
    color: '#000000',
    letterSpacing: -0.2,
  },
  bookmarkToastAction: {
    ...typography.headlineMedium,
    fontWeight: fontWeight.semibold,
    color: '#000000',
    textDecorationLine: 'underline',
  },
  bookmarkToastClose: {
    padding: scale(6),
    marginLeft: scale(4),
  },
  // Modernist Note Input Modal - Clean white/black design
  noteInputOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  noteInputContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: scale(28),
    borderTopRightRadius: scale(28),
    paddingTop: scale(12),
    paddingHorizontal: scale(24),
    paddingBottom: scale(20),
  },
  noteInputHandle: {
    alignSelf: 'center',
    width: scale(36),
    height: scale(4),
    backgroundColor: '#E0E0E0',
    borderRadius: scale(2),
    marginBottom: scale(20),
  },
  noteInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(24),
  },
  noteInputTitle: {
    ...typography.displaySmall,
    fontWeight: fontWeight.semibold,
    color: '#000000',
    letterSpacing: -0.5,
  },
  noteInput: {
    ...typography.headlineLarge,
    backgroundColor: '#F5F5F5',
    borderRadius: scale(16),
    paddingVertical: scale(18),
    paddingHorizontal: scale(18),
    color: '#000000',
    minHeight: scale(140),
    textAlignVertical: 'top',
    lineHeight: scale(24),
  },
  noteInputFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: scale(20),
  },
  noteCharCount: {
    ...typography.bodyMedium,
    fontWeight: fontWeight.regular,
    color: '#999999',
  },
  noteInputSaveButton: {
    backgroundColor: '#000000',
    paddingVertical: scale(14),
    paddingHorizontal: scale(32),
    borderRadius: scale(24),
  },
  noteInputSaveText: {
    ...typography.headlineMedium,
    fontWeight: fontWeight.semibold,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },

  // Controls Row with Skip Buttons at edges
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(30),
    marginTop: scale(8),
  },
  skipButton: {
    width: scale(48),
    height: scale(60),
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
    opacity: 0.8,
  },
  skipButtonLabel: {
    ...typography.labelMedium,
    fontWeight: fontWeight.medium,
    color: colors.textTertiary,
    marginTop: scale(2),
  },
  // Scrub Speed Scale
  scrubScaleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: scale(30),
    marginTop: scale(16),
  },
  scrubScaleItem: {
    alignItems: 'center',
  },
  scrubScaleText: {
    ...typography.labelSmall,
    color: 'rgba(91,91,91,0.7)',
    fontVariant: ['tabular-nums'],
    marginBottom: scale(4),
  },
  scrubScaleLine: {
    width: 1,
    height: scale(12),
    backgroundColor: 'rgba(60,60,60,0.8)',
  },

  // Playing badge for reduced motion mode
  playingBadge: {
    position: 'absolute',
    bottom: scale(20),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: colors.accent,
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(12),
  },
  playingBadgeText: {
    ...typography.labelMedium,
    fontWeight: fontWeight.bold,
    color: colors.backgroundPrimary,
  },

  // Speed badge on disc
  speedBadgeOnDisc: {
    position: 'absolute',
    top: scale(20),
    right: scale(20),
    backgroundColor: colors.accent,
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(10),
  },
  speedBadgeOnDiscText: {
    ...typography.labelMedium,
    fontWeight: fontWeight.bold,
    color: colors.backgroundPrimary,
  },

  // Buffering badge container - positioned absolutely above all layers
  bufferingBadgeContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
    elevation: 50,
  },
  bufferingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  bufferingBadgeText: {
    ...typography.labelMedium,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },

  // Timer countdown indicator
  timerCountdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  timerActiveDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: colors.accent,
  },

  // Standard Player Mode styles
  standardCoverContainer: {
    alignItems: 'center',
    marginTop: scale(8),
    marginBottom: scale(12),
  },
  standardCover: {
    width: scale(120),
    height: scale(120),
    borderRadius: scale(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  speedBadgeStandard: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    backgroundColor: colors.accent,
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(10),
  },
  standardPillsPosition: {
    position: 'relative',
    top: 0,
    marginTop: scale(10),
    marginBottom: scale(10),
  },
  // Floating player widget container
  floatingWidgetContainer: {
    position: 'absolute',
    left: scale(16),
    right: scale(16),
  },
  // The floating widget - control bar area with border on bottom/left/right
  floatingWidget: {
    overflow: 'hidden', // Clip children to rounded corners
    borderBottomLeftRadius: FLOATING_WIDGET_RADIUS,
    borderBottomRightRadius: FLOATING_WIDGET_RADIUS,
    borderWidth: 1,
    borderTopWidth: 0,
  },
});

export default CDPlayerScreen;
