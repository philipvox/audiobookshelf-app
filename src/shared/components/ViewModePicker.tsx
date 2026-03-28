/**
 * src/shared/components/ViewModePicker.tsx
 *
 * View mode picker with shelf/grid/list icons.
 * Short tap cycles modes, long press reveals animated capsule overlay.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  GestureResponderEvent,
  Animated,
} from 'react-native';
import Svg, { Rect, Circle } from 'react-native-svg';
import { haptics } from '@/core/native/haptics';
import { scale } from '@/shared/theme';

// =============================================================================
// TYPES
// =============================================================================

export type ViewMode = 'shelf' | 'grid' | 'list';

// =============================================================================
// ICONS
// =============================================================================

interface IconProps {
  color?: string;
}

const ShelfIcon = ({ color = '#000' }: IconProps) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill={color}>
    <Rect x={3} y={4} width={4} height={14} rx={1} />
    <Rect x={9} y={6} width={4} height={12} rx={1} />
    <Rect x={15} y={3} width={4} height={15} rx={1} />
    <Rect x={2} y={19} width={20} height={2} rx={0.5} />
  </Svg>
);

const ListIcon = ({ color = '#000' }: IconProps) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill={color}>
    <Circle cx={3} cy={6} r={1.5} />
    <Circle cx={3} cy={12} r={1.5} />
    <Circle cx={3} cy={18} r={1.5} />
    <Rect x={7} y={5} width={14} height={2} rx={1} />
    <Rect x={7} y={11} width={14} height={2} rx={1} />
    <Rect x={7} y={17} width={14} height={2} rx={1} />
  </Svg>
);

const GridIcon = ({ color = '#000' }: IconProps) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill={color}>
    <Rect x={3} y={3} width={8} height={8} rx={1.5} />
    <Rect x={13} y={3} width={8} height={8} rx={1.5} />
    <Rect x={3} y={13} width={8} height={8} rx={1.5} />
    <Rect x={13} y={13} width={8} height={8} rx={1.5} />
  </Svg>
);

// =============================================================================
// CONSTANTS
// =============================================================================

const VIEW_MODES: ViewMode[] = ['shelf', 'grid', 'list'];
const BUTTON_SIZE = scale(36);
const INDICATOR_SIZE = scale(26);
const CAPSULE_PADDING = scale(4);
const CELL_SIZE = INDICATOR_SIZE + scale(4);
const CAPSULE_WIDTH = INDICATOR_SIZE + CAPSULE_PADDING * 2;
const CAPSULE_HEIGHT = CELL_SIZE * VIEW_MODES.length + CAPSULE_PADDING * 2;
const CAPSULE_RADIUS = CAPSULE_WIDTH / 2;
const CAPSULE_GAP = scale(4);
const INDICATOR_BASE_TOP = CAPSULE_PADDING + (CELL_SIZE - INDICATOR_SIZE) / 2;

// =============================================================================
// COMPONENT
// =============================================================================

export interface ViewModePickerProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  iconColor: string;
  activeIconColor: string;
  inactiveIconColor: string;
  borderColor: string;
  indicatorColor: string;
  capsuleBg: string;
}

export function ViewModePicker({ mode, onModeChange, iconColor, activeIconColor, inactiveIconColor, borderColor, indicatorColor, capsuleBg }: ViewModePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<View>(null);
  const containerLayout = useRef({ y: 0 });
  const didOpen = useRef(false);
  const highlightedRef = useRef(-1);

  const indicatorTranslateY = useRef(new Animated.Value(0)).current;

  const getModeIcon = (m: ViewMode, color: string) => {
    switch (m) {
      case 'shelf': return <ShelfIcon color={color} />;
      case 'grid': return <GridIcon color={color} />;
      case 'list': return <ListIcon color={color} />;
    }
  };

  const getOptionIndex = (pageY: number) => {
    const capsuleAbsTop = containerLayout.current.y + BUTTON_SIZE + CAPSULE_GAP;
    const relativeY = pageY - capsuleAbsTop - CAPSULE_PADDING;
    const index = Math.floor(relativeY / CELL_SIZE);
    return index >= 0 && index < VIEW_MODES.length ? index : -1;
  };

  const animateIndicator = useCallback((toIndex: number) => {
    Animated.spring(indicatorTranslateY, {
      toValue: toIndex * CELL_SIZE,
      useNativeDriver: true,
      tension: 300,
      friction: 20,
    }).start();
  }, [indicatorTranslateY]);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const handlePressIn = useCallback((_e: GestureResponderEvent) => {
    didOpen.current = false;
    containerRef.current?.measureInWindow((_x, y) => {
      containerLayout.current = { y };
    });
    longPressTimer.current = setTimeout(() => {
      didOpen.current = true;
      const modeIdx = VIEW_MODES.indexOf(mode);
      indicatorTranslateY.setValue(modeIdx * CELL_SIZE);
      highlightedRef.current = modeIdx;
      setHighlightedIndex(modeIdx);
      setIsOpen(true);
      haptics.selection();
    }, 300);
  }, [mode, indicatorTranslateY]);

  const handleMove = useCallback((e: GestureResponderEvent) => {
    if (!didOpen.current) return;
    const newIndex = getOptionIndex(e.nativeEvent.pageY);
    if (newIndex >= 0 && newIndex !== highlightedRef.current) {
      highlightedRef.current = newIndex;
      haptics.selection();
      animateIndicator(newIndex);
      setHighlightedIndex(newIndex);
    }
  }, [animateIndicator]);

  const handlePressOut = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (!didOpen.current) {
      const currentIndex = VIEW_MODES.indexOf(mode);
      const nextMode = VIEW_MODES[(currentIndex + 1) % VIEW_MODES.length];
      onModeChange(nextMode);
      return;
    }

    const idx = highlightedRef.current;
    if (idx >= 0) {
      const selectedMode = VIEW_MODES[idx];
      if (selectedMode !== mode) {
        onModeChange(selectedMode);
      }
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
    highlightedRef.current = -1;
    didOpen.current = false;
  }, [mode, onModeChange]);

  return (
    <View
      ref={containerRef}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={handlePressIn}
      onResponderMove={handleMove}
      onResponderRelease={handlePressOut}
      onResponderTerminate={handlePressOut}
      style={styles.wrapper}
    >
      <View style={[styles.button, { borderColor, opacity: isOpen ? 0 : 1 }]}>
        {getModeIcon(mode, iconColor)}
      </View>

      {isOpen && (
        <View style={[styles.capsule, {
          backgroundColor: capsuleBg,
          borderColor,
        }]}>
          <Animated.View style={[
            styles.indicator,
            {
              backgroundColor: indicatorColor,
              transform: [{ translateY: indicatorTranslateY }],
            },
          ]} />
          {VIEW_MODES.map((m) => {
            const isActive = (highlightedIndex >= 0 ? VIEW_MODES[highlightedIndex] : mode) === m;
            return (
              <View key={m} style={styles.cell}>
                {getModeIcon(m, isActive ? activeIconColor : inactiveIconColor)}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 100,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsule: {
    position: 'absolute',
    top: BUTTON_SIZE + CAPSULE_GAP,
    right: 0,
    width: CAPSULE_WIDTH,
    height: CAPSULE_HEIGHT,
    borderRadius: CAPSULE_RADIUS,
    borderWidth: 1,
    padding: CAPSULE_PADDING,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  indicator: {
    position: 'absolute',
    top: INDICATOR_BASE_TOP,
    width: INDICATOR_SIZE,
    height: INDICATOR_SIZE,
    borderRadius: INDICATOR_SIZE / 2,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
