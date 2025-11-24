import { LibraryItem } from '@/core/types';

export function extractGenres(items: LibraryItem[]): string[] {
  const genreSet = new Set<string>();

  items.forEach((item) => {
    const genres = (item.media?.metadata as any)?.genres || [];
    genres.forEach((genre: string) => genreSet.add(genre));
  });

  return Array.from(genreSet).sort();
}