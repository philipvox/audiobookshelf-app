/**
 * src/features/browse/components/BrowseBookCard.tsx
 *
 * Book card for browse/discover with add to library button
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LibraryItem } from '@/core/types';
import { apiClient } from '@/core/api';
import { useCoverUrl } from '@/core/cache';
import { usePlayerStore } from '@/features/player';
import { HeartButton } from '@/shared/components';
import { theme } from '@/shared/theme';
import { getTitle, getAuthorName } from '@/shared/utils/metadata';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_SIZE = (SCREEN_WIDTH - 48 - 24) / 3;

interface BrowseBookCardProps {
  book: LibraryItem;
}

export function BrowseBookCard({ book }: BrowseBookCardProps) {
  const { loadBook } = usePlayerStore();

  const coverUrl = useCoverUrl(book.id);
  const title = getTitle(book);
  const author = getAuthorName(book);

  const handlePress = async () => {
    try {
      const fullBook = await apiClient.getItem(book.id);
      await loadBook(fullBook, { autoPlay: false });
    } catch {
      await loadBook(book, { autoPlay: false });
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.coverContainer}>
        <Image source={{ uri: coverUrl }} style={styles.cover} resizeMode="cover" />
        
        <HeartButton
          bookId={book.id}
          size={16}
          style={styles.addButton}
        />
      </View>

      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <Text style={styles.author} numberOfLines={1}>{author}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_SIZE,
  },
  coverContainer: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: theme.radius.medium,
    overflow: 'hidden',
    backgroundColor: theme.colors.neutral[200],
    marginBottom: theme.spacing[2],
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  addButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonActive: {
    backgroundColor: theme.colors.primary[500],
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  author: {
    fontSize: 10,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
});