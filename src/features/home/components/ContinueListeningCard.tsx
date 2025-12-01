/**
 * src/features/home/components/ContinueListeningCard.tsx
 *
 * Vertical card layout with full-bleed cover and metadata section.
 * Used in the continue listening carousel.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { LibraryItem } from '@/core/types';
import { apiClient } from '@/core/api';
import { useMyLibraryStore } from '@/features/library/stores/myLibraryStore';
import { Icon } from '@/shared/components/Icon';
import { getTitle } from '@/shared/utils/metadata';
import { autoDownloadService, DownloadStatus } from '@/features/downloads';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Card dimensions
export const CARD_WIDTH = SCREEN_WIDTH * 0.85;
export const CARD_HEIGHT = 500;
export const CARD_GAP = 16;
const COVER_HEIGHT_RATIO = 0.70; // 70% for cover, 30% for metadata
const CARD_RADIUS = 8;

interface ContinueListeningCardProps {
  book: LibraryItem & {
    userMediaProgress?: {
      progress?: number;
      currentTime?: number;
      duration?: number;
    };
  };
  style?: ViewStyle;
  onPress?: () => void;
}

// Download status hook
function useDownloadStatus(bookId: string) {
  const [status, setStatus] = useState<DownloadStatus>(() =>
    autoDownloadService.getStatus(bookId)
  );
  const [progress, setProgress] = useState<number>(() =>
    autoDownloadService.getProgress(bookId)
  );

  useEffect(() => {
    setStatus(autoDownloadService.getStatus(bookId));
    setProgress(autoDownloadService.getProgress(bookId));

    const unsubProgress = autoDownloadService.onProgress((id, pct) => {
      if (id === bookId) setProgress(pct);
    });
    const unsubStatus = autoDownloadService.onStatus((id, newStatus) => {
      if (id === bookId) setStatus(newStatus);
    });

    return () => {
      unsubProgress();
      unsubStatus();
    };
  }, [bookId]);

  return { status, progress };
}

// Get current chapter from position
function getCurrentChapter(book: LibraryItem, currentTime: number): string | null {
  const chapters = book.media?.chapters;
  if (!chapters?.length) return null;

  for (let i = chapters.length - 1; i >= 0; i--) {
    const chapterStart = chapters[i].start ?? 0;
    if (currentTime >= chapterStart) {
      const title = chapters[i].title;
      if (!title) return `Chapter ${i + 1}`;
      return title;
    }
  }

  return chapters[0]?.title || 'Chapter 1';
}

export function ContinueListeningCard({
  book,
  style,
  onPress,
}: ContinueListeningCardProps) {
  const { isInLibrary, addToLibrary, removeFromLibrary } = useMyLibraryStore();
  const { status: downloadStatus } = useDownloadStatus(book.id);

  const isFavorite = isInLibrary(book.id);
  const coverUrl = apiClient.getItemCoverUrl(book.id);
  const title = getTitle(book);
  const currentTime = book.userMediaProgress?.currentTime || 0;
  const chapter = getCurrentChapter(book, currentTime);

  const handleDownload = useCallback(() => {
    if (
      downloadStatus === 'completed' ||
      downloadStatus === 'downloading' ||
      downloadStatus === 'queued'
    ) {
      return;
    }
    autoDownloadService.startDownload(book as LibraryItem);
  }, [book, downloadStatus]);

  const handleFavorite = useCallback(() => {
    if (isFavorite) {
      removeFromLibrary(book.id);
    } else {
      addToLibrary(book.id);
    }
  }, [book.id, isFavorite, addToLibrary, removeFromLibrary]);

  const getDownloadIcon = () => {
    switch (downloadStatus) {
      case 'completed':
        return 'checkmark-circle';
      case 'downloading':
      case 'queued':
        return 'cloud-download';
      default:
        return 'download-outline';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.95}
    >
      {/* Cover Region - 70% */}
      <View style={styles.coverRegion}>
        <Image
          source={coverUrl}
          style={styles.coverImage}
          contentFit="cover"
          transition={200}
        />

        {/* Action buttons - right side of cover */}
        <View style={styles.coverActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleDownload}
            disabled={
              downloadStatus === 'downloading' || downloadStatus === 'queued'
            }
          >
            <Icon
              name={getDownloadIcon()}
              size={24}
              color="#FFFFFF"
              set="ionicons"
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleFavorite}>
            <Icon
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorite ? '#FF6B6B' : '#FFFFFF'}
              set="ionicons"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Metadata Region - 30% */}
      <View style={styles.metadataRegion}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.chapter} numberOfLines={1}>
          {chapter || 'Chapter 1'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  coverRegion: {
    height: CARD_HEIGHT * COVER_HEIGHT_RATIO,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverActions: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    gap: 12,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metadataRegion: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  chapter: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
});

export default ContinueListeningCard;
