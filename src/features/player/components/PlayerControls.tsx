/**
 * src/features/player/components/PlayerControls.tsx
 * Tape recorder style: hold to seek, release to play, tap to skip
 */

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Icon } from '@/shared/components/Icon';
import { formatDelta } from '../utils';
import { CARD_MARGIN, BUTTON_GAP, BUTTON_SIZE, RADIUS } from '../constants';

interface PlayerControlsProps {
  isPlaying: boolean;
  isLoading: boolean;
  isRewinding?: boolean;
  isFastForwarding?: boolean;
  isSeeking?: boolean;
  seekDelta: number;
  controlMode?: 'rewind' | 'chapter';
  cardColor: string;
  textColor: string;
  onPlayPause: () => void;
  // Old props (backwards compat)
  onLeftPress?: () => void;
  onLeftPressIn?: () => void;
  onLeftPressOut?: () => void;
  onRightPress?: () => void;
  onRightPressIn?: () => void;
  onRightPressOut?: () => void;
  // New props
  onSkipBack?: () => void;
  onSkipForward?: () => void;
  onSeekStart?: (direction: 'back' | 'forward') => void;
  onSeekEnd?: () => void;
}

interface HoldButtonProps {
  onTap: () => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
  style: any;
  children: React.ReactNode;
}

function HoldButton({ onTap, onHoldStart, onHoldEnd, style, children }: HoldButtonProps) {
  // Store callbacks in refs to avoid stale closures and prevent remount issues
  const onTapRef = useRef(onTap);
  const onHoldStartRef = useRef(onHoldStart);
  const onHoldEndRef = useRef(onHoldEnd);
  
  const isHoldingRef = useRef(false);
  const didTriggerHoldRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update refs when callbacks change (but don't cause re-render)
  useEffect(() => {
    onTapRef.current = onTap;
    onHoldStartRef.current = onHoldStart;
    onHoldEndRef.current = onHoldEnd;
  });

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
      // DON'T call onHoldEnd here - that causes the remount loop
    };
  }, [cleanup]);

  const handleTouchStart = useCallback(() => {
    cleanup();
    isHoldingRef.current = true;
    didTriggerHoldRef.current = false;
    
    timeoutRef.current = setTimeout(() => {
      if (isHoldingRef.current) {
        didTriggerHoldRef.current = true;
        onHoldStartRef.current();
      }
    }, 150);
  }, [cleanup]);

  const handleTouchEnd = useCallback(() => {
    cleanup();
    const wasHolding = didTriggerHoldRef.current;
    isHoldingRef.current = false;
    didTriggerHoldRef.current = false;
    
    if (wasHolding) {
      onHoldEndRef.current();
    } else {
      onTapRef.current();
    }
  }, [cleanup]);

  return (
    <View
      style={style}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {children}
    </View>
  );
}

export function PlayerControls({
  isPlaying,
  isLoading,
  isRewinding,
  isFastForwarding,
  isSeeking: isSeekingProp,
  seekDelta,
  controlMode = 'rewind',
  cardColor,
  textColor,
  onPlayPause,
  // Old props
  onLeftPress,
  onLeftPressIn,
  onLeftPressOut,
  onRightPress,
  onRightPressIn,
  onRightPressOut,
  // New props
  onSkipBack,
  onSkipForward,
  onSeekStart,
  onSeekEnd,
}: PlayerControlsProps) {
  // Memoize handlers to prevent unnecessary re-renders
  const handleLeftTap = useCallback(() => {
    (onSkipBack || onLeftPress || (() => {}))();
  }, [onSkipBack, onLeftPress]);
  
  const handleLeftHoldStart = useCallback(() => {
    if (onSeekStart) {
      onSeekStart('back');
    } else if (onLeftPressIn) {
      onLeftPressIn();
    }
  }, [onSeekStart, onLeftPressIn]);
  
  const handleLeftHoldEnd = useCallback(() => {
    (onSeekEnd || onLeftPressOut || (() => {}))();
  }, [onSeekEnd, onLeftPressOut]);
  
  const handleRightTap = useCallback(() => {
    (onSkipForward || onRightPress || (() => {}))();
  }, [onSkipForward, onRightPress]);
  
  const handleRightHoldStart = useCallback(() => {
    if (onSeekStart) {
      onSeekStart('forward');
    } else if (onRightPressIn) {
      onRightPressIn();
    }
  }, [onSeekStart, onRightPressIn]);
  
  const handleRightHoldEnd = useCallback(() => {
    (onSeekEnd || onRightPressOut || (() => {}))();
  }, [onSeekEnd, onRightPressOut]);

  const isSeeking = isSeekingProp ?? (isRewinding || isFastForwarding);

  // Memoize styles
  const leftButtonStyle = useMemo(() => 
    [styles.controlButton, { backgroundColor: cardColor }],
    [cardColor]
  );
  
  const rightButtonStyle = useMemo(() => 
    [styles.controlButton, { backgroundColor: cardColor }],
    [cardColor]
  );
  
  return (
    <View style={styles.controlsRow}>
      {/* Play/Pause Button - shows seek delta when seeking */}
      <TouchableOpacity 
        style={[styles.controlButton, { backgroundColor: cardColor }]}
        onPress={onPlayPause}
        activeOpacity={0.7}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={textColor} />
        ) : isSeeking ? (
          <Text style={[styles.seekDeltaText, { color: textColor }]}>
            {formatDelta(seekDelta)}
          </Text>
        ) : (
          <Icon 
            name={isPlaying ? 'pause' : 'play'} 
            size={45} 
            color={textColor} 
            set="ionicons" 
          />
        )}
      </TouchableOpacity>

      {/* Rewind: tap = skip back, hold = continuous rewind */}
      <HoldButton
        onTap={handleLeftTap}
        onHoldStart={handleLeftHoldStart}
        onHoldEnd={handleLeftHoldEnd}
        style={leftButtonStyle}
      >
        <Icon 
          name={controlMode === 'rewind' ? 'play-back' : 'play-skip-back'}
          size={45} 
          color={textColor} 
          set="ionicons" 
        />
      </HoldButton>

      {/* Fast Forward: tap = skip forward, hold = continuous forward */}
      <HoldButton
        onTap={handleRightTap}
        onHoldStart={handleRightHoldStart}
        onHoldEnd={handleRightHoldEnd}
        style={rightButtonStyle}
      >
        <Icon 
          name={controlMode === 'rewind' ? 'play-forward' : 'play-skip-forward'}
          size={45} 
          color={textColor} 
          set="ionicons" 
        />
      </HoldButton>
    </View>
  );
}

const styles = StyleSheet.create({
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: BUTTON_GAP,
    marginHorizontal: CARD_MARGIN,
    marginTop: 5,
  },
  controlButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: RADIUS,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seekDeltaText: {
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});