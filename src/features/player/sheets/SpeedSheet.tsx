/**
 * src/features/player/sheets/SpeedSheet.tsx
 *
 * Unified Playback Speed bottom sheet component.
 * Use this component from any screen to control playback speed.
 * All state is managed via playerStore.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../stores/playerStore';
import { haptics } from '@/core/native/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ACCENT_COLOR = '#F4B60C';

// =============================================================================
// CONSTANTS
// =============================================================================

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

// =============================================================================
// TYPES
// =============================================================================

interface SpeedSheetProps {
  visible: boolean;
  onClose: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function SpeedSheet({ visible, onClose }: SpeedSheetProps) {
  const insets = useSafeAreaInsets();

  // Player store state
  const playbackRate = usePlayerStore((s) => s.playbackRate);
  const setPlaybackRate = usePlayerStore((s) => s.setPlaybackRate);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleSpeedSelect = useCallback((speed: number) => {
    haptics.selection();
    setPlaybackRate(speed);
    onClose();
  }, [setPlaybackRate, onClose]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Playback Speed</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Current Speed Display */}
          <Text style={styles.currentSpeed}>{playbackRate}x</Text>

          {/* Speed Options Grid */}
          <View style={styles.optionsGrid}>
            {SPEED_OPTIONS.map((speed) => {
              const isActive = Math.abs(playbackRate - speed) < 0.01;
              return (
                <TouchableOpacity
                  key={speed}
                  style={[
                    styles.optionButton,
                    isActive && styles.optionButtonActive,
                  ]}
                  onPress={() => handleSpeedSelect(speed)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.optionText,
                    isActive && styles.optionTextActive,
                  ]}>
                    {speed}x
                  </Text>
                  {speed === 1 && (
                    <Text style={[
                      styles.optionLabel,
                      isActive && styles.optionLabelActive,
                    ]}>
                      Normal
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Reset to 1x Button */}
          {playbackRate !== 1 && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => handleSpeedSelect(1)}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh-outline" size={18} color="#FFF" />
              <Text style={styles.resetButtonText}>Reset to Normal</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentSpeed: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  optionButton: {
    width: (SCREEN_WIDTH - 80) / 3,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: ACCENT_COLOR,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  optionTextActive: {
    color: '#000',
  },
  optionLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  optionLabelActive: {
    color: 'rgba(0,0,0,0.5)',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default SpeedSheet;
