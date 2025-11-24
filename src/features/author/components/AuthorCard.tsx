/**
 * src/features/authors/components/AuthorCard.tsx
 *
 * Card displaying author information with book count.
 */

import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthorInfo } from '../services/authorAdapter';
import { apiClient } from '@/core/api';
import { theme } from '@/shared/theme';

interface AuthorCardProps {
  author: AuthorInfo;
}

export function AuthorCard({ author }: AuthorCardProps) {
  const navigation = useNavigation();

  const handlePress = () => {
    navigation.navigate('AuthorDetail' as never, { authorId: author.id } as never);
  };

  const imageUrl = author.imagePath
    ? apiClient.getAuthorImageUrl(author.id)
    : undefined;

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={handlePress}
    >
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>👤</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {author.name}
        </Text>
        <Text style={styles.bookCount} numberOfLines={1}>
          {author.bookCount} {author.bookCount === 1 ? 'book' : 'books'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 160,
    marginBottom: theme.spacing[4],
  },
  pressed: {
    opacity: 0.7,
  },
  imageContainer: {
    width: 160,
    height: 160,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.neutral[200],
    overflow: 'hidden',
    ...theme.elevation.small,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral[300],
  },
  placeholderText: {
    fontSize: 48,
  },
  info: {
    marginTop: theme.spacing[2],
    alignItems: 'center',
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[1],
    lineHeight: 20,
    textAlign: 'center',
  },
  bookCount: {
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
});
