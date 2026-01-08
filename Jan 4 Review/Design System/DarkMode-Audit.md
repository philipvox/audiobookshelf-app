# Dark Mode Color Audit
## AudiobookShelf React Native App

**Audit Date:** January 6, 2026
**Branch:** `refactor/cdplayer-screen`
**Scope:** All hardcoded colors, legacy imports, and theme violations

---

## Executive Summary

| Metric | Count | Severity |
|--------|-------|----------|
| **Hardcoded Hex Colors** | 150+ | High |
| **Hardcoded RGBA Colors** | 130+ | Medium |
| **Legacy `colors` Imports** | 60+ files | High |
| **Files Needing Fixes** | 75+ | - |

**Overall Assessment:** The codebase has a well-structured theme system (`lightColors`/`darkColors` with nested semantic tokens), but significant migration work remains. Many components bypass the theme system with hardcoded values or use the deprecated flat `colors` export.

---

## Part 1: Theme System Overview

### Current Architecture

```
src/shared/theme/colors.ts
├── accentColors        # Shared accent colors (both themes)
├── lightColors         # Light theme (nested structure)
├── darkColors          # Dark theme (nested structure)
└── colors              # DEPRECATED - flat dark-mode only
```

### Recommended Usage

```typescript
// CORRECT - Theme-aware, supports light/dark mode
import { useThemeColors } from '@/shared/theme/themeStore';
const themeColors = useThemeColors();
<View style={{ backgroundColor: themeColors.background.primary }} />

// INCORRECT - Hardcoded, dark mode only
import { colors } from '@/shared/theme';
<View style={{ backgroundColor: colors.backgroundPrimary }} />
```

### Theme Token Categories

| Category | Light Mode | Dark Mode | Used For |
|----------|------------|-----------|----------|
| `background.*` | White-based | Black-based | Screen backgrounds |
| `surface.*` | White/Gray | Dark gray | Cards, elevated elements |
| `text.*` | Black w/opacity | White w/opacity | All text |
| `icon.*` | Black w/opacity | White w/opacity | Icons |
| `border.*` | Black w/opacity | White w/opacity | Dividers, borders |
| `button.*` | Black on white | White on black | Buttons |
| `player.*` | Dark (cinematic) | Dark | Player screen only |
| `progress.*` | Red accent | Red accent | Progress bars |
| `nav.*` | White bg | Black bg | Tab bar, nav |
| `semantic.*` | Standard colors | Standard colors | Success/error/warning |
| `queue.*` | Light theme | Dark theme | Queue panel |
| `search.*` | Light inputs | Dark inputs | Search bars |

---

## Part 2: Hardcoded Hex Colors

### Priority 1: Navigation Components (CRITICAL)

| File | Line | Hardcoded Value | Should Be |
|------|------|-----------------|-----------|
| `FloatingTabBar.tsx` | 29 | `#FFFFFF` | `themeColors.nav.background` |
| `FloatingTabBar.tsx` | 30 | `#000000` | `themeColors.nav.active` |
| `FloatingTabBar.tsx` | 36 | `#000000` | Dark theme bg |
| `FloatingTabBar.tsx` | 37 | `#FFFFFF` | Dark theme active |
| `FloatingTabBar.tsx` | 319 | `#FFFFFF` | `themeColors.nav.background` |
| `FloatingTabBar.tsx` | 337 | `#000` | `themeColors.text.primary` |
| `GlobalMiniPlayer.tsx` | 60-81 | Multiple | See detailed list below |

**GlobalMiniPlayer.tsx Hardcoded Colors:**
```typescript
// Lines 60-81 - Light theme object
background: '#FFFFFF',      // → themeColors.background.primary
backgroundTertiary: '#E5E5E5',
textPrimary: '#000000',     // → themeColors.text.primary
borderStrong: '#000000',
accent: '#E53935',          // → themeColors.progress.fill
tickActive: '#F50101',

// Lines 72-81 - Dark theme object
background: '#000000',
backgroundTertiary: '#1C1C1E',
textPrimary: '#FFFFFF',
accent: '#E53935',
tickActive: '#F50101',
```

### Priority 2: Error Components

| File | Line | Hardcoded Value | Context | Should Be |
|------|------|-----------------|---------|-----------|
| `ErrorBoundary.tsx` | 103 | `#ff4444` | Error icon | `themeColors.semantic.error` |
| `ErrorBoundary.tsx` | 108 | `#000` | Refresh icon | `themeColors.icon.primary` |
| `ErrorBoundary.tsx` | 132 | `#ff9800` | Warning icon | `themeColors.semantic.warning` |
| `ErrorBoundary.tsx` | 169 | `#121212` | Background | `themeColors.background.primary` |
| `ErrorBoundary.tsx` | 177 | `#fff` | Text | `themeColors.text.primary` |
| `ErrorBoundary.tsx` | 191 | `#F4B60C` | Button bg | `accentColors.primary` |
| `ErrorBoundary.tsx` | 200 | `#000` | Button text | `themeColors.text.inverse` |
| `ErrorBoundary.tsx` | 238 | `#F4B60C` | Link color | `accentColors.primary` |
| `ErrorSheet.tsx` | 34-37 | Severity colors | Status colors | `themeColors.semantic.*` |
| `ErrorSheet.tsx` | 173 | `#1c1c1e` | Sheet bg | `themeColors.player.sheetBackground` |
| `ErrorSheet.tsx` | 204 | `#fff` | Text | `themeColors.text.primary` |
| `ErrorToast.tsx` | 28-31 | Severity colors | Status colors | `themeColors.semantic.*` |
| `ErrorToast.tsx` | 145 | `#1c1c1e` | Toast bg | `themeColors.surface.raised` |
| `ErrorToast.tsx` | 165 | `#fff` | Text | `themeColors.text.primary` |

### Priority 3: Shared Components

| File | Line | Hardcoded Value | Context | Should Be |
|------|------|-----------------|---------|-----------|
| `AlphabetScrubber.tsx` | 37 | `#F4B60C` | Accent | `accentColors.primary` |
| `AlphabetScrubber.tsx` | 164 | `#000` | Text | `themeColors.text.inverse` |
| `SeriesProgressBadge.tsx` | 20 | `#4ADE80` | Success color | `themeColors.feature.heartFill` |
| `SeriesProgressBadge.tsx` | 67 | `#000` | Icon color | `themeColors.icon.inverse` |
| `SeriesHeartButton.tsx` | 12 | `#E53935` | Red | `accentColors.primary` |
| `SeriesHeartButton.tsx` | 101 | `#FFFFFF` | Heart color | `themeColors.icon.inverse` |
| `BookCard.tsx` | 86 | `#FF9800` | Paused color | `themeColors.semantic.warning` |
| `BookCard.tsx` | 113 | `#FF9800` | Pause icon | `themeColors.semantic.warning` |
| `BookCard.tsx` | 367 | `#fff` | Play icon | `themeColors.icon.inverse` |
| `BookCard.tsx` | 397 | `#000` | Check icon | `themeColors.icon.inverse` |
| `BookContextMenu.tsx` | 66-80 | Multiple | Menu colors | Theme-aware |
| `BookContextMenu.tsx` | 388 | `#fff` | Text | `themeColors.text.primary` |
| `FilterSortBar.tsx` | 50 | `#fff` | Icon active | `themeColors.icon.inverse` |
| `FilterSortBar.tsx` | 147 | `#fff` | Text | `themeColors.text.inverse` |
| `TextInput.tsx` | 129 | `#EF4444` | Error color | `themeColors.semantic.error` |
| `TextInput.tsx` | 145 | `#EF4444` | Error border | `themeColors.semantic.error` |
| `TextInput.tsx` | 180 | `#EF4444` | Error text | `themeColors.semantic.error` |

### Priority 4: Feature Components

| File | Line | Hardcoded Value | Context |
|------|------|-----------------|---------|
| `NarratorDetailScreen.tsx` | 131-133 | Avatar colors | Palette array |
| `NarratorDetailScreen.tsx` | 145 | `#FFFFFF` | Icon color |
| `NarratorDetailScreen.tsx` | 278 | `#FFFFFF` | Text |
| `NarratorDetailScreen.tsx` | 409-559 | `#000` | Icon colors |
| `NarratorDetailScreen.tsx` | 486-583 | `#4CAF50` | Success color |
| `NarratorDetailScreen.tsx` | 627 | Avatar palette | Multiple colors |
| `QueuePanel.tsx` | 348-350 | Icon colors | `#888888`, `#999999`, `#CCCCCC` |
| `QueueItem.tsx` | 23-35 | `#FFFFFF` | Icon defaults |
| `QueueItem.tsx` | 127 | `#262626` | Background |
| `SwipeableQueueItem.tsx` | 86 | `#fff` | Trash icon |
| `SwipeableQueueItem.tsx` | 167 | `#262626` | Background |
| `SwipeableQueueItem.tsx` | 207 | `#ff4b4b` | Delete bg |
| `QueueScreen.tsx` | 256 | `#ff4b4b` | Destructive |
| `QueueScreen.tsx` | 300 | `#000` | Button text |
| `WishlistItemRow.tsx` | 41 | `#FF6B6B` | Must-read badge |
| `WishlistItemRow.tsx` | 143-145 | `#000` | Icon fills |
| `WishlistItemRow.tsx` | 216 | `#262626` | Background |
| `ManualAddSheet.tsx` | 307-348 | `#000` | Multiple |
| `ManualAddSheet.tsx` | 370 | `#1c1c1e` | Sheet bg |
| `ManualAddSheet.tsx` | 479 | `#FF6B6B` | Remove button |
| `NumericInputModal.tsx` | 408 | `#E53935` | Accent |
| `HapticSettingsScreen.tsx` | 95 | `#fff` | Thumb color |
| `PlaybackSettingsScreen.tsx` | 103 | `#fff` | Thumb color |
| `PlaybackSettingsScreen.tsx` | 588 | `#000` | Button text |
| `StorageSettingsScreen.tsx` | 54 | `#ff4b4b` | Danger color |
| `StorageSettingsScreen.tsx` | 120 | `#fff` | Thumb color |
| `PreferencesScreen.tsx` | 189 | `#FFFFFF` | Text |
| `PreferencesOnboardingScreen.tsx` | 291 | `#FFFFFF` | Icon color |
| `PreferencesOnboardingScreen.tsx` | 407 | `#FFFFFF` | Text |
| `DebugStressTestScreen.tsx` | 354-358 | Status colors | Green/red/orange |
| `ChapterListItem.tsx` | 49 | `#F0F0F0` | Light mode bg |

### Priority 5: Reading History Wizard

| File | Hardcoded Colors |
|------|------------------|
| `MarkBooksScreen.tsx` | 25+ hardcoded colors (lines 695-1665) |
| `ReadingHistoryScreen.tsx` | 15+ hardcoded colors |
| `FilterSheet.tsx` | 10+ hardcoded colors in COLORS object |
| `SortSheet.tsx` | 10+ hardcoded colors in COLORS object |

**Pattern:** These files define local `COLORS` objects with hardcoded values instead of using theme.

---

## Part 3: Hardcoded RGBA Colors

### High-Impact Files

| File | Count | Pattern |
|------|-------|---------|
| `BookContextMenu.tsx` | 15+ | Overlay, border, text opacities |
| `CoverPlayButton.tsx` | 12+ | Overlay backgrounds |
| `MarkBooksScreen.tsx` | 20+ | Accent dim, surface colors |
| `ErrorSheet.tsx` | 10+ | Scrim, surface colors |
| `GlobalMiniPlayer.tsx` | 12+ | Light/dark theme objects |
| `FloatingTabBar.tsx` | 6+ | Inactive states |
| `SeriesCard.tsx` | 2 | Card backgrounds |
| `GenreSections.tsx` | 2 | Dark/light conditional |
| `MoodFilterPills.tsx` | 8+ | Borders, overlays |
| `HeroSection.tsx` | 4+ | Overlays, buttons |

### Common Patterns Needing Migration

```typescript
// Pattern 1: Overlay backgrounds
backgroundColor: 'rgba(0,0,0,0.6)'
// → themeColors.overlay.medium

// Pattern 2: Text opacity (white on dark)
color: 'rgba(255,255,255,0.7)'
// → themeColors.text.secondary

// Pattern 3: Text opacity (black on light)
color: 'rgba(0,0,0,0.5)'
// → themeColors.text.tertiary

// Pattern 4: Surface with opacity
backgroundColor: 'rgba(255,255,255,0.05)'
// → themeColors.surface.card

// Pattern 5: Border opacity
borderColor: 'rgba(255,255,255,0.1)'
// → themeColors.border.default
```

---

## Part 4: Legacy `colors` Import Files

### Files Still Using Deprecated Import

These files import `{ colors }` from theme (deprecated flat export):

**Player Feature (18 files):**
- `CDPlayerScreen.tsx`
- `ProgressBar.tsx`
- `NumericInputModal.tsx`
- `BookCompletionSheet.tsx`
- `PlayerModule.tsx`
- `ChapterListItem.tsx`
- `SleepTimerSheet.tsx`
- `SpeedSheet.tsx`
- `playerConstants.ts`
- `playerTheme.ts`

**Queue Feature (4 files):**
- `SwipeableQueueItem.tsx`
- `QueueItem.tsx`
- `QueuePanel.tsx`
- `QueueScreen.tsx`

**Library Feature (7 files):**
- `HorizontalBookItem.tsx`
- `SortPicker.tsx`
- `GenreCards.tsx`
- `AddToLibraryButton.tsx`
- `CollectionsListContent.tsx`
- `NarratorsListContent.tsx`
- `SeriesListContent.tsx`
- `AuthorsListContent.tsx`

**Home Feature (5 files):**
- `CassetteTestScreen.tsx`
- `InfoTiles.tsx`
- `TextListSection.tsx`
- `YourSeriesSection.tsx`
- `HomeDiscSection.tsx`

**Series Feature (3 files):**
- `SeriesBookRow.tsx`
- `SeriesProgressHeader.tsx`
- `SeriesCard.tsx`

**Shared Components (15 files):**
- `StackedCovers.tsx`
- `SearchInput.tsx`
- `FilterSortBar.tsx`
- `TextInput.tsx`
- `Skeleton.tsx`
- `ThumbnailProgressBar.tsx`
- `CoverPlayButton.tsx`
- `NetworkStatusBar.tsx`
- `Snackbar.tsx`
- `ProgressDots.tsx`
- `SeriesProgressBadge.tsx`
- `IconButton.tsx`
- `ToastContainer.tsx`
- `LoadingSpinner.tsx`
- `BookContextMenu.tsx`

**Other Features:**
- `LoginScreen.tsx`
- `CollectionDetailScreen.tsx`
- `CollectionCard.tsx`
- `SeriesNavigator.tsx`
- `PreferencesScreen.tsx`
- `PreferencesOnboardingScreen.tsx`
- `SwipeableBookCard.tsx`
- `MoodBookCard.tsx`
- `MoodResultsScreen.tsx`
- `MoodDiscoveryScreen.tsx`
- `QuickTuneBar.tsx`
- `DebugStressTestScreen.tsx`
- `WishlistItemRow.tsx`
- `ManualAddSheet.tsx`
- `CompleteBadge.tsx`

---

## Part 5: Components with Local Color Objects

These components define their own color constants instead of using theme:

| Component | Pattern | Lines |
|-----------|---------|-------|
| `MarkBooksScreen.tsx` | `const COLORS = { ... }` | 695-1665 |
| `ReadingHistoryScreen.tsx` | `const COLORS = { ... }` | 635+ |
| `FilterSheet.tsx` | `const COLORS = { ... }` | 30-41 |
| `SortSheet.tsx` | `const COLORS = { ... }` | 28-33 |
| `GlobalMiniPlayer.tsx` | `LIGHT_COLORS` / `DARK_COLORS` | 60-81 |
| `FloatingTabBar.tsx` | `lightTheme` / `darkTheme` | 27-40 |
| `ErrorToast.tsx` | `SEVERITY_COLORS` | 28-31 |
| `ErrorSheet.tsx` | `SEVERITY_COLORS` | 34-37 |
| `DebugStressTestScreen.tsx` | `getStatusColor()` | 354-358 |

---

## Part 6: Missing Theme Tokens

Tokens that need to be added to `colors.ts`:

### Avatar Colors (for entities without images)
```typescript
avatar: {
  purple: '#9C27B0',
  blue: '#2196F3',
  orange: '#FF9800',
  green: '#4CAF50',
  gold: '#F3B60C',
}
```

### Severity Colors (already exist in semantic, but not exposed consistently)
```typescript
// Already exists - ensure consistent usage
semantic: {
  success: '#4CAF50',    // ✓
  warning: '#FF9800',    // ✓
  error: '#E53935',      // ✓
  info: '#2196F3',       // ✓
}
```

### Switch/Toggle Colors
```typescript
switch: {
  thumbColor: '#FFFFFF',
  trackColorTrue: accentColors.primary,
  trackColorFalse: 'rgba(0,0,0,0.3)', // light mode
}
```

### Destructive Action Colors
```typescript
destructive: {
  background: '#ff4b4b',
  text: '#FFFFFF',
}
```

### Paused/In-Progress States
```typescript
// These exist but aren't consistently used
state: {
  paused: '#FF9800',     // Orange - paused playback
  active: '#4CAF50',     // Green - active/playing
  pending: '#2196F3',    // Blue - waiting
}
```

---

## Part 7: Fix Priority Matrix

### Priority 1: Navigation (Highest Impact)
| Task | Files | Effort |
|------|-------|--------|
| Fix FloatingTabBar colors | 1 | Medium |
| Fix GlobalMiniPlayer colors | 1 | Medium |

### Priority 2: Error Components
| Task | Files | Effort |
|------|-------|--------|
| Fix ErrorBoundary | 1 | Low |
| Fix ErrorSheet | 1 | Low |
| Fix ErrorToast | 1 | Low |

### Priority 3: Shared Components
| Task | Files | Effort |
|------|-------|--------|
| Fix BookCard | 1 | Medium |
| Fix BookContextMenu | 1 | High |
| Fix SeriesCard | 1 | Low |
| Fix AlphabetScrubber | 1 | Low |
| Fix TextInput | 1 | Low |
| Fix FilterSortBar | 1 | Low |
| Fix CoverPlayButton | 1 | High |

### Priority 4: Feature Screens
| Task | Files | Effort |
|------|-------|--------|
| Fix NarratorDetailScreen | 1 | High |
| Fix Queue components | 4 | Medium |
| Fix Wishlist components | 2 | Medium |
| Fix Settings screens | 3 | Low |
| Fix Reading History wizard | 4 | High |

### Priority 5: Legacy Import Migration
| Task | Files | Effort |
|------|-------|--------|
| Migrate player feature | 18 | High |
| Migrate library feature | 7 | Medium |
| Migrate home feature | 5 | Medium |
| Migrate shared components | 15 | High |
| Migrate other features | 15 | Medium |

---

## Part 8: Recommended Migration Pattern

### Step 1: Replace Legacy Import

```typescript
// BEFORE
import { colors, spacing } from '@/shared/theme';

// AFTER
import { spacing } from '@/shared/theme';
import { useThemeColors } from '@/shared/theme/themeStore';

function MyComponent() {
  const themeColors = useThemeColors();
  // Use themeColors.text.primary instead of colors.textPrimary
}
```

### Step 2: Map Legacy Colors to Theme Tokens

| Legacy | Theme Token |
|--------|-------------|
| `colors.textPrimary` | `themeColors.text.primary` |
| `colors.textSecondary` | `themeColors.text.secondary` |
| `colors.textTertiary` | `themeColors.text.tertiary` |
| `colors.textMuted` | `themeColors.text.disabled` |
| `colors.backgroundPrimary` | `themeColors.background.primary` |
| `colors.backgroundSecondary` | `themeColors.background.secondary` |
| `colors.backgroundTertiary` | `themeColors.background.tertiary` |
| `colors.accent` | `accentColors.primary` |
| `colors.border` | `themeColors.border.default` |
| `colors.success` | `themeColors.semantic.success` |
| `colors.error` | `themeColors.semantic.error` |
| `colors.warning` | `themeColors.semantic.warning` |

### Step 3: Handle Non-React Contexts

For files that can't use hooks (utilities, constants):

```typescript
// Option A: Import from themeStore directly
import { useThemeStore } from '@/shared/theme/themeStore';
const colors = useThemeStore.getState().currentTheme === 'dark'
  ? darkColors
  : lightColors;

// Option B: Pass colors as parameter
function formatWithColor(text: string, colors: ThemeColors) {
  return { color: colors.text.primary };
}
```

---

## Part 9: Testing Checklist

After each fix, verify:

- [ ] Light mode appearance correct
- [ ] Dark mode appearance correct
- [ ] No hardcoded hex values remain
- [ ] No hardcoded rgba values remain
- [ ] TypeScript compiles without errors
- [ ] Visual regression test passes

### Key Screens to Test

1. **Home Screen** - Hero section, cards, section headers
2. **Library Screen** - Tabs, book list, search
3. **Player Screen** - Controls, timeline, sheets
4. **Queue Panel** - Item rows, drag handles
5. **Settings Screens** - Toggles, rows, buttons
6. **Error States** - Toast, sheet, boundary
7. **Detail Screens** - Hero, metadata, book list

---

## Part 10: Estimated Effort

| Priority | Files | Estimated Hours |
|----------|-------|-----------------|
| Priority 1 (Navigation) | 2 | 4h |
| Priority 2 (Errors) | 3 | 3h |
| Priority 3 (Shared) | 10 | 8h |
| Priority 4 (Features) | 15 | 12h |
| Priority 5 (Migration) | 60 | 20h |
| **Total** | **90 files** | **~47h** |

---

## Appendix A: Theme Color Reference

### Light Mode Key Colors
| Token | Value | Usage |
|-------|-------|-------|
| `background.primary` | `#FFFFFF` | Screen backgrounds |
| `text.primary` | `#000000` | Primary text |
| `text.secondary` | `rgba(0,0,0,0.70)` | Secondary text |
| `border.default` | `rgba(0,0,0,0.12)` | Dividers |
| `button.primary` | `#000000` | Primary buttons |

### Dark Mode Key Colors
| Token | Value | Usage |
|-------|-------|-------|
| `background.primary` | `#000000` | Screen backgrounds |
| `text.primary` | `#FFFFFF` | Primary text |
| `text.secondary` | `rgba(255,255,255,0.70)` | Secondary text |
| `border.default` | `rgba(255,255,255,0.10)` | Dividers |
| `button.primary` | `#FFFFFF` | Primary buttons |

### Accent Colors (Both Themes)
| Token | Value | Usage |
|-------|-------|-------|
| `accentColors.primary` | `#E53935` | Red accent (primary) |
| `accentColors.primaryDark` | `#C62828` | Darker red |
| `accentColors.primarySubtle` | `rgba(229,57,53,0.15)` | Subtle background |

---

*This audit was generated by analyzing the codebase with grep patterns for hex colors, rgba values, and legacy imports.*
