// File: src/features/player/components/SleepTimer.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '../stores/playerStore';
import { Icon } from '@/shared/components/Icon';
import { theme } from '@/shared/theme';

const SLEEP_OPTIONS = [
  { label: '5 min', minutes: 5 },
  { label: '10 min', minutes: 10 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '60 min', minutes: 60 },
];

interface SleepTimerProps {
  visible: boolean;
  onClose: () => void;
}

export function SleepTimer({ visible, onClose }: SleepTimerProps) {
  const insets = useSafeAreaInsets();
  const { sleepTimer, setSleepTimer, clearSleepTimer } = usePlayerStore();

  const handleSelect = (minutes: number) => {
    setSleepTimer(minutes);
    onClose();
  };

  const handleEndOfChapter = () => {
    setSleepTimer(-1); // -1 = end of chapter
    onClose();
  };

  const handleClear = () => {
    clearSleepTimer();
    onClose();
  };

  const formatTimeRemaining = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
              <Text style={styles.title}>Sleep Timer</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="close" size={22} color={theme.colors.text.secondary} set="ionicons" />
              </TouchableOpacity>
            </View>
          </View>

          {sleepTimer !== null && (
            <View style={styles.activeTimer}>
              <Icon name="moon" size={20} color={theme.colors.primary[500]} set="ionicons" />
              <Text style={styles.activeTimerText}>
                {sleepTimer === -1 
                  ? 'End of chapter' 
                  : `${formatTimeRemaining(sleepTimer)} remaining`
                }
              </Text>
              <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.optionsGrid}>
            {SLEEP_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.minutes}
                style={styles.optionButton}
                onPress={() => handleSelect(option.minutes)}
                activeOpacity={0.7}
              >
                <Text style={styles.optionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.endOfChapterButton}
            onPress={handleEndOfChapter}
            activeOpacity={0.7}
          >
            <Icon name="bookmark-outline" size={18} color={theme.colors.text.primary} set="ionicons" />
            <Text style={styles.endOfChapterText}>End of chapter</Text>
          </TouchableOpacity>
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
  activeTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[50],
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.radius.medium,
    marginBottom: theme.spacing[3],
    gap: theme.spacing[2],
  },
  activeTimerText: {
    ...theme.textStyles.bodySmall,
    color: theme.colors.primary[600],
    flex: 1,
  },
  clearButton: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
  },
  clearButtonText: {
    ...theme.textStyles.bodySmall,
    color: theme.colors.primary[500],
    fontWeight: '600',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[3],
  },
  optionButton: {
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.radius.medium,
    backgroundColor: theme.colors.neutral[100],
    minWidth: 80,
    alignItems: 'center',
  },
  optionText: {
    ...theme.textStyles.body,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  endOfChapterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing[3],
    borderRadius: theme.radius.medium,
    backgroundColor: theme.colors.neutral[100],
    gap: theme.spacing[2],
    marginBottom: theme.spacing[2],
  },
  endOfChapterText: {
    ...theme.textStyles.body,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
});