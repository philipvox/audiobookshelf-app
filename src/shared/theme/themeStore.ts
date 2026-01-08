/**
 * src/shared/theme/themeStore.ts
 *
 * Theme store and hooks for dark/light mode.
 * Persisted to AsyncStorage.
 *
 * Usage:
 *   import { useTheme } from '@/shared/theme';
 *   const { colors, mode, toggleMode } = useTheme();
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type ThemeColors,
  type AccentTheme,
  getThemeColors,
  themePresets,
} from './colors';
import { spacing, layout, radius, elevation, scale } from './spacing';
import { typography, fontSize } from './typography';

// =============================================================================
// TYPES
// =============================================================================

export type ThemeMode = 'light' | 'dark';
export type { AccentTheme };

interface ThemeState {
  mode: ThemeMode;
  accentTheme: AccentTheme;
  setMode: (mode: ThemeMode) => void;
  setAccentTheme: (theme: AccentTheme) => void;
  toggleMode: () => void;
}

// =============================================================================
// THEME STORE
// =============================================================================

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'light', // Default to light mode
      accentTheme: 'red', // Default to classic red

      setMode: (mode: ThemeMode) => {
        set({ mode });
      },

      setAccentTheme: (accentTheme: AccentTheme) => {
        set({ accentTheme });
      },

      toggleMode: () => {
        const current = get().mode;
        set({ mode: current === 'light' ? 'dark' : 'light' });
      },
    }),
    {
      name: 'theme-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// =============================================================================
// THEME HOOKS
// =============================================================================

/**
 * Main theme hook - returns everything needed for theming
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { colors, mode, toggleMode, spacing, typography } = useTheme();
 *
 *   return (
 *     <View style={{ backgroundColor: colors.background.primary }}>
 *       <Text style={{ color: colors.text.primary }}>Hello</Text>
 *       <Button onPress={toggleMode}>Toggle Theme</Button>
 *     </View>
 *   );
 * }
 * ```
 */
export function useTheme() {
  const mode = useThemeStore((state) => state.mode);
  const accentTheme = useThemeStore((state) => state.accentTheme);
  const setMode = useThemeStore((state) => state.setMode);
  const setAccentTheme = useThemeStore((state) => state.setAccentTheme);
  const toggleMode = useThemeStore((state) => state.toggleMode);

  const isDark = mode === 'dark';
  const colors: ThemeColors = getThemeColors(accentTheme, isDark);

  return {
    // Colors
    colors,
    // Mode info
    mode,
    isDark,
    // Accent theme
    accentTheme,
    accentThemeName: themePresets[accentTheme].name,
    // Mode setters
    setMode,
    setAccentTheme,
    toggleMode,
    // Design tokens (convenience exports)
    spacing,
    layout,
    radius,
    elevation,
    typography,
    fontSize,
    scale,
  };
}

/**
 * Hook to get just the current theme colors
 * Use this when you only need colors and want minimal re-renders
 *
 * @example
 * ```tsx
 * const colors = useColors();
 * <View style={{ backgroundColor: colors.background.primary }} />
 * ```
 */
export function useColors(): ThemeColors {
  const mode = useThemeStore((state) => state.mode);
  const accentTheme = useThemeStore((state) => state.accentTheme);
  return getThemeColors(accentTheme, mode === 'dark');
}

/**
 * Hook to get just the theme mode
 *
 * @example
 * ```tsx
 * const { mode, isDark } = useThemeMode();
 * ```
 */
export function useThemeMode() {
  const mode = useThemeStore((state) => state.mode);
  return {
    mode,
    isDark: mode === 'dark',
    isLight: mode === 'light',
  };
}

/**
 * Hook to check if dark mode is active
 *
 * @example
 * ```tsx
 * const isDarkMode = useIsDarkMode();
 * const gradient = isDarkMode ? darkGradient : lightGradient;
 * ```
 */
export function useIsDarkMode(): boolean {
  const mode = useThemeStore((state) => state.mode);
  return mode === 'dark';
}

// =============================================================================
// LEGACY EXPORTS (for backwards compatibility)
// =============================================================================

/**
 * Helper to create legacy flat color structure from ThemeColors
 */
function createLegacyColors(colors: ThemeColors, isDark: boolean) {
  return {
    background: colors.background.primary,
    backgroundSecondary: colors.background.secondary,
    backgroundTertiary: colors.background.tertiary,
    text: colors.text.primary,
    textSecondary: colors.text.secondary,
    textTertiary: colors.text.tertiary,
    accent: colors.accent.primary,
    border: colors.border.default,
    tabActive: colors.text.primary,
    tabInactive: colors.text.tertiary,
    surfaceElevated: colors.background.elevated,
    card: colors.surface.card,
    statusBar: (isDark ? 'light-content' : 'dark-content') as 'light-content' | 'dark-content',
    // Semantic colors
    error: colors.semantic.error,
    warning: colors.semantic.warning,
    success: colors.semantic.success,
  };
}

/**
 * @deprecated Use `useTheme()` or `useColors()` instead
 * Legacy basic theme colors - static fallback (uses default red accent)
 */
export const themeColors = {
  light: createLegacyColors(getThemeColors('red', false), false),
  dark: createLegacyColors(getThemeColors('red', true), true),
};

/**
 * @deprecated Use `useTheme()` or `useColors()` instead
 * Legacy hook for basic theme colors - now accent-aware
 */
export function useThemeColors() {
  const mode = useThemeStore((state) => state.mode);
  const accentTheme = useThemeStore((state) => state.accentTheme);
  const isDark = mode === 'dark';
  const colors = getThemeColors(accentTheme, isDark);
  return createLegacyColors(colors, isDark);
}
