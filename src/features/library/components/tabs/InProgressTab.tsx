/**
 * src/features/library/components/tabs/InProgressTab.tsx
 *
 * In Progress tab content for MyLibraryScreen.
 * Shows continue listening hero card and in-progress books.
 *
 * Uses FlatList for proper virtualization - only renders visible items.
 * Hero card and series sections are rendered as ListHeaderComponent
 * and ListFooterComponent.
 */

import React, { useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Play } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SectionHeader } from '@/shared/components/SectionHeader';
import { LibraryEmptyState } from '../LibraryEmptyState';
import { FannedSeriesCard } from '../FannedSeriesCard';
import { BookRow } from '../BookRow';
import { apiClient } from '@/core/api';
import { useLibraryCache } from '@/core/cache';
import { scale, useTheme } from '@/shared/theme';
import { SCREEN_BOTTOM_PADDING } from '@/constants/layout';
import { EnrichedBook, formatTimeRemaining, FannedSeriesCardData } from '../../types';

interface InProgressTabProps {
  books: EnrichedBook[];
  onBookPress: (bookId: string) => void;
  onBookPlay: (book: EnrichedBook) => void;
  onResumeBook: (book: EnrichedBook) => void;
  onSeriesPress: (seriesName: string) => void;
  isMarkedFinished: (bookId: string) => boolean;
  onBrowse: () => void;
  // Refresh control props passed from parent
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function InProgressTab({
  books,
  onBookPress,
  onBookPlay,
  onResumeBook,
  onSeriesPress,
  isMarkedFinished,
  onBrowse,
  refreshing = false,
  onRefresh,
}: InProgressTabProps) {
  const { colors } = useTheme();
  const { getSeries } = useLibraryCache();
  const insets = useSafeAreaInsets();

  // Books come from Continue Listening API - already filtered for in-progress
  // Just sort by most recently played
  const sortedItems = useMemo(() => {
    return [...books].sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0));
  }, [books]);

  // Group in-progress items by series (must be before early return to satisfy Rules of Hooks)
  const inProgressSeriesData = useMemo<FannedSeriesCardData[]>(() => {
    const seriesMap = new Map<string, EnrichedBook[]>();
    for (const book of sortedItems) {
      if (book.seriesName) {
        const existing = seriesMap.get(book.seriesName) || [];
        existing.push(book);
        seriesMap.set(book.seriesName, existing);
      }
    }

    return Array.from(seriesMap.entries())
      .filter(([_, bks]) => bks.length >= 1)
      .map(([name, bks]) => {
        const seriesInfo = getSeries(name);
        return {
          name,
          books: bks.sort((a, b) => (a.sequence || 999) - (b.sequence || 999)),
          bookCount: seriesInfo?.books?.length || bks.length,
        };
      });
  }, [sortedItems, getSeries]);

  const heroItem = sortedItems[0];
  const otherItems = sortedItems.slice(1);

  // Memoized render function for FlatList
  const renderItem = useCallback(({ item: book }: { item: EnrichedBook }) => (
    <BookRow
      book={book}
      onPress={() => onBookPress(book.id)}
      onPlay={() => onBookPlay(book)}
      isMarkedFinished={isMarkedFinished(book.id)}
    />
  ), [onBookPress, onBookPlay, isMarkedFinished]);

  const keyExtractor = useCallback((item: EnrichedBook) => item.id, []);

  // Header: hero card + "More In Progress" section header
  const ListHeader = useCallback(() => (
    <View>
      {/* Hero Continue Listening Card */}
      {heroItem && (
        <View style={styles.heroSection}>
          <TouchableOpacity
            style={styles.heroCard}
            onPress={() => onResumeBook(heroItem)}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel={`Continue listening to ${heroItem.title} by ${heroItem.author}, ${formatTimeRemaining(heroItem.duration * (1 - heroItem.progress))} remaining`}
          >
            <Image
              source={apiClient.getItemCoverUrl(heroItem.id, { width: 400, height: 400 })}
              style={styles.heroCover}
              contentFit="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.9)']}
              style={styles.heroGradient}
            />
            <View style={styles.heroContent}>
              <Text style={styles.heroLabel}>Continue Listening</Text>
              <Text style={styles.heroTitle} numberOfLines={2}>{heroItem.title}</Text>
              <Text style={styles.heroAuthor}>{heroItem.author}</Text>
              <View style={styles.heroProgressContainer}>
                <View style={styles.heroProgressBar}>
                  <View style={[styles.heroProgressFill, { width: `${Math.round(heroItem.progress * 100)}%` }]} />
                </View>
                <Text style={styles.heroProgressText}>
                  {formatTimeRemaining(heroItem.duration * (1 - heroItem.progress))}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.heroPlayButton, { backgroundColor: colors.background.primary }]}
              onPress={() => onResumeBook(heroItem)}
              accessibilityRole="button"
              accessibilityLabel={`Play ${heroItem.title}`}
            >
              <Play size={scale(28)} color={colors.text.primary} fill={colors.text.primary} strokeWidth={0} />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      )}

      {/* Section header for remaining items */}
      {otherItems.length > 0 && (
        <SectionHeader title={`More In Progress (${otherItems.length})`} showViewAll={false} />
      )}
    </View>
  ), [heroItem, otherItems.length, onResumeBook, colors.background.primary, colors.text.primary]);

  // Footer: in-progress series
  const ListFooter = useCallback(() => (
    <View>
      {inProgressSeriesData.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title={`Series In Progress (${inProgressSeriesData.length})`} showViewAll={false} />
          <View style={styles.fannedSeriesGrid}>
            {inProgressSeriesData.map((series) => (
              <FannedSeriesCard
                key={series.name}
                series={series}
                onPress={() => onSeriesPress(series.name)}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  ), [inProgressSeriesData, onSeriesPress]);

  if (sortedItems.length === 0) {
    return <LibraryEmptyState tab="in-progress" onAction={onBrowse} />;
  }

  return (
    <FlatList
      data={otherItems}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeader}
      ListFooterComponent={ListFooter}
      // Performance optimizations
      removeClippedSubviews={Platform.OS === 'android'}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      windowSize={5}
      // Pull to refresh
      refreshing={refreshing}
      onRefresh={onRefresh}
      // Content styling
      contentContainerStyle={[
        styles.listContent,
        { paddingBottom: SCREEN_BOTTOM_PADDING + insets.bottom },
      ]}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: scale(24),
  },
  fannedSeriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: scale(16),
    gap: scale(12),
  },
  listContent: {
    flexGrow: 1,
  },
  // Hero card styles
  heroSection: {
    paddingHorizontal: scale(20),
    marginBottom: scale(24),
  },
  heroCard: {
    height: scale(200),
    borderRadius: scale(16),
    overflow: 'hidden',
    position: 'relative',
  },
  heroCover: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: scale(16),
  },
  heroLabel: {
    fontSize: scale(12),
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: scale(4),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: scale(20),
    fontWeight: '700',
    color: '#fff',
    marginBottom: scale(4),
  },
  heroAuthor: {
    fontSize: scale(14),
    color: 'rgba(255,255,255,0.8)',
    marginBottom: scale(12),
  },
  heroProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  heroProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    backgroundColor: '#fff',
  },
  heroProgressText: {
    fontSize: scale(12),
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  heroPlayButton: {
    position: 'absolute',
    top: scale(16),
    right: scale(16),
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default InProgressTab;
