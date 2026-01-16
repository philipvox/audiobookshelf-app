/**
 * src/features/browse/components/BrowseGridItem.tsx
 *
 * Individual item in the browse category grid.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { secretLibraryColors as staticColors, secretLibraryFonts } from '@/shared/theme/secretLibrary';
import { Icon } from '@/shared/components/Icon';
import { scale, useSecretLibraryColors } from '@/shared/theme';

export type BrowseItemType = 'genres' | 'narrators' | 'series' | 'duration';

interface BrowseGridItemProps {
  type: BrowseItemType;
  title: string;
  count: string;
  iconName: string;
  onPress?: () => void;
}

function BrowseGridItemComponent({
  type,
  title,
  count,
  iconName,
  onPress,
}: BrowseGridItemProps) {
  // Theme-aware colors
  const colors = useSecretLibraryColors();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: colors.white },
        pressed && { backgroundColor: colors.cream },
      ]}
      onPress={onPress}
    >
      <View style={styles.iconContainer}>
        <Icon name={iconName} size={24} color={colors.black} strokeWidth={1.5} />
      </View>
      <Text style={[styles.title, { color: colors.black }]}>{title}</Text>
      <Text style={[styles.count, { color: colors.gray }]}>{count}</Text>
    </Pressable>
  );
}

export const BrowseGridItem = memo(BrowseGridItemComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.white,
    padding: 24,
    paddingHorizontal: 16,
    minHeight: scale(100),
  },
  iconContainer: {
    width: 24,
    height: 24,
    marginBottom: 16,
  },
  title: {
    fontFamily: secretLibraryFonts.playfair.regular,
    fontSize: scale(15),
    color: staticColors.black,
    marginBottom: 4,
  },
  count: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(9),
    color: staticColors.gray,
  },
});
