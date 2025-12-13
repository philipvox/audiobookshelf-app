/**
 * src/shared/components/CassetteRefreshControl.tsx
 *
 * A custom pull-to-refresh component with a cassette tape animation.
 * The cassette body rotates/bounces during the refresh action.
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';
import Svg, { Circle, Rect, G, Path, Defs, LinearGradient, Stop } from 'react-native-svg';

// Colors
const COLORS = {
  body: '#2C2C2E',
  bodyDark: '#1C1C1E',
  window: '#1A1A1E',
  windowBorder: '#3A3A3C',
  reel: '#4A4A4C',
  reelCenter: '#F4B60C',
  reelCenterDark: '#D9A00A',
  tape: '#3A3A3C',
  label: '#48484A',
  screw: '#5C5C5E',
};

interface CassetteRefreshControlProps {
  refreshing: boolean;
  progress?: number; // 0-1 for pull progress
  size?: number;
  tintColor?: string;
}

export function CassetteRefreshControl({
  refreshing,
  progress = 0,
  size = 60,
  tintColor = COLORS.reelCenter,
}: CassetteRefreshControlProps) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Spin animation while refreshing
  useEffect(() => {
    if (refreshing) {
      // Start spinning
      spinAnim.setValue(0);
      const spinAnimation = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spinAnimation.start();

      // Subtle pulse
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      return () => {
        spinAnimation.stop();
        pulseAnimation.stop();
      };
    } else {
      // Reset when not refreshing
      spinAnim.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [refreshing, spinAnim, pulseAnim]);

  // Calculate rotation based on progress when pulling
  const pullRotation = !refreshing ? progress * 180 : 0;

  // Spin value for refreshing state
  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const viewBox = '0 0 120 70';

  // Calculate reel rotation for static SVG
  const reelRotation = refreshing ? 0 : pullRotation;

  return (
    <View style={[styles.container, { width: size * 2, height: size * 1.2 }]}>
      <Animated.View
        style={[
          styles.svgContainer,
          refreshing && {
            transform: [
              { scale: pulseAnim },
            ],
          },
        ]}
      >
        <Svg
          width={size * 2}
          height={size * 1.2}
          viewBox={viewBox}
        >
          <Defs>
            <LinearGradient id="bodyGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={COLORS.body} />
              <Stop offset="1" stopColor={COLORS.bodyDark} />
            </LinearGradient>
            <LinearGradient id="reelGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={tintColor} />
              <Stop offset="1" stopColor={COLORS.reelCenterDark} />
            </LinearGradient>
          </Defs>

          {/* Cassette body */}
          <Rect
            x="5"
            y="5"
            width="110"
            height="60"
            rx="4"
            fill="url(#bodyGradient)"
          />

          {/* Top edge detail */}
          <Rect x="10" y="5" width="100" height="2" fill={COLORS.label} />

          {/* Corner screws */}
          <Circle cx="12" cy="12" r="2" fill={COLORS.screw} />
          <Circle cx="108" cy="12" r="2" fill={COLORS.screw} />
          <Circle cx="12" cy="58" r="2" fill={COLORS.screw} />
          <Circle cx="108" cy="58" r="2" fill={COLORS.screw} />

          {/* Window/viewing area */}
          <Rect
            x="20"
            y="18"
            width="80"
            height="32"
            rx="2"
            fill={COLORS.window}
            stroke={COLORS.windowBorder}
            strokeWidth="1"
          />

          {/* Tape between reels */}
          <Path
            d="M 38 34 Q 60 28 82 34"
            stroke={COLORS.tape}
            strokeWidth="2"
            fill="none"
          />
          <Path
            d="M 38 34 Q 60 40 82 34"
            stroke={COLORS.tape}
            strokeWidth="2"
            fill="none"
          />

          {/* Left reel */}
          <G
            rotation={reelRotation}
            origin="38, 34"
          >
            <Circle cx="38" cy="34" r="12" fill={COLORS.reel} />
            <Circle cx="38" cy="34" r="6" fill="url(#reelGradient)" />
            {/* Reel spokes */}
            <Rect x="37" y="24" width="2" height="8" fill={COLORS.bodyDark} />
            <Rect x="37" y="38" width="2" height="8" fill={COLORS.bodyDark} />
            <Rect x="28" y="33" width="8" height="2" fill={COLORS.bodyDark} />
            <Rect x="42" y="33" width="8" height="2" fill={COLORS.bodyDark} />
          </G>

          {/* Right reel */}
          <G
            rotation={reelRotation}
            origin="82, 34"
          >
            <Circle cx="82" cy="34" r="12" fill={COLORS.reel} />
            <Circle cx="82" cy="34" r="6" fill="url(#reelGradient)" />
            {/* Reel spokes */}
            <Rect x="81" y="24" width="2" height="8" fill={COLORS.bodyDark} />
            <Rect x="81" y="38" width="2" height="8" fill={COLORS.bodyDark} />
            <Rect x="72" y="33" width="8" height="2" fill={COLORS.bodyDark} />
            <Rect x="86" y="33" width="8" height="2" fill={COLORS.bodyDark} />
          </G>

          {/* Center hub detail */}
          <Circle cx="60" cy="34" r="3" fill={COLORS.windowBorder} />

          {/* Label area */}
          <Rect x="35" y="54" width="50" height="8" rx="1" fill={COLORS.label} />

          {/* Bottom notches */}
          <Rect x="25" y="62" width="8" height="3" fill={COLORS.bodyDark} />
          <Rect x="87" y="62" width="8" height="3" fill={COLORS.bodyDark} />
        </Svg>
      </Animated.View>

      {/* Animated spinning overlay for reels when refreshing */}
      {refreshing && (
        <Animated.View
          style={[
            styles.reelOverlay,
            {
              width: size * 2,
              height: size * 1.2,
              transform: [{ rotate: spin }],
            },
          ]}
        >
          <View style={[styles.reelDot, { left: size * 0.63 - 3, top: size * 0.57 - 3, backgroundColor: tintColor }]} />
          <View style={[styles.reelDot, { left: size * 1.37 - 3, top: size * 0.57 - 3, backgroundColor: tintColor }]} />
        </Animated.View>
      )}
    </View>
  );
}

// Hook to use with ScrollView's onScroll
export function useCassetteRefresh() {
  const pullProgress = useRef(new Animated.Value(0)).current;

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: pullProgress } } }],
    { useNativeDriver: false }
  );

  // Convert scroll offset to 0-1 progress
  const progress = pullProgress.interpolate({
    inputRange: [-100, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return { progress, onScroll };
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  reelOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reelDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
