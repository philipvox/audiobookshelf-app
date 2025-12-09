/**
 * src/shared/components/GestureComponents.tsx
 *
 * Gesture-optimized components using react-native-gesture-handler
 * and react-native-reanimated for smooth 60fps interactions.
 */

import React from 'react';
import { ViewStyle } from 'react-native';
import {
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

// ============================================================================
// SWIPEABLE CONTAINER
// ============================================================================

interface SwipeableProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  swipeThreshold?: number;
  style?: ViewStyle;
}

/**
 * Container that detects horizontal swipes
 * Great for skip forward/backward in player
 */
export function Swipeable({
  children,
  onSwipeLeft,
  onSwipeRight,
  swipeThreshold = 50,
  style,
}: SwipeableProps) {
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((event) => {
      // Limit movement with rubber band effect
      const clampedX = event.translationX * 0.5;
      translateX.value = startX.value + clampedX;
    })
    .onEnd((event) => {
      if (event.translationX > swipeThreshold && onSwipeRight) {
        runOnJS(onSwipeRight)();
      } else if (event.translationX < -swipeThreshold && onSwipeLeft) {
        runOnJS(onSwipeLeft)();
      }
      translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[style, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
