# Edit Specification: Type Safety (v2)

**Version:** 2 (post-validation)
**Changes from v1:** Corrected effort estimate (L → M), added complete file list

**Covers Action Plan Items:** 1.5, 2.5
**Priority:** Critical (Phase 2B for 2.5) / High (Phase 1C for 1.5)
**Effort:** M (Medium) - 4-6 days

---

## Current State

- **`as any` casts:** 202 occurrences across 61 files
- **`@ts-ignore` comments:** 26 (mostly in test files)
- **Missing types:** API responses use `any` for `userMediaProgress`, `media.duration`, `metadata.series`
- **Pattern used everywhere:**
  ```typescript
  const author = (item.media?.metadata as any)?.authorName;
  const series = (item.media?.metadata as any)?.series;
  ```

---

## Files with `as any` Usage (Complete List)

### Priority 1: Most Casts (6+ occurrences)
| File | Count | Location |
|------|-------|----------|
| MyLibraryScreen.tsx | 16 | `src/features/library/screens/` |
| BookDetailScreen.tsx | 12 | `src/features/book-detail/screens/` |
| SeriesDetailScreen.tsx | 9 | `src/features/series/screens/` |
| AuthorDetailScreen.tsx | 8 | `src/features/author/screens/` |
| playerStore.ts | 8 | `src/features/player/stores/` |
| CDPlayerScreen.tsx | 7 | `src/features/player/screens/` |

### Priority 2: Medium Casts (3-5 occurrences)
| File | Count | Location |
|------|-------|----------|
| NarratorDetailScreen.tsx | 5 | `src/features/narrator/screens/` |
| downloadManager.ts | 5 | `src/core/services/` |
| SearchScreen.tsx | 4 | `src/features/search/screens/` |
| HomeScreen.tsx | 4 | `src/features/home/screens/` |
| BrowseScreen.tsx | 4 | `src/features/browse/screens/` |
| GenreDetailScreen.tsx | 4 | `src/features/library/screens/` |
| CollectionDetailScreen.tsx | 3 | `src/features/library/screens/` |
| QueueScreen.tsx | 3 | `src/features/queue/screens/` |

### Priority 3: Low Casts (1-2 occurrences)
| File | Count | Location |
|------|-------|----------|
| useHomeData.ts | 2 | `src/features/home/hooks/` |
| useDiscoverData.ts | 2 | `src/features/discover/hooks/` |
| useContinueListening.ts | 2 | `src/features/home/hooks/` |
| libraryCache.ts | 2 | `src/core/cache/` |
| GlobalMiniPlayer.tsx | 2 | `src/navigation/components/` |
| BookCard.tsx | 2 | `src/shared/components/` |
| SeriesCard.tsx | 2 | `src/shared/components/` |
| + 44 more files | 1-2 each | Various |

**Total:** 202 casts across 61 files

---

## Specific Changes

### 2.5: Create getBookMetadata Helper (FIRST)

**New file:** `src/shared/utils/bookMetadata.ts`

```typescript
import { LibraryItem } from '@/core/types';

// Types for metadata
export interface SeriesInfo {
  id?: string;
  name: string;
  sequence?: string | number;
}

export interface ExtractedMetadata {
  title: string;
  subtitle: string | null;
  authorName: string | null;
  narratorName: string | null;
  series: SeriesInfo[];
  genres: string[];
  description: string | null;
  publishedYear: string | null;
  publisher: string | null;
  duration: number;
  isExplicit: boolean;
  isAbridged: boolean;
}

export interface ProgressInfo {
  progress: number;
  currentTime: number;
  duration: number;
  isFinished: boolean;
  lastUpdate: number;
}

/**
 * Safely extract book metadata with proper typing
 * Replaces all `(item.media?.metadata as any)?.X` patterns
 */
export function getBookMetadata(item: LibraryItem | null | undefined): ExtractedMetadata {
  if (!item) {
    return getEmptyMetadata();
  }

  const media = item.media;
  const metadata = media?.metadata;

  return {
    title: metadata?.title || item.id || 'Unknown Title',
    subtitle: metadata?.subtitle || null,
    authorName: metadata?.authorName || metadata?.authorNameLF || null,
    narratorName: metadata?.narratorName || null,
    series: Array.isArray(metadata?.series) ? metadata.series : [],
    genres: Array.isArray(metadata?.genres) ? metadata.genres : [],
    description: metadata?.description || null,
    publishedYear: metadata?.publishedYear || null,
    publisher: metadata?.publisher || null,
    duration: media?.duration || 0,
    isExplicit: metadata?.explicit || false,
    isAbridged: metadata?.abridged || false,
  };
}

function getEmptyMetadata(): ExtractedMetadata {
  return {
    title: 'Unknown Title',
    subtitle: null,
    authorName: null,
    narratorName: null,
    series: [],
    genres: [],
    description: null,
    publishedYear: null,
    publisher: null,
    duration: 0,
    isExplicit: false,
    isAbridged: false,
  };
}

/**
 * Get primary series info
 */
export function getPrimarySeries(item: LibraryItem | null | undefined): SeriesInfo | null {
  const { series } = getBookMetadata(item);
  return series.length > 0 ? series[0] : null;
}

/**
 * Get formatted author display name
 */
export function getAuthorDisplay(item: LibraryItem | null | undefined): string {
  const { authorName } = getBookMetadata(item);
  return authorName || 'Unknown Author';
}

/**
 * Get formatted narrator display name
 */
export function getNarratorDisplay(item: LibraryItem | null | undefined): string {
  const { narratorName } = getBookMetadata(item);
  return narratorName || 'Unknown Narrator';
}

/**
 * Get progress information
 */
export function getProgress(item: LibraryItem | null | undefined): ProgressInfo {
  const progress = item?.userMediaProgress;

  return {
    progress: progress?.progress || 0,
    currentTime: progress?.currentTime || 0,
    duration: progress?.duration || item?.media?.duration || 0,
    isFinished: progress?.isFinished || false,
    lastUpdate: progress?.lastUpdate || 0,
  };
}

/**
 * Check if book is in progress (started but not finished)
 */
export function isInProgress(item: LibraryItem | null | undefined): boolean {
  const { progress, isFinished } = getProgress(item);
  return progress > 0 && progress < 0.95 && !isFinished;
}

/**
 * Check if book is completed
 */
export function isCompleted(item: LibraryItem | null | undefined): boolean {
  const { progress, isFinished } = getProgress(item);
  return isFinished || progress >= 0.95;
}

/**
 * Format duration in hours and minutes
 */
export function formatBookDuration(item: LibraryItem | null | undefined): string {
  const { duration } = getBookMetadata(item);
  if (duration === 0) return 'Unknown';

  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}
```

---

### 1.5: Update Screens to Use Helper

**Pattern replacement:**
```typescript
// BEFORE (repeated 202 times across codebase)
const author = (item.media?.metadata as any)?.authorName || 'Unknown';
const series = (item.media?.metadata as any)?.series;
const duration = item.media?.duration;
const progress = item.userMediaProgress?.progress || 0;

// AFTER
import { getBookMetadata, getProgress, getPrimarySeries } from '@/shared/utils/bookMetadata';

const { authorName, duration, genres } = getBookMetadata(item);
const { progress, isFinished } = getProgress(item);
const series = getPrimarySeries(item);
```

---

## Phased Implementation

### Phase 1 (Day 1-2): Foundation
1. Create `src/shared/utils/bookMetadata.ts`
2. Update 6 Priority 1 files (60 casts)
3. **Target:** 202 → 142 `any` casts

### Phase 2 (Day 3-4): Screen Updates
1. Update 8 Priority 2 files (30 casts)
2. Update shared components (10 casts)
3. **Target:** 142 → 102 `any` casts

### Phase 3 (Day 5-6): Cleanup
1. Update remaining 47 files (102 casts)
2. Add ESLint rule to flag new `as any`
3. **Target:** <50 `any` casts

---

## ESLint Configuration

**Add to `.eslintrc.js`:**
```javascript
rules: {
  '@typescript-eslint/no-explicit-any': 'warn',
  'no-restricted-syntax': [
    'warn',
    {
      selector: 'TSAsExpression[typeAnnotation.typeName.name="any"]',
      message: 'Avoid "as any". Use getBookMetadata() or define proper types.',
    },
  ],
}
```

---

## Testing Criteria

- [ ] All screens compile without `as any` for metadata
- [ ] `getBookMetadata` returns correct values
- [ ] `getProgress` returns correct progress info
- [ ] Null/undefined items return safe defaults
- [ ] TypeScript catches incorrect metadata access
- [ ] No runtime regressions in data display
- [ ] ESLint warns on new `as any` usage

---

## Effort Breakdown

| Task | Effort | Risk |
|------|--------|------|
| Create bookMetadata.ts helper | 3 hours | Low |
| Update Priority 1 files (60 casts) | 4 hours | Low |
| Update Priority 2 files (30 casts) | 3 hours | Low |
| Update Priority 3 files (102 casts) | 6 hours | Low |
| Add ESLint rule | 1 hour | Low |
| Testing | 3 hours | - |

**Total: 4-6 days (M)**
