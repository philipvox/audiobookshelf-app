## 🔄 Spine System Migration Guide

Step-by-step guide for migrating from the old monolithic system to the new modular architecture.

---

## Phase 1: Parallel Running (Week 1-2)

**Goal:** New system runs alongside old system without breaking changes.

### Step 1: Update Imports (Low Risk)

Start using the new constants file to eliminate magic numbers:

```typescript
// Before
const TITLE_PERCENT = 68;
const AUTHOR_PERCENT = 26;
const MIN_WIDTH = 20;

// After
import { SPINE_LAYOUT, WIDTH_CALCULATION } from '@/features/home/utils/spine/constants';

const TITLE_PERCENT = SPINE_LAYOUT.SECTIONS.TITLE;
const AUTHOR_PERCENT = SPINE_LAYOUT.SECTIONS.AUTHOR;
const MIN_WIDTH = WIDTH_CALCULATION.MIN;
```

**Files to update:**
- `src/features/home/components/BookSpineVertical.tsx`
- `src/features/home/components/BookshelfView.tsx`
- `src/features/home/hooks/useBookRowLayout.ts`

### Step 2: Add Lazy Color Extraction (Medium Risk)

Replace eager color extraction with lazy loading:

```typescript
// Before - in spineCache.ts
export const useSpineCacheStore = create((set, get) => ({
  extractCoverColors: async () => {
    // Extracts ALL colors immediately
    for (const book of books) {
      const colors = await getColors(book.coverUrl);
      // ...
    }
  },
}));

// After - in components
import { useSpineColors } from '@/features/home/utils/spine/colors/lazyExtractor';

function BookSpineVertical({ book }) {
  // Colors load only when spine is visible
  const colors = useSpineColors(book.id, book.coverUrl);

  return (
    <View style={{ backgroundColor: colors.background }}>
      {colors.status === 'loading' && <Skeleton />}
      {/* ... */}
    </View>
  );
}
```

**Benefit:** 70-80% reduction in color extraction API calls.

### Step 3: Test Genre Matching (No Risk)

Compare old vs new genre matching in parallel:

```typescript
import { matchBestGenre } from '@/features/home/utils/spine/genre/matcher';
import { detectGenreCategory } from '../spineCalculations'; // Old

const testGenres = ['Fantasy', 'Adventure'];

const oldResult = detectGenreCategory(testGenres);
const newResult = matchBestGenre(testGenres)?.profile;

if (oldResult !== newResult) {
  console.warn('[Migration] Genre mismatch:', { old: oldResult, new: newResult });
}

// Use old result for now, but log differences
```

**Files to update:**
- Add logging to `useSpineCache.ts`
- Monitor differences for 1-2 weeks

---

## Phase 2: Component Migration (Week 3-4)

**Goal:** Update components to use new API while maintaining compatibility.

### Step 1: Migrate BookSpineVertical (High Impact)

This is the core rendering component:

```typescript
// Before
interface BookSpineVerticalProps {
  book: BookSpineVerticalData;
  width: number;
  height: number;
  leanAngle: number;
  // ... 10+ more props
}

// After (cleaner interface)
interface BookSpineVerticalProps {
  config: SpineConfig;  // OR pass style directly
  style: CompleteSpineStyle;
}

function BookSpineVertical({ config, style }: BookSpineVerticalProps) {
  const { dimensions, typography, colors } = style;

  // Or generate here if config passed
  const style = useMemo(() =>
    generateSpineStyle(config), [config]
  );

  // Render using style properties
}
```

**Migration Strategy:**
1. Add new props as optional
2. Keep old props working (fallback)
3. Gradually update call sites
4. Remove old props after all call sites updated

### Step 2: Migrate BookshelfView (Medium Impact)

Update to use new scaling system:

```typescript
// Before - multiple scale factors
const SHELF_SCALE_FACTOR = 0.95;
const STACK_SCALE_FACTOR = 0.45;
const scaledWidth = baseWidth * SHELF_SCALE_FACTOR * THICKNESS_MULTIPLIER;

// After - single context-aware scaling
import { SPINE_SCALES } from '@/features/home/utils/spine/constants';
import { scaleDimensions } from '@/features/home/utils/spine/core/dimensions';

const scaled = scaleDimensions(baseDimensions, 'shelf');
// scaled.width, scaled.height, scaled.touchPadding
```

**Benefits:**
- ✅ Eliminates compound scaling errors
- ✅ Single source of truth for scales
- ✅ Predictable, debuggable dimensions

### Step 3: Migrate Cache System (High Impact)

Replace old cache with new config-based approach:

```typescript
// Before - cache stores pre-calculated everything
interface CachedSpineData {
  id: string;
  baseWidth: number;
  baseHeight: number;
  backgroundColor: string;
  textColor: string;
  // ... 15+ fields
}

// After - cache stores configs, generate on demand
interface CachedSpineConfig {
  config: SpineConfig;
  generatedAt: number;
}

const spineConfigCache = new Map<string, CachedSpineConfig>();

function getSpineStyle(bookId: string): CompleteSpineStyle {
  const cached = spineConfigCache.get(bookId);
  if (cached) {
    return generateSpineStyle(cached.config);
  }
  // Generate and cache
}
```

**Benefits:**
- ✅ Smaller cache (configs vs full styles)
- ✅ Always uses latest generation logic
- ✅ Easier to invalidate/update

---

## Phase 3: Deprecation (Week 5-6)

**Goal:** Remove old code, finalize new system.

### Step 1: Move Old Code to Legacy Folder

```bash
# Create legacy folder
mkdir -p src/features/home/utils/spine/legacy

# Move old file
mv src/features/home/utils/spineCalculations.ts \
   src/features/home/utils/spine/legacy/spineCalculations.ts
```

Add deprecation warnings:

```typescript
/**
 * @deprecated Use generateSpineStyle from '@/features/home/utils/spine' instead
 * This file will be removed in v0.7.0
 */
export function calculateBookDimensions(...) {
  console.warn('[DEPRECATED] calculateBookDimensions - use generateSpineStyle instead');
  // ...
}
```

### Step 2: Update All Remaining Call Sites

Find all imports of old system:

```bash
# Find all imports
grep -r "from '../spineCalculations'" src/
grep -r "from './spineCalculations'" src/

# Update each file to use new API
```

### Step 3: Remove Legacy Code

After confirming all call sites updated:

```bash
# Remove old file
rm -rf src/features/home/utils/spine/legacy/

# Remove from git history (optional, saves space)
git filter-branch --tree-filter 'rm -f src/features/home/utils/spineCalculations.ts' HEAD
```

---

## Phase 4: Optimization (Week 7+)

**Goal:** Leverage new architecture for performance wins.

### Optimization 1: Lazy Load Genre Profiles

Currently all 50+ genres are loaded upfront. With new modular system:

```typescript
// Before (in bundle always)
import { FANTASY_PROFILE, THRILLER_PROFILE, /* ... */ } from './profiles';

// After (lazy loaded)
const genreProfiles = {
  fantasy: () => import('./profiles/fantasy'),
  thriller: () => import('./profiles/thriller'),
  // ...
};

async function getGenreProfile(name: string) {
  const loader = genreProfiles[name];
  if (!loader) return DEFAULT_PROFILE;

  const module = await loader();
  return module.PROFILE;
}
```

**Expected savings:** ~100KB initial bundle size

### Optimization 2: Viewport-based Color Extraction

Only extract colors for books in viewport:

```typescript
import { useInView } from 'react-intersection-observer';
import { useSpineColors } from '@/features/home/utils/spine/colors/lazyExtractor';

function BookSpine({ book }) {
  const { ref, inView } = useInView({ triggerOnce: true });

  // Only extract when visible
  const colors = useSpineColors(
    book.id,
    book.coverUrl,
    inView  // enabled = inView
  );

  return <View ref={ref}>...</View>;
}
```

**Expected savings:** 90%+ reduction in color extractions

### Optimization 3: Service Worker Caching

Cache generated styles in service worker:

```typescript
// In service worker
self.addEventListener('message', async (event) => {
  if (event.data.type === 'CACHE_SPINE_STYLE') {
    const { bookId, style } = event.data;
    const cache = await caches.open('spine-styles-v1');
    await cache.put(
      `/spine-style/${bookId}`,
      new Response(JSON.stringify(style))
    );
  }
});
```

**Expected savings:** Instant spine rendering on return visits

---

## Testing Strategy

### Unit Tests

```bash
# Run during migration to catch regressions
npm test spine/__tests__/

# Ensure 100% passing before deploying
```

### Visual Regression Tests

Take screenshots before/after migration:

```typescript
// In E2E tests
test('spine appearance unchanged after migration', async () => {
  const before = await page.screenshot({ selector: '.bookshelf' });
  // Update to new system
  const after = await page.screenshot({ selector: '.bookshelf' });

  expect(compareImages(before, after)).toBeLessThan(0.01); // <1% difference
});
```

### Performance Tests

```typescript
test('new system is faster than old', async () => {
  const oldStart = performance.now();
  const oldResults = books.map(calculateBookDimensions);
  const oldTime = performance.now() - oldStart;

  const newStart = performance.now();
  const newResults = books.map(b => generateSpineStyle(configFromBook(b)));
  const newTime = performance.now() - newStart;

  expect(newTime).toBeLessThan(oldTime * 0.8); // At least 20% faster
});
```

---

## Rollback Plan

If critical issues arise:

### Quick Rollback (Emergency)

```typescript
// In index.ts, redirect to legacy
export * from './legacy/spineCalculations';

// Or use feature flag
if (useFeatureFlag('use-new-spine-system')) {
  return generateSpineStyle(config);
} else {
  return legacyCalculateBookDimensions(params);
}
```

### Gradual Rollback

```typescript
// Rollback one component at a time
const MIGRATED_COMPONENTS = new Set([
  'BookShelfView',  // Working well
  // 'BookSpineVertical', // Rolled back due to issue
]);

if (MIGRATED_COMPONENTS.has(componentName)) {
  return useNewSystem();
} else {
  return useLegacySystem();
}
```

---

## Success Metrics

Track these metrics before/after migration:

| Metric | Before | Target | Actual |
|--------|--------|--------|--------|
| Initial bundle size | 347KB | <250KB | ___ |
| Spine render time (100 books) | 45ms | <30ms | ___ |
| Color extraction API calls | 1000/load | <200/load | ___ |
| Memory usage (1000 books) | 85MB | <60MB | ___ |
| Lines of code | 2,907 | <1,500 | ___ |
| Test coverage | 0% | >80% | ___ |

---

## Timeline Summary

| Week | Phase | Risk | Effort |
|------|-------|------|--------|
| 1-2 | Parallel running | Low | 8h |
| 3-4 | Component migration | Medium | 16h |
| 5-6 | Deprecation | Low | 4h |
| 7+ | Optimization | Low | 8h+ |

**Total estimated effort:** 36-40 hours

**Recommended approach:** Spread over 2 sprints with thorough testing between phases.
