/**
 * src/features/browse/components/AuthorsTextList.tsx
 *
 * Top Authors section with flowing text and book counts as superscript.
 * Displayed on a cream background.
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { secretLibraryColors as staticColors, secretLibraryFonts } from '@/shared/theme/secretLibrary';
import { useTopAuthors } from '../hooks/useTopAuthors';
import { scale, useSecretLibraryColors } from '@/shared/theme';

interface AuthorsTextListProps {
  onAuthorPress?: (authorName: string) => void;
  onViewAll?: () => void;
}

export function AuthorsTextList({ onAuthorPress, onViewAll }: AuthorsTextListProps) {
  // Theme-aware colors
  const colors = useSecretLibraryColors();

  const authors = useTopAuthors(10);

  const handleAuthorPress = useCallback(
    (name: string) => {
      onAuthorPress?.(name);
    },
    [onAuthorPress]
  );

  if (authors.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.cream }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.black }]}>Top Authors</Text>
        <Pressable onPress={onViewAll}>
          <Text style={[styles.link, { color: colors.black }]}>View All</Text>
        </Pressable>
      </View>

      {/* Authors flowing text */}
      <Text style={[styles.textFlow, { color: colors.black }]}>
        {authors.map((author, index) => (
          <Text key={author.name}>
            <Text
              style={styles.authorName}
              onPress={() => handleAuthorPress(author.name)}
            >
              {author.name}
            </Text>
            <Text style={[styles.countSuperscript, { color: colors.gray }]}>{author.count}</Text>
            {index < authors.length - 1 && <Text> </Text>}
          </Text>
        ))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: staticColors.cream, // #FAF8F5
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 24,
  },
  title: {
    fontFamily: secretLibraryFonts.playfair.regular,
    fontSize: scale(20),
    color: staticColors.black,
  },
  link: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(9),
    textTransform: 'uppercase',
    letterSpacing: 0.9, // 0.1em at 9px
    color: staticColors.black,
    textDecorationLine: 'underline',
    textDecorationStyle: 'solid',
  },
  textFlow: {
    fontFamily: secretLibraryFonts.playfair.regular,
    fontSize: scale(22),
    color: staticColors.black,
    lineHeight: scale(22) * 1.6,
  },
  authorName: {
    // Inherits from textFlow, pressable
  },
  countSuperscript: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(8),
    fontWeight: '400',
    color: staticColors.gray,
  },
});
