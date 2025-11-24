import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LibraryItem } from '@/core/types';
import { apiClient } from '@/core/api';
import { theme } from '@/shared/theme';

interface SearchResultItemProps {
  item: LibraryItem;
}

export function SearchResultItem({ item }: SearchResultItemProps) {
  const navigation = useNavigation();
  const metadata = item.media.metadata;
  const title = metadata.title || 'Unknown Title';
  const author = metadata.authors && metadata.authors.length > 0 ? metadata.authors[0].name : 'Unknown Author';
  const narrator = metadata.narrators && metadata.narrators.length > 0 ? metadata.narrators[0] : null;
  const series = metadata.series?.[0];
  const coverUrl = apiClient.getItemCoverUrl(item.id);

  const handlePress = () => {
    navigation.navigate('BookDetail' as never, { bookId: item.id } as never);
  };

  return (
    <Pressable style={({ pressed }) => [styles.container, pressed && styles.pressed]} onPress={handlePress}>
      <Image source={{ uri: coverUrl }} style={styles.cover} resizeMode="cover" />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <Text style={styles.author} numberOfLines={1}>{author}</Text>
        {narrator && <Text style={styles.meta} numberOfLines={1}>Narrated by {narrator}</Text>}
        {series && <Text style={styles.meta} numberOfLines={1}>{series.name}{series.sequence && ` #${series.sequence}`}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', padding: theme.spacing[4], backgroundColor: theme.colors.background.primary },
  pressed: { backgroundColor: theme.colors.background.secondary },
  cover: { width: 60, height: 90, borderRadius: theme.radius.medium, backgroundColor: theme.colors.neutral[200] },
  info: { flex: 1, marginLeft: theme.spacing[4], justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '600', color: theme.colors.text.primary, marginBottom: theme.spacing[1] },
  author: { fontSize: 14, color: theme.colors.text.secondary, marginBottom: theme.spacing[1] },
  meta: { fontSize: 12, color: theme.colors.text.tertiary, marginTop: theme.spacing[1] / 2 },
});
