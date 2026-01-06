# DiscoverTab (BrowseScreen) Documentation

## Overview

The DiscoverTab (`src/features/browse/screens/BrowseScreen.tsx`) is a discovery-focused screen that helps users find new content through personalized recommendations, mood-based filtering, and curated content rows.

**Key Files:**
- `src/features/browse/screens/BrowseScreen.tsx` - Main screen component
- `src/features/discover/hooks/useDiscoverData.ts` - Core data hook
- `src/features/discover/components/HeroSection.tsx` - Hero recommendation display
- `src/features/discover/components/ContentRowCarousel.tsx` - Content row renderer
- `src/features/recommendations/hooks/useRecommendations.ts` - Personalization engine

---

## Hero Recommendation Logic

**Location:** `src/features/discover/hooks/useDiscoverData.ts:714-758`

The hero selection follows this priority:

1. **Mood Session Active** - Shows top mood-matched book from `moodRecommendations`
   - Reason: `"A {moodAdjective} {worldLabel} pick"` or `"Perfect for a {mood} mood"`

2. **Personalized Recommendation** - Uses top item from `groupedRecommendations`
   - Reason: `"Recommended for you"`

3. **Fallback to Newest** - Newest unfinished book sorted by `addedAt`
   - Type: `'new'`
   - Reason: `"New to your library"`

### Time-based Reasons

When no mood session is active, the hero displays context-aware messaging:

```typescript
// getTimeBasedReason() in useDiscoverData.ts:48-59
5am-12pm  → "Perfect for your morning"
12pm-5pm  → "Great for your afternoon"
5pm-9pm   → "Perfect for your evening"
9pm-5am   → "Perfect for winding down"
```

### Hero Component Features

**Location:** `src/features/discover/components/HeroSection.tsx`

- Large 300x300 cover with blur background
- Overlay download button (bottom-left) with status indicators
- Overlay play button (bottom-right)
- Title with "Written by" / "Read by" credits below
- Completion badge overlay for finished books

---

## Content Row Generation

**Location:** `src/features/discover/hooks/useDiscoverData.ts`

Content rows are generated with priority-based ordering:

| Row Type | Priority | Source | Display Mode |
|----------|----------|--------|--------------|
| Recommendations (3 max) | 2.0, 2.3, 2.6 | `useRecommendations` hook | First: `featured`, others: `carousel` |
| New This Week | 3 | Books added < 7 days ago | `carousel` |
| Continue Series | 4 | Next book in in-progress series | `carousel` |
| Not Started | 5 | Unfinished, not started | `carousel` |
| Serendipity | 6 | Outside user's usual genres | `carousel` |
| Short & Sweet | 8 | Books < 5 hours | `carousel` |
| Long Listens | 9 | Books > 10 hours | `carousel` |

### Filtering Logic (Applied to All Rows)

- Excludes finished books (via `isFinished` check from reading history)
- Excludes middle-of-series books (via `createSeriesFilter` - only shows first or next book)
- Applies genre filter when a genre chip is selected
- Applies mood filter (30% minimum match) when mood session is active
- Kid Mode filtering via `filterForKidMode()` when enabled

### Row Types Explained

#### New This Week (`newThisWeekRow`)
```typescript
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
// Filters: addedAt > oneWeekAgo, !isFinished, isSeriesAppropriate
// Sorted by: addedAt descending (newest first)
```

#### Short & Sweet (`shortBooksRow`)
```typescript
const SHORT_BOOK_THRESHOLD = 5 * 60 * 60; // 5 hours
// Filters: duration < 5 hours, !isFinished
```

#### Long Listens (`longBooksRow`)
```typescript
const LONG_BOOK_THRESHOLD = 10 * 60 * 60; // 10 hours
// Filters: duration >= 10 hours, !isFinished
// Sorted by: duration descending (longest first)
```

#### Continue Series (`continueSeriesRow`)
- Finds series from in-progress books
- Locates next unfinished book in each series (sequence > current)
- Lower mood threshold (20%) to preserve series continuity

#### Serendipity Row (`serendipityRow`)
- Only shows if user has reading history
- Finds books in genres user HASN'T explored
- Prefers medium-length books (8-15 hours)
- Adds randomness for freshness
- Displays sparkle badge on cards

### Recommendation Rows

**Location:** `src/features/recommendations/hooks/useRecommendations.ts:394-487`

Grouped by source with display titles:
- `"Because you finished {title}"` - from finished books
- `"More like {title}"` - from currently listening
- `"Because you love {genre}"` - from genre preferences
- `"More by {author}"` - from author preferences
- `"Narrated by {narrator}"` - from narrator preferences

**Scoring weights:**
- Finished book matches: 40-80 points (highest)
- Listening history matches: 25-50 points (60% of finished)
- Preference matches: 10-30 points
- Random factor: 0-5 points (for variety)

---

## How DiscoverTab Differs from LibraryTab

| Aspect | DiscoverTab (Browse) | LibraryTab (My Library) |
|--------|---------------------|-------------------------|
| **Purpose** | Discovery & recommendations | User's personal collection |
| **Content Source** | Entire library + recommendations | Downloaded/favorited items only |
| **Tabs/Filters** | Genre chips + mood session | All, Downloaded, In Progress, Completed, Favorites |
| **Hero Section** | Top recommendation | Continue listening |
| **Content Rows** | Curated discovery rows | User's books by status |
| **Data Source** | `useLibraryCache` + `useRecommendations` | `useDownloads` + `useContinueListening` |
| **Personalization** | Reading history + mood matching | Sorting by progress/date |
| **Additional Sections** | Popular Series, Top Authors, Category Grid | Storage summary, favorites management |

### Key Architectural Differences

**DiscoverTab:**
- Operates on the **full library cache** (all books on server)
- Filters and scores content to surface relevant recommendations
- Focus on "what should I listen to next?"
- Content changes based on mood, time of day, reading history

**LibraryTab:**
- Operates on **user's owned content** (downloads + favorites)
- Tab-based filtering by status (in-progress, completed, etc.)
- Focus on "what do I already have?"
- Includes storage management and download status

---

## Server Endpoints Used

| Endpoint | Purpose | Used In |
|----------|---------|---------|
| `GET /api/libraries/{libraryId}/items` | Full library fetch | `libraryCache.ts` (30-day TTL cache) |
| `GET /api/me/items-in-progress` | Continue listening items | `useContinueListening` hook |
| `GET /api/items/{id}` | Full item details | `HeroSection.tsx:74` (play action) |
| `GET /api/items/{id}/cover` | Cover images | `apiClient.getItemCoverUrl()` |
| `GET /api/authors/{id}/image` | Author photos | `TopAuthorsSection.tsx:70` |
| Local SQLite `user_books` | Reading history stats | `useRecommendations.ts:84-88` |

### Data Flow Diagram

```
Library Cache (30-day TTL from /api/libraries/{id}/items)
    │
    ▼
useDiscoverData(selectedGenre, moodSession)
    ├── useLibraryCache() ─────────────────→ all library items
    ├── useContinueListening() ────────────→ in-progress books
    ├── useRecommendations(items) ─────────→ personalized recommendation rows
    ├── useMoodRecommendations(session) ───→ mood-filtered content
    └── useReadingHistory() ───────────────→ finished/started book IDs
    │
    ▼
BrowseScreen renders:
    ├── QuickFilterChips (genre) OR MoodFilterPills (when mood active)
    ├── MoodDiscoveryCard (entry point, hidden when mood active)
    ├── HeroSection (top pick with play/download actions)
    ├── BrowsePills (category navigation: Authors, Series, etc.)
    ├── ContentRowCarousel[] (sorted by priority, filtered by genre/mood)
    ├── PopularSeriesSection (series sorted by user progress)
    ├── TopAuthorsSection (authors with most books)
    ├── CategoryGrid (genre browsing)
    └── PreferencesPromoCard (if no preferences set)
```

---

## Display Modes

**Location:** `src/features/discover/components/ContentRowCarousel.tsx`

| Mode | Layout | Items Shown | Used For |
|------|--------|-------------|----------|
| `featured` | 2x2 large grid | 4 | First recommendation row |
| `carousel` | Horizontal scroll | 10 | Most discovery rows |
| `compact` | Smaller horizontal | 10 | Lower priority rows |
| `grid` | 2x2 standard grid | 4 | Default fallback |

### Card Sizes

```typescript
// Grid/Featured cards
CARD_WIDTH = (screenWidth - padding * 2 - gap) / 2  // ~50% screen width
COVER_HEIGHT = CARD_WIDTH  // Square covers

// Carousel cards
CAROUSEL_CARD_WIDTH = scale(140)
CAROUSEL_COVER_HEIGHT = scale(140)

// Compact cards
COMPACT_CARD_WIDTH = scale(100)
COMPACT_COVER_HEIGHT = scale(100)
```

---

## Mood-Aware Behavior

When a mood session is active (`hasMoodSession = true`):

1. **Filter Chips** → Replaced with `MoodFilterPills` showing active mood/pace/world
2. **Hero** → Shows top mood-matched book with mood-specific reason
3. **Row Titles** → Dynamic titles like "Quick Cozy Listens" or "Epic Thrilling Journeys"
4. **Content Filtering** → All rows filter to books with 30%+ mood match
5. **Hidden Elements** → MoodDiscoveryCard, BrowsePills, and CategoryGrid hidden

### Mood Category Titles

```typescript
// getMoodCategoryTitle() examples:
"New This Week" + comfort mood → "New Cozy Arrivals"
"Short & Sweet" + thrills mood → "Quick Thrilling Listens"
"Long Listens" + escape mood + fantasy world → "Long Fantasy Adventures"
```

---

## Additional Sections

### PopularSeriesSection
**Location:** `src/features/discover/components/PopularSeriesSection.tsx`

- 2-column grid with fanned cover cards
- Series sorted by user's reading progress (series with finished books first)
- Title changes: "Your Series" (if has history) vs "Series" (new user)
- Heart button for favoriting

### TopAuthorsSection
**Location:** `src/features/discover/components/TopAuthorsSection.tsx`

- Horizontal scroll of author avatars
- Authors with images prioritized
- Sorted by book count
- Navigates to AuthorDetail screen

### CategoryGrid
**Location:** `src/features/discover/components/CategoryGrid.tsx`

- Genre-based browsing tiles
- Icons for each genre category
- Navigates to filtered book list

---

## Type Definitions

**Location:** `src/features/discover/types.ts`

```typescript
interface ContentRow {
  id: string;
  type: RowType;
  title: string;
  subtitle?: string;
  items: BookSummary[];
  totalCount: number;
  priority: number;
  displayMode?: 'featured' | 'carousel' | 'compact' | 'grid';
  sourceAttribution?: SourceAttribution;  // For "Because you finished X"
  isSerendipity?: boolean;  // Sparkle badge
}

interface HeroRecommendation {
  book: BookSummary;
  reason: string;  // "Perfect for your evening"
  type: 'personalized' | 'popular' | 'new' | 'staff_pick';
}

interface BookSummary {
  id: string;
  title: string;
  author: string;
  narrator?: string;
  coverUrl: string;
  duration: number;
  genres: string[];
  progress?: number;
  isDownloaded: boolean;
  isSerendipity?: boolean;
}
```
