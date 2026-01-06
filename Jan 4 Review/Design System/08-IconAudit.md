# Icon Usage Audit
## AudiobookShelf Design System

**Date:** January 5, 2026
**Source:** `src/shared/components/Icon.tsx`

---

## Icon System Overview

### Library
**Lucide React Native** (`lucide-react-native`)
- Consistent stroke-based icons
- Full icon set available
- Easy to customize size, color, strokeWidth

### Icon Component

**File:** `src/shared/components/Icon.tsx`

```typescript
interface IconProps {
  name: keyof typeof LucideIcons;
  size?: IconSize | number;
  color?: string;
  strokeWidth?: number;
}
```

---

## Named Icon Sizes

### Size Tokens

| Name | Size | Scaled | Usage |
|------|------|--------|-------|
| `xs` | 12px | `scale(12)` | Tiny icons (badges, indicators) |
| `sm` | 16px | `scale(16)` | Small icons (inline text, secondary) |
| `md` | 20px | `scale(20)` | Default (buttons, list items) |
| `lg` | 24px | `scale(24)` | Large (primary actions, headers) |
| `xl` | 32px | `scale(32)` | Extra large (feature icons) |
| `xxl` | 48px | `scale(48)` | Huge (empty states, hero) |

### Icon Component Defaults

| Property | Default Value |
|----------|---------------|
| size | `'md'` (20px) |
| color | `colors.textPrimary` |
| strokeWidth | 2 |

---

## Icon Size Usage Analysis

### Components Using Named Sizes

| Component | Size Used | Correct Usage |
|-----------|-----------|---------------|
| Icon default | `'md'` | Yes |
| EmptyState | `scale(64)` | **Custom** |

### Components Using Raw Numbers

| Component | Raw Size | Should Be |
|-----------|----------|-----------|
| PersonCard | `scale(24)` | `'lg'` |
| BookCard icons | Various `scale()` | Named sizes |
| EmptyState | `scale(64)` | `'xxl'` or custom |

---

## Icon Inventory by Feature

### Navigation Icons

| Icon | Name | Usage | Size |
|------|------|-------|------|
| Home | `Home` | Tab bar | `lg` |
| Library | `BookOpen` | Tab bar | `lg` |
| Discover | `Compass` | Tab bar | `lg` |
| Profile | `User` | Tab bar | `lg` |
| Back | `ChevronLeft` | Headers | `lg` |
| Close | `X` | Modals | `lg` |

### Action Icons

| Icon | Name | Usage | Size |
|------|------|-------|------|
| Play | `Play` | Player controls | Various |
| Pause | `Pause` | Player controls | Various |
| Skip Forward | `SkipForward` | Player | `lg` |
| Skip Back | `SkipBack` | Player | `lg` |
| Download | `Download` | Download button | `md` |
| Heart | `Heart` | Favorites | `md` |
| Bookmark | `Bookmark` | Wishlist | `md` |
| Queue | `ListPlus` | Add to queue | `md` |
| Check | `Check` | Confirmations | `sm` |
| Plus | `Plus` | Add actions | `sm`-`md` |

### Status Icons

| Icon | Name | Usage | Size |
|------|------|-------|------|
| Cloud | `Cloud` | Streaming | `sm` |
| CloudOff | `CloudOff` | Offline unavailable | `sm` |
| Mic | `Mic` | Narrator indicator | `lg` |
| User | `User` | Author indicator | `lg` |
| Bell | `Bell` | Notifications | `md` |

### Settings Icons

| Icon | Name | Usage |
|------|------|-------|
| Settings | `Settings` | Settings screen |
| Moon | `Moon` | Dark mode |
| Volume2 | `Volume2` | Audio settings |
| Clock | `Clock` | Sleep timer |
| Bookmark | `Bookmark` | Bookmarks |

---

## Custom SVG Icons in Components

Some components define inline SVG icons instead of using the Icon component:

### BookCard Custom Icons

| Icon | Size | Notes |
|------|------|-------|
| DownloadIcon | 20px | Custom SVG |
| PlayIcon | 20px | Custom SVG |
| SmallPlusIcon | 14px | Custom SVG |
| CheckIcon | 14px | Custom SVG |
| CloudIcon | 14px | Custom SVG |
| CloudOffIcon | 14px | Custom SVG |
| BookmarkIcon | 14px | Custom SVG |
| PauseIcon | 12px | Custom SVG |

**Issue:** These should use the Icon component with Lucide icons.

### EmptyState Custom Icons

All icons are custom SVG implementations:
- BookIcon, SearchIcon, HeartIcon, DownloadIcon
- ListIcon, UserIcon, MicIcon, LibraryIcon
- CelebrateIcon, CollectionIcon

**Size:** `scale(64)` - consistent

**Issue:** Should use Icon component with `size="xxl"` or larger custom size.

---

## Icon Color Usage

### Theme-Aware Colors

| Usage | Color |
|-------|-------|
| Default | `colors.textPrimary` (white/black) |
| Secondary | `colors.textSecondary` (70% opacity) |
| Muted | `colors.textMuted` (30% opacity) |
| Accent | `colors.accent` (red) |

### Hardcoded Colors Found

| Component | Hardcoded | Should Be |
|-----------|-----------|-----------|
| BookCard icons | `'#fff'` | `colors.textPrimary` |
| ProgressRing | `'#FF9800'` (paused) | Token |
| EmptyState | `colors.textMuted` | OK |

---

## Icon Consistency Analysis

### Same Action, Same Icon?

| Action | Icon Used | Consistent |
|--------|-----------|------------|
| Favorite/Heart | Heart (Lucide) + custom HeartIcon | **Mixed** |
| Download | Download (Lucide) + custom | **Mixed** |
| Play | Play (Lucide) + custom PlayIcon | **Mixed** |
| Add to Queue | Plus, ListPlus | **Inconsistent** |
| Bookmark | Bookmark (Lucide) + custom | **Mixed** |

### Navigation Icons

| Action | Icon | Consistent |
|--------|------|------------|
| Back | ChevronLeft | Yes |
| Close | X | Yes |
| Forward | ChevronRight | Yes |
| Up | ChevronUp | Yes |

---

## Issues Identified

### High Priority

1. **Custom SVG icons in BookCard** - Should use Icon component
2. **Custom SVG icons in EmptyState** - Should use Icon component
3. **Hardcoded colors** - `'#fff'` should be theme colors

### Medium Priority

4. **Raw number sizes** - Should use named sizes
5. **Missing icon size token** - Need 64px for empty states
6. **Inconsistent heart icon** - Some custom, some Lucide

### Low Priority

7. **Icon component uses legacy colors** - Default color is `colors.textPrimary`
8. **Document icon name mapping** - Create icon usage guide

---

## Recommendations

### 1. Add Larger Icon Sizes

```typescript
const SIZE_MAP: Record<IconSize, number> = {
  xs: scale(12),
  sm: scale(16),
  md: scale(20),
  lg: scale(24),
  xl: scale(32),
  xxl: scale(48),
  // Add:
  xxxl: scale(64),  // Empty states
};
```

### 2. Replace Custom SVGs with Lucide

```typescript
// Before (BookCard)
<DownloadIcon size={20} color="#fff" />

// After
<Icon name="Download" size="md" color={colors.textPrimary} />
```

### 3. Update Icon Component to Use Theme

```typescript
export function Icon({
  name,
  size = 'md',
  color,  // Remove default, use theme
  strokeWidth = 2,
}: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.icon.primary;
  // ...
}
```

### 4. Create Icon Name Constants

```typescript
export const ICONS = {
  navigation: {
    back: 'ChevronLeft',
    forward: 'ChevronRight',
    close: 'X',
    menu: 'Menu',
  },
  actions: {
    play: 'Play',
    pause: 'Pause',
    download: 'Download',
    favorite: 'Heart',
    queue: 'ListPlus',
    bookmark: 'Bookmark',
  },
  status: {
    cloud: 'Cloud',
    offline: 'CloudOff',
    check: 'Check',
    error: 'AlertCircle',
  },
} as const;
```

### 5. Document Icon Usage

Create `docs/ICONS.md` with:
- Complete icon inventory
- When to use each icon
- Size guidelines by context
- Color guidelines

---

## Icon Size Guidelines

| Context | Recommended Size |
|---------|-----------------|
| Tab bar | `lg` (24px) |
| Header actions | `lg` (24px) |
| Button icons | `md` (20px) |
| List item icons | `md` (20px) |
| Inline with text | `sm` (16px) |
| Badges/indicators | `xs` (12px) |
| Empty states | `xxl` (48px) or larger |
| Feature heroes | `xxxl` (64px) |

---

*Audit complete. All design system audits are now available in the Design System folder.*
