/**
 * Book detail screen - redesigned with proper back button and SafeAreaView
 */

import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useBookDetails } from '../hooks/useBookDetails';
import { BookHeader } from '../components/BookHeader';
import { BookInfo } from '../components/BookInfo';
import { ChapterList } from '../components/ChapterList';
import { BookActions } from '../components/BookActions';
import { LoadingSpinner, ErrorView } from '@/shared/components';
import { Icon } from '@/shared/components/Icon';
import { theme } from '@/shared/theme';

type BookDetailRouteParams = {
  BookDetail: {
    bookId: string;
  };
};

type BookDetailRouteProp = RouteProp<BookDetailRouteParams, 'BookDetail'>;

export function BookDetailScreen() {
  const route = useRoute<BookDetailRouteProp>();
  const navigation = useNavigation();
  const { bookId } = route.params;
  
  const { book, isLoading, error, refetch } = useBookDetails(bookId);

  if (isLoading) {
    return <LoadingSpinner text="Loading book details..." />;
  }

  if (error || !book) {
    return (
      <ErrorView
        message="Failed to load book details"
        onRetry={refetch}
      />
    );
  }

  const chapters = book.media.chapters || [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background.primary} />
      
      {/* Custom Header with Back Button */}
      <View style={styles.headerBar}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="chevron-back" size={24} color={theme.colors.text.primary} set="ionicons" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <BookHeader book={book} />
        <BookActions book={book} />
        <BookInfo book={book} />
        <ChapterList chapters={chapters} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  headerBar: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
    backgroundColor: theme.colors.background.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.elevation.small,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: theme.spacing[24], // Space for mini player
  },
});