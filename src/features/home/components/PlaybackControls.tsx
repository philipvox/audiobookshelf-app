/**
 * src/features/home/components/PlaybackControls.tsx
 *
 * Playback controls using Lucide icons
 * Order: Rewind | Fast Forward | Play
 */

import React, { useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SkipBack, SkipForward, Play, Pause } from 'lucide-react-native';
import { haptics } from '@/core/native/haptics';
import {
  spacing,
  scale,
  layout,
  useThemeColors,
  accentColors,
} from '@/shared/theme';

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
  const themeColors = useThemeColors();

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
        accessibilityLabel="Skip backward"
        accessibilityRole="button"
        accessibilityHint="Double tap to skip back. Long press for continuous rewind."
      >
        <SkipBack size={iconSize} color={controlsDisabled ? themeColors.textTertiary : themeColors.text} strokeWidth={2} />
      </TouchableOpacity>

      {/* Fast Forward */}
      <TouchableOpacity
        onPress={handleSkipForward}
        onPressIn={handleSkipForwardPressIn}
        onPressOut={onSkipForwardPressOut}
        disabled={controlsDisabled}
        activeOpacity={0.7}
        style={[styles.button, controlsDisabled && styles.disabled]}
        accessibilityLabel="Skip forward"
        accessibilityRole="button"
        accessibilityHint="Double tap to skip forward. Long press for continuous fast forward."
      >
        <SkipForward size={iconSize} color={controlsDisabled ? themeColors.textTertiary : themeColors.text} strokeWidth={2} />
      </TouchableOpacity>

      {/* Play/Pause - shows spinner when loading */}
      <TouchableOpacity
        onPress={handlePlayPause}
        disabled={controlsDisabled}
        activeOpacity={0.7}
        style={styles.playButton}
        accessibilityLabel={isLoading ? 'Loading' : isPlaying ? 'Pause' : 'Play'}
        accessibilityRole="button"
        accessibilityState={{ disabled: controlsDisabled }}
      >
        {isLoading ? (
          <ActivityIndicator size={playIconSize} color={accentColors.gold} />
        ) : isPlaying ? (
          <Pause size={playIconSize} color={accentColors.gold} fill={accentColors.gold} strokeWidth={0} />
        ) : (
          <Play size={playIconSize} color={accentColors.gold} fill={accentColors.gold} strokeWidth={0} />
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
    gap: spacing.xl,
  },
  // NN/g: Minimum 44×44px touch targets
  button: {
    minWidth: layout.minTouchTarget,
    minHeight: layout.minTouchTarget,
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
