# Edit Specification: Code Cleanup

**Covers Action Plan Items:** 2.3, 2.4, 2.6, 2.7, 2.8, 2.14
**Priority:** High (Phase 2)
**Effort:** M (Medium) - 1-2 days

---

## Current State

### Cross-Feature Imports (2.3)
- 25+ imports between features violating module boundaries
- `useContinueListening` from home used in library, discover
- `useMyLibraryStore` from library used in home, discover
- `useKidModeStore` from profile used in home, discover, search, library
- `SearchBar` from search used in other screens

### Duplicate Components (2.4)
- `SeriesCard.tsx` exists in 2 locations
- `SwipeableBookCard.tsx` exists in 2 locations

### Console.log (2.6)
- 492 occurrences across 43 files
- Highest: `sqliteCache.ts` (116), `queueStore.ts` (29)

### Deprecated Tokens (2.7, 2.8)
- `colors.gold/goldDark/goldSubtle` → should use `primary/primaryDark/primarySubtle`
- `useResponsive` hook → should use `@/shared/theme` direct
- `useThemeColors()` → should use `useTheme()` or `useColors()`

### Icon Sizes (2.14)
- Inconsistent icon sizing, not all use `scale()`

---

## Issues Identified

| Issue | Source | Severity |
|-------|--------|----------|
| 25+ cross-feature imports | [29], [30] #10, [31] §3.2 | Medium |
| 4 duplicate component names | [29], [31] §3.3 | Low |
| 492 console.log statements | [28], [30] #9 | Medium |
| Deprecated color tokens in use | [28] | Low |
| Deprecated hooks in use | [28] | Low |
| Inconsistent icon sizing | [30] Quick Win #6 | Low |

---

## Specific Changes

### 2.3: Move Cross-Feature Imports to Shared

#### Move useContinueListening

**From:** `src/features/home/hooks/useContinueListening.ts`
**To:** `src/shared/hooks/useContinueListening.ts`

```bash
# Steps
1. Move file to shared/hooks/
2. Update imports in:
   - src/features/home/screens/HomeScreen.tsx
   - src/features/library/screens/MyLibraryScreen.tsx
   - src/features/discover/hooks/useDiscoverData.ts
3. Update shared/hooks/index.ts exports
```

#### Move useMyLibraryStore

**From:** `src/features/library/stores/myLibraryStore.ts`
**To:** `src/shared/stores/myLibraryStore.ts`

```bash
# Steps
1. Move file to shared/stores/
2. Update imports in:
   - src/features/library/screens/MyLibraryScreen.tsx
   - src/features/home/hooks/useHomeData.ts
   - src/features/discover/hooks/useDiscoverData.ts
   - Any other consumers
3. Create shared/stores/index.ts if not exists
```

#### Move useKidModeStore

**From:** `src/features/profile/stores/kidModeStore.ts`
**To:** `src/shared/stores/kidModeStore.ts`

```bash
# Steps
1. Move file to shared/stores/
2. Update imports in:
   - src/features/profile/screens/KidModeSettingsScreen.tsx
   - src/features/home/hooks/useHomeData.ts
   - src/features/discover/hooks/useDiscoverData.ts
   - src/features/search/screens/SearchScreen.tsx
   - src/features/library/screens/MyLibraryScreen.tsx
3. Update shared/stores/index.ts exports
```

#### Move SearchBar

**From:** `src/features/search/components/SearchBar.tsx` (if exists as separate)
**To:** `src/shared/components/SearchBar.tsx`

Or create shared SearchBar if currently inline:
```typescript
// src/shared/components/SearchBar.tsx
interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  autoFocus?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ ... }) => { ... };
```

### 2.4: Consolidate Duplicate Components

#### SeriesCard.tsx

**Locations:**
- `src/features/home/components/SeriesCard.tsx`
- `src/features/series/components/SeriesCard.tsx`

**Action:** Compare implementations, consolidate to `src/shared/components/SeriesCard.tsx`

```typescript
// src/shared/components/SeriesCard.tsx
interface SeriesCardProps {
  series: SeriesInfo;
  variant?: 'home' | 'detail';  // If different styles needed
  onPress: (seriesName: string) => void;
}

export const SeriesCard: React.FC<SeriesCardProps> = React.memo(({ ... }) => {
  // Unified implementation
});
```

**Update imports:**
```typescript
// Before
import { SeriesCard } from '@/features/home/components/SeriesCard';
import { SeriesCard } from '@/features/series/components/SeriesCard';

// After
import { SeriesCard } from '@/shared/components';
```

#### SwipeableBookCard.tsx

**Locations:**
- `src/features/discover/components/SwipeableBookCard.tsx`
- `src/features/reading-history-wizard/components/SwipeableBookCard.tsx`

**Action:** Consolidate to `src/shared/components/SwipeableBookCard.tsx`

```typescript
// src/shared/components/SwipeableBookCard.tsx
interface SwipeableBookCardProps {
  book: LibraryItem;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onPress?: () => void;
  leftLabel?: string;
  rightLabel?: string;
  swipeThreshold?: number;
}

export const SwipeableBookCard: React.FC<SwipeableBookCardProps> = ({ ... }) => {
  // Unified implementation with configurable behavior
};
```

### 2.6: Console.log Cleanup

#### Create Logger Utility

**New file:** `src/shared/utils/logger.ts`

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
  includeTimestamp: boolean;
}

const config: LoggerConfig = {
  enabled: __DEV__,
  minLevel: 'debug',
  includeTimestamp: true,
};

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return config.enabled && LEVELS[level] >= LEVELS[config.minLevel];
}

function formatMessage(tag: string, message: string): string {
  const timestamp = config.includeTimestamp
    ? `[${new Date().toISOString().slice(11, 23)}]`
    : '';
  return `${timestamp}[${tag}] ${message}`;
}

export const logger = {
  debug: (tag: string, message: string, data?: unknown) => {
    if (shouldLog('debug')) {
      console.log(formatMessage(tag, message), data ?? '');
    }
  },

  info: (tag: string, message: string, data?: unknown) => {
    if (shouldLog('info')) {
      console.info(formatMessage(tag, message), data ?? '');
    }
  },

  warn: (tag: string, message: string, data?: unknown) => {
    if (shouldLog('warn')) {
      console.warn(formatMessage(tag, message), data ?? '');
    }
  },

  error: (tag: string, message: string, data?: unknown) => {
    if (shouldLog('error')) {
      console.error(formatMessage(tag, message), data ?? '');
    }
  },

  // Convenience methods
  setEnabled: (enabled: boolean) => {
    config.enabled = enabled;
  },

  setMinLevel: (level: LogLevel) => {
    config.minLevel = level;
  },
};
```

#### Update High-Console Files

**Priority files to update:**

1. **sqliteCache.ts (116 occurrences)**
```typescript
// Before
console.log('[sqliteCache] Loading downloads...');

// After
logger.debug('sqlite', 'Loading downloads...');
```

2. **queueStore.ts (29 occurrences)**
```typescript
// Before
console.log('[queueStore] Adding to queue:', item);

// After
logger.debug('queue', 'Adding to queue', item);
```

3. **appInitializer.ts (21 occurrences)** - Keep as info level
4. **events/listeners.ts (19 occurrences)**
5. **websocketService.ts (18 occurrences)**
6. **authService.ts (19 occurrences)**

### 2.7: Deprecated Color Tokens

**File:** `src/shared/theme/colors.ts`

```typescript
// Before (deprecated)
export const colors = {
  gold: '#F3B60C',
  goldDark: '#D4A00A',
  goldSubtle: 'rgba(243, 182, 12, 0.2)',
  // ...
};

// After (add aliases, mark deprecated)
export const colors = {
  // Primary accent (preferred)
  primary: '#F3B60C',
  primaryDark: '#D4A00A',
  primarySubtle: 'rgba(243, 182, 12, 0.2)',

  // Aliases for backwards compat (deprecated)
  /** @deprecated Use `primary` instead */
  gold: '#F3B60C',
  /** @deprecated Use `primaryDark` instead */
  goldDark: '#D4A00A',
  /** @deprecated Use `primarySubtle` instead */
  goldSubtle: 'rgba(243, 182, 12, 0.2)',

  accent: '#F3B60C',  // Keep as alias to primary
  // ...
};
```

**Find and replace across codebase:**
```bash
# Search for deprecated usage
grep -r "colors.gold" src/
grep -r "colors.goldDark" src/
grep -r "colors.goldSubtle" src/
```

### 2.8: Deprecated Hooks

#### Remove useResponsive

**File to remove:** `src/shared/hooks/useResponsive.ts`

**Update consumers to use direct imports:**
```typescript
// Before
import { useResponsive } from '@/shared/hooks/useResponsive';
const { scale, wp, hp } = useResponsive();

// After
import { scale, wp, hp } from '@/shared/theme';
```

#### Update useThemeColors usage

```typescript
// Before
import { useThemeColors } from '@/shared/theme/themeStore';
const colors = useThemeColors();

// After (if hook still needed)
import { useTheme } from '@/shared/theme/themeStore';
const { colors } = useTheme();

// Or direct usage
import { useColors } from '@/shared/theme/themeStore';
const colors = useColors();
```

### 2.14: Icon Size Standardization

Create wrapper or add eslint rule:

**Option A: Wrapper Component**
```typescript
// src/shared/components/Icon.tsx
import { scale } from '@/shared/theme';
import * as LucideIcons from 'lucide-react-native';

interface IconProps {
  name: keyof typeof LucideIcons;
  size?: number;  // Already scaled, or use preset
  color?: string;
}

const SIZES = {
  sm: scale(16),
  md: scale(20),
  lg: scale(24),
  xl: scale(32),
};

export const Icon: React.FC<IconProps> = ({ name, size = 'md', color }) => {
  const IconComponent = LucideIcons[name];
  const scaledSize = typeof size === 'number' ? size : SIZES[size];
  return <IconComponent size={scaledSize} color={color} />;
};
```

**Option B: ESLint Rule (recommended)**
```javascript
// .eslintrc.js
rules: {
  'no-restricted-syntax': [
    'warn',
    {
      selector: 'JSXAttribute[name.name="size"][value.type="Literal"]',
      message: 'Icon sizes should use scale() for responsive sizing',
    },
  ],
}
```

---

## Testing Criteria

- [ ] All cross-feature imports now from `@/shared/`
- [ ] No duplicate component files remain
- [ ] Console.log replaced with logger in priority files
- [ ] Logger only outputs in __DEV__ mode
- [ ] Deprecated color tokens still work (backwards compat)
- [ ] All screens still render correctly
- [ ] No TypeScript import errors

---

## Effort Breakdown

| Task | Effort | Risk |
|------|--------|------|
| Move useContinueListening | 30 min | Low |
| Move useMyLibraryStore | 30 min | Low |
| Move useKidModeStore | 30 min | Low |
| Move/create SearchBar | 30 min | Low |
| Consolidate SeriesCard | 1 hour | Low |
| Consolidate SwipeableBookCard | 1 hour | Low |
| Create logger utility | 1 hour | Low |
| Update sqliteCache logs | 1 hour | Low |
| Update other high-log files | 2 hours | Low |
| Deprecate color tokens | 30 min | Low |
| Remove useResponsive | 30 min | Low |
| Icon standardization | 1 hour | Low |
| Testing | 1.5 hours | - |

**Total: 1-2 days**
