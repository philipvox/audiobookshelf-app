// File: src/features/book-detail/screens/BookDetailScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Image,
  Dimensions,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useBookDetails } from '../hooks/useBookDetails';
import { OverviewTab } from '../components/OverviewTab';
import { ChaptersTab } from '../components/ChaptersTab';
import { LoadingSpinner, ErrorView } from '@/shared/components';
import { Icon } from '@/shared/components/Icon';
import { apiClient } from '@/core/api';
import { usePlayerStore } from '@/features/player';
import { theme } from '@/shared/theme';

type BookDetailRouteParams = {
  BookDetail: { bookId: string };
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const COVER_SIZE = SCREEN_WIDTH * 0.38;

type TabType = 'overview' | 'chapters' | 'details';

export function BookDetailScreen() {
  const route = useRoute<RouteProp<BookDetailRouteParams, 'BookDetail'>>();
  const navigation = useNavigation();
  const { bookId } = route.params;
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  const { book, isLoading, error, refetch } = useBookDetails(bookId);
  const { loadBook } = usePlayerStore();

  if (isLoading) {
    return <LoadingSpinner text="Loading book details..." />;
  }

  if (error || !book) {
    return <ErrorView message="Failed to load book details" onRetry={refetch} />;
  }

  const metadata = book.media.metadata as any;
  const title = metadata.title || 'Unknown Title';
  const author = metadata.authorName || 'Unknown Author';
  const rawNarrator = metadata.narratorName || '';
  const narrator = rawNarrator.replace(/^Narrated by\s*/i, '').trim() || null;
  const genres = metadata.genres || [];
  const coverUrl = apiClient.getItemCoverUrl(book.id);
  const chapters = book.media.chapters || [];
  const currentPosition = book.userMediaProgress?.currentTime || 0;
  
  let duration = book.media.duration || 0;
  if (!duration && book.media.audioFiles?.length) {
    duration = book.media.audioFiles.reduce((sum: number, f: any) => sum + (f.duration || 0), 0);
  }
  
  const progress = book.userMediaProgress?.progress || 0;
  const hasProgress = progress > 0 && progress < 1;

  const handlePlay = async () => {
    try {
      await loadBook(book);
    } catch (err) {
      console.error('Failed to start playback:', err);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const playButtonText = hasProgress ? 'Continue' : 'Play Now';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={22} color={theme.colors.text.primary} set="ionicons" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Details</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Icon name="heart-outline" size={22} color={theme.colors.primary[500]} set="ionicons" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Top Section - Cover + Info */}
        <View style={styles.topSection}>
          {/* Square Cover - no play button */}
          <View style={styles.coverContainer}>
            <Image source={{ uri: coverUrl }} style={styles.cover} resizeMode="cover" />
          </View>

          {/* Info Side */}
          <View style={styles.infoSide}>
            <Text style={styles.title} numberOfLines={3}>{title}</Text>
            <Text style={styles.authorLabel}>
              Author: <Text style={styles.authorName}>{author}</Text>
            </Text>
            {narrator && (
              <Text style={styles.narratorLabel}>
                Narrator: <Text style={styles.narratorName}>{narrator}</Text>
              </Text>
            )}

            {/* Tags */}
            {genres.length > 0 && (
              <View style={styles.tagsSection}>
                <Text style={styles.tagsLabel}>Tags</Text>
                <View style={styles.tagsRow}>
                  {genres.slice(0, 2).map((genre: string, idx: number) => (
                    <View key={idx} style={styles.tag}>
                      <Text style={styles.tagText}>#{genre.toLowerCase()}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{formatDuration(duration)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Chapters</Text>
            <Text style={styles.statValue}>{chapters.length}</Text>
          </View>
          <TouchableOpacity style={styles.playNowButton} onPress={handlePlay}>
            <Text style={styles.playNowText}>{playButtonText}</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'chapters' && styles.tabActive]}
            onPress={() => setActiveTab('chapters')}
          >
            <Text style={[styles.tabText, activeTab === 'chapters' && styles.tabTextActive]}>
              Chapters ({chapters.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'details' && styles.tabActive]}
            onPress={() => setActiveTab('details')}
          >
            <Text style={[styles.tabText, activeTab === 'details' && styles.tabTextActive]}>
              Details
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'overview' && <OverviewTab book={book} />}
          {activeTab === 'chapters' && <ChaptersTab chapters={chapters} currentPosition={currentPosition} />}
          {activeTab === 'details' && <OverviewTab book={book} showFullDetails />}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  topSection: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[2],
    paddingBottom: theme.spacing[4],
  },
  coverContainer: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: theme.radius.large,
    overflow: 'hidden',
    backgroundColor: theme.colors.neutral[200],
    ...theme.elevation.medium,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  infoSide: {
    flex: 1,
    marginLeft: theme.spacing[4],
    paddingTop: theme.spacing[1],
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[2],
    lineHeight: 24,
  },
  authorLabel: {
    fontSize: 13,
    color: theme.colors.text.tertiary,
    marginBottom: theme.spacing[1],
  },
  authorName: {
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  narratorLabel: {
    fontSize: 13,
    color: theme.colors.text.tertiary,
    marginBottom: theme.spacing[3],
  },
  narratorName: {
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  tagsSection: {
    marginTop: 'auto',
  },
  tagsLabel: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginBottom: theme.spacing[1],
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
  },
  tag: {
    backgroundColor: theme.colors.neutral[100],
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.radius.full,
  },
  tagText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[5],
    paddingBottom: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  statItem: {
    marginRight: theme.spacing[6],
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginBottom: theme.spacing[1],
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  playNowButton: {
    marginLeft: 'auto',
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing[6],
    paddingVertical: theme.spacing[3],
    borderRadius: theme.radius.full,
  },
  playNowText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  tab: {
    paddingVertical: theme.spacing[3],
    marginRight: theme.spacing[5],
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.text.primary,
  },
  tabText: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  tabContent: {
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[8],
  },
});