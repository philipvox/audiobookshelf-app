/**
 * src/features/player/panels/SleepPanel.tsx
 */

import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { CustomSlider } from '../components/CustomSlider';
import { COVER_SIZE } from '../constants';

interface SleepPanelProps {
  tempSleepMins: number;
  setTempSleepMins: (mins: number) => void;
  sleepInputValue: string;
  setSleepInputValue: (val: string) => void;
  onClear: () => void;
  onStart: () => void;
  isLight: boolean;
}

const SLEEP_PRESETS = [5, 15, 30, 45, 60];

export function SleepPanel({
  tempSleepMins,
  setTempSleepMins,
  sleepInputValue,
  setSleepInputValue,
  onClear,
  onStart,
  isLight,
}: SleepPanelProps) {
  const textColor = isLight ? '#fff' : '#000';
  const secondaryColor = isLight ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const borderColor = isLight ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';
  const buttonBg = isLight ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
  const activeBg = isLight ? '#fff' : '#000';
  const activeText = isLight ? '#000' : '#fff';

  const handleInputChange = (text: string) => {
    setSleepInputValue(text);
    const num = parseInt(text, 10);
    if (!isNaN(num) && num >= 0 && num <= 120) {
      setTempSleepMins(num);
    }
  };

  const handleSliderChange = (val: number) => {
    setTempSleepMins(val);
    setSleepInputValue(String(Math.round(val)));
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: textColor }]}>Sleep Timer</Text>
      
      {/* Current value display with input */}
      <View style={styles.valueContainer}>
        <TextInput
          style={[styles.input, { color: textColor, borderColor }]}
          value={sleepInputValue}
          onChangeText={handleInputChange}
          keyboardType="number-pad"
          maxLength={3}
          selectTextOnFocus
        />
        <Text style={[styles.inputLabel, { color: secondaryColor }]}>minutes</Text>
      </View>

      {/* Slider */}
      <View style={styles.sliderContainer}>
        <CustomSlider
          value={tempSleepMins}
          onValueChange={handleSliderChange}
          minimumValue={0}
          maximumValue={120}
          step={5}
          trackColor={textColor}
          thumbColor={textColor}
        />
        <View style={styles.sliderLabels}>
          <Text style={[styles.sliderLabel, { color: secondaryColor }]}>Off</Text>
          <Text style={[styles.sliderLabel, { color: secondaryColor }]}>30m</Text>
          <Text style={[styles.sliderLabel, { color: secondaryColor }]}>1h</Text>
          <Text style={[styles.sliderLabel, { color: secondaryColor }]}>2h</Text>
        </View>
      </View>

      {/* Presets */}
      <View style={styles.presetRow}>
        {SLEEP_PRESETS.map((mins) => (
          <TouchableOpacity
            key={mins}
            style={[
              styles.presetButton,
              { backgroundColor: tempSleepMins === mins ? activeBg : buttonBg }
            ]}
            onPress={() => {
              setTempSleepMins(mins);
              setSleepInputValue(String(mins));
            }}
          >
            <Text style={[
              styles.presetText,
              { color: tempSleepMins === mins ? activeText : textColor }
            ]}>
              {mins < 60 ? `${mins}m` : `${mins / 60}h`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.clearButton, { backgroundColor: buttonBg }]}
          onPress={onClear}
        >
          <Text style={[styles.clearButtonText, { color: textColor }]}>Off</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: activeBg }]}
          onPress={onStart}
        >
          <Text style={[styles.startButtonText, { color: activeText }]}>Start Timer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  valueContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    fontSize: 48,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    borderBottomWidth: 2,
    paddingBottom: 4,
    minWidth: 100,
  },
  inputLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  sliderContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: COVER_SIZE - 32,
    marginTop: 8,
  },
  sliderLabel: {
    fontSize: 12,
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  presetButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  presetText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  clearButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  startButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
