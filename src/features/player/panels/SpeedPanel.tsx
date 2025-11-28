/**
 * src/features/player/panels/SpeedPanel.tsx
 * Speed control panel with Liquid Glass slider
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LiquidGlassSlider } from '../components/liquid-glass/LiquidGlassSlider';

interface SpeedPanelColors {
  text: string;
  textSecondary: string;
  surface: string;
  isDark: boolean;
}

interface SpeedPanelProps {
  currentSpeed?: number;
  onSpeedChange: (speed: number) => void;
  onClose: () => void;
  colors?: SpeedPanelColors;
}

const DEFAULT_COLORS: SpeedPanelColors = {
  text: '#000000',
  textSecondary: 'rgba(0,0,0,0.5)',
  surface: '#FFFFFF',
  isDark: false,
};

const SPEED_PRESETS = [0.75, 1, 1.25, 1.5, 2];
const SPEED_LABELS = [
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1x' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x' },
];

const SNAP_THRESHOLD = 0.08;

export function SpeedPanel({ 
  currentSpeed = 1, 
  onSpeedChange, 
  onClose, 
  colors = DEFAULT_COLORS 
}: SpeedPanelProps) {
  const [tempSpeed, setTempSpeed] = useState(currentSpeed);
  const tint = colors.isDark ? 'dark' : 'light';

  useEffect(() => {
    setTempSpeed(currentSpeed);
  }, [currentSpeed]);

  const handleSliderChange = (value: number) => {
    for (const preset of SPEED_PRESETS) {
      if (Math.abs(value - preset) < SNAP_THRESHOLD) {
        setTempSpeed(preset);
        return;
      }
    }
    setTempSpeed(Math.round(value * 20) / 20);
  };

  const handlePresetPress = (preset: number) => {
    setTempSpeed(preset);
  };

  const handleApply = () => {
    onSpeedChange(tempSpeed);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const formatSpeed = (speed: number) => {
    if (speed == null) return '1x';
    return speed % 1 === 0 ? `${speed}x` : `${speed.toFixed(2)}x`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>
          PLAYBACK SPEED
        </Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </Pressable>
      </View>

      <Text style={[styles.speedValue, { color: colors.text }]}>
        {formatSpeed(tempSpeed)}
      </Text>

      <View style={styles.sliderContainer}>
        <LiquidGlassSlider
          value={tempSpeed}
          onValueChange={handleSliderChange}
          minimumValue={0.75}
          maximumValue={2}
          step={0.05}
          tint={tint}
          labels={SPEED_LABELS}
        />
      </View>

      <View style={styles.presetsRow}>
        {SPEED_PRESETS.map((preset) => {
          const isSelected = Math.abs(tempSpeed - preset) < 0.01;
          return (
            <TouchableOpacity
              key={preset}
              style={[
                styles.presetButton,
                {
                  backgroundColor: isSelected
                    ? colors.text
                    : colors.isDark
                    ? 'rgba(255,255,255,0.12)'
                    : 'rgba(0,0,0,0.08)',
                },
              ]}
              onPress={() => handlePresetPress(preset)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.presetText,
                  {
                    color: isSelected ? colors.surface : colors.text,
                  },
                ]}
              >
                {preset === 1 ? '1x' : `${preset}x`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.cancelButton,
            {
              backgroundColor: colors.isDark
                ? 'rgba(255,255,255,0.12)'
                : 'rgba(0,0,0,0.08)',
              transform: [{ rotate: '3deg' }],
            },
          ]}
          onPress={handleCancel}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionText, { color: colors.text }]}>
            Cancel
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.applyButton,
            {
              backgroundColor: colors.text,
              transform: [{ rotate: '-5deg' }],
            },
          ]}
          onPress={handleApply}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionText, { color: colors.surface }]}>
            Apply
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  speedValue: {
    fontSize: 56,
    fontWeight: '700',
    marginBottom: 24,
  },
  sliderContainer: {
    marginBottom: 24,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  presetButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  presetText: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 100,
  },
  cancelButton: {
    flex: 0,
  },
  applyButton: {
    flex: 1,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 17,
    fontWeight: '600',
  },
});