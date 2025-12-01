/**
 * src/features/home/components/CardActionsRow.tsx
 *
 * Action row below the continue listening card.
 * Layout: [View Series]              [Restart]
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LibraryItem } from '@/core/types';
import { usePlayerStore } from '@/features/player';
import { Icon } from '@/shared/components/Icon';
import { CARD_WIDTH } from './ContinueListeningCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDE_PADDING = (SCREEN_WIDTH - CARD_WIDTH) / 2;

interface CardActionsRowProps {
  book: LibraryItem | null;
}

export function CardActionsRow({ book }: CardActionsRowProps) {
  const navigation = useNavigation<any>();
  const { seekTo } = usePlayerStore();

  const handleViewSeries = () => {
    if (!book) return;

    // Get series name from book metadata
    const series = book.media?.metadata?.series;
    const seriesName = Array.isArray(series) && series.length > 0
      ? series[0].name
      : null;

    if (seriesName) {
      navigation.navigate('SeriesDetail', { seriesName });
    }
  };

  const handleRestart = async () => {
    if (!book) return;
    await seekTo(0);
  };

  // Check if book has a series
  const hasSeries = book?.media?.metadata?.series &&
    Array.isArray(book.media.metadata.series) &&
    book.media.metadata.series.length > 0;

  if (!book) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* View Series Button */}
      <TouchableOpacity
        style={[styles.button, !hasSeries && styles.buttonDisabled]}
        onPress={handleViewSeries}
        disabled={!hasSeries}
      >
        <Icon
          name="list-outline"
          size={18}
          color={hasSeries ? '#888888' : '#444444'}
          set="ionicons"
        />
        <Text style={[styles.label, !hasSeries && styles.labelDisabled]}>
          View Series
        </Text>
      </TouchableOpacity>

      {/* Restart Button */}
      <TouchableOpacity style={styles.button} onPress={handleRestart}>
        <Icon name="refresh-outline" size={18} color="#888888" set="ionicons" />
        <Text style={styles.label}>Restart</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SIDE_PADDING,
    marginTop: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  label: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '500',
  },
  labelDisabled: {
    color: '#444444',
  },
});

export default CardActionsRow;
