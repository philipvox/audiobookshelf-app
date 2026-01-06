# Spacing & Layout Tokens Audit
## AudiobookShelf Design System

**Date:** January 5, 2026
**Source:** `src/shared/theme/spacing.ts`

---

## Defined Token System

### Design Canvas
```typescript
DESIGN_WIDTH = 402   // Figma base width
DESIGN_HEIGHT = 874  // Figma base height
```

### Scale Functions

| Function | Purpose | Formula |
|----------|---------|---------|
| `scale(size)` | Width-proportional scaling | `(size / 402) * screenWidth` |
| `wp(percent)` | Width percentage | `screenWidth * (percent / 100)` |
| `hp(percent)` | Height percentage | `screenHeight * (percent / 100)` |
| `verticalScale(size)` | Height-proportional scaling | `(size / 874) * screenHeight` |
| `moderateScale(size, factor)` | Moderate scaling (text) | `size + (scale(size) - size) * factor` |

---

## Spacing Tokens

### Semantic Spacing Scale (8pt Grid)

| Token | Value | Usage |
|-------|-------|-------|
| `spacing.xxs` | 2px | Icon to label gap |
| `spacing.xs` | 4px | Tight groupings, icon padding |
| `spacing.sm` | 8px | Related items, button padding |
| `spacing.md` | 12px | Default component gap |
| `spacing.lg` | 16px | Section internal padding |
| `spacing.xl` | 20px | Screen horizontal padding |
| `spacing.xxl` | 24px | Major element separation |
| `spacing['3xl']` | 32px | Section separation |
| `spacing['4xl']` | 40px | Major section separation |
| `spacing['5xl']` | 48px | Screen-level separation |

---

## Layout Constants

### Screen Padding
| Constant | Value |
|----------|-------|
| `layout.screenPaddingH` | 20px |
| `layout.screenPaddingV` | 24px |

### Component Gaps
| Constant | Value |
|----------|-------|
| `layout.sectionGap` | 24px |
| `layout.componentGap` | 16px |
| `layout.itemGap` | 12px |

### Touch Targets
| Constant | Value | Notes |
|----------|-------|-------|
| `layout.minTouchTarget` | 44px | Apple HIG / Material minimum |
| `layout.comfortableTouchTarget` | 48px | Comfortable touch |
| `layout.largeTouchTarget` | 56px | Primary actions |

### Navigation Heights
| Constant | Value |
|----------|-------|
| `layout.bottomNavHeight` | `hp(9.4)` (~82px) |
| `layout.miniPlayerHeight` | `hp(8)` (~70px) |
| `layout.topNavHeight` | 8px |

### Card/Cover Ratios
| Constant | Value |
|----------|-------|
| `layout.compactCardRatio` | 0.24 (24% screen width) |
| `layout.coverThumbRatio` | 0.12 (12% screen width) |
| `layout.maxContentWidth` | 600px (tablets) |

---

## Border Radius Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `radius.xxs` | 2px | Progress bars |
| `radius.xs` | 4px | Small elements |
| `radius.sm` | 8px | Buttons, covers |
| `radius.md` | 12px | Cards |
| `radius.lg` | 16px | Large cards |
| `radius.xl` | 20px | Bottom sheets |
| `radius.xxl` | 28px | Modals |
| `radius.cover` | 6px | Book covers |
| `radius.card` | 12px | Card components |
| `radius.button` | 12px | Buttons |
| `radius.chip` | 16px | Chips/pills |
| `radius.bottomSheet` | 20px | Bottom sheets |
| `radius.full` | 9999px | Pill/circle |

---

## Elevation/Shadow Tokens

### Defined Elevations

| Token | Shadow Offset | Opacity | Radius | Android Elevation |
|-------|--------------|---------|--------|-------------------|
| `elevation.none` | 0, 0 | 0 | 0 | 0 |
| `elevation.small` | 0, 2 | 0.3 | 4 | 2 |
| `elevation.medium` | 0, 4 | 0.4 | 8 | 4 |
| `elevation.large` | 0, 8 | 0.5 | 16 | 8 |
| `elevation.glow` | 0, 0 | 0.4 | 20 | 8 |

Note: `elevation.glow` uses `#F3B60C` (gold) - **outdated color, should be red accent**

---

## Audit Findings

### Usage Analysis by Component

#### BookCard
| Property | Value | Token Available | Uses Token |
|----------|-------|-----------------|------------|
| paddingVertical | `scale(10)` | spacing.sm=8, md=12 | **No (custom)** |
| paddingHorizontal | `scale(16)` | spacing.lg=16 | Partial |
| info marginLeft | `scale(14)` | spacing.md=12, lg=16 | **No (custom)** |
| cover radius | `radius.sm` | Yes | **Yes** |
| badge size | `scale(22)` | - | Custom |
| marginBottom | `spacing.xxs` | Yes | **Yes** |

#### SeriesCard (home)
| Property | Value | Token Available | Uses Token |
|----------|-------|-----------------|------------|
| padding | `spacing.md` | Yes | **Yes** |
| borderRadius | `radius.lg` | Yes | **Yes** |
| heartButton top/right | 8px | spacing.sm=8 | **Hardcoded** |
| coverFan marginBottom | 10px | - | **Hardcoded** |

#### FannedSeriesCard
| Property | Value | Token Available | Uses Token |
|----------|-------|-----------------|------------|
| padding | `scale(12)` | spacing.md=12 | **No** |
| borderRadius | `scale(12)` | radius.md=12 | **No** |
| heartButton top/right | `scale(8)` | spacing.sm=8 | **Scaled but not token** |
| coverFan marginBottom | `scale(12)` | spacing.md=12 | **Scaled but not token** |
| seriesName marginBottom | `scale(2)` | spacing.xxs=2 | **Scaled but not token** |

#### AuthorCard
| Property | Value | Token Available | Uses Token |
|----------|-------|-----------------|------------|
| marginBottom | `spacing.md` | Yes | **Yes** |
| borderRadius | `radius.lg` | Yes | **Yes** |
| info marginTop | `spacing.xs` | Yes | **Yes** |
| name marginBottom | 4px | spacing.xs=4 | **Hardcoded** |

#### PersonCard
| Property | Value | Token Available | Uses Token |
|----------|-------|-----------------|------------|
| avatar marginBottom | `scale(8)` | spacing.sm=8 | **Scaled** |
| name marginBottom | 2px | spacing.xxs=2 | **Hardcoded** |

#### EmptyState
| Property | Value | Token Available | Uses Token |
|----------|-------|-----------------|------------|
| container padding | `spacing.xxl` | Yes | **Yes** |
| iconContainer marginBottom | `spacing.xl` | Yes | **Yes** |
| title marginBottom | `spacing.sm` | Yes | **Yes** |
| description marginBottom | `spacing.xxl` | Yes | **Yes** |
| actionButton paddingV | `spacing.lg` | Yes | **Yes** |
| actionButton paddingH | `spacing['3xl']` | Yes | **Yes** |
| actionButton marginBottom | `spacing.md` | Yes | **Yes** |
| actionButton borderRadius | `radius.card` | Yes | **Yes** |
| minHeight | `layout.minTouchTarget` | Yes | **Yes** |

---

## Hardcoded Values Found

### Critical (Should be tokens)

| File | Property | Hardcoded | Should Be |
|------|----------|-----------|-----------|
| SeriesCard (home) | heartButton top/right | `8` | `spacing.sm` |
| SeriesCard (home) | coverFan marginBottom | `10` | `spacing.sm` or new token |
| SeriesCard (home) | COVER_SIZE | `60` | `cardTokens.stackedCovers.sizeLarge` |
| SeriesCard (home) | FAN_OFFSET | `18` | Token |
| AuthorCard | name marginBottom | `4` | `spacing.xs` |
| PersonCard | name marginBottom | `2` | `spacing.xxs` |
| LoadingSpinner | text fontSize | `15` | Should use typography |

### Screen-Level Constants

| File | Constant | Hardcoded | Notes |
|------|----------|-----------|-------|
| SeriesCard | PADDING | `16` | Should be `layout.screenPaddingH` |
| SeriesCard | GAP | `12` | Should be `layout.itemGap` |
| FannedSeriesCard | PADDING | `16` | Should be `layout.screenPaddingH` |
| FannedSeriesCard | GAP | `12` | Should be `layout.itemGap` |

### Magic Numbers

| File | Value | Context |
|------|-------|---------|
| SeriesCard | `FAN_ROTATION = 8` | Visual design, acceptable |
| SeriesCard | `FAN_VERTICAL_OFFSET = 6` | Visual design, acceptable |
| SeriesCard | `MAX_VISIBLE_BOOKS = 5` | Logic, acceptable |

---

## Token Coverage Summary

| Category | Total Properties | Using Tokens | Coverage |
|----------|------------------|--------------|----------|
| Spacing | 45 | 28 | 62% |
| Border Radius | 18 | 12 | 67% |
| Elevation | 8 | 3 | 38% |
| Layout Constants | 12 | 4 | 33% |

---

## Recommendations

### High Priority

1. **Replace hardcoded spacing with tokens**
```typescript
// Before
marginBottom: 4,
// After
marginBottom: spacing.xs,
```

2. **Add fanned cover tokens to cardTokens**
```typescript
cardTokens.stackedCovers: {
  count: 5,           // was 3
  offset: 18,         // horizontal offset
  size: 60,           // base cover size
  rotation: 8,        // degrees
  verticalOffset: 6,  // vertical stagger
}
```

3. **Consolidate screen padding constants**
```typescript
// In all screen components, use:
paddingHorizontal: layout.screenPaddingH,  // 20px
```

### Medium Priority

4. **Create gap tokens for grid layouts**
```typescript
spacing.gridGap: 12,   // Between grid items
spacing.sectionGap: 24, // Already exists as layout.sectionGap
```

5. **Update elevation.glow color**
```typescript
// Change from
shadowColor: '#F3B60C',  // Old gold
// To
shadowColor: accentColors.primary,  // New red
```

### Low Priority

6. **Document visual magic numbers**
   - Add comments explaining why certain values exist
   - Create design spec reference

---

## Token Usage Guide

### When to Use Each Spacing

| Use Case | Token |
|----------|-------|
| Icon padding | `spacing.xs` (4px) |
| Button internal padding | `spacing.sm` (8px) |
| List item gaps | `spacing.md` (12px) |
| Card internal padding | `spacing.lg` (16px) |
| Screen horizontal padding | `spacing.xl` (20px) or `layout.screenPaddingH` |
| Between sections | `spacing.xxl` (24px) or `layout.sectionGap` |
| Major separations | `spacing['3xl']` (32px) |

### When to Use Scale Functions

| Scenario | Function |
|----------|----------|
| Component dimensions | `scale()` |
| Screen percentages | `wp()`, `hp()` |
| Font sizes | `moderateScale()` or `scale()` |
| Touch targets | Use `layout.*` constants |

---

*Audit complete. See 06-ColorUsage.md for color system analysis.*
