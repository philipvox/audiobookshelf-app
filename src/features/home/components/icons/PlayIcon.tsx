/**
 * src/features/home/components/icons/PlayIcon.tsx
 *
 * Lime green play triangle icon - exact Anima SVG (23x27)
 */

import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../../homeDesign';

interface PlayIconProps {
  size?: number;
  color?: string;
}

// Exact Anima play icon dimensions: 23x27
const ORIGINAL_WIDTH = 23;
const ORIGINAL_HEIGHT = 27;

export function PlayIcon({ size = 27, color = COLORS.playButton }: PlayIconProps) {
  // Scale based on height (27 is the original height)
  const scale = size / ORIGINAL_HEIGHT;
  const width = ORIGINAL_WIDTH * scale;
  const height = size;

  return (
    <Svg width={width} height={height} viewBox="0 0 23 27" fill="none">
      <Path
        d="M0 4.00645C0 0.854648 3.47562 -1.05901 6.13895 0.626383L21.0275 10.048C23.5089 11.6183 23.5089 15.2379 21.0275 16.8082L6.13895 26.2299C3.47562 27.9153 0 26.0016 0 22.8498V4.00645Z"
        fill={color}
      />
    </Svg>
  );
}

// Simple centered play triangle for use in play button (unchanged for compatibility)
export function PlayTriangle({ size = 24, color = COLORS.playButton }: PlayIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 5.14v13.72c0 1.18 1.32 1.89 2.28 1.21l9.12-6.86c.82-.62.82-1.8 0-2.42L10.28 3.93C9.32 3.25 8 3.96 8 5.14z"
        fill={color}
      />
    </Svg>
  );
}
