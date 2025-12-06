/**
 * src/features/home/components/PlaybackControls.tsx
 *
 * Playback controls - standard Ionicons
 * Order: Rewind | Fast Forward | Play
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

interface PlaybackControlsProps {
  isPlaying: boolean;
  isLoading?: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSkipForward?: () => void;
  onSkipBackward?: () => void;
  onSkipForwardPressIn?: () => void;
  onSkipForwardPressOut?: () => void;
  onSkipBackwardPressIn?: () => void;
  onSkipBackwardPressOut?: () => void;
  disabled?: boolean;
}

export function PlaybackControls({
  isPlaying,
  isLoading = false,
  onPlay,
  onPause,
  onSkipForward,
  onSkipBackward,
  onSkipForwardPressIn,
  onSkipForwardPressOut,
  onSkipBackwardPressIn,
  onSkipBackwardPressOut,
  disabled = false,
}: PlaybackControlsProps) {
  const handlePlayPause = () => {
    if (isLoading) return; // Don't allow play/pause while loading
    if (isPlaying) {
      onPause();
    } else {
      onPlay();
    }
  };

  const iconSize = scale(28);
  const playIconSize = scale(36);
  const controlsDisabled = disabled || isLoading;

  return (
    <View style={styles.container}>
      {/* Rewind */}
      <TouchableOpacity
        onPress={onSkipBackward}
        onPressIn={onSkipBackwardPressIn}
        onPressOut={onSkipBackwardPressOut}
        disabled={controlsDisabled}
        activeOpacity={0.7}
        style={[styles.button, controlsDisabled && styles.disabled]}
      >
        <Ionicons name="play-back" size={iconSize} color={controlsDisabled ? 'rgba(255,255,255,0.4)' : '#FFFFFF'} />
      </TouchableOpacity>

      {/* Fast Forward */}
      <TouchableOpacity
        onPress={onSkipForward}
        onPressIn={onSkipForwardPressIn}
        onPressOut={onSkipForwardPressOut}
        disabled={controlsDisabled}
        activeOpacity={0.7}
        style={[styles.button, controlsDisabled && styles.disabled]}
      >
        <Ionicons name="play-forward" size={iconSize} color={controlsDisabled ? 'rgba(255,255,255,0.4)' : '#FFFFFF'} />
      </TouchableOpacity>

      {/* Play/Pause - shows spinner when loading */}
      <TouchableOpacity
        onPress={handlePlayPause}
        disabled={controlsDisabled}
        activeOpacity={0.7}
        style={styles.playButton}
      >
        {isLoading ? (
          <ActivityIndicator size={playIconSize} color="#CCFF00" />
        ) : (
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={playIconSize}
            color="#CCFF00"
          />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(20),
  },
  // NN/g: Minimum 44×44px touch targets
  button: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    minWidth: 56,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
