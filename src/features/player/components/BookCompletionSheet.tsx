/**
 * src/features/player/components/BookCompletionSheet.tsx
 *
 * Bottom sheet shown when a book finishes playing.
 * Allows user to mark book as finished or continue listening.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { BookOpen, CheckCircle, Check, RotateCcw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '../stores/playerStore';
import { getCoverUrl } from '@/core/cache';
import { scale, spacing, useThemeColors, accentColors } from '@/shared/theme';

export function BookCompletionSheet() {
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();

  const showCompletionSheet = usePlayerStore((s) => s.showCompletionSheet);
  const completionSheetBook = usePlayerStore((s) => s.completionSheetBook);
  const markBookFinished = usePlayerStore((s) => s.markBookFinished);
  const dismissCompletionSheet = usePlayerStore((s) => s.dismissCompletionSheet);

  const handleMarkFinished = useCallback(async () => {
    if (completionSheetBook) {
      await markBookFinished(completionSheetBook.id);
    }
  }, [completionSheetBook, markBookFinished]);

  const handleKeepListening = useCallback(() => {
    dismissCompletionSheet();
  }, [dismissCompletionSheet]);

  if (!showCompletionSheet || !completionSheetBook) {
    return null;
  }

  // Get book metadata
  const metadata = completionSheetBook.media?.metadata as any;
  const title = metadata?.title || 'Unknown Title';
  const author = metadata?.authorName || metadata?.authors?.[0]?.name || 'Unknown Author';
  const coverUrl = getCoverUrl(completionSheetBook.id);

  return (
    <Modal
      visible={showCompletionSheet}
      transparent
      animationType="slide"
      onRequestClose={dismissCompletionSheet}
    >
      <Pressable style={styles.overlay} onPress={dismissCompletionSheet}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + 16, backgroundColor: themeColors.surfaceElevated }]}
          onPress={() => {}}
        >
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: themeColors.border }]} />
          </View>

          {/* Book Info */}
          <View style={styles.bookInfo}>
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} style={[styles.cover, { backgroundColor: themeColors.backgroundSecondary }]} />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder, { backgroundColor: themeColors.backgroundSecondary }]}>
                <BookOpen size={scale(32)} color={themeColors.textTertiary} strokeWidth={1.5} />
              </View>
            )}
            <View style={styles.titleContainer}>
              <Text style={[styles.congrats, { color: accentColors.gold }]}>You finished</Text>
              <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={2}>{title}</Text>
              <Text style={[styles.author, { color: themeColors.textSecondary }]} numberOfLines={1}>{author}</Text>
            </View>
          </View>

          {/* Celebration Icon */}
          <View style={styles.celebrationContainer}>
            <View style={[styles.celebrationCircle, { backgroundColor: `${accentColors.gold}25` }]}>
              <CheckCircle size={scale(48)} color={accentColors.gold} strokeWidth={2} />
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: accentColors.gold }]}
              onPress={handleMarkFinished}
              activeOpacity={0.8}
            >
              <Check size={scale(20)} color={themeColors.background} strokeWidth={2.5} />
              <Text style={[styles.primaryButtonText, { color: themeColors.background }]}>Mark as Finished</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleKeepListening}
              activeOpacity={0.7}
            >
              <RotateCcw size={scale(18)} color={accentColors.gold} strokeWidth={2} />
              <Text style={[styles.secondaryButtonText, { color: accentColors.gold }]}>Listen Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dismissButton}
              onPress={dismissCompletionSheet}
              activeOpacity={0.7}
            >
              <Text style={[styles.dismissButtonText, { color: themeColors.textTertiary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    paddingTop: scale(8),
    paddingHorizontal: scale(20),
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: scale(8),
  },
  handle: {
    width: scale(36),
    height: scale(4),
    borderRadius: scale(2),
  },
  bookInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(16),
    gap: scale(16),
  },
  cover: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(8),
  },
  coverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  congrats: {
    fontSize: scale(13),
    fontWeight: '600',
    marginBottom: scale(4),
  },
  title: {
    fontSize: scale(17),
    fontWeight: '600',
    marginBottom: scale(4),
  },
  author: {
    fontSize: scale(14),
  },
  celebrationContainer: {
    alignItems: 'center',
    paddingVertical: scale(12),
  },
  celebrationCircle: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    gap: scale(12),
    paddingTop: scale(8),
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(14),
    borderRadius: scale(12),
    gap: scale(8),
  },
  primaryButtonText: {
    fontSize: scale(16),
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(12),
    gap: scale(8),
  },
  secondaryButtonText: {
    fontSize: scale(15),
    fontWeight: '500',
  },
  dismissButton: {
    alignItems: 'center',
    paddingVertical: scale(12),
  },
  dismissButtonText: {
    fontSize: scale(15),
  },
});
