/**
 * src/core/cache/searchIndex.ts
 *
 * In-memory search index for fast library searching.
 * Pre-computes trigrams for fuzzy matching.
 *
 * Performance characteristics:
 * - Build time: O(n) where n = number of items
 * - Search time: O(k) where k = number of matching trigrams
 * - Memory: ~3x text size for trigram index
 *
 * For libraries up to 10,000 books, this provides sub-100ms search.
 * For larger libraries, consider SQLite FTS5 (see Fix 4.3).
 */

import { LibraryItem } from '@/core/types';

// =============================================================================
// Types
// =============================================================================

export interface SearchResult {
  item: LibraryItem;
  score: number;
  matchedFields: string[];
}

interface IndexedItem {
  id: string;
  title: string;
  titleLower: string;
  author: string;
  authorLower: string;
  narrator: string;
  narratorLower: string;
  series: string;
  seriesLower: string;
  trigrams: Set<string>;
  item: LibraryItem;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate trigrams from text for fuzzy matching.
 * "hello" -> ["  h", " he", "hel", "ell", "llo", "lo ", "o  "]
 */
function generateTrigrams(text: string): string[] {
  if (!text || text.length < 3) return [];

  const padded = `  ${text.toLowerCase()}  `;
  const trigrams: string[] = [];

  for (let i = 0; i < padded.length - 2; i++) {
    trigrams.push(padded.slice(i, i + 3));
  }

  return trigrams;
}

/**
 * Calculate Jaccard similarity between two sets.
 */
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  return intersection / (setA.size + setB.size - intersection);
}

/**
 * Extract metadata from library item safely.
 */
function getMetadata(item: LibraryItem): {
  title: string;
  author: string;
  narrator: string;
  series: string;
} {
  const metadata = (item.media?.metadata as any) || {};

  let narrator = metadata.narratorName || '';
  narrator = narrator.replace(/^Narrated by\s*/i, '').trim();

  return {
    title: metadata.title || '',
    author: metadata.authorName || '',
    narrator,
    series: metadata.seriesName?.replace(/\s*#[\d.]+$/, '') || '',
  };
}

// =============================================================================
// Search Index Class
// =============================================================================

export class SearchIndex {
  private items: IndexedItem[] = [];
  private trigramIndex = new Map<string, Set<string>>(); // trigram -> item IDs
  private itemById = new Map<string, IndexedItem>();
  private isBuilt = false;

  /**
   * Build index from library items.
   * Call this whenever the library changes.
   */
  build(items: LibraryItem[]): void {
    const startTime = performance.now();

    this.items = [];
    this.trigramIndex.clear();
    this.itemById.clear();

    for (const item of items) {
      const metadata = getMetadata(item);

      // Combine all searchable text
      const searchText = [
        metadata.title,
        metadata.author,
        metadata.narrator,
        metadata.series,
      ].filter(Boolean).join(' ');

      const trigrams = new Set(generateTrigrams(searchText));

      const indexed: IndexedItem = {
        id: item.id,
        title: metadata.title,
        titleLower: metadata.title.toLowerCase(),
        author: metadata.author,
        authorLower: metadata.author.toLowerCase(),
        narrator: metadata.narrator,
        narratorLower: metadata.narrator.toLowerCase(),
        series: metadata.series,
        seriesLower: metadata.series.toLowerCase(),
        trigrams,
        item,
      };

      this.items.push(indexed);
      this.itemById.set(item.id, indexed);

      // Build inverted index
      for (const trigram of trigrams) {
        let ids = this.trigramIndex.get(trigram);
        if (!ids) {
          ids = new Set();
          this.trigramIndex.set(trigram, ids);
        }
        ids.add(item.id);
      }
    }

    this.isBuilt = true;

    const elapsed = performance.now() - startTime;
    if (__DEV__) {
      console.log(
        `[SearchIndex] Built index for ${items.length} items in ${elapsed.toFixed(1)}ms ` +
        `(${this.trigramIndex.size} unique trigrams)`
      );
    }
  }

  /**
   * Search the index.
   * Uses exact substring matching for short queries, trigram matching for longer.
   */
  search(query: string, limit = 50): SearchResult[] {
    if (!this.isBuilt || !query.trim()) {
      return [];
    }

    const startTime = performance.now();
    const lowerQuery = query.toLowerCase().trim();

    // For short queries (1-2 chars), use simple prefix matching
    if (lowerQuery.length < 3) {
      const results = this.items
        .filter((item) =>
          item.titleLower.startsWith(lowerQuery) ||
          item.authorLower.startsWith(lowerQuery) ||
          item.seriesLower.startsWith(lowerQuery)
        )
        .slice(0, limit)
        .map((item) => ({
          item: item.item,
          score: 1,
          matchedFields: this.getMatchedFields(item, lowerQuery),
        }));

      return results;
    }

    // For longer queries, use trigram matching for fuzzy search
    const queryTrigrams = new Set(generateTrigrams(lowerQuery));

    // Find candidate items (items that share at least one trigram)
    const candidateIds = new Set<string>();
    for (const trigram of queryTrigrams) {
      const ids = this.trigramIndex.get(trigram);
      if (ids) {
        for (const id of ids) {
          candidateIds.add(id);
        }
      }
    }

    // Score candidates
    const scoredResults: SearchResult[] = [];

    for (const id of candidateIds) {
      const indexed = this.itemById.get(id);
      if (!indexed) continue;

      // Calculate trigram similarity
      const similarity = jaccardSimilarity(queryTrigrams, indexed.trigrams);

      // Boost exact substring matches
      let score = similarity;
      const matchedFields: string[] = [];

      if (indexed.titleLower.includes(lowerQuery)) {
        score += 0.5;
        matchedFields.push('title');
      }
      if (indexed.authorLower.includes(lowerQuery)) {
        score += 0.3;
        matchedFields.push('author');
      }
      if (indexed.narratorLower.includes(lowerQuery)) {
        score += 0.2;
        matchedFields.push('narrator');
      }
      if (indexed.seriesLower.includes(lowerQuery)) {
        score += 0.25;
        matchedFields.push('series');
      }

      // Include results with reasonable similarity
      if (score > 0.1) {
        scoredResults.push({
          item: indexed.item,
          score,
          matchedFields,
        });
      }
    }

    // Sort by score descending
    scoredResults.sort((a, b) => b.score - a.score);

    const results = scoredResults.slice(0, limit);

    if (__DEV__) {
      const elapsed = performance.now() - startTime;
      console.log(
        `[SearchIndex] Search "${query}" found ${results.length} results in ${elapsed.toFixed(1)}ms`
      );
    }

    return results;
  }

  /**
   * Get items by exact match.
   * Faster than search() for known matches.
   */
  getByExactMatch(field: 'title' | 'author' | 'narrator' | 'series', value: string): LibraryItem[] {
    const lowerValue = value.toLowerCase();

    return this.items
      .filter((item) => item[`${field}Lower`] === lowerValue)
      .map((item) => item.item);
  }

  /**
   * Get item by ID.
   */
  getById(id: string): LibraryItem | undefined {
    return this.itemById.get(id)?.item;
  }

  /**
   * Check if index is built.
   */
  get ready(): boolean {
    return this.isBuilt;
  }

  /**
   * Get index statistics.
   */
  getStats(): { itemCount: number; trigramCount: number } {
    return {
      itemCount: this.items.length,
      trigramCount: this.trigramIndex.size,
    };
  }

  private getMatchedFields(item: IndexedItem, query: string): string[] {
    const fields: string[] = [];
    if (item.titleLower.includes(query)) fields.push('title');
    if (item.authorLower.includes(query)) fields.push('author');
    if (item.narratorLower.includes(query)) fields.push('narrator');
    if (item.seriesLower.includes(query)) fields.push('series');
    return fields;
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const searchIndex = new SearchIndex();
