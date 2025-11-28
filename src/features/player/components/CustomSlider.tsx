/**
 * src/features/player/components/CustomSlider.tsx
 */

import React, { useRef, useEffect } from 'react';
import { View, Animated, PanResponder } from 'react-native';
import { COVER_SIZE } from '../constants';

interface CustomSliderProps {
  value: number;
  onValueChange: (val: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  trackColor?: string;
  thumbColor?: string;
}

export function CustomSlider({
  value,
  onValueChange,
  minimumValue = 0,
  maximumValue = 1,
  step = 0.01,
  trackColor = '#fff',
  thumbColor = '#fff',
}: CustomSliderProps) {
  const sliderWidth = COVER_SIZE - 32;
  const thumbSize = 28;
  
  const valueToPosition = (val: number) => {
    const percent = (val - minimumValue) / (maximumValue - minimumValue);
    return percent * (sliderWidth - thumbSize);
  };
  
  const positionToValue = (pos: number) => {
    const percent = pos / (sliderWidth - thumbSize);
    let val = minimumValue + percent * (maximumValue - minimumValue);
    if (step > 0) {
      val = Math.round(val / step) * step;
    }
    return Math.max(minimumValue, Math.min(maximumValue, val));
  };

  const pan = useRef(new Animated.Value(valueToPosition(value))).current;
  
  useEffect(() => {
    pan.setValue(valueToPosition(value));
  }, [value]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.extractOffset();
      },
      onPanResponderMove: (_, gesture) => {
        const newPos = Math.max(0, Math.min(sliderWidth - thumbSize, gesture.dx + (pan as any)._offset));
        pan.setValue(newPos - (pan as any)._offset);
        onValueChange(positionToValue(newPos));
      },
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  const fillWidth = pan.interpolate({
    inputRange: [0, sliderWidth - thumbSize],
    outputRange: [thumbSize / 2, sliderWidth - thumbSize / 2],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ width: sliderWidth, height: 40, justifyContent: 'center' }}>
      {/* Track background */}
      <View style={{
        position: 'absolute',
        left: 0,
        right: 0,
        height: 6,
        backgroundColor: 'rgba(128,128,128,0.3)',
        borderRadius: 3,
      }} />
      {/* Track fill */}
      <Animated.View style={{
        position: 'absolute',
        left: 0,
        width: fillWidth,
        height: 6,
        backgroundColor: trackColor,
        borderRadius: 3,
      }} />
      {/* Thumb */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          position: 'absolute',
          left: 0,
          transform: [{ translateX: pan }],
          width: thumbSize,
          height: thumbSize,
          borderRadius: thumbSize / 2,
          backgroundColor: thumbColor,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5,
        }}
      />
    </View>
  );
}
