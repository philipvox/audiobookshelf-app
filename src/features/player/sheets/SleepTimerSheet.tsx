/**
 * src/features/player/sheets/SleepTimerSheet.tsx
 *
 * Sleep Timer panel - Editorial design with quick set, special options, and custom time.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  TextInput,
  Animated,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { usePlayerStore, useCurrentChapterIndex } from '../stores/playerStore';
import { useSleepTimer } from '../stores/sleepTimerStore';
import { haptics } from '@/core/native/haptics';
import { scale } from '@/shared/theme';
import {
  secretLibraryColors as colors,
} from '@/shared/theme/secretLibrary';

// =============================================================================
// CONSTANTS
// =============================================================================

const QUICK_OPTIONS = [
  { value: 5, label: '5', unit: 'min' },
  { value: 10, label: '10', unit: 'min' },
  { value: 15, label: '15', unit: 'min' },
  { value: 20, label: '20', unit: 'min' },
  { value: 30, label: '30', unit: 'min' },
  { value: 45, label: '45', unit: 'min' },
  { value: 60, label: '1', unit: 'hr' },
  { value: 90, label: '1.5', unit: 'hr' },
];

// =============================================================================
// ICONS
// =============================================================================

const BookIcon = ({ color = colors.black, size = 18 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
    <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </Svg>
);

const BooksIcon = ({ color = colors.black, size = 18 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
    <Path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </Svg>
);

const CloseIcon = ({ color = colors.black, size = 14 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
    <Path d="M18 6L6 18M6 6l12 12" />
  </Svg>
);

// =============================================================================
// TYPES
// =============================================================================

interface SleepTimerSheetProps {
  onClose: () => void;
}

type TimerMode = 'minutes' | 'end-of-chapter' | 'end-of-book' | 'custom' | null;

// =============================================================================
// COMPONENT
// =============================================================================

export function SleepTimerSheet({ onClose }: SleepTimerSheetProps) {
  // Sleep timer state - read directly from sleepTimerStore for real-time countdown
  const sleepTimer = useSleepTimer();

  // Player store state
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const chapters = usePlayerStore((s) => s.chapters);
  const setSleepTimer = usePlayerStore((s) => s.setSleepTimer);
  const clearSleepTimer = usePlayerStore((s) => s.clearSleepTimer);
  const chapterIndex = useCurrentChapterIndex();

  // Local state
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  const [timerMode, setTimerMode] = useState<TimerMode>(null);
  const [customHours, setCustomHours] = useState('0');
  const [customMins, setCustomMins] = useState('0');

  // Animation for pulsing dot
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation when timer is active
  useEffect(() => {
    if (sleepTimer && sleepTimer > 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [sleepTimer, pulseAnim]);

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  const getChapterRemainingMins = (): number => {
    if (chapters.length === 0) return 0;
    const currentChapter = chapters[chapterIndex];
    if (!currentChapter) return 0;
    const remaining = Math.max(0, currentChapter.end - position);
    return Math.ceil(remaining / 60);
  };

  const getBookRemainingTime = (): { hours: number; mins: number } => {
    const remaining = Math.max(0, duration - position);
    const hours = Math.floor(remaining / 3600);
    const mins = Math.floor((remaining % 3600) / 60);
    return { hours, mins };
  };

  const formatTimeDisplay = (seconds: number): string => {
    if (seconds <= 0) return 'Off';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleQuickSelect = useCallback((minutes: number) => {
    haptics.selection();
    setSelectedMinutes(minutes);
    setTimerMode('minutes');
    // Immediately set the timer
    setSleepTimer(minutes);
  }, [setSleepTimer]);

  const handleEndOfChapter = useCallback(() => {
    haptics.selection();
    const chapterRemaining = getChapterRemainingMins();
    setTimerMode('end-of-chapter');
    setSelectedMinutes(null);
    if (chapterRemaining > 0) {
      setSleepTimer(chapterRemaining);
    }
  }, [setSleepTimer, chapters, chapterIndex, position]);

  const handleEndOfBook = useCallback(() => {
    haptics.selection();
    const { hours, mins } = getBookRemainingTime();
    const totalMins = hours * 60 + mins;
    setTimerMode('end-of-book');
    setSelectedMinutes(null);
    if (totalMins > 0) {
      setSleepTimer(totalMins);
    }
  }, [setSleepTimer, duration, position]);

  const handleCustomSet = useCallback(() => {
    const hours = parseInt(customHours) || 0;
    const mins = parseInt(customMins) || 0;
    if (hours === 0 && mins === 0) return;

    haptics.selection();
    const totalMins = hours * 60 + mins;
    setTimerMode('custom');
    setSelectedMinutes(null);
    setSleepTimer(totalMins);
  }, [customHours, customMins, setSleepTimer]);

  const handleCancelTimer = useCallback(() => {
    haptics.impact('light');
    clearSleepTimer();
    setSelectedMinutes(null);
    setTimerMode(null);
  }, [clearSleepTimer]);

  // ==========================================================================
  // COMPUTED
  // ==========================================================================

  const isTimerActive = sleepTimer !== null && sleepTimer > 0;
  const chapterRemaining = getChapterRemainingMins();
  const bookRemaining = getBookRemainingTime();
  const displayValue = isTimerActive ? formatTimeDisplay(sleepTimer) : 'Off';

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <View style={styles.container}>
      {/* Handle */}
      <View style={styles.handle} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Sleep Timer</Text>
        <View style={[styles.status, isTimerActive && styles.statusActive]}>
          {isTimerActive && (
            <Animated.View style={[styles.statusDot, { opacity: pulseAnim }]} />
          )}
          <Text style={[styles.statusText, isTimerActive && styles.statusTextActive]}>
            {isTimerActive ? 'Active' : 'Off'}
          </Text>
        </View>
      </View>

      {/* Timer Display */}
      <View style={styles.timerDisplay}>
        <Text style={styles.timerDisplayLabel}>Time Remaining</Text>
        <Text style={[styles.timerDisplayValue, !isTimerActive && styles.timerDisplayValueOff]}>
          {displayValue}
        </Text>
      </View>

      {/* Quick Set Options */}
      <Text style={styles.sectionLabel}>Quick Set</Text>
      <View style={styles.optionsGrid}>
        {QUICK_OPTIONS.map((option) => {
          const isSelected = timerMode === 'minutes' && selectedMinutes === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
              onPress={() => handleQuickSelect(option.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                {option.label}
              </Text>
              <Text style={[styles.optionUnit, isSelected && styles.optionUnitSelected]}>
                {option.unit}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Special Options */}
      <View style={styles.specialOptions}>
        <TouchableOpacity
          style={[
            styles.specialOption,
            timerMode === 'end-of-chapter' && styles.specialOptionSelected,
          ]}
          onPress={handleEndOfChapter}
          activeOpacity={0.7}
        >
          <BookIcon
            color={timerMode === 'end-of-chapter' ? colors.white : colors.black}
            size={18}
          />
          <View style={styles.specialOptionText}>
            <Text style={[
              styles.specialOptionTitle,
              timerMode === 'end-of-chapter' && styles.specialOptionTitleSelected,
            ]}>
              End of Chapter
            </Text>
            <Text style={[
              styles.specialOptionSubtitle,
              timerMode === 'end-of-chapter' && styles.specialOptionSubtitleSelected,
            ]}>
              ~{chapterRemaining} min remaining
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.specialOption,
            timerMode === 'end-of-book' && styles.specialOptionSelected,
          ]}
          onPress={handleEndOfBook}
          activeOpacity={0.7}
        >
          <BooksIcon
            color={timerMode === 'end-of-book' ? colors.white : colors.black}
            size={18}
          />
          <View style={styles.specialOptionText}>
            <Text style={[
              styles.specialOptionTitle,
              timerMode === 'end-of-book' && styles.specialOptionTitleSelected,
            ]}>
              End of Book
            </Text>
            <Text style={[
              styles.specialOptionSubtitle,
              timerMode === 'end-of-book' && styles.specialOptionSubtitleSelected,
            ]}>
              {bookRemaining.hours}h {bookRemaining.mins}m remaining
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Custom Time */}
      <View style={styles.customTime}>
        <Text style={styles.customTimeLabel}>Custom</Text>
        <View style={styles.customTimeInputs}>
          <TextInput
            style={styles.customTimeInput}
            value={customHours}
            onChangeText={setCustomHours}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
          />
          <Text style={styles.customTimeUnit}>h</Text>
          <Text style={styles.customTimeSeparator}>:</Text>
          <TextInput
            style={styles.customTimeInput}
            value={customMins}
            onChangeText={setCustomMins}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
          />
          <Text style={styles.customTimeUnit}>m</Text>
        </View>
        <TouchableOpacity style={styles.customTimeSet} onPress={handleCustomSet}>
          <Text style={styles.customTimeSetText}>Set</Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {isTimerActive ? (
          <>
            <TouchableOpacity
              style={styles.actionButtonCancel}
              onPress={handleCancelTimer}
              activeOpacity={0.7}
            >
              <CloseIcon color={colors.orange} size={14} />
              <Text style={styles.actionButtonCancelText}>Cancel Timer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButtonPrimary}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.actionButtonPrimaryText}>Done</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonText}>Close</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.creamGray,
    paddingHorizontal: scale(28),
    paddingBottom: scale(40),
  },
  handle: {
    width: scale(36),
    height: scale(4),
    backgroundColor: colors.grayLine,
    borderRadius: scale(2),
    alignSelf: 'center',
    marginTop: scale(12),
    marginBottom: scale(12),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: scale(16),
    paddingBottom: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.black,
  },
  title: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontSize: scale(28),
    fontWeight: '400',
    color: colors.black,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  statusActive: {},
  statusDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: colors.orange,
  },
  statusText: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(12),
    color: colors.gray,
  },
  statusTextActive: {
    color: colors.orange,
  },

  // Timer Display
  timerDisplay: {
    alignItems: 'center',
    marginBottom: scale(20),
    paddingVertical: scale(16),
    backgroundColor: colors.grayLight,
  },
  timerDisplayLabel: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(10),
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.gray,
    marginBottom: scale(8),
  },
  timerDisplayValue: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontSize: scale(44),
    fontStyle: 'italic',
    color: colors.black,
    lineHeight: scale(44),
  },
  timerDisplayValueOff: {
    fontSize: scale(28),
    fontStyle: 'normal',
    color: colors.gray,
  },

  // Quick Options Grid
  sectionLabel: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(10),
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.gray,
    marginBottom: scale(12),
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginBottom: scale(16),
  },
  optionButton: {
    width: '23.5%',
    height: scale(48),
    borderWidth: 1,
    borderColor: colors.grayLine,
    backgroundColor: colors.grayLight,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  optionText: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(13),
    color: colors.black,
  },
  optionTextSelected: {
    color: colors.white,
  },
  optionUnit: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(9),
    color: colors.gray,
    marginLeft: scale(2),
  },
  optionUnitSelected: {
    color: 'rgba(255,255,255,0.6)',
  },

  // Special Options
  specialOptions: {
    gap: scale(8),
    marginBottom: scale(16),
  },
  specialOption: {
    height: scale(52),
    borderWidth: 1,
    borderColor: colors.grayLine,
    backgroundColor: colors.grayLight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    gap: scale(12),
  },
  specialOptionSelected: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  specialOptionText: {
    flex: 1,
  },
  specialOptionTitle: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
    fontSize: scale(14),
    color: colors.black,
  },
  specialOptionTitleSelected: {
    color: colors.white,
  },
  specialOptionSubtitle: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(11),
    color: colors.gray,
  },
  specialOptionSubtitleSelected: {
    color: 'rgba(255,255,255,0.6)',
  },

  // Custom Time
  customTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    marginBottom: scale(16),
    paddingTop: scale(12),
    borderTopWidth: 1,
    borderTopColor: colors.grayLine,
  },
  customTimeLabel: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(11),
    color: colors.gray,
  },
  customTimeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    flex: 1,
  },
  customTimeInput: {
    width: scale(48),
    height: scale(40),
    borderWidth: 1,
    borderColor: colors.grayLine,
    backgroundColor: colors.grayLight,
    textAlign: 'center',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(16),
    color: colors.black,
  },
  customTimeSeparator: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(16),
    color: colors.gray,
  },
  customTimeUnit: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(9),
    color: colors.gray,
    marginLeft: scale(-4),
  },
  customTimeSet: {
    height: scale(40),
    paddingHorizontal: scale(16),
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customTimeSetText: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
    fontSize: scale(12),
    fontWeight: '500',
    color: colors.white,
  },

  // Action Buttons
  actions: {
    flexDirection: 'row',
    gap: scale(8),
  },
  actionButton: {
    flex: 1,
    height: scale(48),
    borderWidth: 1,
    borderColor: colors.grayLine,
    backgroundColor: colors.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
    fontSize: scale(13),
    fontWeight: '500',
    color: colors.black,
  },
  actionButtonCancel: {
    flex: 1,
    height: scale(48),
    borderWidth: 1,
    borderColor: colors.orange,
    backgroundColor: colors.grayLight,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(8),
  },
  actionButtonCancelText: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
    fontSize: scale(13),
    fontWeight: '500',
    color: colors.orange,
  },
  actionButtonPrimary: {
    flex: 1,
    height: scale(48),
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonPrimaryText: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
    fontSize: scale(13),
    fontWeight: '500',
    color: colors.white,
  },
});

export default SleepTimerSheet;
