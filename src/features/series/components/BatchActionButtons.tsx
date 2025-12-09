/**
 * src/features/series/components/BatchActionButtons.tsx
 *
 * Batch action buttons for series: Download Next X, Continue Series
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LibraryItem } from '@/core/types';
import { useDownloads } from '@/core/hooks/useDownloads';
import { usePlayerStore } from '@/features/player';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

const ACCENT = '#c1f40c';
const MAX_BATCH_DOWNLOAD = 3;

interface BatchActionButtonsProps {
  booksToDownload: LibraryItem[];
  nextBook: LibraryItem | null;
  nextBookDownloaded: boolean;
  allDownloaded: boolean;
  seriesComplete: boolean;
  onContinue: () => void;
}

export function BatchActionButtons({
  booksToDownload,
  nextBook,
  nextBookDownloaded,
  allDownloaded,
  seriesComplete,
  onContinue,
}: BatchActionButtonsProps) {
  const { queueDownload } = useDownloads();
  const { loadBook } = usePlayerStore();

  // Handle batch download
  const handleDownloadNext = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const toDownload = booksToDownload.slice(0, MAX_BATCH_DOWNLOAD);
    if (toDownload.length === 0) return;

    // Queue all downloads
    for (const book of toDownload) {
      await queueDownload(book);
    }

    // Show feedback
    Alert.alert(
      'Downloads Started',
      `${toDownload.length} book${toDownload.length > 1 ? 's' : ''} queued for download.`,
      [{ text: 'OK' }]
    );
  }, [booksToDownload, queueDownload]);

  // Handle continue series
  const handleContinue = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!nextBook) return;

    if (!nextBookDownloaded) {
      // Offer to download first
      Alert.alert(
        'Book Not Downloaded',
        'This book needs to be downloaded before playing offline. Stream it now or download first?',
        [
          { text: 'Download', onPress: () => queueDownload(nextBook) },
          {
            text: 'Stream',
            onPress: () => loadBook(nextBook, { autoPlay: true, showPlayer: true })
          },
        ]
      );
      return;
    }

    onContinue();
  }, [nextBook, nextBookDownloaded, loadBook, queueDownload, onContinue]);

  // Determine button states
  const downloadCount = Math.min(booksToDownload.length, MAX_BATCH_DOWNLOAD);
  const canDownload = downloadCount > 0;
  const canContinue = nextBook !== null && !seriesComplete;

  // Download button text
  let downloadText = 'All Downloaded';
  let downloadIcon: 'checkmark-circle' | 'arrow-down-circle-outline' = 'checkmark-circle';
  if (canDownload) {
    downloadText = `Download Next ${downloadCount}`;
    downloadIcon = 'arrow-down-circle-outline';
  }

  // Continue button text
  let continueText = 'Continue Series';
  let continueEnabled = canContinue;
  if (seriesComplete) {
    continueText = 'Series Complete';
    continueEnabled = false;
  } else if (!nextBookDownloaded && nextBook) {
    continueText = 'Stream Next';
  }

  return (
    <View style={styles.container}>
      {/* Download Button */}
      <TouchableOpacity
        style={[
          styles.button,
          styles.downloadButton,
          !canDownload && styles.buttonDisabled,
        ]}
        onPress={handleDownloadNext}
        disabled={!canDownload}
        activeOpacity={0.7}
      >
        <Ionicons
          name={downloadIcon}
          size={scale(18)}
          color={canDownload ? 'rgba(255,255,255,0.9)' : ACCENT}
        />
        <Text style={[
          styles.buttonText,
          !canDownload && styles.buttonTextDisabled,
        ]}>
          {downloadText}
        </Text>
      </TouchableOpacity>

      {/* Continue Button */}
      <TouchableOpacity
        style={[
          styles.button,
          styles.continueButton,
          !continueEnabled && styles.buttonDisabledAccent,
        ]}
        onPress={handleContinue}
        disabled={!continueEnabled}
        activeOpacity={0.7}
      >
        <Ionicons
          name={seriesComplete ? 'checkmark-circle' : 'play'}
          size={scale(18)}
          color={continueEnabled ? '#000' : 'rgba(0,0,0,0.5)'}
        />
        <Text style={[
          styles.continueButtonText,
          !continueEnabled && styles.continueButtonTextDisabled,
        ]}>
          {continueText}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    marginBottom: scale(16),
    gap: scale(10),
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: scale(44),
    borderRadius: scale(10),
    gap: scale(8),
  },
  downloadButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  continueButton: {
    backgroundColor: ACCENT,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(193,244,12,0.1)',
  },
  buttonDisabledAccent: {
    backgroundColor: 'rgba(193,244,12,0.4)',
  },
  buttonText: {
    fontSize: scale(13),
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  buttonTextDisabled: {
    color: ACCENT,
  },
  continueButtonText: {
    fontSize: scale(13),
    fontWeight: '600',
    color: '#000',
  },
  continueButtonTextDisabled: {
    color: 'rgba(0,0,0,0.5)',
  },
});
