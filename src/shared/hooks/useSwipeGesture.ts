/**
 * src/shared/hooks/useSwipeGesture.ts
 *
 * Reusable hook for swipe gestures on cards and list items.
 * Provides consistent swipe behavior across Discover, History, and Downloads screens.
 *
 * @example
 * const { onTouchStart, onTouchMove, onTouchEnd, translateX, isSwipeActive } = useSwipeGesture({
 *   onSwipeLeft: () => markAsRead(book.id),
 *   onSwipeRight: () => addToLibrary(book.id),
 *   threshold: 100,
 * });
 */

import { useRef, useState, useCallback, useMemo } from 'react';
import { Animated, PanResponder, GestureResponderEvent, PanResponderGestureState } from 'react-native';

export interface SwipeGestureConfig {
  /** Called when swiped left past threshold */
  onSwipeLeft?: () => void;
  /** Called when swiped right past threshold */
  onSwipeRight?: () => void;
  /** Distance in pixels to trigger swipe action (default: 100) */
  threshold?: number;
  /** Whether swipe gestures are enabled (default: true) */
  enabled?: boolean;
  /** Whether to allow vertical scrolling during swipe (default: true) */
  allowVerticalScroll?: boolean;
  /** Minimum horizontal movement before recognizing as swipe (default: 10) */
  minHorizontalMovement?: number;
  /** Maximum vertical movement before canceling swipe (default: 30) */
  maxVerticalMovement?: number;
}

export interface SwipeGestureResult {
  /** Animated value for translateX - use with Animated.View */
  translateX: Animated.Value;
  /** Whether a swipe is currently active */
  isSwipeActive: boolean;
  /** Current swipe direction ('left' | 'right' | null) */
  swipeDirection: 'left' | 'right' | null;
  /** Progress toward threshold (0-1) */
  swipeProgress: number;
  /** PanResponder handlers to spread onto a View */
  panHandlers: ReturnType<typeof PanResponder.create>['panHandlers'];
  /** Reset swipe position to origin */
  reset: () => void;
}

/**
 * Hook for handling swipe gestures on cards/list items.
 *
 * Features:
 * - Configurable swipe threshold
 * - Left and right swipe actions
 * - Smooth animated feedback
 * - Prevents accidental swipes during scroll
 * - Accessible via PanResponder (works on both iOS and Android)
 */
export function useSwipeGesture(config: SwipeGestureConfig = {}): SwipeGestureResult {
  const {
    onSwipeLeft,
    onSwipeRight,
    threshold = 100,
    enabled = true,
    allowVerticalScroll = true,
    minHorizontalMovement = 10,
    maxVerticalMovement = 30,
  } = config;

  // Animated value for horizontal translation
  const translateX = useRef(new Animated.Value(0)).current;

  // Track swipe state
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [swipeProgress, setSwipeProgress] = useState(0);

  // Track if we've determined this is a horizontal swipe
  const isHorizontalSwipe = useRef(false);

  // Reset swipe position
  const reset = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 40,
      friction: 7,
    }).start();
    setIsSwipeActive(false);
    setSwipeDirection(null);
    setSwipeProgress(0);
    isHorizontalSwipe.current = false;
  }, [translateX]);

  // Create PanResponder
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Only claim responder if enabled
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          if (!enabled) return false;

          const { dx, dy } = gestureState;
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);

          // Determine if this is a horizontal swipe
          if (absDx > minHorizontalMovement && absDx > absDy * 1.5) {
            isHorizontalSwipe.current = true;
            return true;
          }

          // If vertical movement is dominant, don't capture
          if (allowVerticalScroll && absDy > maxVerticalMovement) {
            isHorizontalSwipe.current = false;
            return false;
          }

          return false;
        },

        onPanResponderGrant: () => {
          setIsSwipeActive(true);
          // Stop any ongoing animation
          translateX.stopAnimation();
        },

        onPanResponderMove: (_, gestureState) => {
          if (!isHorizontalSwipe.current) return;

          const { dx } = gestureState;

          // Update animated value
          translateX.setValue(dx);

          // Update direction and progress
          const direction = dx > 0 ? 'right' : dx < 0 ? 'left' : null;
          const progress = Math.min(Math.abs(dx) / threshold, 1);

          setSwipeDirection(direction);
          setSwipeProgress(progress);
        },

        onPanResponderRelease: (_, gestureState) => {
          if (!isHorizontalSwipe.current) {
            reset();
            return;
          }

          const { dx, vx } = gestureState;
          const absDx = Math.abs(dx);

          // Check if swipe exceeds threshold or has enough velocity
          const exceedsThreshold = absDx > threshold;
          const hasVelocity = Math.abs(vx) > 0.5;
          const shouldTrigger = exceedsThreshold || (hasVelocity && absDx > threshold * 0.5);

          if (shouldTrigger) {
            if (dx > 0 && onSwipeRight) {
              // Animate off screen to the right
              Animated.timing(translateX, {
                toValue: threshold * 2,
                duration: 200,
                useNativeDriver: true,
              }).start(() => {
                onSwipeRight();
                reset();
              });
              return;
            } else if (dx < 0 && onSwipeLeft) {
              // Animate off screen to the left
              Animated.timing(translateX, {
                toValue: -threshold * 2,
                duration: 200,
                useNativeDriver: true,
              }).start(() => {
                onSwipeLeft();
                reset();
              });
              return;
            }
          }

          // Didn't meet threshold, snap back
          reset();
        },

        onPanResponderTerminate: () => {
          reset();
        },
      }),
    [
      enabled,
      threshold,
      allowVerticalScroll,
      minHorizontalMovement,
      maxVerticalMovement,
      onSwipeLeft,
      onSwipeRight,
      translateX,
      reset,
    ]
  );

  return {
    translateX,
    isSwipeActive,
    swipeDirection,
    swipeProgress,
    panHandlers: panResponder.panHandlers,
    reset,
  };
}

/**
 * Simple swipe direction detection without animation.
 * Useful for detecting swipe intent without visual feedback.
 *
 * @example
 * const handleSwipe = useSimpleSwipe({
 *   onSwipeLeft: () => goToNext(),
 *   onSwipeRight: () => goToPrevious(),
 * });
 */
export function useSimpleSwipe(config: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  enabled?: boolean;
}): {
  onTouchStart: (e: GestureResponderEvent) => void;
  onTouchEnd: (e: GestureResponderEvent) => void;
} {
  const { onSwipeLeft, onSwipeRight, threshold = 50, enabled = true } = config;

  const startX = useRef(0);

  const onTouchStart = useCallback((e: GestureResponderEvent) => {
    startX.current = e.nativeEvent.pageX;
  }, []);

  const onTouchEnd = useCallback(
    (e: GestureResponderEvent) => {
      if (!enabled) return;

      const endX = e.nativeEvent.pageX;
      const diff = endX - startX.current;

      if (Math.abs(diff) > threshold) {
        if (diff > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (diff < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      }
    },
    [enabled, threshold, onSwipeLeft, onSwipeRight]
  );

  return { onTouchStart, onTouchEnd };
}

export default useSwipeGesture;
