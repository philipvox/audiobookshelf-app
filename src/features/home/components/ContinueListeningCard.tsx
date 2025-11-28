/**
 * src/features/home/components/ContinueListeningCard.tsx
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, Pressable, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getColors } from 'react-native-image-colors';
import { useQueryClient } from '@tanstack/react-query';
import { LibraryItem } from '@/core/types';
import { apiClient } from '@/core/api';
import { usePlayerStore } from '@/features/player';
import { useMyLibraryStore } from '@/features/library/stores/myLibraryStore';
import { Icon } from '@/shared/components/Icon';
import { theme } from '@/shared/theme';
import { getTitle } from '@/shared/utils/metadata';
import { matchToPalette } from '@/shared/utils/colorPalette';

const COVER_SIZE = 40;

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

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const color = hex.replace('#', '');
  if (color.length !== 6) return null;
  return {
    r: parseInt(color.substr(0, 2), 16),
    g: parseInt(color.substr(2, 2), 16),
    b: parseInt(color.substr(4, 2), 16),
  };
}

function isColorLight(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5;
}

function getColorSaturation(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const { r, g, b } = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

function pickMostSaturated(colors: (string | undefined)[]): string | null {
  let best: string | null = null;
  let bestSat = -1;
  for (const c of colors) {
    if (!c) continue;
    const sat = getColorSaturation(c);
    if (sat > bestSat) {
      bestSat = sat;
      best = c;
    }
  }
  return best;
}

export function ContinueListeningCard({ book, style, zIndex = 1 }: ContinueListeningCardProps) {
  const navigation = useNavigation<any>();
  const { loadBook } = usePlayerStore();
  const bookIds = useMyLibraryStore((state) => state.bookIds) ?? [];
  const addBook = useMyLibraryStore((state) => state.addBook);
  const removeBook = useMyLibraryStore((state) => state.removeBook);
  const [bgColor, setBgColor] = useState(theme.colors.neutral[200]);
  const [isLight, setIsLight] = useState(true);

  const isInLibrary = bookIds.includes(book.id);
  const coverUrl = apiClient.getItemCoverUrl(book.id);
  const title = getTitle(book);
  
  const currentTime = book.userMediaProgress?.currentTime ?? 0;
  const duration = book.media?.duration ?? book.userMediaProgress?.duration ?? 0;
  
  const chapters = book.media?.chapters ?? [];
  let chapterNumber = 1;
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    const nextCh = chapters[i + 1];
    if (currentTime >= ch.start && (!nextCh || currentTime < nextCh.start)) {
      chapterNumber = i + 1;
      break;
    }
  }

  useEffect(() => {
    let mounted = true;
    
    const extractColors = async () => {
      try {
        const result = await getColors(coverUrl, {
          fallback: theme.colors.neutral[200],
          cache: true,
          key: book.id,
        });
        
        if (!mounted) return;

        let dominant = theme.colors.neutral[200];
        
        if (result.platform === 'ios') {
          dominant = result.detail || result.primary || result.secondary || theme.colors.neutral[200];
        } else if (result.platform === 'android') {
          // Pick most saturated color to match iOS "detail" behavior
          const candidates = [
            result.vibrant,
            result.darkVibrant, 
            result.lightVibrant,
            result.muted,
            result.darkMuted,
            result.lightMuted,
            result.dominant,
          ];
          dominant = pickMostSaturated(candidates) || result.dominant || theme.colors.neutral[200];
        }
        
        // Match to palette
        const paletteColor = matchToPalette(dominant);
        setBgColor(paletteColor);
        setIsLight(isColorLight(paletteColor));
      } catch (err) {
        console.log('Color extraction error:', err);
      }
    };

    extractColors();
    return () => { mounted = false; };
  }, [coverUrl, book.id]);

  const textColor = isLight ? '#000000' : '#FFFFFF';
  const secondaryColor = isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)';
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCardPress = async () => {
    // Animate card scale up before transitioning to player
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.02,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      // Fetch full book data with audioFiles
      const fullBook = await apiClient.getItem(book.id);
      await loadBook(fullBook);
    } catch (err) {
      console.error('Failed to load book:', err);
      // Fallback: try with existing data
      try {
        await loadBook(book);
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr);
      }
    }
  };

  const handlePlay = async () => {
    try {
      // Fetch full book data with audioFiles
      const fullBook = await apiClient.getItem(book.id);
      await loadBook(fullBook);
    } catch (err) {
      console.error('Failed to load book:', err);
      // Fallback: try with existing data
      try {
        await loadBook(book);
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr);
      }
    }
  };

  const handleHeartPress = () => {
    if (isInLibrary) {
      removeBook(book.id);
    } else {
      addBook(book.id);
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable 
        style={[styles.card, { backgroundColor: bgColor, zIndex }, style]} 
        onPress={handleCardPress}
      > 
         <Text style={[styles.title, { color: textColor }]} numberOfLines={2}>{title}</Text>
        <View style={styles.topRow}>
          <View style={styles.coverContainer}>
            <Image source={{ uri: coverUrl }} style={styles.cover} resizeMode="cover" />
          </View>

          <View style={styles.chapterInfo}>
            <Text style={[styles.chapterLabel, { color: textColor }]}>Chapter {chapterNumber}</Text>
            <Text style={[styles.timeInfo, { color: secondaryColor }]}>
              {formatTime(currentTime)} : {formatTime(duration)}
            </Text>
          </View>

          <TouchableOpacity style={styles.heartButton} onPress={handleHeartPress} activeOpacity={0.7}>
            <Icon 
              name={isInLibrary ? 'heart' : 'heart-outline'} 
              size={22} 
              color={isInLibrary ? '#FF69B4' : secondaryColor} 
              set="ionicons" 
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.playButton} onPress={handlePlay} activeOpacity={0.7}>
            <Icon name="play-outline" size={26} color={textColor} set="ionicons" />
          </TouchableOpacity>
        </View>

      </Pressable>
    </Animated.View>
  );
}

export const CARD_HEIGHT = 120;
export const CARD_OVERLAP = -5;

const styles = StyleSheet.create({
  card: {
    borderRadius:25,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 16,
    marginHorizontal: 5,
    height: CARD_HEIGHT,
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 4},
    // shadowOpacity: .6,
    // shadowRadius: 20,
    // elevation: 30,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  coverContainer: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius:5,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  chapterInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chapterLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  timeInfo: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  playButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 22,
    letterSpacing: -0.5,
    paddingBottom: 5,
  },
  heartButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
});