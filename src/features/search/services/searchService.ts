import Fuse, { IFuseOptions } from 'fuse.js';
import { LibraryItem } from '@/core/types';

interface SearchableItem {
  id: string;
  title: string;
  author: string;
  narrator: string;
  series: string;
  genres: string;
  description: string;
  originalItem: LibraryItem;
}

const fuseOptions: IFuseOptions<SearchableItem> = {
  keys: [
    { name: 'title', weight: 3 },
    { name: 'author', weight: 2 },
    { name: 'narrator', weight: 1.5 },
    { name: 'series', weight: 1.5 },
    { name: 'genres', weight: 1 },
    { name: 'description', weight: 0.5 },
  ],
  threshold: 0.4,
  distance: 100,
  minMatchCharLength: 2,
  includeScore: true,
  includeMatches: false,
  shouldSort: true,
  findAllMatches: false,
};

class SearchService {
  private fuse: Fuse<SearchableItem> | null = null;
  private items: SearchableItem[] = [];

  buildIndex(libraryItems: LibraryItem[]): void {
    this.items = libraryItems.map((item) => {
      const metadata = item.media.metadata as any;
      return {
        id: item.id,
        title: metadata.title || '',
        author: metadata.authors?.map((a: any) => a.name).join(', ') || '',
        narrator: metadata.narrators?.join(', ') || '',
        series: metadata.series?.map((s: any) => s.name).join(', ') || '',
        genres: metadata.genres?.join(', ') || '',
        description: metadata.description || '',
        originalItem: item,
      };
    });
    this.fuse = new Fuse(this.items, fuseOptions);
  }

  search(query: string): LibraryItem[] {
    if (!this.fuse || !query.trim()) {
      return [];
    }
    const results = this.fuse.search(query.trim());
    return results.map((result) => result.item.originalItem);
  }

  getAllItems(): LibraryItem[] {
    return this.items.map((item) => item.originalItem);
  }

  isIndexed(): boolean {
    return this.fuse !== null;
  }

  clearIndex(): void {
    this.fuse = null;
    this.items = [];
  }
}

export const searchService = new SearchService();
