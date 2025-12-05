/**
 * src/features/home/components/NowPlayingCard.tsx
 *
 * Main "Now Playing" card for home screen
 * Layout: InfoTiles (top) -> Cover (middle) -> Controls (below cover)
 * Heart and Download buttons below controls
 */

import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Pressable, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useCoverUrl } from '@/core/cache';
import { COLORS } from '../homeDesign';
import { NowPlayingCardProps } from '../types';
import { CassetteCover } from './CassetteCover';
import { InfoTiles } from './InfoTiles';
import { PlaybackControls } from './PlaybackControls';
import { HeartButton } from '@/shared/components';

// SVG Icons
const DownloadIcon = ({ size = 24, color = '#B3B3B3' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 21 21" fill="none">
    <Path
      d="M18.375 13.125V16.625C18.375 17.0891 18.1906 17.5342 17.8624 17.8624C17.5342 18.1906 17.0891 18.375 16.625 18.375H4.375C3.91087 18.375 3.46575 18.1906 3.13756 17.8624C2.80937 17.5342 2.625 17.0891 2.625 16.625V13.125M6.125 8.75L10.5 13.125M10.5 13.125L14.875 8.75M10.5 13.125V2.625"
      stroke={color}
      strokeWidth={1.97}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

export function NowPlayingCard({
  book,
  progress,
  isPlaying,
  playbackSpeed,
  sleepTimer,
  onPress,
  onCoverPress,
  onPlay,
  onSkipBack,
  onSkipForward,
  onSkipBackPressIn,
  onSkipBackPressOut,
  onSkipForwardPressIn,
  onSkipForwardPressOut,
  onSpeedPress,
  onSleepPress,
  onDownloadPress,
  onClosePanel,
  onLongPress,
  isSeeking,
  seekDelta,
  seekDirection,
  panelMode,
  panelContent,
}: NowPlayingCardProps & {
  onCoverPress?: () => void;
  onSkipBackPressIn?: () => void;
  onSkipBackPressOut?: () => void;
  onSkipForwardPressIn?: () => void;
  onSkipForwardPressOut?: () => void;
  onSpeedPress?: () => void;
  onSleepPress?: () => void;
  onDownloadPress?: () => void;
  onClosePanel?: () => void;
  onLongPress?: () => void;
  isSeeking?: boolean;
  seekDelta?: number;
  seekDirection?: 'forward' | 'backward' | null;
  panelMode?: string;
  panelContent?: React.ReactNode;
}) {
  const coverUrl = useCoverUrl(book.id);
  const title = book.media?.metadata?.title || 'Untitled';

  // Track fast forward / rewind state for cassette animation
  const [isFastForward, setIsFastForward] = useState(false);
  const [isRewinding, setIsRewinding] = useState(false);

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
  const coverSize = scale(220);

  // Playback progress for cassette (0-1) - based on current chapter
  const playbackProgress = useMemo(() => {
    if (!progress || !progress.duration) return 0;

    // Find current chapter bounds
    if (chapters.length > 0) {
      const currentTime = progress.currentTime;
      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        const nextChapter = chapters[i + 1];
        const chapterStart = chapter.start || 0;
        const chapterEnd = nextChapter?.start || progress.duration;

        if (currentTime >= chapterStart && currentTime < chapterEnd) {
          // Calculate progress within this chapter
          const chapterDuration = chapterEnd - chapterStart;
          if (chapterDuration <= 0) return 0;
          const chapterProgress = (currentTime - chapterStart) / chapterDuration;
          return Math.min(1, Math.max(0, chapterProgress));
        }
      }
    }

    // Fallback to book progress if no chapters
    return Math.min(1, Math.max(0, progress.currentTime / progress.duration));
  }, [progress?.currentTime, progress?.duration, chapters]);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.95}
    >
      {/* Info Tiles - TOP (always visible) */}
      <View style={panelMode && panelMode !== 'none' ? styles.infoContainerPanel : styles.infoContainer}>
        <InfoTiles
          title={title}
          chapterNumber={chapterNumber}
          timeRemaining={timeRemaining}
          sleepTimerMinutes={sleepTimerMinutes}
          playbackSpeed={playbackSpeed}
          onSpeedPress={onSpeedPress}
          onSleepPress={onSleepPress}
          isSeeking={isSeeking}
          seekDelta={seekDelta}
          seekDirection={seekDirection}
        />
      </View>

      {/* Panel OR Cover+Controls */}
      {panelMode && panelMode !== 'none' && panelContent ? (
        <View style={styles.panelContainer}>
          {/* Close button */}
          <TouchableOpacity style={styles.panelCloseButton} onPress={onClosePanel}>
            <Text style={styles.panelCloseText}>✕</Text>
          </TouchableOpacity>
          {panelContent}
        </View>
      ) : (
        <>
          {/* Cassette Cover - tap for details, long press for player */}
          <Pressable
            style={styles.coverContainer}
            onPress={onCoverPress}
            onLongPress={onLongPress}
            delayLongPress={400}
          >
            <CassetteCover
              coverUrl={coverUrl}
              width={coverSize}
              progress={playbackProgress}
              isPlaying={isPlaying}
              isFastForward={isFastForward}
              isRewinding={isRewinding}
            />
          </Pressable>

          {/* Playback Controls - BELOW cover */}
          <View style={styles.controlsContainer}>
            <PlaybackControls
              isPlaying={isPlaying}
              onPlay={onPlay}
              onPause={onPlay}
              onSkipForward={onSkipForward}
              onSkipBackward={onSkipBack}
              onSkipForwardPressIn={() => {
                setIsFastForward(true);
                onSkipForwardPressIn?.();
              }}
              onSkipForwardPressOut={() => {
                setIsFastForward(false);
                onSkipForwardPressOut?.();
              }}
              onSkipBackwardPressIn={() => {
                setIsRewinding(true);
                onSkipBackPressIn?.();
              }}
              onSkipBackwardPressOut={() => {
                setIsRewinding(false);
                onSkipBackPressOut?.();
              }}
            />
          </View>

          {/* Heart and Download buttons row */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={styles.actionButton} onPress={onDownloadPress}>
              <DownloadIcon size={scale(24)} color="#B3B3B3" />
            </TouchableOpacity>
            <HeartButton
              bookId={book.id}
              size={scale(18)}
              style={styles.actionButton}
            />
          </View>
        </>
      )}
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
  infoContainerPanel: {
    width: '100%',
    marginBottom: scale(16),
  },
  coverContainer: {
    alignItems: 'center',
    zIndex: 100,
  },
  panelContainer: {
    width: '100%',
    paddingHorizontal: scale(10),
  },
  controlsContainer: {
    alignItems: 'center',
    marginTop: scale(-5), // Pull up under the cover
    zIndex: 1, // Below cover (zIndex: 100)
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: scale(20),
    marginTop: scale(8),
  },
  actionButton: {
    width: scale(44),
    height: scale(44),
    justifyContent: 'center',
    alignItems: 'center',
  },
  panelCloseButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: scale(40),
    height: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  panelCloseText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: scale(20),
    fontWeight: '300',
  },
});
