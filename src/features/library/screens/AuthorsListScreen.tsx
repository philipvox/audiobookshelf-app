/**
 * src/features/library/screens/AuthorsListScreen.tsx
 *
 * Browse all authors from the library.
 * Uses library cache for instant loading.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLibraryCache, getAllAuthors } from '@/core/cache';
import { Icon } from '@/shared/components/Icon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BG_COLOR = '#000000';
const CARD_COLOR = '#2a2a2a';
const ACCENT = '#CCFF00';
const PADDING = 16;
const GAP = 10;
const COLUMNS = 3;
const CARD_WIDTH = (SCREEN_WIDTH - PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
const AVATAR_SIZE = CARD_WIDTH * 0.6;

type SortType = 'name' | 'bookCount';
type SortDirection = 'asc' | 'desc';

export function AuthorsListScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [sortBy, setSortBy] = useState<SortType>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { refreshCache, isLoaded } = useLibraryCache();

  const allAuthors = useMemo(() => getAllAuthors(), [isLoaded]);

  const sortedAuthors = useMemo(() => {
    const sorted = [...allAuthors];
    const direction = sortDirection === 'asc' ? 1 : -1;

    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => direction * a.name.localeCompare(b.name));
        break;
      case 'bookCount':
        sorted.sort((a, b) => direction * (a.bookCount - b.bookCount));
        break;
    }

    return sorted;
  }, [allAuthors, sortBy, sortDirection]);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main');
    }
  };

  const handleAuthorPress = (authorName: string) => {
    navigation.navigate('AuthorDetail', { authorName });
  };

  const handleSortPress = (type: SortType) => {
    if (sortBy === type) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(type);
      setSortDirection('asc');
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshCache();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshCache]);

  const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  if (!isLoaded) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={BG_COLOR} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG_COLOR} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
          <Icon name="chevron-back" size={24} color="#FFFFFF" set="ionicons" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Authors</Text>
        <View style={styles.headerButton} />
      </View>

      {/* Sort Bar */}
      <View style={styles.sortBar}>
        <Text style={styles.resultCount}>{sortedAuthors.length} authors</Text>
        <View style={styles.sortButtons}>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'name' && styles.sortButtonActive]}
            onPress={() => handleSortPress('name')}
          >
            <Icon
              name={sortBy === 'name' ? (sortDirection === 'asc' ? 'arrow-up' : 'arrow-down') : 'swap-vertical'}
              size={14}
              color={sortBy === 'name' ? '#000' : 'rgba(255,255,255,0.6)'}
              set="ionicons"
            />
            <Text style={[styles.sortButtonText, sortBy === 'name' && styles.sortButtonTextActive]}>
              {sortBy === 'name' ? (sortDirection === 'asc' ? 'A-Z' : 'Z-A') : 'Name'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'bookCount' && styles.sortButtonActive]}
            onPress={() => handleSortPress('bookCount')}
          >
            <Icon
              name={sortBy === 'bookCount' ? (sortDirection === 'asc' ? 'arrow-up' : 'arrow-down') : 'library-outline'}
              size={14}
              color={sortBy === 'bookCount' ? '#000' : 'rgba(255,255,255,0.6)'}
              set="ionicons"
            />
            <Text style={[styles.sortButtonText, sortBy === 'bookCount' && styles.sortButtonTextActive]}>Books</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.grid, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={ACCENT}
          />
        }
      >
        {sortedAuthors.map((author) => (
          <TouchableOpacity
            key={author.name}
            style={styles.authorCard}
            onPress={() => handleAuthorPress(author.name)}
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(author.name)}</Text>
            </View>
            <Text style={styles.authorName} numberOfLines={2}>{author.name}</Text>
            <Text style={styles.bookCount}>{author.bookCount} books</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
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
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
  },
  sortBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: PADDING,
    paddingBottom: 12,
  },
  resultCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: CARD_COLOR,
  },
  sortButtonActive: {
    backgroundColor: ACCENT,
  },
  sortButtonText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#000',
  },
  content: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: PADDING,
    gap: GAP,
  },
  authorCard: {
    width: CARD_WIDTH,
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: AVATAR_SIZE * 0.35,
    fontWeight: '700',
    color: '#000',
  },
  authorName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  bookCount: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
});
