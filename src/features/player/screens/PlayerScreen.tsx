/**
 * src/features/player/screens/PlayerScreen.tsx
 *
 * Redesigned player screen with:
 * - Full-bleed cover art
 * - Waveform progress bar
 * - Quick actions row
 * - Skeuomorphic playback controls
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Text,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { usePlayerStore } from '../stores/playerStore';
import { useMyLibraryStore } from '@/features/library/stores/myLibraryStore';
import { apiClient } from '@/core/api';
import { Icon } from '@/shared/components/Icon';
import { getTitle } from '@/shared/utils/metadata';

import { SCREEN_HEIGHT, REWIND_STEP, REWIND_INTERVAL, FF_STEP } from '../constants';
import { formatTime } from '../utils';
import {
  PlayerControls,
  WaveformProgress,
  QuickActionsRow,
} from '../components';
import {
  SpeedPanel,
  SleepPanel,
  ChaptersPanel,
} from '../panels';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_SIZE = SCREEN_WIDTH - 40;

type PanelMode = 'none' | 'speed' | 'sleep' | 'chapters';

export function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // Panel state
  const [panelMode, setPanelMode] = useState<PanelMode>('none');
  const [tempSpeed, setTempSpeed] = useState(1);
  const [tempSleepMins, setTempSleepMins] = useState(15);
  const [sleepInputValue, setSleepInputValue] = useState('15');
  const [controlMode, setControlMode] = useState<'rewind' | 'chapter'>('rewind');

  // Rewind/FF state
  const [isRewinding, setIsRewinding] = useState(false);
  const [isFastForwarding, setIsFastForwarding] = useState(false);
  const [seekDelta, setSeekDelta] = useState(0);

  // Refs
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const panelAnim = useRef(new Animated.Value(0)).current;
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

  const { isInLibrary, addToLibrary, removeFromLibrary } = useMyLibraryStore();

  const coverUrl = currentBook ? apiClient.getItemCoverUrl(currentBook.id) : '';
  const isFavorite = currentBook ? isInLibrary(currentBook.id) : false;

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

  // Panel animation
  const showPanel = useCallback((mode: PanelMode) => {
    if (mode === 'speed') setTempSpeed(playbackRate);
    setPanelMode(mode);
    Animated.timing(panelAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [panelAnim, playbackRate]);

  const hidePanel = useCallback(() => {
    Animated.timing(panelAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setPanelMode('none'));
  }, [panelAnim]);

  // Close handler
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
      setPanelMode('none');
      panelAnim.setValue(0);
    });
  }, [closePlayer, slideAnim, panelAnim]);

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

  const progress = bookDuration > 0 ? position / bookDuration : 0;

  // Handlers
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
    const targetIdx = position - currentChapterStart > 3 ? currentIdx : Math.max(0, currentIdx - 1);
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

  const handleLeftPressIn = () => {
    if (controlMode === 'rewind') startRewind();
  };
  const handleLeftPressOut = () => {
    if (controlMode === 'rewind') stopRewind();
  };
  const handleLeftPress = () => {
    if (controlMode === 'chapter') handlePrevChapter();
  };
  const handleRightPressIn = () => {
    if (controlMode === 'rewind') startFastForward();
  };
  const handleRightPressOut = () => {
    if (controlMode === 'rewind') stopFastForward();
  };
  const handleRightPress = () => {
    if (controlMode === 'chapter') handleNextChapter();
  };

  const handleProgressScrub = async (percent: number) => {
    const newPosition = Math.max(0, Math.min(bookDuration, percent * bookDuration));
    await seekTo(newPosition);
  };

  const handleFavoritePress = () => {
    if (!currentBook) return;
    if (isFavorite) {
      removeFromLibrary(currentBook.id);
    } else {
      addToLibrary(currentBook.id);
    }
  };

  // Panel overlay opacity
  const panelOpacity = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Icon name="chevron-down" size={28} color="#FFFFFF" set="ionicons" />
        </TouchableOpacity>

        {/* Cover Art */}
        <View style={styles.coverContainer}>
          <Image
            source={coverUrl}
            style={styles.cover}
            contentFit="cover"
            transition={300}
          />
        </View>

        {/* Title and Chapter Row */}
        <View style={styles.metadataRow}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <TouchableOpacity onPress={() => showPanel('chapters')}>
            <Text style={styles.chapter}>{chapterTitle}</Text>
          </TouchableOpacity>
        </View>

        {/* Waveform Progress */}
        <WaveformProgress
          progress={progress}
          onSeek={handleProgressScrub}
          isPlaying={isPlaying}
        />

        {/* Quick Actions Row */}
        <QuickActionsRow
          currentTime={position}
          sleepTimer={sleepTimer}
          isFavorite={isFavorite}
          playbackRate={playbackRate}
          onSleepPress={() => showPanel('sleep')}
          onFavoritePress={handleFavoritePress}
          onSpeedPress={() => showPanel('speed')}
        />

        {/* Playback Controls */}
        <PlayerControls
          isPlaying={isPlaying}
          isLoading={isLoading || false}
          isRewinding={isRewinding}
          isFastForwarding={isFastForwarding}
          seekDelta={seekDelta}
          controlMode={controlMode}
          onPlayPause={handlePlayPause}
          onLeftPress={handleLeftPress}
          onLeftPressIn={handleLeftPressIn}
          onLeftPressOut={handleLeftPressOut}
          onRightPress={handleRightPress}
          onRightPressIn={handleRightPressIn}
          onRightPressOut={handleRightPressOut}
        />
      </View>

      {/* Panel Overlay */}
      {panelMode !== 'none' && (
        <Animated.View style={[styles.panelOverlay, { opacity: panelOpacity }]}>
          <TouchableOpacity style={styles.panelBackdrop} onPress={hidePanel} />
          <View style={[styles.panelContainer, { paddingBottom: insets.bottom + 20 }]}>
            {panelMode === 'speed' && (
              <SpeedPanel
                tempSpeed={tempSpeed}
                setTempSpeed={setTempSpeed}
                onApply={() => {
                  usePlayerStore.getState().setPlaybackRate(tempSpeed);
                  hidePanel();
                }}
                onClose={hidePanel}
                isLight={false}
              />
            )}

            {panelMode === 'sleep' && (
              <SleepPanel
                tempSleepMins={tempSleepMins}
                setTempSleepMins={setTempSleepMins}
                sleepInputValue={sleepInputValue}
                setSleepInputValue={setSleepInputValue}
                onClear={() => {
                  usePlayerStore.getState().clearSleepTimer?.();
                  hidePanel();
                }}
                onStart={() => {
                  if (tempSleepMins > 0) {
                    usePlayerStore.getState().setSleepTimer?.(tempSleepMins);
                  }
                  hidePanel();
                }}
                isLight={false}
              />
            )}

            {panelMode === 'chapters' && (
              <ChaptersPanel
                chapters={chapters}
                currentChapter={currentChapter}
                onChapterSelect={(start) => {
                  seekTo(start);
                  hidePanel();
                }}
                onClose={hidePanel}
                isLight={false}
              />
            )}
          </View>
        </Animated.View>
      )}
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
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  closeButton: {
    alignSelf: 'center',
    padding: 8,
    marginBottom: 16,
  },
  coverContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  cover: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingHorizontal: 0,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 16,
  },
  chapter: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  // Panel styles
  panelOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  panelBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  panelContainer: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
});
