# Book Spine Architecture

Complete technical overview of the book spine visualization system, from data caching to screen rendering.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐         ┌─────────────────────────────────────┐   │
│  │   Library Cache     │────────▶│         Spine Cache                  │   │
│  │  (libraryCache.ts)  │         │       (spineCache.ts)                │   │
│  │                     │         │                                      │   │
│  │  • All LibraryItems │         │  • Pre-calculated dimensions         │   │
│  │  • Author/Series    │         │  • Hash values (deterministic)       │   │
│  │  • Genres/Tags      │         │  • Title/Author metadata             │   │
│  │  • Duration         │         │  • One entry per book                │   │
│  └─────────────────────┘         └─────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CALCULATION LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    spineCalculations.ts                                │  │
│  │                                                                        │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │  │
│  │  │ Genre Profiles  │  │ Tag Modifiers   │  │ Series Registry │        │  │
│  │  │ (50+ profiles)  │  │ (epic, cozy..)  │  │ (locked heights)│        │  │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘        │  │
│  │           │                    │                    │                  │  │
│  │           └────────────────────┼────────────────────┘                  │  │
│  │                                ▼                                       │  │
│  │                   calculateBookDimensions()                            │  │
│  │                                │                                       │  │
│  │           ┌────────────────────┼────────────────────┐                  │  │
│  │           ▼                    ▼                    ▼                  │  │
│  │      baseWidth           baseHeight              hash                  │  │
│  │     (28-70px)           (290-450px)         (deterministic)            │  │
│  │                                                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          LAYOUT LAYER                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    useBookRowLayout.ts                                 │  │
│  │                                                                        │  │
│  │  Input: BookSpineVerticalData[] + options                              │  │
│  │                                                                        │  │
│  │  1. Read from Spine Cache (or calculate fallback)                      │  │
│  │  2. Apply scale factor & thickness multiplier                          │  │
│  │  3. Calculate touch padding (44px minimum)                             │  │
│  │  4. Determine leaning pattern:                                         │  │
│  │     • Every ~5 books, one leans (direction from hash)                  │  │
│  │     • Last book always leans left (bookend effect)                     │  │
│  │                                                                        │  │
│  │  Output: BookLayoutInfo[] with width, height, leanAngle, touchPadding  │  │
│  │                                                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PRESENTATION LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                   BookSpineVertical.tsx                                │  │
│  │                                                                        │  │
│  │  SVG-based rendering with:                                             │  │
│  │                                                                        │  │
│  │  ┌─────────────────────────────────────────────┐                       │  │
│  │  │  ┌─────────────────────────────────────┐   │ ▲                      │  │
│  │  │  │         AUTHOR SECTION              │   │ │ 30%                  │  │
│  │  │  │    (horizontal or vertical text)    │   │ │                      │  │
│  │  │  └─────────────────────────────────────┘   │ ▼                      │  │
│  │  │  ┌─────────────────────────────────────┐   │ ▲                      │  │
│  │  │  │                                     │   │ │                      │  │
│  │  │  │         TITLE SECTION               │   │ │ 62%                  │  │
│  │  │  │    (vertical text, bottom-to-top)   │   │ │                      │  │
│  │  │  │                                     │   │ │                      │  │
│  │  │  └─────────────────────────────────────┘   │ ▼                      │  │
│  │  │  ┌─────────────────────────────────────┐   │ ▲                      │  │
│  │  │  │       PROGRESS/CHECKMARK            │   │ │ 8%                   │  │
│  │  │  └─────────────────────────────────────┘   │ ▼                      │  │
│  │  └─────────────────────────────────────────────┘                       │  │
│  │                                                                        │  │
│  │  Visual Features:                                                      │  │
│  │  • Genre-based typography (serif/sans-serif, weight, transform)        │  │
│  │  • Cream/gray background (#e8e8e8)                                     │  │
│  │  • Black text                                                          │  │
│  │  • Slight corner radius                                                │  │
│  │  • Orange top border if downloaded                                     │  │
│  │  • Series icon (small glyph)                                           │  │
│  │  • Progress percentage or checkmark                                    │  │
│  │                                                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Consumer Components:                                                       │
│  • BookshelfView (animated domino effect)                                   │
│  • BookRow (simple row)                                                     │
│  • SeriesSpineCard (scaled down in browse)                                  │
│  • TasteTextList (shelf mode)                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Data Layer

### Library Cache (`src/core/cache/libraryCache.ts`)

The foundation - stores all library items with their metadata.

```typescript
interface LibraryItem {
  id: string;
  media: {
    metadata: {
      title: string;
      authorName: string;
      genres: string[];
      tags: string[];
      seriesName: string;
      // ...
    };
    duration: number; // seconds
  };
  userMediaProgress?: {
    progress: number; // 0-1
  };
}
```

**Triggers spine cache population** when items load:
```typescript
// In loadCache():
useSpineCacheStore.getState().populateFromLibrary(items);
```

### Spine Cache (`src/features/home/stores/spineCache.ts`)

Pre-calculated dimensions for every book - single source of truth.

```typescript
interface CachedSpineData {
  id: string;
  baseWidth: number;      // 28-70px (unscaled)
  baseHeight: number;     // 290-450px (unscaled)
  hash: number;           // For deterministic randomization
  genres: string[];
  tags: string[];
  duration: number;
  seriesName?: string;
  title: string;
  author: string;
  progress: number;
}
```

**Population happens once** on library load:
```typescript
populateFromLibrary(items: LibraryItem[]) {
  for (const item of items) {
    const calculated = calculateBookDimensions({
      id: item.id,
      genres,
      tags,
      duration,
      seriesName,
    });

    cache.set(item.id, {
      baseWidth: calculated.width,
      baseHeight: calculated.height,
      hash: hashString(item.id),
      // ...metadata
    });
  }
}
```

---

## 2. Calculation Layer

### Spine Calculations (`src/features/home/utils/spineCalculations.ts`)

The brain of the system - 2000+ lines of dimension and typography logic.

#### Genre Profiles (50+ profiles)

Each genre has a unique "visual voice":

```typescript
const GENRE_TYPOGRAPHY: Record<string, TypographyProfile> = {
  "Fantasy": {
    title: {
      fontFamily: 'serif',
      fontWeight: 600,
      fontStyle: 'normal',
      textTransform: 'none',
      letterSpacing: 0.01
    },
    author: {
      fontFamily: 'serif',
      fontWeight: 400,
      fontStyle: 'normal',
      textTransform: 'none',
      letterSpacing: 0.02
    },
    layout: {
      authorPosition: 'top',
      authorOrientationBias: 'vertical',
      titleWeight: 'heavy',
      contrast: 'medium'
    },
    personality: 'classic',
  },

  "Science Fiction": {
    title: {
      fontFamily: 'sans-serif',
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: 0.08
    },
    // ...modern, clean aesthetic
    personality: 'modern',
  },

  "Romance": {
    title: {
      fontFamily: 'serif',
      fontWeight: 400,
      fontStyle: 'italic',  // Elegant italic
      letterSpacing: 0.02
    },
    personality: 'warm',
  },

  // 47 more profiles...
};
```

#### Dimension Profiles

Each genre also has dimension characteristics:

```typescript
const GENRE_DIMENSION_PROFILES: Record<string, GenreDimensionProfile> = {
  "Fantasy": {
    baseHeight: 380,              // Taller for epic stories
    baseWidth: 45,
    heightRange: [0.95, 1.12],    // 95%-112% of base
    widthRange: [0.85, 1.15],
    durationInfluence: 0.35,      // 35% width from duration
    aspectRatio: { min: 5, max: 12, ideal: 8 },
    personality: 'classic',
  },

  "Children's 0-2": {
    baseHeight: 290,              // Shorter, compact
    baseWidth: 55,                // Wider (board book feel)
    heightRange: [0.9, 1.05],
    // ...
    personality: 'playful',
  },
};
```

#### Tag Modifiers

Tags fine-tune dimensions:

```typescript
const TAG_MODIFIERS: Record<string, TagModifier> = {
  'epic-fantasy': {
    heightMultiplier: 1.08,  // 8% taller
    widthMultiplier: 1.05,   // 5% thicker
  },
  'cozy-fantasy': {
    heightMultiplier: 0.92,  // 8% shorter (cozier)
    widthMultiplier: 0.95,
  },
  'space-opera': {
    heightMultiplier: 1.05,
  },
  // ...more modifiers
};
```

#### Series Consistency

Books in a series share the same height (locked after first calculation):

```typescript
const seriesDimensionRegistry = new Map<string, SeriesDimensions>();

// When calculating a series book:
if (book.seriesName) {
  const seriesKey = normalizeSeriesName(book.seriesName);
  const existing = seriesDimensionRegistry.get(seriesKey);

  if (existing) {
    // USE LOCKED HEIGHT - only width varies
    return {
      height: existing.height,  // Same as other books in series
      width: calculateSeriesWidth(book, existing),
    };
  } else {
    // FIRST BOOK IN SERIES - lock the height
    seriesDimensionRegistry.set(seriesKey, {
      height: calculatedHeight,
      locked: true,
    });
  }
}
```

#### The Main Calculation Function

```typescript
function calculateBookDimensions(book: BookDimensionInput): CalculatedDimensions {
  // Step 1: Get base genre profile
  const profile = resolveGenreProfile(book.genres);

  // Step 2: Check series registry (consistency first)
  if (book.seriesName) {
    const seriesDims = getSeriesDimensions(book.seriesName);
    if (seriesDims) {
      return { height: seriesDims.height, width: calculateWidth(book) };
    }
  }

  // Step 3: Calculate base dimensions from profile
  const seed = hashString(book.id);  // Deterministic randomization

  // Height: base × variation within genre range
  const heightVariation = seededRandomFloat(seed, profile.heightRange[0], profile.heightRange[1]);
  let height = profile.baseHeight * heightVariation;

  // Width: base × variation × duration factor
  const durationFactor = calculateDurationFactor(book.duration, profile);
  const widthVariation = seededRandomFloat(seed >> 8, profile.widthRange[0], profile.widthRange[1]);
  let width = profile.baseWidth * widthVariation * durationFactor;

  // Step 4: Apply tag modifiers (epic-fantasy, cozy, etc.)
  const modified = applyTagModifiers({ width, height }, profile, book.tags);

  // Step 5: Enforce constraints
  width = clamp(modified.width, MIN_WIDTH, MAX_WIDTH);   // 28-70px
  height = clamp(modified.height, MIN_HEIGHT, MAX_HEIGHT); // 290-450px

  // Step 6: Lock series height if applicable
  if (book.seriesName) {
    lockSeriesHeight(book.seriesName, height);
  }

  return { width, height, aspectRatio: height/width, profile, personality };
}
```

#### Duration → Width Mapping

Longer audiobooks = thicker spines:

```typescript
function calculateDurationFactor(durationSeconds: number, profile: GenreDimensionProfile): number {
  const hours = durationSeconds / 3600;
  const normalized = Math.min(hours / 30, 1);  // Cap at 30 hours

  // Linear interpolation with genre-specific influence
  return lerp(0.7, 1.3, normalized * profile.durationInfluence);
}

// Examples:
// 2 hour audiobook  → factor ~0.75 → thinner spine
// 15 hour audiobook → factor ~1.0  → medium spine
// 40 hour audiobook → factor ~1.3  → thickest spine
```

#### Deterministic Hash Function

Same book ID always produces same "random" values:

```typescript
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return hash >>> 0;  // Ensure positive
}

// Used for:
// - Height/width variation within range
// - Lean direction (left or right)
// - Lean frequency (every 5-9 books)
// - Color selection in thumbnails
```

---

## 3. Layout Layer

### useBookRowLayout Hook (`src/features/home/hooks/useBookRowLayout.ts`)

Transforms book data into renderable layouts with position-dependent logic.

```typescript
interface BookLayoutInfo {
  book: BookSpineVerticalData;
  width: number;       // Final scaled width
  height: number;      // Final scaled height
  leanAngle: number;   // -3, 0, or +3 degrees
  shouldLean: boolean;
  touchPadding: number; // Extra padding for 44px touch target
}

function useBookRowLayout(
  books: BookSpineVerticalData[],
  options: {
    scaleFactor?: number;        // default: 1
    thicknessMultiplier?: number; // default: 1
    leanAngle?: number;          // default: 3
    minTouchTarget?: number;     // default: 44
    enableLeaning?: boolean;     // default: true
  }
): BookLayoutInfo[] {

  const getSpineData = useSpineCacheStore(state => state.getSpineData);

  return useMemo(() => {
    let nextLeanAt = 5;  // First lean at index 5

    return books.map((book, index) => {
      // 1. GET CACHED DIMENSIONS (or calculate fallback)
      const cached = getSpineData(book.id);
      const baseWidth = cached?.baseWidth ?? calculateFallback();
      const baseHeight = cached?.baseHeight ?? calculateFallback();
      const hash = cached?.hash ?? hashString(book.id);

      // 2. APPLY SCALING
      const width = baseWidth * scaleFactor * thicknessMultiplier;
      const height = baseHeight * scaleFactor;

      // 3. CALCULATE TOUCH PADDING
      const touchPadding = Math.max(0, Math.ceil((44 - width) / 2));

      // 4. DETERMINE LEAN ANGLE
      let leanAngle = 0;

      if (index === books.length - 1) {
        // LAST BOOK: always leans LEFT (bookend effect)
        leanAngle = -3;
      } else if (index === nextLeanAt) {
        // PERIODIC LEAN: every 5-9 books
        leanAngle = (hash % 2 === 0) ? 3 : -3;  // Direction from hash
        nextLeanAt = index + 5 + (hash % 5);    // Schedule next
      }

      return { book, width, height, leanAngle, touchPadding };
    });
  }, [books, options]);
}
```

#### Leaning Pattern Visualization

```
Book Index:  0   1   2   3   4   5   6   7   8   9   10  11  12
             │   │   │   │   │   │   │   │   │   │   │   │   │
             ▏   ▏   ▏   ▏   ▏   ╱   ▏   ▏   ▏   ▏   ╲   ▏   ╲
             ▏   ▏   ▏   ▏   ▏  ╱    ▏   ▏   ▏   ▏    ╲  ▏    ╲
             ▏   ▏   ▏   ▏   ▏ ╱     ▏   ▏   ▏   ▏     ╲ ▏     ╲
            ─┴───┴───┴───┴───┴─┴─────┴───┴───┴───┴──────┴─┴──────┴─
                             lean     ▲        lean      last book
                             right    │        left      (always left)
                                      │
                              next lean scheduled
                              5 + (hash % 5) books later
```

---

## 4. Presentation Layer

### BookSpineVertical Component (`src/features/home/components/BookSpineVertical.tsx`)

SVG-based rendering for crisp text at any scale.

#### Visual Structure

```
┌───────────────────────────────────────┐ ▲
│ ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ │ │ (orange if downloaded)
│  ┌─────────────────────────────────┐  │ │
│  │      A U T H O R                │  │ │ ~30% height
│  │   (horizontal or vertical)      │  │ │
│  └─────────────────────────────────┘  │ │
│  ┌─────────────────────────────────┐  │ │
│  │                                 │  │ │
│  │         T                       │  │ │
│  │         I                       │  │ │
│  │         T    [icon]             │  │ │ ~62% height
│  │         L                       │  │ │
│  │         E                       │  │ │
│  │                                 │  │ │
│  └─────────────────────────────────┘  │ │
│  ┌─────────────────────────────────┐  │ │
│  │          45%  or  ✓             │  │ │ ~8% height
│  └─────────────────────────────────┘  │ ▼
└───────────────────────────────────────┘
         width: 28-70px
```

#### Typography Selection

Based on genre, the component applies different visual styles:

| Genre | Font | Weight | Transform | Style |
|-------|------|--------|-----------|-------|
| Fantasy | Serif (Georgia) | 600 | None | Normal |
| Sci-Fi | Sans-serif | 500 | UPPERCASE | Normal |
| Romance | Serif | 400 | None | *Italic* |
| Thriller | Sans-serif | 700 | UPPERCASE | Normal |
| Literary | Serif | 400 | None | *Italic* |
| Children's | Sans-serif | 700 | None | Normal |

#### Layout Solver

Text is dynamically sized to fill available space:

```typescript
// Title layout (vertical, bottom-to-top)
const titleSolution = solveTitleLayout({
  text: book.title,
  bounds: { width: sectionWidth, height: titleHeight },
  constraints: {
    minFontSize: 8,
    maxFontSize: 24,
    minLines: 1,
    maxLines: 4,
  },
  typography: genreTypography.title,
});

// Author layout (horizontal or vertical based on genre preference)
const authorSolution = solveAuthorLayout({
  text: book.author,
  bounds: { width: sectionWidth, height: authorHeight },
  orientationBias: genreTypography.layout.authorOrientationBias,
});
```

#### Animation (in BookshelfView)

When switching layouts, books animate with a "domino fall" effect:

```typescript
// Exit: All books hide instantly
setPhase('switching');

// Enter: Books fall from top, staggered
books.forEach((book, index) => {
  const delay = index * 25; // 25ms between each book

  translateY.value = withDelay(delay, withTiming(0, {
    duration: 180,
    easing: Easing.out(Easing.back(1.2)), // Bounce effect
  }));
});
```

---

## 5. Consumer Components

### BookshelfView
Full animated bookshelf with domino effects. Uses spine cache for dimensions, handles shelf/stack modes.

### BookRow
Simple horizontal row for quick displays. Uses `useBookRowLayout` hook.

### SeriesSpineCard
Scaled-down spines (35% size) for browse page series cards. Uses `useBookRowLayout` with small scale factor.

### TasteTextList
"Based on Your Taste" section. Shelf mode shows horizontal scroll of spines at 80% scale.

### CollectionThumb
Uses spine cache for consistent hash-based fallback colors.

---

## 6. File Reference

| File | Purpose |
|------|---------|
| `src/core/cache/libraryCache.ts` | Main library data, triggers spine cache |
| `src/features/home/stores/spineCache.ts` | Pre-calculated dimensions cache |
| `src/features/home/utils/spineCalculations.ts` | Genre profiles, dimension math |
| `src/features/home/utils/layoutSolver.ts` | Text fitting algorithms |
| `src/features/home/hooks/useBookRowLayout.ts` | Row layout with leaning logic |
| `src/features/home/hooks/useSpineCache.ts` | Hook for cache access |
| `src/features/home/components/BookSpineVertical.tsx` | SVG spine rendering |
| `src/features/home/components/BookshelfView.tsx` | Animated bookshelf |
| `src/features/home/components/BookRow.tsx` | Simple row component |

---

## 7. Performance Optimizations

1. **Pre-calculation**: All dimensions calculated once on library load, not per-render
2. **Memoization**: `useMemo` prevents recalculation when inputs unchanged
3. **SVG Rendering**: Vector-based for crisp scaling without image assets
4. **Shallow Selectors**: `useShallow` prevents unnecessary re-renders from store
5. **Deterministic Hashing**: Same input always produces same output (no random flickering)
6. **Series Locking**: Heights locked after first book calculated, preventing layout shifts

---

## 8. Design Principles

1. **Determinism**: Same book always looks the same (hash-based variations)
2. **Series Consistency**: Books in a series share height for visual cohesion
3. **Genre Expression**: Typography visually communicates genre at a glance
4. **Touch Accessibility**: Minimum 44px touch target (Apple HIG)
5. **Graceful Fallbacks**: Every decision has a fallback if data is missing
6. **Performance First**: Expensive calculations cached, not repeated
