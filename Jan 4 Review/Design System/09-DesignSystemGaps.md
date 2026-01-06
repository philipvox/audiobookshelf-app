# Design System Gap Analysis
## AudiobookShelf Mobile App

**Date:** January 5, 2026
**Based on:** Audits 01-08

---

## Executive Summary

The design system has **strong foundations** with well-defined tokens in the theme files, but **inconsistent implementation** across components reduces its effectiveness. Key gaps include:

- **3 duplicate components** that should be consolidated
- **~38% of components** still using legacy color system
- **~40% of styling** uses hardcoded values instead of tokens
- **Typography tokens defined but underutilized** (~40% adoption)

---

## Inconsistencies by Severity

### CRITICAL: Same Component Looks Different in Different Places

| Issue | Location 1 | Location 2 | Difference |
|-------|------------|------------|------------|
| **SeriesCard font sizes** | `home/SeriesCard.tsx`: 13px/11px | `library/FannedSeriesCard.tsx`: 14px/12px | 1px difference, visually noticeable |
| **SeriesCard border radius** | `home/SeriesCard.tsx`: `radius.lg` (16px) | `library/FannedSeriesCard.tsx`: `scale(12)` | Different tokens, 4px difference |
| **SeriesCard padding** | `home/SeriesCard.tsx`: `spacing.md` | `library/FannedSeriesCard.tsx`: `scale(12)` | Token vs raw value |
| **Card background calculation** | Some: `isDarkMode ? rgba(255,255,255,0.06) : rgba(0,0,0,0.04)` | Others: `themeColors.surface.card` | Hardcoded vs token |

**Impact:** Users see visually inconsistent series cards depending on which screen they're on.

---

### HIGH: Similar Components Have Different Patterns

| Category | Component A | Component B | Inconsistency |
|----------|-------------|-------------|---------------|
| **Person Cards** | `AuthorCard`: 48% width, square avatar, shadow | `PersonCard`: scale(90) width, circular avatar, no shadow | Different layouts for same purpose |
| **Typography weight** | `AuthorCard`: weight 600 | `PersonCard`: weight 500 | Different weights for card titles |
| **Press feedback** | `HeartButton`: activeOpacity=0.8 | `SeriesCard`: activeOpacity=0.7 | Inconsistent press states |
| **Color system** | `AuthorCard`: legacy `colors.textPrimary` | `PersonCard`: `themeColors.text` | Different systems |
| **Cover radius** | `BookCard`: `radius.sm` (8px) | `SeriesCard covers`: 5px hardcoded | Different radius for covers |
| **Icon implementation** | `BookCard`: Custom SVG icons | `PersonCard`: Lucide Icon component | Mixed icon systems |

---

### MEDIUM: Hardcoded Values That Should Use Tokens

#### Typography Hardcoding

| File | Hardcoded | Token Available | Should Be |
|------|-----------|-----------------|-----------|
| `AuthorCard` | `fontSize: 15` | `typography.headlineMedium` | `...typography.headlineMedium` |
| `AuthorCard` | `fontSize: 13` | `typography.headlineSmall` | `...typography.headlineSmall` |
| `AuthorCard` | `fontSize: 36` | `fontSize['4xl']` | `scale(36)` at minimum |
| `LoadingSpinner` | `fontSize: 15` | `typography.bodyMedium` | `...typography.bodyMedium` |
| `SeriesCard` | `scale(13)` | `typography.headlineSmall` | `...typography.headlineSmall` |
| `PersonCard` | `scale(13)` | `typography.headlineSmall` | `...typography.headlineSmall` |

#### Spacing Hardcoding

| File | Hardcoded | Token | Impact |
|------|-----------|-------|--------|
| `SeriesCard` | `8` (heartButton position) | `spacing.sm` | Inconsistent positioning |
| `SeriesCard` | `10` (coverFan margin) | `spacing.sm` or new token | Non-standard value |
| `AuthorCard` | `4` (name marginBottom) | `spacing.xs` | Minor |
| `PersonCard` | `2` (name marginBottom) | `spacing.xxs` | Minor |
| `BookCard` | `scale(10)` padding | `spacing.sm` or `spacing.md` | Non-token value |
| `BookCard` | `scale(14)` info margin | `spacing.md` or `spacing.lg` | Non-token value |

#### Color Hardcoding

| File | Hardcoded | Should Use |
|------|-----------|------------|
| `AuthorCard` | `'#FFFFFF'` | `themeColors.text.inverse` |
| `SeriesCard` | `'rgba(255,255,255,0.06)'` | `themeColors.surface.card` |
| `SeriesCard covers` | `'rgba(128,128,128,0.3)'` | New token or `colors.border` |
| `BookCard` | `'rgba(0,0,0,0.6)'` | `themeColors.overlay.medium` |
| `BookCard` | `'rgba(100,150,255,0.9)'` | Add `feature.streaming` token |
| `BookCard` | `'#fff'` in SVG icons | `themeColors.icon.primary` |

#### Border Radius Hardcoding

| File | Hardcoded | Token |
|------|-----------|-------|
| `SeriesCard covers` | `5` | `radius.xs` or `radius.cover` |
| `FannedSeriesCard` | `scale(12)` | `radius.md` |
| `FannedSeriesCard covers` | `scale(6)` | `radius.cover` |

---

### LOW: Minor Variations That Could Be Standardized

| Category | Variation | Recommendation |
|----------|-----------|----------------|
| **activeOpacity** | 0.7, 0.8, default (~0.2) | Standardize to 0.7 |
| **Fanned cover size** | 60px hardcoded | Add `cardTokens.stackedCovers.size = 60` |
| **Max visible books** | 5 in SeriesCard | Add `cardTokens.stackedCovers.maxCount = 5` |
| **Fan rotation** | 8 degrees | Document as visual constant |
| **Screen padding constants** | `16`, `PADDING = 16` | Use `layout.screenPaddingH` (20) |
| **Gap constants** | `12`, `GAP = 12` | Use `layout.itemGap` |
| **Empty state icon size** | `scale(64)` | Add `iconSizes.xxxl = 64` |

---

## Missing Design Tokens

### Required New Tokens

| Token | Value | Purpose | Priority |
|-------|-------|---------|----------|
| `iconSizes.xxxl` | `scale(64)` | Empty state icons | High |
| `feature.streaming` | `#6496FF` | Streaming badge color | High |
| `cardTokens.stackedCovers.size` | 60 | Fanned cover base size | Medium |
| `cardTokens.stackedCovers.maxCount` | 5 | Max visible in fan | Medium |
| `cardTokens.stackedCovers.offset` | 18 | Horizontal offset | Medium |
| `interactiveStates.press.opacity` | 0.7 | Standard press opacity | Medium |
| `interactiveStates.press.duration` | 100 | Press animation ms | Low |
| `interactiveStates.bounce.scale` | 1.3 | Bounce max scale | Low |

### Tokens Defined but Unused

| Token | Defined In | Usage Rate | Should Be Used In |
|-------|------------|------------|-------------------|
| `cardTokens.cover.listRow` (56) | `sizes.ts` | 0% | BookCard cover |
| `cardTokens.avatar.listRow` (48) | `sizes.ts` | 0% | Author/Narrator rows |
| `cardTokens.rowHeight.standard` (80) | `sizes.ts` | 0% | BookCard row height |
| `typography.headlineSmall` | `typography.ts` | ~30% | All card titles |
| `typography.bodySmall` | `typography.ts` | ~40% | All subtitles |
| `elevation.small` | `spacing.ts` | ~10% | Card shadows |

---

## Components Requiring Consolidation

### 1. SeriesCard Duplication

**Current State:**
- `src/features/home/components/SeriesCard.tsx`
- `src/features/library/components/FannedSeriesCard.tsx`
- `src/features/series/components/SeriesCard.tsx`

**Differences:**
| Aspect | home/SeriesCard | library/FannedSeriesCard |
|--------|-----------------|--------------------------|
| Title size | `scale(13)` | `scale(14)` |
| Subtitle size | `scale(11)` | `scale(12)` |
| Border radius | `radius.lg` | `scale(12)` |
| Padding | `spacing.md` | `scale(12)` |

**Recommendation:** Create single `src/shared/components/SeriesCard.tsx` with variants.

---

### 2. Author/Narrator Card Duplication

**Current State:**
- `src/features/author/components/AuthorCard.tsx` - Grid card
- `src/features/narrator/components/NarratorCard.tsx` - Similar grid card
- `src/features/library/components/PersonCard.tsx` - Horizontal scroll

**Issues:**
- `AuthorCard` uses legacy colors, hardcoded fonts
- `PersonCard` uses theme colors, responsive fonts
- Different avatar shapes (square vs circle)

**Recommendation:** Create `src/shared/components/EntityCard.tsx` with `type` prop.

---

### 3. Custom SVG Icons in BookCard

**Current State:**
- 8 custom SVG icon components inside `BookCard.tsx`
- Duplicates functionality of `Icon` component

**Icons to Replace:**
| Custom Icon | Lucide Equivalent |
|-------------|-------------------|
| DownloadIcon | `Download` |
| PlayIcon | `Play` |
| SmallPlusIcon | `Plus` |
| CheckIcon | `Check` |
| CloudIcon | `Cloud` |
| CloudOffIcon | `CloudOff` |
| BookmarkIcon | `Bookmark` |
| PauseIcon | `Pause` |

**Recommendation:** Delete custom SVGs, use `Icon` component.

---

### 4. EmptyState Custom Icons

**Current State:**
- 10 custom SVG icon components inside `EmptyState.tsx`

**Recommendation:**
- Use Lucide icons via `Icon` component
- Add `xxxl` size for large icons

---

## Priority Matrix

| Issue | Impact | Effort | Priority | ROI |
|-------|--------|--------|----------|-----|
| **Merge SeriesCard variants** | High | Medium | P1 | High |
| **Migrate AuthorCard to theme** | High | Low | P1 | High |
| **Replace BookCard custom SVGs** | Medium | Low | P1 | High |
| **Add missing tokens** | Medium | Low | P1 | High |
| **Standardize card typography** | High | Medium | P2 | Medium |
| **Create EntityCard component** | Medium | Medium | P2 | Medium |
| **Replace EmptyState SVGs** | Low | Medium | P2 | Medium |
| **Fix hardcoded spacing** | Medium | Low | P2 | Medium |
| **Standardize activeOpacity** | Low | Low | P3 | Medium |
| **Update elevation.glow color** | Low | Low | P3 | Low |
| **Create interactiveStates tokens** | Low | Low | P3 | Low |
| **Document visual constants** | Low | Low | P4 | Low |

---

## Token Coverage Summary

| Category | Defined | Used | Coverage | Target |
|----------|---------|------|----------|--------|
| Typography | 14 | 6 | 43% | 80% |
| Spacing | 10 | 6 | 60% | 90% |
| Radius | 12 | 8 | 67% | 90% |
| Colors (new system) | 50+ | 30+ | 60% | 95% |
| Colors (legacy) | 20 | 15 | 75% | 0% (deprecate) |
| Elevation | 5 | 2 | 40% | 80% |
| Icon sizes | 6 | 2 | 33% | 80% |
| Card tokens | 15 | 0 | 0% | 80% |

---

## Component Health Matrix

| Component | Theme Colors | Typography Tokens | Spacing Tokens | Overall |
|-----------|-------------|-------------------|----------------|---------|
| BookCard | Mixed | Good | Partial | 🟡 |
| SeriesCard (home) | Good | **Bad** | Partial | 🟡 |
| FannedSeriesCard | Good | **Bad** | **Bad** | 🔴 |
| AuthorCard | **Bad** | **Bad** | Partial | 🔴 |
| PersonCard | Good | **Bad** | Partial | 🟡 |
| EmptyState | **Bad** | Good | Good | 🟡 |
| LoadingSpinner | **Bad** | **Bad** | Good | 🔴 |
| Button | Good | Good | Good | 🟢 |
| Icon | **Bad** | N/A | N/A | 🟡 |

Legend: 🟢 Good | 🟡 Needs Work | 🔴 Critical

---

## Risk Assessment

### If Not Addressed

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Visual inconsistency grows | High | Medium | Consolidate components now |
| Dark/light mode bugs | High | High | Migrate to theme system |
| Maintenance burden increases | High | Medium | Document and enforce tokens |
| New features inherit bad patterns | High | Medium | Create component templates |
| Accessibility violations | Medium | High | Review contrast ratios |

### Dependencies

| Task | Depends On |
|------|------------|
| Merge SeriesCard | None |
| Migrate AuthorCard | None |
| Create EntityCard | AuthorCard migration |
| Typography standardization | None |
| Color migration | None |

---

## Success Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Typography token usage | 43% | 80% | 2 weeks |
| Color theme system usage | 60% | 95% | 2 weeks |
| Card component count | 15 | 8 | 1 week |
| Hardcoded values | ~80 | <20 | 3 weeks |
| Design system compliance | ~60% | 90% | 4 weeks |

---

*This gap analysis feeds into 10-DesignSystemSpec.md and 11-DesignSystemActionPlan.md*
