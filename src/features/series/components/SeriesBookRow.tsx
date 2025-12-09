/**
 * src/features/series/components/SeriesBookRow.tsx
 *
 * Enhanced book row for series with download status, progress, and highlighting.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { LibraryItem } from '@/core/types';
import { useCoverUrl } from '@/core/cache';
import { useDownloadStatus, useDownloads } from '@/core/hooks/useDownloads';
import { usePlayerStore } from '@/features/player';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

const ACCENT = '#c1f40c';

interface SeriesBookRowProps {
  book: LibraryItem;
  sequenceNumber: number;
  isNowPlaying: boolean;
  isUpNext: boolean;
  onPress: () => void;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Progress Ring for downloading
function ProgressRing({ progress, size = 24 }: { progress: number; size?: number }) {
  const strokeWidth = 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={ACCENT}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

export function SeriesBookRow({
  book,
  sequenceNumber,
  isNowPlaying,
  isUpNext,
  onPress,
}: SeriesBookRowProps) {
  const coverUrl = useCoverUrl(book.id);
  const { isDownloaded, isDownloading, progress: downloadProgress } = useDownloadStatus(book.id);
  const { queueDownload } = useDownloads();
  const { loadBook, play, pause, isPlaying } = usePlayerStore();

  const metadata = book.media?.metadata as any;
  const title = metadata?.title || 'Unknown';
  const duration = book.media?.duration || 0;

  // Get listening progress
  const userProgress = (book as any).userMediaProgress?.progress || 0;
  const isCompleted = userProgress >= 0.95;
  const progressPercent = Math.round(userProgress * 100);

  // Handle download press
  const handleDownloadPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    queueDownload(book);
  }, [book, queueDownload]);

  // Handle play press
  const handlePlayPress = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isNowPlaying && isPlaying) {
      await pause();
    } else if (isNowPlaying) {
      await play();
    } else {
      await loadBook(book, { autoPlay: true, showPlayer: true });
    }
  }, [book, isNowPlaying, isPlaying, loadBook, play, pause]);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isNowPlaying && styles.containerNowPlaying,
        isUpNext && !isNowPlaying && styles.containerUpNext,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Cover with status overlay */}
      <View style={styles.coverContainer}>
        <Image
          source={coverUrl}
          style={[
            styles.cover,
            !isDownloaded && !isDownloading && styles.coverNotDownloaded,
          ]}
          contentFit="cover"
        />

        {/* Status indicator on cover */}
        {isDownloaded && !isNowPlaying && (
          <View style={styles.statusBadge}>
            <Ionicons name="checkmark" size={scale(10)} color="#000" />
          </View>
        )}
        {isNowPlaying && (
          <View style={[styles.statusBadge, styles.statusBadgePlaying]}>
            <Ionicons name="volume-high" size={scale(10)} color="#000" />
          </View>
        )}
      </View>

      {/* Book info */}
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, isNowPlaying && styles.titleNowPlaying]} numberOfLines={1}>
            {sequenceNumber}. {title}
          </Text>
          {isNowPlaying && (
            <View style={styles.nowPlayingBadge}>
              <Text style={styles.nowPlayingText}>NOW PLAYING</Text>
            </View>
          )}
          {isUpNext && !isNowPlaying && (
            <View style={styles.upNextBadge}>
              <Text style={styles.upNextText}>UP NEXT</Text>
            </View>
          )}
        </View>

        {/* Progress section */}
        {isCompleted ? (
          <View style={styles.statusRow}>
            <Ionicons name="checkmark-circle" size={scale(14)} color={ACCENT} />
            <Text style={styles.completedText}>Completed</Text>
          </View>
        ) : userProgress > 0 ? (
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.progressText}>{progressPercent}%</Text>
          </View>
        ) : (
          <Text style={styles.durationText}>{formatDuration(duration)}</Text>
        )}
      </View>

      {/* Right action button */}
      <View style={styles.actionContainer}>
        {isDownloading ? (
          <View style={styles.downloadingIndicator}>
            <ProgressRing progress={downloadProgress} size={scale(28)} />
          </View>
        ) : isDownloaded ? (
          <TouchableOpacity
            style={styles.playButton}
            onPress={handlePlayPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isNowPlaying && isPlaying ? 'pause' : 'play'}
              size={scale(18)}
              color={isNowPlaying ? '#000' : 'rgba(255,255,255,0.7)'}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={handleDownloadPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-down" size={scale(18)} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(10),
    paddingHorizontal: scale(16),
    marginHorizontal: scale(8),
    borderRadius: scale(10),
  },
  containerNowPlaying: {
    backgroundColor: 'rgba(193,244,12,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(193,244,12,0.3)',
  },
  containerUpNext: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
  },
  coverContainer: {
    position: 'relative',
  },
  cover: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(6),
    backgroundColor: '#262626',
  },
  coverNotDownloaded: {
    opacity: 0.6,
  },
  statusBadge: {
    position: 'absolute',
    bottom: scale(-2),
    right: scale(-2),
    width: scale(18),
    height: scale(18),
    borderRadius: scale(9),
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadgePlaying: {
    backgroundColor: '#fff',
  },
  info: {
    flex: 1,
    marginLeft: scale(12),
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(4),
  },
  title: {
    fontSize: scale(14),
    fontWeight: '500',
    color: '#fff',
    flex: 1,
  },
  titleNowPlaying: {
    fontWeight: '600',
  },
  nowPlayingBadge: {
    backgroundColor: ACCENT,
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(4),
  },
  nowPlayingText: {
    fontSize: scale(8),
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.5,
  },
  upNextBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(4),
  },
  upNextText: {
    fontSize: scale(8),
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  completedText: {
    fontSize: scale(12),
    color: ACCENT,
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  progressTrack: {
    flex: 1,
    height: scale(3),
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: scale(2),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: ACCENT,
    borderRadius: scale(2),
  },
  progressText: {
    fontSize: scale(11),
    color: 'rgba(255,255,255,0.5)',
    width: scale(32),
    textAlign: 'right',
  },
  durationText: {
    fontSize: scale(12),
    color: 'rgba(255,255,255,0.4)',
  },
  actionContainer: {
    marginLeft: scale(8),
  },
  playButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadButton: {
    width: scale(36),
    height: scale(36),
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadingIndicator: {
    width: scale(36),
    height: scale(36),
    justifyContent: 'center',
    alignItems: 'center',
  },
});
