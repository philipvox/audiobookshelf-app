/**
 * src/shared/theme/colors.ts
 *
 * Complete color design tokens for light and dark themes.
 * Single source of truth for ALL colors in the app.
 *
 * Now supports three accent themes:
 *   - 'red' (current default)
 *   - 'electric' (Swiss minimal blue)
 *   - 'lime' (high contrast lime)
 *
 * Usage:
 *   import { useTheme } from '@/shared/theme';
 *   const { colors } = useTheme();
 *   <View style={{ backgroundColor: colors.background.primary }} />
 */

// =============================================================================
// ACCENT THEME DEFINITIONS
// =============================================================================

export type AccentTheme = 'red' | 'electric' | 'lime';

/**
 * Accent color palettes for each theme variant
 */
export const accentThemes = {
  red: {
    primary: '#E53935',
    primaryDark: '#C62828',
    primaryLight: '#EF5350',
    primarySubtle: 'rgba(229, 57, 53, 0.15)',
    // For dark mode text/badges that need to be lighter
    onDark: '#EF5350',
    onDarkSubtle: 'rgba(239, 83, 80, 0.20)',
    // For light mode backgrounds
    lightBg: '#FFEBEE',
    lightBgSubtle: '#FFF5F5',
    // Text color when accent is used as background
    textOnAccent: '#FFFFFF',
  },
  electric: {
    primary: '#0146F5',
    primaryDark: '#0035C4',
    primaryLight: '#6496FF',
    primarySubtle: 'rgba(1, 70, 245, 0.10)',
    onDark: '#6496FF',
    onDarkSubtle: 'rgba(100, 150, 255, 0.20)',
    lightBg: '#E8EEFF',
    lightBgSubtle: '#F5F7FF',
    textOnAccent: '#FFFFFF',
  },
  lime: {
    primary: '#BFFF00',
    primaryDark: '#9ACD00',
    primaryLight: '#D4FF4D',
    primarySubtle: 'rgba(191, 255, 0, 0.15)',
    onDark: '#BFFF00',
    onDarkSubtle: 'rgba(191, 255, 0, 0.20)',
    lightBg: '#F7FFE0',
    lightBgSubtle: '#FCFFF5',
    textOnAccent: '#000000',
  },
} as const;

// =============================================================================
// ACCENT COLORS (Same in both themes - kept for backwards compatibility)
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
  /** Green accent - for success/positive states */
  green: '#4CAF50',
  greenLight: '#66BB6A',
  /** Orange accent - for warning/partial states */
  orange: '#FF9800',
  orangeLight: '#FFA726',
  /** Lime accent - for lime theme */
  lime: '#BFFF00',
  limeLight: '#D4FF4D',
} as const;

// =============================================================================
// HELPER: Generate theme colors based on accent
// =============================================================================

const createLightColors = (accent: typeof accentThemes[AccentTheme]) => ({
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
    accent: accent.primary,
  },

  // Icons
  icon: {
    primary: '#000000',
    secondary: 'rgba(0,0,0,0.60)',
    tertiary: 'rgba(0,0,0,0.40)',
    accent: accent.primary,
    inverse: '#FFFFFF',
    disabled: 'rgba(0,0,0,0.25)',
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
    accent: accent.primary,
    accentText: accent.primary === '#BFFF00' ? '#000000' : '#FFFFFF',
    destructive: '#E53935',
    destructiveText: '#FFFFFF',
    disabled: 'rgba(0,0,0,0.12)',
    disabledText: 'rgba(0,0,0,0.30)',
  },

  // Player (respects light/dark mode)
  player: {
    background: '#FFFFFF',
    backgroundSecondary: '#F5F5F5',
    backgroundTertiary: '#EEEEEE',
    surface: '#F5F5F5',
    surfaceRaised: '#FFFFFF',
    text: '#000000',
    textSecondary: 'rgba(0,0,0,0.70)',
    textTertiary: 'rgba(0,0,0,0.50)',
    textMuted: 'rgba(0,0,0,0.30)',
    control: '#000000',
    controlSecondary: 'rgba(0,0,0,0.60)',
    controlMuted: 'rgba(0,0,0,0.40)',
    accent: accent.primary,
    accentRed: '#E53935', // Keep red for specific use cases
    border: 'rgba(0,0,0,0.10)',
    borderStrong: 'rgba(0,0,0,0.20)',
    disc: '#F5F5F5',
    discLabel: '#EEEEEE',
    discGroove: 'rgba(0,0,0,0.05)',
    discRing: '#CCCCCC',
    overlay: 'rgba(255,255,255,0.50)',
    overlayHeavy: 'rgba(255,255,255,0.70)',
    sheetBackground: '#FFFFFF',
    sheetHandle: 'rgba(0,0,0,0.30)',
    tickDefault: 'rgba(0,0,0,0.40)',
    tickActive: accent.primary,
    markerColor: accent.primary,
    // Standard controls (light mode)
    standardControlsBg: '#FFFFFF',
    standardControlsText: '#000000',
    standardControlsIcon: '#000000',
    // Floating widget (control bar in light mode)
    widgetBackground: 'rgba(0,0,0,0)',
    widgetIcon: '#1A1A1A',
    widgetDivider: 'rgba(0,0,0,0.1)',
    widgetTrack: '#D4D4D4',
    widgetTimeLabel: '#1A1A1A',
    widgetBorder: 'rgba(0,0,0,0.15)',
    widgetButtonBg: '#FFFFFF',
    // Gradient colors (light mode - white fades)
    gradientStart: 'rgba(255,255,255,0.6)',
    gradientMid: 'rgba(255,255,255,0.4)',
    gradientEnd: 'transparent',
  },

  // Progress
  progress: {
    track: 'rgba(0,0,0,0.10)',
    fill: accent.primary,
    buffer: accent.primarySubtle,
  },

  // Navigation
  nav: {
    background: '#FFFFFF',
    border: 'rgba(0,0,0,0.10)',
    active: '#000000',
    inactive: 'rgba(0,0,0,0.40)',
  },

  // Semantic (these stay consistent across accent themes)
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
    streaming: '#6496FF',
    bookmark: accent.primary,
    bookmarkStem: accent.primaryLight,
  },

  // Queue specific
  queue: {
    background: '#FFFFFF',
    itemBackground: '#F5F5F5',
    nowPlaying: accent.primarySubtle,
    handle: 'rgba(0,0,0,0.20)',
    divider: 'rgba(0,0,0,0.08)',
    text: '#000000',
    subtext: 'rgba(0,0,0,0.60)',
    badge: 'rgba(0,0,0,0.08)',
    item: '#F5F5F5',
    itemActive: 'rgba(0,0,0,0.10)',
    border: 'rgba(0,0,0,0.08)',
  },

  // Search specific
  search: {
    inputBackground: '#F5F5F5',
    inputBorder: 'rgba(0,0,0,0.10)',
    placeholder: 'rgba(0,0,0,0.40)',
    highlight: accent.primarySubtle,
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

  // Accent (for direct access)
  accent: {
    primary: accent.primary,
    primaryDark: accent.primaryDark,
    primaryLight: accent.primaryLight,
    primarySubtle: accent.primarySubtle,
    onDark: accent.onDark,
    onDarkSubtle: accent.onDarkSubtle,
    lightBg: accent.lightBg,
    lightBgSubtle: accent.lightBgSubtle,
    textOnAccent: accent.textOnAccent,
  },

  // System
  statusBar: 'dark-content' as const,
  statusBarBg: '#FFFFFF',
});

const createDarkColors = (accent: typeof accentThemes[AccentTheme]) => ({
  // Backgrounds
  background: {
    primary: '#000000',
    secondary: '#000000',
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
    accent: accent.onDark,
  },

  // Icons
  icon: {
    primary: '#FFFFFF',
    secondary: 'rgba(255,255,255,0.70)',
    tertiary: 'rgba(255,255,255,0.50)',
    accent: accent.onDark,
    inverse: '#000000',
    disabled: 'rgba(255,255,255,0.25)',
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
    accent: accent.primary,
    accentText: accent.primary === '#BFFF00' ? '#000000' : '#FFFFFF',
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
    accent: accent.primary,
    accentRed: '#E53935', // Keep red for specific use cases
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
    tickActive: accent.primary,
    markerColor: accent.primary,
    // Standard controls (dark mode)
    standardControlsBg: '#000000',
    standardControlsText: '#FFFFFF',
    standardControlsIcon: '#FFFFFF',
    // Floating widget (control bar over artwork in dark mode - transparent)
    widgetBackground: 'transparent',
    widgetIcon: '#FFFFFF',
    widgetDivider: 'rgba(255,255,255,0.15)',
    widgetTrack: 'rgba(255,255,255,0.2)',
    widgetTimeLabel: '#FFFFFF',
    widgetBorder: 'rgba(255,255,255,0.2)',
    widgetButtonBg: 'transparent',
    // Gradient colors (dark mode - black fades)
    gradientStart: 'rgba(0,0,0,0.6)',
    gradientMid: 'rgba(0,0,0,0.4)',
    gradientEnd: 'transparent',
  },

  // Progress
  progress: {
    track: 'rgba(255,255,255,0.10)',
    fill: accent.primary,
    buffer: accent.onDarkSubtle,
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
    streaming: '#6496FF',
    bookmark: accent.primary,
    bookmarkStem: accent.primaryLight,
  },

  // Queue specific
  queue: {
    background: '#1A1A1A',
    itemBackground: '#262626',
    nowPlaying: accent.onDarkSubtle,
    handle: 'rgba(255,255,255,0.30)',
    divider: 'rgba(255,255,255,0.08)',
    text: '#FFFFFF',
    subtext: 'rgba(255,255,255,0.60)',
    badge: 'rgba(255,255,255,0.12)',
    item: '#262626',
    itemActive: 'rgba(255,255,255,0.10)',
    border: 'rgba(255,255,255,0.08)',
  },

  // Search specific
  search: {
    inputBackground: '#1A1A1A',
    inputBorder: 'rgba(255,255,255,0.10)',
    placeholder: 'rgba(255,255,255,0.40)',
    highlight: accent.onDarkSubtle,
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

  // Accent (for direct access)
  accent: {
    primary: accent.primary,
    primaryDark: accent.primaryDark,
    primaryLight: accent.primaryLight,
    primarySubtle: accent.primarySubtle,
    onDark: accent.onDark,
    onDarkSubtle: accent.onDarkSubtle,
    lightBg: accent.lightBg,
    lightBgSubtle: accent.lightBgSubtle,
    textOnAccent: accent.textOnAccent,
  },

  // System
  statusBar: 'light-content' as const,
  statusBarBg: '#000000',
});

// =============================================================================
// GENERATED THEME COLORS
// =============================================================================

/** Light theme with Red accent (default) */
export const lightColors = createLightColors(accentThemes.red);

/** Dark theme with Red accent (default) */
export const darkColors = createDarkColors(accentThemes.red);

/** Light theme with Electric Blue accent */
export const lightColorsElectric = createLightColors(accentThemes.electric);

/** Dark theme with Electric Blue accent */
export const darkColorsElectric = createDarkColors(accentThemes.electric);

/** Light theme with Lime accent */
export const lightColorsLime = createLightColors(accentThemes.lime);

/** Dark theme with Lime accent */
export const darkColorsLime = createDarkColors(accentThemes.lime);

// =============================================================================
// THEME GETTER HELPER
// =============================================================================

/**
 * Get colors for a specific accent theme and mode
 * @param accentTheme - 'red' | 'electric' | 'lime'
 * @param isDark - Whether dark mode is active
 */
export const getThemeColors = (accentTheme: AccentTheme, isDark: boolean) => {
  const accent = accentThemes[accentTheme];
  return isDark ? createDarkColors(accent) : createLightColors(accent);
};

/**
 * All available theme combinations for easy access
 */
export const themePresets = {
  red: {
    light: lightColors,
    dark: darkColors,
    accent: accentThemes.red,
    name: 'Classic Red',
    description: 'The original Secret Library accent',
  },
  electric: {
    light: lightColorsElectric,
    dark: darkColorsElectric,
    accent: accentThemes.electric,
    name: 'Electric Blue',
    description: 'Swiss minimal - white does the work',
  },
  lime: {
    light: lightColorsLime,
    dark: darkColorsLime,
    accent: accentThemes.lime,
    name: 'Lime',
    description: 'High contrast, high energy',
  },
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

export type LightColors = ReturnType<typeof createLightColors>;
export type DarkColors = ReturnType<typeof createDarkColors>;
/** Theme colors - can be either light or dark theme */
export type ThemeColors = LightColors | DarkColors;
export type Colors = typeof colors;
export type ColorKey = keyof typeof colors;
export type AccentThemeConfig = typeof accentThemes[AccentTheme];
