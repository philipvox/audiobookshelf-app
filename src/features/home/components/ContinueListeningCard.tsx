/**
 * src/features/home/components/ContinueListeningCard.tsx
 * 
 * Continue Listening card with:
 * - Waits for download before playing
 * - Static download progress percentage
 * - Checkmark badge when downloaded
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Image, Pressable, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { getColors } from 'react-native-image-colors';
import Svg, { Circle } from 'react-native-svg';
import { LibraryItem } from '@/core/types';
import { apiClient } from '@/core/api';
import { usePlayerStore } from '@/features/player';
import { useMyLibraryStore } from '@/features/library/stores/myLibraryStore';
import { Icon } from '@/shared/components/Icon';
import { theme } from '@/shared/theme';
import { getTitle } from '@/shared/utils/metadata';
import { matchToPalette } from '@/shared/utils/colorPalette';
import { autoDownloadService, DownloadStatus } from '@/features/downloads';

const COVER_SIZE = 40;
const PROGRESS_SIZE = 36;
const PROGRESS_STROKE = 3;
const DEBOUNCE_MS = 300;

interface ContinueListeningCardProps {
  book: LibraryItem & {
    userMediaProgress?: {
      progress?: number;
      currentTime?: number;
      duration?: number;
    };
  };
  style?: any;
  zIndex?: number;
}

// ========================================
// Color Utilities
// ========================================

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const color = hex.replace('#', '');
  if (color.length !== 6) return null;
  return {
    r: parseInt(color.substr(0, 2), 16),
    g: parseInt(color.substr(2, 2), 16),
    b: parseInt(color.substr(4, 2), 16),
  };
}

function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastWith(bg: string, text: string): number {
  const l1 = getLuminance(bg);
  const l2 = getLuminance(text);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function getAccessibleTextColor(bgColor: string, lightColor = '#FFFFFF', darkColor = '#1a1a2e'): string {
  const lightContrast = contrastWith(bgColor, lightColor);
  const darkContrast = contrastWith(bgColor, darkColor);
  return lightContrast >= darkContrast ? lightColor : darkColor;
}

function darkenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.max(0, Math.round(rgb.r * (1 - amount)));
  const g = Math.max(0, Math.round(rgb.g * (1 - amount)));
  const b = Math.max(0, Math.round(rgb.b * (1 - amount)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ========================================
// Download Status Hook
// ========================================

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

// ========================================
// Progress Circle
// ========================================

function ProgressCircle({ 
  progress, 
  size, 
  strokeWidth, 
  color, 
  bgColor 
}: { 
  progress: number; 
  size: number; 
  strokeWidth: number; 
  color: string; 
  bgColor: string; 
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const strokeDashoffset = circumference - (clampedProgress * circumference);

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          stroke={bgColor}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text style={{ color, fontSize: 10, fontWeight: '600' }}>
        {Math.round(clampedProgress * 100)}
      </Text>
    </View>
  );
}

// ========================================
// Main Component
// ========================================

export function ContinueListeningCard({ book, style, zIndex = 1 }: ContinueListeningCardProps) {
  const [backgroundColor, setBackgroundColor] = useState('#2a2a3e');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [progressColor, setProgressColor] = useState(theme.colors.primary[500]);
  const [isWaitingForDownload, setIsWaitingForDownload] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const lastPressRef = useRef(0);
  
  const { loadBook, isLoading: playerLoading, currentBook, isPlaying } = usePlayerStore();
  const { isInLibrary, addToLibrary, removeFromLibrary } = useMyLibraryStore();
  const { status: downloadStatus, progress: downloadProgress } = useDownloadStatus(book.id);

  const isThisBookInPlayer = currentBook?.id === book.id;
  const isDownloading = downloadStatus === 'downloading' || downloadStatus === 'queued';
  const isDownloaded = downloadStatus === 'completed';
  const isLoading = isWaitingForDownload || (playerLoading && isThisBookInPlayer);
  const isFavorite = isInLibrary(book.id);

  // Extract colors from cover
  const coverUrl = apiClient.getItemCoverUrl(book.id);
  
  useEffect(() => {
    if (!coverUrl) return;

    getColors(coverUrl, { fallback: '#2a2a3e', cache: true, key: book.id })
      .then((result) => {
        let primary = '#2a2a3e';
        if (result.platform === 'ios') {
          primary = result.background || result.primary || '#2a2a3e';
        } else if (result.platform === 'android') {
          primary = result.dominant || result.average || '#2a2a3e';
        }
        
        const mapped = matchToPalette(primary);
        const bgColor = darkenColor(mapped.base, 0.15);
        setBackgroundColor(bgColor);
        setTextColor(getAccessibleTextColor(bgColor));
        setProgressColor(mapped.accent);
      })
      .catch(() => {});
  }, [coverUrl, book.id]);

  // Progress
  const progress = book.userMediaProgress?.progress ?? 0;
  const progressPercent = Math.round(progress * 100);
  const title = getTitle(book);

  // Time left
  const duration = book.userMediaProgress?.duration || book.media?.duration || 0;
  const currentTime = book.userMediaProgress?.currentTime || 0;
  const timeLeft = Math.max(0, duration - currentTime);
  
  const formatTimeLeft = (seconds: number): string => {
    if (seconds <= 0) return '';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m left`;
    return `${mins}m left`;
  };

  const handlePlay = useCallback(async () => {
    const now = Date.now();
    if (now - lastPressRef.current < DEBOUNCE_MS) return;
    lastPressRef.current = now;

    if (isLoading) return;

    try {
      const downloaded = autoDownloadService.isDownloaded(book.id);
      const downloading = autoDownloadService.isDownloading(book.id);

      if (downloaded) {
        console.log('[Card] Playing downloaded book');
        const fullBook = await apiClient.getItem(book.id);
        await loadBook(fullBook);
        
      } else if (downloading) {
        console.log('[Card] Waiting for download...');
        setIsWaitingForDownload(true);
        
        const localPath = await autoDownloadService.waitForDownload(book.id);
        
        if (localPath) {
          console.log('[Card] Download complete, playing');
          const fullBook = await apiClient.getItem(book.id);
          await loadBook(fullBook);
        } else {
          console.log('[Card] Download failed, streaming instead');
          const fullBook = await apiClient.getItem(book.id);
          await loadBook(fullBook);
        }
        
      } else {
        console.log('[Card] Streaming (not downloaded)');
        const fullBook = await apiClient.getItem(book.id);
        await loadBook(fullBook);
      }
      
    } catch (err: any) {
      console.error('[Card] Failed:', err.message);
    } finally {
      setIsWaitingForDownload(false);
    }
  }, [book, loadBook, isLoading]);

  const handleCardPress = useCallback(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.02, tension: 100, friction: 8, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
    ]).start();
    handlePlay();
  }, [handlePlay, scaleAnim]);

  const handleHeartPress = () => {
    if (isFavorite) {
      removeFromLibrary(book.id);
    } else {
      addToLibrary(book.id);
    }
  };

  // Render play button content
  const renderPlayButton = () => {
    if (isDownloading || isWaitingForDownload) {
      return (
        <ProgressCircle
          progress={downloadProgress}
          size={PROGRESS_SIZE}
          strokeWidth={PROGRESS_STROKE}
          color={progressColor}
          bgColor={`${textColor}20`}
        />
      );
    }

    if (isLoading) {
      return (
        <View style={[styles.playIcon, { backgroundColor: progressColor }]}>
          <Icon name="ellipsis-horizontal" size={16} color="#FFF" />
        </View>
      );
    }

    if (isThisBookInPlayer && isPlaying) {
      return (
        <View style={[styles.playIcon, { backgroundColor: progressColor }]}>
          <Icon name="pause" size={16} color="#FFF" />
        </View>
      );
    }

    return (
      <View style={styles.playButtonWrapper}>
        <View style={[styles.playIcon, { backgroundColor: progressColor }]}>
          <Icon name="play" size={16} color="#FFF" />
        </View>
        {isDownloaded && (
          <View style={[styles.downloadBadge, { backgroundColor: '#4CAF50' }]}>
            <Icon name="checkmark" size={8} color="#FFF" />
          </View>
        )}
      </View>
    );
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], zIndex }}>
      <Pressable
        style={[styles.card, { backgroundColor }, style]}
        onPress={handleCardPress}
        disabled={isLoading}
      >
        {/* Cover */}
        <View style={styles.coverContainer}>
          <Image source={{ uri: coverUrl }} style={styles.cover} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
            {title}
          </Text>
          
          <View style={styles.progressRow}>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarBg, { backgroundColor: `${textColor}20` }]} />
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${progressPercent}%`, backgroundColor: progressColor }
                ]} 
              />
            </View>
            <Text style={[styles.progressText, { color: `${textColor}99` }]}>
              {progressPercent}%
            </Text>
          </View>

          {timeLeft > 0 && (
            <Text style={[styles.timeLeft, { color: `${textColor}80` }]}>
              {formatTimeLeft(timeLeft)}
            </Text>
          )}
        </View>

        {/* Play Button */}
        <TouchableOpacity 
          style={styles.playButton} 
          onPress={handlePlay} 
          activeOpacity={0.7}
          disabled={isWaitingForDownload}
        >
          {renderPlayButton()}
        </TouchableOpacity>

        {/* Heart */}
        <TouchableOpacity style={styles.heartButton} onPress={handleHeartPress} activeOpacity={0.7}>
          <Icon 
            name={isFavorite ? 'heart' : 'heart-outline'} 
            size={18} 
            color={isFavorite ? '#FF6B6B' : `${textColor}60`} 
          />
        </TouchableOpacity>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  coverContainer: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarContainer: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginRight: 8,
    overflow: 'hidden',
  },
  progressBarBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 2,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '500',
    minWidth: 28,
  },
  timeLeft: {
    fontSize: 11,
    marginTop: 4,
  },
  playButton: {
    padding: 4,
  },
  playButtonWrapper: {
    position: 'relative',
  },
  playIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#2a2a3e',
  },
  heartButton: {
    padding: 8,
    marginLeft: 4,
  },
});