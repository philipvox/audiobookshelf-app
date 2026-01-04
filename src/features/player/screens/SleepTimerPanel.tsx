/**
 * src/features/player/screens/SleepTimerPanel.tsx
 *
 * Full-screen sleep timer panel with circular pie selector.
 * Features: clock-style drag, END of chapter option, red fill.
 */

import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
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
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Circle, Path, G, Line } from 'react-native-svg';
import {
  ChevronLeft,
  ChevronDown,
  Settings,
} from 'lucide-react-native';

import { usePlayerStore } from '../stores/playerStore';
import { haptics } from '@/core/native/haptics';
import { scale, spacing } from '@/shared/theme';

// =============================================================================
// CONSTANTS
// =============================================================================

const CIRCLE_SIZE = scale(280);
const CIRCLE_RADIUS = CIRCLE_SIZE / 2;
const STROKE_WIDTH = scale(50);
const INNER_RADIUS = CIRCLE_RADIUS - STROKE_WIDTH / 2;

// Timer limits
const MIN_MINUTES = 1;
const MAX_MINUTES = 720; // 12 hours
const FULL_ROTATION_MINUTES = 60; // One full rotation = 60 minutes

// Tick positions (in minutes from 0)
const TICK_POSITIONS = [
  { minutes: 0, label: '0' },
  { minutes: 15, label: '15' },
  { minutes: 30, label: '30' },
  { minutes: 45, label: '45' },
  { minutes: 52, label: 'END', isEnd: true },
];

// Special value for "End of Chapter"
const END_OF_CHAPTER = -1;

// =============================================================================
// HELPER FUNCTIONS (Worklets for UI thread)
// =============================================================================

// Convert minutes to angle (0 at top, clockwise)
const minutesToAngle = (minutes: number): number => {
  'worklet';
  // 60 minutes = 360 degrees
  const normalizedMinutes = minutes % 60;
  return (normalizedMinutes / 60) * 360;
};

// Convert angle to minutes
const angleToMinutes = (angle: number): number => {
  'worklet';
  // Normalize angle to 0-360
  const normalizedAngle = ((angle % 360) + 360) % 360;
  return (normalizedAngle / 360) * 60;
};

// Convert touch coordinates to angle from center
const touchToAngle = (x: number, y: number, centerX: number, centerY: number): number => {
  'worklet';
  const dx = x - centerX;
  const dy = y - centerY;
  // atan2 gives angle from positive X axis, we want from negative Y (top)
  let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
  if (angle < 0) angle += 360;
  return angle;
};

// Find nearest snap point
const findNearestSnapMinutes = (minutes: number): number => {
  'worklet';
  const snapMinutes = [5, 10, 15, 20, 25, 30, 45, 60, 90, 120];
  const normalizedMinutes = minutes % 60;
  let closest = snapMinutes[0];
  let minDiff = Math.abs(normalizedMinutes - closest);

  for (let i = 0; i < snapMinutes.length; i++) {
    const point = snapMinutes[i];
    const normalizedPoint = point % 60;
    const diff = Math.abs(normalizedMinutes - normalizedPoint);
    if (diff < minDiff) {
      minDiff = diff;
      closest = point;
    }
  }

  // Only snap if within threshold
  const threshold = 2; // minutes
  return minDiff <= threshold ? closest : minutes;
};

// Format time for display
const formatTimeDisplay = (minutes: number | null): string => {
  if (minutes === null || minutes === 0) return 'OFF';
  if (minutes === END_OF_CHAPTER) return 'End of Chapter';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}`;
  if (mins === 0) return `${hours * 60}`;
  return `${hours * 60 + mins}`;
};

// Create arc path for SVG
const createArcPath = (
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string => {
  // Convert angles to radians, offsetting by -90 degrees (start at top)
  const startRad = ((startAngle - 90) * Math.PI) / 180;
  const endRad = ((endAngle - 90) * Math.PI) / 180;

  const startX = centerX + radius * Math.cos(startRad);
  const startY = centerY + radius * Math.sin(startRad);
  const endX = centerX + radius * Math.cos(endRad);
  const endY = centerY + radius * Math.sin(endRad);

  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
};

// =============================================================================
// COMPONENT
// =============================================================================

interface SleepTimerPanelProps {
  onClose: () => void;
  onBack?: () => void;
  onSettings?: () => void;
}

export function SleepTimerPanel({ onClose, onBack, onSettings }: SleepTimerPanelProps) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  // Player state
  const sleepTimer = usePlayerStore((s) => s.sleepTimer);
  const setSleepTimer = usePlayerStore((s) => s.setSleepTimer);
  const clearSleepTimer = usePlayerStore((s) => s.clearSleepTimer);

  // Local state
  const [isDragging, setIsDragging] = useState(false);
  // sleepTimer from store is in seconds, convert to minutes for display
  const [displayMinutes, setDisplayMinutes] = useState<number | null>(
    sleepTimer ? Math.ceil(sleepTimer / 60) : null
  );
  const [isEndOfChapter, setIsEndOfChapter] = useState(false);
  const [inputValue, setInputValue] = useState(formatTimeDisplay(displayMinutes));

  // Animated values
  const currentAngle = useSharedValue(
    sleepTimer ? minutesToAngle(Math.ceil(sleepTimer / 60)) : 0
  );
  const lastSnapAngle = useSharedValue(0);
  const totalRotations = useSharedValue(0);

  // Circle center position
  const circleCenter = CIRCLE_SIZE / 2;

  // Update display when sleep timer changes externally
  useEffect(() => {
    if (!isDragging && sleepTimer !== null) {
      const minutes = Math.ceil(sleepTimer / 60);
      setDisplayMinutes(minutes);
      setInputValue(formatTimeDisplay(minutes));
      currentAngle.value = minutesToAngle(minutes);
      totalRotations.value = Math.floor(minutes / 60);
    } else if (!isDragging && sleepTimer === null) {
      setDisplayMinutes(null);
      setInputValue('OFF');
      currentAngle.value = 0;
      totalRotations.value = 0;
    }
  }, [sleepTimer, isDragging]);

  // Calculate filled arc angle based on current selection
  const filledAngle = useMemo(() => {
    if (displayMinutes === null || displayMinutes === 0) return 0;
    if (isEndOfChapter) {
      // Show END position (around 52 minutes / ~312 degrees)
      return minutesToAngle(52);
    }
    // For multi-rotation (>60 min), show full circle with indicator
    return minutesToAngle(displayMinutes);
  }, [displayMinutes, isEndOfChapter]);

  // Apply timer (setSleepTimer takes minutes, converts to seconds internally)
  const applyTimer = useCallback((minutes: number | null, endOfChapter = false) => {
    if (minutes === null || minutes === 0) {
      clearSleepTimer();
      setDisplayMinutes(null);
      setInputValue('OFF');
    } else {
      const actualMinutes = endOfChapter ? 999 : minutes;
      setSleepTimer(actualMinutes);
      setDisplayMinutes(minutes);
      setInputValue(formatTimeDisplay(minutes));
    }
    setIsEndOfChapter(endOfChapter);
  }, [setSleepTimer, clearSleepTimer]);

  // Update input when slider changes
  const updateInputFromSlider = useCallback((minutes: number) => {
    setDisplayMinutes(minutes);
    setInputValue(formatTimeDisplay(minutes));
    setIsEndOfChapter(false);
  }, []);

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

  // Pan gesture handler
  const panGesture = Gesture.Pan()
    .onBegin((event) => {
      runOnJS(setIsDragging)(true);
      runOnJS(triggerLightHaptic)();

      // Calculate initial angle from touch position
      const angle = touchToAngle(
        event.x,
        event.y,
        circleCenter,
        circleCenter
      );
      currentAngle.value = angle;
    })
    .onUpdate((event) => {
      const angle = touchToAngle(
        event.x,
        event.y,
        circleCenter,
        circleCenter
      );

      // Detect rotation direction and count full rotations
      const angleDiff = angle - currentAngle.value;
      if (angleDiff > 180) {
        // Crossed from 360 to 0 (counter-clockwise)
        totalRotations.value = Math.max(0, totalRotations.value - 1);
      } else if (angleDiff < -180) {
        // Crossed from 0 to 360 (clockwise)
        totalRotations.value = Math.min(11, totalRotations.value + 1);
      }

      currentAngle.value = angle;

      // Calculate total minutes
      const baseMinutes = angleToMinutes(angle);
      const totalMinutes = Math.round(baseMinutes + totalRotations.value * 60);

      runOnJS(updateInputFromSlider)(totalMinutes);

      // Check for snap point crossing
      const snapped = findNearestSnapMinutes(totalMinutes);
      const snapAngle = minutesToAngle(snapped);
      if (Math.abs(snapAngle - lastSnapAngle.value) > 5) {
        lastSnapAngle.value = snapAngle;
        runOnJS(triggerSelectionHaptic)();
      }
    })
    .onEnd(() => {
      const baseMinutes = angleToMinutes(currentAngle.value);
      const totalMinutes = Math.round(baseMinutes + totalRotations.value * 60);
      const clampedMinutes = Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, totalMinutes));

      runOnJS(applyTimer)(clampedMinutes, false);
      runOnJS(triggerMediumHaptic)();
      runOnJS(setIsDragging)(false);
    });

  // Handle END of chapter tap
  const handleEndOfChapter = useCallback(() => {
    haptics.impact('medium');
    applyTimer(END_OF_CHAPTER, true);
    setInputValue('End of Chapter');
    currentAngle.value = minutesToAngle(52);
    totalRotations.value = 0;
  }, [applyTimer]);

  // Handle OFF
  const handleOff = useCallback(() => {
    haptics.impact('medium');
    applyTimer(null, false);
    currentAngle.value = 0;
    totalRotations.value = 0;
  }, [applyTimer]);

  // Handle editable time input
  const handleInputChange = useCallback((text: string) => {
    setInputValue(text);
  }, []);

  const handleInputSubmit = useCallback(() => {
    Keyboard.dismiss();
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      const clampedMinutes = Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, parsed));
      applyTimer(clampedMinutes, false);
      totalRotations.value = Math.floor(clampedMinutes / 60);
      currentAngle.value = minutesToAngle(clampedMinutes);
    } else if (inputValue.toLowerCase() === 'off' || inputValue === '0' || inputValue === '') {
      applyTimer(null, false);
      currentAngle.value = 0;
      totalRotations.value = 0;
    }
  }, [inputValue, applyTimer]);

  // Tick mark positions for rendering
  const tickMarks = useMemo(() => {
    return TICK_POSITIONS.map((tick) => {
      const angle = minutesToAngle(tick.minutes);
      const rad = ((angle - 90) * Math.PI) / 180;
      const outerRadius = CIRCLE_RADIUS - 8;
      const innerRadius = CIRCLE_RADIUS - STROKE_WIDTH + 8;
      const labelRadius = CIRCLE_RADIUS + scale(20);

      return {
        ...tick,
        x1: circleCenter + innerRadius * Math.cos(rad),
        y1: circleCenter + innerRadius * Math.sin(rad),
        x2: circleCenter + outerRadius * Math.cos(rad),
        y2: circleCenter + outerRadius * Math.sin(rad),
        labelX: circleCenter + labelRadius * Math.cos(rad),
        labelY: circleCenter + labelRadius * Math.sin(rad),
      };
    });
  }, [circleCenter]);

  // Display text for header
  const displayText = isEndOfChapter
    ? 'End of Chapter'
    : displayMinutes
      ? `${displayMinutes}m`
      : 'OFF';

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

      {/* Timer Display (Always Editable TextInput) */}
      <View style={styles.timerDisplay}>
        <View style={styles.editContainer}>
          <TextInput
            ref={inputRef}
            style={styles.timerInput}
            value={inputValue}
            onChangeText={handleInputChange}
            onSubmitEditing={handleInputSubmit}
            onBlur={handleInputSubmit}
            keyboardType="number-pad"
            returnKeyType="done"
            selectTextOnFocus
          />
          {!isEndOfChapter && displayMinutes !== null && (
            <Text style={styles.timerSuffix}>m</Text>
          )}
        </View>
      </View>

      {/* Circular Selector - Absolute positioned */}
      <View style={styles.circleContainer}>
        <GestureDetector gesture={panGesture}>
          <View style={[styles.circleWrapper, { width: CIRCLE_SIZE, height: CIRCLE_SIZE }]}>
            <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
              {/* Background track */}
              <Circle
                cx={circleCenter}
                cy={circleCenter}
                r={INNER_RADIUS}
                stroke="#CCCCCC"
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />

              {/* Filled arc - flat ends, not rounded */}
              {filledAngle > 0 && (
                <Path
                  d={createArcPath(circleCenter, circleCenter, INNER_RADIUS, 0, filledAngle)}
                  stroke="#E53935"
                  strokeWidth={STROKE_WIDTH}
                  strokeLinecap="butt"
                  fill="none"
                />
              )}

              {/* Tick marks */}
              {tickMarks.map((tick) => (
                <G key={tick.label}>
                  <Line
                    x1={tick.x1}
                    y1={tick.y1}
                    x2={tick.x2}
                    y2={tick.y2}
                    stroke="#666666"
                    strokeWidth={tick.isEnd ? 3 : 2}
                  />
                </G>
              ))}
            </Svg>

            {/* Labels positioned outside */}
            {tickMarks.map((tick) => (
              <TouchableOpacity
                key={tick.label}
                style={[
                  styles.tickLabel,
                  {
                    left: tick.labelX - scale(20),
                    top: tick.labelY - scale(12),
                  },
                  tick.isEnd && styles.endLabelButton,
                ]}
                onPress={() => {
                  if (tick.isEnd) {
                    handleEndOfChapter();
                  } else {
                    haptics.selection();
                    applyTimer(tick.minutes === 0 ? null : tick.minutes, false);
                  }
                }}
              >
                <Text
                  style={[
                    styles.tickLabelText,
                    tick.isEnd && styles.endLabelText,
                  ]}
                >
                  {tick.label}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Center content */}
            <View style={styles.centerContent}>
              <TouchableOpacity onPress={handleOff} style={styles.offButton}>
                <Text style={styles.offButtonText}>OFF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </GestureDetector>
      </View>

      {/* Label */}
      <Text style={[styles.label, { paddingBottom: insets.bottom + spacing.lg }]}>Sleep Timer</Text>
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
  timerDisplay: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    height: scale(80), // Fixed height to prevent layout shift
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerInput: {
    fontSize: scale(56),
    fontWeight: '300',
    color: '#1A1A1A',
    minWidth: scale(100),
    textAlign: 'center',
    padding: 0,
  },
  timerSuffix: {
    fontSize: scale(56),
    fontWeight: '300',
    color: '#1A1A1A',
  },
  circleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleWrapper: {
    position: 'relative',
  },
  tickLabel: {
    position: 'absolute',
    width: scale(40),
    height: scale(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  tickLabelText: {
    fontSize: scale(14),
    fontWeight: '500',
    color: '#666666',
  },
  endLabelButton: {
    backgroundColor: 'rgba(229, 57, 53, 0.15)',
    borderRadius: scale(8),
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    width: scale(50),
  },
  endLabelText: {
    color: '#E53935',
    fontWeight: '700',
  },
  centerContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: scale(20),
  },
  offButtonText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: '#1A1A1A',
  },
  label: {
    fontSize: scale(16),
    fontWeight: '500',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});

export default SleepTimerPanel;
