/**
 * src/features/discover/types.ts
 *
 * Type definitions for the Discover page based on UX spec
 */

import { LibraryItem, BookMedia, BookMetadata } from '@/core/types';

// Type guard for book media
function isBookMedia(media: LibraryItem['media'] | undefined): media is BookMedia {
  return media !== undefined && 'duration' in media;
}

// Helper to get book metadata safely
function getBookMetadata(item: LibraryItem): BookMetadata | null {
  if (item.mediaType !== 'book' || !item.media?.metadata) return null;
  return item.media.metadata as BookMetadata;
}

// Row types for content carousels
export type RowType =
  | 'continue_listening'
  | 'because_you_liked'
  | 'new_this_week'
  | 'popular'
  | 'genre_recommendation'
  | 'staff_picks'
  | 'first_listens'
  | 'short_books'
  | 'narrator_follow'
  | 'series_continue'
  | 'browse_category'
  | 'recommended';

// Filter types for "View More" navigation
export type FilterType =
  | 'new_this_week'
  | 'short_books'
  | 'long_listens'
  | 'not_started'
  | 'recommended'
  | 'mood_matched'
  | 'continue_series';

// Source attribution for personalized row titles
export interface SourceAttribution {
  itemId: string;              // The book that triggered this recommendation
  itemTitle: string;           // Book title (for display)
  type: 'finished' | 'listening' | 'author' | 'narrator' | 'genre' | 'serendipity';
}

// Display modes for content rows - varies importance visually
export type RowDisplayMode =
  | 'featured'      // 2x2 large grid (high importance - recommendations)
  | 'carousel'      // Horizontal scroll (medium - new this week, continue series)
  | 'compact'       // Smaller horizontal scroll (lower - short/long books)
  | 'grid';         // Standard 2x2 grid (default)

// Content Row model
export interface ContentRow {
  id: string;
  type: RowType;
  title: string;
  subtitle?: string;           // e.g., "Because you liked..."
  items: BookSummary[];
  totalCount: number;          // For "See All" badge
  seeAllRoute?: string;        // Navigation target
  filterType?: FilterType;     // Filter type for "View More" navigation
  filterParams?: {             // Additional filter params
    genre?: string;
    minMatchPercent?: number;
  };
  priority: number;            // For ordering
  refreshPolicy: 'realtime' | 'hourly' | 'daily';
  // NEW: Source attribution for "Because you finished X" titles
  sourceAttribution?: SourceAttribution;
  // NEW: Flag for serendipity row special styling
  isSerendipity?: boolean;
  // NEW: Display mode for visual variation
  displayMode?: RowDisplayMode;
}

// Book Summary for cards (lighter than full LibraryItem)
export interface BookSummary {
  id: string;
  title: string;
  author: string;
  narrator?: string;
  coverUrl: string;
  duration: number;            // seconds
  rating?: number;             // 0-5
  ratingCount?: number;
  genres: string[];
  addedDate: number;           // timestamp

  // User-specific
  progress?: number;           // 0-1, if in progress
  isDownloaded: boolean;
  queuePosition?: number;
  lastPlayedAt?: number;       // timestamp in ms for "2 hours ago" display

  // Visual flags
  isSerendipity?: boolean;     // Flag for "Try Something Different" styling
}

// Category for browse grid
export interface Category {
  id: string;
  name: string;
  icon: string;                // Icon name
  count?: number;              // Number of titles
}

// Filter chip
export interface FilterChip {
  id: string;
  label: string;
  value: string;
  isActive: boolean;
}

// Hero recommendation
export interface HeroRecommendation {
  book: BookSummary;
  reason: string;              // "Perfect for your evening commute"
  type: 'personalized' | 'popular' | 'new' | 'staff_pick';
}

// Discover page state
export interface DiscoverState {
  rows: ContentRow[];
  hero?: HeroRecommendation;
  selectedGenre: string | null;
  isLoading: boolean;
  error: string | null;
}

// Convert LibraryItem to BookSummary
export function libraryItemToBookSummary(
  item: LibraryItem,
  coverUrl: string,
  options?: {
    isDownloaded?: boolean;
    progress?: number;
    queuePosition?: number;
    lastPlayedAt?: number;
  }
): BookSummary {
  const metadata = getBookMetadata(item);
  const duration = isBookMedia(item.media) ? item.media.duration || 0 : 0;

  return {
    id: item.id,
    title: metadata?.title || 'Untitled',
    author: metadata?.authorName || metadata?.authors?.[0]?.name || '',
    narrator: metadata?.narratorName || metadata?.narrators?.[0] || undefined,
    coverUrl,
    duration,
    rating: metadata?.rating || undefined,
    ratingCount: metadata?.ratingCount || undefined,
    genres: metadata?.genres || [],
    addedDate: item.addedAt || 0,
    progress: options?.progress,
    isDownloaded: options?.isDownloaded || false,
    queuePosition: options?.queuePosition,
    lastPlayedAt: options?.lastPlayedAt,
  };
}

// Default categories
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'fiction', name: 'Fiction', icon: 'book-outline' },
  { id: 'mystery', name: 'Mystery', icon: 'search-outline' },
  { id: 'sci-fi', name: 'Sci-Fi', icon: 'planet-outline' },
  { id: 'romance', name: 'Romance', icon: 'heart-outline' },
  { id: 'business', name: 'Business', icon: 'briefcase-outline' },
  { id: 'history', name: 'History', icon: 'time-outline' },
  { id: 'self-help', name: 'Self-Help', icon: 'bulb-outline' },
  { id: 'biography', name: 'Biography', icon: 'person-outline' },
];

// Genre chips for quick filter
export const GENRE_CHIPS = [
  'All',
  'Fiction',
  'Non-Fiction',
  'Mystery',
  'Sci-Fi',
  'Romance',
  'Self-Help',
  'History',
];
