/**
 * src/features/player/screens/PlayerScreen.tsx
 *
 * Redesigned media player with dark glass-like UI
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Text,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { usePlayerStore } from '../stores/playerStore';
import { apiClient } from '@/core/api';
import { Icon } from '@/shared/components/Icon';
import { getTitle } from '@/shared/utils/metadata';

import {
  SCREEN_HEIGHT,
  PLAYER_PADDING,
  BUTTON_GAP,
  DISPLAY_WIDTH,
  DISPLAY_PADDING,
  COVER_SIZE,
  RADIUS,
  REWIND_STEP,
  REWIND_INTERVAL,
  FF_STEP,
} from '../constants';
import { formatTime } from '../utils';
import {
  GradientPanel,
  AudioWaveform,
  PlayerControls,
} from '../components';
import {
  DetailsPanel,
  SpeedPanel,
  SleepPanel,
  ChaptersPanel,
  SettingsPanel,
} from '../panels';

// Panel configuration
const PANEL_CONFIG = {
  borderRadius: 5,
  innerPadding: 10,
};

type FlipMode = 'details' | 'speed' | 'sleep' | 'chapters' | 'settings';

export function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // UI state
  const [isFlipped, setIsFlipped] = useState(false);
  const [flipMode, setFlipMode] = useState<FlipMode>('details');

  // Panel state
  const [tempSpeed, setTempSpeed] = useState(1);
  const [tempSleepMins, setTempSleepMins] = useState(15);
  const [sleepInputValue, setSleepInputValue] = useState('15');
  const [controlMode, setControlMode] = useState<'rewind' | 'chapter'>('rewind');
  const [progressMode, setProgressMode] = useState<'bar' | 'chapters'>('chapters');

  // Rewind/FF state
  const [isRewinding, setIsRewinding] = useState(false);
  const [isFastForwarding, setIsFastForwarding] = useState(false);
  const [seekDelta, setSeekDelta] = useState(0);

  // Refs
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const flipAnim = useRef(new Animated.Value(0)).current;
  const rewindInterval = useRef<NodeJS.Timeout | null>(null);
  const ffInterval = useRef<NodeJS.Timeout | null>(null);
  const seekingPos = useRef(0);
  const wasPlaying = useRef(false);
  const isSeeking = useRef(false);
  const startPosition = useRef(0);

  // Store
  const {
    currentBook,
    isPlayerVisible,
    isPlaying,
    isLoading,
    position,
    duration: storeDuration,
    playbackRate,
    sleepTimer,
    closePlayer,
    play,
    pause,
    seekTo,
  } = usePlayerStore();

  const coverUrl = currentBook ? apiClient.getItemCoverUrl(currentBook.id) : '';

  // Slide animation
  useEffect(() => {
    if (isPlayerVisible && currentBook) {
      slideAnim.setValue(SCREEN_HEIGHT);
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 55,
        friction: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [isPlayerVisible, currentBook?.id]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (rewindInterval.current) clearInterval(rewindInterval.current);
      if (ffInterval.current) clearInterval(ffInterval.current);
    };
  }, []);

  // Sync seeking position
  useEffect(() => {
    seekingPos.current = position;
  }, [position]);

  // Handlers
  const handleClose = useCallback(() => {
    if (rewindInterval.current) clearInterval(rewindInterval.current);
    if (ffInterval.current) clearInterval(ffInterval.current);
    setIsRewinding(false);
    setIsFastForwarding(false);
    setSeekDelta(0);

    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      closePlayer();
      setIsFlipped(false);
      setFlipMode('details');
      flipAnim.setValue(0);
    });
  }, [closePlayer, slideAnim, flipAnim]);

  // Navigation handlers for DetailsPanel
  const handleNavigateToAuthor = useCallback((authorName: string) => {
    handleClose();
    setTimeout(() => {
      navigation.navigate('AuthorDetail' as never, { authorName } as never);
    }, 150);
  }, [navigation, handleClose]);

  const handleNavigateToNarrator = useCallback((narratorName: string) => {
    handleClose();
    setTimeout(() => {
      navigation.navigate('NarratorDetail' as never, { narratorName } as never);
    }, 150);
  }, [navigation, handleClose]);

  const handleNavigateToSeries = useCallback((seriesName: string) => {
    handleClose();
    setTimeout(() => {
      navigation.navigate('SeriesDetail' as never, { seriesName } as never);
    }, 150);
  }, [navigation, handleClose]);

  if (!isPlayerVisible || !currentBook) return null;

  // Derived values
  const title = getTitle(currentBook);
  const chapters = currentBook.media?.chapters || [];

  let bookDuration = currentBook.media?.duration || 0;
  if (bookDuration <= 0 && storeDuration > 0) bookDuration = storeDuration;
  if (bookDuration <= 0 && chapters.length > 0) {
    bookDuration = chapters[chapters.length - 1].end || 0;
  }

  const currentChapter = chapters.find((ch, idx) => {
    const next = chapters[idx + 1];
    return position >= ch.start && (!next || position < next.start);
  });
  const chapterIndex = currentChapter ? chapters.indexOf(currentChapter) + 1 : 1;
  const chapterTitle = `Chapter ${chapterIndex}`;

  // Handlers
  const handleFlip = (mode: FlipMode = 'details') => {
    if (isFlipped && flipMode === mode) {
      setIsFlipped(false);
      Animated.timing(flipAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    } else if (isFlipped && flipMode !== mode) {
      setFlipMode(mode);
      if (mode === 'speed') setTempSpeed(playbackRate);
    } else {
      setFlipMode(mode);
      if (mode === 'speed') setTempSpeed(playbackRate);
      setIsFlipped(true);
      Animated.timing(flipAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  };

  const handleFlipBack = () => {
    setIsFlipped(false);
    Animated.timing(flipAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  };

  const handlePlayPause = async () => {
    if (isPlaying) await pause();
    else await play();
  };

  const handlePrevChapter = async () => {
    const storeChapters = usePlayerStore.getState().chapters;
    const chapterList = storeChapters.length > 0 ? storeChapters : chapters;

    if (chapterList.length === 0) return;

    let currentIdx = 0;
    for (let i = chapterList.length - 1; i >= 0; i--) {
      if (position >= chapterList[i].start) {
        currentIdx = i;
        break;
      }
    }

    const currentChapterStart = chapterList[currentIdx]?.start || 0;
    const targetIdx = (position - currentChapterStart > 3) ? currentIdx : Math.max(0, currentIdx - 1);

    await seekTo(chapterList[targetIdx].start);
  };

  const handleNextChapter = async () => {
    const storeChapters = usePlayerStore.getState().chapters;
    const chapterList = storeChapters.length > 0 ? storeChapters : chapters;

    if (chapterList.length === 0) return;

    let currentIdx = 0;
    for (let i = chapterList.length - 1; i >= 0; i--) {
      if (position >= chapterList[i].start) {
        currentIdx = i;
        break;
      }
    }

    if (currentIdx < chapterList.length - 1) {
      await seekTo(chapterList[currentIdx + 1].start);
    }
  };

  // Rewind handlers
  const startRewind = async () => {
    if (isRewinding) return;
    setIsRewinding(true);
    wasPlaying.current = isPlaying;
    startPosition.current = position;
    seekingPos.current = position;
    isSeeking.current = false;
    setSeekDelta(0);
    await pause();

    const doRewind = () => {
      if (isSeeking.current) return;
      isSeeking.current = true;
      seekingPos.current = Math.max(0, seekingPos.current - REWIND_STEP);
      setSeekDelta(seekingPos.current - startPosition.current);

      seekTo(seekingPos.current).finally(() => {
        isSeeking.current = false;
        if (seekingPos.current <= 0 && rewindInterval.current) {
          clearInterval(rewindInterval.current);
          rewindInterval.current = null;
          setIsRewinding(false);
          setSeekDelta(0);
        }
      });
    };

    doRewind();
    rewindInterval.current = setInterval(doRewind, REWIND_INTERVAL);
  };

  const stopRewind = async () => {
    if (rewindInterval.current) clearInterval(rewindInterval.current);
    rewindInterval.current = null;
    setIsRewinding(false);
    setSeekDelta(0);
    if (wasPlaying.current) await play();
  };

  const startFastForward = async () => {
    if (isFastForwarding) return;
    setIsFastForwarding(true);
    wasPlaying.current = isPlaying;
    startPosition.current = position;
    seekingPos.current = position;
    isSeeking.current = false;
    setSeekDelta(0);
    await pause();

    const doFF = () => {
      if (isSeeking.current) return;
      isSeeking.current = true;
      seekingPos.current = Math.min(bookDuration - 1, seekingPos.current + FF_STEP);
      setSeekDelta(seekingPos.current - startPosition.current);

      seekTo(seekingPos.current).finally(() => {
        isSeeking.current = false;
        if (seekingPos.current >= bookDuration - 1 && ffInterval.current) {
          clearInterval(ffInterval.current);
          ffInterval.current = null;
          setIsFastForwarding(false);
          setSeekDelta(0);
        }
      });
    };

    doFF();
    ffInterval.current = setInterval(doFF, REWIND_INTERVAL);
  };

  const stopFastForward = async () => {
    if (ffInterval.current) clearInterval(ffInterval.current);
    ffInterval.current = null;
    setIsFastForwarding(false);
    setSeekDelta(0);
    if (wasPlaying.current) await play();
  };

  const handleLeftPressIn = () => { if (controlMode === 'rewind') startRewind(); };
  const handleLeftPressOut = () => { if (controlMode === 'rewind') stopRewind(); };
  const handleLeftPress = () => { if (controlMode === 'chapter') handlePrevChapter(); };
  const handleRightPressIn = () => { if (controlMode === 'rewind') startFastForward(); };
  const handleRightPressOut = () => { if (controlMode === 'rewind') stopFastForward(); };
  const handleRightPress = () => { if (controlMode === 'chapter') handleNextChapter(); };

  // Flip animations
  const frontOpacity = flipAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const backOpacity = flipAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  // Dynamic text color based on if flipped panel is visible
  const isLight = false; // Always dark theme for the new design

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

      <View style={[styles.mainContent, { paddingTop: insets.top + 8 }]}>
        {/* Display Panel */}
        <View style={styles.displayContainer}>
          <GradientPanel variant="display" style={styles.displayPanel}>
            <View style={styles.displayContent}>
              {/* Cover Art Container */}
              <View style={styles.coverContainer}>
                {/* Front - Cover Image */}
                <Animated.View
                  style={[styles.coverFace, { opacity: frontOpacity }]}
                  pointerEvents={isFlipped ? 'none' : 'auto'}
                >
                  <TouchableOpacity onPress={() => handleFlip('details')} activeOpacity={0.9}>
                    <View style={styles.artworkWrapper}>
                      <Image source={coverUrl} style={styles.artwork} contentFit="cover" transition={300} />
                      <View style={styles.artworkBorder} />
                    </View>
                  </TouchableOpacity>
                </Animated.View>

                {/* Back - Panel */}
                <Animated.View
                  style={[
                    styles.coverFace,
                    styles.coverBack,
                    { opacity: backOpacity }
                  ]}
                  pointerEvents={isFlipped ? 'auto' : 'none'}
                >
                  <TouchableOpacity style={styles.flipCloseButton} onPress={handleFlipBack}>
                    <Icon name="close" size={24} color="rgba(255,255,255,0.5)" set="ionicons" />
                  </TouchableOpacity>

                  {flipMode === 'details' && (
                    <DetailsPanel
                      book={currentBook}
                      duration={bookDuration}
                      chaptersCount={chapters.length}
                      isLight={isLight}
                      onNavigateToAuthor={handleNavigateToAuthor}
                      onNavigateToNarrator={handleNavigateToNarrator}
                      onNavigateToSeries={handleNavigateToSeries}
                    />
                  )}

                  {flipMode === 'speed' && (
                    <SpeedPanel
                      tempSpeed={tempSpeed}
                      setTempSpeed={setTempSpeed}
                      onApply={() => {
                        usePlayerStore.getState().setPlaybackRate(tempSpeed);
                        handleFlipBack();
                      }}
                      onClose={handleFlipBack}
                      isLight={isLight}
                    />
                  )}

                  {flipMode === 'sleep' && (
                    <SleepPanel
                      tempSleepMins={tempSleepMins}
                      setTempSleepMins={setTempSleepMins}
                      sleepInputValue={sleepInputValue}
                      setSleepInputValue={setSleepInputValue}
                      onClear={() => {
                        usePlayerStore.getState().clearSleepTimer?.();
                        handleFlipBack();
                      }}
                      onStart={() => {
                        if (tempSleepMins > 0) {
                          usePlayerStore.getState().setSleepTimer?.(tempSleepMins);
                        }
                        handleFlipBack();
                      }}
                      isLight={isLight}
                    />
                  )}

                  {flipMode === 'chapters' && (
                    <ChaptersPanel
                      chapters={chapters}
                      currentChapter={currentChapter}
                      onChapterSelect={(start) => {
                        seekTo(start);
                        handleFlipBack();
                      }}
                      onClose={handleFlipBack}
                      isLight={isLight}
                    />
                  )}

                  {flipMode === 'settings' && (
                    <SettingsPanel
                      controlMode={controlMode}
                      progressMode={progressMode}
                      onControlModeChange={setControlMode}
                      onProgressModeChange={setProgressMode}
                      onViewChapters={() => setFlipMode('chapters')}
                      onViewDetails={() => setFlipMode('details')}
                      isLight={isLight}
                    />
                  )}
                </Animated.View>
              </View>

              {/* Title Row */}
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={2}>
                  {title}
                </Text>
                <TouchableOpacity onPress={() => handleFlip('chapters')}>
                  <Text style={styles.chapter}>{chapterTitle}</Text>
                </TouchableOpacity>
              </View>

              {/* Waveform */}
              <AudioWaveform color="rgba(255,255,255,0.4)" isPlaying={isPlaying} />

              {/* Controls Row */}
              <View style={styles.controlsRow}>
                <Text style={styles.time}>{formatTime(position)}</Text>

                <TouchableOpacity style={styles.controlItem} onPress={() => handleFlip('sleep')}>
                  {sleepTimer !== null ? (
                    <Text style={styles.sleepTimer}>{Math.ceil(sleepTimer / 60)}m</Text>
                  ) : (
                    <>
                      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                        <Path
                          d="M12 3C7.03 3 3 7.03 3 12H0L4 16L8 12H5C5 8.13 8.13 5 12 5C15.87 5 19 8.13 19 12C19 15.87 15.87 19 12 19C10.07 19 8.32 18.21 7.06 16.94L5.64 18.36C7.27 19.99 9.51 21 12 21C16.97 21 21 16.97 21 12C21 7.03 16.97 3 12 3Z"
                          fill="rgba(255,255,255,0.5)"
                        />
                      </Svg>
                      <Text style={styles.controlText}>1m</Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.controlItem}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z"
                      stroke="rgba(255,255,255,0.5)"
                      strokeWidth={2}
                      fill="none"
                    />
                  </Svg>
                </View>

                <TouchableOpacity onPress={() => handleFlip('speed')}>
                  <Text style={styles.speed}>{playbackRate}x</Text>
                </TouchableOpacity>
              </View>
            </View>
          </GradientPanel>
        </View>

        {/* Controls */}
        <PlayerControls
          isPlaying={isPlaying}
          isLoading={isLoading || false}
          isRewinding={isRewinding}
          isFastForwarding={isFastForwarding}
          seekDelta={seekDelta}
          controlMode={controlMode}
          cardColor="#262626"
          textColor="white"
          onPlayPause={handlePlayPause}
          onLeftPress={handleLeftPress}
          onLeftPressIn={handleLeftPressIn}
          onLeftPressOut={handleLeftPressOut}
          onRightPress={handleRightPress}
          onRightPressIn={handleRightPressIn}
          onRightPressOut={handleRightPressOut}
        />
      </View>

      {/* Close button at bottom */}
      <TouchableOpacity
        style={[styles.closeButton, { bottom: insets.bottom + 16 }]}
        onPress={handleClose}
      >
        <Icon name="chevron-down" size={32} color="rgba(255,255,255,0.5)" set="ionicons" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1a1a1a',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  displayContainer: {
    marginHorizontal: PLAYER_PADDING,
  },
  displayPanel: {
    width: DISPLAY_WIDTH,
  },
  displayContent: {
    padding: DISPLAY_PADDING,
  },
  coverContainer: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    marginBottom: 16,
  },
  coverFace: {
    position: 'absolute',
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: PANEL_CONFIG.borderRadius,
  },
  coverBack: {
    backgroundColor: '#333',
    padding: PANEL_CONFIG.innerPadding,
    overflow: 'visible',
  },
  artworkWrapper: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: 11,
    overflow: 'hidden',
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  artworkBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 11,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  flipCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    lineHeight: 26,
    marginRight: 12,
  },
  chapter: {
    fontFamily: 'Courier',
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontVariant: ['tabular-nums'],
  },
  controlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  controlText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  sleepTimer: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '600',
  },
  speed: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
  },
  closeButton: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    padding: 8,
  },
});
