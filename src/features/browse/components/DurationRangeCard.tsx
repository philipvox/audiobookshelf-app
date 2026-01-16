/**
 * src/features/browse/components/DurationRangeCard.tsx
 *
 * Duration range selection card.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { secretLibraryColors as staticColors, secretLibraryFonts } from '@/shared/theme/secretLibrary';
import { Icon } from '@/shared/components/Icon';
import { scale, useSecretLibraryColors } from '@/shared/theme';

interface DurationRangeCardProps {
  label: string;
  description: string;
  bookCount: number;
  onPress?: () => void;
}

function DurationRangeCardComponent({
  label,
  description,
  bookCount,
  onPress,
}: DurationRangeCardProps) {
  // Theme-aware colors
  const colors = useSecretLibraryColors();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: colors.white, borderBottomColor: colors.grayLine },
        pressed && { backgroundColor: colors.cream },
      ]}
      onPress={onPress}
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: colors.grayLight }]}>
          <Icon name="Clock" size={20} color={colors.black} strokeWidth={1.5} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.label, { color: colors.black }]}>{label}</Text>
          <Text style={[styles.description, { color: colors.gray }]}>{description}</Text>
        </View>
        <View style={styles.countContainer}>
          <Text style={[styles.count, { color: colors.black }]}>{bookCount}</Text>
          <Text style={[styles.countLabel, { color: colors.gray }]}>books</Text>
        </View>
      </View>
      <Icon name="chevron-right" size={16} color={colors.gray} strokeWidth={1.5} />
    </Pressable>
  );
}

export const DurationRangeCard = memo(DurationRangeCardComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: staticColors.white,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.grayLine,
    minHeight: scale(72),
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: staticColors.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontFamily: secretLibraryFonts.playfair.regular,
    fontSize: scale(16),
    color: staticColors.black,
    marginBottom: 2,
  },
  description: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(10),
    color: staticColors.gray,
  },
  countContainer: {
    alignItems: 'flex-end',
  },
  count: {
    fontFamily: secretLibraryFonts.playfair.regularItalic,
    fontSize: scale(24),
    fontStyle: 'italic',
    color: staticColors.black,
  },
  countLabel: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(9),
    color: staticColors.gray,
    marginTop: -2,
  },
});
