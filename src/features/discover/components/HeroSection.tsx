/**
 * src/features/discover/components/HeroSection.tsx
 *
 * Featured book hero with cover art and overlay action buttons.
 * Shows "Written by" and "Read by" credits below.
 * Supports light and dark themes.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Play, Pause, Check, Download } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useCoverUrl } from '@/core/cache';
import { scale, spacing, radius, layout, elevation, accentColors } from '@/shared/theme';
import { useThemeColors } from '@/shared/theme/themeStore';
import { CompleteBadgeOverlay } from '@/features/completion';
import { usePlayerStore } from '@/features/player';
import { useDownloadStatus } from '@/core/hooks/useDownloads';
import { downloadManager } from '@/core/services/downloadManager';
import { apiClient } from '@/core/api';
import { haptics } from '@/core/native/haptics';
import { HeroRecommendation } from '../types';
import { logger } from '@/shared/utils/logger';
import { useToast } from '@/shared/hooks/useToast';

// Large centered cover
const COVER_SIZE = scale(300);

// Small overlay button size
const BUTTON_SIZE = scale(40);

// Use white for most UI elements, red only for progress
const ACCENT_WHITE = '#FFFFFF';

interface HeroSectionProps {
  hero: HeroRecommendation;
}

export function HeroSection({ hero }: HeroSectionProps) {
  const navigation = useNavigation<any>();
  const themeColors = useThemeColors();
  const loadBook = usePlayerStore((s) => s.loadBook);
  const currentBook = usePlayerStore((s) => s.currentBook);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  // Download status
  const {
    isDownloaded,
    isDownloading,
    isPending,
    isPaused,
    progress: downloadProgress,
  } = useDownloadStatus(hero.book.id);

  // Use cached cover URL
  const coverUrl = useCoverUrl(hero.book.id);

  // Toast for error feedback
  const { showError } = useToast();

  // Check if this book is currently loaded and playing
  const isCurrentBook = currentBook?.id === hero.book.id;
  const isCurrentlyPlaying = isCurrentBook && isPlaying;

  const handlePress = useCallback(() => {
    navigation.navigate('BookDetail', { id: hero.book.id });
  }, [navigation, hero.book.id]);

  const handlePlay = useCallback(async () => {
    haptics.buttonPress();
    try {
      const fullBook = await apiClient.getItem(hero.book.id);
      await loadBook(fullBook, { autoPlay: true, showPlayer: false });
    } catch {
      navigation.navigate('BookDetail', { id: hero.book.id });
    }
  }, [hero.book.id, loadBook, navigation]);

  const handleDownload = useCallback(async () => {
    haptics.buttonPress();

    if (isDownloaded) return;

    if (isDownloading) {
      haptics.toggle();
      await downloadManager.pauseDownload(hero.book.id);
      return;
    }

    if (isPaused) {
      haptics.toggle();
      await downloadManager.resumeDownload(hero.book.id);
      return;
    }

    if (isPending) {
      haptics.warning();
      await downloadManager.cancelDownload(hero.book.id);
      return;
    }

    // Queue download - need full book data
    try {
      const fullBook = await apiClient.getItem(hero.book.id);
      haptics.success();
      await downloadManager.queueDownload(fullBook);
    } catch (error) {
      logger.warn('[HeroSection] Failed to queue download:', error);
      showError('Failed to start download. Please try again.');
    }
  }, [hero.book.id, isDownloaded, isDownloading, isPaused, isPending]);

  const { book } = hero;

  // Get narrator from book (if available)
  const narrator = book.narrator || null;

  return (
    <View style={styles.container}>
      {/* Cover with overlay buttons */}
      <TouchableOpacity
        style={styles.coverWrapper}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={styles.coverContainer}>
          <Image
            source={coverUrl || book.coverUrl}
            style={styles.cover}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />
          <CompleteBadgeOverlay bookId={book.id} size="medium" />

          {/* Download button overlay - bottom left */}
          <TouchableOpacity
            style={[
              styles.overlayButton,
              styles.overlayButtonLeft,
              styles.overlayButtonDownload,
              isDownloaded && styles.overlayButtonDownloaded,
            ]}
            onPress={handleDownload}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isDownloading || isPending ? (
              <View style={styles.progressContainer}>
                <ActivityIndicator size="small" color="rgba(0,0,0,0.7)" />
              </View>
            ) : isDownloaded ? (
              <Check size={scale(18)} color="#34C759" strokeWidth={2.5} />
            ) : (
              <Download size={scale(20)} color="rgba(0,0,0,0.7)" strokeWidth={2} />
            )}
          </TouchableOpacity>

          {/* Play button overlay - bottom right */}
          <TouchableOpacity
            style={[
              styles.overlayButton,
              styles.overlayButtonRight,
              styles.overlayButtonPlay,
            ]}
            onPress={handlePlay}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isCurrentlyPlaying ? (
              <Pause size={scale(18)} color="#000" strokeWidth={2.5} />
            ) : (
              <Play size={scale(18)} color="#000" fill="#000" strokeWidth={0} style={{ marginLeft: scale(2) }} />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Title below cover */}
      <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={2}>
        {book.title}
      </Text>

      {/* Credits row: Written by / Read by */}
      <View style={styles.creditsRow}>
        <Text style={[styles.creditText, { color: themeColors.textSecondary }]}>
          Written by <Text style={[styles.creditName, { color: themeColors.text }]}>{book.author}</Text>
        </Text>
        {narrator && (
          <>
            <View style={[styles.creditDivider, { backgroundColor: themeColors.border }]} />
            <Text style={[styles.creditText, { color: themeColors.textSecondary }]}>
              Read by <Text style={[styles.creditName, { color: themeColors.text }]}>{narrator}</Text>
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    marginBottom: spacing.md,
  },
  coverWrapper: {
    marginBottom: spacing.lg,
  },
  coverContainer: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...elevation.large,
    position: 'relative',
  },
  cover: {
    width: '100%',
    height: '100%',
  },

  // Overlay buttons on cover
  overlayButton: {
    position: 'absolute',
    bottom: scale(12),
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayButtonLeft: {
    left: scale(12),
  },
  overlayButtonRight: {
    right: scale(12),
  },
  overlayButtonDownload: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    // Drop shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  overlayButtonDownloaded: {
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  overlayButtonPlay: {
    backgroundColor: ACCENT_WHITE,
    // Drop shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },

  // Progress indicator for downloading
  progressContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRing: {
    position: 'absolute',
    width: BUTTON_SIZE - scale(8),
    height: BUTTON_SIZE - scale(8),
    borderRadius: (BUTTON_SIZE - scale(8)) / 2,
    borderWidth: 2,
    overflow: 'hidden',
    opacity: 0.3,
  },
  progressFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: ACCENT_WHITE,
  },

  // Title below cover
  title: {
    fontSize: scale(20),
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: scale(26),
    marginBottom: spacing.sm,
    paddingHorizontal: layout.screenPaddingH,
    // color set via themeColors.text in JSX
  },

  // Credits row: "Written by X | Read by Y"
  creditsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: layout.screenPaddingH,
    gap: spacing.sm,
  },
  creditText: {
    fontSize: scale(13),
    // color set via themeColors.textSecondary in JSX
  },
  creditName: {
    fontWeight: '600',
    // color set via themeColors.text in JSX
  },
  creditDivider: {
    width: 1,
    height: scale(14),
    // backgroundColor set via themeColors.border in JSX
  },
});
