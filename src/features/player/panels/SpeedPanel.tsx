/**
 * src/features/player/panels/SpeedPanel.tsx
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';

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

export function SpeedPanel({ 
  currentSpeed = 1, 
  onSpeedChange, 
  onClose, 
  colors = DEFAULT_COLORS 
}: SpeedPanelProps) {
  const [tempSpeed, setTempSpeed] = React.useState(currentSpeed);
  
  const isLight = !colors.isDark;
  const textColor = colors.text;
  const secondaryColor = colors.textSecondary;
  const buttonBg = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.15)';
  const activeButtonBg = isLight ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.95)';
  const activeButtonText = colors.surface;
  const thumbColor = isLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.4)';

  React.useEffect(() => {
    setTempSpeed(currentSpeed);
  }, [currentSpeed]);

  const handleSliderChange = (value: number) => {
    setTempSpeed(Math.round(value * 20) / 20);
  };

  const handleApply = () => {
    onSpeedChange(tempSpeed);
    onClose();
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: secondaryColor }]}>PLAYBACK SPEED</Text>
      <Text style={[styles.valueText, { color: textColor }]}>
        {tempSpeed.toFixed(2)}x
      </Text>

      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          value={tempSpeed}
          onValueChange={handleSliderChange}
          minimumValue={0.75}
          maximumValue={2}
          step={0.05}
          minimumTrackTintColor={textColor}
          maximumTrackTintColor={secondaryColor}
          thumbTintColor={thumbColor}
        />
        <View style={styles.sliderLabels}>
          {SPEED_PRESETS.map((speed) => (
            <Text key={speed} style={[styles.sliderLabel, { color: secondaryColor }]}>
              {speed}x
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.presetRow}>
        {SPEED_PRESETS.map((speed) => {
          const isActive = Math.abs(tempSpeed - speed) < 0.01;
          return (
            <TouchableOpacity
              key={speed}
              style={[
                styles.presetButton,
                { backgroundColor: isActive ? activeButtonBg : buttonBg }
              ]}
              onPress={() => setTempSpeed(speed)}
            >
              <Text style={[
                styles.presetText,
                { color: isActive ? activeButtonText : textColor }
              ]}>
                {speed}x
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.applyContainer}>
        <TouchableOpacity
          style={[styles.cancelButton, { backgroundColor: buttonBg }]}
          onPress={onClose}
        >
          <Text style={[styles.cancelButtonText, { color: textColor }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.applyButton, { backgroundColor: activeButtonBg }]}
          onPress={handleApply}
        >
          <Text style={[styles.applyButtonText, { color: activeButtonText }]}>Apply</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: -8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  valueText: {
    fontSize: 56,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginBottom: 16,
    marginLeft: -4,
  },
  sliderContainer: {
    marginBottom: 32,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 10,
  },
  sliderLabel: {
    fontSize: 11,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  presetButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  presetText: {
    fontSize: 14,
    fontWeight: '600',
  },
  applyContainer: {
    marginTop: -10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
  },
  cancelButton: {
    paddingVertical: 26,
    paddingHorizontal: 40,
    borderRadius: 100,
  },
  cancelButtonText: {
    fontSize: 20,
    fontWeight: '600',
  },
  applyButton: {
    paddingVertical: 50,
    paddingHorizontal: 37,
    borderRadius: 100,
    transform: [{ rotate: '-5deg' }],
  },
  applyButtonText: {
    fontSize: 20,
    fontWeight: '700',
  },
});