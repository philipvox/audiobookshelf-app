/**
 * src/shared/utils/skeuomorphicStyles.ts
 *
 * Skeuomorphic lighting system for buttons.
 * Creates gradient definitions for directional lighting based on button position.
 */

export type LightPosition = 'left' | 'center' | 'right';
export type ButtonShape = 'circle' | 'rounded-rect';

/**
 * Core lighting configuration values
 */
export const LIGHTING_CONFIG = {
  baseFill: '#262626',
  topEdgeDarken: 0.20,      // Black linear gradient from top
  bottomEdgeLighten: 0.20,  // White linear gradient from bottom
  directionalRadial: 0.10,  // Position-aware white radial highlight
  borderStroke: 0.50,       // White border opacity
  iconInnerShadow: {
    yOffset: 2,
    blur: 3,
    opacity: 0.35,
  },
};

/**
 * Get radial gradient center position based on light source direction.
 *
 * - left position: light comes from upper-right → cx=0.8, cy=0.2
 * - center position: light comes from top → cx=0.5, cy=0.15
 * - right position: light comes from upper-left → cx=0.2, cy=0.2
 */
export function getRadialGradientCenter(position: LightPosition): { cx: string; cy: string } {
  switch (position) {
    case 'left':
      return { cx: '80%', cy: '20%' };
    case 'center':
      return { cx: '50%', cy: '15%' };
    case 'right':
      return { cx: '20%', cy: '20%' };
  }
}

/**
 * Get radial gradient focal point (slightly offset from center for realism)
 */
export function getRadialGradientFocal(position: LightPosition): { fx: string; fy: string } {
  switch (position) {
    case 'left':
      return { fx: '75%', fy: '25%' };
    case 'center':
      return { fx: '50%', fy: '20%' };
    case 'right':
      return { fx: '25%', fy: '25%' };
  }
}

/**
 * Linear gradient stops for top edge darkening
 */
export const TOP_EDGE_GRADIENT = {
  start: { x: 0, y: 0 },
  end: { x: 0, y: 1 },
  stops: [
    { offset: '0%', color: '#000000', opacity: LIGHTING_CONFIG.topEdgeDarken },
    { offset: '40%', color: '#000000', opacity: 0 },
  ],
};

/**
 * Linear gradient stops for bottom edge lightening
 */
export const BOTTOM_EDGE_GRADIENT = {
  start: { x: 0, y: 1 },
  end: { x: 0, y: 0 },
  stops: [
    { offset: '0%', color: '#FFFFFF', opacity: LIGHTING_CONFIG.bottomEdgeLighten },
    { offset: '40%', color: '#FFFFFF', opacity: 0 },
  ],
};

/**
 * Radial gradient stops for directional highlight
 */
export const RADIAL_HIGHLIGHT_GRADIENT = {
  stops: [
    { offset: '0%', color: '#FFFFFF', opacity: LIGHTING_CONFIG.directionalRadial * 2 },
    { offset: '50%', color: '#FFFFFF', opacity: LIGHTING_CONFIG.directionalRadial },
    { offset: '100%', color: '#FFFFFF', opacity: 0 },
  ],
};

/**
 * Border stroke style
 */
export const BORDER_STROKE = {
  color: '#FFFFFF',
  opacity: LIGHTING_CONFIG.borderStroke,
  width: 1,
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

/**
 * Get all gradient IDs for a specific button instance
 */
export function getGradientIds(buttonId: string): {
  topEdge: string;
  bottomEdge: string;
  radialHighlight: string;
} {
  return {
    topEdge: `${buttonId}-top-edge`,
    bottomEdge: `${buttonId}-bottom-edge`,
    radialHighlight: `${buttonId}-radial`,
  };
}

/**
 * Calculate button dimensions based on shape and size
 */
export function getButtonDimensions(
  shape: ButtonShape,
  size: number | { width: number; height: number }
): { width: number; height: number; borderRadius: number } {
  if (typeof size === 'number') {
    return {
      width: size,
      height: size,
      borderRadius: shape === 'circle' ? size / 2 : 5,
    };
  }
  return {
    width: size.width,
    height: size.height,
    borderRadius: shape === 'circle' ? Math.min(size.width, size.height) / 2 : 5,
  };
}
