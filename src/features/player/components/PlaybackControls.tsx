// File: src/features/player/components/PlaybackControls.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { usePlayerStore } from '../stores/playerStore';
import { Icon } from '@/shared/components/Icon';
import { theme } from '@/shared/theme';

interface PlaybackControlsProps {
  buttonColor?: string;
  iconColor?: string;
  skipColor?: string;
  skipAmount?: number;
  onPreviousChapter?: () => void;
  onNextChapter?: () => void;
  hasPreviousChapter?: boolean;
  hasNextChapter?: boolean;
}

export function PlaybackControls({
  buttonColor = theme.colors.neutral[0],
  iconColor = theme.colors.text.primary,
  skipColor = theme.colors.neutral[400],
  skipAmount = 20,
  onPreviousChapter,
  onNextChapter,
  hasPreviousChapter = false,
  hasNextChapter = false,
}: PlaybackControlsProps) {
  const { isPlaying, isLoading, isBuffering, play, pause, skipBackward, skipForward } = usePlayerStore();

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        await pause();
      } else {
        await play();
      }
    } catch (error) {
      console.error('Failed to toggle playback:', error);
    }
  };

  const disabledColor = 'rgba(255,255,255,0.2)';

  return (
    <View style={styles.container}>
      {/* Previous Chapter */}
      <TouchableOpacity
        style={styles.chapterButton}
        onPress={onPreviousChapter}
        disabled={!hasPreviousChapter || isLoading}
        activeOpacity={0.7}
      >
        <Icon 
          name="play-skip-back" 
          size={24} 
          color={hasPreviousChapter ? skipColor : disabledColor} 
          set="ionicons" 
        />
      </TouchableOpacity>

      {/* Skip Backward */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => skipBackward(skipAmount)}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <View style={styles.skipButtonInner}>
          <Icon name="play-back" size={28} color={skipColor} set="ionicons" />
          <Text style={[styles.skipText, { color: skipColor }]}>{skipAmount}</Text>
        </View>
      </TouchableOpacity>

      {/* Play/Pause */}
      <TouchableOpacity
        style={[styles.playButton, { backgroundColor: buttonColor }]}
        onPress={handlePlayPause}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading || isBuffering ? (
          <ActivityIndicator size="large" color={iconColor} />
        ) : (
          <Icon
            name={isPlaying ? 'pause' : 'play'}
            size={36}
            color={iconColor}
            set="ionicons"
          />
        )}
      </TouchableOpacity>

      {/* Skip Forward */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => skipForward(skipAmount)}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <View style={styles.skipButtonInner}>
          <Icon name="play-forward" size={28} color={skipColor} set="ionicons" />
          <Text style={[styles.skipText, { color: skipColor }]}>{skipAmount}</Text>
        </View>
      </TouchableOpacity>

      {/* Next Chapter */}
      <TouchableOpacity
        style={styles.chapterButton}
        onPress={onNextChapter}
        disabled={!hasNextChapter || isLoading}
        activeOpacity={0.7}
      >
        <Icon 
          name="play-skip-forward" 
          size={24} 
          color={hasNextChapter ? skipColor : disabledColor} 
          set="ionicons" 
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing[4],
  },
  chapterButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: theme.spacing[2],
  },
  skipButtonInner: {
    alignItems: 'center',
  },
  skipText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: theme.spacing[3],
    ...theme.elevation.large,
  },
});