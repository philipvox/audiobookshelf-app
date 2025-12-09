/**
 * src/shared/components/Skeleton.tsx
 *
 * Skeleton loading components with shimmer animation.
 * Uses react-native-reanimated for smooth 60fps animations.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

// ============================================================================
// SHIMMER ANIMATION
// ============================================================================

interface ShimmerProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

// Dark theme colors for skeleton
const SKELETON_BG = '#2a2a2a';
const SHIMMER_COLOR = 'rgba(255, 255, 255, 0.08)';

export function Shimmer({ width, height, borderRadius = 4, style }: ShimmerProps) {
  const translateX = useSharedValue(-1);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(1, {
        duration: 1200,
        easing: Easing.linear,
      }),
      -1, // Infinite repeat
      false // Don't reverse
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const translateXValue = interpolate(
      translateX.value,
      [-1, 1],
      [-200, 200]
    );
    return {
      transform: [{ translateX: translateXValue }],
    };
  });

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: SKELETON_BG,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <LinearGradient
          colors={[
            'transparent',
            SHIMMER_COLOR,
            'transparent',
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ flex: 1, width: 200 }}
        />
      </Animated.View>
    </View>
  );
}
