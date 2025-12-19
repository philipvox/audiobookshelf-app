/**
 * LucideIcon - Wrapper component for Lucide icons
 * Provides consistent sizing, colors, and accessibility
 */

import React from 'react';
import { type LucideIcon as LucideIconType } from 'lucide-react-native';
import { moderateScale } from '@/shared/theme';
import { ICON_SIZES, ICON_STROKE_WIDTH, ICON_COLORS, type IconSize, type IconColor } from './constants';

interface LucideIconProps {
  /** The Lucide icon component to render */
  icon: LucideIconType;
  /** Size - use preset or number */
  size?: IconSize | number;
  /** Color - use preset or string */
  color?: IconColor | string;
  /** Stroke width (default: 2) */
  strokeWidth?: number;
  /** Accessibility label (required for screen readers) */
  accessibilityLabel: string;
  /** Whether to apply responsive scaling */
  scaled?: boolean;
}

export function LucideIcon({
  icon: IconComponent,
  size = 'lg',
  color = 'primary',
  strokeWidth = ICON_STROKE_WIDTH,
  accessibilityLabel,
  scaled = true,
}: LucideIconProps) {
  // Resolve size
  const numericSize = typeof size === 'number' ? size : ICON_SIZES[size];
  const finalSize = scaled ? moderateScale(numericSize) : numericSize;

  // Resolve color
  const finalColor = color in ICON_COLORS
    ? ICON_COLORS[color as IconColor]
    : color;

  return (
    <IconComponent
      size={finalSize}
      color={finalColor}
      strokeWidth={strokeWidth}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
    />
  );
}

export default LucideIcon;
