# List & Row Patterns Audit
## AudiobookShelf Design System

**Date:** January 5, 2026

---

## List Types Found

### Horizontal Scroll Lists (Carousels)

| Location | Usage | Item Type |
|----------|-------|-----------|
| HomeScreen | Continue Listening | Hero card |
| HomeScreen | Recently Added | BookCard |
| HomeScreen | Series in Progress | SeriesCard |
| BrowseScreen | Featured, Popular | BookCard |
| Detail screens | Related content | PersonCard, BookCard |

### Vertical FlatLists

| Location | Usage | Item Type |
|----------|-------|-----------|
| MyLibraryScreen | All books | BookCard |
| DownloadsScreen | Downloaded books | BookCard |
| SearchScreen | Search results | BookCard |
| AuthorsListScreen | Authors | AuthorCard |
| NarratorsListScreen | Narrators | PersonCard row |
| SeriesListScreen | Series | SeriesCard grid |
| GenresListScreen | Genres | GenreCard |

### SectionLists

| Location | Usage |
|----------|-------|
| AuthorsListScreen | Alphabetical sections |
| NarratorsListScreen | Alphabetical sections |
| QueueScreen | Now Playing + Queue sections |

---

## Horizontal Scroll Patterns

### Standard Carousel

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
| Horizontal padding | 20px (`layout.screenPaddingH`) |
| Item gap | 12px (`spacing.md`) |
| Scroll indicator | Hidden |
| Snap behavior | None (free scroll) |

### FlatList Horizontal

```typescript
<FlatList
  horizontal
  data={items}
  renderItem={({ item }) => <Card item={item} />}
  ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
  contentContainerStyle={{ paddingHorizontal: layout.screenPaddingH }}
  showsHorizontalScrollIndicator={false}
/>
```

---

## Vertical List Patterns

### Standard FlatList

```typescript
<FlatList
  data={items}
  renderItem={({ item }) => <BookCard book={item} />}
  keyExtractor={(item) => item.id}
  contentContainerStyle={{
    paddingHorizontal: spacing.lg,  // 16px
    paddingBottom: navBarHeight + spacing.lg,
  }}
  ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
/>
```

| Property | Value |
|----------|-------|
| Horizontal padding | 16px (`spacing.lg`) |
| Item separator | 8px (`spacing.sm`) |
| Bottom padding | navBarHeight + 16px |
| Scroll indicator | Usually hidden |

### SectionList with Alphabet Scrubber

```typescript
<SectionList
  sections={groupedSections}
  renderItem={({ item }) => <Row item={item} />}
  renderSectionHeader={({ section: { title } }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  )}
  stickySectionHeadersEnabled={true}
  getItemLayout={(data, index) => ({
    length: ROW_HEIGHT,
    offset: ROW_HEIGHT * index,
    index,
  })}
/>
```

---

## Row Patterns

### BookCard Row

**File:** `src/shared/components/BookCard.tsx`

| Property | Value |
|----------|-------|
| Height | ~84px (64px cover + 20px padding) |
| Horizontal padding | `scale(16)` |
| Vertical padding | `scale(10)` |
| Cover size | `scale(64)` x `scale(64)` |
| Info margin left | `scale(14)` |
| Title | `typography.headlineSmall` |
| Subtitle | `typography.bodySmall` |

**Layout:**
```
┌──────────────────────────────────────────┐
│ [Cover] Title                   [Action] │
│ [64x64] Author · Duration                │
│         [Progress Bar] Time left         │
└──────────────────────────────────────────┘
```

### Settings Row Pattern

| Property | Value |
|----------|-------|
| Height | 56-60px |
| Horizontal padding | 16px |
| Vertical padding | 12px |
| Icon size | 24px |
| Icon margin right | 12px |
| Chevron | 6-8px |
| Divider | 1px line or gap |

**Layout:**
```
┌──────────────────────────────────────────┐
│ [Icon] Label                    [Value] >│
│        Description                       │
└──────────────────────────────────────────┘
```

### Author/Narrator Row Pattern

| Property | Value |
|----------|-------|
| Height | 72px (fixed for getItemLayout) |
| Avatar size | 48px circle |
| Avatar margin right | 12px |
| Name | 15px, weight 600 |
| Book count | 13px, secondary color |

**Layout:**
```
┌──────────────────────────────────────────┐
│ [Avatar] Author Name                    >│
│  (48px)  12 books                        │
└──────────────────────────────────────────┘
```

### Chapter Row Pattern

| Property | Value |
|----------|-------|
| Height | Variable (text wrap) |
| Horizontal padding | 16px |
| Vertical padding | 12px |
| Play icon | 20px |
| Duration | 12px, right aligned |

**Layout:**
```
┌──────────────────────────────────────────┐
│ [▶] Chapter Title            12:34      │
└──────────────────────────────────────────┘
```

---

## Section Headers

### Standard Section Header

```typescript
sectionHeader: {
  fontSize: scale(13),
  fontWeight: '600',
  letterSpacing: 0.5,
  color: colors.textSecondary,
  textTransform: 'uppercase',
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  backgroundColor: colors.backgroundPrimary,
}
```

### Alphabet Section Header

```typescript
alphabetHeader: {
  fontSize: scale(14),
  fontWeight: '600',
  color: colors.textPrimary,
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.md,
  paddingBottom: spacing.xs,
  backgroundColor: colors.backgroundPrimary,
}
```

---

## Spacing Reference

### Container Padding

| Context | Horizontal | Vertical |
|---------|------------|----------|
| Screen content | 20px (`layout.screenPaddingH`) | 24px (`layout.screenPaddingV`) |
| List content | 16px (`spacing.lg`) | 0 |
| Card content | 12px (`spacing.md`) | 12px |
| Carousel | 20px (`layout.screenPaddingH`) | 0 |

### Item Gaps

| Context | Gap |
|---------|-----|
| Carousel items | 12px (`spacing.md`) |
| List items | 8px (`spacing.sm`) |
| Grid items | 12px (`spacing.md`) |
| Section gap | 24px (`spacing.xxl`) |

### Bottom Padding

```typescript
// Always include navigation bar height
paddingBottom: navBarHeight + spacing.lg
// navBarHeight = TAB_BAR_HEIGHT (52) + safeAreaBottom
```

---

## Empty States

| Screen | EmptyState Icon | Message |
|--------|-----------------|---------|
| Downloads | `download` | "No downloads yet" |
| Favorites | `heart` | "No favorites yet" |
| Search | `search` | "No results found" |
| Library | `book` | "Your library is empty" |

---

## Loading States

| Context | Loading Component |
|---------|-------------------|
| Initial load | `<LoadingSpinner />` |
| List loading | `<ActivityIndicator />` at bottom |
| Pull-to-refresh | `<RefreshControl tintColor={colors.accent} />` |
| Card placeholders | `<BookCardSkeleton />` |

---

## Inconsistencies Found

### Padding Values

| Component | Horizontal | Should Be |
|-----------|------------|-----------|
| BookCard | `scale(16)` | `spacing.lg` |
| SeriesCard | `spacing.md` | OK |
| Carousel | 16px hardcoded | `layout.screenPaddingH` |

### Row Heights

| Component | Height | Fixed Layout |
|-----------|--------|--------------|
| BookCard | ~84px | No |
| Author row | 72px | Yes |
| Settings row | Variable | No |

### Separator Patterns

| Context | Separator |
|---------|-----------|
| BookCard list | Implicit (padding) |
| Settings | Divider line |
| SectionList | Section headers |

---

## Recommendations

### 1. Standardize List Container

```typescript
const ListContainer = {
  paddingHorizontal: layout.screenPaddingH,
  paddingBottom: navBarHeight + spacing.lg,
};
```

### 2. Create Row Height Tokens

```typescript
// Add to cardTokens
rowHeight: {
  compact: 64,
  standard: 80,
  expanded: 100,
  settings: 56,
  chapter: 48,
}
```

### 3. Standardize Separators

```typescript
// Prefer consistent spacing over lines
<ItemSeparatorComponent>
  <View style={{ height: spacing.sm }} />
</ItemSeparatorComponent>
```

---

*Audit complete. See 03-PageStructure.md for screen layout patterns.*
