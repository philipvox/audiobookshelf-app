# Color Usage Audit
## AudiobookShelf Design System

**Date:** January 5, 2026
**Source:** `src/shared/theme/colors.ts`

---

## Color System Architecture

### Dual System (Theme-Aware vs Legacy)

The codebase has two color systems:

1. **New Theme System** (Recommended)
   - `lightColors` / `darkColors` objects
   - Accessed via `useTheme().colors` or `useThemeColors()`
   - Structured hierarchically: `colors.text.primary`

2. **Legacy System** (Deprecated)
   - Flat `colors` export
   - Dark mode only
   - Accessed via `import { colors } from '@/shared/theme'`

---

## Accent Colors (Both Themes)

| Token | Value | Usage |
|-------|-------|-------|
| `accentColors.primary` | `#E53935` (Red) | Primary accent |
| `accentColors.primaryDark` | `#C62828` | Pressed states |
| `accentColors.primarySubtle` | `rgba(229,57,53,0.15)` | Subtle backgrounds |
| `accentColors.red` | `#E53935` | Alias |
| `accentColors.redLight` | `#EF5350` | Lighter red |
| `accentColors.blue` | `#0146F5` | Bookmarks |
| `accentColors.blueLight` | `#64B5F6` | Bookmark stem |

**Note:** Legacy `gold` tokens are deprecated aliases for red.

---

## Dark Theme Colors

### Backgrounds
| Token | Value |
|-------|-------|
| `background.primary` | `#000000` |
| `background.secondary` | `#1A1A1A` |
| `background.tertiary` | `#262626` |
| `background.elevated` | `#2C2C2C` |

### Surfaces
| Token | Value |
|-------|-------|
| `surface.default` | `#1A1A1A` |
| `surface.raised` | `#262626` |
| `surface.sunken` | `#0D0D0D` |
| `surface.card` | `rgba(255,255,255,0.05)` |
| `surface.cardHover` | `rgba(255,255,255,0.08)` |

### Text
| Token | Value | Opacity |
|-------|-------|---------|
| `text.primary` | `#FFFFFF` | 100% |
| `text.secondary` | `rgba(255,255,255,0.70)` | 70% |
| `text.tertiary` | `rgba(255,255,255,0.50)` | 50% |
| `text.disabled` | `rgba(255,255,255,0.30)` | 30% |
| `text.inverse` | `#000000` | 100% |
| `text.accent` | `#E53935` | 100% |

### Icons
| Token | Value |
|-------|-------|
| `icon.primary` | `#FFFFFF` |
| `icon.secondary` | `rgba(255,255,255,0.70)` |
| `icon.tertiary` | `rgba(255,255,255,0.50)` |
| `icon.accent` | `#E53935` |
| `icon.inverse` | `#000000` |

### Buttons
| Token | Value |
|-------|-------|
| `button.primary` | `#FFFFFF` |
| `button.primaryText` | `#000000` |
| `button.secondary` | `transparent` |
| `button.secondaryText` | `#FFFFFF` |
| `button.destructive` | `#E53935` |
| `button.disabled` | `rgba(255,255,255,0.12)` |
| `button.disabledText` | `rgba(255,255,255,0.30)` |

### Player (Always Dark)
| Token | Value |
|-------|-------|
| `player.background` | `#000000` |
| `player.backgroundSecondary` | `#1A1A1A` |
| `player.text` | `#FFFFFF` |
| `player.textSecondary` | `rgba(255,255,255,0.70)` |
| `player.control` | `#FFFFFF` |
| `player.accent` | `#E53935` |
| `player.tickDefault` | `rgba(255,255,255,0.40)` |
| `player.tickActive` | `#E53935` |

### Semantic
| Token | Value |
|-------|-------|
| `semantic.success` | `#66BB6A` |
| `semantic.warning` | `#FFA726` |
| `semantic.error` | `#EF5350` |
| `semantic.info` | `#42A5F5` |

### Feature-Specific
| Token | Value | Usage |
|-------|-------|-------|
| `feature.heartFill` | `#4ADE80` (Green) | Favorite hearts |
| `feature.sleepTimer` | `#FF6B6B` | Sleep timer icon |
| `feature.downloaded` | `#34C759` | Downloaded badge |
| `feature.downloading` | `#FFFFFF` | Download progress |
| `feature.bookmark` | `#0146F5` | Bookmark fill |
| `feature.bookmarkStem` | `#64B5F6` | Bookmark stem |

---

## Light Theme Colors

### Backgrounds
| Token | Value |
|-------|-------|
| `background.primary` | `#FFFFFF` |
| `background.secondary` | `#F5F5F5` |
| `background.tertiary` | `#EEEEEE` |
| `background.elevated` | `#FFFFFF` |

### Text (Inverted Opacity)
| Token | Value | Opacity |
|-------|-------|---------|
| `text.primary` | `#000000` | 100% |
| `text.secondary` | `rgba(0,0,0,0.70)` | 70% |
| `text.tertiary` | `rgba(0,0,0,0.50)` | 50% |
| `text.disabled` | `rgba(0,0,0,0.30)` | 30% |
| `text.inverse` | `#FFFFFF` | 100% |

### Buttons (Inverted)
| Token | Value |
|-------|-------|
| `button.primary` | `#000000` |
| `button.primaryText` | `#FFFFFF` |

---

## Legacy Colors (Deprecated)

| Token | Value | New Equivalent |
|-------|-------|----------------|
| `colors.accent` | `#E53935` | `accentColors.primary` |
| `colors.backgroundPrimary` | `#000000` | `darkColors.background.primary` |
| `colors.backgroundSecondary` | `#0D0D0D` | `darkColors.surface.sunken` |
| `colors.backgroundTertiary` | `#1A1A1A` | `darkColors.surface.default` |
| `colors.textPrimary` | `#FFFFFF` | `darkColors.text.primary` |
| `colors.textSecondary` | `rgba(255,255,255,0.70)` | `darkColors.text.secondary` |
| `colors.textTertiary` | `rgba(255,255,255,0.50)` | `darkColors.text.tertiary` |
| `colors.textMuted` | `rgba(255,255,255,0.30)` | `darkColors.text.disabled` |
| `colors.border` | `rgba(255,255,255,0.10)` | `darkColors.border.default` |

---

## Component Color Usage Analysis

### Components Using New Theme System

| Component | Method | Status |
|-----------|--------|--------|
| BookCard | `useThemeColors()` | Mixed |
| SeriesCard (home) | `useThemeColors()`, `useIsDarkMode()` | Good |
| FannedSeriesCard | `useThemeColors()`, `useIsDarkMode()` | Good |
| PersonCard | `useThemeColors()` | Good |

### Components Using Legacy System

| Component | Issue |
|-----------|-------|
| AuthorCard | Uses `colors.textPrimary`, `colors.textSecondary` |
| EmptyState | Uses `colors.textPrimary`, `colors.textMuted` |
| LoadingSpinner | Uses `colors.accent`, `colors.backgroundPrimary` |
| BookCard (partial) | Uses `colors.accent`, `colors.progressTrack` |

### Hardcoded Colors Found

| File | Hardcoded | Should Be |
|------|-----------|-----------|
| AuthorCard | `'#FFFFFF'` (initials) | `colors.text.inverse` |
| SeriesCard | `'rgba(255,255,255,0.06)'` | `surface.card` |
| SeriesCard | `'rgba(0,0,0,0.04)'` | Light mode `surface.card` |
| FannedSeriesCard | `'rgba(255,255,255,0.06)'` | `surface.card` |
| SeriesCard covers | `'rgba(128,128,128,0.3)'` | Should be token |
| BookCard | `'rgba(0,0,0,0.6)'` | `overlay.medium` |
| BookCard | `'rgba(100,150,255,0.9)'` | Should be `feature.streaming` |

---

## Opacity Tiers

### Standardized Opacity Scale

| Tier | Opacity | Usage |
|------|---------|-------|
| Primary | 100% (1.0) | Main text, icons |
| Secondary | 70% (0.70) | Supporting text |
| Tertiary | 50% (0.50) | Hints, captions |
| Muted/Disabled | 30% (0.30) | Disabled states |
| Subtle | 12% (0.12) | Disabled buttons |
| Border Default | 10% (0.10) | Standard borders |
| Border Light | 5% (0.05) | Subtle borders |
| Card Background | 5-8% | Card surfaces |

---

## Color Accessibility

### Contrast Ratios (Dark Mode)

| Combination | Ratio | WCAG AA | WCAG AAA |
|-------------|-------|---------|----------|
| Primary text on black | 21:1 | Pass | Pass |
| Secondary text on black | ~11:1 | Pass | Pass |
| Tertiary text on black | ~7.5:1 | Pass | Pass |
| Accent red on black | ~4.8:1 | Pass | Fail |
| Muted text on black | ~4.5:1 | Pass (large) | Fail |

### Issues
- Muted text (30% white) may be too low contrast for small text
- Accent red barely meets AA for normal text

---

## Recommendations

### High Priority

1. **Migrate AuthorCard to theme system**
```typescript
// Before
color: colors.textPrimary
// After
const themeColors = useThemeColors();
color: themeColors.text
```

2. **Fix hardcoded card backgrounds**
```typescript
// Before
backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'
// After
backgroundColor: themeColors.surface.card
```

3. **Add streaming badge color to feature tokens**
```typescript
feature: {
  streaming: '#6496FF',  // Blue for streaming
}
```

### Medium Priority

4. **Update EmptyState and LoadingSpinner**
   - Use theme hooks instead of legacy colors

5. **Review contrast for muted text**
   - Consider increasing from 30% to 35-40%

### Low Priority

6. **Deprecation warnings**
   - Add console warnings for legacy color usage in dev

---

## Color Token Quick Reference

### Most Common Usage

```typescript
// Text
themeColors.text            // Primary text
themeColors.textSecondary   // Secondary text
themeColors.textTertiary    // Hints, metadata

// Backgrounds
themeColors.background.primary    // Screen background
themeColors.surface.card          // Card backgrounds

// Interactive
themeColors.accent                // Primary action color
themeColors.button.primary        // Button background
themeColors.border.default        // Standard borders

// Semantic
themeColors.semantic.success      // Success states
themeColors.semantic.error        // Error states
```

---

*Audit complete. See 07-InteractiveStates.md for interactive patterns.*
