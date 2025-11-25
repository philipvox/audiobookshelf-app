// File: src/features/player/components/SpeedSelector.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '../stores/playerStore';
import { Icon } from '@/shared/components/Icon';
import { theme } from '@/shared/theme';

const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

interface SpeedSelectorProps {
  visible: boolean;
  onClose: () => void;
}

export function SpeedSelector({ visible, onClose }: SpeedSelectorProps) {
  const insets = useSafeAreaInsets();
  const { playbackRate, setPlaybackRate } = usePlayerStore();

  const handleSelect = async (speed: number) => {
    await setPlaybackRate(speed);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismissArea} onPress={onClose} activeOpacity={1} />
        
        <View style={[styles.sheet, { paddingBottom: insets.bottom + theme.spacing[2] }]}>
          <View style={styles.header}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <Text style={styles.title}>Playback Speed</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="close" size={22} color={theme.colors.text.secondary} set="ionicons" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.speedGrid}>
            {SPEEDS.map((speed) => {
              const isActive = playbackRate === speed;
              return (
                <TouchableOpacity
                  key={speed}
                  style={[styles.speedButton, isActive && styles.speedButtonActive]}
                  onPress={() => handleSelect(speed)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.speedText, isActive && styles.speedTextActive]}>
                    {speed}×
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: theme.colors.background.primary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: theme.spacing[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
  },
  header: {
    alignItems: 'center',
    paddingTop: theme.spacing[2],
    paddingBottom: theme.spacing[3],
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.neutral[300],
    borderRadius: 2,
    marginBottom: theme.spacing[2],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  title: {
    ...theme.textStyles.body,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  speedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
    paddingBottom: theme.spacing[2],
  },
  speedButton: {
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.radius.medium,
    backgroundColor: theme.colors.neutral[100],
    minWidth: 70,
    alignItems: 'center',
  },
  speedButtonActive: {
    backgroundColor: theme.colors.primary[500],
  },
  speedText: {
    ...theme.textStyles.body,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  speedTextActive: {
    color: '#FFFFFF',
  },
});