/**
 * src/features/player/components/PlayerControls.tsx
 *
 * Redesigned player controls with glass-like button effects
 * Button order: Rewind | Fast Forward | Play
 */

import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { GradientPanel } from './GradientPanel';
import { RewindIcon, FastForwardIcon, PlayIcon, PauseIcon } from './PlayerIcons';
import { formatDelta } from '../utils';
import {
  PLAYER_PADDING,
  BUTTON_GAP,
  BUTTON_WIDTH,
  BUTTON_HEIGHT,
} from '../constants';

interface PlayerControlsProps {
  isPlaying: boolean;
  isLoading: boolean;
  isRewinding: boolean;
  isFastForwarding: boolean;
  seekDelta: number;
  controlMode: 'rewind' | 'chapter';
  cardColor: string;
  textColor: string;
  onPlayPause: () => void;
  onLeftPress: () => void;
  onLeftPressIn: () => void;
  onLeftPressOut: () => void;
  onRightPress: () => void;
  onRightPressIn: () => void;
  onRightPressOut: () => void;
}

// Touch-based button for reliable hold detection
function HoldButton({
  onPress,
  onPressIn,
  onPressOut,
  isActive,
  variant,
  children,
}: {
  onPress: () => void;
  onPressIn: () => void;
  onPressOut: () => void;
  isActive: boolean;
  variant: 'rewind' | 'fastforward' | 'play';
  children: React.ReactNode;
}) {
  const touchActiveRef = useRef(false);
  const pressStartRef = useRef(0);
  const HOLD_THRESHOLD = 150; // ms before considered a hold

  const handleTouchStart = useCallback(() => {
    touchActiveRef.current = true;
    pressStartRef.current = Date.now();
    onPressIn();
  }, [onPressIn]);

  const handleTouchEnd = useCallback(() => {
    if (!touchActiveRef.current) return;
    touchActiveRef.current = false;

    const duration = Date.now() - pressStartRef.current;
    onPressOut();

    // If it was a quick tap (not a hold), also fire onPress
    if (duration < HOLD_THRESHOLD) {
      onPress();
    }
  }, [onPress, onPressOut]);

  const handleTouchCancel = useCallback(() => {
    if (!touchActiveRef.current) return;
    touchActiveRef.current = false;
    onPressOut();
  }, [onPressOut]);

  return (
    <View
      style={[styles.buttonWrapper, isActive && styles.buttonActive]}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      <GradientPanel variant={variant} style={styles.button}>
        <View style={styles.buttonContent}>
          {children}
        </View>
      </GradientPanel>
    </View>
  );
}

export function PlayerControls({
  isPlaying,
  isLoading,
  isRewinding,
  isFastForwarding,
  seekDelta,
  controlMode,
  onPlayPause,
  onLeftPress,
  onLeftPressIn,
  onLeftPressOut,
  onRightPress,
  onRightPressIn,
  onRightPressOut,
}: PlayerControlsProps) {
  const isSeeking = isRewinding || isFastForwarding;

  return (
    <View style={styles.controlsRow}>
      {/* Rewind / Prev Chapter Button */}
      {controlMode === 'rewind' ? (
        <HoldButton
          onPress={onLeftPress}
          onPressIn={onLeftPressIn}
          onPressOut={onLeftPressOut}
          isActive={isRewinding}
          variant="rewind"
        >
          <RewindIcon size={56} color="white" />
        </HoldButton>
      ) : (
        <TouchableOpacity
          style={styles.buttonWrapper}
          onPress={onLeftPress}
          activeOpacity={0.7}
        >
          <GradientPanel variant="rewind" style={styles.button}>
            <View style={styles.buttonContent}>
              <RewindIcon size={56} color="white" />
            </View>
          </GradientPanel>
        </TouchableOpacity>
      )}

      {/* Fast Forward / Next Chapter Button */}
      {controlMode === 'rewind' ? (
        <HoldButton
          onPress={onRightPress}
          onPressIn={onRightPressIn}
          onPressOut={onRightPressOut}
          isActive={isFastForwarding}
          variant="fastforward"
        >
          <FastForwardIcon size={56} color="white" />
        </HoldButton>
      ) : (
        <TouchableOpacity
          style={styles.buttonWrapper}
          onPress={onRightPress}
          activeOpacity={0.7}
        >
          <GradientPanel variant="fastforward" style={styles.button}>
            <View style={styles.buttonContent}>
              <FastForwardIcon size={56} color="white" />
            </View>
          </GradientPanel>
        </TouchableOpacity>
      )}

      {/* Play/Pause Button */}
      <TouchableOpacity
        style={styles.buttonWrapper}
        onPress={onPlayPause}
        activeOpacity={0.7}
        disabled={isLoading}
      >
        <GradientPanel variant="play" style={styles.button}>
          <View style={styles.buttonContent}>
            {isLoading ? (
              <ActivityIndicator size="large" color="#F55F05" />
            ) : isSeeking ? (
              <Text style={styles.seekDeltaText}>
                {formatDelta(seekDelta)}
              </Text>
            ) : isPlaying ? (
              <PauseIcon size={36} color="#F55F05" />
            ) : (
              <PlayIcon size={36} color="#F55F05" />
            )}
          </View>
        </GradientPanel>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: BUTTON_GAP,
    marginHorizontal: PLAYER_PADDING,
    marginTop: BUTTON_GAP,
  },
  buttonWrapper: {
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT,
  },
  button: {
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT,
  },
  buttonContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonActive: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  seekDeltaText: {
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: '#F55F05',
  },
});
