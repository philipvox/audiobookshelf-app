/**
 * src/features/profile/screens/AppearanceSettingsScreen.tsx
 *
 * Home screen settings: server spines and series display options.
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
  ImageIcon,
  Library,
  type LucideIcon,
} from 'lucide-react-native';
import { SCREEN_BOTTOM_PADDING } from '@/constants/layout';
import {
  useTheme,
  scale,
  typography,
  fontWeight,
  spacing,
} from '@/shared/theme';
import { useSpineCacheStore } from '@/shared/spine';
import { useMyLibraryStore } from '@/shared/stores/myLibraryStore';

interface SettingToggleProps {
  Icon: LucideIcon;
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isLast?: boolean;
}

function SettingToggle({ Icon, label, description, value, onValueChange, isLast }: SettingToggleProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.settingsRow, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border.default }]}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconContainer, { backgroundColor: colors.border.default }]}>
          <Icon size={scale(18)} color={colors.text.secondary} strokeWidth={2} />
        </View>
        <View style={styles.rowContent}>
          <Text style={[styles.rowLabel, { color: colors.text.primary }]}>{label}</Text>
          <Text style={[styles.rowNote, { color: colors.text.tertiary }]}>{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border.default, true: colors.accent.primary }}
        thumbColor={colors.text.inverse}
      />
    </View>
  );
}

export function AppearanceSettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();

  // Server spines setting
  const useServerSpines = useSpineCacheStore((state) => state.useServerSpines);
  const setUseServerSpines = useSpineCacheStore((state) => state.setUseServerSpines);

  // Hide single-book series setting
  const hideSingleBookSeries = useMyLibraryStore((state) => state.hideSingleBookSeries);
  const setHideSingleBookSeries = useMyLibraryStore((state) => state.setHideSingleBookSeries);

  const handleServerSpinesToggle = useCallback((value: boolean) => {
    setUseServerSpines(value);
  }, [setUseServerSpines]);

  const handleHideSingleSeriesToggle = useCallback((value: boolean) => {
    setHideSingleBookSeries(value);
  }, [setHideSingleBookSeries]);

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
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Spine Appearance</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Display Options */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.text.tertiary }]}>DISPLAY OPTIONS</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface.card }]}>
            <SettingToggle
              Icon={ImageIcon}
              label="Server Spines"
              description="Use pre-generated book spine images from your server"
              value={useServerSpines}
              onValueChange={handleServerSpinesToggle}
            />
            <SettingToggle
              Icon={Library}
              label="Hide Single-Book Series"
              description="Don't show series that only have one book"
              value={hideSingleBookSeries}
              onValueChange={handleHideSingleSeriesToggle}
              isLast
            />
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <Text style={[styles.infoText, { color: colors.text.tertiary }]}>
            Server spines require your Audiobookshelf server to have pre-generated spine images.
            When enabled, books with available spine images will display those instead of procedurally generated ones.
          </Text>
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
  rowContent: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.md,
  },
  rowLabel: {
    ...typography.headlineMedium,
    fontWeight: fontWeight.medium,
  },
  rowNote: {
    ...typography.bodySmall,
    marginTop: scale(2),
  },
  infoSection: {
    marginHorizontal: spacing.xl,
  },
  infoText: {
    ...typography.bodySmall,
    lineHeight: scale(18),
  },
});
