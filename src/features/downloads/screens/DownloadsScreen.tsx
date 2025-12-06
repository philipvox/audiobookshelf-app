/**
 * src/features/downloads/screens/DownloadsScreen.tsx
 *
 * Downloads management screen - view, pause, resume, delete downloads.
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useDownloads } from '@/core/hooks/useDownloads';
import { downloadManager, DownloadTask } from '@/core/services/downloadManager';
import { DownloadItem } from '../components/DownloadItem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

const COLORS = {
  background: '#000000',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  accent: '#4ADE80',
  danger: '#DC2626',
};

// Back arrow icon
const BackIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 12H5M12 19l-7-7 7-7"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Download icon
const DownloadIcon = ({ size = 48, color = 'rgba(255,255,255,0.3)' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export function DownloadsScreen() {
  const navigation = useNavigation();
  const { downloads, isLoading, deleteDownload, pauseDownload, resumeDownload } = useDownloads();

  // Sort downloads: active first, then pending, paused, error, complete
  const sortedDownloads = useMemo(() => {
    const order: Record<DownloadTask['status'], number> = {
      downloading: 0,
      pending: 1,
      paused: 2,
      error: 3,
      complete: 4,
    };
    return [...downloads].sort((a, b) => order[a.status] - order[b.status]);
  }, [downloads]);

  const activeDownloads = useMemo(
    () => downloads.filter((d) => d.status === 'downloading' || d.status === 'pending'),
    [downloads]
  );

  const completedDownloads = useMemo(
    () => downloads.filter((d) => d.status === 'complete'),
    [downloads]
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handlePause = useCallback(
    (itemId: string) => {
      pauseDownload(itemId);
    },
    [pauseDownload]
  );

  const handleResume = useCallback(
    (itemId: string) => {
      resumeDownload(itemId);
    },
    [resumeDownload]
  );

  const handleDelete = useCallback(
    (itemId: string) => {
      Alert.alert('Remove Download', 'Remove this book from offline storage?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteDownload(itemId),
        },
      ]);
    },
    [deleteDownload]
  );

  const handleClearCompleted = useCallback(() => {
    Alert.alert(
      'Clear Completed',
      `Remove ${completedDownloads.length} downloaded books from offline storage?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            for (const download of completedDownloads) {
              await deleteDownload(download.itemId);
            }
          },
        },
      ]
    );
  }, [completedDownloads, deleteDownload]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <BackIcon size={scale(24)} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Downloads</Text>
        {completedDownloads.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClearCompleted}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Summary bar */}
      {downloads.length > 0 && (
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            {completedDownloads.length} downloaded
            {activeDownloads.length > 0 && ` • ${activeDownloads.length} in progress`}
          </Text>
        </View>
      )}

      {/* Downloads list */}
      {downloads.length === 0 ? (
        <View style={styles.emptyContainer}>
          <DownloadIcon size={scale(64)} />
          <Text style={styles.emptyTitle}>No Downloads</Text>
          <Text style={styles.emptySubtitle}>
            Download audiobooks for offline listening. Tap the download button on any book to get
            started.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedDownloads}
          keyExtractor={(item) => item.itemId}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <DownloadItem
              download={item}
              onPause={() => handlePause(item.itemId)}
              onResume={() => handleResume(item.itemId)}
              onDelete={() => handleDelete(item.itemId)}
            />
          )}
          ListFooterComponent={
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {downloads.length} {downloads.length === 1 ? 'book' : 'books'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
  },
  backButton: {
    padding: scale(4),
    marginRight: scale(12),
  },
  headerTitle: {
    flex: 1,
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  clearButton: {
    padding: scale(8),
  },
  clearButtonText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.danger,
  },
  summaryBar: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryText: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },
  listContent: {
    paddingHorizontal: scale(16),
    paddingTop: scale(8),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(40),
  },
  emptyTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: scale(16),
    marginBottom: scale(8),
  },
  emptySubtitle: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: scale(20),
  },
  footer: {
    alignItems: 'center',
    paddingVertical: scale(20),
  },
  footerText: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },
});
