/**
 * Color design tokens - Dark theme with gold accent
 * Single source of truth for all colors in the app
 */

export const colors = {
  // Accent - Single source of truth
  accent: '#F3B60C',
  accentDark: '#D9A00A',
  accentSubtle: 'rgba(243, 182, 12, 0.15)',

  // Backgrounds - Dark mode
  backgroundPrimary: '#000000',
  backgroundSecondary: '#0D0D0D',
  backgroundTertiary: '#1A1A1A',
  backgroundElevated: '#262626',
  cardBackground: 'rgba(255, 255, 255, 0.05)',
  cardBackgroundHover: 'rgba(255, 255, 255, 0.08)',

  // Text - Standardized opacities (0.70, 0.50, 0.30)
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.70)',
  textTertiary: 'rgba(255, 255, 255, 0.50)',
  textMuted: 'rgba(255, 255, 255, 0.30)',
  textAccent: '#F3B60C',

  // Borders
  border: 'rgba(255, 255, 255, 0.10)',
  borderLight: 'rgba(255, 255, 255, 0.05)',
  borderFocused: '#F3B60C',

  // Semantic
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FF9500',
  info: '#007AFF',

  // Feature-specific
  heartFill: '#4ADE80',
  sleepTimer: '#FF6B6B',
  downloaded: '#34C759',
  downloading: '#F3B60C',

  // Progress
  progressTrack: 'rgba(255, 255, 255, 0.10)',
  progressFill: '#F3B60C',

  // Overlays
  overlay: {
    light: 'rgba(0, 0, 0, 0.2)',
    medium: 'rgba(0, 0, 0, 0.5)',
    dark: 'rgba(0, 0, 0, 0.8)',
  },

  // Glass effects
  glass: {
    white: 'rgba(255, 255, 255, 0.5)',
    border: 'rgba(255, 255, 255, 0.2)',
  },

  // Gradients (for reference, used with LinearGradient)
  gradients: {
    fadeTop: ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.8)', '#000000'],
    fadeBottom: ['#000000', 'rgba(0, 0, 0, 0.8)', 'rgba(0, 0, 0, 0)'],
  },
} as const;

export type Colors = typeof colors;
export type ColorKey = keyof typeof colors;
