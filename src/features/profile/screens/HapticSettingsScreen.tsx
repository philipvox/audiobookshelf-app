/**
 * src/features/profile/screens/HapticSettingsScreen.tsx
 *
 * Secret Library Haptic Feedback Settings
 * Enable/disable haptics globally and per category.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Circle,
  PlayCircle,
  GitCommitHorizontal,
  Gauge,
  Moon,
  Download,
  Bookmark,
  Trophy,
  Hand,
  Info,
  type LucideIcon,
} from 'lucide-react-native';
import { SCREEN_BOTTOM_PADDING } from '@/constants/layout';
import { scale } from '@/shared/theme';
import {
  secretLibraryColors as colors,
  secretLibraryFonts as fonts,
} from '@/shared/theme/secretLibrary';
import { haptics } from '@/core/native/haptics';
import { useHapticSettingsStore } from '../stores/hapticSettingsStore';
import { SettingsHeader } from '../components/SettingsHeader';

// =============================================================================
// COMPONENTS
// =============================================================================

interface SettingsRowProps {
  Icon: LucideIcon;
  label: string;
  note?: string;
  switchValue: boolean;
  onSwitchChange: (value: boolean) => void;
  disabled?: boolean;
}

function SettingsRow({ Icon, label, note, switchValue, onSwitchChange, disabled }: SettingsRowProps) {
  const handleChange = useCallback(
    (value: boolean) => {
      // Play haptic feedback when enabling
      if (value) {
        haptics.selection();
      }
      onSwitchChange(value);
    },
    [onSwitchChange]
  );

  return (
    <View style={[styles.settingsRow, disabled && styles.settingsRowDisabled]}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconContainer, disabled && { opacity: 0.5 }]}>
          <Icon
            size={scale(18)}
            color={disabled ? colors.gray : colors.gray}
            strokeWidth={1.5}
          />
        </View>
        <View style={styles.rowContent}>
          <Text style={[styles.rowLabel, disabled && { color: colors.gray }]}>{label}</Text>
          {note && (
            <Text style={[styles.rowNote, disabled && { opacity: 0.6 }]}>{note}</Text>
          )}
        </View>
      </View>
      <Switch
        value={switchValue}
        onValueChange={handleChange}
        trackColor={{ false: 'rgba(0,0,0,0.1)', true: colors.black }}
        thumbColor={colors.white}
        ios_backgroundColor="rgba(0,0,0,0.1)"
        disabled={disabled}
      />
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function HapticSettingsScreen() {
  const insets = useSafeAreaInsets();

  // Haptic settings from store
  const enabled = useHapticSettingsStore((s) => s.enabled);
  const playbackControls = useHapticSettingsStore((s) => s.playbackControls);
  const scrubberFeedback = useHapticSettingsStore((s) => s.scrubberFeedback);
  const speedControl = useHapticSettingsStore((s) => s.speedControl);
  const sleepTimer = useHapticSettingsStore((s) => s.sleepTimer);
  const downloads = useHapticSettingsStore((s) => s.downloads);
  const bookmarks = useHapticSettingsStore((s) => s.bookmarks);
  const completions = useHapticSettingsStore((s) => s.completions);
  const uiInteractions = useHapticSettingsStore((s) => s.uiInteractions);

  // Actions
  const setEnabled = useHapticSettingsStore((s) => s.setEnabled);
  const setPlaybackControls = useHapticSettingsStore((s) => s.setPlaybackControls);
  const setScrubberFeedback = useHapticSettingsStore((s) => s.setScrubberFeedback);
  const setSpeedControl = useHapticSettingsStore((s) => s.setSpeedControl);
  const setSleepTimer = useHapticSettingsStore((s) => s.setSleepTimer);
  const setDownloads = useHapticSettingsStore((s) => s.setDownloads);
  const setBookmarks = useHapticSettingsStore((s) => s.setBookmarks);
  const setCompletions = useHapticSettingsStore((s) => s.setCompletions);
  const setUiInteractions = useHapticSettingsStore((s) => s.setUiInteractions);

  const handleMasterToggle = useCallback(
    (value: boolean) => {
      if (value) {
        haptics.success();
      }
      setEnabled(value);
    },
    [setEnabled]
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.grayLight} />
      <SettingsHeader title="Haptic Feedback" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: SCREEN_BOTTOM_PADDING + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Master Toggle Section */}
        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <SettingsRow
              Icon={Circle}
              label="Haptic Feedback"
              note="Enable tactile feedback throughout the app"
              switchValue={enabled}
              onSwitchChange={handleMasterToggle}
            />
          </View>
        </View>

        {/* Category Toggles - Only visible when master is enabled */}
        {enabled && (
          <>
            {/* Playback Section */}
            <View style={styles.section}>
              <SectionHeader title="Playback" />
              <View style={styles.sectionCard}>
                <SettingsRow
                  Icon={PlayCircle}
                  label="Playback Controls"
                  note="Play, pause, skip forward/back"
                  switchValue={playbackControls}
                  onSwitchChange={setPlaybackControls}
                />
                <SettingsRow
                  Icon={GitCommitHorizontal}
                  label="Timeline Scrubbing"
                  note="Scrubbing feedback, chapter markers"
                  switchValue={scrubberFeedback}
                  onSwitchChange={setScrubberFeedback}
                />
                <SettingsRow
                  Icon={Gauge}
                  label="Speed Control"
                  note="Speed selection changes"
                  switchValue={speedControl}
                  onSwitchChange={setSpeedControl}
                />
                <SettingsRow
                  Icon={Moon}
                  label="Sleep Timer"
                  note="Timer set, warning, expiration"
                  switchValue={sleepTimer}
                  onSwitchChange={setSleepTimer}
                />
              </View>
            </View>

            {/* Library Section */}
            <View style={styles.section}>
              <SectionHeader title="Library" />
              <View style={styles.sectionCard}>
                <SettingsRow
                  Icon={Download}
                  label="Downloads"
                  note="Download start and completion"
                  switchValue={downloads}
                  onSwitchChange={setDownloads}
                />
                <SettingsRow
                  Icon={Bookmark}
                  label="Bookmarks"
                  note="Create, delete, jump to bookmark"
                  switchValue={bookmarks}
                  onSwitchChange={setBookmarks}
                />
                <SettingsRow
                  Icon={Trophy}
                  label="Completions"
                  note="Book and series celebrations"
                  switchValue={completions}
                  onSwitchChange={setCompletions}
                />
              </View>
            </View>

            {/* UI Section */}
            <View style={styles.section}>
              <SectionHeader title="Interface" />
              <View style={styles.sectionCard}>
                <SettingsRow
                  Icon={Hand}
                  label="UI Interactions"
                  note="Buttons, toggles, long press"
                  switchValue={uiInteractions}
                  onSwitchChange={setUiInteractions}
                />
              </View>
            </View>
          </>
        )}

        {/* Info Note */}
        <View style={styles.infoSection}>
          <Info size={scale(16)} color={colors.gray} strokeWidth={1.5} />
          <Text style={styles.infoText}>
            Haptic feedback provides tactile confirmation for actions without requiring you to look
            at the screen. Disable individual categories to customize your experience.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grayLight,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(9),
    color: colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    paddingLeft: 4,
  },
  sectionCard: {
    backgroundColor: colors.white,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  settingsRowDisabled: {
    opacity: 0.5,
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
    backgroundColor: colors.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  rowLabel: {
    fontFamily: fonts.playfair.regular,
    fontSize: scale(15),
    color: colors.black,
  },
  rowNote: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(9),
    color: colors.gray,
    marginTop: 2,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
  },
  infoText: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(9),
    color: colors.gray,
    flex: 1,
    lineHeight: scale(16),
  },
});
