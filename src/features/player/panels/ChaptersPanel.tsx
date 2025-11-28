/**
 * src/features/player/panels/ChaptersPanel.tsx
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from '@/shared/components/Icon';
import { formatTime } from '../utils';

interface Chapter {
  title: string;
  start: number;
  end: number;
}

interface ChaptersPanelProps {
  chapters: Chapter[];
  currentChapter: Chapter | undefined;
  onChapterSelect: (start: number) => void;
  isLight: boolean;
}

export function ChaptersPanel({ chapters, currentChapter, onChapterSelect, isLight }: ChaptersPanelProps) {
  const textColor = isLight ? '#fff' : '#000';
  const secondaryColor = isLight ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
  const activeBg = isLight ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: textColor }]}>Chapters</Text>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {chapters.map((chapter, idx) => {
          const isCurrentChapter = currentChapter === chapter;
          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.chapterItem,
                { backgroundColor: isCurrentChapter ? activeBg : 'transparent' }
              ]}
              onPress={() => onChapterSelect(chapter.start)}
            >
              <Text style={[styles.chapterNumber, { color: secondaryColor }]}>
                {idx + 1}
              </Text>
              <View style={styles.chapterInfo}>
                <Text 
                  style={[styles.chapterName, { color: textColor }]} 
                  numberOfLines={1}
                >
                  {chapter.title || `Chapter ${idx + 1}`}
                </Text>
                <Text style={[styles.chapterTime, { color: secondaryColor }]}>
                  {formatTime(chapter.start)}
                </Text>
              </View>
              {isCurrentChapter && (
                <Icon name="volume-high" size={16} color={textColor} set="ionicons" />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 12,
  },
  chapterNumber: {
    fontSize: 14,
    fontWeight: '600',
    width: 24,
    textAlign: 'center',
  },
  chapterInfo: {
    flex: 1,
  },
  chapterName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  chapterTime: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
});
