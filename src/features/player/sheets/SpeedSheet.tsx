/**
 * src/features/player/sheets/SpeedSheet.tsx
 *
 * Playback Speed panel - Editorial design with quick select grid and fine tune slider.
 */

import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import Slider from '@react-native-community/slider';
import Svg, { Path } from 'react-native-svg';
import { usePlayerStore } from '../stores/playerStore';
import { useSpeedStore, useSpeedPresets } from '../stores/speedStore';
import { haptics } from '@/core/native/haptics';
import { scale } from '@/shared/theme';
import {
  secretLibraryColors as colors,
} from '@/shared/theme/secretLibrary';

// =============================================================================
// CONSTANTS
// =============================================================================

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5];
const MIN_SPEED = 0.5;
const MAX_SPEED = 2.5;

// =============================================================================
// ICONS
// =============================================================================

const PlusIcon = ({ color = colors.black, size = 12 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
    <Path d="M12 3v18M3 12h18" />
  </Svg>
);

const ResetIcon = ({ color = colors.black, size = 12 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
    <Path d="M3 12a9 9 0 1 0 9-9" />
    <Path d="M3 3v6h6" />
  </Svg>
);

const CloseIcon = ({ color = colors.white, size = 10 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3}>
    <Path d="M18 6L6 18M6 6l12 12" />
  </Svg>
);

// =============================================================================
// TYPES
// =============================================================================

interface SpeedSheetProps {
  onClose: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function SpeedSheet({ onClose }: SpeedSheetProps) {
  // Player store state
  const playbackRate = usePlayerStore((s) => s.playbackRate);
  const setPlaybackRate = usePlayerStore((s) => s.setPlaybackRate);

  // Speed presets from store
  const speedPresets = useSpeedPresets();
  const saveSpeedPreset = useSpeedStore((s) => s.saveSpeedPreset);
  const removeSpeedPreset = useSpeedStore((s) => s.removeSpeedPreset);

  // Local state for fine-tuning (updates on slider change, commits on release)
  const [localSpeed, setLocalSpeed] = useState(playbackRate);

  // Delete mode state - when true, all presets show X buttons
  const [deleteMode, setDeleteMode] = useState(false);

  // Sync local speed when playbackRate changes externally
  useEffect(() => {
    setLocalSpeed(playbackRate);
  }, [playbackRate]);

  // Exit delete mode when presets change (e.g., after deletion)
  useEffect(() => {
    if (speedPresets.length === 0) {
      setDeleteMode(false);
    }
  }, [speedPresets.length]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleSpeedSelect = useCallback(async (speed: number) => {
    haptics.speedChange();
    setLocalSpeed(speed);
    await setPlaybackRate(speed);
  }, [setPlaybackRate]);

  const handleSliderChange = useCallback((value: number) => {
    // Round to nearest 0.05
    const rounded = Math.round(value * 20) / 20;
    setLocalSpeed(rounded);
  }, []);

  const handleSliderComplete = useCallback(async (value: number) => {
    const rounded = Math.round(value * 20) / 20;
    haptics.speedChange();
    await setPlaybackRate(rounded);
  }, [setPlaybackRate]);

  const handleReset = useCallback(async () => {
    haptics.speedChange();
    setLocalSpeed(1.0);
    await setPlaybackRate(1.0);
  }, [setPlaybackRate]);

  const handleSavePreset = useCallback(async () => {
    haptics.success();
    await saveSpeedPreset(localSpeed);
  }, [saveSpeedPreset, localSpeed]);

  const handleRemovePreset = useCallback(async (speed: number) => {
    haptics.impact('light');
    await removeSpeedPreset(speed);
  }, [removeSpeedPreset]);

  const handlePresetLongPress = useCallback(() => {
    haptics.selection();
    setDeleteMode(true);
  }, []);

  const handlePresetPress = useCallback((speed: number) => {
    if (deleteMode) {
      // In delete mode, tapping anywhere exits delete mode
      setDeleteMode(false);
    } else {
      handleSpeedSelect(speed);
    }
  }, [deleteMode, handleSpeedSelect]);

  // Check if current speed is already a preset
  const isCurrentSpeedPreset = speedPresets.some(p => Math.abs(p - localSpeed) < 0.01);
  // Check if current speed is a default option
  const isDefaultOption = SPEED_OPTIONS.some(s => Math.abs(s - localSpeed) < 0.01);

  // Check if a speed option matches the current speed
  const isSpeedSelected = (speed: number) => Math.abs(localSpeed - speed) < 0.01;

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <View style={styles.container}>
      {/* Handle */}
      <View style={styles.handle} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Speed</Text>
        <Text style={styles.currentLabel}>Current: {playbackRate.toFixed(1)}×</Text>
      </View>

      {/* Speed Options Grid */}
      <View style={styles.optionsGrid}>
        {SPEED_OPTIONS.map((speed) => {
          const isSelected = isSpeedSelected(speed);
          const isDefault = speed === 1.0;
          return (
            <TouchableOpacity
              key={speed}
              style={[
                styles.optionButton,
                isSelected && styles.optionButtonSelected,
              ]}
              onPress={() => handleSpeedSelect(speed)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.optionText,
                isSelected && styles.optionTextSelected,
              ]}>
                {speed.toFixed(speed % 1 === 0 ? 1 : 2)}×
              </Text>
              {/* Default indicator dot */}
              {isDefault && (
                <View style={[
                  styles.defaultDot,
                  isSelected && styles.defaultDotSelected,
                ]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Saved Presets */}
      {speedPresets.length > 0 && (
        <View style={styles.presetsSection}>
          <Text style={styles.presetsSectionLabel}>Saved Presets</Text>
          <View style={styles.presetsGrid}>
            {speedPresets.map((speed) => {
              const isSelected = isSpeedSelected(speed);
              return (
                <View key={speed} style={styles.presetWrapper}>
                  <TouchableOpacity
                    style={[
                      styles.presetOption,
                      isSelected && styles.optionButtonSelected,
                      deleteMode && styles.presetOptionDeleteMode,
                    ]}
                    onPress={() => handlePresetPress(speed)}
                    onLongPress={handlePresetLongPress}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected,
                    ]}>
                      {speed.toFixed(2)}×
                    </Text>
                  </TouchableOpacity>
                  {/* Delete X button - shown in delete mode */}
                  {deleteMode && (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleRemovePreset(speed)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <CloseIcon color={colors.white} size={10} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
          <Text style={styles.presetsHint}>
            {deleteMode ? 'Tap × to delete, tap preset to cancel' : 'Long press to delete'}
          </Text>
        </View>
      )}

      {/* Fine Tune Slider */}
      <View style={styles.fineTune}>
        <View style={styles.fineTuneHeader}>
          <Text style={styles.fineTuneLabel}>Fine Tune</Text>
          <Text style={styles.fineTuneValue}>{localSpeed.toFixed(2)}×</Text>
        </View>
        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={MIN_SPEED}
            maximumValue={MAX_SPEED}
            value={localSpeed}
            onValueChange={handleSliderChange}
            onSlidingComplete={handleSliderComplete}
            minimumTrackTintColor={colors.black}
            maximumTrackTintColor={colors.grayLine}
            thumbTintColor={colors.black}
          />
          <View style={styles.sliderMarks}>
            <Text style={styles.sliderMark}>0.5×</Text>
            <Text style={styles.sliderMark}>1.0×</Text>
            <Text style={styles.sliderMark}>1.5×</Text>
            <Text style={styles.sliderMark}>2.0×</Text>
            <Text style={styles.sliderMark}>2.5×</Text>
          </View>
        </View>
      </View>

      {/* Presets Row */}
      <View style={styles.presets}>
        <TouchableOpacity
          style={[
            styles.presetButton,
            (isCurrentSpeedPreset || isDefaultOption) && styles.presetButtonDisabled,
          ]}
          onPress={handleSavePreset}
          activeOpacity={0.7}
          disabled={isCurrentSpeedPreset || isDefaultOption}
        >
          <PlusIcon color={(isCurrentSpeedPreset || isDefaultOption) ? colors.gray : colors.black} size={12} />
          <Text style={[
            styles.presetButtonText,
            (isCurrentSpeedPreset || isDefaultOption) && styles.presetButtonTextDisabled,
          ]}>
            {isCurrentSpeedPreset ? 'Saved' : isDefaultOption ? 'Default' : 'Save Preset'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.presetButton}
          onPress={handleReset}
          activeOpacity={0.7}
        >
          <ResetIcon color={colors.black} size={12} />
          <Text style={styles.presetButtonText}>Reset</Text>
        </TouchableOpacity>
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
    marginBottom: scale(20),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: scale(24),
    paddingBottom: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: colors.black,
  },
  title: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontSize: scale(28),
    fontWeight: '400',
    color: colors.black,
  },
  currentLabel: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(14),
    color: colors.gray,
  },

  // Speed Options Grid
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginBottom: scale(32),
  },
  optionButton: {
    width: '23.5%',
    height: scale(48),
    borderWidth: 1,
    borderColor: colors.grayLine,
    backgroundColor: colors.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  optionText: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(14),
    color: colors.black,
  },
  optionTextSelected: {
    color: colors.white,
  },
  defaultDot: {
    position: 'absolute',
    bottom: scale(6),
    width: scale(4),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: colors.gray,
  },
  defaultDotSelected: {
    backgroundColor: colors.white,
  },

  // Fine Tune Slider
  fineTune: {
    marginBottom: scale(24),
  },
  fineTuneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  fineTuneLabel: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(10),
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.gray,
  },
  fineTuneValue: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontSize: scale(24),
    fontStyle: 'italic',
    color: colors.black,
  },
  sliderContainer: {
    marginBottom: scale(4),
  },
  slider: {
    width: '100%',
    height: scale(32),
  },
  sliderMarks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: scale(2),
  },
  sliderMark: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(8),
    color: colors.gray,
  },

  // Saved Presets Section
  presetsSection: {
    marginBottom: scale(24),
  },
  presetsSectionLabel: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(10),
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.gray,
    marginBottom: scale(8),
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(12),
    overflow: 'visible',
    paddingTop: scale(10),
    paddingRight: scale(10),
  },
  presetWrapper: {
    position: 'relative',
    overflow: 'visible',
  },
  presetOption: {
    paddingHorizontal: scale(16),
    height: scale(40),
    borderWidth: 1,
    borderColor: colors.grayLine,
    backgroundColor: colors.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetOptionDeleteMode: {
    borderColor: colors.gray,
  },
  deleteButton: {
    position: 'absolute',
    top: scale(-8),
    right: scale(-8),
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  presetsHint: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(8),
    color: colors.gray,
    marginTop: scale(8),
    textAlign: 'center',
  },

  // Presets Row
  presets: {
    flexDirection: 'row',
    gap: scale(8),
  },
  presetButton: {
    flex: 1,
    height: scale(40),
    borderWidth: 1,
    borderColor: colors.grayLine,
    backgroundColor: colors.grayLight,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(6),
  },
  presetButtonDisabled: {
    backgroundColor: colors.grayLight,
    borderColor: colors.grayLine,
  },
  presetButtonText: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
    fontSize: scale(11),
    fontWeight: '500',
    color: colors.black,
  },
  presetButtonTextDisabled: {
    color: colors.gray,
  },
});

export default SpeedSheet;
