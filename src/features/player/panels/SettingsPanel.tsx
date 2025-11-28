/**
 * src/features/player/panels/SettingsPanel.tsx
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from '@/shared/components/Icon';

interface SettingsPanelProps {
  controlMode: 'rewind' | 'chapter';
  progressMode: 'bar' | 'chapters';
  onControlModeChange: (mode: 'rewind' | 'chapter') => void;
  onProgressModeChange: (mode: 'bar' | 'chapters') => void;
  onViewChapters: () => void;
  onViewDetails: () => void;
  isLight: boolean;
}

export function SettingsPanel({
  controlMode,
  progressMode,
  onControlModeChange,
  onProgressModeChange,
  onViewChapters,
  onViewDetails,
  isLight,
}: SettingsPanelProps) {
  const textColor = isLight ? '#fff' : '#000';
  const secondaryColor = isLight ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
  const buttonBg = isLight ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
  const activeBg = isLight ? '#fff' : '#000';
  const activeText = isLight ? '#000' : '#fff';

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: textColor }]}>Settings</Text>
      
      {/* Control Mode Toggle */}
      <View style={styles.settingRow}>
        <Text style={[styles.settingLabel, { color: secondaryColor }]}>
          Control Buttons
        </Text>
        <View style={styles.settingToggle}>
          <TouchableOpacity
            style={[
              styles.settingOption,
              { backgroundColor: controlMode === 'rewind' ? activeBg : 'transparent' }
            ]}
            onPress={() => onControlModeChange('rewind')}
          >
            <Icon 
              name="play-back" 
              size={18} 
              color={controlMode === 'rewind' ? activeText : textColor} 
              set="ionicons" 
            />
            <Text style={[
              styles.settingOptionText,
              { color: controlMode === 'rewind' ? activeText : textColor }
            ]}>
              Rewind
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.settingOption,
              { backgroundColor: controlMode === 'chapter' ? activeBg : 'transparent' }
            ]}
            onPress={() => onControlModeChange('chapter')}
          >
            <Icon 
              name="play-skip-forward" 
              size={18} 
              color={controlMode === 'chapter' ? activeText : textColor} 
              set="ionicons" 
            />
            <Text style={[
              styles.settingOptionText,
              { color: controlMode === 'chapter' ? activeText : textColor }
            ]}>
              Chapter
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress Mode Toggle */}
      <View style={styles.settingRow}>
        <Text style={[styles.settingLabel, { color: secondaryColor }]}>
          Progress Display
        </Text>
        <View style={styles.settingToggle}>
          <TouchableOpacity
            style={[
              styles.settingOption,
              { backgroundColor: progressMode === 'bar' ? activeBg : 'transparent' }
            ]}
            onPress={() => onProgressModeChange('bar')}
          >
            <Icon 
              name="book" 
              size={18} 
              color={progressMode === 'bar' ? activeText : textColor} 
              set="ionicons" 
            />
            <Text style={[
              styles.settingOptionText,
              { color: progressMode === 'bar' ? activeText : textColor }
            ]}>
              Book
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.settingOption,
              { backgroundColor: progressMode === 'chapters' ? activeBg : 'transparent' }
            ]}
            onPress={() => onProgressModeChange('chapters')}
          >
            <Icon 
              name="bookmark" 
              size={18} 
              color={progressMode === 'chapters' ? activeText : textColor} 
              set="ionicons" 
            />
            <Text style={[
              styles.settingOptionText,
              { color: progressMode === 'chapters' ? activeText : textColor }
            ]}>
              Chapter
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Chapters List Button */}
      <TouchableOpacity
        style={[styles.settingButton, { backgroundColor: buttonBg }]}
        onPress={onViewChapters}
      >
        <Icon name="list" size={20} color={textColor} set="ionicons" />
        <Text style={[styles.settingButtonText, { color: textColor }]}>
          View Chapters
        </Text>
        <Icon name="chevron-forward" size={20} color={secondaryColor} set="ionicons" />
      </TouchableOpacity>

      {/* Book Details Button */}
      <TouchableOpacity
        style={[styles.settingButton, { backgroundColor: buttonBg }]}
        onPress={onViewDetails}
      >
        <Icon name="book" size={20} color={textColor} set="ionicons" />
        <Text style={[styles.settingButtonText, { color: textColor }]}>
          Book Details
        </Text>
        <Icon name="chevron-forward" size={20} color={secondaryColor} set="ionicons" />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
  },
  content: {
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  settingRow: {
    marginBottom: 24,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    gap: 8,
  },
  settingOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  settingOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  settingButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
});
