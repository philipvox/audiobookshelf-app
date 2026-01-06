# Unified Design System Specification
## AudiobookShelf Mobile App

**Date:** January 5, 2026
**Version:** 1.0
**Based on:** Audits 01-09

---

## 1. Design Foundations

### 1.1 Design Canvas

| Property | Value |
|----------|-------|
| Base width | 402pt |
| Base height | 874pt |
| Platform | React Native (iOS/Android) |
| Scaling | `scale()` function for responsive sizing |

### 1.2 Responsive Scaling

```typescript
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DESIGN_WIDTH = 402;
const DESIGN_HEIGHT = 874;

export const scale = (size: number): number =>
  Math.round((size / DESIGN_WIDTH) * SCREEN_WIDTH);

export const wp = (percentage: number): number =>
  Math.round((percentage / 100) * SCREEN_WIDTH);

export const hp = (percentage: number): number =>
  Math.round((percentage / 100) * SCREEN_HEIGHT);
```

**Usage Rules:**
- ALL pixel values must use `scale()` for responsiveness
- Exception: 1px borders (remain 1px for crispness)
- Exception: `StyleSheet.hairlineWidth` for thin lines

---

## 2. Token Scales

### 2.1 Spacing Scale

Based on 4pt grid with 8pt rhythm for major spacing.

| Token | Value | Scaled | Usage |
|-------|-------|--------|-------|
| `spacing.xxs` | 2 | `scale(2)` | Minimal gaps, fine adjustments |
| `spacing.xs` | 4 | `scale(4)` | Tight spacing, icon gaps |
| `spacing.sm` | 8 | `scale(8)` | Compact spacing, list separators |
| `spacing.md` | 12 | `scale(12)` | Default gap, card padding |
| `spacing.lg` | 16 | `scale(16)` | Section spacing, list padding |
| `spacing.xl` | 20 | `scale(20)` | Screen horizontal padding |
| `spacing.xxl` | 24 | `scale(24)` | Section gaps, screen vertical padding |
| `spacing['3xl']` | 32 | `scale(32)` | Large section gaps |
| `spacing['4xl']` | 40 | `scale(40)` | Hero spacing |
| `spacing['5xl']` | 48 | `scale(48)` | Major section dividers |

**Layout Constants:**

| Token | Value | Usage |
|-------|-------|-------|
| `layout.screenPaddingH` | 20 | Horizontal screen padding |
| `layout.screenPaddingV` | 24 | Vertical screen padding |
| `layout.sectionGap` | 24 | Between major sections |
| `layout.componentGap` | 16 | Between related components |
| `layout.itemGap` | 12 | Between list/grid items |
| `layout.maxContentWidth` | 600 | Tablet max width |

---

### 2.2 Border Radius Scale

| Token | Value | Scaled | Usage |
|-------|-------|--------|-------|
| `radius.xxs` | 2 | `scale(2)` | Subtle rounding |
| `radius.xs` | 4 | `scale(4)` | Inputs, small badges |
| `radius.sm` | 8 | `scale(8)` | **Book covers**, small cards |
| `radius.md` | 12 | `scale(12)` | **Standard cards**, buttons |
| `radius.lg` | 16 | `scale(16)` | **Large cards**, modals |
| `radius.xl` | 20 | `scale(20)` | Hero cards |
| `radius.xxl` | 24 | `scale(24)` | Bottom sheets |
| `radius.full` | 9999 | 9999 | Circular (avatars, pills) |

**Semantic Aliases:**

| Alias | Maps To | Usage |
|-------|---------|-------|
| `radius.cover` | `radius.sm` | All book/series covers |
| `radius.card` | `radius.lg` | All card containers |
| `radius.button` | `radius.md` | All buttons |
| `radius.avatar` | `radius.full` | Person avatars |
| `radius.chip` | `radius.full` | Tags, badges |

---

### 2.3 Typography Scale

#### Font Families

| Token | Value | Usage |
|-------|-------|-------|
| `fontFamily.primary` | System default | All UI text |
| `fontFamily.mono` | 'SpaceMono' | Timestamps, durations |

#### Font Sizes

| Token | Size | Scaled |
|-------|------|--------|
| `fontSize.xs` | 10 | `scale(10)` |
| `fontSize.sm` | 12 | `scale(12)` |
| `fontSize.base` | 14 | `scale(14)` |
| `fontSize.md` | 16 | `scale(16)` |
| `fontSize.lg` | 18 | `scale(18)` |
| `fontSize.xl` | 20 | `scale(20)` |
| `fontSize['2xl']` | 22 | `scale(22)` |
| `fontSize['3xl']` | 28 | `scale(28)` |
| `fontSize['4xl']` | 32 | `scale(32)` |
| `fontSize['5xl']` | 36 | `scale(36)` |

#### Font Weights

| Token | Value |
|-------|-------|
| `fontWeight.regular` | 400 |
| `fontWeight.medium` | 500 |
| `fontWeight.semibold` | 600 |
| `fontWeight.bold` | 700 |

#### Typography Presets

| Preset | Size | Weight | Line Height | Letter Spacing | Usage |
|--------|------|--------|-------------|----------------|-------|
| `displayLarge` | 28 | 700 | 34 | -0.5 | Hero titles |
| `displayMedium` | 22 | 700 | 28 | -0.5 | Screen titles |
| `displaySmall` | 18 | 600 | 24 | -0.3 | Section titles |
| `headlineLarge` | 17 | 600 | 22 | -0.3 | Navigation titles |
| `headlineMedium` | 15 | 600 | 20 | - | Card titles (large) |
| `headlineSmall` | 14 | 600 | 18 | - | **Card titles (standard)** |
| `bodyLarge` | 16 | 400 | 24 | - | Main content |
| `bodyMedium` | 14 | 400 | 20 | - | Secondary content |
| `bodySmall` | 12 | 400 | 16 | - | **Metadata, subtitles** |
| `labelLarge` | 14 | 500 | 20 | - | Button text |
| `labelMedium` | 12 | 500 | 16 | - | Tags, chips |
| `labelSmall` | 11 | 500 | 14 | - | Badges |
| `caption` | 10 | 400 | 14 | - | Timestamps |
| `timestamp` | 12 | 500 | 16 | - | Player time (mono) |

---

### 2.4 Elevation Scale

| Token | Shadow | Usage |
|-------|--------|-------|
| `elevation.none` | None | Flat elements |
| `elevation.small` | `0 2 4 rgba(0,0,0,0.1)` | Subtle cards |
| `elevation.medium` | `0 4 8 rgba(0,0,0,0.15)` | Standard cards, buttons |
| `elevation.large` | `0 8 16 rgba(0,0,0,0.2)` | Modals, overlays |
| `elevation.glow` | `0 0 20 accent @ 0.3` | Active/playing states |

---

### 2.5 Duration Scale (Animations)

| Token | Duration | Usage |
|-------|----------|-------|
| `duration.instant` | 0ms | Immediate feedback |
| `duration.fast` | 100ms | Press states, micro-interactions |
| `duration.normal` | 200ms | Standard transitions |
| `duration.slow` | 300ms | Page transitions, modals |
| `duration.slower` | 500ms | Complex animations |

---

### 2.6 Icon Sizes

| Token | Size | Scaled | Usage |
|-------|------|--------|-------|
| `iconSizes.xs` | 12 | `scale(12)` | Badges, indicators |
| `iconSizes.sm` | 16 | `scale(16)` | Inline icons, secondary |
| `iconSizes.md` | 20 | `scale(20)` | **Default**, buttons, list items |
| `iconSizes.lg` | 24 | `scale(24)` | Headers, primary actions |
| `iconSizes.xl` | 32 | `scale(32)` | Feature icons |
| `iconSizes.xxl` | 48 | `scale(48)` | Empty states |
| `iconSizes.xxxl` | 64 | `scale(64)` | Hero empty states |

---

## 3. Color System

### 3.1 Theme Structure

```typescript
interface ThemeColors {
  // Backgrounds
  background: {
    primary: string;    // Main screen bg
    secondary: string;  // Elevated bg
    tertiary: string;   // Input bg
  };

  // Surfaces
  surface: {
    card: string;       // Card backgrounds
    elevated: string;   // Floating elements
    overlay: string;    // Modal overlays
  };

  // Text
  text: {
    primary: string;    // Main text
    secondary: string;  // 70% opacity
    tertiary: string;   // 50% opacity
    muted: string;      // 30% opacity
    disabled: string;   // 40% opacity
    inverse: string;    // Opposite theme
    accent: string;     // Brand color
  };

  // Icons
  icon: {
    primary: string;
    secondary: string;
    muted: string;
    accent: string;
  };

  // Semantic
  accent: string;       // Brand gold #F3B60C
  success: string;      // Green
  warning: string;      // Orange
  error: string;        // Red

  // Interactive
  interactive: {
    primary: string;    // Primary buttons
    pressed: string;    // Press state
    disabled: string;   // Disabled state
  };
}
```

### 3.2 Dark Theme Values

| Token | Value |
|-------|-------|
| `background.primary` | `#000000` |
| `background.secondary` | `#1A1A1A` |
| `surface.card` | `rgba(255,255,255,0.06)` |
| `text.primary` | `#FFFFFF` |
| `text.secondary` | `rgba(255,255,255,0.70)` |
| `text.tertiary` | `rgba(255,255,255,0.50)` |
| `accent` | `#F3B60C` (Gold) |

### 3.3 Light Theme Values

| Token | Value |
|-------|-------|
| `background.primary` | `#FFFFFF` |
| `background.secondary` | `#F5F5F5` |
| `surface.card` | `rgba(0,0,0,0.04)` |
| `text.primary` | `#000000` |
| `text.secondary` | `rgba(0,0,0,0.70)` |
| `text.tertiary` | `rgba(0,0,0,0.50)` |
| `accent` | `#F3B60C` (Gold) |

### 3.4 Color Usage Pattern

```typescript
// CORRECT: Theme-aware colors
const { themeColors } = useThemeColors();
<Text style={{ color: themeColors.text }}>Title</Text>

// INCORRECT: Legacy colors (deprecated)
<Text style={{ color: colors.textPrimary }}>Title</Text>

// INCORRECT: Hardcoded colors
<Text style={{ color: '#FFFFFF' }}>Title</Text>
```

---

## 4. Component Specifications

### 4.1 BookCard (Row)

The primary book display component for lists.

| Property | Value | Token |
|----------|-------|-------|
| **Container** | | |
| Min height | 80px | `cardTokens.rowHeight.standard` |
| Horizontal padding | 16px | `spacing.lg` |
| Vertical padding | 10px | `spacing.sm + 2` |
| Background | Theme surface | `themeColors.surface.card` |
| Border radius | 12px | `radius.md` |
| **Cover** | | |
| Size | 64x64 | `cardTokens.cover.listRow` |
| Border radius | 8px | `radius.sm` |
| Shadow | Small | `elevation.small` |
| **Title** | | |
| Typography | headlineSmall | 14px, 600 |
| Color | text.primary | Theme |
| Max lines | 2 | |
| **Subtitle** | | |
| Typography | bodySmall | 12px, 400 |
| Color | text.secondary | Theme |
| Max lines | 1 | |
| **Progress Bar** | | |
| Height | 4px | `scale(4)` |
| Track color | 15% white | Theme |
| Fill color | accent | `colors.accent` |
| Border radius | 2px | `radius.xxs` |

### 4.2 SeriesCard (Fanned)

Displays series with stacked cover fan effect.

| Property | Value | Token |
|----------|-------|-------|
| **Container** | | |
| Width | 48% screen | Responsive |
| Padding | 12px | `spacing.md` |
| Background | Theme surface | `themeColors.surface.card` |
| Border radius | 16px | `radius.lg` |
| **Cover Fan** | | |
| Base cover size | 60px | `cardTokens.stackedCovers.size` |
| Max visible | 5 | `cardTokens.stackedCovers.maxCount` |
| Horizontal offset | 18px | `cardTokens.stackedCovers.offset` |
| Rotation | 8deg | Visual constant |
| Cover radius | 8px | `radius.sm` |
| **Title** | | |
| Typography | headlineSmall | 14px, 600 |
| Color | text.primary | Theme |
| Max lines | 2 | |
| **Subtitle** | | |
| Typography | labelSmall | 11px, 500 |
| Color | text.secondary | Theme |
| **Heart Button** | | |
| Position | top-right | 8px inset |
| Size | 24px | `iconSizes.lg` |

### 4.3 EntityCard (Author/Narrator)

Unified card for person entities.

| Property | Value | Token |
|----------|-------|-------|
| **Container** | | |
| Width | 48% screen | Responsive grid |
| Padding | 12px | `spacing.md` |
| Background | Theme surface | `themeColors.surface.card` |
| Border radius | 16px | `radius.lg` |
| Alignment | Center | |
| **Avatar** | | |
| Size | 80px | `cardTokens.avatar.grid` |
| Shape | Circle | `radius.full` |
| Background | accent @ 20% | Theme |
| Border | 2px white @ 10% | |
| **Initials** | | |
| Typography | 36px, 600 | `fontSize['5xl']` |
| Color | white | |
| **Name** | | |
| Typography | headlineMedium | 15px, 600 |
| Color | text.primary | Theme |
| Max lines | 2 | |
| Alignment | Center | |
| **Book Count** | | |
| Typography | bodySmall | 12px, 400 |
| Color | text.secondary | Theme |

### 4.4 GenreCard

Card for genre display.

| Property | Value | Token |
|----------|-------|-------|
| **Container** | | |
| Width | 48% screen | Responsive grid |
| Aspect ratio | 1:1 or 3:4 | |
| Border radius | 12px | `radius.md` |
| **Background** | | |
| Type | Cover grid or gradient | |
| Overlay | 60% black gradient | Bottom fade |
| **Label** | | |
| Typography | headlineMedium | 15px, 600 |
| Color | white | Always white on image |
| Position | Bottom left | 12px padding |

---

## 5. List Patterns

### 5.1 Horizontal Carousel

```typescript
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={{
    paddingHorizontal: layout.screenPaddingH,  // 20px
    gap: spacing.md,  // 12px
  }}
>
  {items.map(item => <Card key={item.id} />)}
</ScrollView>
```

| Property | Value |
|----------|-------|
| Side padding | 20px (`layout.screenPaddingH`) |
| Item gap | 12px (`spacing.md`) |
| Scroll indicator | Hidden |
| Snap | None (free scroll) |

### 5.2 Vertical List

```typescript
<FlatList
  data={items}
  renderItem={({ item }) => <BookCard book={item} />}
  contentContainerStyle={{
    paddingHorizontal: spacing.lg,
    paddingBottom: navBarHeight + spacing.lg,
  }}
  ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
/>
```

| Property | Value |
|----------|-------|
| Side padding | 16px (`spacing.lg`) |
| Item separator | 8px (`spacing.sm`) |
| Bottom padding | navBarHeight + 16px |

### 5.3 Section List

```typescript
<SectionList
  sections={groupedSections}
  renderItem={({ item }) => <Row item={item} />}
  renderSectionHeader={({ section: { title } }) => (
    <SectionHeader title={title} />
  )}
  stickySectionHeadersEnabled={true}
/>
```

### 5.4 Section Header

| Property | Value | Token |
|----------|-------|-------|
| Font size | 13px | `scale(13)` |
| Font weight | 600 | `fontWeight.semibold` |
| Text transform | UPPERCASE | |
| Letter spacing | 0.5 | |
| Color | text.secondary | Theme |
| Padding H | 16px | `spacing.lg` |
| Padding V | 8px | `spacing.sm` |
| Background | background.primary | Theme (sticky) |

---

## 6. Page Structure

### 6.1 Screen Container

```typescript
interface ScreenContainerProps {
  hasHeader?: boolean;      // Default: true
  headerHeight?: number;    // Default: 56
  useSafeArea?: boolean;    // Default: true
}
```

### 6.2 Standard Header

| Property | Value |
|----------|-------|
| Height | 56px |
| Back button | ChevronLeft, 24px, left |
| Title | Center, 20px, 600 |
| Right actions | 1-3 icons, 24px |
| Background | Transparent or blur |

### 6.3 Safe Area Handling

```typescript
const insets = useSafeAreaInsets();
const navBarHeight = TAB_BAR_HEIGHT + Math.max(insets.bottom, spacing.md);

// Content padding
paddingTop: insets.top + headerHeight;
paddingBottom: navBarHeight + spacing.lg;
```

### 6.4 Tab Bar

| Property | Value |
|----------|-------|
| Height | 52px |
| Background | Blur with 80% opacity |
| Icons | 24px (`iconSizes.lg`) |
| Labels | 10px, hidden on small screens |
| Active color | accent |
| Inactive color | text.secondary |

---

## 7. Interactive States

### 7.1 Press States

| Element | activeOpacity | Duration |
|---------|---------------|----------|
| Cards | 0.7 | 100ms |
| Buttons | 0.8 | 100ms |
| Icons | 0.7 | 100ms |
| List rows | 0.7 | 100ms |

### 7.2 Loading States

| State | Component | Notes |
|-------|-----------|-------|
| Initial load | `<LoadingSpinner />` | Centered, accent color |
| List loading | `<ActivityIndicator />` | At list bottom |
| Pull refresh | `<RefreshControl />` | Platform native |
| Skeleton | `<BookCardSkeleton />` | Shimmer effect |

### 7.3 Empty States

| Property | Value |
|----------|-------|
| Icon | Lucide via Icon component |
| Icon size | 64px (`iconSizes.xxxl`) |
| Icon color | text.muted (30% opacity) |
| Title | displaySmall (18px, 600) |
| Message | bodyMedium (14px, 400) |
| Action button | Optional, accent color |
| Spacing | 16px between elements |

### 7.4 Heart Button Animation

```typescript
// Bounce animation for favorites
scale: 1 → 1.3 → 1
duration: 300ms
easing: spring
```

---

## 8. Icon Usage

### 8.1 Icon Library

**Lucide React Native** - Use exclusively via `Icon` component.

```typescript
import { Icon } from '@/shared/components';

<Icon
  name="Heart"
  size="md"
  color={themeColors.icon.primary}
/>
```

### 8.2 Standard Icons

| Action | Icon Name | Size |
|--------|-----------|------|
| Back | `ChevronLeft` | lg |
| Close | `X` | lg |
| Play | `Play` | varies |
| Pause | `Pause` | varies |
| Download | `Download` | md |
| Favorite | `Heart` | md |
| Bookmark | `Bookmark` | md |
| Queue | `ListPlus` | md |
| Check | `Check` | sm |
| Menu | `MoreVertical` | lg |

### 8.3 No Custom SVGs

All icons should use the Icon component. No inline SVG components.

---

## 9. Do's and Don'ts

### 9.1 Spacing

| Do | Don't |
|----|-------|
| Use `spacing.md` for gaps | Use magic numbers like `12` |
| Use `scale(16)` for custom values | Use unscaled values like `16` |
| Use layout tokens for screens | Hardcode `20` for padding |

### 9.2 Typography

| Do | Don't |
|----|-------|
| Use `typography.headlineSmall` | Use `fontSize: 14` |
| Spread typography presets | Mix size and weight manually |
| Use theme text colors | Use `'#FFFFFF'` |

### 9.3 Colors

| Do | Don't |
|----|-------|
| Use `themeColors.text` | Use `colors.textPrimary` (legacy) |
| Use `useThemeColors()` hook | Hardcode rgba values |
| Check both light and dark modes | Only test dark mode |

### 9.4 Components

| Do | Don't |
|----|-------|
| Use shared components | Duplicate components per feature |
| Use `Icon` component | Create inline SVGs |
| Use `EmptyState` component | Build custom empty states |

### 9.5 Responsiveness

| Do | Don't |
|----|-------|
| Use `scale()` for all sizes | Use fixed pixel values |
| Test on different screen sizes | Only test on one device |
| Use `minHeight` for inputs | Use fixed `height` |

---

## 10. Component Checklist

When creating or updating components, verify:

- [ ] Uses `scale()` for all pixel values
- [ ] Uses typography presets (not manual fontSize/fontWeight)
- [ ] Uses spacing tokens (not magic numbers)
- [ ] Uses radius tokens (not hardcoded values)
- [ ] Uses `useThemeColors()` for colors
- [ ] Has `activeOpacity={0.7}` for TouchableOpacity
- [ ] Touch targets are minimum 44x44 (with hitSlop if needed)
- [ ] Tested in both dark and light modes
- [ ] Uses Icon component (not custom SVGs)
- [ ] Has proper TypeScript types

---

*This specification is the source of truth for the AudiobookShelf design system. All components should conform to these standards.*
