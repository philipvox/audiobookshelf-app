/**
 * src/features/player/components/MiniPlayerBar.tsx
 *
 * Spotify-style mini player bar shown when viewing a different book
 * than what's currently playing. Allows control of the playing book
 * without leaving the viewed book's player screen.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useCoverUrl } from '@/core/cache';
import {
  usePlayerStore,
  usePlayingBook,
  useIsViewingDifferentBook,
} from '../stores/playerStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

export function MiniPlayerBar() {
  const playingBook = usePlayingBook();
  const isViewingDifferent = useIsViewingDifferentBook();
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const play = usePlayerStore((s) => s.play);
  const pause = usePlayerStore((s) => s.pause);

  const coverUrl = useCoverUrl(playingBook?.id || '');

  // Only show when viewing a different book and there's something playing
  if (!isViewingDifferent || !playingBook) {
    return null;
  }

  const metadata = playingBook.media?.metadata as any;
  const title = metadata?.title || 'Untitled';
  const author = metadata?.authorName || metadata?.authors?.[0]?.name || 'Unknown';

  const handlePlayPause = async () => {
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  };

  return (
    <View style={styles.container}>
      {/* Cover thumbnail */}
      <Image source={coverUrl} style={styles.cover} contentFit="cover" />

      {/* Title and author */}
      <View style={styles.info}>
        <Text style={styles.nowPlaying}>Now Playing</Text>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.author} numberOfLines={1}>
          {author}
        </Text>
      </View>

      {/* Play/Pause button */}
      <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={scale(24)}
          color="#CCFF00"
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(38, 38, 38, 0.95)',
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  cover: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(4),
    backgroundColor: '#333',
  },
  info: {
    flex: 1,
    marginLeft: scale(12),
    marginRight: scale(8),
  },
  nowPlaying: {
    fontSize: scale(10),
    color: '#CCFF00',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: scale(13),
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: scale(2),
  },
  author: {
    fontSize: scale(11),
    color: 'rgba(255, 255, 255, 0.6)',
  },
  playButton: {
    width: scale(44),
    height: scale(44),
    justifyContent: 'center',
    alignItems: 'center',
  },
});
