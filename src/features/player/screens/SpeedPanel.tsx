/**
 * src/features/player/screens/SpeedPanel.tsx
 *
 * Full-screen speed control panel with vertical slider.
 * Simple design: black unfilled area, white filled area, 3 icons.
 */

import React, { useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import {
  ChevronLeft,
  ChevronDown,
  Settings,
} from 'lucide-react-native';

import { usePlayerStore } from '../stores/playerStore';
import { haptics } from '@/core/native/haptics';
import { scale, hp, spacing } from '@/shared/theme';

// =============================================================================
// CONSTANTS
// =============================================================================

const SLIDER_WIDTH = scale(140);
const SLIDER_HEIGHT = hp(52);
const SLIDER_BORDER_RADIUS = scale(24);

const MIN_SPEED = 0.1;
const MAX_SPEED = 2.0;

// Snap points for haptic feedback
const SNAP_POINTS = [0.1, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0];

// =============================================================================
// HELPER FUNCTIONS (Worklets for UI thread)
// =============================================================================

// Linear conversion: top = 4x, bottom = 0.1x
// Convert Y position to speed (top = max, bottom = min)
const yToSpeed = (y: number, height: number): number => {
  'worklet';
  const normalizedY = Math.max(0, Math.min(1, y / height));
  // Linear: top (y=0) = 4x, bottom (y=height) = 0.1x
  return MAX_SPEED - normalizedY * (MAX_SPEED - MIN_SPEED);
};

// Convert speed to Y position
const speedToY = (speed: number, height: number): number => {
  'worklet';
  // Linear: 4x = 0, 0.1x = height
  return ((MAX_SPEED - speed) / (MAX_SPEED - MIN_SPEED)) * height;
};

const findNearestSnapPoint = (speed: number): number => {
  'worklet';
  const snapPoints = [0.1, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0];
  let closest = snapPoints[0];
  let minDiff = Math.abs(speed - closest);

  for (let i = 0; i < snapPoints.length; i++) {
    const diff = Math.abs(speed - snapPoints[i]);
    if (diff < minDiff) {
      minDiff = diff;
      closest = snapPoints[i];
    }
  }

  const threshold = closest < 1 ? 0.05 : closest < 2 ? 0.08 : 0.15;
  return minDiff <= threshold ? closest : speed;
};

// Format speed for display
const formatSpeed = (speed: number): string => {
  if (Number.isInteger(speed)) return `${speed}`;
  const rounded = Math.round(speed * 100) / 100;
  return `${rounded}`;
};

// =============================================================================
// ANIMAL ICONS (Black icons, no background)
// =============================================================================

const TurtleIcon = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size * 0.53} viewBox="0 0 30 16" fill="none">
    <Path d="M4.6104 10.0063H4.61115C10.79 12.5167 18.402 10.5965 22.517 5.38771C22.5304 5.36772 22.5476 5.34624 22.5684 5.3218C22.5737 5.31588 22.5789 5.30921 22.5834 5.30255C22.5834 5.30255 22.5841 5.30255 22.5841 5.30181C22.7868 4.9982 22.9515 4.05848 22.6802 3.92667C22.6728 3.9126 22.6646 3.89631 22.6564 3.87927C20.7983 3.04471 19.1906 1.71252 17.3526 0.857219C16.6811 0.510656 15.967 0.274431 15.2344 0.138916L15.7658 2.41231L15.768 2.42267C15.8664 2.78331 15.9603 3.14394 16.0311 3.50901C17.4175 4.6072 19.1846 5.47509 20.7677 6.34076C20.9324 6.39407 20.7349 6.54514 20.6604 6.61919C20.5941 6.67547 20.4368 6.85912 20.3623 6.82432C19.2718 6.18599 16.3337 4.24435 15.9797 4.16734C15.2992 4.682 14.4026 5.58099 13.7564 6.12823C13.7124 6.17414 13.6886 6.16303 13.6818 6.24597C13.8756 7.0013 14.021 7.82105 14.1879 8.6023C14.296 9.06068 14.4458 9.51091 14.5233 9.97596C14.5472 10.0989 14.4108 10.0641 14.3094 10.0967C14.1402 10.1211 13.8712 10.1907 13.7586 10.1944C13.5514 9.14288 13.2063 7.2279 13.0088 6.22079C11.8118 6.25708 9.90003 6.16377 8.7224 6.27781C8.18427 7.49893 7.84589 8.90813 7.41658 10.2114C7.40913 10.2544 7.38751 10.2707 7.34428 10.2648C7.21981 10.2448 6.8859 10.19 6.78901 10.1722C6.7346 10.1626 6.74057 10.1426 6.75771 10.0656C7.11174 8.8637 7.70279 7.6648 8.04341 6.47405C8.27446 6.11342 8.01583 5.76093 7.92788 5.3966C7.83322 5.02634 7.74453 4.65237 7.63869 4.2836L7.18329 2.82552C6.95075 3.08692 6.73684 3.36535 6.54529 3.65786C5.35797 5.32402 4.81015 7.46486 3.30607 8.97848C3.30682 8.9807 3.30756 8.98367 3.30905 8.98589C3.15104 9.14362 3.93066 9.67679 4.6104 10.0063Z" fill="#1D1B20" />
    <Path d="M8.57185 5.25746C8.69482 5.76768 8.82302 5.74621 9.30525 5.71955C10.5216 5.67512 11.7619 5.74547 12.9671 5.5707C13.6535 5.0516 14.8267 4.16224 15.4483 3.68682C15.4341 3.58834 15.2806 2.87225 15.133 2.18505L15.1278 2.15839C15.0272 1.69113 14.9303 1.24089 14.8826 1.01133C14.8788 0.984673 14.8692 0.971344 14.8818 0.968381L14.694 0.0575439C12.1681 -0.238663 9.505 0.6233 7.69235 2.30576L8.12539 3.7979C8.29756 4.27628 8.41607 4.81167 8.57185 5.25746Z" fill="#1D1B20" />
    <Path d="M4.16171 11.1587C10.9331 14.1926 19.678 12.0651 23.8258 5.83439C24.0449 5.42044 24.1396 5.08572 24.0151 4.67103C23.8959 4.51552 23.749 4.3104 23.559 4.23487C23.4733 4.20599 23.3891 4.17637 23.3048 4.14526C23.3771 4.41407 23.2966 4.74879 23.1625 5.13534C23.1587 5.14274 23.1543 5.14941 23.1491 5.15681C23.1058 5.30566 22.9732 5.55447 22.9486 5.62556C19.5543 10.4078 12.3246 12.8641 6.74578 11.1654C6.74429 11.1646 6.74354 11.1646 6.74205 11.1639C6.73832 11.1632 6.73534 11.1617 6.73162 11.1609C6.57584 11.1135 6.42081 11.0624 6.26802 11.0076C6.25982 11.0047 6.25162 11.0017 6.24342 10.9988C4.39649 10.3738 3.36793 9.86577 2.83725 9.45774C2.4221 10.2731 3.50134 10.8766 4.16171 11.1587Z" fill="#1D1B20" />
    <Path d="M21.5435 10.8719C21.3609 10.7216 21.1768 10.5268 20.9912 10.261C20.4083 10.5372 18.1805 12.0405 18.0695 12.0871C18.0546 12.1012 18.059 12.1419 18.0672 12.1597C18.6166 13.3763 19.3112 13.1335 20.064 14.4109C20.7706 15.6097 23.412 13.8288 23.6766 12.972C23.9584 12.0619 22.3537 11.5406 21.5435 10.8727V10.8719Z" fill="#1D1B20" />
    <Path d="M9.48921 13.5518C8.6127 13.4392 7.73768 13.2497 6.86116 13.1823C6.77545 13.183 6.67036 13.1149 6.59806 13.1393C6.53173 13.2393 6.45123 13.3778 6.39757 13.4837C6.22391 14.0709 5.98763 14.8929 6.33645 15.3935C6.4639 15.5838 6.65769 15.6334 6.87384 15.6445C7.12427 15.6571 8.91158 15.76 9.71355 15.7437C10.0929 15.7363 10.4045 15.4431 10.4313 15.0676C10.4589 14.6848 10.4276 14.2286 10.1816 13.9694C9.94759 13.6718 9.81864 13.6066 9.48995 13.5518H9.48921Z" fill="#1D1B20" />
    <Path d="M5.26138 12.7556C4.87604 12.6749 4.53095 12.5935 4.15531 12.4402C3.56649 12.2284 3.02315 11.9063 2.53272 11.5219C2.45446 11.4708 2.34862 11.4894 2.27856 11.5449C2.05496 11.6656 1.81794 11.7226 1.54888 11.8441C-3.19367 13.9227 4.34835 13.3769 5.63405 12.9237C5.59529 12.7971 5.37542 12.7971 5.26138 12.7549V12.7556Z" fill="#1D1B20" />
    <Path d="M29.5689 5.22144C28.5008 3.98329 26.2015 3.69671 25.1349 4.75565C25.0372 4.83711 25.0044 4.95115 25.0059 5.07185C24.953 7.42892 21.4 8.92625 22.3145 9.13952C26.2723 10.0607 28.9801 8.58043 29.58 7.75623C30.1152 7.02164 30.1681 6.1034 29.5689 5.22144ZM27.1823 6.32925C26.1649 6.82466 25.6767 5.08889 26.7724 4.95559C27.5475 4.86081 27.944 5.95825 27.1823 6.32925Z" fill="#1D1B20" />
  </Svg>
);

const RabbitIcon = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size * 0.77} viewBox="0 0 30 23" fill="none">
    <Path d="M22.0346 18.0704C23.7495 18.3508 23.8203 21.1784 21.7878 21.3576C20.1297 21.5032 17.0384 21.4867 15.3678 21.3576C14.5007 21.2902 13.8988 20.9408 13.2461 20.4113C10.8084 18.4371 8.59337 15.9393 6.12321 13.9685C5.34206 13.291 4.87271 12.426 4.45671 11.5035C2.0349 12.9078 -0.805409 10.5769 0.2125 7.97539C0.833583 6.38689 2.76019 5.69048 4.29497 6.4946C4.49755 6.60066 5.17533 7.20169 5.24952 7.15236C6.24326 5.42655 8.099 4.81154 10.044 4.93323C13.8396 5.17084 16.7908 7.81835 20.0771 9.36903L20.4106 8.22123C18.95 7.62431 17.6495 6.37702 16.845 5.0434C16.4599 4.40455 15.918 3.44668 16.2056 2.72067C16.715 1.43309 18.1806 1.97904 19.1351 2.37616C21.02 3.16219 22.504 4.7063 23.3251 6.53817L24.659 6.65904C24.2938 5.64197 23.7486 4.60846 23.0358 3.78543C22.8157 3.53136 21.9454 2.8218 21.9087 2.59158C22.1813 -2.41319 25.1083 0.935658 25.972 3.43681C26.4172 4.72603 26.4647 6.03581 26.343 7.38176C28.1271 8.72689 30.6522 9.97253 29.8452 12.6324C28.8307 15.9755 24.2455 14.4231 21.6378 14.8055L18.3289 16.5929V15.3202C18.3289 13.1388 16.3548 10.687 14.3874 9.84673C13.9238 9.64858 12.1331 9.05002 11.7038 9.03604C11.0535 9.01466 10.6092 9.73491 10.9985 10.3137C11.3095 10.7758 13.0827 11.0472 13.7213 11.3251C15.0226 11.8916 16.6633 13.7045 16.6633 15.1565V18.0704H22.0363H22.0346ZM25.7211 9.87633C24.4956 10.0252 25.0416 11.9516 26.1796 11.4015C27.0316 10.9896 26.5873 9.77109 25.7211 9.87633Z" fill="#1D1B20" />
    <Path d="M11.6638 21.188C10.2882 21.7348 8.74842 23.8972 7.20947 22.5825C6.52836 22.0012 6.47667 20.9685 7.0394 20.2844C7.21197 20.0748 8.94183 18.8875 9.12524 18.8916L11.6638 21.188Z" fill="#1D1B20" />
  </Svg>
);

const FastRabbitIcon = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size * 0.61} viewBox="0 0 31 19" fill="none">
    <Path d="M8.76923 16.1284H2.8077" stroke="#1D1B20" strokeLinecap="round" />
    <Path d="M8.19231 10.7437L0.499999 10.7437" stroke="#1D1B20" strokeLinecap="round" />
    <Path d="M11.0769 13.436L3.96154 13.436" stroke="#1D1B20" strokeLinecap="round" />
    <Path d="M16.5998 15.9913C15.4519 16.4605 12.6477 19.301 11.3642 18.1735C10.7958 17.6747 10.7527 16.7886 11.2223 16.2016C11.3663 16.0217 14.3284 14.0173 14.4822 14.0215L16.6005 15.992L16.5998 15.9913Z" fill="#1D1B20" />
    <Path d="M30.497 6.72839C30.497 6.55413 30.4275 6.3968 30.3148 6.28321C30.2028 6.16891 30.0469 6.09836 29.8758 6.09836L28.362 5.49936C27.5989 5.12332 26.7857 4.79172 26.2076 4.343C24.0566 2.08978 23.7449 1.68881 21.3442 0.809723C19.6974 0.206714 16.4754 -0.410194 16.2859 0.359037C16.2007 0.704867 18.9393 1.08051 20.5741 1.69445C22.556 2.43879 24.378 3.4364 24.8496 4.46859L24.2687 4.59206C19.9514 0.73917 11.8866 0.37794 11.776 1.80311C11.7022 2.75627 12.8768 1.96924 16.0964 2.4744C20.8652 3.22226 22.3786 5.8493 22.3786 5.8493L22.1004 6.83352C19.358 5.5036 16.8954 3.23109 13.728 3.0272C12.105 2.92348 10.5565 3.45051 9.72725 4.93212C9.66464 4.97375 5.78492 2.58765 4.47846 6.02145C3.62905 8.25374 7.04477 9.87011 9.06568 8.66507C9.41281 9.45737 9.80447 10.1989 10.4563 10.7809C15.2244 11.7588 16.3368 14.6155 18.3709 16.3095C18.9163 16.7631 19.4179 17.0637 20.1421 17.1208C21.5362 17.2323 22.1449 17.2464 23.5286 17.1215C25.2239 16.9684 25.1655 14.5414 23.7345 14.3008H19.9848C19.9848 14.3008 20.0363 9.96253 16.7959 8.51197C16.263 8.2735 14.7833 8.04138 14.5239 7.64487C14.1997 7.14818 14.5705 6.53014 15.1124 6.54848C15.4707 6.56048 16.9657 7.0741 17.3517 7.24413C18.7479 7.85935 19.5591 8.82663 20.0287 9.79603C20.8106 11.4124 21.0276 12.8185 21.0276 12.8185L23.4026 11.4992C25.5787 11.1711 30.1631 11.2205 30.4824 8.24245C30.5012 8.06607 30.5019 7.90027 30.4852 7.74435C30.5089 7.3288 30.497 6.89278 30.497 6.72839ZM27.2858 7.76764C27.2858 7.76764 27.2817 7.77046 27.2803 7.77187C26.9095 8.04702 26.5589 7.90733 26.3655 7.63711C26.1157 7.28999 26.1234 6.72769 26.6751 6.55131C27.37 6.32977 27.9217 7.28929 27.2858 7.76764Z" fill="#1D1B20" />
  </Svg>
);

// =============================================================================
// COMPONENT
// =============================================================================

interface SpeedPanelProps {
  onClose: () => void;
  onBack?: () => void;
  onSettings?: () => void;
}

export function SpeedPanel({ onClose, onBack, onSettings }: SpeedPanelProps) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  // Player state
  const playbackRate = usePlayerStore((s) => s.playbackRate);
  const setPlaybackRate = usePlayerStore((s) => s.setPlaybackRate);

  // Local state
  const [inputValue, setInputValue] = useState(formatSpeed(playbackRate));
  const [displaySpeed, setDisplaySpeed] = useState(playbackRate);

  // Animated values
  const indicatorY = useSharedValue(speedToY(playbackRate, SLIDER_HEIGHT));
  const lastSnapPoint = useSharedValue(playbackRate);

  // Animated style for the black fill at top (unfilled portion)
  const unfilledAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: indicatorY.value,
    };
  });

  // Apply speed change
  const applySpeed = useCallback((speed: number) => {
    const clampedSpeed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed));
    const roundedSpeed = Math.round(clampedSpeed * 100) / 100;
    setPlaybackRate(roundedSpeed);
    setDisplaySpeed(roundedSpeed);
  }, [setPlaybackRate]);

  // Haptic wrapper functions
  const triggerLightHaptic = useCallback(() => {
    haptics.impact('light');
  }, []);

  const triggerMediumHaptic = useCallback(() => {
    haptics.impact('medium');
  }, []);

  const triggerSelectionHaptic = useCallback(() => {
    haptics.selection();
  }, []);

  // Update input when slider changes - must be defined before gesture handler
  const updateInputFromSlider = useCallback((speed: number) => {
    setDisplaySpeed(speed);
    setInputValue(formatSpeed(speed));
  }, []);

  // Gesture handler - no animations, instant updates
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      runOnJS(triggerLightHaptic)();
    })
    .onUpdate((event) => {
      const y = Math.max(0, Math.min(SLIDER_HEIGHT, event.y));
      indicatorY.value = y; // Direct assignment, no animation

      const speed = yToSpeed(y, SLIDER_HEIGHT);
      const roundedSpeed = Math.round(speed * 100) / 100;
      runOnJS(updateInputFromSlider)(roundedSpeed);

      // Check for snap point crossing
      const snapped = findNearestSnapPoint(speed);
      if (Math.abs(snapped - lastSnapPoint.value) > 0.01) {
        lastSnapPoint.value = snapped;
        runOnJS(triggerSelectionHaptic)();
      }

      // Real-time audio update
      runOnJS(applySpeed)(speed);
    })
    .onEnd(() => {
      const speed = yToSpeed(indicatorY.value, SLIDER_HEIGHT);
      const snappedSpeed = findNearestSnapPoint(speed);
      const snappedY = speedToY(snappedSpeed, SLIDER_HEIGHT);

      // Direct assignment, no spring animation
      indicatorY.value = snappedY;

      runOnJS(applySpeed)(snappedSpeed);
      runOnJS(updateInputFromSlider)(snappedSpeed);
      runOnJS(triggerMediumHaptic)();
    });

  // Handle editable speed input
  const handleInputChange = useCallback((text: string) => {
    setInputValue(text);
  }, []);

  const handleInputSubmit = useCallback(() => {
    Keyboard.dismiss();
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      const clampedSpeed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, parsed));
      applySpeed(clampedSpeed);
      indicatorY.value = speedToY(clampedSpeed, SLIDER_HEIGHT);
      setInputValue(formatSpeed(clampedSpeed));
    } else {
      // Reset to current speed if invalid
      setInputValue(formatSpeed(displaySpeed));
    }
  }, [inputValue, applySpeed, indicatorY, displaySpeed]);

  return (
    <View style={[styles.container, { backgroundColor: '#E8E8E8' }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={onBack || onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={28} color="#1A1A1A" strokeWidth={2} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronDown size={28} color="#1A1A1A" strokeWidth={2} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={onSettings}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Settings size={24} color="#1A1A1A" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Speed Display (Always Editable TextInput) */}
      <View style={styles.speedDisplay}>
        <View style={styles.editContainer}>
          <TextInput
            ref={inputRef}
            style={styles.speedInput}
            value={inputValue}
            onChangeText={handleInputChange}
            onSubmitEditing={handleInputSubmit}
            onBlur={handleInputSubmit}
            keyboardType="decimal-pad"
            returnKeyType="done"
            selectTextOnFocus
          />
          <Text style={styles.speedSuffix}>x</Text>
        </View>
      </View>

      {/* Slider Container */}
      <View style={styles.sliderContainer}>
        <GestureDetector gesture={panGesture}>
          <View style={styles.sliderTrack}>
            {/* Black unfilled area at top */}
            <Animated.View style={[styles.unfilledArea, unfilledAnimatedStyle]} />

            {/* Markers at linear positions: 2x=0%, 1.5x=26%, 1x=53%, 0.1x=100% */}

            {/* 2x label at top */}
            <Text style={[styles.speedLabel, { top: scale(16) }]}>2x</Text>

            {/* Fast rabbit below 2x */}
            <View style={[styles.iconContainer, { top: scale(48) }]}>
              <FastRabbitIcon size={scale(32)} />
            </View>

            {/* 1.5x at 26% */}
            <Text style={[styles.speedLabel, { top: SLIDER_HEIGHT * 0.26 - scale(8) }]}>1.5x</Text>

            {/* Regular rabbit between 1.5x and 1x */}
            <View style={[styles.iconContainer, { top: SLIDER_HEIGHT * 0.40 - scale(12) }]}>
              <RabbitIcon size={scale(32)} />
            </View>

            {/* 1x marker line and label at 53% */}
            <View style={[styles.oneXLine, { top: SLIDER_HEIGHT * 0.53 }]} />
            <Text style={[styles.speedLabel, { top: SLIDER_HEIGHT * 0.53 + scale(6) }]}>1x</Text>

            {/* Turtle below 1x */}
            <View style={[styles.iconContainer, { top: SLIDER_HEIGHT * 0.72 - scale(8) }]}>
              <TurtleIcon size={scale(32)} />
            </View>

            {/* 0.1x label at bottom */}
            <Text style={[styles.speedLabel, { top: SLIDER_HEIGHT - scale(32) }]}>0.1x</Text>
          </View>
        </GestureDetector>
      </View>

      {/* Label */}
      <Text style={[styles.label, { paddingBottom: insets.bottom + spacing.lg }]}>Speed</Text>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedDisplay: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speedInput: {
    fontSize: scale(72),
    fontWeight: '300',
    color: '#1A1A1A',
    minWidth: scale(120),
    textAlign: 'center',
    padding: 0,
  },
  speedSuffix: {
    fontSize: scale(72),
    fontWeight: '300',
    color: '#1A1A1A',
  },
  sliderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  sliderTrack: {
    width: SLIDER_WIDTH,
    height: SLIDER_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderRadius: SLIDER_BORDER_RADIUS,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  unfilledArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1D1B20',
    borderTopLeftRadius: SLIDER_BORDER_RADIUS,
    borderTopRightRadius: SLIDER_BORDER_RADIUS,
  },
  speedLabel: {
    position: 'absolute',
    alignSelf: 'center',
    fontSize: scale(14),
    fontWeight: '500',
    color: '#666666',
    zIndex: 10,
  },
  iconContainer: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 10,
  },
  oneXLine: {
    position: 'absolute',
    left: scale(20),
    right: scale(20),
    height: 1,
    backgroundColor: '#CCCCCC',
    zIndex: 5,
  },
  label: {
    fontSize: scale(16),
    fontWeight: '500',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});

export default SpeedPanel;
