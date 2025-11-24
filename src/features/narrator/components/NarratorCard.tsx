import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NarratorInfo } from '../hooks/useNarrators';
import { Icon } from '@/shared/components/Icon';
import { theme } from '@/shared/theme';

interface NarratorCardProps {
  narrator: NarratorInfo;
}

export function NarratorCard({ narrator }: NarratorCardProps) {
  const navigation = useNavigation();

  const handlePress = () => {
    navigation.navigate('NarratorDetail' as never, { narratorId: narrator.id, narratorName: narrator.name } as never);
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={handlePress}
    >
      <View style={styles.avatar}>
        <Icon name="mic" size={28} color={theme.colors.text.tertiary} set="ionicons" />
      </View>
      <Text style={styles.name} numberOfLines={2}>{narrator.name}</Text>
      <Text style={styles.bookCount}>
        {narrator.bookCount} {narrator.bookCount === 1 ? 'book' : 'books'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '48%',
    marginBottom: theme.spacing[4],
    backgroundColor: theme.colors.background.elevated,
    borderRadius: theme.radius.lg,
    padding: theme.spacing[3],
    alignItems: 'center',
    ...theme.elevation.small,
  },
  pressed: {
    opacity: 0.7,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing[1],
    lineHeight: 18,
  },
  bookCount: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
});