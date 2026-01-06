# Design System Action Plan
## AudiobookShelf Mobile App

**Date:** January 5, 2026
**Based on:** 09-DesignSystemGaps.md, 10-DesignSystemSpec.md

---

## Executive Summary

This action plan addresses the design system gaps identified in the audit. Work is organized into three phases:

| Phase | Focus | Duration | Impact |
|-------|-------|----------|--------|
| **A** | Token Consolidation | 3-4 days | Foundation |
| **B** | Component Unification | 5-7 days | High |
| **C** | Screen Updates | 3-5 days | Polish |

**Total Estimated Effort:** 11-16 days

---

## Phase A: Token Consolidation

### Goal
Establish complete, consistent token system that all components can rely on.

### A.1 Add Missing Tokens

**File:** `src/shared/theme/sizes.ts`

```typescript
// Add to iconSizes
iconSizes: {
  xs: scale(12),
  sm: scale(16),
  md: scale(20),
  lg: scale(24),
  xl: scale(32),
  xxl: scale(48),
  xxxl: scale(64),  // NEW: Empty states
}

// Add to cardTokens (currently 0% used)
cardTokens: {
  cover: {
    listRow: 64,      // BookCard covers
    grid: 120,        // Grid cards
    hero: 200,        // Detail screens
  },
  avatar: {
    listRow: 48,      // Inline rows
    grid: 80,         // Grid cards (EntityCard)
    detail: 120,      // Detail screens
  },
  rowHeight: {
    compact: 64,
    standard: 80,     // BookCard
    expanded: 100,
    settings: 56,
    chapter: 48,
  },
  stackedCovers: {
    size: 60,         // Fanned cover base
    maxCount: 5,      // Max visible
    offset: 18,       // Horizontal offset
    rotation: 8,      // Degrees
  },
}
```

**Effort:** 1 hour

---

**File:** `src/shared/theme/colors.ts`

```typescript
// Add semantic feature colors
feature: {
  streaming: '#6496FF',   // Cloud/streaming badge
  downloaded: '#4CAF50',  // Downloaded indicator
  progress: '#F3B60C',    // Progress bar fill
}
```

**Effort:** 30 minutes

---

**File:** `src/shared/theme/spacing.ts`

```typescript
// Add interactive state tokens
interactiveStates: {
  press: {
    opacity: 0.7,       // Standard activeOpacity
    duration: 100,      // Press animation ms
  },
  bounce: {
    scale: 1.3,         // Heart bounce max
    duration: 300,      // Bounce animation ms
  },
}
```

**Effort:** 30 minutes

---

### A.2 Create Semantic Aliases

**File:** `src/shared/theme/radius.ts` (new or add to spacing.ts)

```typescript
// Semantic radius aliases
export const radiusAliases = {
  cover: radius.sm,      // 8px - all covers
  card: radius.lg,       // 16px - all cards
  button: radius.md,     // 12px - all buttons
  avatar: radius.full,   // circular
  chip: radius.full,     // tags, badges
  input: radius.sm,      // text inputs
  modal: radius.xxl,     // bottom sheets
};
```

**Effort:** 30 minutes

---

### A.3 Deprecate Legacy Colors

**File:** `src/shared/theme/colors.ts`

```typescript
/**
 * @deprecated Use useThemeColors() hook instead.
 * This object will be removed in v3.0.
 */
export const colors = {
  // Mark all as deprecated in JSDoc
  /** @deprecated Use themeColors.accent */
  accent: '#F3B60C',
  // ...
};
```

**Effort:** 1 hour (add deprecation warnings, update imports gradually)

---

### Phase A Summary

| Task | Files | Effort | Priority |
|------|-------|--------|----------|
| Add `iconSizes.xxxl` | sizes.ts | 15 min | P1 |
| Add `cardTokens` values | sizes.ts | 30 min | P1 |
| Add `feature` colors | colors.ts | 30 min | P1 |
| Add `interactiveStates` | spacing.ts | 30 min | P2 |
| Add radius aliases | spacing.ts | 30 min | P2 |
| Deprecate legacy colors | colors.ts | 1 hour | P2 |

**Total Phase A:** 3-4 hours

---

## Phase B: Component Unification

### Goal
Reduce component duplication and ensure consistent implementation.

### B.1 Merge SeriesCard Variants (P1)

**Current State:**
- `src/features/home/components/SeriesCard.tsx`
- `src/features/library/components/FannedSeriesCard.tsx`
- `src/features/series/components/SeriesCard.tsx`

**Target:** Single `src/shared/components/SeriesCard.tsx`

**Implementation:**

```typescript
interface SeriesCardProps {
  series: Series;
  variant?: 'default' | 'compact';  // Handle size variations
  onPress?: () => void;
  showHeart?: boolean;
}

export function SeriesCard({
  series,
  variant = 'default',
  onPress,
  showHeart = true,
}: SeriesCardProps) {
  const { themeColors } = useThemeColors();

  return (
    <TouchableOpacity
      activeOpacity={interactiveStates.press.opacity}
      onPress={onPress}
      style={[
        styles.container,
        { backgroundColor: themeColors.surface.card },
      ]}
    >
      <FannedCovers books={series.books} />
      <Text style={[typography.headlineSmall, { color: themeColors.text }]}>
        {series.name}
      </Text>
      <Text style={[typography.labelSmall, { color: themeColors.textSecondary }]}>
        {series.bookCount} books
      </Text>
      {showHeart && <SeriesHeartButton seriesName={series.name} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: radius.lg,
  },
});
```

**Migration Steps:**
1. Create new `src/shared/components/SeriesCard.tsx`
2. Update `src/features/home/components/SeriesCard.tsx` to re-export shared
3. Update `src/features/library/components/FannedSeriesCard.tsx` to re-export
4. Update all imports
5. Delete old implementations

**Files to Modify:**
- Create: `src/shared/components/SeriesCard.tsx`
- Update: `src/features/home/screens/HomeScreen.tsx`
- Update: `src/features/library/screens/MyLibraryScreen.tsx`
- Update: `src/features/series/screens/SeriesListScreen.tsx`
- Delete: Old SeriesCard files after migration

**Effort:** 3-4 hours

---

### B.2 Migrate AuthorCard to Theme (P1)

**Current Issues:**
- Uses `colors.textPrimary` (legacy)
- Uses hardcoded `fontSize: 15`, `fontSize: 13`, `fontSize: 36`
- Uses `fontWeight: '600'` instead of tokens

**Target State:**

```typescript
// Before
const styles = StyleSheet.create({
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  bookCount: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  initials: {
    fontSize: 36,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

// After
const { themeColors } = useThemeColors();

const styles = StyleSheet.create({
  name: {
    ...typography.headlineMedium,  // 15px, 600
  },
  bookCount: {
    ...typography.bodySmall,  // 12px, 400 (or scale(13))
  },
  initials: {
    fontSize: scale(36),
    fontWeight: fontWeight.semibold,
  },
});

// Colors applied in JSX
<Text style={[styles.name, { color: themeColors.text }]}>
```

**Files to Modify:**
- `src/features/author/components/AuthorCard.tsx`

**Effort:** 1-2 hours

---

### B.3 Replace BookCard Custom SVGs (P1)

**Current:** 8 custom SVG icon components inside BookCard.tsx

**Target:** Use Icon component with Lucide icons

**Mapping:**

| Custom Icon | Lucide Replacement |
|-------------|-------------------|
| `DownloadIcon` | `<Icon name="Download" size="md" />` |
| `PlayIcon` | `<Icon name="Play" size="md" />` |
| `SmallPlusIcon` | `<Icon name="Plus" size="sm" />` |
| `CheckIcon` | `<Icon name="Check" size="sm" />` |
| `CloudIcon` | `<Icon name="Cloud" size="sm" />` |
| `CloudOffIcon` | `<Icon name="CloudOff" size="sm" />` |
| `BookmarkIcon` | `<Icon name="Bookmark" size="sm" />` |
| `PauseIcon` | `<Icon name="Pause" size="xs" />` |

**Files to Modify:**
- `src/shared/components/BookCard.tsx`

**Effort:** 1-2 hours

---

### B.4 Replace EmptyState Custom SVGs (P2)

**Current:** 10 custom SVG icon components in EmptyState.tsx

**Target:** Use Icon component with `size="xxxl"`

**Mapping:**

| Custom Icon | Lucide Replacement |
|-------------|-------------------|
| `BookIcon` | `<Icon name="Book" size="xxxl" />` |
| `SearchIcon` | `<Icon name="Search" size="xxxl" />` |
| `HeartIcon` | `<Icon name="Heart" size="xxxl" />` |
| `DownloadIcon` | `<Icon name="Download" size="xxxl" />` |
| `ListIcon` | `<Icon name="List" size="xxxl" />` |
| `UserIcon` | `<Icon name="User" size="xxxl" />` |
| `MicIcon` | `<Icon name="Mic" size="xxxl" />` |
| `LibraryIcon` | `<Icon name="Library" size="xxxl" />` |
| `CelebrateIcon` | `<Icon name="PartyPopper" size="xxxl" />` |
| `CollectionIcon` | `<Icon name="FolderOpen" size="xxxl" />` |

**Files to Modify:**
- `src/shared/components/EmptyState.tsx`

**Effort:** 1-2 hours

---

### B.5 Create EntityCard Component (P2)

Unified card for Author/Narrator entities.

**Target:** `src/shared/components/EntityCard.tsx`

```typescript
interface EntityCardProps {
  type: 'author' | 'narrator';
  name: string;
  bookCount: number;
  imageUrl?: string;
  onPress?: () => void;
}

export function EntityCard({ type, name, bookCount, imageUrl, onPress }: EntityCardProps) {
  const initials = getInitials(name);
  const icon = type === 'author' ? 'User' : 'Mic';

  return (
    <TouchableOpacity
      activeOpacity={interactiveStates.press.opacity}
      onPress={onPress}
      style={styles.container}
    >
      <Avatar
        size={cardTokens.avatar.grid}
        imageUrl={imageUrl}
        initials={initials}
      />
      <Text style={styles.name}>{name}</Text>
      <View style={styles.countRow}>
        <Icon name={icon} size="sm" color={themeColors.textSecondary} />
        <Text style={styles.count}>{bookCount} books</Text>
      </View>
    </TouchableOpacity>
  );
}
```

**Migration:**
1. Create `EntityCard.tsx`
2. Update AuthorCard to use EntityCard
3. Update NarratorCard to use EntityCard (or PersonCard)
4. Update PersonCard for horizontal lists

**Effort:** 2-3 hours

---

### B.6 Update Icon Component Default Color (P2)

**Current:**
```typescript
color = colors.textPrimary  // Legacy, not theme-aware
```

**Target:**
```typescript
export function Icon({
  name,
  size = 'md',
  color,  // No default
  strokeWidth = 2,
}: IconProps) {
  const { themeColors } = useThemeColors();
  const resolvedColor = color ?? themeColors.icon.primary;
  // ...
}
```

**Files to Modify:**
- `src/shared/components/Icon.tsx`

**Effort:** 30 minutes

---

### Phase B Summary

| Task | Files | Effort | Priority | Dependencies |
|------|-------|--------|----------|--------------|
| Merge SeriesCard variants | 4+ files | 3-4 hours | P1 | Phase A |
| Migrate AuthorCard to theme | 1 file | 1-2 hours | P1 | None |
| Replace BookCard SVGs | 1 file | 1-2 hours | P1 | Phase A (xxxl size) |
| Replace EmptyState SVGs | 1 file | 1-2 hours | P2 | Phase A (xxxl size) |
| Create EntityCard | 3+ files | 2-3 hours | P2 | AuthorCard migration |
| Update Icon default color | 1 file | 30 min | P2 | None |

**Total Phase B:** 9-14 hours (2-3 days)

---

## Phase C: Screen Updates

### Goal
Apply consistent design system tokens across all screens.

### C.1 Typography Standardization

**Screens to Update:**

| Screen | Current | Target |
|--------|---------|--------|
| CDPlayerScreen | `scale(32)` title | `typography.displayLarge` |
| HomeScreen section headers | Inconsistent | `typography.displaySmall` |
| Settings rows | Hardcoded sizes | `typography.bodyMedium` |
| List screen headers | Variable | `typography.headlineLarge` |

**Files:**
- `src/features/player/screens/CDPlayerScreen.tsx`
- `src/features/home/screens/HomeScreen.tsx`
- `src/features/profile/screens/*SettingsScreen.tsx`
- `src/features/library/screens/*ListScreen.tsx`

**Effort:** 2-3 hours

---

### C.2 Spacing Standardization

**Common Fixes:**

| Pattern | Current | Target |
|---------|---------|--------|
| Screen padding | `16`, `20` hardcoded | `layout.screenPaddingH` |
| Section gaps | `24`, `28` hardcoded | `layout.sectionGap` |
| Item gaps | `12`, `16` hardcoded | `layout.itemGap` |
| Card padding | Various | `spacing.md` |

**Files:** Multiple screens

**Effort:** 2-3 hours

---

### C.3 Color Migration

**Pattern:**
```typescript
// Find and replace pattern
// Before
color: colors.textPrimary

// After
const { themeColors } = useThemeColors();
// ...
color: themeColors.text
```

**Files to Audit:**
- All files still using `colors.textPrimary`
- All files with hardcoded color values

**Effort:** 2-3 hours

---

### C.4 Interactive State Consistency

**Updates:**
- Set all `activeOpacity={0.7}` consistently
- Verify all touch targets are 44x44 minimum
- Add hitSlop to small buttons

**Files:** All interactive components

**Effort:** 1-2 hours

---

### Phase C Summary

| Task | Scope | Effort | Priority |
|------|-------|--------|----------|
| Typography standardization | 10+ screens | 2-3 hours | P2 |
| Spacing standardization | 15+ files | 2-3 hours | P2 |
| Color migration | 20+ files | 2-3 hours | P2 |
| Interactive state consistency | All buttons | 1-2 hours | P3 |

**Total Phase C:** 7-11 hours (2-3 days)

---

## Implementation Order

### Week 1: Foundation (Phase A + B.1-B.3)

| Day | Tasks |
|-----|-------|
| Day 1 | Phase A: All token additions |
| Day 2 | B.1: Merge SeriesCard variants |
| Day 3 | B.2: Migrate AuthorCard + B.3: BookCard SVGs |
| Day 4 | Testing and bug fixes |

### Week 2: Components (Phase B.4-B.6 + C)

| Day | Tasks |
|-----|-------|
| Day 5 | B.4: EmptyState SVGs + B.5: EntityCard |
| Day 6 | B.6: Icon component + C.1: Typography |
| Day 7 | C.2: Spacing + C.3: Colors |
| Day 8 | C.4: Interactive states + Final testing |

---

## Validation Checklist

After each phase, verify:

### Phase A Validation
- [ ] All new tokens export correctly
- [ ] TypeScript types are correct
- [ ] No runtime errors

### Phase B Validation
- [ ] SeriesCard looks identical in all locations
- [ ] AuthorCard works in light and dark mode
- [ ] No visual regressions in BookCard
- [ ] EmptyState icons render correctly
- [ ] EntityCard works for both author and narrator

### Phase C Validation
- [ ] Typography is consistent across screens
- [ ] Spacing follows the spec
- [ ] Light and dark mode both work
- [ ] All touch targets meet accessibility requirements

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking changes in tokens | Add new tokens, don't modify existing initially |
| Visual regressions | Screenshot testing before/after |
| Import path changes | Use feature index re-exports during transition |
| Team disruption | Complete Phase A before starting B |

---

## Success Metrics

| Metric | Before | After Phase A | After Phase B | After Phase C |
|--------|--------|---------------|---------------|---------------|
| Typography token usage | 43% | 43% | 60% | 80% |
| Color theme usage | 60% | 65% | 80% | 95% |
| Card component count | 15 | 15 | 10 | 8 |
| Custom SVG icons | 18 | 18 | 2 | 0 |
| Hardcoded values | ~80 | ~70 | ~40 | <20 |

---

## Next Steps

1. **Immediate:** Review this plan with team
2. **Day 1:** Begin Phase A token additions
3. **Ongoing:** Update CHANGELOG.md with each phase completion
4. **Post-completion:** Update CLAUDE.md with new patterns

---

*This action plan should be executed sequentially. Each phase builds on the previous. Document changes in CHANGELOG.md as you go.*
