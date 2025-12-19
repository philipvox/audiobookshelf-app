/**
 * src/features/reading-history-wizard/screens/MarkBooksScreen.tsx
 *
 * Hierarchical swipe interface for marking books as finished.
 * Flow: Authors/Series → Series (if author) → Books
 * Swipe right = yes/mark, swipe left = skip
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useGalleryStore } from '../stores/galleryStore';
import { useLibraryCache, getAllAuthors, getAllSeries } from '@/core/cache/libraryCache';
import { useQueueStore } from '@/features/queue/stores/queueStore';
import { getCoverUrl } from '@/core/cache';
import { LibraryItem } from '@/core/types';
import { colors, scale, spacing } from '@/shared/theme';

const ACCENT = colors.accent;
const SCREEN_WIDTH = 340;
const CARD_WIDTH = scale(280);
const CARD_HEIGHT = scale(280); // Square cards
const SWIPE_THRESHOLD = 100;

// Types
type CardType = 'author' | 'series' | 'book';
type ViewLevel = 'top' | 'author-series' | 'series-books' | 'author-books';

interface CardData {
  type: CardType;
  id: string;
  title: string;
  subtitle?: string;
  count?: number;
  coverUrl?: string | null;
  bookIds?: string[];
  seriesNames?: string[];
  unmarkedCount?: number;
}

type TabView = 'books' | 'authors' | 'series';

interface UndoEntry {
  action: 'mark' | 'skip' | 'mark-all';
  cardType: CardType;
  ids: string[];
  title: string;
  level: ViewLevel;
  context?: string; // For breadcrumb restoration
}

// Helper to get metadata
function getMetadata(item: LibraryItem): any {
  return (item.media?.metadata as any) || {};
}

function getTitle(item: LibraryItem): string {
  return getMetadata(item).title || 'Unknown Title';
}

function getAuthorName(item: LibraryItem): string {
  return getMetadata(item).authorName || '';
}

function getSeriesName(item: LibraryItem): string {
  const name = getMetadata(item).seriesName || '';
  return name.replace(/\s*#[\d.]+$/, '').trim();
}

const SWIPE_UP_THRESHOLD = 80;

// Swipeable Card Component
function SwipeableCard({
  card,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
}: {
  card: CardData;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeUp?: () => void;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);

  const handleSwipeComplete = useCallback(
    (direction: 'left' | 'right' | 'up') => {
      if (direction === 'right') {
        onSwipeRight();
      } else if (direction === 'up') {
        onSwipeUp?.();
      } else {
        onSwipeLeft();
      }
    },
    [onSwipeLeft, onSwipeRight, onSwipeUp]
  );

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      'worklet';
      // Prioritize vertical swipe if moving mostly up
      const isSwipingUp = event.translationY < -30 && Math.abs(event.translationY) > Math.abs(event.translationX);
      if (isSwipingUp) {
        translateY.value = event.translationY;
        translateX.value = 0;
        rotation.value = 0;
      } else {
        translateX.value = event.translationX;
        translateY.value = event.translationY * 0.3;
        rotation.value = interpolate(
          event.translationX,
          [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
          [-12, 0, 12],
          Extrapolation.CLAMP
        );
      }
    })
    .onEnd((event) => {
      'worklet';
      // Check for swipe up first (add to queue)
      if (event.translationY < -SWIPE_UP_THRESHOLD && Math.abs(event.translationY) > Math.abs(event.translationX)) {
        translateY.value = withTiming(-500, { duration: 250 });
        runOnJS(handleSwipeComplete)('up');
      } else if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 250 });
        runOnJS(handleSwipeComplete)('right');
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 250 });
        runOnJS(handleSwipeComplete)('left');
      } else {
        translateX.value = withSpring(0, { damping: 15 });
        translateY.value = withSpring(0, { damping: 15 });
        rotation.value = withSpring(0, { damping: 15 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const rightOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  const leftOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }));

  const upOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [-SWIPE_UP_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }));

  const getIcon = () => {
    switch (card.type) {
      case 'author': return 'person';
      case 'series': return 'library';
      case 'book': return 'book';
    }
  };

  const getActionText = () => {
    switch (card.type) {
      case 'author': return 'VIEW BOOKS';
      case 'series': return 'VIEW SERIES';
      case 'book': return 'FINISHED';
    }
  };

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, cardStyle]}>
        {/* Cover/Icon */}
        {card.coverUrl ? (
          <Image source={card.coverUrl} style={styles.cardCover} contentFit="cover" />
        ) : (
          <View style={[styles.cardCover, styles.cardCoverPlaceholder]}>
            <Ionicons name={getIcon()} size={scale(80)} color="rgba(255,255,255,0.3)" />
          </View>
        )}

        {/* Gradient */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.95)']}
          style={styles.cardGradient}
        />

        {/* Info */}
        <View style={styles.cardInfo}>
          {/* Type badge */}
          <View style={[styles.typeBadge, card.type === 'author' && styles.authorBadge, card.type === 'series' && styles.seriesBadge]}>
            <Ionicons name={getIcon()} size={scale(12)} color="#fff" />
            <Text style={styles.typeBadgeText}>{card.type.toUpperCase()}</Text>
          </View>

          <Text style={styles.cardTitle} numberOfLines={2}>{card.title}</Text>
          {card.subtitle && (
            <Text style={styles.cardSubtitle} numberOfLines={1}>{card.subtitle}</Text>
          )}
          {card.count !== undefined && (
            <Text style={styles.cardCount}>
              {card.count} {card.type === 'author' ? (card.seriesNames?.length ? 'series' : 'books') : 'books'}
            </Text>
          )}
        </View>

        {/* Swipe overlays */}
        <Animated.View style={[styles.overlay, styles.rightOverlay, rightOverlayStyle]}>
          <View style={styles.overlayBadge}>
            <Ionicons name="checkmark" size={scale(36)} color="#000" />
            <Text style={styles.overlayText}>{getActionText()}</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.overlay, styles.leftOverlay, leftOverlayStyle]}>
          <View style={[styles.overlayBadge, styles.skipBadge]}>
            <Ionicons name="close" size={scale(36)} color="#fff" />
            <Text style={[styles.overlayText, styles.skipText]}>SKIP</Text>
          </View>
        </Animated.View>

        {/* Swipe up overlay - only for books */}
        {card.type === 'book' && (
          <Animated.View style={[styles.overlay, styles.upOverlay, upOverlayStyle]}>
            <View style={[styles.overlayBadge, styles.queueBadge]}>
              <Ionicons name="add" size={scale(36)} color="#fff" />
              <Text style={[styles.overlayText, styles.queueText]}>ADD TO QUEUE</Text>
            </View>
          </Animated.View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

export function MarkBooksScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  // Library data
  const items = useLibraryCache((s) => s.items);

  // Gallery store
  const markBook = useGalleryStore((s) => s.markBook);
  const unmarkBook = useGalleryStore((s) => s.unmarkBook);
  const markedBooks = useGalleryStore((s) => s.markedBooks);
  const startSession = useGalleryStore((s) => s.startSession);
  const endSession = useGalleryStore((s) => s.endSession);
  const processedAuthors = useGalleryStore((s) => s.processedAuthors);
  const processedSeries = useGalleryStore((s) => s.processedSeries);
  const markAuthorProcessed = useGalleryStore((s) => s.markAuthorProcessed);
  const markSeriesProcessed = useGalleryStore((s) => s.markSeriesProcessed);

  // Queue store
  const addToQueue = useQueueStore((s) => s.addToQueue);

  // Books added to queue this session
  const [queuedBooks, setQueuedBooks] = useState<Set<string>>(new Set());

  // Navigation state
  const [viewLevel, setViewLevel] = useState<ViewLevel>('top');
  const [currentAuthor, setCurrentAuthor] = useState<string | null>(null);
  const [currentSeries, setCurrentSeries] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabView>('books');

  // Skipped items
  const [skippedAuthors, setSkippedAuthors] = useState<Set<string>>(new Set());
  const [skippedSeries, setSkippedSeries] = useState<Set<string>>(new Set());
  const [skippedBooks, setSkippedBooks] = useState<Set<string>>(new Set());

  // Undo history (unlimited for session)
  const [undoHistory, setUndoHistory] = useState<UndoEntry[]>([]);

  // Get authors with their series
  const authorsData = useMemo(() => {
    const authors = getAllAuthors();
    return authors.map((author) => {
      // Find series for this author
      const authorBooks = author.books;
      const seriesSet = new Set<string>();
      authorBooks.forEach((book) => {
        const series = getSeriesName(book);
        if (series) seriesSet.add(series);
      });
      return {
        ...author,
        seriesNames: Array.from(seriesSet),
      };
    }).filter((a) => a.books.length > 0);
  }, []);

  // Calculate author affinity scores based on marked books
  // Authors with more marked books get higher priority
  const authorAffinityScores = useMemo(() => {
    const scores: Record<string, number> = {};

    // Count marked books per author
    markedBooks.forEach((_, bookId) => {
      const item = items.find((i) => i.id === bookId);
      if (item) {
        const authorName = getAuthorName(item);
        if (authorName) {
          scores[authorName] = (scores[authorName] || 0) + 1;
        }
      }
    });

    return scores;
  }, [markedBooks, items]);

  // Get all series
  const seriesData = useMemo(() => getAllSeries(), []);

  // Calculate series affinity scores based on marked books
  const seriesAffinityScores = useMemo(() => {
    const scores: Record<string, number> = {};

    markedBooks.forEach((_, bookId) => {
      const item = items.find((i) => i.id === bookId);
      if (item) {
        const seriesName = getSeriesName(item);
        if (seriesName) {
          scores[seriesName] = (scores[seriesName] || 0) + 1;
        }
      }
    });

    return scores;
  }, [markedBooks, items]);

  // Build cards based on current view level
  const cards = useMemo((): CardData[] => {
    if (viewLevel === 'top') {
      if (activeTab === 'books') {
        // Books tab - show all individual books
        const bookCards: CardData[] = items
          .filter((book) => !skippedBooks.has(book.id) && !markedBooks.has(book.id))
          .map((book) => {
            const authorName = getAuthorName(book);
            const seriesName = getSeriesName(book);
            return {
              type: 'book' as CardType,
              id: book.id,
              title: getTitle(book),
              subtitle: authorName || undefined,
              coverUrl: getCoverUrl(book.id),
              // Store author/series for sorting
              _authorName: authorName,
              _seriesName: seriesName,
            } as CardData & { _authorName?: string; _seriesName?: string };
          });

        // Smart sort: prioritize books by authors/series you've been marking
        return bookCards.sort((a, b) => {
          const aExt = a as CardData & { _authorName?: string; _seriesName?: string };
          const bExt = b as CardData & { _authorName?: string; _seriesName?: string };

          // Calculate combined affinity score (author + series)
          const authorAffinityA = aExt._authorName ? (authorAffinityScores[aExt._authorName] || 0) : 0;
          const authorAffinityB = bExt._authorName ? (authorAffinityScores[bExt._authorName] || 0) : 0;
          const seriesAffinityA = aExt._seriesName ? (seriesAffinityScores[aExt._seriesName] || 0) : 0;
          const seriesAffinityB = bExt._seriesName ? (seriesAffinityScores[bExt._seriesName] || 0) : 0;

          const totalAffinityA = authorAffinityA + seriesAffinityA;
          const totalAffinityB = authorAffinityB + seriesAffinityB;

          if (totalAffinityA !== totalAffinityB) {
            return totalAffinityB - totalAffinityA;
          }

          // Secondary: sort by title
          return a.title.localeCompare(b.title);
        });
      } else if (activeTab === 'authors') {
        // Show authors
        const authorCards: CardData[] = authorsData
          .filter((a) => !skippedAuthors.has(a.name))
          .map((author) => {
            // Calculate unmarked books count for this author
            const unmarkedBooks = author.books.filter((b) => !markedBooks.has(b.id));
            return {
              type: 'author' as CardType,
              id: author.name,
              title: author.name,
              count: author.seriesNames.length > 0 ? author.seriesNames.length : author.books.length,
              coverUrl: author.books[0] ? getCoverUrl(author.books[0].id) : null,
              bookIds: author.books.map((b) => b.id),
              seriesNames: author.seriesNames,
              unmarkedCount: unmarkedBooks.length,
            };
          })
          // Only show authors with unmarked books
          .filter((a) => a.unmarkedCount > 0);

        // Smart sort: processed items go to back, then by affinity
        return authorCards.sort((a, b) => {
          // Processed authors go to the back
          const aProcessed = processedAuthors.has(a.id);
          const bProcessed = processedAuthors.has(b.id);
          if (aProcessed !== bProcessed) {
            return aProcessed ? 1 : -1;
          }

          // Then by affinity (authors with marked books first)
          const affinityA = authorAffinityScores[a.id] || 0;
          const affinityB = authorAffinityScores[b.id] || 0;
          if (affinityA !== affinityB) {
            return affinityB - affinityA;
          }

          return (b.count || 0) - (a.count || 0);
        });
      } else {
        // Series tab - show all series
        const seriesCards: CardData[] = seriesData
          .filter((s) => !skippedSeries.has(s.name))
          .map((series) => {
            const unmarkedBooks = series.books.filter((b) => !markedBooks.has(b.id));
            return {
              type: 'series' as CardType,
              id: series.name,
              title: series.name,
              subtitle: getAuthorName(series.books[0]) || undefined,
              count: series.books.length,
              coverUrl: series.books[0] ? getCoverUrl(series.books[0].id) : null,
              bookIds: series.books.map((b) => b.id),
              unmarkedCount: unmarkedBooks.length,
            };
          })
          // Only show series with unmarked books
          .filter((s) => s.unmarkedCount > 0);

        // Smart sort: processed items go to back, then by affinity
        return seriesCards.sort((a, b) => {
          // Processed series go to the back
          const aProcessed = processedSeries.has(a.id);
          const bProcessed = processedSeries.has(b.id);
          if (aProcessed !== bProcessed) {
            return aProcessed ? 1 : -1;
          }

          // Then by affinity
          const affinityA = seriesAffinityScores[a.id] || 0;
          const affinityB = seriesAffinityScores[b.id] || 0;
          if (affinityA !== affinityB) {
            return affinityB - affinityA;
          }

          return (b.count || 0) - (a.count || 0);
        });
      }
    }

    if (viewLevel === 'author-series' && currentAuthor) {
      // Show series for current author
      const author = authorsData.find((a) => a.name === currentAuthor);
      if (!author) return [];

      const seriesCards: CardData[] = author.seriesNames
        .filter((s) => !skippedSeries.has(s))
        .map((seriesName) => {
          const seriesInfo = seriesData.find((s) => s.name === seriesName);
          const books = seriesInfo?.books || [];
          return {
            type: 'series' as CardType,
            id: seriesName,
            title: seriesName,
            subtitle: currentAuthor,
            count: books.length,
            coverUrl: books[0] ? getCoverUrl(books[0].id) : null,
            bookIds: books.map((b) => b.id),
          };
        });

      // Also show "Other Books" if author has books not in series
      const booksNotInSeries = author.books.filter((b) => !getSeriesName(b));
      if (booksNotInSeries.length > 0) {
        seriesCards.push({
          type: 'series' as CardType,
          id: `${currentAuthor}-other`,
          title: 'Other Books',
          subtitle: currentAuthor,
          count: booksNotInSeries.length,
          coverUrl: getCoverUrl(booksNotInSeries[0].id),
          bookIds: booksNotInSeries.map((b) => b.id),
        });
      }

      return seriesCards;
    }

    if (viewLevel === 'author-books' && currentAuthor) {
      // Show all books by author (when author has no series)
      const author = authorsData.find((a) => a.name === currentAuthor);
      if (!author) return [];

      return author.books
        .filter((b) => !skippedBooks.has(b.id) && !markedBooks.has(b.id))
        .map((book) => ({
          type: 'book' as CardType,
          id: book.id,
          title: getTitle(book),
          subtitle: currentAuthor,
          coverUrl: getCoverUrl(book.id),
        }));
    }

    if (viewLevel === 'series-books' && currentSeries) {
      // Show books in current series
      const series = seriesData.find((s) => s.name === currentSeries);
      if (!series) {
        // Check for "Other Books" pseudo-series
        if (currentSeries.endsWith('-other') && currentAuthor) {
          const author = authorsData.find((a) => a.name === currentAuthor);
          const booksNotInSeries = author?.books.filter((b) => !getSeriesName(b)) || [];
          return booksNotInSeries
            .filter((b) => !skippedBooks.has(b.id) && !markedBooks.has(b.id))
            .map((book) => ({
              type: 'book' as CardType,
              id: book.id,
              title: getTitle(book),
              subtitle: currentAuthor || undefined,
              coverUrl: getCoverUrl(book.id),
            }));
        }
        return [];
      }

      return series.books
        .filter((b) => !skippedBooks.has(b.id) && !markedBooks.has(b.id))
        .map((book) => ({
          type: 'book' as CardType,
          id: book.id,
          title: getTitle(book),
          subtitle: currentSeries,
          coverUrl: getCoverUrl(book.id),
        }));
    }

    return [];
  }, [viewLevel, activeTab, currentAuthor, currentSeries, items, authorsData, seriesData, skippedAuthors, skippedSeries, skippedBooks, markedBooks, authorAffinityScores, seriesAffinityScores, processedAuthors, processedSeries]);

  const currentCard = cards[0];
  const markedCount = markedBooks.size;

  // Start session on mount
  useEffect(() => {
    startSession();
  }, [startSession]);

  const handleSwipeRight = useCallback(() => {
    if (!currentCard) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (currentCard.type === 'author') {
      const author = authorsData.find((a) => a.name === currentCard.id);
      // Mark as processed when drilling in - goes to back next time
      markAuthorProcessed(currentCard.id);
      if (author?.seriesNames && author.seriesNames.length > 0) {
        // Author has series - drill down
        setUndoHistory((prev) => [...prev, {
          action: 'skip', // Will be used to restore navigation
          cardType: 'author',
          ids: [currentCard.id],
          title: currentCard.title,
          level: viewLevel,
        }]);
        setCurrentAuthor(currentCard.id);
        setBreadcrumb([currentCard.title]);
        setViewLevel('author-series');
      } else {
        // Author has no series - show books directly
        setUndoHistory((prev) => [...prev, {
          action: 'skip',
          cardType: 'author',
          ids: [currentCard.id],
          title: currentCard.title,
          level: viewLevel,
        }]);
        setCurrentAuthor(currentCard.id);
        setBreadcrumb([currentCard.title]);
        setViewLevel('author-books');
      }
    } else if (currentCard.type === 'series') {
      // Mark as processed when drilling in
      markSeriesProcessed(currentCard.id);
      // Drill into series books
      setUndoHistory((prev) => [...prev, {
        action: 'skip',
        cardType: 'series',
        ids: [currentCard.id],
        title: currentCard.title,
        level: viewLevel,
        context: currentAuthor || undefined,
      }]);
      setCurrentSeries(currentCard.id);
      setBreadcrumb((prev) => [...prev, currentCard.title]);
      setViewLevel('series-books');
    } else if (currentCard.type === 'book') {
      // Mark book as finished
      setUndoHistory((prev) => [...prev, {
        action: 'mark',
        cardType: 'book',
        ids: [currentCard.id],
        title: currentCard.title,
        level: viewLevel,
      }]);
      markBook(currentCard.id, 'tap');
    }
  }, [currentCard, authorsData, viewLevel, currentAuthor, markBook, markAuthorProcessed, markSeriesProcessed]);

  const handleSwipeLeft = useCallback(() => {
    if (!currentCard) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setUndoHistory((prev) => [...prev, {
      action: 'skip',
      cardType: currentCard.type,
      ids: [currentCard.id],
      title: currentCard.title,
      level: viewLevel,
    }]);

    if (currentCard.type === 'author') {
      setSkippedAuthors((prev) => new Set(prev).add(currentCard.id));
      markAuthorProcessed(currentCard.id); // Goes to back next time
    } else if (currentCard.type === 'series') {
      setSkippedSeries((prev) => new Set(prev).add(currentCard.id));
      markSeriesProcessed(currentCard.id); // Goes to back next time
    } else {
      setSkippedBooks((prev) => new Set(prev).add(currentCard.id));
    }
  }, [currentCard, viewLevel, markAuthorProcessed, markSeriesProcessed]);

  const handleSwipeUp = useCallback(() => {
    if (!currentCard || currentCard.type !== 'book') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Find the book item
    const item = items.find((i) => i.id === currentCard.id);
    if (item) {
      addToQueue(item);
      setQueuedBooks((prev) => new Set(prev).add(currentCard.id));
    }

    // Skip this book after adding to queue
    setSkippedBooks((prev) => new Set(prev).add(currentCard.id));
  }, [currentCard, items, addToQueue]);

  const handleMarkAll = useCallback(() => {
    if (!currentCard?.bookIds) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const idsToMark = currentCard.bookIds.filter((id) => !markedBooks.has(id));

    setUndoHistory((prev) => [...prev, {
      action: 'mark-all',
      cardType: currentCard.type,
      ids: idsToMark,
      title: currentCard.title,
      level: viewLevel,
    }]);

    idsToMark.forEach((id) => markBook(id, 'tap'));

    // Skip this card after marking all and mark as processed
    if (currentCard.type === 'author') {
      setSkippedAuthors((prev) => new Set(prev).add(currentCard.id));
      markAuthorProcessed(currentCard.id);
    } else if (currentCard.type === 'series') {
      setSkippedSeries((prev) => new Set(prev).add(currentCard.id));
      markSeriesProcessed(currentCard.id);
    }
  }, [currentCard, markedBooks, viewLevel, markBook, markAuthorProcessed, markSeriesProcessed]);

  const handleUndo = useCallback(() => {
    if (undoHistory.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const lastEntry = undoHistory[undoHistory.length - 1];

    if (lastEntry.action === 'mark') {
      lastEntry.ids.forEach((id) => unmarkBook(id));
    } else if (lastEntry.action === 'mark-all') {
      lastEntry.ids.forEach((id) => unmarkBook(id));
      // Also un-skip the card
      if (lastEntry.cardType === 'author') {
        setSkippedAuthors((prev) => {
          const newSet = new Set(prev);
          newSet.delete(lastEntry.title);
          return newSet;
        });
      } else if (lastEntry.cardType === 'series') {
        setSkippedSeries((prev) => {
          const newSet = new Set(prev);
          newSet.delete(lastEntry.title);
          return newSet;
        });
      }
    } else if (lastEntry.action === 'skip') {
      if (lastEntry.cardType === 'author') {
        // Check if this was a navigation or a skip
        if (lastEntry.level !== viewLevel) {
          // Was navigation - go back
          setViewLevel(lastEntry.level);
          if (lastEntry.level === 'top') {
            setCurrentAuthor(null);
            setCurrentSeries(null);
            setBreadcrumb([]);
          }
        } else {
          setSkippedAuthors((prev) => {
            const newSet = new Set(prev);
            newSet.delete(lastEntry.ids[0]);
            return newSet;
          });
        }
      } else if (lastEntry.cardType === 'series') {
        if (lastEntry.level !== viewLevel) {
          setViewLevel(lastEntry.level);
          setCurrentSeries(null);
          setBreadcrumb((prev) => prev.slice(0, -1));
        } else {
          setSkippedSeries((prev) => {
            const newSet = new Set(prev);
            newSet.delete(lastEntry.ids[0]);
            return newSet;
          });
        }
      } else {
        setSkippedBooks((prev) => {
          const newSet = new Set(prev);
          newSet.delete(lastEntry.ids[0]);
          return newSet;
        });
      }
    }

    setUndoHistory((prev) => prev.slice(0, -1));
  }, [undoHistory, unmarkBook, viewLevel]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (viewLevel === 'series-books') {
      if (currentAuthor) {
        setViewLevel('author-series');
        setCurrentSeries(null);
        setBreadcrumb((prev) => prev.slice(0, -1));
      } else {
        setViewLevel('top');
        setCurrentSeries(null);
        setBreadcrumb([]);
      }
    } else if (viewLevel === 'author-series' || viewLevel === 'author-books') {
      setViewLevel('top');
      setCurrentAuthor(null);
      setBreadcrumb([]);
    }
  }, [viewLevel, currentAuthor]);

  const handleDone = useCallback(async () => {
    await endSession();
    navigation.goBack();
  }, [endSession, navigation]);

  const isDone = cards.length === 0;
  const canUndo = undoHistory.length > 0;
  const showMarkAll = currentCard && (currentCard.type === 'author' || currentCard.type === 'series') && currentCard.bookIds;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        {viewLevel !== 'top' ? (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={scale(24)} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.closeButton} onPress={handleDone}>
            <Ionicons name="close" size={scale(28)} color={colors.textPrimary} />
          </TouchableOpacity>
        )}

        <View style={styles.headerCenter}>
          {breadcrumb.length > 0 ? (
            <Text style={styles.breadcrumb} numberOfLines={1}>
              {breadcrumb.join(' › ')}
            </Text>
          ) : (
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'books' && styles.tabActive]}
                onPress={() => setActiveTab('books')}
              >
                <Ionicons name="book" size={scale(14)} color={activeTab === 'books' ? ACCENT : colors.textSecondary} />
                <Text style={[styles.tabText, activeTab === 'books' && styles.tabTextActive]}>Books</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'authors' && styles.tabActive]}
                onPress={() => setActiveTab('authors')}
              >
                <Ionicons name="person" size={scale(14)} color={activeTab === 'authors' ? ACCENT : colors.textSecondary} />
                <Text style={[styles.tabText, activeTab === 'authors' && styles.tabTextActive]}>Authors</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'series' && styles.tabActive]}
                onPress={() => setActiveTab('series')}
              >
                <Ionicons name="library" size={scale(14)} color={activeTab === 'series' ? ACCENT : colors.textSecondary} />
                <Text style={[styles.tabText, activeTab === 'series' && styles.tabTextActive]}>Series</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Card Stack */}
      <View style={styles.cardContainer}>
        {isDone ? (
          <Animated.View style={styles.doneState} entering={FadeIn.duration(300)}>
            <Ionicons name="checkmark-circle" size={scale(80)} color={ACCENT} />
            <Text style={styles.doneTitle}>
              {viewLevel === 'top' ? 'All Done!' : 'Section Complete!'}
            </Text>
            <Text style={styles.doneSubtitle}>
              {markedCount} books marked as finished
            </Text>
            {viewLevel !== 'top' && (
              <TouchableOpacity style={styles.backToTopButton} onPress={() => {
                setViewLevel('top');
                setCurrentAuthor(null);
                setCurrentSeries(null);
                setBreadcrumb([]);
              }}>
                <Text style={styles.backToTopText}>Back to Authors</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.finishButton} onPress={handleDone}>
              <Text style={styles.finishButtonText}>Finish</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : currentCard && (
          <Animated.View key={currentCard.id} entering={SlideInRight.duration(200)}>
            <SwipeableCard
              card={currentCard}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              onSwipeUp={handleSwipeUp}
            />
          </Animated.View>
        )}
      </View>

      {/* Bottom Controls */}
      <View style={[styles.bottomControls, { paddingBottom: insets.bottom + spacing.md }]}>
        {/* Stats */}
        <View style={styles.stats}>
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => navigation.navigate('ReadingHistory')}
          >
            <Text style={styles.statNumber}>{markedCount}</Text>
            <Text style={[styles.statLabel, { color: ACCENT }]}>Finished →</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{queuedBooks.size}</Text>
            <Text style={styles.statLabel}>Queued</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{cards.length}</Text>
            <Text style={styles.statLabel}>Remaining</Text>
          </View>
        </View>

        {/* Action buttons */}
        {!isDone && currentCard && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.actionButton, styles.skipButton]} onPress={handleSwipeLeft}>
              <Ionicons name="close" size={scale(28)} color="#F44336" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.undoButton, !canUndo && styles.undoButtonDisabled]}
              onPress={handleUndo}
              disabled={!canUndo}
            >
              <Ionicons name="arrow-undo" size={scale(22)} color={canUndo ? colors.textPrimary : 'rgba(255,255,255,0.2)'} />
            </TouchableOpacity>

            {showMarkAll && (
              <TouchableOpacity style={[styles.actionButton, styles.markAllButton]} onPress={handleMarkAll}>
                <Ionicons name="checkmark-done" size={scale(24)} color={ACCENT} />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.actionButton, styles.nextButton]} onPress={handleSwipeRight}>
              <Ionicons name={currentCard.type === 'book' ? 'checkmark' : 'arrow-forward'} size={scale(28)} color={ACCENT} />
            </TouchableOpacity>
          </View>
        )}

        {/* Hint */}
        {currentCard && (
          <Text style={styles.hint}>
            {currentCard.type === 'book' ? '→ Finished  ↑ Queue  ← Skip' :
             currentCard.type === 'author' ? 'Swipe right to view books' :
             'Swipe right to view series'}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  closeButton: {
    width: scale(44),
    height: scale(44),
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    width: scale(44),
    height: scale(44),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  headerTitle: {
    fontSize: scale(16),
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  breadcrumb: {
    fontSize: scale(14),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  doneButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  doneText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: ACCENT,
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: scale(20),
    overflow: 'hidden',
    backgroundColor: colors.backgroundSecondary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  cardCover: {
    width: '100%',
    height: '100%',
  },
  cardCoverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundTertiary,
  },
  cardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  cardInfo: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: scale(10),
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  authorBadge: {
    backgroundColor: 'rgba(33, 150, 243, 0.5)',
  },
  seriesBadge: {
    backgroundColor: 'rgba(156, 39, 176, 0.5)',
  },
  typeBadgeText: {
    fontSize: scale(10),
    fontWeight: '700',
    color: '#fff',
  },
  cardTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: scale(12),
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardCount: {
    fontSize: scale(12),
    color: ACCENT,
    marginTop: 2,
    fontWeight: '600',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightOverlay: {
    backgroundColor: 'rgba(76, 175, 80, 0.4)',
  },
  leftOverlay: {
    backgroundColor: 'rgba(244, 67, 54, 0.4)',
  },
  overlayBadge: {
    backgroundColor: ACCENT,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: scale(12),
    alignItems: 'center',
    transform: [{ rotate: '-12deg' }],
  },
  skipBadge: {
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
  },
  overlayText: {
    fontSize: scale(14),
    fontWeight: '800',
    color: '#000',
    marginTop: spacing.xs,
  },
  skipText: {
    color: '#fff',
  },
  upOverlay: {
    backgroundColor: 'rgba(33, 150, 243, 0.4)',
  },
  queueBadge: {
    backgroundColor: 'rgba(33, 150, 243, 0.9)',
  },
  queueText: {
    color: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: scale(16),
    backgroundColor: colors.backgroundSecondary,
  },
  tabActive: {
    backgroundColor: `${ACCENT}20`,
    borderWidth: 1,
    borderColor: ACCENT,
  },
  tabText: {
    fontSize: scale(13),
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: ACCENT,
    fontWeight: '600',
  },
  bottomControls: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  statNumber: {
    fontSize: scale(22),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: scale(11),
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: scale(24),
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionButton: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  skipButton: {
    borderColor: '#F44336',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  nextButton: {
    borderColor: ACCENT,
    backgroundColor: `${ACCENT}20`,
  },
  markAllButton: {
    borderColor: ACCENT,
    backgroundColor: `${ACCENT}30`,
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
  },
  undoButton: {
    width: scale(46),
    height: scale(46),
    borderRadius: scale(23),
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  undoButtonDisabled: {
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'transparent',
  },
  hint: {
    fontSize: scale(12),
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  doneState: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  doneTitle: {
    fontSize: scale(26),
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  doneSubtitle: {
    fontSize: scale(15),
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  backToTopButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  backToTopText: {
    fontSize: scale(14),
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  finishButton: {
    marginTop: spacing.lg,
    backgroundColor: ACCENT,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: scale(25),
  },
  finishButtonText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: '#000',
  },
});

export default MarkBooksScreen;
