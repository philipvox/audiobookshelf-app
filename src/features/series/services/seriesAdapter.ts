/**
 * src/features/series/services/seriesAdapter.ts
 *
 * Adapter to convert AudiobookShelf Series to our SeriesInfo format.
 */

import { Series } from '@/core/types';

export interface SeriesInfo {
  id: string;
  name: string;
  bookCount: number;
  totalDuration: number;
  coverUrl?: string;
  description?: string;
  addedAt: number;
}

class SeriesAdapter {
  /**
   * Convert AudiobookShelf Series array to SeriesInfo array
   */
  adaptSeries(series: Series[]): SeriesInfo[] {
    if (!Array.isArray(series)) {
      console.warn('adaptSeries received non-array:', series);
      return [];
    }

    return series.map((s) => this.adaptSingle(s));
  }

  /**
   * Convert single series
   */
  private adaptSingle(series: Series): SeriesInfo {
    // Calculate total duration from books
    const totalDuration = series.books?.reduce(
      (sum, book) => sum + (book.media?.duration || 0),
      0
    ) || 0;

    // Get first book's cover as series cover
    const coverUrl = series.books?.[0]?.id;

    return {
      id: series.id,
      name: series.name,
      bookCount: series.books?.length || 0,
      totalDuration,
      coverUrl,
      description: series.description,
      addedAt: series.addedAt,
    };
  }

  /**
   * Sort series by different criteria
   */
  sortSeries(
    series: SeriesInfo[],
    sortBy: 'name' | 'bookCount' | 'recent'
  ): SeriesInfo[] {
    if (!Array.isArray(series)) {
      return [];
    }

    switch (sortBy) {
      case 'name':
        return [...series].sort((a, b) => a.name.localeCompare(b.name));
      case 'bookCount':
        return [...series].sort((a, b) => b.bookCount - a.bookCount);
      case 'recent':
        return [...series].sort((a, b) => b.addedAt - a.addedAt);
      default:
        return series;
    }
  }

  /**
   * Filter series by search query
   */
  filterSeries(series: SeriesInfo[], query: string): SeriesInfo[] {
    if (!Array.isArray(series)) {
      return [];
    }

    if (!query.trim()) {
      return series;
    }

    const lowerQuery = query.toLowerCase();
    return series.filter((s) => s.name.toLowerCase().includes(lowerQuery));
  }
}

export const seriesAdapter = new SeriesAdapter();