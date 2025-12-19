/**
 * SkipBack30 - Custom icon for skip back 30 seconds
 * Matches Lucide style (2px stroke, rounded caps)
 */

import React from 'react';
import Svg, { Path, G } from 'react-native-svg';
import { moderateScale } from '@/shared/theme';
import { ICON_COLORS, type IconColor } from './constants';

interface SkipBack30Props {
  size?: number;
  color?: IconColor | string;
  strokeWidth?: number;
  accessibilityLabel?: string;
  scaled?: boolean;
}

export function SkipBack30({
  size = 24,
  color = 'primary',
  strokeWidth = 2,
  accessibilityLabel = 'Skip back 30 seconds',
  scaled = true,
}: SkipBack30Props) {
  const finalSize = scaled ? moderateScale(size) : size;
  const finalColor = color in ICON_COLORS
    ? ICON_COLORS[color as IconColor]
    : color;

  return (
    <Svg
      width={finalSize}
      height={finalSize}
      viewBox="0 0 24 24"
      fill="none"
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
    >
      <G>
        {/* Circular arrow pointing left (counterclockwise) */}
        <Path
          d="M12 5V2L7 6l5 4V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6"
          stroke={finalColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* "3" character */}
        <Path
          d="M9.5 12.5c0-0.8 0.5-1.5 1.3-1.5 0.8 0 1.2 0.5 1.2 1.1 0 0.5-0.3 0.9-0.8 1.1 0.6 0.2 1 0.6 1 1.3 0 0.7-0.5 1.5-1.5 1.5-0.9 0-1.4-0.7-1.4-1.5"
          stroke={finalColor}
          strokeWidth={strokeWidth * 0.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* "0" character */}
        <Path
          d="M15.5 11c0.8 0 1.5 0.7 1.5 2s-0.7 2-1.5 2-1.5-0.7-1.5-2 0.7-2 1.5-2z"
          stroke={finalColor}
          strokeWidth={strokeWidth * 0.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </G>
    </Svg>
  );
}

export default SkipBack30;
