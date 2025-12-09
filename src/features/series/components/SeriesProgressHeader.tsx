/**
 * src/features/series/components/SeriesProgressHeader.tsx
 *
 * Series progress header showing completion status and next book.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LibraryItem } from '@/core/types';
import { useCoverUrl } from '@/core/cache';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

const ACCENT = '#c1f40c';

interface SeriesProgressHeaderProps {
  books: LibraryItem[];
  completedCount: number;
  inProgressCount: number;
  nextBook: LibraryItem | null;
  onNextBookPress: (book: LibraryItem) => void;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Progress bar segment component
function ProgressSegment({
  status
}: {
  status: 'completed' | 'in_progress' | 'not_started'
}) {
  return (
    <View
      style={[
        styles.segment,
        status === 'completed' && styles.segmentCompleted,
        status === 'in_progress' && styles.segmentInProgress,
        status === 'not_started' && styles.segmentNotStarted,
      ]}
    />
  );
}

export function SeriesProgressHeader({
  books,
  completedCount,
  inProgressCount,
  nextBook,
  onNextBookPress,
}: SeriesProgressHeaderProps) {
  const totalBooks = books.length;
  const hasProgress = completedCount > 0 || inProgressCount > 0;
  const nextBookCoverUrl = useCoverUrl(nextBook?.id || '');
  const nextBookDuration = nextBook?.media?.duration || 0;

  // Get sequence number for next book
  const getSequence = (item: LibraryItem): number => {
    const metadata = (item.media?.metadata as any) || {};
    const seriesName = metadata.seriesName || '';
    const match = seriesName.match(/#([\d.]+)/);
    return match ? parseFloat(match[1]) : 999;
  };

  // If no progress, show "Ready to start" message
  if (!hasProgress) {
    // Calculate total duration
    const totalDuration = books.reduce((sum, book) => {
      return sum + (book.media?.duration || 0);
    }, 0);

    return (
      <View style={styles.container}>
        <View style={styles.readyState}>
          <Ionicons name="book-outline" size={scale(24)} color="rgba(255,255,255,0.5)" />
          <Text style={styles.readyText}>Ready to start this series?</Text>
          <Text style={styles.readySubtext}>
            {totalBooks} books · ~{formatDuration(totalDuration)} total
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>YOUR PROGRESS</Text>

      {/* Segmented Progress Bar */}
      <View style={styles.progressBar}>
        {books.map((book, index) => {
          const progress = (book as any).userMediaProgress?.progress || 0;
          let status: 'completed' | 'in_progress' | 'not_started';
          if (progress >= 0.95) {
            status = 'completed';
          } else if (progress > 0) {
            status = 'in_progress';
          } else {
            status = 'not_started';
          }
          return <ProgressSegment key={book.id} status={status} />;
        })}
      </View>

      {/* Progress Text */}
      <Text style={styles.progressText}>
        {completedCount} of {totalBooks} complete
        {inProgressCount > 0 && ` · ${inProgressCount} in progress`}
      </Text>

      {/* Up Next Section */}
      {nextBook && (
        <TouchableOpacity
          style={styles.upNextContainer}
          onPress={() => onNextBookPress(nextBook)}
          activeOpacity={0.7}
        >
          <Image
            source={nextBookCoverUrl}
            style={styles.upNextCover}
            contentFit="cover"
          />
          <View style={styles.upNextInfo}>
            <Text style={styles.upNextLabel}>Up next</Text>
            <Text style={styles.upNextTitle} numberOfLines={1}>
              {(nextBook.media?.metadata as any)?.title || 'Unknown'}
            </Text>
            <Text style={styles.upNextMeta}>
              Book {getSequence(nextBook)} · {formatDuration(nextBookDuration)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={scale(20)} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: scale(16),
    marginBottom: scale(16),
    padding: scale(16),
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: scale(12),
  },
  sectionLabel: {
    fontSize: scale(10),
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    marginBottom: scale(12),
  },
  progressBar: {
    flexDirection: 'row',
    height: scale(6),
    gap: scale(2),
    marginBottom: scale(10),
  },
  segment: {
    flex: 1,
    borderRadius: scale(3),
  },
  segmentCompleted: {
    backgroundColor: ACCENT,
  },
  segmentInProgress: {
    backgroundColor: 'rgba(193,244,12,0.5)',
  },
  segmentNotStarted: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  progressText: {
    fontSize: scale(13),
    color: 'rgba(255,255,255,0.7)',
    marginBottom: scale(16),
  },
  upNextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: scale(10),
    borderRadius: scale(10),
    marginTop: scale(4),
  },
  upNextCover: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(6),
    backgroundColor: '#262626',
  },
  upNextInfo: {
    flex: 1,
    marginLeft: scale(12),
  },
  upNextLabel: {
    fontSize: scale(10),
    fontWeight: '600',
    color: ACCENT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: scale(2),
  },
  upNextTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: '#fff',
    marginBottom: scale(2),
  },
  upNextMeta: {
    fontSize: scale(12),
    color: 'rgba(255,255,255,0.5)',
  },
  readyState: {
    alignItems: 'center',
    paddingVertical: scale(8),
  },
  readyText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: '#fff',
    marginTop: scale(8),
  },
  readySubtext: {
    fontSize: scale(12),
    color: 'rgba(255,255,255,0.5)',
    marginTop: scale(4),
  },
});
