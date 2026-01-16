/**
 * src/features/profile/screens/PlaybackSettingsScreen.tsx
 *
 * Secret Library Playback Settings
 * Speed, skip intervals, sleep timer, smart rewind, completion settings.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Modal,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  ChevronLeft,
  ChevronRight,
  Gauge,
  SkipForward,
  SkipBack,
  Smartphone,
  RefreshCw,
  CheckCircle,
  CheckSquare,
  Info,
  Check,
  type LucideIcon,
} from 'lucide-react-native';
import { usePlayerStore } from '@/features/player/stores/playerStore';
import { SCREEN_BOTTOM_PADDING } from '@/constants/layout';
import { scale } from '@/shared/theme';
import {
  secretLibraryColors as colors,
  secretLibraryFonts as fonts,
} from '@/shared/theme/secretLibrary';
import { SettingsHeader } from '../components/SettingsHeader';

// =============================================================================
// CONSTANTS
// =============================================================================

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];
const SKIP_FORWARD_OPTIONS = [10, 15, 30, 45, 60];
const SKIP_BACK_OPTIONS = [5, 10, 15, 30, 45];
const SMART_REWIND_MAX_OPTIONS = [15, 30, 45, 60, 90];

function formatSpeed(speed: number): string {
  return speed === 1.0 ? '1.0× (Normal)' : `${speed}×`;
}

// =============================================================================
// COMPONENTS
// =============================================================================

interface SettingsRowProps {
  Icon: LucideIcon;
  label: string;
  value?: string;
  onPress?: () => void;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  note?: string;
}

function SettingsRow({ Icon, label, value, onPress, switchValue, onSwitchChange, note }: SettingsRowProps) {
  const content = (
    <View style={styles.settingsRow}>
      <View style={styles.rowLeft}>
        <View style={styles.iconContainer}>
          <Icon size={scale(18)} color={colors.gray} strokeWidth={1.5} />
        </View>
        <View style={styles.rowContent}>
          <Text style={styles.rowLabel}>{label}</Text>
          {note && <Text style={styles.rowNote}>{note}</Text>}
        </View>
      </View>
      <View style={styles.rowRight}>
        {value && <Text style={styles.rowValue}>{value}</Text>}
        {onSwitchChange !== undefined && (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            trackColor={{ false: 'rgba(0,0,0,0.1)', true: colors.black }}
            thumbColor={colors.white}
            ios_backgroundColor="rgba(0,0,0,0.1)"
          />
        )}
        {onPress && <ChevronRight size={scale(16)} color={colors.gray} strokeWidth={1.5} />}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

interface OptionPickerProps<T> {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: T[];
  selectedValue: T;
  formatOption: (option: T) => string;
  onSelect: (option: T) => void;
  onClose: () => void;
}

function OptionPicker<T>({
  visible,
  title,
  subtitle,
  options,
  selectedValue,
  formatOption,
  onSelect,
  onClose,
}: OptionPickerProps<T>) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerTitle}>{title}</Text>
          {subtitle && <Text style={styles.pickerSubtitle}>{subtitle}</Text>}
          <View style={styles.pickerOptions}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.pickerOption,
                  selectedValue === option && styles.pickerOptionSelected,
                ]}
                onPress={() => {
                  onSelect(option);
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    selectedValue === option && styles.pickerOptionTextSelected,
                  ]}
                >
                  {formatOption(option)}
                </Text>
                {selectedValue === option && (
                  <Check size={scale(18)} color={colors.black} strokeWidth={2} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PlaybackSettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // Player settings from store
  const globalDefaultRate = usePlayerStore((s) => s.globalDefaultRate);
  const setGlobalDefaultRate = usePlayerStore((s) => s.setGlobalDefaultRate);
  const skipForwardInterval = usePlayerStore((s) => s.skipForwardInterval ?? 30);
  const setSkipForwardInterval = usePlayerStore((s) => s.setSkipForwardInterval);
  const skipBackInterval = usePlayerStore((s) => s.skipBackInterval ?? 15);
  const setSkipBackInterval = usePlayerStore((s) => s.setSkipBackInterval);
  const shakeToExtendEnabled = usePlayerStore((s) => s.shakeToExtendEnabled);
  const setShakeToExtendEnabled = usePlayerStore((s) => s.setShakeToExtendEnabled);
  const smartRewindEnabled = usePlayerStore((s) => s.smartRewindEnabled ?? true);
  const setSmartRewindEnabled = usePlayerStore((s) => s.setSmartRewindEnabled);
  const smartRewindMaxSeconds = usePlayerStore((s) => s.smartRewindMaxSeconds ?? 30);
  const setSmartRewindMaxSeconds = usePlayerStore((s) => s.setSmartRewindMaxSeconds);
  const showCompletionPrompt = usePlayerStore((s) => s.showCompletionPrompt ?? true);
  const setShowCompletionPrompt = usePlayerStore((s) => s.setShowCompletionPrompt);
  const autoMarkFinished = usePlayerStore((s) => s.autoMarkFinished ?? false);
  const setAutoMarkFinished = usePlayerStore((s) => s.setAutoMarkFinished);

  // Modal states
  const [showSpeedPicker, setShowSpeedPicker] = useState(false);
  const [showForwardPicker, setShowForwardPicker] = useState(false);
  const [showBackPicker, setShowBackPicker] = useState(false);

  const handleSpeedSelect = useCallback((speed: number) => {
    setGlobalDefaultRate(speed);
  }, [setGlobalDefaultRate]);

  const handleForwardSelect = useCallback((interval: number) => {
    setSkipForwardInterval?.(interval);
  }, [setSkipForwardInterval]);

  const handleBackSelect = useCallback((interval: number) => {
    setSkipBackInterval?.(interval);
  }, [setSkipBackInterval]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.grayLight} />
      <SettingsHeader title="Playback" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: SCREEN_BOTTOM_PADDING + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Speed Section */}
        <View style={styles.section}>
          <SectionHeader title="Speed" />
          <View style={styles.sectionCard}>
            <SettingsRow
              Icon={Gauge}
              label="Default Speed"
              value={formatSpeed(globalDefaultRate)}
              onPress={() => setShowSpeedPicker(true)}
              note="Used for books without a saved preference"
            />
          </View>
        </View>

        {/* Skip Intervals Section */}
        <View style={styles.section}>
          <SectionHeader title="Skip Intervals" />
          <View style={styles.sectionCard}>
            <SettingsRow
              Icon={SkipForward}
              label="Skip Forward"
              value={`${skipForwardInterval}s`}
              onPress={() => setShowForwardPicker(true)}
            />
            <SettingsRow
              Icon={SkipBack}
              label="Skip Back"
              value={`${skipBackInterval}s`}
              onPress={() => setShowBackPicker(true)}
            />
          </View>
        </View>

        {/* Sleep Timer Section */}
        <View style={styles.section}>
          <SectionHeader title="Sleep Timer" />
          <View style={styles.sectionCard}>
            <SettingsRow
              Icon={Smartphone}
              label="Shake to Extend"
              switchValue={shakeToExtendEnabled}
              onSwitchChange={setShakeToExtendEnabled}
              note="Shake to add 15 minutes when timer is low"
            />
          </View>
        </View>

        {/* Smart Rewind Section */}
        <View style={styles.section}>
          <SectionHeader title="Smart Rewind" />
          <View style={styles.sectionCard}>
            <SettingsRow
              Icon={RefreshCw}
              label="Smart Rewind"
              switchValue={smartRewindEnabled}
              onSwitchChange={setSmartRewindEnabled}
              note="Automatically rewind after pausing"
            />
            {smartRewindEnabled && (
              <View style={styles.maxRewindContainer}>
                <Text style={styles.maxRewindLabel}>Maximum Rewind</Text>
                <View style={styles.maxRewindOptions}>
                  {SMART_REWIND_MAX_OPTIONS.map((seconds) => (
                    <TouchableOpacity
                      key={seconds}
                      style={[
                        styles.maxRewindOption,
                        smartRewindMaxSeconds === seconds && styles.maxRewindOptionSelected,
                      ]}
                      onPress={() => setSmartRewindMaxSeconds(seconds)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.maxRewindOptionText,
                          smartRewindMaxSeconds === seconds && styles.maxRewindOptionTextSelected,
                        ]}
                      >
                        {seconds}s
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.maxRewindNote}>
                  Rewind amount increases with pause duration
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Completion Section */}
        <View style={styles.section}>
          <SectionHeader title="Book Completion" />
          <View style={styles.sectionCard}>
            <SettingsRow
              Icon={CheckCircle}
              label="Completion Prompt"
              switchValue={showCompletionPrompt}
              onSwitchChange={setShowCompletionPrompt}
              note="Ask what to do when a book ends"
            />
            {!showCompletionPrompt && (
              <SettingsRow
                Icon={CheckSquare}
                label="Auto-Mark Finished"
                switchValue={autoMarkFinished}
                onSwitchChange={setAutoMarkFinished}
                note="Automatically mark books as finished"
              />
            )}
          </View>
        </View>

        {/* Info Note */}
        <View style={styles.infoSection}>
          <Info size={scale(16)} color={colors.gray} strokeWidth={1.5} />
          <Text style={styles.infoText}>
            Playback speed is remembered per book. The default speed is only used when playing a book for the first time.
          </Text>
        </View>
      </ScrollView>

      {/* Speed Picker Modal */}
      <OptionPicker
        visible={showSpeedPicker}
        title="Default Playback Speed"
        subtitle="Used for new books"
        options={SPEED_OPTIONS}
        selectedValue={globalDefaultRate}
        formatOption={formatSpeed}
        onSelect={handleSpeedSelect}
        onClose={() => setShowSpeedPicker(false)}
      />

      {/* Skip Forward Picker Modal */}
      <OptionPicker
        visible={showForwardPicker}
        title="Skip Forward Interval"
        options={SKIP_FORWARD_OPTIONS}
        selectedValue={skipForwardInterval}
        formatOption={(s) => `${s} seconds`}
        onSelect={handleForwardSelect}
        onClose={() => setShowForwardPicker(false)}
      />

      {/* Skip Back Picker Modal */}
      <OptionPicker
        visible={showBackPicker}
        title="Skip Back Interval"
        options={SKIP_BACK_OPTIONS}
        selectedValue={skipBackInterval}
        formatOption={(s) => `${s} seconds`}
        onSelect={handleBackSelect}
        onClose={() => setShowBackPicker(false)}
      />
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
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowValue: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(11),
    color: colors.black,
  },
  // Smart Rewind max selector
  maxRewindContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  maxRewindLabel: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(10),
    color: colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  maxRewindOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  maxRewindOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: colors.grayLight,
    alignItems: 'center',
  },
  maxRewindOptionSelected: {
    backgroundColor: colors.black,
  },
  maxRewindOptionText: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(11),
    color: colors.gray,
  },
  maxRewindOptionTextSelected: {
    color: colors.white,
  },
  maxRewindNote: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(9),
    color: colors.gray,
    marginTop: 12,
  },
  // Info section
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
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerContainer: {
    backgroundColor: colors.white,
    borderRadius: 0,
    width: '100%',
    maxWidth: 340,
    padding: 24,
  },
  pickerTitle: {
    fontFamily: fonts.playfair.regular,
    fontSize: scale(20),
    color: colors.black,
    marginBottom: 4,
  },
  pickerSubtitle: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(10),
    color: colors.gray,
    marginBottom: 16,
  },
  pickerOptions: {
    marginTop: 8,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  pickerOptionSelected: {
    backgroundColor: colors.grayLight,
  },
  pickerOptionText: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(12),
    color: colors.black,
  },
  pickerOptionTextSelected: {
    fontFamily: fonts.jetbrainsMono.bold,
  },
});
