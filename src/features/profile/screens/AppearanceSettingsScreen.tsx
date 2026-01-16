/**
 * src/features/profile/screens/AppearanceSettingsScreen.tsx
 *
 * Settings screen for appearance: dark/light mode and accent color theme.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  ChevronLeft,
  Moon,
  Palette,
  Check,
  BookOpen,
  type LucideIcon,
} from 'lucide-react-native';
import { SCREEN_BOTTOM_PADDING } from '@/constants/layout';
import {
  useTheme,
  themePresets,
  accentThemes,
  scale,
  typography,
  fontWeight,
  spacing,
  type AccentTheme,
} from '@/shared/theme';
import { useSpineCacheStore } from '@/features/home/stores/spineCache';

// Accent theme options
const ACCENT_THEMES: AccentTheme[] = ['red', 'electric', 'lime'];

export function AppearanceSettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const {
    colors,
    isDark,
    accentTheme,
    setMode,
    setAccentTheme,
  } = useTheme();

  // Colored spines setting
  const useColoredSpines = useSpineCacheStore((state) => state.useColoredSpines);
  const setUseColoredSpines = useSpineCacheStore((state) => state.setUseColoredSpines);

  // Toggle dark mode
  const handleDarkModeToggle = useCallback((value: boolean) => {
    setMode(value ? 'dark' : 'light');
  }, [setMode]);

  // Toggle colored spines
  const handleColoredSpinesToggle = useCallback((value: boolean) => {
    setUseColoredSpines(value);
  }, [setUseColoredSpines]);

  // Select accent theme
  const handleAccentSelect = useCallback((theme: AccentTheme) => {
    setAccentTheme(theme);
  }, [setAccentTheme]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background.secondary }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background.secondary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={scale(24)} color={colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Appearance</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Theme Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.text.tertiary }]}>THEME</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface.card }]}>
            <View style={[styles.settingsRow, { borderBottomColor: colors.border.default }]}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: colors.border.default }]}>
                  <Moon size={scale(18)} color={colors.text.secondary} strokeWidth={2} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowLabel, { color: colors.text.primary }]}>Dark Mode</Text>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={handleDarkModeToggle}
                trackColor={{ false: colors.border.default, true: colors.accent.primary }}
                thumbColor={colors.text.inverse}
              />
            </View>
            <View style={[styles.settingsRow, { borderBottomWidth: 0 }]}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: colors.border.default }]}>
                  <BookOpen size={scale(18)} color={colors.text.secondary} strokeWidth={2} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowLabel, { color: colors.text.primary }]}>Colored Spines</Text>
                  <Text style={[styles.rowNote, { color: colors.text.tertiary }]}>Genre-based book colors</Text>
                </View>
              </View>
              <Switch
                value={useColoredSpines}
                onValueChange={handleColoredSpinesToggle}
                trackColor={{ false: colors.border.default, true: colors.accent.primary }}
                thumbColor={colors.text.inverse}
              />
            </View>
          </View>
        </View>

        {/* Accent Color Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.text.tertiary }]}>ACCENT COLOR</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface.card }]}>
            {ACCENT_THEMES.map((theme, index) => {
              const preset = themePresets[theme];
              const themeAccent = accentThemes[theme];
              const isSelected = accentTheme === theme;
              const isLast = index === ACCENT_THEMES.length - 1;

              return (
                <TouchableOpacity
                  key={theme}
                  style={[
                    styles.accentRow,
                    !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border.default },
                  ]}
                  onPress={() => handleAccentSelect(theme)}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowLeft}>
                    {/* Color swatch */}
                    <View
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: themeAccent.primary },
                      ]}
                    />
                    <View style={styles.rowContent}>
                      <Text style={[styles.rowLabel, { color: colors.text.primary }]}>{preset.name}</Text>
                      <Text style={[styles.rowNote, { color: colors.text.tertiary }]}>{preset.description}</Text>
                    </View>
                  </View>
                  {/* Selection indicator */}
                  <View style={[
                    styles.radioOuter,
                    { borderColor: isSelected ? colors.accent.primary : colors.border.default },
                  ]}>
                    {isSelected && (
                      <View style={[styles.radioInner, { backgroundColor: colors.accent.primary }]} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Preview Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.text.tertiary }]}>PREVIEW</Text>
          <View style={[styles.previewCard, { backgroundColor: colors.surface.card }]}>
            <View style={styles.previewRow}>
              <Text style={[styles.previewLabel, { color: colors.text.secondary }]}>Primary</Text>
              <View style={[styles.previewSwatch, { backgroundColor: colors.accent.primary }]} />
            </View>
            <View style={styles.previewRow}>
              <Text style={[styles.previewLabel, { color: colors.text.secondary }]}>Dark</Text>
              <View style={[styles.previewSwatch, { backgroundColor: colors.accent.primaryDark }]} />
            </View>
            <View style={styles.previewRow}>
              <Text style={[styles.previewLabel, { color: colors.text.secondary }]}>Light</Text>
              <View style={[styles.previewSwatch, { backgroundColor: colors.accent.primaryLight }]} />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    ...typography.headlineLarge,
    fontWeight: fontWeight.semibold,
  },
  headerSpacer: {
    width: scale(40),
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: SCREEN_BOTTOM_PADDING,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionHeader: {
    ...typography.bodyMedium,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.5,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionCard: {
    marginHorizontal: spacing.lg,
    borderRadius: scale(12),
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(14),
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  accentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(16),
    paddingHorizontal: spacing.lg,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSwatch: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(8),
  },
  rowContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  rowLabel: {
    ...typography.headlineMedium,
    fontWeight: fontWeight.medium,
  },
  rowNote: {
    ...typography.bodySmall,
    marginTop: scale(2),
  },
  // Radio button styles
  radioOuter: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
  },
  // Preview section
  previewCard: {
    marginHorizontal: spacing.lg,
    borderRadius: scale(12),
    padding: spacing.lg,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  previewLabel: {
    ...typography.bodyMedium,
  },
  previewSwatch: {
    width: scale(60),
    height: scale(28),
    borderRadius: scale(6),
  },
});
