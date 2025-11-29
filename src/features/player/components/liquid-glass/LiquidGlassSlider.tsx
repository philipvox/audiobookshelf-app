/**
 * src/features/player/components/liquid-glass/LiquidGlassSlider.tsx
 * Simple glass-style slider
 */

import React, { useCallback } from 'react';
import { StyleSheet, View, Text, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  clamp,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

interface LiquidGlassSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  thumbWidth?: number;
  thumbHeight?: number;
  trackHeight?: number;
  tint?: 'light' | 'dark';
  labels?: { value: number; label: string }[];
}

export function LiquidGlassSlider({
  value,
  onValueChange,
  minimumValue = 0,
  maximumValue = 1,
  step = 0.01,
  thumbWidth = 56,
  thumbHeight = 36,
  trackHeight = 6,
  tint = 'light',
  labels,
}: LiquidGlassSliderProps) {
  const trackWidth = useSharedValue(300);
  const thumbX = useSharedValue(0);
  const startX = useSharedValue(0);

  const isLight = tint === 'light';
  const trackBg = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)';
  const trackFill = isLight ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.4)';
  const labelColor = isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)';
  const thumbBg = isLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)';

  const valueToX = useCallback(
    (val: number) => {
      'worklet';
      const range = maximumValue - minimumValue;
      const normalized = (val - minimumValue) / range;
      const availableWidth = trackWidth.value - thumbWidth;
      return normalized * availableWidth;
    },
    [minimumValue, maximumValue, thumbWidth]
  );

  const xToValue = useCallback(
    (x: number) => {
      'worklet';
      const availableWidth = trackWidth.value - thumbWidth;
      const normalized = clamp(x / availableWidth, 0, 1);
      const range = maximumValue - minimumValue;
      let val = minimumValue + normalized * range;
      if (step > 0) {
        val = Math.round(val / step) * step;
      }
      return clamp(val, minimumValue, maximumValue);
    },
    [minimumValue, maximumValue, step, thumbWidth]
  );

  React.useEffect(() => {
    thumbX.value = valueToX(value);
  }, [value, trackWidth.value]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const newWidth = e.nativeEvent.layout.width;
    trackWidth.value = newWidth;
    thumbX.value = valueToX(value);
  }, [value, valueToX]);

  const gesture = Gesture.Pan()
    .onStart(() => {
      startX.value = thumbX.value;
    })
    .onUpdate((e) => {
      const newX = clamp(startX.value + e.translationX, 0, trackWidth.value - thumbWidth);
      thumbX.value = newX;
      const newValue = xToValue(newX);
      runOnJS(onValueChange)(newValue);
    });

  const thumbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
  }));

  const fillAnimatedStyle = useAnimatedStyle(() => ({
    width: thumbX.value + thumbWidth / 2,
  }));

  return (
    <View style={styles.container} onLayout={onLayout}>
      <View style={[styles.trackContainer, { height: thumbHeight }]}>
        <View style={[styles.track, { height: trackHeight, backgroundColor: trackBg }]} />
        <Animated.View style={[styles.trackFill, { height: trackHeight, backgroundColor: trackFill }, fillAnimatedStyle]} />
        
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.thumb, { width: thumbWidth, height: thumbHeight, backgroundColor: thumbBg }, thumbAnimatedStyle]} />
        </GestureDetector>
      </View>

      {labels && (
        <View style={styles.labelsRow}>
          {labels.map((item) => (
            <Text key={item.value} style={[styles.label, { color: labelColor }]}>
              {item.label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  trackContainer: {
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 3,
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    // shadowRadius: 4,
    elevation: 4,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
  },
});