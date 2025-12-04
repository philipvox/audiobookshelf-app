/**
 * src/features/home/components/NowPlayingCard.tsx
 *
 * Main "Now Playing" card for home screen
 * Layout: InfoTiles (top) -> Cover (middle) -> Controls (below cover)
 */

import React, { useMemo, useRef, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Pressable } from 'react-native';
import { apiClient } from '@/core/api';
import { COLORS } from '../homeDesign';
import { NowPlayingCardProps } from '../types';
import { CoverArtwork } from './CoverArtwork';
import { InfoTiles } from './InfoTiles';
import { PlaybackControls } from './PlaybackControls';

const LONG_PRESS_DELAY = 500; // ms to trigger long press

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

export function NowPlayingCard({
  book,
  progress,
  isPlaying,
  playbackSpeed,
  sleepTimer,
  onPress,
  onLongPress,
  onPlay,
  onSkipBack,
  onSkipForward,
}: NowPlayingCardProps & { onLongPress?: () => void }) {
  const coverUrl = apiClient.getItemCoverUrl(book.id);
  const title = book.media?.metadata?.title || 'Untitled';

  // Handle cover long press to open full player
  const handleCoverLongPress = useCallback(() => {
    if (onLongPress) {
      onLongPress();
    }
  }, [onLongPress]);

  // Get current chapter info
  const chapters = (book.media as any)?.chapters || [];
  const chapterNumber = useMemo(() => {
    if (chapters.length && progress) {
      const currentTime = progress.currentTime;
      const currentChapter = chapters.find((ch: any, i: number) => {
        const nextChapter = chapters[i + 1];
        const chapterEnd = nextChapter?.start || progress.duration;
        return currentTime >= ch.start && currentTime < chapterEnd;
      });
      if (currentChapter) {
        return chapters.indexOf(currentChapter) + 1;
      }
    }
    // Check extended progress properties (some implementations include currentChapter)
    const extendedProgress = progress as any;
    if (extendedProgress?.currentChapter !== undefined) {
      return extendedProgress.currentChapter + 1;
    }
    return 1;
  }, [chapters, progress]);

  // Format time as HH:MM:SS
  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Calculate time remaining
  const timeRemaining = useMemo(() => {
    if (!progress) return '00:00:00';
    const remaining = progress.duration - progress.currentTime;
    return formatTime(Math.max(0, remaining));
  }, [progress]);

  // Sleep timer in minutes (already converted by HomeScreen)
  const sleepTimerMinutes = sleepTimer ?? 0;

  // Cover dimensions
  const coverSize = scale(263);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.95}
    >
      {/* Info Tiles - TOP */}
      <View style={styles.infoContainer}>
        <InfoTiles
          title={title}
          chapterNumber={chapterNumber}
          timeRemaining={timeRemaining}
          sleepTimerMinutes={sleepTimerMinutes}
          playbackSpeed={playbackSpeed}
        />
      </View>

      {/* Cover Artwork - long press to open full player */}
      <Pressable
        style={styles.coverContainer}
        onLongPress={handleCoverLongPress}
        delayLongPress={LONG_PRESS_DELAY}
      >
        <CoverArtwork coverUrl={coverUrl} size={coverSize} />
      </Pressable>

      {/* Playback Controls - BELOW cover */}
      <View style={styles.controlsContainer}>
        <PlaybackControls
          isPlaying={isPlaying}
          onPlay={onPlay}
          onPause={onPlay}
          onSkipForward={onSkipForward}
          onSkipBackward={onSkipBack}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: scale(382),
  },
  infoContainer: {
    width: '100%',
    marginBottom: scale(42),
  },
  coverContainer: {
    alignItems: 'center',
    zIndex: 100,
  },
  controlsContainer: {
    alignItems: 'center',
    marginTop: scale(-5), // Pull up under the cover
    zIndex: 1, // Below cover (zIndex: 100)
  },
});
