# Edit Specification: Author & Narrator Screens

**Covers Action Plan Items:** 1.4, 3.5, 4.1, 4.3, 4.11
**Priority:** Medium (Phase 3-4)
**Effort:** M (Medium) - 2-3 days

---

## Current State

### AuthorsListScreen.tsx
- **File:** `src/features/library/screens/AuthorsListScreen.tsx`
- **Lines:** ~450
- **Features:** Search, sort, A-Z section headers
- **Missing:** A-Z scrubber sidebar, "Your Authors" section

### AuthorDetailScreen.tsx
- **File:** `src/features/author/screens/AuthorDetailScreen.tsx`
- **Lines:** ~600
- **`as any` casts:** 8 occurrences
- **Error handling:** 1 catch block with just console.error
- **Features:** Avatar, bio, continue listening, genres, related, all books

### NarratorsListScreen.tsx
- **File:** `src/features/library/screens/NarratorsListScreen.tsx`
- **Lines:** ~400
- **Features:** Search, sort, A-Z section headers
- **Missing:** A-Z scrubber sidebar

### NarratorDetailScreen.tsx
- **File:** `src/features/narrator/screens/NarratorDetailScreen.tsx`
- **Lines:** ~550
- **`as any` casts:** 5 occurrences
- **Features:** Mic icon, stats, collaborators, genres, all books
- **Missing:** Follow/track narrator feature, cached data support

---

## Issues Identified

| Issue | Source | Severity |
|-------|--------|----------|
| No A-Z scrubber sidebar | [27], [30] #8 | Medium |
| No "Your Authors" personalized section | [27] | Low |
| AuthorDetail: 8 `as any` casts | [28] | Medium |
| AuthorDetail: silent catch block | [28] | Medium |
| NarratorDetail: no caching | [27], [28] | Low |
| NarratorDetail: no follow feature | [27] | Low |

---

## Alignment Requirements

From [27] Implementation Completeness:
- AuthorsListScreen: 78% complete
- AuthorDetailScreen: 88% complete
- NarratorsListScreen: 78% complete
- NarratorDetailScreen: 85% complete

---

## Specific Changes

### 4.1: Add A-Z Scrubber Sidebar

**New shared component:** `src/shared/components/AlphabetScrubber.tsx`

```typescript
import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, PanResponder } from 'react-native';
import { haptics } from '@/core/native/haptics';
import { scale, colors } from '@/shared/theme';

interface AlphabetScrubberProps {
  letters: string[];
  activeLetter: string | null;
  onLetterPress: (letter: string) => void;
  onLetterHover?: (letter: string) => void;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');

export const AlphabetScrubber: React.FC<AlphabetScrubberProps> = ({
  letters,
  activeLetter,
  onLetterPress,
  onLetterHover,
}) => {
  const availableLetters = new Set(letters);

  const panResponder = useCallback(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const letter = getLetterFromY(evt.nativeEvent.locationY);
        if (letter && availableLetters.has(letter)) {
          haptics.selection();
          onLetterPress(letter);
        }
      },
      onPanResponderMove: (evt) => {
        const letter = getLetterFromY(evt.nativeEvent.locationY);
        if (letter && availableLetters.has(letter)) {
          onLetterHover?.(letter);
        }
      },
    }),
    [availableLetters, onLetterPress, onLetterHover]
  );

  const getLetterFromY = (y: number): string | null => {
    const index = Math.floor(y / LETTER_HEIGHT);
    return ALPHABET[index] || null;
  };

  return (
    <View style={styles.container} {...panResponder().panHandlers}>
      {ALPHABET.map(letter => (
        <TouchableOpacity
          key={letter}
          onPress={() => availableLetters.has(letter) && onLetterPress(letter)}
          style={styles.letterContainer}
        >
          <Text
            style={[
              styles.letter,
              activeLetter === letter && styles.letterActive,
              !availableLetters.has(letter) && styles.letterDisabled,
            ]}
          >
            {letter}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const LETTER_HEIGHT = scale(18);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 4,
    top: 0,
    bottom: 0,
    width: scale(24),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  letterContainer: {
    height: LETTER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  letter: {
    fontSize: scale(11),
    fontWeight: '600',
    color: colors.accent,
  },
  letterActive: {
    color: colors.textPrimary,
    backgroundColor: colors.accent,
    width: scale(18),
    height: scale(18),
    borderRadius: scale(9),
    textAlign: 'center',
    lineHeight: scale(18),
  },
  letterDisabled: {
    color: colors.textTertiary,
  },
});
```

**Update AuthorsListScreen.tsx:**
```typescript
import { AlphabetScrubber } from '@/shared/components';

const [activeLetter, setActiveLetter] = useState<string | null>(null);
const listRef = useRef<SectionList>(null);

const handleLetterPress = useCallback((letter: string) => {
  const sectionIndex = sections.findIndex(s => s.title === letter);
  if (sectionIndex !== -1) {
    listRef.current?.scrollToLocation({
      sectionIndex,
      itemIndex: 0,
      animated: true,
    });
    setActiveLetter(letter);
  }
}, [sections]);

// In render
<View style={styles.container}>
  <SectionList
    ref={listRef}
    sections={sections}
    renderSectionHeader={renderSectionHeader}
    renderItem={renderItem}
    contentContainerStyle={{ paddingRight: scale(28) }}  // Space for scrubber
  />
  <AlphabetScrubber
    letters={sections.map(s => s.title)}
    activeLetter={activeLetter}
    onLetterPress={handleLetterPress}
  />
</View>
```

### 4.3: Add "Your Authors" Personalized Section

**Update AuthorsListScreen.tsx:**
```typescript
import { usePreferencesStore } from '@/features/recommendations/stores/preferencesStore';

const { favoriteAuthors } = usePreferencesStore();
const { items: libraryItems } = useLibraryCache();

// Get authors from user's listening history
const yourAuthors = useMemo(() => {
  // Authors from favorited books
  const fromFavorites = new Set(favoriteAuthors);

  // Authors from in-progress books
  const fromInProgress = inProgressBooks
    .map(book => getBookMetadata(book).authorName)
    .filter(Boolean);

  // Combine and get author details
  const authorNames = new Set([...fromFavorites, ...fromInProgress]);

  return allAuthors.filter(author => authorNames.has(author.name));
}, [favoriteAuthors, inProgressBooks, allAuthors]);

// In render, before the SectionList
{yourAuthors.length > 0 && (
  <View style={styles.yourAuthorsSection}>
    <SectionHeader title="Your Authors" />
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {yourAuthors.map(author => (
        <AuthorCard key={author.id} author={author} onPress={handleAuthorPress} />
      ))}
    </ScrollView>
  </View>
)}
```

### 1.4: Fix Silent Catch in AuthorDetailScreen

**File:** `src/features/author/screens/AuthorDetailScreen.tsx`

```typescript
// Before
try {
  const data = await apiClient.get(`/api/authors/${authorId}`);
  setAuthor(data);
} catch (error) {
  console.error('Failed to load author:', error);
}

// After
import { useToast } from '@/shared/hooks/useToast';

const { showToast } = useToast();
const [error, setError] = useState<string | null>(null);

try {
  const data = await apiClient.get(`/api/authors/${authorId}`);
  setAuthor(data);
  setError(null);
} catch (error) {
  console.error('Failed to load author:', error);
  setError('Unable to load author details.');
  showToast({
    type: 'error',
    message: 'Failed to load author. Please try again.',
  });
}
```

### 3.5: Add Caching to NarratorDetailScreen

**File:** `src/features/narrator/screens/NarratorDetailScreen.tsx`

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Use React Query with caching
const { data: narratorData, isLoading, error, refetch } = useQuery({
  queryKey: ['narrator', narratorId],
  queryFn: () => apiClient.get(`/api/narrators/${narratorId}`),
  staleTime: 1000 * 60 * 5,  // 5 minutes
  cacheTime: 1000 * 60 * 30, // 30 minutes
  placeholderData: (previousData) => previousData,
});

// Also cache in SQLite for offline
useEffect(() => {
  if (narratorData) {
    sqliteCache.cacheNarrator(narratorData);
  }
}, [narratorData]);

// Load from cache first
const cachedNarrator = useMemo(() =>
  sqliteCache.getCachedNarrator(narratorId),
  [narratorId]
);

const narrator = narratorData || cachedNarrator;
```

### 4.11: Add Follow/Track Narrator

**File:** `src/features/narrator/screens/NarratorDetailScreen.tsx`

```typescript
import { usePreferencesStore } from '@/features/recommendations/stores/preferencesStore';

const { favoriteNarrators, addFavoriteNarrator, removeFavoriteNarrator } = usePreferencesStore();
const isFollowing = favoriteNarrators.includes(narrator?.name || '');

const handleToggleFollow = useCallback(() => {
  if (!narrator) return;

  if (isFollowing) {
    removeFavoriteNarrator(narrator.name);
    haptics.impact('light');
  } else {
    addFavoriteNarrator(narrator.name);
    haptics.notification('success');
  }
}, [narrator, isFollowing]);

// In header
<TouchableOpacity
  style={[styles.followButton, isFollowing && styles.followButtonActive]}
  onPress={handleToggleFollow}
>
  <Heart
    size={scale(18)}
    color={isFollowing ? '#000' : colors.textPrimary}
    fill={isFollowing ? colors.accent : 'none'}
  />
  <Text style={[styles.followText, isFollowing && styles.followTextActive]}>
    {isFollowing ? 'Following' : 'Follow'}
  </Text>
</TouchableOpacity>
```

---

## Cross-Screen Dependencies

| Change | Affects |
|--------|---------|
| AlphabetScrubber | Shared component, used by Authors/Narrators list |
| usePreferencesStore | Already exists, add narrator favorites |
| getBookMetadata | Depends on 2.19 |
| useFilteredLibrary | Depends on 2.15 |

---

## Testing Criteria

- [ ] A-Z scrubber appears on right side of list
- [ ] Tapping letter scrolls to section
- [ ] Disabled letters don't trigger scroll
- [ ] "Your Authors" section shows personalized list
- [ ] Author detail shows error toast on failure
- [ ] Narrator detail loads from cache when offline
- [ ] Follow button toggles narrator favorite state

---

## Effort Breakdown

| Task | Effort | Risk |
|------|--------|------|
| Create AlphabetScrubber component | 2 hours | Low |
| Add scrubber to AuthorsListScreen | 1 hour | Low |
| Add scrubber to NarratorsListScreen | 30 min | Low |
| Add "Your Authors" section | 1.5 hours | Low |
| Fix AuthorDetail error handling | 30 min | Low |
| Add NarratorDetail caching | 1.5 hours | Low |
| Add narrator follow feature | 1 hour | Low |
| Testing | 1.5 hours | - |

**Total: 2-3 days**
