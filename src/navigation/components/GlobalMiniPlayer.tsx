/**
 * src/navigation/components/GlobalMiniPlayer.tsx
 *
 * Floating mini player bar that appears above the tab bar when audio is playing.
 * Following NN/g principles:
 * - Clear system status (shows what's playing)
 * - Progress indicator for current position
 * - Touch targets minimum 44×44px
 * - Tap to open full player
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useCoverUrl } from '@/core/cache';
import { usePlayerStore } from '@/features/player/stores/playerStore';
import { getTitle, getAuthorName } from '@/shared/utils/metadata';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

// Design constants
const MINI_PLAYER_HEIGHT = 64;
const ACCENT_COLOR = '#C8FF00';

interface GlobalMiniPlayerProps {
  onPress: () => void;
}

export function GlobalMiniPlayer({ onPress }: GlobalMiniPlayerProps) {
  const currentBook = usePlayerStore((s) => s.currentBook);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isPlayerVisible = usePlayerStore((s) => s.isPlayerVisible);
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const play = usePlayerStore((s) => s.play);
  const pause = usePlayerStore((s) => s.pause);

  const coverUrl = useCoverUrl(currentBook?.id || '');

  // Don't show if no book loaded or if full player is open
  if (!currentBook || isPlayerVisible) {
    return null;
  }

  const title = getTitle(currentBook);
  const author = getAuthorName(currentBook);
  const progress = duration > 0 ? (position / duration) * 100 : 0;

  const handlePlayPause = async () => {
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  };

  return (
    <View style={styles.container}>
      <BlurView intensity={60} tint="dark" style={styles.blurContainer}>
        {/* Progress bar at top */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>

        <Pressable
          style={styles.content}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`Now playing: ${title} by ${author}. Tap to open player.`}
        >
          {/* Cover thumbnail */}
          <Image
            source={coverUrl}
            style={styles.cover}
            contentFit="cover"
            transition={150}
            accessibilityIgnoresInvertColors
          />

          {/* Title and author */}
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.author} numberOfLines={1}>
              {author}
            </Text>
          </View>

          {/* Play/Pause button */}
          <TouchableOpacity
            style={styles.playButton}
            onPress={handlePlayPause}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={28}
              color={ACCENT_COLOR}
            />
          </TouchableOpacity>
        </Pressable>
      </BlurView>
    </View>
  );
}

/** Height of the mini player for layout calculations */
export const GLOBAL_MINI_PLAYER_HEIGHT = MINI_PLAYER_HEIGHT;

const styles = StyleSheet.create({
  container: {
    height: MINI_PLAYER_HEIGHT,
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  blurContainer: {
    flex: 1,
  },
  progressContainer: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: ACCENT_COLOR,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
  },
  cover: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(6),
    backgroundColor: '#333',
  },
  info: {
    flex: 1,
    marginLeft: scale(12),
    marginRight: scale(8),
  },
  title: {
    fontSize: scale(14),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  author: {
    fontSize: scale(12),
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  playButton: {
    // Minimum touch target: 44×44px (NN/g recommendation)
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
