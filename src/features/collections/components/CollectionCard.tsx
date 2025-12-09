/**
 * src/features/collections/components/CollectionCard.tsx
 *
 * Simple collection card component for use in lists.
 * Now matches dark theme design pattern.
 */

import React, { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Collection } from '@/core/types';
import { apiClient } from '@/core/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

const ACCENT = '#c1f40c';

interface CollectionCardProps {
  collection: Collection;
}

export const CollectionCard = memo(function CollectionCard({ collection }: CollectionCardProps) {
  const navigation = useNavigation();

  const handlePress = () => {
    navigation.navigate('CollectionDetail' as never, { collectionId: collection.id } as never);
  };

  const books = collection.books || [];
  const bookCount = books.length;

  // Get first book cover
  const coverUrl = useMemo(() => {
    return books[0] ? apiClient.getItemCoverUrl(books[0].id) : undefined;
  }, [books]);

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.coverContainer}>
        {coverUrl ? (
          <Image source={coverUrl} style={styles.cover} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.cover, styles.placeholderCover]}>
            <Ionicons name="albums" size={scale(32)} color="rgba(255,255,255,0.3)" />
          </View>
        )}

        <View style={styles.countBadge}>
          <Ionicons name="book" size={scale(10)} color="#000" />
          <Text style={styles.countText}>{bookCount}</Text>
        </View>
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {collection.name}
        </Text>
        {collection.description && (
          <Text style={styles.description} numberOfLines={1}>
            {collection.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    width: scale(160),
    marginBottom: scale(16),
  },
  coverContainer: {
    position: 'relative',
    width: scale(160),
    height: scale(160),
    borderRadius: scale(12),
    backgroundColor: '#262626',
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#262626',
  },
  countBadge: {
    position: 'absolute',
    bottom: scale(8),
    right: scale(8),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: ACCENT,
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(10),
  },
  countText: {
    fontSize: scale(11),
    fontWeight: '700',
    color: '#000',
  },
  info: {
    marginTop: scale(8),
  },
  name: {
    fontSize: scale(14),
    fontWeight: '600',
    color: '#fff',
    marginBottom: scale(2),
    lineHeight: scale(18),
  },
  description: {
    fontSize: scale(12),
    color: 'rgba(255,255,255,0.5)',
  },
});
