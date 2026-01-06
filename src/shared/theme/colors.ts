/**
 * src/shared/theme/colors.ts
 *
 * Complete color design tokens for light and dark themes.
 * Single source of truth for ALL colors in the app.
 *
 * Usage:
 *   import { useTheme } from '@/shared/theme';
 *   const { colors } = useTheme();
 *   <View style={{ backgroundColor: colors.background.primary }} />
 */

// =============================================================================
// ACCENT COLORS (Same in both themes)
// =============================================================================

export const accentColors = {
  /** Primary accent - red (used sparingly) */
  primary: '#E53935',
  primaryDark: '#C62828',
  primarySubtle: 'rgba(229, 57, 53, 0.15)',
  /** @deprecated Use primary instead */
  gold: '#E53935',
  /** @deprecated Use primaryDark instead */
  goldDark: '#C62828',
  /** @deprecated Use primarySubtle instead */
  goldSubtle: 'rgba(229, 57, 53, 0.15)',
  red: '#E53935',
  redLight: '#EF5350',
  blue: '#0146F5',
  blueLight: '#64B5F6',
} as const;

// =============================================================================
// LIGHT THEME COLORS
// =============================================================================

export const lightColors = {
  // Backgrounds
  background: {
    primary: '#FFFFFF',
    secondary: '#F5F5F5',
    tertiary: '#EEEEEE',
    elevated: '#FFFFFF',
  },

  // Surfaces
  surface: {
    default: '#FFFFFF',
    raised: '#FFFFFF',
    sunken: '#F5F5F5',
    card: 'rgba(0, 0, 0, 0.03)',
    cardHover: 'rgba(0, 0, 0, 0.05)',
  },

  // Text
  text: {
    primary: '#000000',
    secondary: 'rgba(0,0,0,0.70)',
    tertiary: 'rgba(0,0,0,0.50)',
    disabled: 'rgba(0,0,0,0.30)',
    inverse: '#FFFFFF',
    accent: '#E53935',
  },

  // Icons
  icon: {
    primary: '#000000',
    secondary: 'rgba(0,0,0,0.60)',
    tertiary: 'rgba(0,0,0,0.40)',
    accent: '#E53935',
    inverse: '#FFFFFF',
  },

  // Borders
  border: {
    default: 'rgba(0,0,0,0.12)',
    strong: 'rgba(0,0,0,0.20)',
    light: 'rgba(0,0,0,0.06)',
    focused: '#000000',
  },

  // Buttons
  button: {
    primary: '#000000',
    primaryText: '#FFFFFF',
    secondary: 'transparent',
    secondaryText: '#000000',
    secondaryBorder: '#000000',
    ghost: 'transparent',
    ghostText: '#000000',
    destructive: '#E53935',
    destructiveText: '#FFFFFF',
    disabled: 'rgba(0,0,0,0.12)',
    disabledText: 'rgba(0,0,0,0.30)',
  },

  // Player (stays dark for cinematic feel in light mode)
  player: {
    background: '#000000',
    backgroundSecondary: '#1A1A1A',
    backgroundTertiary: '#262626',
    surface: '#1A1A1A',
    surfaceRaised: '#262626',
    text: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.70)',
    textTertiary: 'rgba(255,255,255,0.50)',
    textMuted: 'rgba(255,255,255,0.30)',
    control: '#FFFFFF',
    controlSecondary: 'rgba(255,255,255,0.60)',
    controlMuted: 'rgba(255,255,255,0.40)',
    accent: '#E53935',
    accentRed: '#E53935',
    border: 'rgba(255,255,255,0.10)',
    borderStrong: 'rgba(255,255,255,0.20)',
    disc: '#1A1A1A',
    discLabel: '#262626',
    discGroove: 'rgba(255,255,255,0.05)',
    discRing: '#6B6B6B',
    overlay: 'rgba(0,0,0,0.50)',
    overlayHeavy: 'rgba(0,0,0,0.70)',
    sheetBackground: '#1C1C1E',
    sheetHandle: 'rgba(255,255,255,0.30)',
    tickDefault: 'rgba(255,255,255,0.40)',
    tickActive: '#E53935',
    markerColor: '#E53935',
    // Standard controls (when shown over light backgrounds)
    standardControlsBg: '#FFFFFF',
    standardControlsText: '#000000',
    standardControlsIcon: '#000000',
  },

  // Progress
  progress: {
    track: 'rgba(0,0,0,0.10)',
    fill: '#E53935',
    buffer: 'rgba(229,57,53,0.30)',
  },

  // Navigation
  nav: {
    background: '#FFFFFF',
    border: 'rgba(0,0,0,0.10)',
    active: '#000000',
    inactive: 'rgba(0,0,0,0.40)',
  },

  // Semantic
  semantic: {
    success: '#4CAF50',
    successLight: '#E8F5E9',
    warning: '#FF9800',
    warningLight: '#FFF3E0',
    error: '#E53935',
    errorLight: '#FFEBEE',
    info: '#2196F3',
    infoLight: '#E3F2FD',
  },

  // Feature-specific
  feature: {
    heartFill: '#4ADE80',
    sleepTimer: '#FF6B6B',
    downloaded: '#34C759',
    downloading: '#000000',
    streaming: '#6496FF',  // Cloud/streaming badge
    bookmark: '#0146F5',
    bookmarkStem: '#64B5F6',
  },

  // Queue specific
  queue: {
    background: '#FFFFFF',
    itemBackground: '#F5F5F5',
    nowPlaying: 'rgba(0,0,0,0.05)',
    handle: 'rgba(0,0,0,0.20)',
    divider: 'rgba(0,0,0,0.08)',
  },

  // Search specific
  search: {
    inputBackground: '#F5F5F5',
    inputBorder: 'rgba(0,0,0,0.10)',
    placeholder: 'rgba(0,0,0,0.40)',
    highlight: 'rgba(0,0,0,0.10)',
  },

  // Overlays
  overlay: {
    light: 'rgba(0,0,0,0.20)',
    medium: 'rgba(0,0,0,0.50)',
    dark: 'rgba(0,0,0,0.80)',
  },

  // Glass effects
  glass: {
    white: 'rgba(255,255,255,0.80)',
    border: 'rgba(0,0,0,0.10)',
  },

  // System
  statusBar: 'dark-content' as const,
  statusBarBg: '#FFFFFF',
} as const;

// =============================================================================
// DARK THEME COLORS
// =============================================================================

export const darkColors = {
  // Backgrounds
  background: {
    primary: '#000000',
    secondary: '#1A1A1A',
    tertiary: '#262626',
    elevated: '#2C2C2C',
  },

  // Surfaces
  surface: {
    default: '#1A1A1A',
    raised: '#262626',
    sunken: '#0D0D0D',
    card: 'rgba(255, 255, 255, 0.05)',
    cardHover: 'rgba(255, 255, 255, 0.08)',
  },

  // Text
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255,255,255,0.70)',
    tertiary: 'rgba(255,255,255,0.50)',
    disabled: 'rgba(255,255,255,0.30)',
    inverse: '#000000',
    accent: '#E53935',
  },

  // Icons
  icon: {
    primary: '#FFFFFF',
    secondary: 'rgba(255,255,255,0.70)',
    tertiary: 'rgba(255,255,255,0.50)',
    accent: '#E53935',
    inverse: '#000000',
  },

  // Borders
  border: {
    default: 'rgba(255,255,255,0.10)',
    strong: 'rgba(255,255,255,0.20)',
    light: 'rgba(255,255,255,0.05)',
    focused: '#FFFFFF',
  },

  // Buttons
  button: {
    primary: '#FFFFFF',
    primaryText: '#000000',
    secondary: 'transparent',
    secondaryText: '#FFFFFF',
    secondaryBorder: '#FFFFFF',
    ghost: 'transparent',
    ghostText: '#FFFFFF',
    destructive: '#E53935',
    destructiveText: '#FFFFFF',
    disabled: 'rgba(255,255,255,0.12)',
    disabledText: 'rgba(255,255,255,0.30)',
  },

  // Player
  player: {
    background: '#000000',
    backgroundSecondary: '#1A1A1A',
    backgroundTertiary: '#262626',
    surface: '#1A1A1A',
    surfaceRaised: '#262626',
    text: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.70)',
    textTertiary: 'rgba(255,255,255,0.50)',
    textMuted: 'rgba(255,255,255,0.30)',
    control: '#FFFFFF',
    controlSecondary: 'rgba(255,255,255,0.60)',
    controlMuted: 'rgba(255,255,255,0.40)',
    accent: '#E53935',
    accentRed: '#E53935',
    border: 'rgba(255,255,255,0.10)',
    borderStrong: 'rgba(255,255,255,0.20)',
    disc: '#1A1A1A',
    discLabel: '#262626',
    discGroove: 'rgba(255,255,255,0.05)',
    discRing: '#6B6B6B',
    overlay: 'rgba(0,0,0,0.50)',
    overlayHeavy: 'rgba(0,0,0,0.70)',
    sheetBackground: '#1C1C1E',
    sheetHandle: 'rgba(255,255,255,0.30)',
    tickDefault: 'rgba(255,255,255,0.40)',
    tickActive: '#E53935',
    markerColor: '#E53935',
    // Standard controls (dark mode)
    standardControlsBg: '#000000',
    standardControlsText: '#FFFFFF',
    standardControlsIcon: '#FFFFFF',
  },

  // Progress
  progress: {
    track: 'rgba(255,255,255,0.10)',
    fill: '#E53935',
    buffer: 'rgba(229,57,53,0.30)',
  },

  // Navigation
  nav: {
    background: '#000000',
    border: 'rgba(255,255,255,0.10)',
    active: '#FFFFFF',
    inactive: 'rgba(255,255,255,0.50)',
  },

  // Semantic
  semantic: {
    success: '#66BB6A',
    successLight: 'rgba(102,187,106,0.15)',
    warning: '#FFA726',
    warningLight: 'rgba(255,167,38,0.15)',
    error: '#EF5350',
    errorLight: 'rgba(239,83,80,0.15)',
    info: '#42A5F5',
    infoLight: 'rgba(66,165,245,0.15)',
  },

  // Feature-specific
  feature: {
    heartFill: '#4ADE80',
    sleepTimer: '#FF6B6B',
    downloaded: '#34C759',
    downloading: '#FFFFFF',
    streaming: '#6496FF',  // Cloud/streaming badge
    bookmark: '#0146F5',
    bookmarkStem: '#64B5F6',
  },

  // Queue specific
  queue: {
    background: '#1A1A1A',
    itemBackground: '#262626',
    nowPlaying: 'rgba(255,255,255,0.08)',
    handle: 'rgba(255,255,255,0.30)',
    divider: 'rgba(255,255,255,0.08)',
  },

  // Search specific
  search: {
    inputBackground: '#1A1A1A',
    inputBorder: 'rgba(255,255,255,0.10)',
    placeholder: 'rgba(255,255,255,0.40)',
    highlight: 'rgba(255,255,255,0.15)',
  },

  // Overlays
  overlay: {
    light: 'rgba(0,0,0,0.20)',
    medium: 'rgba(0,0,0,0.50)',
    dark: 'rgba(0,0,0,0.80)',
  },

  // Glass effects
  glass: {
    white: 'rgba(255,255,255,0.50)',
    border: 'rgba(255,255,255,0.20)',
  },

  // System
  statusBar: 'light-content' as const,
  statusBarBg: '#000000',
} as const;

// =============================================================================
// LEGACY EXPORTS (for backwards compatibility during migration)
// =============================================================================

/**
 * @deprecated Use `useTheme().colors` instead
 * Legacy colors export - dark mode only, flat structure
 */
export const colors = {
  // Accent - Single source of truth (red, used sparingly)
  accent: '#E53935',
  accentDark: '#C62828',
  accentSubtle: 'rgba(229, 57, 53, 0.15)',

  // Red accent - For player controls, timeline markers, active states
  accentRed: '#E53935',

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
  textAccent: '#E53935',

  // Borders
  border: 'rgba(255, 255, 255, 0.10)',
  borderLight: 'rgba(255, 255, 255, 0.05)',
  borderFocused: '#FFFFFF',

  // Semantic
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FF9500',
  info: '#007AFF',

  // Feature-specific
  heartFill: '#4ADE80',
  sleepTimer: '#FF6B6B',
  downloaded: '#34C759',
  downloading: '#FFFFFF',

  // Progress
  progressTrack: 'rgba(255, 255, 255, 0.10)',
  progressFill: '#E53935',

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

// =============================================================================
// TYPES
// =============================================================================

export type ThemeColors = typeof lightColors;
export type LightColors = typeof lightColors;
export type DarkColors = typeof darkColors;
export type Colors = typeof colors;
export type ColorKey = keyof typeof colors;
