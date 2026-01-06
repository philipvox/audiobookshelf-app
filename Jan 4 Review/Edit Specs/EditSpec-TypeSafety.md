# Edit Specification: Type Safety

**Covers Action Plan Items:** 1.5, 2.19
**Priority:** Critical (Phase 1) / High (Phase 2)
**Effort:** L (Large) - 1-2 weeks ongoing

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

### Files with Most `any` Usage
1. `playerStore.ts` - 8 occurrences
2. `CDPlayerScreen.tsx` - 7 occurrences
3. `MyLibraryScreen.tsx` - 16 occurrences
4. `BookDetailScreen.tsx` - 12 occurrences
5. `SeriesDetailScreen.tsx` - 9 occurrences
6. `AuthorDetailScreen.tsx` - 8 occurrences
7. `downloadManager.ts` - 5 occurrences
8. `sqliteCache.ts` - multiple

---

## Issues Identified

| Issue | Source | Severity |
|-------|--------|----------|
| 202 `as any` casts hiding runtime bugs | [28], [30] #3 | High |
| API responses untyped | [28] | High |
| LibraryItem.media.metadata untyped | [28] | High |
| userMediaProgress untyped | [28] | High |
| Duplicate unsafe metadata access patterns | [31] A5 | Medium |

---

## Alignment Requirements

From [31] Alignment Audit:
- Item A5: Create `getBookMetadata()` typed helper to replace 202 unsafe casts
- Item 2.1: Same unsafe access pattern used everywhere for metadata

From [30] Executive Summary:
- Effort: "Ongoing - 1-2 weeks to properly type API responses"
- Impact: "Medium - Hidden runtime bugs"

---

## Target State

### New Type Definitions
```
src/core/types/
├── index.ts           (existing - update exports)
├── libraryItem.ts     (existing - enhance)
├── api.ts             (NEW - API response types)
├── metadata.ts        (NEW - book metadata types)
└── progress.ts        (NEW - progress types)
```

### Helper Functions
```
src/shared/utils/
├── bookMetadata.ts    (NEW - typed accessors)
└── index.ts           (update exports)
```

---

## Specific Changes

### 1.5 Part 1: Define API Response Types

**New file:** `src/core/types/api.ts`

```typescript
/**
 * AudiobookShelf API Response Types
 * Based on API documentation and observed responses
 */

// Base metadata shared across all library items
export interface BaseMetadata {
  title: string;
  subtitle?: string;
  description?: string;
  publisher?: string;
  publishedYear?: string;
  language?: string;
  genres?: string[];
  tags?: string[];
}

// Book-specific metadata
export interface BookMetadata extends BaseMetadata {
  authorName?: string;
  authorNameLF?: string;
  narratorName?: string;
  series?: SeriesInfo[];
  isbn?: string;
  asin?: string;
  explicit?: boolean;
  abridged?: boolean;
}

// Series info embedded in book metadata
export interface SeriesInfo {
  id?: string;
  name: string;
  sequence?: string | number;
}

// Media object types
export interface AudioFile {
  index: number;
  ino: string;
  metadata: {
    filename: string;
    ext: string;
    path: string;
    size: number;
  };
  duration: number;
  codec: string;
  channels: number;
  bitRate: number;
}

export interface BookMedia {
  libraryItemId: string;
  metadata: BookMetadata;
  coverPath?: string;
  audioFiles: AudioFile[];
  chapters: Chapter[];
  duration: number;
  size: number;
  ebookFile?: unknown;
}

// Progress tracking
export interface UserMediaProgress {
  id: string;
  libraryItemId: string;
  episodeId?: string;
  duration: number;
  progress: number;
  currentTime: number;
  isFinished: boolean;
  hideFromContinueListening: boolean;
  lastUpdate: number;
  startedAt: number;
  finishedAt?: number;
}

// Library item with proper typing
export interface TypedLibraryItem {
  id: string;
  ino: string;
  libraryId: string;
  folderId: string;
  path: string;
  relPath: string;
  isFile: boolean;
  mtimeMs: number;
  ctimeMs: number;
  birthtimeMs: number;
  addedAt: number;
  updatedAt: number;
  lastScan?: number;
  scanVersion?: string;
  isMissing: boolean;
  isInvalid: boolean;
  mediaType: 'book' | 'podcast';
  media: BookMedia;
  numFiles: number;
  size: number;
  userMediaProgress?: UserMediaProgress;
}

// API response wrappers
export interface LibraryItemsResponse {
  results: TypedLibraryItem[];
  total: number;
  limit: number;
  page: number;
}

export interface ItemInProgressResponse {
  libraryItem: TypedLibraryItem;
  progress: UserMediaProgress;
}

export interface InProgressResponse {
  items: ItemInProgressResponse[];
}
```

### 2.19: Create getBookMetadata Helper

**New file:** `src/shared/utils/bookMetadata.ts`

```typescript
import { LibraryItem } from '@/core/types';
import { BookMetadata, SeriesInfo, UserMediaProgress } from '@/core/types/api';

/**
 * Safely extract book metadata with proper typing
 * Replaces all `(item.media?.metadata as any)?.X` patterns
 */

interface ExtractedMetadata {
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

export function getBookMetadata(item: LibraryItem | null | undefined): ExtractedMetadata {
  if (!item) {
    return getEmptyMetadata();
  }

  const media = item.media;
  const metadata = media?.metadata as BookMetadata | undefined;

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
export interface ProgressInfo {
  progress: number;
  currentTime: number;
  duration: number;
  isFinished: boolean;
  lastUpdate: number;
}

export function getProgress(item: LibraryItem | null | undefined): ProgressInfo {
  const progress = item?.userMediaProgress as UserMediaProgress | undefined;

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

### Step 3: Update Screens to Use Helper

**Pattern replacement across all files:**

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

### Step 4: Update High-Priority Files

**Priority order by `any` count:**

1. **MyLibraryScreen.tsx (16)** - Replace all metadata access
2. **BookDetailScreen.tsx (12)** - Replace all metadata access
3. **SeriesDetailScreen.tsx (9)** - Replace all metadata access
4. **AuthorDetailScreen.tsx (8)** - Replace all metadata access
5. **playerStore.ts (8)** - Replace progress/duration access
6. **CDPlayerScreen.tsx (7)** - Replace metadata access

**Example for BookDetailScreen:**

```typescript
// BEFORE (12 as any casts)
const title = (book.media?.metadata as any)?.title;
const author = (book.media?.metadata as any)?.authorName;
const narrator = (book.media?.metadata as any)?.narratorName;
const description = (book.media?.metadata as any)?.description;
const series = (book.media?.metadata as any)?.series?.[0];
// ... etc

// AFTER (0 as any casts)
const {
  title,
  authorName,
  narratorName,
  description,
  genres,
  publishedYear,
  duration,
} = getBookMetadata(book);
const primarySeries = getPrimarySeries(book);
const { progress, isFinished } = getProgress(book);
```

### Step 5: Export from shared utils

**Update:** `src/shared/utils/index.ts`

```typescript
export * from './bookMetadata';
```

---

## Cross-Screen Dependencies

| File | Usage | Action |
|------|-------|--------|
| Every screen using LibraryItem | getBookMetadata | Add import, replace patterns |
| playerStore | getProgress, duration | Update after metadata helper exists |
| downloadManager | metadata access | Update imports |
| All hooks returning items | May need type updates | Verify typing flows through |

---

## Testing Criteria

- [ ] All screens compile without `as any` for metadata
- [ ] `getBookMetadata` returns correct values
- [ ] `getProgress` returns correct progress info
- [ ] Null/undefined items return safe defaults
- [ ] TypeScript catches incorrect metadata access
- [ ] No runtime regressions in data display

---

## Phased Approach

### Phase 1 (Week 1): Foundation
1. Create `src/core/types/api.ts` with all types
2. Create `src/shared/utils/bookMetadata.ts`
3. Update 5 highest-any files
4. Target: 202 → 150 `any` casts

### Phase 2 (Week 2): Cleanup
1. Update remaining detail screens
2. Update list screens
3. Update hooks
4. Target: 150 → 80 `any` casts

### Phase 3 (Ongoing): Maintenance
1. Add eslint rule to flag new `as any`
2. Update remaining files opportunistically
3. Target: <50 `any` casts

---

## Effort Breakdown

| Task | Effort | Risk |
|------|--------|------|
| Create api.ts types | 4 hours | Low |
| Create bookMetadata.ts helper | 3 hours | Low |
| Update MyLibraryScreen (16) | 2 hours | Low |
| Update BookDetailScreen (12) | 1.5 hours | Low |
| Update SeriesDetailScreen (9) | 1.5 hours | Low |
| Update AuthorDetailScreen (8) | 1 hour | Low |
| Update playerStore (8) | 1 hour | Medium |
| Update CDPlayerScreen (7) | 1 hour | Low |
| Update remaining screens | 4 hours | Low |
| Testing | 3 hours | - |

**Total: 1-2 weeks (can be done incrementally)**
