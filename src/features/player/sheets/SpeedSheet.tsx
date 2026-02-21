/**
 * src/features/player/sheets/SpeedSheet.tsx
 *
 * Playback Speed panel - Redesigned based on UX best practices:
 * - Large speed readout at top for immediate visibility
 * - Slider with labels ABOVE track (not obscured by thumb)
 * - Tick marks for spatial orientation
 * - Unified preset grid (saved presets merged with defaults)
 * - Clear active state on current speed
 * - Double-tap to remove saved presets (more discoverable than long-press)
 * - Explicit "Done" button for dismissal
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
import { useSpeedStore, useSpeedPresets, usePlaybackRate } from '../stores/speedStore';
import { usePlayerStore } from '../stores/playerStore';
import { haptics } from '@/core/native/haptics';
import { scale } from '@/shared/theme';
import {
  secretLibraryColors as colors,
} from '@/shared/theme/secretLibrary';

// =============================================================================
// CONSTANTS
// =============================================================================

// Default presets - consistent 0.25× increments, removed 0.5× (rarely used)
const DEFAULT_PRESETS = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5];
const MIN_SPEED = 0.5;
const MAX_SPEED = 3.0;
const SLIDER_SNAP_POINTS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0];

// =============================================================================
// ICONS
// =============================================================================

const ResetIcon = ({ color = colors.white, size = 14 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M3 12a9 9 0 1 0 9-9" />
    <Path d="M3 3v6h6" />
  </Svg>
);

// =============================================================================
// DARK MODE COLORS
// =============================================================================

const darkBg = '#0a0a0a';
const darkCard = '#1a1a1a';
const darkBorder = '#2a2a2a';
const accentBorder = '#E8E4DF'; // Cream/white for active state border

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
  // Speed state from speedStore (single source of truth)
  const playbackRate = usePlaybackRate();
  // Use playerStore's setPlaybackRate which properly determines the current book
  const setPlaybackRate = usePlayerStore((s) => s.setPlaybackRate);

  // Speed presets from store
  const savedPresets = useSpeedPresets();
  const saveSpeedPreset = useSpeedStore((s) => s.saveSpeedPreset);
  const removeSpeedPreset = useSpeedStore((s) => s.removeSpeedPreset);

  // Local state for slider (updates on change, commits on release)
  const [sliderValue, setSliderValue] = useState(playbackRate);
  const [isDragging, setIsDragging] = useState(false);

  // Track last tap time for double-tap detection
  const lastTapRef = useRef<{ speed: number; time: number } | null>(null);

  // Animation for speed display scale during drag
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Sync slider when playbackRate changes externally
  useEffect(() => {
    if (!isDragging) {
      setSliderValue(playbackRate);
    }
  }, [playbackRate, isDragging]);

  // Animate scale when dragging
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isDragging ? 1.1 : 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [isDragging, scaleAnim]);

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  // Merge saved presets into default grid
  const getAllPresets = useCallback(() => {
    const all = new Set([...DEFAULT_PRESETS, ...savedPresets]);
    return Array.from(all).sort((a, b) => a - b);
  }, [savedPresets]);

  const isSavedPreset = useCallback((speed: number) => {
    return savedPresets.some(p => Math.abs(p - speed) < 0.01);
  }, [savedPresets]);

  const isDefaultPreset = useCallback((speed: number) => {
    return DEFAULT_PRESETS.some(p => Math.abs(p - speed) < 0.01);
  }, []);

  const isCurrentSpeed = useCallback((speed: number) => {
    return Math.abs(playbackRate - speed) < 0.01;
  }, [playbackRate]);

  // Format speed for display
  const formatSpeed = (speed: number) => {
    return speed.toFixed(2);
  };

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleSliderChange = useCallback((value: number) => {
    // Round to nearest 0.05
    const rounded = Math.round(value * 20) / 20;
    setSliderValue(rounded);
  }, []);

  const handleSliderStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleSliderComplete = useCallback(async (value: number) => {
    const rounded = Math.round(value * 20) / 20;
    setIsDragging(false);
    haptics.speedChange();
    await setPlaybackRate(rounded);
  }, [setPlaybackRate]);

  const handlePresetPress = useCallback(async (speed: number) => {
    const now = Date.now();
    const lastTap = lastTapRef.current;

    // Check for double-tap on saved preset
    if (lastTap && lastTap.speed === speed && now - lastTap.time < 400) {
      // Double tap detected
      if (isSavedPreset(speed) && !isDefaultPreset(speed)) {
        haptics.impact('light');
        await removeSpeedPreset(speed);
        lastTapRef.current = null;
        return;
      }
    }

    // Single tap - select speed
    lastTapRef.current = { speed, time: now };
    haptics.speedChange();
    setSliderValue(speed);
    await setPlaybackRate(speed);
  }, [setPlaybackRate, removeSpeedPreset, isSavedPreset, isDefaultPreset]);

  const handleSavePreset = useCallback(async () => {
    // Don't save if it's already a preset
    if (isDefaultPreset(sliderValue) || isSavedPreset(sliderValue)) {
      return;
    }
    haptics.success();
    await saveSpeedPreset(sliderValue);
  }, [saveSpeedPreset, sliderValue, isDefaultPreset, isSavedPreset]);

  const handleReset = useCallback(async () => {
    haptics.speedChange();
    setSliderValue(1.0);
    await setPlaybackRate(1.0);
  }, [setPlaybackRate]);

  // ==========================================================================
  // COMPUTED
  // ==========================================================================

  const allPresets = getAllPresets();
  const canSavePreset = !isDefaultPreset(sliderValue) && !isSavedPreset(sliderValue);
  const displaySpeed = isDragging ? sliderValue : playbackRate;

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <View style={styles.container}>
      {/* Handle */}
      <View style={styles.handle} />

      {/* Header with Done button */}
      <View style={styles.header}>
        <Text style={styles.title}>Speed</Text>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.doneButton}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Large Speed Display */}
      <Animated.View style={[styles.speedDisplay, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.speedValue}>{formatSpeed(displaySpeed)}</Text>
        <Text style={styles.speedUnit}>×</Text>
      </Animated.View>

      {/* Slider Section */}
      <View style={styles.sliderSection}>
        {/* Labels ABOVE the track */}
        <View style={styles.sliderLabels}>
          {SLIDER_SNAP_POINTS.map((point) => (
            <Text key={point} style={styles.sliderLabel}>{point.toFixed(1)}</Text>
          ))}
        </View>

        {/* Slider with tick marks */}
        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={MIN_SPEED}
            maximumValue={MAX_SPEED}
            value={sliderValue}
            onValueChange={handleSliderChange}
            onSlidingStart={handleSliderStart}
            onSlidingComplete={handleSliderComplete}
            minimumTrackTintColor={colors.gray}
            maximumTrackTintColor={darkBorder}
            thumbTintColor={colors.white}
          />
          {/* Tick marks on track */}
          <View style={styles.tickMarks} pointerEvents="none">
            {SLIDER_SNAP_POINTS.map((point) => (
              <View key={point} style={styles.tickMark} />
            ))}
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, !canSavePreset && styles.actionButtonDisabled]}
          onPress={handleSavePreset}
          activeOpacity={0.7}
          disabled={!canSavePreset}
        >
          <Text style={[styles.actionButtonText, !canSavePreset && styles.actionButtonTextDisabled]}>
            + Save Preset
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleReset}
          activeOpacity={0.7}
        >
          <ResetIcon color={colors.white} size={14} />
          <Text style={styles.actionButtonText}>Reset to 1.0×</Text>
        </TouchableOpacity>
      </View>

      {/* Presets Grid */}
      <Text style={styles.sectionLabel}>PRESETS</Text>
      <View style={styles.presetsGrid}>
        {allPresets.map((speed) => {
          const isActive = isCurrentSpeed(speed);
          const isSaved = isSavedPreset(speed) && !isDefaultPreset(speed);

          return (
            <TouchableOpacity
              key={speed}
              style={[
                styles.presetButton,
                isActive && styles.presetButtonActive,
              ]}
              onPress={() => handlePresetPress(speed)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.presetText,
                isActive && styles.presetTextActive,
              ]}>
                {speed.toFixed(speed % 0.25 === 0 ? 1 : 2)}×
              </Text>
              {/* Dot indicator for saved presets */}
              {isSaved && (
                <View style={[
                  styles.savedDot,
                  isActive && styles.savedDotActive,
                ]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Hint text */}
      {savedPresets.length > 0 && (
        <Text style={styles.hintText}>
          Double-tap saved presets (•) to remove
        </Text>
      )}
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: darkBg,
    paddingHorizontal: scale(20),
    paddingBottom: scale(24),
  },
  handle: {
    width: scale(36),
    height: scale(4),
    backgroundColor: darkBorder,
    borderRadius: scale(2),
    alignSelf: 'center',
    marginTop: scale(8),
    marginBottom: scale(12),
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(16),
  },
  title: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontSize: scale(20),
    fontWeight: '400',
    color: colors.white,
  },
  doneButton: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
    fontSize: scale(15),
    color: colors.gray,
  },

  // Speed Display
  speedDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: scale(16),
  },
  speedValue: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontSize: scale(56),
    fontWeight: '300',
    color: colors.white,
    letterSpacing: -2,
  },
  speedUnit: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontSize: scale(24),
    color: colors.gray,
    marginLeft: scale(2),
  },

  // Slider Section
  sliderSection: {
    marginBottom: scale(14),
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: scale(8),
    marginBottom: scale(2),
  },
  sliderLabel: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(10),
    color: colors.gray,
  },
  sliderContainer: {
    position: 'relative',
    height: scale(36),
    justifyContent: 'center',
  },
  slider: {
    width: '100%',
    height: scale(36),
  },
  tickMarks: {
    position: 'absolute',
    left: scale(8),
    right: scale(8),
    top: '50%',
    marginTop: scale(-6),
    flexDirection: 'row',
    justifyContent: 'space-between',
    pointerEvents: 'none',
  },
  tickMark: {
    width: scale(1.5),
    height: scale(12),
    backgroundColor: darkBorder,
    borderRadius: scale(1),
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: scale(10),
    marginBottom: scale(16),
  },
  actionButton: {
    flex: 1,
    height: scale(40),
    borderRadius: scale(10),
    backgroundColor: darkCard,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(6),
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  actionButtonText: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
    fontSize: scale(13),
    color: colors.white,
  },
  actionButtonTextDisabled: {
    color: colors.gray,
  },

  // Presets Grid
  sectionLabel: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(10),
    letterSpacing: 1,
    color: colors.gray,
    marginBottom: scale(8),
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(6),
  },
  presetButton: {
    width: '23%',
    height: scale(38),
    borderRadius: scale(10),
    backgroundColor: darkCard,
    borderWidth: 1.5,
    borderColor: darkBorder,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  presetButtonActive: {
    borderColor: accentBorder,
    borderWidth: 2,
    backgroundColor: '#1c1c1c',
  },
  presetText: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(13),
    color: colors.white,
  },
  presetTextActive: {
    color: colors.white,
  },
  savedDot: {
    position: 'absolute',
    top: scale(5),
    right: scale(5),
    width: scale(4),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: colors.gray,
  },
  savedDotActive: {
    backgroundColor: colors.white,
  },

  // Hint text
  hintText: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(10),
    color: colors.gray,
    textAlign: 'center',
    marginTop: scale(10),
  },
});

export default SpeedSheet;
