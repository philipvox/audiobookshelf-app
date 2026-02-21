/**
 * src/features/browse/components/CollectionSquareCard.tsx
 *
 * Square collection card with cover image, book count badge, and white name.
 * Used in browse section and collections list.
 */

import React, { memo, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LayoutGrid, BookOpen } from 'lucide-react-native';
import { Collection } from '@/core/types';
import { apiClient } from '@/core/api';
import { scale, spacing, radius } from '@/shared/theme';
import { secretLibraryColors, secretLibraryFonts } from '@/shared/theme/secretLibrary';

interface CollectionSquareCardProps {
  collection: Collection;
  onPress?: () => void;
  size?: number;
}

function CollectionSquareCardComponent({
  collection,
  onPress,
  size = scale(160),
}: CollectionSquareCardProps) {
  const books = collection.books || [];
  const bookCount = books.length;

  // Get first book cover
  const coverUrl = useMemo(() => {
    return books[0]
      ? apiClient.getItemCoverUrl(books[0].id, { width: 400, height: 400 })
      : undefined;
  }, [books]);

  return (
    <Pressable style={[styles.container, { width: size }]} onPress={onPress}>
      {/* Cover Image */}
      <View style={[styles.coverContainer, { width: size, height: size }]}>
        {coverUrl ? (
          <Image
            source={coverUrl}
            style={styles.cover}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.placeholderCover}>
            <LayoutGrid
              size={scale(40)}
              color="rgba(255,255,255,0.4)"
              strokeWidth={1.5}
            />
          </View>
        )}

        {/* Book count badge */}
        <View style={styles.countBadge}>
          <BookOpen
            size={scale(12)}
            color={secretLibraryColors.white}
            strokeWidth={2.5}
          />
          <Text style={styles.countText}>{bookCount}</Text>
        </View>
      </View>

      {/* Collection name */}
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
    </Pressable>
  );
}

export const CollectionSquareCard = memo(CollectionSquareCardComponent);

const styles = StyleSheet.create({
  container: {
    // width set via prop
  },
  coverContainer: {
    position: 'relative',
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#262626',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#262626',
  },
  countBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(239, 108, 77, 0.95)', // Coral/salmon color matching screenshot
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  countText: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(12),
    fontWeight: '700',
    color: secretLibraryColors.white,
  },
  info: {
    marginTop: spacing.sm,
    paddingHorizontal: 2,
  },
  name: {
    fontFamily: secretLibraryFonts.playfair.regular,
    fontSize: scale(15),
    fontWeight: '500',
    color: secretLibraryColors.white,
    lineHeight: scale(20),
  },
  description: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(11),
    color: secretLibraryColors.gray,
    marginTop: 2,
  },
});
