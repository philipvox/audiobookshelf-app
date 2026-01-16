# Light/Dark Mode Audit Report

**Date:** 2026-01-11
**Auditor:** Claude
**Scope:** Complete theme system review for Secret Library app

---

## Executive Summary

The theme system is **well-architected** with a comprehensive color token structure supporting:
- Light/Dark modes
- 3 accent themes (Red, Electric Blue, Lime)
- Feature-specific color palettes

However, there are **significant issues** with hardcoded colors scattered throughout the codebase that will cause visual inconsistencies when switching themes.

### Quick Stats

| Metric | Count |
|--------|-------|
| Theme hook usage (modern `useTheme`/`useColors`) | 223 |
| Legacy `useThemeColors` usage (deprecated) | 166 |
| Deprecated `colors` import | 2 files |
| Hardcoded hex colors (outside theme) | 80+ |
| Hardcoded rgba colors (outside theme) | 100+ |
| StyleSheet components | 142 |

---

## 1. Theme Architecture (Well Designed)

### Color System (`src/shared/theme/colors.ts`)

The color system follows a hierarchical structure:

```
ThemeColors
├── background (primary, secondary, tertiary, elevated)
├── surface (default, raised, sunken, card, cardHover)
├── text (primary, secondary, tertiary, disabled, inverse, accent)
├── icon (primary, secondary, tertiary, accent, inverse, disabled)
├── border (default, strong, light, focused)
├── button (primary, secondary, ghost, accent, destructive, disabled)
├── player (30+ specific tokens)
├── progress (track, fill, buffer)
├── nav (background, border, active, inactive)
├── semantic (success, warning, error, info + light variants)
├── feature (heartFill, sleepTimer, downloaded, downloading, streaming, bookmark)
├── queue (10+ tokens)
├── search (inputBackground, inputBorder, placeholder, highlight)
├── overlay (light, medium, dark)
├── glass (white, border)
└── accent (primary, primaryDark, primaryLight, primarySubtle, onDark, etc.)
```

### Theme Store (`src/shared/theme/themeStore.ts`)

Properly implemented with:
- Zustand persistence to AsyncStorage
- `mode: 'light' | 'dark'` - persisted
- `accentTheme: 'red' | 'electric' | 'lime'` - persisted
- Modern hooks: `useTheme()`, `useColors()`, `useThemeMode()`, `useIsDarkMode()`
- Legacy compatibility: `useThemeColors()` (deprecated)

### Theme Toggle UI (`AppearanceSettingsScreen.tsx`)

**Status:** Working correctly

Located at: Profile > Appearance Settings

Features:
- Dark mode toggle (Switch component)
- Accent color picker (Radio selection)
- Color preview section
- Colored spines toggle

**Minor Issue:** Switch `thumbColor="#fff"` is hardcoded (lines 112, 129)

---

## 2. Critical Issues: Hardcoded Colors

### 2.1 High Priority (Breaks Theme)

#### Error Components
```
src/core/errors/components/ErrorToast.tsx
  - low: '#4a9eff'
  - medium: '#ff9800'
  - high: '#ff4444'
  - critical: '#d32f2f'

src/core/errors/components/ErrorSheet.tsx
  - Same severity colors hardcoded
  - backgroundColor: 'rgba(0,0,0,0.5)' (overlay)
```

**Fix:** These should use `colors.semantic.*` tokens

#### Series Components (Dark Mode Only)
```
src/features/series/components/SeriesCard.tsx
  - ACCENT_DIM = 'rgba(243,182,12,0.5)' (old gold accent!)
  - return 'rgba(255,255,255,0.3)'

src/features/series/components/SeriesProgressHeader.tsx
  - ACCENT_DIM = 'rgba(243,182,12,0.5)'
  - Multiple rgba(255,255,255,*) colors
  - backgroundColor: '#262626'

src/features/series/components/SeriesBookRow.tsx
  - progressColor = isPaused ? '#FF9800' : ACCENT
  - Path fill="#FF9800"
  - Multiple 'rgba(244,182,12,*)' (old gold!)
```

**Fix:** These use the old gold accent (#F3B60C family) and should use `colors.accent.*`

#### Mood Discovery (Dark Mode Styling)
```
src/features/mood-discovery/screens/MoodDiscoveryScreen.tsx
  - 14 hardcoded rgba colors
  - Mix of dark and light variants without theme check

src/features/mood-discovery/components/MoodDiscoveryCard.tsx
  - color: '#FFFFFF' (hardcoded white)
  - Multiple rgba colors
```

**Fix:** Should check `isDark` and use appropriate theme colors

#### Spine Calculations (Intentional)
```
src/features/home/utils/spineCalculations.ts
  - 70+ hardcoded genre colors
  - Text colors: '#000000', '#FFFFFF'
  - Stroke colors: '#666666', '#444444', '#333333'
```

**Note:** These are intentionally hardcoded for book spine design. Genre colors should be fixed, but text colors should dynamically pick black/white based on background luminosity.

### 2.2 Medium Priority (Partial Theme Support)

#### Shared Components
```
src/shared/components/SeriesCard.tsx
  - cardBgColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' (GOOD pattern, but should use tokens)

src/shared/components/CoverPlayButton.tsx
  - Multiple 'rgba(0,0,0,*)' and 'rgba(255,255,255,*)' colors
  - These are overlays, some are intentional

src/shared/components/FilterSortBar.tsx
  - backgroundColor: 'rgba(0,0,0,0.5)'

src/shared/components/ThumbnailProgressBar.tsx
  - backgroundColor: 'rgba(0,0,0,0.5)'

src/shared/components/BookCard.tsx
  - backgroundColor: 'rgba(100, 150, 255, 0.9)' (streaming indicator)
  - backgroundColor: 'rgba(0,0,0,0.6)' (overlay)
```

#### Home Components
```
src/features/home/components/HomeDiscSection.tsx
  - borderColor: 'rgba(255,255,255,0.3)'
  - backgroundColor: 'rgba(255,255,255,0.2)'

src/features/home/components/ContinueListeningSection.tsx
  - backgroundColor: 'rgba(0, 0, 0, 0.3)' (cover overlay - intentional)
  - backgroundColor: 'rgba(0, 0, 0, 0.5)'

src/features/home/components/TextListSection.tsx
  - Uses isDarkMode check (GOOD)
  - Some hardcoded rgba values
```

#### Player Screen
```
src/features/player/screens/SecretLibraryPlayerScreen.tsx
  - color: 'rgba(255,255,255,0.12)' (line 1467)
  - backgroundColor: 'rgba(0,0,0,0.4)' (lines 1636, 1655)
```

### 2.3 Low Priority (Isolated/Intentional)

#### Animation/Splash
```
src/shared/components/AnimatedSplash.tsx
  - Fixed white/alpha colors for splash animation
```

#### Batch Actions
```
src/features/series/components/BatchActionButtons.tsx
  - Properly uses isDarkMode check
  - Uses '#007AFF' for iOS-style blue button
```

---

## 3. Deprecated API Usage

### Files Using Deprecated `colors` Import
```
src/features/player/constants/playerConstants.ts
src/shared/components/AddToLibraryButton.tsx
```

### Components Using `useThemeColors()` (Deprecated)

166 usages across:
- All player components
- Most shared components
- Some feature screens

**Recommendation:** Migrate to `useTheme()` or `useColors()` for:
- Better TypeScript types
- Access to full color structure
- Future compatibility

---

## 4. Navigation Theming

### Tab Bar (`FloatingTabBar.tsx`)

**Status:** Properly themed

Uses custom `useNavColors()` hook that:
- Checks `useIsDarkMode()`
- Returns appropriate `lightColors` or `darkColors` nav tokens

Icons and labels properly change color based on active/inactive state and theme.

### Stack Navigator

**Status:** No theme configuration

`AppNavigator.tsx` uses `headerShown: false` for all screens, so header theming is not applicable.

---

## 5. Modal/Sheet Theming

### Player Sheets
- `ChaptersSheet.tsx` - Uses `useThemeColors()`
- `SettingsSheet.tsx` - Uses `useThemeColors()`
- `BookmarksSheet.tsx` - Uses `useThemeColors()`

**Issue:** All use deprecated `useThemeColors()` API

### Book Completion Sheet
- Uses `useThemeColors()` + `accentColors`
- Properly themed

### Error Sheet
- Has hardcoded severity colors (critical issue)

---

## 6. Special Elements

### Player UI

The player is extensively themed with dedicated color tokens:
```
player.background
player.text
player.control
player.disc
player.overlay
player.sheetBackground
player.widgetBackground
player.gradientStart/Mid/End
```

**Issues:**
- Some hardcoded rgba overlays in SecretLibraryPlayerScreen
- Uses deprecated `useThemeColors()` in components

### Book Spines

Genre-based colors are intentionally hardcoded in `spineCalculations.ts`.

The system correctly:
- Calculates text color based on background luminosity
- Uses fixed genre colors for visual consistency

### Loading States

`Skeleton.tsx` components properly use theme colors via `useThemeColors()`.

---

## 7. Recommendations

### Immediate (P0)
1. **Fix error severity colors** - Replace hardcoded colors with `colors.semantic.*`
2. **Update Series components** - Remove old gold accent (#F3B60C) references
3. **Fix MoodDiscovery theming** - Add proper light mode colors

### Short Term (P1)
1. **Migrate from `useThemeColors()` to `useTheme()`** - 166 usages
2. **Remove deprecated `colors` import** - 2 files
3. **Create overlay tokens** - Replace common `rgba(0,0,0,*)` patterns

### Medium Term (P2)
1. **Standardize rgba values** - Create theme tokens for common overlays
2. **Add theme tests** - Ensure components render correctly in both modes
3. **Update player component imports** - Full migration to modern API

---

## 8. Theme Compliance Checklist

### Fully Compliant
- [x] AppearanceSettingsScreen
- [x] FloatingTabBar
- [x] ProfileScreen (mostly)
- [x] LoginScreen

### Partially Compliant
- [ ] SecretLibraryPlayerScreen (some hardcoded overlays)
- [ ] HomeScreen (gradient colors conditional)
- [ ] SeriesDetailScreen (dark mode only styling)
- [ ] MoodDiscoveryScreen (mostly dark mode)

### Non-Compliant
- [ ] SeriesCard (old gold accent)
- [ ] SeriesProgressHeader (dark mode only)
- [ ] SeriesBookRow (dark mode only)
- [ ] ErrorToast/ErrorSheet (hardcoded severity colors)

---

## 9. Files Requiring Updates

### Critical (Breaks in Light Mode)
| File | Issue |
|------|-------|
| `SeriesCard.tsx` | Old gold accent, dark mode rgba |
| `SeriesProgressHeader.tsx` | Hardcoded dark colors |
| `SeriesBookRow.tsx` | Old gold accent, dark mode only |
| `MoodDiscoveryScreen.tsx` | No light mode colors |
| `MoodDiscoveryCard.tsx` | Hardcoded white text |
| `ErrorToast.tsx` | Hardcoded severity colors |
| `ErrorSheet.tsx` | Hardcoded severity colors |

### High Priority (Should Fix)
| File | Issue |
|------|-------|
| `playerConstants.ts` | Deprecated `colors` import |
| `AddToLibraryButton.tsx` | Deprecated `colors` import |
| `CoverPlayButton.tsx` | Multiple hardcoded rgba |
| `HomeDiscSection.tsx` | Dark mode rgba values |

---

## 10. Conclusion

The theme architecture is **excellent** - well-designed with comprehensive tokens. However, implementation has drifted with:
- 166 components using deprecated API
- 80+ hardcoded hex colors
- 100+ hardcoded rgba values
- Several components styled for dark mode only

**Estimated remediation effort:**
- P0 fixes: 2-3 hours
- Full migration: 1-2 days

The theme toggle works correctly, but users switching to light mode will encounter visual issues in the identified components.
