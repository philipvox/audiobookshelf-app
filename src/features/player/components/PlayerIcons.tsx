/**
 * src/features/player/components/PlayerIcons.tsx
 *
 * Custom SVG icons for the media player with inner shadow effects
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, G } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

/**
 * Rewind icon - double left-pointing arrows
 */
export function RewindIcon({ size = 56, color = 'white' }: IconProps) {
  const scale = size / 56;
  const height = 46 * scale;

  return (
    <View style={[styles.iconContainer, { width: size, height }]}>
      <Svg width={size} height={height} viewBox="0 0 56 46" fill="none">
        <Defs>
          <LinearGradient id="rewindShadow1" x1="13" y1="0" x2="13" y2="46" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="black" stopOpacity="0.4" />
            <Stop offset="0.3" stopColor="black" stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="rewindShadow2" x1="41" y1="0" x2="41" y2="46" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="black" stopOpacity="0.4" />
            <Stop offset="0.3" stopColor="black" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {/* First arrow */}
        <Path
          d="M26 3.5C26 1.8 24.1 0.7 22.6 1.6L1.5 21C0.2 21.8 0.2 24.2 1.5 25L22.6 44.4C24.1 45.3 26 44.2 26 42.5V3.5Z"
          fill={color}
        />
        <Path
          d="M26 3.5C26 1.8 24.1 0.7 22.6 1.6L1.5 21C0.2 21.8 0.2 24.2 1.5 25L22.6 44.4C24.1 45.3 26 44.2 26 42.5V3.5Z"
          fill="url(#rewindShadow1)"
        />
        {/* Second arrow */}
        <Path
          d="M54 3.5C54 1.8 52.1 0.7 50.6 1.6L29.5 21C28.2 21.8 28.2 24.2 29.5 25L50.6 44.4C52.1 45.3 54 44.2 54 42.5V3.5Z"
          fill={color}
        />
        <Path
          d="M54 3.5C54 1.8 52.1 0.7 50.6 1.6L29.5 21C28.2 21.8 28.2 24.2 29.5 25L50.6 44.4C52.1 45.3 54 44.2 54 42.5V3.5Z"
          fill="url(#rewindShadow2)"
        />
      </Svg>
    </View>
  );
}

/**
 * Fast Forward icon - double right-pointing arrows
 */
export function FastForwardIcon({ size = 56, color = 'white' }: IconProps) {
  const scale = size / 56;
  const height = 46 * scale;

  return (
    <View style={[styles.iconContainer, { width: size, height }]}>
      <Svg width={size} height={height} viewBox="0 0 56 46" fill="none">
        <Defs>
          <LinearGradient id="ffShadow1" x1="14" y1="0" x2="14" y2="46" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="black" stopOpacity="0.4" />
            <Stop offset="0.3" stopColor="black" stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="ffShadow2" x1="42" y1="0" x2="42" y2="46" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="black" stopOpacity="0.4" />
            <Stop offset="0.3" stopColor="black" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {/* First arrow */}
        <Path
          d="M2 3.5C2 1.8 3.9 0.7 5.4 1.6L26.5 21C27.8 21.8 27.8 24.2 26.5 25L5.4 44.4C3.9 45.3 2 44.2 2 42.5V3.5Z"
          fill={color}
        />
        <Path
          d="M2 3.5C2 1.8 3.9 0.7 5.4 1.6L26.5 21C27.8 21.8 27.8 24.2 26.5 25L5.4 44.4C3.9 45.3 2 44.2 2 42.5V3.5Z"
          fill="url(#ffShadow1)"
        />
        {/* Second arrow */}
        <Path
          d="M30 3.5C30 1.8 31.9 0.7 33.4 1.6L54.5 21C55.8 21.8 55.8 24.2 54.5 25L33.4 44.4C31.9 45.3 30 44.2 30 42.5V3.5Z"
          fill={color}
        />
        <Path
          d="M30 3.5C30 1.8 31.9 0.7 33.4 1.6L54.5 21C55.8 21.8 55.8 24.2 54.5 25L33.4 44.4C31.9 45.3 30 44.2 30 42.5V3.5Z"
          fill="url(#ffShadow2)"
        />
      </Svg>
    </View>
  );
}

/**
 * Play icon - single right-pointing arrow (orange)
 */
export function PlayIcon({ size = 36, color = '#F55F05' }: IconProps) {
  const scale = size / 36;
  const height = 46 * scale;

  return (
    <View style={[styles.iconContainer, { width: size, height }]}>
      <Svg width={size} height={height} viewBox="0 0 36 46" fill="none">
        <Defs>
          <LinearGradient id="playShadow" x1="18" y1="0" x2="18" y2="46" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="black" stopOpacity="0.4" />
            <Stop offset="0.3" stopColor="black" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path
          d="M0 3.5C0 1.8 1.9 0.7 3.4 1.6L34.5 21C35.8 21.8 35.8 24.2 34.5 25L3.4 44.4C1.9 45.3 0 44.2 0 42.5V3.5Z"
          fill={color}
        />
        <Path
          d="M0 3.5C0 1.8 1.9 0.7 3.4 1.6L34.5 21C35.8 21.8 35.8 24.2 34.5 25L3.4 44.4C1.9 45.3 0 44.2 0 42.5V3.5Z"
          fill="url(#playShadow)"
        />
      </Svg>
    </View>
  );
}

/**
 * Pause icon - two vertical bars (orange)
 */
export function PauseIcon({ size = 36, color = '#F55F05' }: IconProps) {
  const scale = size / 36;
  const height = 46 * scale;

  return (
    <View style={[styles.iconContainer, { width: size, height }]}>
      <Svg width={size} height={height} viewBox="0 0 36 46" fill="none">
        <Defs>
          <LinearGradient id="pauseShadow" x1="18" y1="0" x2="18" y2="46" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="black" stopOpacity="0.4" />
            <Stop offset="0.3" stopColor="black" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {/* Left bar */}
        <Path
          d="M2 4C2 1.79 3.79 0 6 0H10C12.21 0 14 1.79 14 4V42C14 44.21 12.21 46 10 46H6C3.79 46 2 44.21 2 42V4Z"
          fill={color}
        />
        <Path
          d="M2 4C2 1.79 3.79 0 6 0H10C12.21 0 14 1.79 14 4V42C14 44.21 12.21 46 10 46H6C3.79 46 2 44.21 2 42V4Z"
          fill="url(#pauseShadow)"
        />
        {/* Right bar */}
        <Path
          d="M22 4C22 1.79 23.79 0 26 0H30C32.21 0 34 1.79 34 4V42C34 44.21 32.21 46 30 46H26C23.79 46 22 44.21 22 42V4Z"
          fill={color}
        />
        <Path
          d="M22 4C22 1.79 23.79 0 26 0H30C32.21 0 34 1.79 34 4V42C34 44.21 32.21 46 30 46H26C23.79 46 22 44.21 22 42V4Z"
          fill="url(#pauseShadow)"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
