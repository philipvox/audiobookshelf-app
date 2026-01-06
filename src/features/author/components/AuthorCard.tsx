/**
 * src/features/author/components/AuthorCard.tsx
 *
 * Card displaying author information with book count.
 * Uses theme colors and typography tokens for consistency.
 */

import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { Author } from '@/core/types';
import { apiClient } from '@/core/api';
import {
  spacing,
  radius,
  elevation,
  typography,
  scale,
  interactiveStates,
  cardTokens,
} from '@/shared/theme';
import { useThemeColors } from '@/shared/theme/themeStore';

interface AuthorInfo {
  id: string;
  name: string;
  description?: string;
  imagePath?: string;
  bookCount?: number;
}

interface AuthorCardProps {
  author: AuthorInfo | Author;
}

// Avatar color palette for initials
const AVATAR_COLORS = [
  '#E53935', // Accent red
  '#4CAF50', // Green
  '#FF9800', // Orange
  '#2196F3', // Blue
  '#9C27B0', // Purple
];

function AuthorCardComponent({ author }: AuthorCardProps) {
  const navigation = useNavigation();
  const themeColors = useThemeColors();

  const handlePress = () => {
    (navigation as any).navigate('AuthorDetail', { authorName: author.name });
  };

  const imageUrl = author.imagePath
    ? apiClient.getAuthorImageUrl(author.id)
    : undefined;

  // Generate initials for avatar
  const initials = author.name
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Generate a consistent color based on name
  const colorIndex = author.name.charCodeAt(0) % AVATAR_COLORS.length;
  const avatarColor = AVATAR_COLORS[colorIndex];

  const bookCount = (author as AuthorInfo).bookCount;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && { opacity: interactiveStates.press.opacity },
      ]}
      onPress={handlePress}
    >
      <View
        style={[
          styles.avatarContainer,
          { backgroundColor: themeColors.backgroundSecondary },
        ]}
      >
        {imageUrl ? (
          <Image
            source={imageUrl}
            style={styles.avatar}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View
            style={[
              styles.avatar,
              styles.initialsAvatar,
              { backgroundColor: avatarColor },
            ]}
          >
            <Text style={styles.initials}>{initials}</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text
          style={[styles.name, { color: themeColors.text }]}
          numberOfLines={2}
        >
          {author.name}
        </Text>
        {bookCount !== undefined && bookCount > 0 && (
          <Text style={[styles.bookCount, { color: themeColors.textSecondary }]}>
            {bookCount} {bookCount === 1 ? 'book' : 'books'}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

// Memoize to prevent unnecessary re-renders in lists
export const AuthorCard = memo(AuthorCardComponent);

const styles = StyleSheet.create({
  container: {
    width: '48%',
    marginBottom: spacing.md,
  },
  avatarContainer: {
    aspectRatio: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...elevation.small,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  initialsAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontSize: scale(36),
    fontWeight: '700',
    color: '#FFFFFF', // Always white on colored background
  },
  info: {
    marginTop: spacing.xs,
  },
  name: {
    ...typography.headlineMedium,
    marginBottom: spacing.xxs,
  },
  bookCount: {
    ...typography.bodySmall,
  },
});
