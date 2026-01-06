# Page Structure Audit
## AudiobookShelf Design System

**Date:** January 5, 2026

---

## Screen Categories

| Category | Screens | Count |
|----------|---------|-------|
| Tab Screens | Home, Library, Browse, Profile | 4 |
| Detail Screens | Book, Series, Author, Narrator, Genre | 5 |
| List Screens | SeriesList, AuthorsList, NarratorsList, GenresList | 4 |
| Modal Screens | Settings, MoodDiscovery, ReadingHistory | 3+ |
| Player | CDPlayerScreen | 1 |

---

## Header Patterns

### Tab Screen Headers

| Screen | Has Header Bar | Height | Notes |
|--------|----------------|--------|-------|
| HomeScreen | No | 0 | Hero scrolls with content |
| MyLibraryScreen | Hybrid | 56px | Search in header area |
| BrowseScreen | No | 0 | Hero-first design |
| ProfileScreen | Custom | ~120px | User info as header |

### Push Screen Headers (Standard)

| Property | Value |
|----------|-------|
| Height | 56px |
| Back button | ChevronLeft, 24px |
| Title | 20px, weight 600, centered |
| Right actions | 1-3 buttons, 24px icons |
| Background | Transparent |

### Modal Screen Headers

| Property | Value |
|----------|-------|
| Close button | X icon, top-right |
| Title | Left-aligned or centered |
| Swipe dismiss | iOS enabled |

---

## Detail Screen Pattern

### Universal Structure

```
┌────────────────────────────────────────┐
│ [←] Title                    [Actions] │  ← Header 56px
├────────────────────────────────────────┤
│                                        │
│      [Hero Image / Stacked Covers]     │  ← Hero ~280px
│                                        │
├────────────────────────────────────────┤
│ Entity Name                            │
│ Subtitle / Metadata                    │  ← Metadata section
│ [Progress Badges]                      │
├────────────────────────────────────────┤
│ [Genre Tags / Bio / Related]           │  ← Entity-specific
├────────────────────────────────────────┤
│ All Books (N)                          │  ← List header
│ ┌────────────────────────────────────┐ │
│ │ [Book rows via FlatList]           │ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

### Detail Screen Comparison

| Screen | Hero Type | Actions | Tabs |
|--------|-----------|---------|------|
| BookDetail | Large cover | Heart, Menu | Yes (Overview, Chapters) |
| SeriesDetail | Stacked covers | Bell, Heart | No |
| AuthorDetail | Avatar + Initials | Bell | No |
| NarratorDetail | Avatar + Initials | Bell | No |
| GenreDetail | Cover grid | Filter | No |

---

## List Screen Pattern

### Universal Structure

```
┌────────────────────────────────────────┐
│ [←] Screen Name                   [⋮]  │  ← Header
├────────────────────────────────────────┤
│ [🔍] Search...                    [✕]  │  ← Search bar
├────────────────────────────────────────┤
│ [Your Authors] (horizontal scroll)     │  ← Personalized
├────────────────────────────────────────┤
│ A                                      │  ← Section header
│ ├── Item 1                             │
│ ├── Item 2                             │
├────────────────────────────────────────┤
│ B                                      │
│ └── Item 3                             │
│                        [A B C D ...]   │  ← Alphabet scrubber
└────────────────────────────────────────┘
```

### List Screen Features

| Feature | Authors | Narrators | Series | Genres |
|---------|---------|-----------|--------|--------|
| Search | Yes | Yes | Yes | Yes |
| Sort options | Name, Count | Name, Count | Name, Count | Grouped/Flat |
| Alphabet scrubber | Yes | Yes | No | No |
| Personalized section | Yes | Yes | No | No |
| Section headers | A-Z | A-Z | None | Categories |

---

## Page Layout Constants

### Content Padding

| Context | Value | Token |
|---------|-------|-------|
| Screen horizontal | 20px | `layout.screenPaddingH` |
| Screen vertical | 24px | `layout.screenPaddingV` |
| List horizontal | 16px | `spacing.lg` |
| Card internal | 12px | `spacing.md` |

### Section Spacing

| Context | Value | Token |
|---------|-------|-------|
| Between sections | 24px | `layout.sectionGap` |
| Component gap | 16px | `layout.componentGap` |
| Item gap | 12px | `layout.itemGap` |

### Bottom Padding

```typescript
// All scrollable content
paddingBottom: navBarHeight + spacing.lg

// navBarHeight calculation
const TAB_BAR_HEIGHT = 52;
const navBarHeight = TAB_BAR_HEIGHT + Math.max(safeAreaBottom, spacing.md);
```

---

## Safe Area Handling

### Pattern

```typescript
const insets = useSafeAreaInsets();

// Header
<View style={{ paddingTop: insets.top }}>
  <Header />
</View>

// Content
<ScrollView
  contentContainerStyle={{
    paddingBottom: insets.bottom + TAB_BAR_HEIGHT + spacing.lg,
  }}
/>
```

### Tab Bar Height Hook

```typescript
export function useNavigationBarHeight(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + Math.max(insets.bottom, spacing.md);
}
```

---

## Screen Type Matrix

| Screen | Header | Hero | Search | Tabs | Scrubber |
|--------|--------|------|--------|------|----------|
| Home | No | Yes | No | No | No |
| Library | Hybrid | No | Yes | Yes | No |
| Browse | No | Yes | No | No | No |
| Profile | Custom | No | No | No | No |
| BookDetail | 56px | Yes | No | Yes | No |
| SeriesDetail | 56px | Yes | No | No | No |
| AuthorDetail | 56px | Yes | No | No | No |
| AuthorsList | 56px | No | Yes | No | Yes |
| SeriesList | 56px | No | Yes | No | No |
| GenresList | 56px | No | Yes | No | No |
| Downloads | 56px | No | No | No | No |
| Search | Custom | No | Yes | No | No |
| CDPlayer | None | Yes | No | No | No |

---

## Responsive Considerations

### Max Content Width

```typescript
layout.maxContentWidth = 600;  // For tablets
```

### Scale Function

```typescript
// All dimensions should use scale() for responsiveness
scale(value) = (value / DESIGN_WIDTH) * screenWidth
// DESIGN_WIDTH = 402
```

---

## Issues Identified

### Inconsistent Header Heights

| Screen | Height | Expected |
|--------|--------|----------|
| Most push screens | 56px | 56px |
| Search | Custom | Should be 56px |
| Settings modals | Variable | Should standardize |

### Missing Patterns

1. No shared `<ScreenContainer>` component
2. No shared `<HeaderBar>` component
3. Inconsistent safe area handling

---

## Recommendations

### 1. Create Screen Container

```typescript
export function ScreenContainer({
  children,
  hasHeader = true,
  headerHeight = 56,
  contentPadding = true,
}) {
  const insets = useSafeAreaInsets();
  const navBarHeight = useNavigationBarHeight();

  return (
    <View style={{ flex: 1, paddingTop: hasHeader ? 0 : insets.top }}>
      {children}
      {/* Auto-add bottom padding */}
    </View>
  );
}
```

### 2. Create Shared Header

```typescript
export function HeaderBar({
  title,
  onBack,
  rightActions,
}) {
  return (
    <View style={{ height: 56, flexDirection: 'row' }}>
      <BackButton onPress={onBack} />
      <Text style={styles.title}>{title}</Text>
      <View style={styles.actions}>{rightActions}</View>
    </View>
  );
}
```

### 3. Document Layout Tokens

Create visual reference for spacing:
- Screen padding guide
- Section spacing diagram
- Touch target reference

---

*Audit complete. See 04-Typography.md for typography analysis.*
