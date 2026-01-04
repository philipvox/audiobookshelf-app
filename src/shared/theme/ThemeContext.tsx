/**
 * src/shared/theme/ThemeContext.tsx
 *
 * Theme context for switching between light and dark modes.
 * Provides useTheme hook for accessing theme state and colors.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, ThemeColors } from './colors';

const THEME_STORAGE_KEY = '@app_theme_mode';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  /** Current theme mode setting */
  mode: ThemeMode;
  /** Resolved theme (light or dark) */
  resolvedTheme: 'light' | 'dark';
  /** Current theme colors */
  colors: ThemeColors;
  /** Whether dark mode is active */
  isDark: boolean;
  /** Set theme mode */
  setMode: (mode: ThemeMode) => void;
  /** Toggle between light and dark */
  toggle: () => void;
  /** Status bar style */
  statusBarStyle: 'light-content' | 'dark-content';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  /** Initial theme mode (defaults to 'light' for redesign development) */
  initialMode?: ThemeMode;
}

/**
 * Theme provider component
 * Wraps the app and provides theme state to all children
 */
export function ThemeProvider({ children, initialMode = 'light' }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(initialMode);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme on mount
  useEffect(() => {
    loadSavedTheme();
  }, []);

  const loadSavedTheme = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
        setModeState(savedMode as ThemeMode);
      }
    } catch (error) {
      console.warn('[ThemeContext] Failed to load saved theme:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  // Set mode and persist
  const setMode = useCallback(async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (error) {
      console.warn('[ThemeContext] Failed to save theme:', error);
    }
  }, []);

  // Toggle between light and dark
  const toggle = useCallback(() => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
  }, [mode, setMode]);

  // Resolve actual theme from mode
  const resolvedTheme = useMemo(() => {
    if (mode === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return mode;
  }, [mode, systemColorScheme]);

  // Get colors based on resolved theme
  const colors = useMemo(() => {
    return resolvedTheme === 'dark' ? darkColors : lightColors;
  }, [resolvedTheme]);

  const isDark = resolvedTheme === 'dark';
  const statusBarStyle = isDark ? 'light-content' : 'dark-content';

  const value: ThemeContextType = useMemo(
    () => ({
      mode,
      resolvedTheme,
      colors,
      isDark,
      setMode,
      toggle,
      statusBarStyle,
    }),
    [mode, resolvedTheme, colors, isDark, setMode, toggle, statusBarStyle]
  );

  // Don't render until theme is loaded to prevent flash
  if (!isLoaded) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access theme context
 * Must be used within ThemeProvider
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

/**
 * Hook to get just the colors (convenience)
 * Falls back to light colors if outside provider
 */
export function useColors(): ThemeColors {
  const context = useContext(ThemeContext);
  return context?.colors ?? lightColors;
}
