/**
 * src/features/downloads/components/DownloadItem.tsx
 *
 * Single download item for the downloads list view.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import { useCoverUrl } from '@/core/cache';
import { DownloadTask } from '@/core/services/downloadManager';
import { sqliteCache } from '@/core/services/sqliteCache';
import { LibraryItem } from '@/core/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

const COLORS = {
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  accent: '#4ADE80',
  warning: '#FF9800',
  error: '#F44336',
  cardBg: 'rgba(255, 255, 255, 0.08)',
  progressBg: 'rgba(255, 255, 255, 0.1)',
  progressFill: '#4ADE80',
};

// Pause icon
const PauseIcon = ({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M10 4H6v16h4V4zM18 4h-4v16h4V4z"
      fill={color}
    />
  </Svg>
);

// Play icon
const PlayIcon = ({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 4l15 8-15 8V4z"
      fill={color}
    />
  </Svg>
);

// Check icon
const CheckIcon = ({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 6L9 17l-5-5"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Remove icon
const RemoveIcon = ({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6l12 12"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Alert icon
const AlertIcon = ({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 9v4M12 17h.01M12 3l9.5 16.5H2.5L12 3z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

interface DownloadItemProps {
  download: DownloadTask;
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
}

export function DownloadItem({ download, onPause, onResume, onDelete }: DownloadItemProps) {
  const [book, setBook] = useState<LibraryItem | null>(null);
  const coverUrl = useCoverUrl(download.itemId);

  // Load book metadata from cache
  useEffect(() => {
    sqliteCache.getLibraryItem(download.itemId).then((item) => {
      if (item) setBook(item);
    });
  }, [download.itemId]);

  const metadata = book?.media?.metadata as any;
  const title = metadata?.title || 'Loading...';
  const author = metadata?.authorName || metadata?.authors?.[0]?.name || '';

  // Status display
  const getStatusInfo = () => {
    switch (download.status) {
      case 'downloading':
        return {
          text: `${Math.round(download.progress * 100)}%`,
          color: COLORS.accent,
          showProgress: true,
        };
      case 'pending':
        return {
          text: 'Waiting...',
          color: COLORS.textSecondary,
          showProgress: false,
        };
      case 'paused':
        return {
          text: 'Paused',
          color: COLORS.warning,
          showProgress: true,
        };
      case 'error':
        return {
          text: download.error || 'Failed',
          color: COLORS.error,
          showProgress: false,
        };
      case 'complete':
        return {
          text: 'Downloaded',
          color: COLORS.accent,
          showProgress: false,
        };
      default:
        return {
          text: '',
          color: COLORS.textSecondary,
          showProgress: false,
        };
    }
  };

  const statusInfo = getStatusInfo();

  // Action button based on status
  const renderActionButton = () => {
    switch (download.status) {
      case 'downloading':
        return (
          <Pressable style={styles.actionButton} onPress={onPause}>
            <PauseIcon size={scale(18)} color={COLORS.accent} />
          </Pressable>
        );
      case 'paused':
        return (
          <Pressable style={styles.actionButton} onPress={onResume}>
            <PlayIcon size={scale(18)} color={COLORS.warning} />
          </Pressable>
        );
      case 'pending':
        return (
          <View style={styles.actionButton}>
            <ActivityIndicator size="small" color={COLORS.textSecondary} />
          </View>
        );
      case 'error':
        return (
          <Pressable style={styles.actionButton} onPress={onResume}>
            <AlertIcon size={scale(18)} color={COLORS.error} />
          </Pressable>
        );
      case 'complete':
        return (
          <Pressable style={styles.actionButton} onPress={onDelete}>
            <CheckIcon size={scale(18)} color={COLORS.accent} />
          </Pressable>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Cover */}
      <Image source={coverUrl} style={styles.cover} contentFit="cover" />

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {author ? (
          <Text style={styles.author} numberOfLines={1}>
            {author}
          </Text>
        ) : null}
        <Text style={[styles.status, { color: statusInfo.color }]}>
          {statusInfo.text}
        </Text>

        {/* Progress bar */}
        {statusInfo.showProgress && (
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${download.progress * 100}%`,
                  backgroundColor: statusInfo.color,
                },
              ]}
            />
          </View>
        )}
      </View>

      {/* Action button */}
      {renderActionButton()}

      {/* Delete button */}
      <Pressable style={styles.deleteButton} onPress={onDelete}>
        <RemoveIcon size={scale(18)} color={COLORS.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(10),
    paddingHorizontal: scale(12),
    backgroundColor: COLORS.cardBg,
    borderRadius: scale(12),
    marginBottom: scale(8),
    gap: scale(10),
  },
  cover: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(6),
    backgroundColor: '#262626',
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: scale(2),
  },
  author: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginBottom: scale(2),
  },
  status: {
    fontSize: scale(11),
  },
  progressContainer: {
    marginTop: scale(6),
    height: scale(3),
    backgroundColor: COLORS.progressBg,
    borderRadius: scale(2),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: scale(2),
  },
  actionButton: {
    padding: scale(8),
  },
  deleteButton: {
    padding: scale(8),
  },
});
