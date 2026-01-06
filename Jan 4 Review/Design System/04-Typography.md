# Typography Audit
## AudiobookShelf Design System

**Date:** January 5, 2026
**Source:** `src/shared/theme/typography.ts`

---

## Defined Typography Tokens

### Display Styles (Large Titles)

| Token | Size | Weight | Line Height | Letter Spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| `displayLarge` | 28px | 700 | 34px | -0.5 | Hero titles |
| `displayMedium` | 22px | 700 | 28px | -0.5 | Screen titles |
| `displaySmall` | 18px | 600 | 24px | -0.3 | Section titles |

### Headline Styles (Section Headers)

| Token | Size | Weight | Line Height | Letter Spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| `headlineLarge` | 17px | 600 | 22px | -0.3 | Navigation titles |
| `headlineMedium` | 15px | 600 | 20px | - | Card titles |
| `headlineSmall` | 14px | 600 | 18px | - | List item titles |

### Body Styles (Content)

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `bodyLarge` | 16px | 400 | 24px | Main content |
| `bodyMedium` | 14px | 400 | 20px | Secondary content |
| `bodySmall` | 12px | 400 | 16px | Metadata |

### Label Styles (Interactive)

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `labelLarge` | 14px | 500 | 20px | Button text |
| `labelMedium` | 12px | 500 | 16px | Tags, chips |
| `labelSmall` | 11px | 500 | 14px | Badges |

### Special Styles

| Token | Size | Weight | Line Height | Font | Usage |
|-------|------|--------|-------------|------|-------|
| `caption` | 10px | 400 | 14px | System | Timestamps |
| `timestamp` | 12px | 500 | 16px | SpaceMono | Player time |

---

## Font Primitives

### fontSize Scale

| Token | Value |
|-------|-------|
| `fontSize.xs` | `scale(10)` |
| `fontSize.sm` | `scale(12)` |
| `fontSize.base` | `scale(14)` |
| `fontSize.md` | `scale(16)` |
| `fontSize.lg` | `scale(18)` |
| `fontSize.xl` | `scale(20)` |
| `fontSize['2xl']` | `scale(22)` |
| `fontSize['3xl']` | `scale(28)` |
| `fontSize['4xl']` | `scale(32)` |
| `fontSize['5xl']` | `scale(36)` |

### fontWeight Scale

| Token | Value |
|-------|-------|
| `fontWeight.regular` | 400 |
| `fontWeight.medium` | 500 |
| `fontWeight.semibold` | 600 |
| `fontWeight.bold` | 700 |

### lineHeight Scale

| Token | Value |
|-------|-------|
| `lineHeight.tight` | 1.2 |
| `lineHeight.normal` | 1.5 |
| `lineHeight.relaxed` | 1.6 |

---

## Component Usage Analysis

### Components Using Typography Tokens

| Component | Uses Tokens | Status |
|-----------|-------------|--------|
| BookCard | `typography.headlineSmall`, `typography.bodySmall`, `typography.labelSmall` | Good |
| EmptyState | `typography.displaySmall`, `typography.bodyMedium`, `typography.labelLarge` | Good |
| Button | `typography.labelLarge` | Good |

### Components with Custom Styles

| Component | Custom Style | Should Be |
|-----------|--------------|-----------|
| SeriesCard (home) | `scale(13)`, weight 600 | `typography.headlineSmall` |
| FannedSeriesCard | `scale(14)`, weight 600 | `typography.headlineMedium` |
| AuthorCard | 15px, 13px hardcoded | `typography.*` |
| PersonCard | `scale(13)`, `scale(11)` | `typography.*` |
| LoadingSpinner | 15px hardcoded | `typography.bodyMedium` |

---

## Usage by Context

### Screen Titles

| Expected | Used | Consistent |
|----------|------|------------|
| `displayMedium` (22px) | 22-32px | **No** |

**Issues:**
- CDPlayerScreen uses `scale(32)` - too large
- Some use hardcoded 22px without scale

### Section Headers

| Expected | Used | Consistent |
|----------|------|------------|
| `headlineLarge` (17px) | 13-18px | **No** |

**Issues:**
- Range too wide (5px variance)
- Some uppercase with letter-spacing, some not

### Card Titles

| Expected | Used | Consistent |
|----------|------|------------|
| `headlineSmall` (14px) | 13-15px | **Mostly** |

### Metadata/Captions

| Expected | Used | Consistent |
|----------|------|------------|
| `bodySmall` (12px) or `caption` (10px) | 10-13px | **Mostly** |

---

## Hardcoded Values Found

### Critical (Not Scaled)

| File | Value | Should Be |
|------|-------|-----------|
| AuthorCard | `fontSize: 15` | `scale(15)` or token |
| AuthorCard | `fontSize: 13` | `scale(13)` or token |
| AuthorCard | `fontSize: 36` (initials) | `scale(36)` |
| LoadingSpinner | `fontSize: 15` | `typography.bodyMedium` |

### Using scale() but Not Tokens

| File | Value | Could Be |
|------|-------|----------|
| SeriesCard | `scale(13)` | `typography.headlineSmall` |
| SeriesCard | `scale(11)` | `typography.labelSmall` |
| PersonCard | `scale(13)` | `typography.headlineSmall` |
| FannedSeriesCard | `scale(14)` | `typography.headlineMedium` |

---

## Color with Typography

### Text Color Tiers

| Tier | Token | Usage |
|------|-------|-------|
| Primary | `colors.text.primary` | Main text, titles |
| Secondary | `colors.text.secondary` | Subtitles, descriptions |
| Tertiary | `colors.text.tertiary` | Hints, metadata |
| Disabled | `colors.text.disabled` | Disabled text |
| Accent | `colors.text.accent` | Highlighted text |

### Color Application Pattern

```typescript
// Good - color in JSX
<Text style={[styles.title, { color: themeColors.text }]}>

// Bad - color in StyleSheet (not theme-aware)
title: {
  color: colors.textPrimary,  // Legacy, dark mode only
}
```

---

## Recommendations

### 1. Create Typography Component

```typescript
interface TextProps {
  variant?: keyof typeof typography;
  color?: 'primary' | 'secondary' | 'tertiary' | 'accent';
  children: React.ReactNode;
}

export function Text({ variant = 'bodyMedium', color = 'primary', children }: TextProps) {
  const { colors } = useTheme();
  return (
    <RNText style={[typography[variant], { color: colors.text[color] }]}>
      {children}
    </RNText>
  );
}
```

### 2. Fix Hardcoded Sizes

| Change From | Change To |
|-------------|-----------|
| `fontSize: 15` | `...typography.headlineMedium` |
| `fontSize: 13` | `...typography.headlineSmall` or `scale(13)` |
| `scale(36)` | Add `fontSize['4xl']` token |

### 3. Standardize Screen Titles

All screen titles should use:
```typescript
title: {
  ...typography.displayMedium,  // 22px, 700
}
```

### 4. Document Typography Usage

| Context | Token |
|---------|-------|
| Screen title | `displayMedium` |
| Modal title | `displaySmall` |
| Section header | `headlineLarge` |
| Card title | `headlineSmall` |
| Card subtitle | `bodySmall` |
| Button | `labelLarge` |
| Tab label | `labelMedium` |
| Badge | `labelSmall` |
| Timestamp | `timestamp` |
| Hint text | `caption` |

---

## Typography Scale Visual

```
displayLarge    28px  ████████████████████████████
displayMedium   22px  ██████████████████████
displaySmall    18px  ██████████████████
headlineLarge   17px  █████████████████
headlineMedium  15px  ███████████████
headlineSmall   14px  ██████████████
labelLarge      14px  ██████████████
bodyLarge       16px  ████████████████
bodyMedium      14px  ██████████████
bodySmall       12px  ████████████
labelMedium     12px  ████████████
labelSmall      11px  ███████████
caption         10px  ██████████
```

---

*Audit complete. See 05-SpacingTokens.md for spacing analysis.*
