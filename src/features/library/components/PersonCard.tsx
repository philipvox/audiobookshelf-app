/**
 * src/features/library/components/PersonCard.tsx
 *
 * Card component for authors and narrators.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { User, Mic } from 'lucide-react-native';
import { scale, spacing } from '@/shared/theme';
import { useThemeColors } from '@/shared/theme/themeStore';

interface PersonCardProps {
  name: string;
  imageUrl?: string;
  bookCount: number;
  type: 'author' | 'narrator';
  onPress: () => void;
}

export const PersonCard = React.memo(function PersonCard({
  name,
  imageUrl,
  bookCount,
  type,
  onPress,
}: PersonCardProps) {
  const themeColors = useThemeColors();
  const Icon = type === 'author' ? User : Mic;
  const typeLabel = type === 'author' ? '' : ', narrator';

  return (
    <TouchableOpacity
      style={styles.personCard}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={`${name}${typeLabel}, ${bookCount} book${bookCount !== 1 ? 's' : ''}`}
      accessibilityRole="button"
      accessibilityHint={`Double tap to view ${type}`}
    >
      <View style={[styles.personAvatar, { backgroundColor: themeColors.border }]}>
        {imageUrl ? (
          <Image source={imageUrl} style={styles.personImage} contentFit="cover" />
        ) : (
          <Icon size={scale(24)} color={themeColors.textSecondary} strokeWidth={1.5} />
        )}
      </View>
      <Text style={[styles.personName, { color: themeColors.text }]} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[styles.personMeta, { color: themeColors.textSecondary }]}>
        {bookCount} book{bookCount !== 1 ? 's' : ''}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  personCard: {
    alignItems: 'center',
    width: scale(90),
  },
  personAvatar: {
    width: scale(70),
    height: scale(70),
    borderRadius: scale(35),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(8),
    overflow: 'hidden',
  },
  personImage: {
    width: '100%',
    height: '100%',
  },
  personName: {
    fontSize: scale(13),
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 2,
  },
  personMeta: {
    fontSize: scale(11),
    textAlign: 'center',
  },
});

export default PersonCard;
