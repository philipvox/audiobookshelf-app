/**
 * src/shared/utils/metadata.ts
 * 
 * Utility functions for extracting metadata from LibraryItem objects.
 * The AudiobookShelf API returns metadata in a specific structure that
 * differs from what some type definitions expect.
 * 
 * Actual API structure:
 * - item.media.metadata.authorName (string)
 * - item.media.metadata.narratorName (string, may include "Narrated by" prefix)
 * - item.media.metadata.description (string)
 * - item.media.duration (number in seconds)
 */

import { LibraryItem } from '@/core/types';
import { formatDuration } from './format';

export interface BookMetadataExtracted {
  title: string;
  subtitle: string | null;
  authorName: string;
  narratorName: string;
  narratorNames: string[];
  seriesName: string | null;
  seriesSequence: string | null;
  description: string;
  genres: string[];
  publishedYear: string | null;
  publisher: string | null;
  duration: number;
  durationFormatted: string;
  language: string | null;
  isbn: string | null;
  asin: string | null;
}

/**
 * Extract all metadata from a LibraryItem in a normalized format
 */
export function extractBookMetadata(item: LibraryItem | null | undefined): BookMetadataExtracted {
  const metadata = (item?.media?.metadata as any) || {};
  const duration = item?.media?.duration || 0;

  // Get author name - handle both authorName string and authors[] array
  let authorName = 'Unknown Author';
  if (metadata.authorName) {
    authorName = metadata.authorName;
  } else if (metadata.authors?.length > 0) {
    authorName = metadata.authors.map((a: any) => a.name).join(', ');
  }

  // Get narrator name - handle both narratorName string and narrators[] array
  let narratorName = 'Unknown Narrator';
  let narratorNames: string[] = [];
  if (metadata.narratorName) {
    narratorName = metadata.narratorName.replace(/^Narrated by\s*/i, '').trim();
    narratorNames = narratorName.split(',').map((n: string) => n.trim()).filter(Boolean);
  } else if (metadata.narrators?.length > 0) {
    narratorNames = metadata.narrators.map((n: any) => typeof n === 'string' ? n : n.name);
    narratorName = narratorNames.join(', ');
  }

  // Parse series info from seriesName (format: "Series Name #1") or series array
  let seriesNameRaw = metadata.seriesName || null;
  if (!seriesNameRaw && metadata.series?.length > 0) {
    const firstSeries = metadata.series[0];
    seriesNameRaw = firstSeries.name || firstSeries.seriesName;
    if (firstSeries.sequence) {
      seriesNameRaw = `${seriesNameRaw} #${firstSeries.sequence}`;
    }
  }

  let parsedSeriesName = seriesNameRaw;
  let seriesSequence: string | null = null;

  if (seriesNameRaw) {
    const match = seriesNameRaw.match(/^(.+?)\s*#(\d+(?:\.\d+)?)$/);
    if (match) {
      parsedSeriesName = match[1].trim();
      seriesSequence = match[2];
    }
  }

  return {
    title: metadata.title || 'Unknown Title',
    subtitle: metadata.subtitle || null,
    authorName,
    narratorName: narratorName || 'Unknown Narrator',
    narratorNames,
    seriesName: parsedSeriesName,
    seriesSequence,
    description: metadata.description || '',
    genres: metadata.genres || [],
    publishedYear: metadata.publishedYear || null,
    publisher: metadata.publisher || null,
    duration,
    durationFormatted: formatDuration(duration),
    language: metadata.language || null,
    isbn: metadata.isbn || null,
    asin: metadata.asin || null,
  };
}

/**
 * Get author name from LibraryItem
 * Handles both authorName string and authors[] array formats
 */
export function getAuthorName(item: LibraryItem | null | undefined): string {
  const metadata = (item?.media?.metadata as any) || {};
  // Try authorName first, then authors array
  if (metadata.authorName) return metadata.authorName;
  if (metadata.authors?.length > 0) {
    return metadata.authors.map((a: any) => a.name).join(', ');
  }
  return 'Unknown Author';
}

/**
 * Get narrator name from LibraryItem (without "Narrated by" prefix)
 * Handles both narratorName string and narrators[] array formats
 */
export function getNarratorName(item: LibraryItem | null | undefined): string {
  const metadata = (item?.media?.metadata as any) || {};
  // Try narratorName first
  if (metadata.narratorName) {
    return metadata.narratorName.replace(/^Narrated by\s*/i, '').trim();
  }
  // Then try narrators array
  if (metadata.narrators?.length > 0) {
    return metadata.narrators.map((n: any) => typeof n === 'string' ? n : n.name).join(', ');
  }
  return 'Unknown Narrator';
}

/**
 * Get narrator names as array from LibraryItem
 * Handles both narratorName string and narrators[] array formats
 */
export function getNarratorNames(item: LibraryItem | null | undefined): string[] {
  const metadata = (item?.media?.metadata as any) || {};

  // Try narrators array first (cleaner data)
  if (metadata.narrators?.length > 0) {
    return metadata.narrators.map((n: any) => typeof n === 'string' ? n : n.name).filter(Boolean);
  }

  // Fall back to narratorName string
  const narratorName = getNarratorName(item);
  if (!narratorName || narratorName === 'Unknown Narrator') return [];
  return narratorName.split(',').map((n: string) => n.trim()).filter(Boolean);
}

/**
 * Get description from LibraryItem
 */
export function getDescription(item: LibraryItem | null | undefined): string {
  const metadata = (item?.media?.metadata as any) || {};
  return metadata.description || '';
}

/**
 * Get title from LibraryItem
 */
export function getTitle(item: LibraryItem | null | undefined): string {
  const metadata = (item?.media?.metadata as any) || {};
  return metadata.title || 'Unknown Title';
}

/**
 * Get duration in seconds from LibraryItem
 */
export function getDuration(item: LibraryItem | null | undefined): number {
  return item?.media?.duration || 0;
}

/**
 * Get formatted duration from LibraryItem
 */
export function getFormattedDuration(item: LibraryItem | null | undefined): string {
  return formatDuration(getDuration(item));
}

/**
 * Get series name from LibraryItem
 * Handles both seriesName string and series[] array formats
 */
export function getSeriesName(item: LibraryItem | null | undefined): string | null {
  const metadata = (item?.media?.metadata as any) || {};

  // Try seriesName first
  let seriesName = metadata.seriesName || null;

  // Then try series array
  if (!seriesName && metadata.series?.length > 0) {
    const firstSeries = metadata.series[0];
    seriesName = firstSeries.name || firstSeries.seriesName || null;
  }

  if (!seriesName) return null;

  // Remove sequence number if present
  const match = seriesName.match(/^(.+?)\s*#\d+(?:\.\d+)?$/);
  return match ? match[1].trim() : seriesName;
}

/**
 * Get series with sequence (e.g., "Series Name #1")
 * Handles both seriesName string and series[] array formats
 */
export function getSeriesWithSequence(item: LibraryItem | null | undefined): string | null {
  const metadata = (item?.media?.metadata as any) || {};

  // Try seriesName first
  if (metadata.seriesName) return metadata.seriesName;

  // Then try series array
  if (metadata.series?.length > 0) {
    const firstSeries = metadata.series[0];
    const name = firstSeries.name || firstSeries.seriesName;
    if (firstSeries.sequence) {
      return `${name} #${firstSeries.sequence}`;
    }
    return name || null;
  }

  return null;
}

/**
 * Get published year from LibraryItem
 */
export function getPublishedYear(item: LibraryItem | null | undefined): string | null {
  const metadata = (item?.media?.metadata as any) || {};
  return metadata.publishedYear || null;
}

/**
 * Get genres from LibraryItem
 */
export function getGenres(item: LibraryItem | null | undefined): string[] {
  const metadata = (item?.media?.metadata as any) || {};
  return metadata.genres || [];
}