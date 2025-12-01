/**
 * src/features/player/components/PlayerControls.tsx
 *
 * Skeuomorphic playback controls with directional lighting.
 * Layout: [Rewind] [Forward] [Play]
 */

import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { Icon } from '@/shared/components/Icon';
import { SkeuomorphicButton } from '@/shared/components/SkeuomorphicButton';
import { formatDelta } from '../utils';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BUTTON_MARGIN = 5;
const BUTTON_GAP = 2;
const BUTTON_WIDTH = (SCREEN_WIDTH - BUTTON_MARGIN * 2 - BUTTON_GAP * 2) / 3;
const BUTTON_HEIGHT = 100;

// Orange color for play button icon
const PLAY_ICON_COLOR = '#F55F05';

interface PlayerControlsProps {
  isPlaying: boolean;
  isLoading: boolean;
  isRewinding: boolean;
  isFastForwarding: boolean;
  seekDelta: number;
  controlMode: 'rewind' | 'chapter';
  onPlayPause: () => void;
  onLeftPress: () => void;
  onLeftPressIn: () => void;
  onLeftPressOut: () => void;
  onRightPress: () => void;
  onRightPressIn: () => void;
  onRightPressOut: () => void;
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
  const touchActiveRef = useRef(false);
  const pressStartRef = useRef(0);
  const HOLD_THRESHOLD = 150;

  const isSeeking = isRewinding || isFastForwarding;

  // Combined press handlers for hold buttons
  const handleLeftPressIn = useCallback(() => {
    touchActiveRef.current = true;
    pressStartRef.current = Date.now();
    onLeftPressIn();
  }, [onLeftPressIn]);

  const handleLeftPressOut = useCallback(() => {
    if (!touchActiveRef.current) return;
    touchActiveRef.current = false;
    const duration = Date.now() - pressStartRef.current;
    onLeftPressOut();
    if (duration < HOLD_THRESHOLD) {
      onLeftPress();
    }
  }, [onLeftPress, onLeftPressOut]);

  const handleRightPressIn = useCallback(() => {
    touchActiveRef.current = true;
    pressStartRef.current = Date.now();
    onRightPressIn();
  }, [onRightPressIn]);

  const handleRightPressOut = useCallback(() => {
    if (!touchActiveRef.current) return;
    touchActiveRef.current = false;
    const duration = Date.now() - pressStartRef.current;
    onRightPressOut();
    if (duration < HOLD_THRESHOLD) {
      onRightPress();
    }
  }, [onRightPress, onRightPressOut]);

  return (
    <View style={styles.controlsRow}>
      {/* Rewind / Prev Chapter - Light from upper-right */}
      <SkeuomorphicButton
        buttonId="player-rewind"
        lightPosition="left"
        shape="rounded-rect"
        size={{ width: BUTTON_WIDTH, height: BUTTON_HEIGHT }}
        borderRadius={5}
        onPressIn={controlMode === 'rewind' ? handleLeftPressIn : undefined}
        onPressOut={controlMode === 'rewind' ? handleLeftPressOut : undefined}
        onPress={controlMode === 'chapter' ? onLeftPress : undefined}
      >
        <Icon
          name={controlMode === 'chapter' ? 'play-skip-back' : 'play-back'}
          size={40}
          color="#FFFFFF"
          set="ionicons"
        />
      </SkeuomorphicButton>

      {/* Fast Forward / Next Chapter - Light from top */}
      <SkeuomorphicButton
        buttonId="player-forward"
        lightPosition="center"
        shape="rounded-rect"
        size={{ width: BUTTON_WIDTH, height: BUTTON_HEIGHT }}
        borderRadius={5}
        onPressIn={controlMode === 'rewind' ? handleRightPressIn : undefined}
        onPressOut={controlMode === 'rewind' ? handleRightPressOut : undefined}
        onPress={controlMode === 'chapter' ? onRightPress : undefined}
      >
        <Icon
          name={controlMode === 'chapter' ? 'play-skip-forward' : 'play-forward'}
          size={40}
          color="#FFFFFF"
          set="ionicons"
        />
      </SkeuomorphicButton>

      {/* Play/Pause - Light from upper-left, orange icon */}
      <SkeuomorphicButton
        buttonId="player-play"
        lightPosition="right"
        shape="rounded-rect"
        size={{ width: BUTTON_WIDTH, height: BUTTON_HEIGHT }}
        borderRadius={5}
        onPress={onPlayPause}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={PLAY_ICON_COLOR} />
        ) : isSeeking ? (
          <Text style={styles.seekDeltaText}>{formatDelta(seekDelta)}</Text>
        ) : (
          <Icon
            name={isPlaying ? 'pause' : 'play'}
            size={45}
            color={PLAY_ICON_COLOR}
            set="ionicons"
          />
        )}
      </SkeuomorphicButton>
    </View>
  );
}

const styles = StyleSheet.create({
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: BUTTON_GAP,
    marginHorizontal: BUTTON_MARGIN,
    marginTop: 8,
  },
  seekDeltaText: {
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: PLAY_ICON_COLOR,
  },
});

export default PlayerControls;
