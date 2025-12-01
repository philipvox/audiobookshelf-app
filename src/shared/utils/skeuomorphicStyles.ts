/**
 * src/shared/utils/skeuomorphicStyles.ts
 *
 * Skeuomorphic design constants and utilities.
 * Matches exact SVG spec for buttons.
 */

export type LightPosition = 'left' | 'center' | 'right';
export type ButtonShape = 'circle' | 'rounded-rect';

/**
 * Core lighting configuration values (from SVG spec)
 */
export const SKEU_CONFIG = {
  // Base fill color
  baseFill: '#262626',

  // Linear gradient opacities (fill-opacity in SVG)
  topEdgeOpacity: 0.2,
  bottomEdgeOpacity: 0.2,

  // Radial gradient opacities (fill-opacity in SVG)
  radialOpacity: 0.1,

  // Border stroke
  borderWidth: 0.7,
  borderOpacity: 0.5,

  // Icon inner shadow (from SVG filter)
  iconShadow: {
    yOffset: 2,
    blur: 3,  // stdDeviation * 2
    opacity: 0.35,
  },

  // Play button icon color
  playIconColor: '#F55F05',
};

/**
 * Convert hex color to rgba with opacity
 */
export function hexToRgba(hex: string, opacity: number): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
