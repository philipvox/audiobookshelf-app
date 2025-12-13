/**
 * src/features/library/constants/genreCategories.ts
 *
 * Meta-category mapping for genre grouping based on UX research.
 * Groups 80+ genres into 6 manageable meta-categories.
 */

export interface MetaCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  genres: string[];
}

export const META_CATEGORIES: MetaCategory[] = [
  {
    id: 'fiction',
    name: 'Fiction',
    icon: 'book-open',
    color: '#8B5CF6', // Purple
    genres: [
      'Action', 'Adventure', 'Classics', 'Contemporary', 'Contemporary Fiction',
      'Crime', 'Crime Fiction', 'Drama', 'Dystopia', 'Dystopian',
      'Espionage', 'Faction', 'Fairy Tales', 'Fantasy', 'Fiction',
      'Gothic', 'Historical', 'Historical Fiction', 'Horror', 'Legal Thriller',
      'Literary', 'Literary Fiction', 'Mystery', 'Mystery & Thriller',
      'Mythology', 'Paranormal', 'Post-Apocalyptic', 'Romance', 'Romantic Suspense',
      'Satire', 'Science Fiction', 'Sci-Fi', 'SF', 'Short Stories',
      'Spy', 'Steampunk', 'Supernatural', 'Suspense', 'Thriller',
      'Thrillers', 'Urban Fantasy', 'War', 'War Fiction', 'Western',
      'Women\'s Fiction', 'Zombies'
    ],
  },
  {
    id: 'non-fiction',
    name: 'Non-Fiction',
    icon: 'library',
    color: '#3B82F6', // Blue
    genres: [
      'Autobiography', 'Biography', 'Biography & Memoir', 'Business',
      'Current Affairs', 'Economics', 'Essay', 'Essays', 'History',
      'Journalism', 'Memoir', 'Memoirs', 'Non-Fiction', 'Nonfiction',
      'Philosophy', 'Politics', 'Psychology', 'Science', 'Social Science',
      'Sociology', 'True Crime', 'True Story'
    ],
  },
  {
    id: 'children-ya',
    name: 'Children & YA',
    icon: 'sparkles',
    color: '#F59E0B', // Orange
    genres: [
      'Children', 'Children\'s', 'Childrens', 'Kids', 'Middle Grade',
      'Picture Books', 'Teen', 'Teen Fiction', 'Young Adult', 'YA',
      'Youth', 'Juvenile'
    ],
  },
  {
    id: 'arts-entertainment',
    name: 'Arts & Entertainment',
    icon: 'musical-notes',
    color: '#EC4899', // Pink
    genres: [
      'Art', 'Arts', 'Comedy', 'Entertainment', 'Film', 'Humor',
      'Media', 'Movies', 'Music', 'Performing Arts', 'Photography',
      'Poetry', 'Pop Culture', 'Television', 'Theatre', 'Theater'
    ],
  },
  {
    id: 'learning-reference',
    name: 'Learning & Reference',
    icon: 'school',
    color: '#10B981', // Green
    genres: [
      'Computer', 'Computers', 'Education', 'Educational', 'Finance',
      'How-To', 'Language', 'Languages', 'Reference', 'Study',
      'Study Guides', 'Tech', 'Technology', 'Textbook', 'Textbooks',
      'Writing'
    ],
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle',
    icon: 'heart',
    color: '#14B8A6', // Teal
    genres: [
      'Cooking', 'Diet', 'Family', 'Fitness', 'Food', 'Gardening',
      'Health', 'Health & Wellness', 'Home', 'Home & Garden',
      'Inspirational', 'Motivational', 'Nature', 'Parenting',
      'Personal Development', 'Relationships', 'Religion', 'Self-Help',
      'Self-Improvement', 'Spiritual', 'Spirituality', 'Sports',
      'Travel', 'Wellness'
    ],
  },
];

// Helper to find meta-category for a genre
export function getMetaCategoryForGenre(genreName: string): MetaCategory | null {
  const lowerGenre = genreName.toLowerCase().trim();

  for (const category of META_CATEGORIES) {
    if (category.genres.some(g => g.toLowerCase() === lowerGenre)) {
      return category;
    }
  }

  return null;
}

// Helper to group genres by meta-category
export function groupGenresByCategory(
  genres: string[]
): Map<MetaCategory, string[]> {
  const grouped = new Map<MetaCategory, string[]>();
  const uncategorized: string[] = [];

  // Initialize all categories
  for (const category of META_CATEGORIES) {
    grouped.set(category, []);
  }

  // Assign genres to categories
  for (const genre of genres) {
    const category = getMetaCategoryForGenre(genre);
    if (category) {
      const existing = grouped.get(category) || [];
      existing.push(genre);
      grouped.set(category, existing);
    } else {
      uncategorized.push(genre);
    }
  }

  // Add uncategorized to Fiction as fallback (or could create "Other" category)
  if (uncategorized.length > 0) {
    const fiction = META_CATEGORIES[0];
    const existing = grouped.get(fiction) || [];
    grouped.set(fiction, [...existing, ...uncategorized]);
  }

  return grouped;
}

// Genre with metadata for display
export interface GenreWithData {
  name: string;
  bookCount: number;
  coverIds: string[];
  metaCategoryId: string | null;
}

// Minimum books to show a genre in browse (sparse handling)
export const MIN_BOOKS_TO_SHOW = 3;
