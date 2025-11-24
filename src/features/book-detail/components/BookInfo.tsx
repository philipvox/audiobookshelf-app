import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LibraryItem } from '@/core/types';

interface BookInfoProps {
  book: LibraryItem;
}

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return 'Unknown';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function BookInfo({ book }: BookInfoProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const metadata = book.media.metadata;
  const duration = book.media.duration || 0;
  const description = metadata.description || '';
  const publishedYear = metadata.publishedYear || null;
  const genres = metadata.genres || [];
  const series = metadata.series?.[0];
  const needsExpansion = description.length > 200;
  const displayDescription = needsExpansion && !isExpanded ? description.substring(0, 200) + '...' : description;

  return (
    <View style={styles.container}>
      <View style={styles.metadataGrid}>
        <View style={styles.metadataItem}>
          <Text style={styles.metadataLabel}>Duration</Text>
          <Text style={styles.metadataValue}>{formatDuration(duration)}</Text>
        </View>
        {publishedYear && (
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Published</Text>
            <Text style={styles.metadataValue}>{publishedYear}</Text>
          </View>
        )}
        {series && (
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Series</Text>
            <Text style={styles.metadataValue} numberOfLines={1}>
              {series.name}{series.sequence && ` #${series.sequence}`}
            </Text>
          </View>
        )}
      </View>
      {genres.length > 0 && (
        <View style={styles.genresContainer}>
          {genres.slice(0, 3).map((genre, index) => (
            <View key={index} style={styles.genreTag}><Text style={styles.genreText}>{genre}</Text></View>
          ))}
          {genres.length > 3 && <View style={styles.genreTag}><Text style={styles.genreText}>+{genres.length - 3}</Text></View>}
        </View>
      )}
      {description && (
        <View style={styles.descriptionContainer}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{displayDescription}</Text>
          {needsExpansion && (
            <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
              <Text style={styles.readMoreButton}>{isExpanded ? 'Read Less' : 'Read More'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#FFFFFF' },
  metadataGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  metadataItem: { width: '33%', marginBottom: 12 },
  metadataLabel: { fontSize: 12, color: '#888888', marginBottom: 4, textTransform: 'uppercase' },
  metadataValue: { fontSize: 16, color: '#333333', fontWeight: '600' },
  genresContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  genreTag: { backgroundColor: '#E3F2FD', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8, marginBottom: 8 },
  genreText: { fontSize: 12, color: '#1976D2', fontWeight: '500' },
  descriptionContainer: { marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333333', marginBottom: 12 },
  description: { fontSize: 15, color: '#666666', lineHeight: 24 },
  readMoreButton: { fontSize: 14, color: '#007AFF', fontWeight: '600', marginTop: 8 },
});
