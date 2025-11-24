/**
 * src/features/authors/services/authorAdapter.ts
 *
 * Adapter to convert AudiobookShelf Author to AuthorInfo format.
 */

import { Author } from '@/core/types';

export interface AuthorInfo {
  id: string;
  name: string;
  description?: string;
  imagePath?: string;
  bookCount: number;
  addedAt: number;
}

class AuthorAdapter {
  adaptAuthors(authors: Author[], bookCountMap?: Map<string, number>): AuthorInfo[] {
    if (!Array.isArray(authors)) {
      console.warn('adaptAuthors received non-array:', authors);
      return [];
    }
    return authors.map((a) => this.adaptSingle(a, bookCountMap?.get(a.id) || 0));
  }

  private adaptSingle(author: Author, bookCount: number): AuthorInfo {
    return {
      id: author.id,
      name: author.name,
      description: author.description,
      imagePath: author.imagePath,
      bookCount,
      addedAt: author.addedAt,
    };
  }

  sortAuthors(
    authors: AuthorInfo[],
    sortBy: 'name' | 'bookCount' | 'recent'
  ): AuthorInfo[] {
    if (!Array.isArray(authors)) return [];

    switch (sortBy) {
      case 'name':
        return [...authors].sort((a, b) => a.name.localeCompare(b.name));
      case 'bookCount':
        return [...authors].sort((a, b) => b.bookCount - a.bookCount);
      case 'recent':
        return [...authors].sort((a, b) => b.addedAt - a.addedAt);
      default:
        return authors;
    }
  }

  filterAuthors(authors: AuthorInfo[], query: string): AuthorInfo[] {
    if (!Array.isArray(authors)) return [];
    if (!query.trim()) return authors;

    const lowerQuery = query.toLowerCase();
    return authors.filter((a) => a.name.toLowerCase().includes(lowerQuery));
  }
}

export const authorAdapter = new AuthorAdapter();
