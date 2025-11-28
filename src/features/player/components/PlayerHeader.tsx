/**
 * src/features/player/components/PlayerHeader.tsx
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from '@/shared/components/Icon';
import { formatTime, getTitleFontSize } from '../utils';

interface PlayerHeaderProps {
  title: string;
  chapterTitle: string;
  position: number;
  duration: number;
  textColor: string;
  secondaryColor: string;
  onChapterPress: () => void;
  onClose: () => void;
}

export function PlayerHeader({
  title,
  chapterTitle,
  position,
  duration,
  textColor,
  secondaryColor,
  onChapterPress,
  onClose,
}: PlayerHeaderProps) {
  const titleStyle = getTitleFontSize(title);

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text 
          style={[
            styles.title, 
            { 
              color: textColor,
              fontSize: titleStyle.fontSize,
              lineHeight: titleStyle.lineHeight,
            }
          ]} 
          numberOfLines={2}
        >
          {title}
        </Text>
      </View>
      <View style={styles.headerCenter}>
        <TouchableOpacity 
          style={styles.chapterButton}
          onPress={onChapterPress}
        >
          <Text style={[styles.chapterLabel, { color: textColor }]}>{chapterTitle}</Text>
        </TouchableOpacity>
        <Text style={[styles.timeLabel, { color: secondaryColor }]}>{formatTime(position)}</Text>
        <Text style={[styles.timeLabel, { color: secondaryColor }]}>{formatTime(duration)}</Text>
      </View>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Icon name="chevron-down" size={24} color={textColor} set="ionicons" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
    marginHorizontal: -14,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 16,
  },
  headerCenter: {
    alignItems: 'flex-end',
    marginRight: 12,
    marginTop: 4,
  },
  closeButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
  },
  chapterLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  chapterButton: {
    marginBottom: 4,
  },
  timeLabel: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    lineHeight: 18,
  },
});
