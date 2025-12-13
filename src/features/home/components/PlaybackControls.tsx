/**
 * src/features/home/components/PlaybackControls.tsx
 *
 * Playback controls - standard Ionicons
 * Order: Rewind | Fast Forward | Play
 */

import React, { useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { haptics } from '@/core/native/haptics';

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
  // NN/g: Haptic feedback for play/pause provides tactile confirmation
  const handlePlayPause = useCallback(() => {
    if (isLoading) return; // Don't allow play/pause while loading
    haptics.playbackToggle();
    if (isPlaying) {
      onPause();
    } else {
      onPlay();
    }
  }, [isLoading, isPlaying, onPause, onPlay]);

  // NN/g: Haptic feedback on skip button press
  const handleSkipBackward = useCallback(() => {
    haptics.skip();
    onSkipBackward?.();
  }, [onSkipBackward]);

  const handleSkipForward = useCallback(() => {
    haptics.skip();
    onSkipForward?.();
  }, [onSkipForward]);

  const handleSkipBackwardPressIn = useCallback(() => {
    haptics.buttonPress();
    onSkipBackwardPressIn?.();
  }, [onSkipBackwardPressIn]);

  const handleSkipForwardPressIn = useCallback(() => {
    haptics.buttonPress();
    onSkipForwardPressIn?.();
  }, [onSkipForwardPressIn]);

  const iconSize = scale(28);
  const playIconSize = scale(36);
  const controlsDisabled = disabled || isLoading;

  return (
    <View style={styles.container}>
      {/* Rewind */}
      <TouchableOpacity
        onPress={handleSkipBackward}
        onPressIn={handleSkipBackwardPressIn}
        onPressOut={onSkipBackwardPressOut}
        disabled={controlsDisabled}
        activeOpacity={0.7}
        style={[styles.button, controlsDisabled && styles.disabled]}
      >
        <Ionicons name="play-back" size={iconSize} color={controlsDisabled ? 'rgba(255,255,255,0.4)' : '#FFFFFF'} />
      </TouchableOpacity>

      {/* Fast Forward */}
      <TouchableOpacity
        onPress={handleSkipForward}
        onPressIn={handleSkipForwardPressIn}
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
          <ActivityIndicator size={playIconSize} color="#F4B60C" />
        ) : (
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={playIconSize}
            color="#F4B60C"
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
