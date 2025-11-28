/**
 * src/features/player/panels/DetailsPanel.tsx
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { formatTime } from '../utils';
import type { LibraryItem } from '@/core/api';

interface DetailsPanelProps {
  book: LibraryItem;
  title: string;
  duration: number;
  chaptersCount: number;
  isLight: boolean;
}

export function DetailsPanel({ book, title, duration, chaptersCount, isLight }: DetailsPanelProps) {
  const textColor = isLight ? '#fff' : '#000';
  const secondaryColor = isLight ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const descColor = isLight ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)';

  return (
    <ScrollView 
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: textColor }]}>
        {title}
      </Text>
      
      {book?.media?.metadata?.authorName && (
        <View style={styles.row}>
          <Text style={[styles.label, { color: secondaryColor }]}>Author</Text>
          <Text style={[styles.value, { color: textColor }]}>
            {book.media.metadata.authorName}
          </Text>
        </View>
      )}

      {book?.media?.metadata?.narratorName && (
        <View style={styles.row}>
          <Text style={[styles.label, { color: secondaryColor }]}>Narrator</Text>
          <Text style={[styles.value, { color: textColor }]}>
            {book.media.metadata.narratorName.replace('Narrated by: ', '')}
          </Text>
        </View>
      )}

      {book?.media?.metadata?.seriesName && (
        <View style={styles.row}>
          <Text style={[styles.label, { color: secondaryColor }]}>Series</Text>
          <Text style={[styles.value, { color: textColor }]}>
            {book.media.metadata.seriesName}
          </Text>
        </View>
      )}

      <View style={styles.row}>
        <Text style={[styles.label, { color: secondaryColor }]}>Duration</Text>
        <Text style={[styles.value, { color: textColor }]}>{formatTime(duration)}</Text>
      </View>

      <View style={styles.row}>
        <Text style={[styles.label, { color: secondaryColor }]}>Chapters</Text>
        <Text style={[styles.value, { color: textColor }]}>{chaptersCount}</Text>
      </View>

      {book?.media?.metadata?.description && (
        <View style={[styles.row, { marginTop: 12 }]}>
          <Text style={[styles.label, { color: secondaryColor }]}>Description</Text>
          <Text style={[styles.description, { color: descColor }]} numberOfLines={8}>
            {book.media.metadata.description}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    marginTop: 24,
  },
  content: {
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  row: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
});
