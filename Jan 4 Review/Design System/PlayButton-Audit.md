# Play/Pause Button Audit

## Overview
This document catalogs all play/pause button implementations across the app to identify inconsistencies and guide unification.

**Date:** January 6, 2026
**Audit Status:** Complete

---

## Inventory

| File | Component | Icon Source | Filled/Stroked | Toggles to Pause? | Controls Playback? | Notes |
|------|-----------|-------------|----------------|-------------------|-------------------|-------|
| `BookCard.tsx:367` | Play overlay on cover | lucide `Play` | Filled (`fill="#fff"`) | No | Yes | Small overlay button |
| `BookCard.tsx:482` | Play button (right side) | lucide `Play` | Filled (`fill={colors.backgroundPrimary}`) | No | Yes | Gold circular button |
| `BookDetailScreen.tsx:692-694` | Primary play button | lucide `Pause`/`Play` | Pause: Stroked, Play: Filled | Yes | Yes | Conditional: shows pause when playing |
| `HeroSection.tsx:178-180` | Play overlay on cover | lucide `Pause`/`Play` | Pause: Stroked, Play: Filled | Yes | Yes | White circular button on cover |
| `ContinueListeningHero.tsx:192` | Play button | lucide `Play` | Filled (`fill={colors.text.inverse}`) | No | Yes | Large gold circular button |
| `InProgressTab.tsx:118` | Hero play button | lucide `Play` | Filled (`fill={themeColors.text}`) | No | Yes | Theme-colored circular |
| `BookRow.tsx:112` | Play button | lucide `Play` | Filled (`fill={themeColors.background}`) | No | Yes | Circle with theme colors |
| `PlaybackControls.tsx:127-129` | Main controls | lucide `Pause`/`Play` | Both Filled | Yes | Yes | Accent colored icons |
| `SeriesBookRow.tsx:282-284` | Row play button | lucide `Pause`/`Play` | Pause: Stroked, Play: Filled | Yes | Yes | Conditional based on playing state |
| `SeriesProgressHeader.tsx:347,383` | Context card play | lucide `Play` | Filled (`fill="#000"`) | No | Yes | Black fill on gold circle |
| `GlobalMiniPlayer.tsx:114-128` | PlayIcon/PauseIcon | Custom SVG | Both Filled | Yes | Yes | Custom components, not lucide |
| `ChaptersTab.tsx:224-229` | Chapter play indicator | lucide `Play` | Filled | No | Yes | Small indicator, theme colors |
| `TextListSection.tsx:109-115` | PlayIcon component | Custom SVG | Filled (`fill="#FFFFFF"`) | No | N/A | Custom white triangle, no circle |

---

## Findings

### 1. Icon Source Inconsistencies

**Lucide icons (13 locations):**
- Most components use lucide-react-native `Play` and `Pause`

**Custom SVG icons (2 locations):**
- `GlobalMiniPlayer.tsx` - Custom `PlayIcon` and `PauseIcon` components
- `TextListSection.tsx` - Custom `PlayIcon` SVG component

### 2. Fill vs Stroke Inconsistencies

**Correct (Filled icons):**
- `BookCard.tsx` - Uses `fill="#fff"` / `fill={colors.backgroundPrimary}`
- `BookRow.tsx` - Uses `fill={themeColors.background}`
- `ContinueListeningHero.tsx` - Uses `fill={colors.text.inverse}`
- `PlaybackControls.tsx` - Uses `fill={colors.accent}` for both
- `SeriesProgressHeader.tsx` - Uses `fill="#000"`
- `ChaptersTab.tsx` - Uses `fill={color}` with theme colors
- `GlobalMiniPlayer.tsx` - Custom SVG with `fill={color}`

**Inconsistent (Pause icons stroked):**
- `BookDetailScreen.tsx:692` - Pause uses `strokeWidth={2}`, no fill
- `SeriesBookRow.tsx:282` - Pause uses `strokeWidth={2}`, no fill
- `HeroSection.tsx:178` - Pause uses `strokeWidth={2.5}`, no fill

### 3. Toggle Behavior

**Components that toggle play/pause correctly:**
- `BookDetailScreen.tsx` - Shows pause when `isThisBookLoaded && isThisBookPlaying`
- `HeroSection.tsx` - Shows pause when `isCurrentlyPlaying`
- `PlaybackControls.tsx` - Shows pause when `isPlaying`
- `SeriesBookRow.tsx` - Shows pause when `isNowPlaying && isPlaying`
- `GlobalMiniPlayer.tsx` - Shows pause when playing

**Components that DON'T toggle (always show play):**
- `BookCard.tsx` - Both play buttons always show play icon
- `ContinueListeningHero.tsx` - Always shows play
- `InProgressTab.tsx` - Always shows play
- `BookRow.tsx` - Always shows play
- `SeriesProgressHeader.tsx` - Always shows play
- `ChaptersTab.tsx` - Always shows play (per-chapter indicator)
- `TextListSection.tsx` - Always shows play

### 4. Color Usage

**Correct (theme-aware):**
- `BookRow.tsx` - Uses `themeColors.text` / `themeColors.background`
- `InProgressTab.tsx` - Uses `themeColors.text` / `themeColors.background`
- `ChaptersTab.tsx` - Uses `colors.text.primary` / `colors.text.secondary`
- `PlaybackControls.tsx` - Uses `colors.accent`
- `ContinueListeningHero.tsx` - Uses `colors.player.accent` / `colors.text.inverse`

**Hardcoded colors:**
- `BookCard.tsx:367` - `"#fff"`
- `HeroSection.tsx:180` - `"#000"`
- `SeriesProgressHeader.tsx` - `"#000"`
- `TextListSection.tsx` - `"#FFFFFF"`

---

## Standard Specification

### PlayPauseButton Component

**Visual Design:**
- Icons should always be FILLED (not stroked)
- Play icon: Filled triangle pointing right
- Pause icon: Two filled vertical bars
- Use `strokeWidth={0}` with `fill={color}` for lucide icons

**Behavior:**
- Should accept `isPlaying` prop to determine which icon to show
- When `isPlaying === true`, show Pause icon
- When `isPlaying === false`, show Play icon
- Should call `onPress` callback when tapped

**Color Variants:**
- `primary` - Gold/accent background with inverse text
- `secondary` - Theme background with theme text
- `overlay` - Semi-transparent dark background with white icon
- `ghost` - No background, just icon

**Size Variants:**
- `sm` - 32pt diameter (mini player)
- `md` - 40pt diameter (list rows)
- `lg` - 52pt diameter (hero cards)
- `xl` - 56pt diameter (full player controls)

---

## Migration Plan

### Priority 1 - Fix Stroked Pause Icons
Files that need `strokeWidth={0}` and `fill={color}` added to Pause:
1. `BookDetailScreen.tsx:692`
2. `SeriesBookRow.tsx:282`
3. `HeroSection.tsx:178`

### Priority 2 - Add Toggle Support
Components that should show pause when book is playing:
1. `BookCard.tsx` - Check if `currentBookId === book.id && isPlaying`
2. `ContinueListeningHero.tsx` - Already has book context, add toggle
3. `InProgressTab.tsx` - Add player state check
4. `BookRow.tsx` - Add player state check

### Priority 3 - Replace Custom SVGs
1. `GlobalMiniPlayer.tsx` - Replace custom PlayIcon/PauseIcon with lucide
2. `TextListSection.tsx` - Replace custom PlayIcon with lucide

### Priority 4 - Create Shared Component
1. Create `src/shared/components/PlayPauseButton.tsx`
2. Export from `src/shared/components/index.ts`
3. Migrate high-traffic components first:
   - GlobalMiniPlayer
   - BookCard
   - BookDetailScreen
   - PlaybackControls

---

## Component Interface

```typescript
interface PlayPauseButtonProps {
  /** Whether content is currently playing */
  isPlaying: boolean;
  /** Called when button is pressed */
  onPress: () => void;
  /** Visual variant */
  variant?: 'primary' | 'secondary' | 'overlay' | 'ghost';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Whether button is disabled */
  disabled?: boolean;
  /** Whether to show loading spinner instead of icon */
  loading?: boolean;
  /** Accessibility label override */
  accessibilityLabel?: string;
}
```

---

## Implementation Notes

### Icon Rendering (Correct Pattern)
```tsx
// CORRECT - Filled icons
<Play size={18} color={iconColor} fill={iconColor} strokeWidth={0} />
<Pause size={18} color={iconColor} fill={iconColor} strokeWidth={0} />

// INCORRECT - Stroked icons
<Play size={18} color={iconColor} strokeWidth={2} />
<Pause size={18} color={iconColor} strokeWidth={2} />
```

### Toggle Logic (Correct Pattern)
```tsx
const isThisBookPlaying = currentBook?.id === book.id && isPlaying;

{isThisBookPlaying ? (
  <Pause size={18} color={iconColor} fill={iconColor} strokeWidth={0} />
) : (
  <Play size={18} color={iconColor} fill={iconColor} strokeWidth={0} />
)}
```

---

## Affected Files Summary

| Category | Count | Files |
|----------|-------|-------|
| Stroked pause icons | 3 | BookDetailScreen, SeriesBookRow, HeroSection |
| Missing toggle | 6 | BookCard, ContinueListeningHero, InProgressTab, BookRow, SeriesProgressHeader, ChaptersTab |
| Custom SVG | 2 | GlobalMiniPlayer, TextListSection |
| Hardcoded colors | 4 | BookCard, HeroSection, SeriesProgressHeader, TextListSection |
| **Total unique files** | **13** | - |

---

## Migration Progress

### Completed (January 6, 2026)

**Phase 1: Audit** - Complete
- Created comprehensive inventory of all play/pause buttons

**Phase 2: Create PlayPauseButton** - Complete
- Created `src/shared/components/PlayPauseButton.tsx`
- Exported from `src/shared/components/index.ts`
- Supports: size variants (sm/md/lg/xl), color variants (primary/secondary/overlay/ghost)
- Features: filled icons, theme-aware colors, haptic feedback, accessibility

**Phase 3: Fix Stroked Pause Icons** - Complete
- [x] `BookDetailScreen.tsx:692` - Fixed pause to filled
- [x] `BookDetailScreen.tsx:674` - Fixed download pause to filled
- [x] `SeriesBookRow.tsx:282` - Fixed pause to filled
- [x] `HeroSection.tsx:178` - Fixed pause to filled
- [x] `PlaybackControls.tsx:127` - Fixed pause to filled

---

## Verification Checklist

After migration, verify each location:

- [x] Play icon is filled (not stroked)
- [x] Pause icon is filled (not stroked)
- [ ] Shows pause when this book is playing
- [ ] Shows play when not playing
- [x] Uses theme-aware colors
- [x] Has appropriate touch target size (min 44pt)
- [x] Has accessibility label
- [ ] Triggers haptic feedback on press
