/**
 * src/features/player/screens/SimplePlayerScreen.tsx
 *
 * Simplified full-screen player following standard UX patterns.
 * Key improvements over PlayerScreen:
 * - Standard layout (cover, info, scrubber, controls, actions)
 * - Explicit labeled buttons (no hidden tap targets)
 * - Bottom sheets for settings instead of inline panels
 * - Direct actions (no temp state, changes apply immediately)
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Animated,
  PanResponder,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { usePlayerStore, useCurrentChapterIndex, useBookProgress } from '../stores/playerStore';
import { useCoverUrl } from '@/core/cache';
import { haptics } from '@/core/native/haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// =============================================================================
// TYPES
// =============================================================================

type SheetType = 'none' | 'speed' | 'sleep' | 'chapters';

// =============================================================================
// CONSTANTS
// =============================================================================

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 1.75, 2];
const SLEEP_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: 'End of chapter', value: -1 },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const formatTime = (seconds: number): string => {
  if (!seconds || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatTimeRemaining = (seconds: number): string => {
  if (!seconds || seconds < 0) return '-0:00';
  return `-${formatTime(seconds)}`;
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function SimplePlayerScreen() {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Store state
  const {
    currentBook,
    isPlayerVisible,
    isPlaying,
    isLoading,
    position,
    duration,
    playbackRate,
    sleepTimer,
    chapters,
    closePlayer,
    play,
    pause,
    setPlaybackRate,
    setSleepTimer,
    clearSleepTimer,
    seekTo,
    skipForward,
    skipBackward,
    nextChapter,
    prevChapter,
  } = usePlayerStore();

  const chapterIndex = useCurrentChapterIndex();
  const progress = useBookProgress();
  const coverUrl = useCoverUrl(currentBook?.id || '');

  // Local state
  const [activeSheet, setActiveSheet] = useState<SheetType>('none');

  // Book metadata
  const metadata = currentBook?.media?.metadata as any;
  const title = metadata?.title || 'Unknown Title';
  const author = metadata?.authorName || metadata?.authors?.[0]?.name || 'Unknown Author';
  const currentChapter = chapters[chapterIndex];

  // Time calculations
  const timeRemaining = duration - position;
  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  // Pan responder for swipe down
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 20 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          handleClose();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Animation on open
  React.useEffect(() => {
    if (isPlayerVisible && currentBook) {
      slideAnim.setValue(SCREEN_HEIGHT);
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 55,
        friction: 12,
        useNativeDriver: true,
      }).start();
    }
  }, [isPlayerVisible, currentBook?.id]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleClose = useCallback(() => {
    setActiveSheet('none');
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => closePlayer());
  }, [closePlayer, slideAnim]);

  const handlePlayPause = useCallback(async () => {
    haptics.playbackToggle();
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  }, [isPlaying, pause, play]);

  const handleSkipBack = useCallback(async () => {
    haptics.skip();
    await skipBackward?.(30);
  }, [skipBackward]);

  const handleSkipForward = useCallback(async () => {
    haptics.skip();
    await skipForward?.(30);
  }, [skipForward]);

  const handlePrevChapter = useCallback(async () => {
    haptics.chapterChange();
    await prevChapter?.();
  }, [prevChapter]);

  const handleNextChapter = useCallback(async () => {
    haptics.chapterChange();
    await nextChapter?.();
  }, [nextChapter]);

  // Speed - apply immediately (no temp state)
  const handleSpeedSelect = useCallback((speed: number) => {
    haptics.selection();
    setPlaybackRate?.(speed);
    setActiveSheet('none');
  }, [setPlaybackRate]);

  // Sleep - apply immediately (no temp state)
  const handleSleepSelect = useCallback((minutes: number) => {
    haptics.selection();
    if (minutes === 0) {
      clearSleepTimer?.();
    } else {
      setSleepTimer?.(minutes);
    }
    setActiveSheet('none');
  }, [setSleepTimer, clearSleepTimer]);

  // Chapter select
  const handleChapterSelect = useCallback((chapterStart: number) => {
    haptics.selection();
    seekTo?.(chapterStart);
    setActiveSheet('none');
  }, [seekTo]);

  // Scrubber
  const handleScrub = useCallback((percent: number) => {
    const newPosition = (percent / 100) * duration;
    seekTo?.(newPosition);
  }, [duration, seekTo]);

  // ==========================================================================
  // RENDER HELPERS
  // ==========================================================================

  const renderSpeedSheet = () => (
    <View style={styles.sheet}>
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>Playback Speed</Text>
        <TouchableOpacity onPress={() => setActiveSheet('none')} style={styles.sheetClose}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
      <View style={styles.optionsGrid}>
        {SPEED_OPTIONS.map((speed) => (
          <TouchableOpacity
            key={speed}
            style={[
              styles.optionButton,
              playbackRate === speed && styles.optionButtonActive,
            ]}
            onPress={() => handleSpeedSelect(speed)}
          >
            <Text style={[
              styles.optionText,
              playbackRate === speed && styles.optionTextActive,
            ]}>
              {speed}x
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderSleepSheet = () => {
    const currentSleepMins = sleepTimer ? Math.ceil(sleepTimer / 60) : 0;
    return (
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Sleep Timer</Text>
          <TouchableOpacity onPress={() => setActiveSheet('none')} style={styles.sheetClose}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.optionsList}>
          {SLEEP_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.listOption,
                currentSleepMins === option.value && styles.listOptionActive,
              ]}
              onPress={() => handleSleepSelect(option.value)}
            >
              <Text style={[
                styles.listOptionText,
                currentSleepMins === option.value && styles.listOptionTextActive,
              ]}>
                {option.label}
              </Text>
              {currentSleepMins === option.value && (
                <Ionicons name="checkmark" size={20} color="#C8FF00" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderChaptersSheet = () => (
    <View style={[styles.sheet, styles.chaptersSheet]}>
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>Chapters</Text>
        <TouchableOpacity onPress={() => setActiveSheet('none')} style={styles.sheetClose}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
      <View style={styles.chaptersList}>
        {chapters.map((chapter: any, index: number) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.chapterItem,
              index === chapterIndex && styles.chapterItemActive,
            ]}
            onPress={() => handleChapterSelect(chapter.start)}
          >
            <Text style={styles.chapterNumber}>{index + 1}</Text>
            <View style={styles.chapterInfo}>
              <Text
                style={[
                  styles.chapterTitle,
                  index === chapterIndex && styles.chapterTitleActive,
                ]}
                numberOfLines={1}
              >
                {chapter.title || `Chapter ${index + 1}`}
              </Text>
              <Text style={styles.chapterDuration}>
                {formatTime(chapter.end - chapter.start)}
              </Text>
            </View>
            {index === chapterIndex && (
              <Ionicons name="volume-high" size={16} color="#C8FF00" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================

  if (!isPlayerVisible || !currentBook) return null;

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY: slideAnim }] }]}
      {...panResponder.panHandlers}
    >
      <StatusBar barStyle="light-content" />

      {/* Background */}
      <View style={StyleSheet.absoluteFill}>
        {coverUrl && (
          <Image source={coverUrl} style={styles.backgroundImage} blurRadius={25} />
        )}
        <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)', '#000']}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.swipeIndicator} />
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <Ionicons name="chevron-down" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Now Playing
          </Text>
          <View style={styles.headerButton} />
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Cover Art */}
        <View style={styles.coverContainer}>
          <Image source={coverUrl} style={styles.cover} contentFit="cover" />
        </View>

        {/* Book Info */}
        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle} numberOfLines={2}>{title}</Text>
          <Text style={styles.bookAuthor} numberOfLines={1}>{author}</Text>
          {currentChapter && (
            <Text style={styles.chapterName} numberOfLines={1}>
              {currentChapter.title || `Chapter ${chapterIndex + 1}`}
            </Text>
          )}
        </View>

        {/* Progress Scrubber */}
        <View style={styles.scrubberContainer}>
          <View style={styles.scrubberTrack}>
            <View style={[styles.scrubberFill, { width: `${progressPercent}%` }]} />
            <View style={[styles.scrubberThumb, { left: `${progressPercent}%` }]} />
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Text style={styles.timeText}>{formatTimeRemaining(timeRemaining)}</Text>
          </View>
        </View>

        {/* Main Controls */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={handlePrevChapter} style={styles.controlButton}>
            <Ionicons name="play-skip-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSkipBack} style={styles.controlButton}>
            <View style={styles.skipButtonContent}>
              <Ionicons name="play-back" size={32} color="#FFF" />
              <Text style={styles.skipLabel}>30</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handlePlayPause}
            style={styles.playButton}
            disabled={isLoading}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={40}
              color="#000"
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSkipForward} style={styles.controlButton}>
            <View style={styles.skipButtonContent}>
              <Ionicons name="play-forward" size={32} color="#FFF" />
              <Text style={styles.skipLabel}>30</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNextChapter} style={styles.controlButton}>
            <Ionicons name="play-skip-forward" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Quick Actions - LABELED BUTTONS */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setActiveSheet('speed')}
          >
            <Ionicons name="speedometer-outline" size={22} color="#FFF" />
            <Text style={styles.actionLabel}>{playbackRate}x</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setActiveSheet('sleep')}
          >
            <Ionicons name="moon-outline" size={22} color={sleepTimer ? '#C8FF00' : '#FFF'} />
            <Text style={[styles.actionLabel, sleepTimer && styles.actionLabelActive]}>
              {sleepTimer ? `${Math.ceil(sleepTimer / 60)}m` : 'Sleep'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setActiveSheet('chapters')}
          >
            <Ionicons name="list-outline" size={22} color="#FFF" />
            <Text style={styles.actionLabel}>Chapters</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Sheets */}
      {activeSheet !== 'none' && (
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setActiveSheet('none')}
        >
          <View style={[styles.sheetContainer, { paddingBottom: insets.bottom + 20 }]}>
            {activeSheet === 'speed' && renderSpeedSheet()}
            {activeSheet === 'sleep' && renderSleepSheet()}
            {activeSheet === 'chapters' && renderChaptersSheet()}
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
    backgroundColor: '#000',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  swipeIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },

  // Cover
  coverContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  cover: {
    width: SCREEN_WIDTH - 80,
    height: SCREEN_WIDTH - 80,
    borderRadius: 8,
    backgroundColor: '#333',
  },

  // Book Info
  bookInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  bookTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  chapterName: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },

  // Scrubber
  scrubberContainer: {
    marginBottom: 24,
  },
  scrubberTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    position: 'relative',
  },
  scrubberFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#C8FF00',
    borderRadius: 2,
  },
  scrubberThumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFF',
    marginLeft: -8,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontVariant: ['tabular-nums'],
  },

  // Controls
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 16,
  },
  controlButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonContent: {
    alignItems: 'center',
  },
  skipLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginTop: -4,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#C8FF00',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
  },
  actionButton: {
    alignItems: 'center',
    minWidth: 60,
  },
  actionLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  actionLabelActive: {
    color: '#C8FF00',
  },

  // Bottom Sheet
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  sheet: {
    padding: 20,
  },
  chaptersSheet: {
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  sheetClose: {
    width: 44,
    height: 44,
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
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: '#C8FF00',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  optionTextActive: {
    color: '#000',
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
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  listOptionActive: {
    backgroundColor: 'rgba(200,255,0,0.1)',
  },
  listOptionText: {
    fontSize: 16,
    color: '#FFF',
  },
  listOptionTextActive: {
    color: '#C8FF00',
    fontWeight: '600',
  },

  // Chapters List
  chaptersList: {
    gap: 2,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  chapterItemActive: {
    backgroundColor: 'rgba(200,255,0,0.1)',
  },
  chapterNumber: {
    width: 28,
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  chapterInfo: {
    flex: 1,
    marginRight: 8,
  },
  chapterTitle: {
    fontSize: 15,
    color: '#FFF',
    marginBottom: 2,
  },
  chapterTitleActive: {
    color: '#C8FF00',
    fontWeight: '600',
  },
  chapterDuration: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
});

export default SimplePlayerScreen;
