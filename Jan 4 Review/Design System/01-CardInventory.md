# Card Component Inventory
## AudiobookShelf Design System Audit

**Date:** January 5, 2026
**Scope:** All card components across the app

---

## Card Components Found

| Component | Location | Type |
|-----------|----------|------|
| BookCard | `src/shared/components/BookCard.tsx` | List row |
| SeriesCard (home) | `src/features/home/components/SeriesCard.tsx` | Grid card |
| SeriesCard (series) | `src/features/series/components/SeriesCard.tsx` | Grid card |
| FannedSeriesCard | `src/features/library/components/FannedSeriesCard.tsx` | Grid card |
| AuthorCard | `src/features/author/components/AuthorCard.tsx` | Grid card |
| NarratorCard | `src/features/narrator/components/NarratorCard.tsx` | Grid card |
| PersonCard | `src/features/library/components/PersonCard.tsx` | Horizontal scroll |
| GenreCards | `src/features/library/components/GenreCards.tsx` | Grid/list |
| CollectionCard | `src/features/collections/components/CollectionCard.tsx` | Grid card |
| SwipeableBookCard | `src/features/discover/components/SwipeableBookCard.tsx` | Swipeable |
| MoodDiscoveryCard | `src/features/mood-discovery/components/MoodDiscoveryCard.tsx` | Selection card |
| MoodBookCard | `src/features/mood-discovery/components/MoodBookCard.tsx` | Result card |
| ShareStatsCard | `src/features/stats/components/ShareStatsCard.tsx` | Share preview |
| PreferencesPromoCard | `src/features/discover/components/PreferencesPromoCard.tsx` | Promo banner |

---

## Detailed Card Analysis

### 1. BookCard (Primary - List Row Style)

**File:** `src/shared/components/BookCard.tsx`

| Property | Value |
|----------|-------|
| **Layout** | Row (horizontal) |
| **Dimensions** | Full width, height: `scale(64)` cover + padding |
| **Cover Size** | `scale(64)` x `scale(64)` |
| **Border Radius** | `radius.sm` (8px) for cover |
| **Shadow** | None |
| **Padding** | `paddingVertical: scale(10)`, `paddingHorizontal: scale(16)` |
| **Info Margin** | `marginLeft: scale(14)` |

**Typography:**
| Element | Style |
|---------|-------|
| Title | `typography.headlineSmall` (14px, 600 weight) |
| Subtitle | `typography.bodySmall` (12px, 400 weight) |
| Progress Text | `typography.labelSmall` (11px, 500 weight) |

**Interactive States:**
- Press: Opacity change (Pressable default)
- Long press: `delayLongPress={400}`, triggers context menu
- Queue button: Animated scale (1 → 1.3 → 1)

**Badges/Indicators:**
- Queue button (bottom-right of cover): `scale(22)` circle
- Status badge (bottom-left): `scale(18)` circle
- Wishlist button (top-right): `scale(22)` circle
- Progress bar: `ThumbnailProgressBar` component
- Download progress ring: `scale(28)`

**Variants:**
- `layout: 'default'` - Title first, then author
- `layout: 'search'` - Author first (gray), then title (bold)
- `showPlayOverlay` - Play button on cover
- `showStatusBadge` - Download/stream badge
- `showWishlistButton` - Bookmark button

---

### 2. SeriesCard (Home)

**File:** `src/features/home/components/SeriesCard.tsx`

| Property | Value |
|----------|-------|
| **Layout** | Grid (2-column) |
| **Width** | `(SCREEN_WIDTH - 32 - 12) / 2` (~180px) |
| **Border Radius** | `radius.lg` (16px) |
| **Background** | Dark: `rgba(255,255,255,0.06)`, Light: `rgba(0,0,0,0.04)` |
| **Padding** | `spacing.md` (12px) |

**Fanned Cover Design:**
| Property | Value |
|----------|-------|
| Cover Size | 60px |
| Fan Offset | 18px horizontal |
| Rotation | 8 degrees |
| Vertical Offset | 6px |
| Max Visible | 5 books |
| Cover Radius | 5px |
| Shadow | `{ width: 1, height: 2 }`, opacity 0.3, radius 3 |

**Typography:**
| Element | Style |
|---------|-------|
| Series Name | `scale(13)`, weight 600, centered |
| Book Count | `scale(11)`, centered |

**Interactive States:**
- `activeOpacity={0.7}`
- Heart button (SeriesHeartButton)

---

### 3. FannedSeriesCard (Library)

**File:** `src/features/library/components/FannedSeriesCard.tsx`

| Property | Value |
|----------|-------|
| **Width** | `(wp(100) - 32 - 12) / 2` |
| **Border Radius** | `scale(12)` |
| **Padding** | `scale(12)` |

*Same fanned cover design as home SeriesCard*

**Typography:**
| Element | Style |
|---------|-------|
| Series Name | `scale(14)`, weight 600 |
| Book Count | `scale(12)` |

**Inconsistency:** Font sizes differ from home SeriesCard (14 vs 13, 12 vs 11)

---

### 4. AuthorCard

**File:** `src/features/author/components/AuthorCard.tsx`

| Property | Value |
|----------|-------|
| **Layout** | Grid (2-column) |
| **Width** | `48%` |
| **Avatar** | Square, `aspectRatio: 1` |
| **Border Radius** | `radius.lg` (16px) |
| **Shadow** | `elevation.small` |
| **Margin Bottom** | `spacing.md` (12px) |

**Typography:**
| Element | Style | Issue |
|---------|-------|-------|
| Name | `fontSize: 15`, weight 600, lineHeight 20 | **Hardcoded** |
| Book Count | `fontSize: 13` | **Hardcoded** |
| Initials | `fontSize: 36`, weight 700 | **Hardcoded** |

**Interactive States:**
- Pressable with `opacity: 0.7` on press
- Initials avatar with color based on name

**Issue:** Uses legacy `colors` object, hardcoded font sizes

---

### 5. PersonCard

**File:** `src/features/library/components/PersonCard.tsx`

| Property | Value |
|----------|-------|
| **Layout** | Horizontal scroll item |
| **Width** | `scale(90)` |
| **Avatar Size** | `scale(70)` circular |
| **Avatar Radius** | `scale(35)` (full circle) |

**Typography:**
| Element | Style |
|---------|-------|
| Name | `scale(13)`, weight 500, centered |
| Book Count | `scale(11)`, centered |

**Interactive States:**
- `activeOpacity={0.7}`
- Fallback icon (User/Mic from lucide)

**Good:** Uses theme colors (`themeColors.text`, `themeColors.textSecondary`)

---

## Comparison Table: Card Inconsistencies

### Cover/Avatar Sizes

| Card | Cover Size | Responsive |
|------|------------|------------|
| BookCard | `scale(64)` | Yes |
| SeriesCard (home) | 60px | **No** |
| FannedSeriesCard | 60px | **No** |
| AuthorCard | `aspectRatio: 1` | Partial |
| PersonCard | `scale(70)` | Yes |

### Border Radius

| Card | Value | Token Used |
|------|-------|------------|
| BookCard cover | `radius.sm` (8) | Yes |
| SeriesCard | `radius.lg` (16) | Yes |
| FannedSeriesCard | `scale(12)` | **No token** |
| AuthorCard | `radius.lg` (16) | Yes |
| PersonCard | `scale(35)` (circle) | Yes |
| SeriesCard covers | 5px | **Hardcoded** |
| FannedSeriesCard covers | `scale(6)` | Partial |

### Typography

| Card | Title Size | Uses Typography Token |
|------|------------|----------------------|
| BookCard | `typography.headlineSmall` | Yes |
| SeriesCard (home) | `scale(13)` | **No** |
| FannedSeriesCard | `scale(14)` | **No** |
| AuthorCard | `15` (hardcoded) | **No** |
| PersonCard | `scale(13)` | **No** |

### Color System

| Card | Uses `useThemeColors()` | Uses Legacy `colors` |
|------|------------------------|---------------------|
| BookCard | Yes | Yes (mixed) |
| SeriesCard (home) | Yes | No |
| FannedSeriesCard | Yes | No |
| AuthorCard | **No** | **Yes** |
| PersonCard | Yes | No |

### Shadow/Elevation

| Card | Has Shadow | Uses Token |
|------|------------|------------|
| BookCard | No | N/A |
| SeriesCard covers | Yes (custom) | **No** |
| FannedSeriesCard covers | Yes (custom) | **No** |
| AuthorCard | Yes | Yes (`elevation.small`) |

---

## Issues Identified

### High Priority

1. **AuthorCard uses legacy color system** - Not theme-aware
2. **AuthorCard hardcoded font sizes** - 15px, 13px, 36px not scaled
3. **Fanned cover sizes not responsive** - Hardcoded 60px

### Medium Priority

4. **Inconsistent title sizes** - 13px vs 14px vs 15px for same purpose
5. **SeriesCard cover border radius hardcoded** - 5px not using token
6. **Shadow definitions not using elevation tokens** - Custom shadows

### Low Priority

7. **SeriesCard home vs FannedSeriesCard differ** - Should be identical
8. **Missing cardTokens usage** - Theme has `cardTokens` but not used

---

## Recommendations

### 1. Standardize Cover Sizes
```typescript
// Use cardTokens from theme
coverSizes: {
  listRow: 56,     // BookCard
  grid: 120,       // Grid cards
  fanned: 60,      // Fanned series
}
```

### 2. Fix AuthorCard Theme Usage
```typescript
// Change from
color: colors.textPrimary
// To
const themeColors = useThemeColors();
color: themeColors.text
```

### 3. Standardize Card Title Typography
```typescript
// All cards should use
title: {
  ...typography.headlineSmall,  // 14px, 600
}
subtitle: {
  ...typography.bodySmall,      // 12px, 400
}
```

### 4. Use Elevation Tokens for Shadows
```typescript
// Change from
shadowColor: '#000',
shadowOffset: { width: 1, height: 2 },
shadowOpacity: 0.3,
// To
...elevation.small
```

### 5. Merge Duplicate Cards
- `SeriesCard` (home) and `FannedSeriesCard` should be the same component
- Move to `src/shared/components/SeriesCard.tsx`

---

## Design Token Reference

### From `cardTokens` (sizes.ts)

```typescript
cardTokens = {
  cover: {
    listRow: 56,
    preview: 100,
    grid: 120,
    hero: 200,
  },
  avatar: {
    listRow: 48,
    preview: 64,
    hero: 96,
  },
  stackedCovers: {
    count: 3,
    offset: 12,
    size: 40,
    sizeSmall: 32,
    sizeLarge: 56,
  },
  rowHeight: {
    compact: 64,
    standard: 80,
    expanded: 100,
  },
  aspectRatio: {
    book: 0.67,  // 2:3
    square: 1,
    wide: 1.5,
  },
}
```

---

*Audit complete. See 02-ListPatterns.md for list/row pattern analysis.*
