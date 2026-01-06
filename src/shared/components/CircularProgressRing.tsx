/**
 * src/shared/components/CircularProgressRing.tsx
 *
 * SVG-based circular progress indicator for book covers.
 * Shows progress as a ring around a circular area.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, spacing } from '@/shared/theme';

interface CircularProgressRingProps {
  /** Progress value from 0 to 1 */
  progress: number;
  /** Size of the ring in pixels (default: 48) */
  size?: number;
  /** Stroke width of the ring (default: 3) */
  strokeWidth?: number;
  /** Whether to show percentage text in center (default: true) */
  showPercent?: boolean;
  /** Track color (default: rgba(255,255,255,0.2)) */
  trackColor?: string;
  /** Fill color (default: accent color) */
  fillColor?: string;
  /** Background color inside the ring (default: rgba(0,0,0,0.6)) */
  backgroundColor?: string;
  /** Additional style for the container */
  style?: ViewStyle;
}

/**
 * CircularProgressRing - Circular progress indicator
 *
 * Usage:
 * <CircularProgressRing progress={0.45} />
 * <CircularProgressRing progress={0.75} size={60} showPercent />
 */
export const CircularProgressRing = memo(function CircularProgressRing({
  progress,
  size = 48,
  strokeWidth = 3,
  showPercent = true,
  trackColor = 'rgba(255, 255, 255, 0.2)',
  fillColor = colors.accent,
  backgroundColor = 'rgba(0, 0, 0, 0.6)',
  style,
}: CircularProgressRingProps) {
  // Clamp progress between 0 and 1
  const clampedProgress = Math.max(0, Math.min(1, progress));

  // Calculate dimensions
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - clampedProgress);
  const center = size / 2;

  // Calculate percentage for display
  const percent = Math.round(clampedProgress * 100);

  // Font size scales with ring size
  const fontSize = Math.max(10, size * 0.25);

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {/* Background circle */}
      <View
        style={[
          styles.background,
          {
            width: size - strokeWidth * 2,
            height: size - strokeWidth * 2,
            borderRadius: (size - strokeWidth * 2) / 2,
            backgroundColor,
          },
        ]}
      />

      {/* SVG Ring */}
      <Svg width={size} height={size} style={styles.svg}>
        {/* Track (background ring) */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress (filled portion) */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={fillColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>

      {/* Percentage text */}
      {showPercent && (
        <View style={styles.textContainer}>
          <Text style={[styles.percentText, { fontSize }]}>{percent}%</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  background: {
    position: 'absolute',
  },
  svg: {
    position: 'absolute',
  },
  textContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});

export default CircularProgressRing;
