# CLAUDE.md - AI Assistant Guide

> **Last Updated**: 2025-11-23
> **Project**: AudiobookShelf Mobile App
> **Stage**: Stage 2 Complete - Authentication System Fully Implemented

## Table of Contents
1. [Project Overview](#project-overview)
2. [Quick Start for AI Assistants](#quick-start-for-ai-assistants)
3. [Codebase Structure](#codebase-structure)
4. [Tech Stack & Dependencies](#tech-stack--dependencies)
5. [Development Workflows](#development-workflows)
6. [Code Conventions](#code-conventions)
7. [Architecture Patterns](#architecture-patterns)
8. [Common Tasks](#common-tasks)
9. [Testing Strategy](#testing-strategy)
10. [Documentation Reference](#documentation-reference)

---

## Project Overview

### What is this?
A native mobile application (iOS/Android) that wraps AudiobookShelf server with enhanced features:
- **Core**: Browse library, play audiobooks, download for offline, sync progress
- **Enhanced**: Fuzzy search, personalized recommendations, rich series/author/narrator pages
- **Goal**: Better mobile experience than existing AudiobookShelf options

### Why this architecture?
- **Feature-based modular structure**: Each feature is self-contained (no cross-feature imports)
- **File size discipline**: Maximum 400 lines per file for AI context efficiency
- **Claude-friendly**: Clear boundaries, explicit patterns, comprehensive documentation
- **TypeScript everywhere**: Type safety from day one

### Current Status
✅ **Complete**:
- Project scaffolding, configuration, documentation framework
- Complete TypeScript type system (7 files, ~730 lines)
- Full API client with 30+ methods (4 files, ~590 lines)
- Authentication service with secure token storage
- Authentication React context and useAuth hook
- Login screen with server URL configuration
- App navigation with authentication flow
- Splash screen for session restoration

⏳ **Next**: Library feature implementation (browse, grid/list views, filters)
📍 **Stage**: 2 of 6 (Foundation Complete → Library & Core Features → Enhanced Features → Polish)

### What's Been Implemented

#### Stage 1: Core API Client ✅
**Files Created:**
- `src/core/types/user.ts` (61 lines) - User models and permissions
- `src/core/types/library.ts` (108 lines) - Library, items, collections, playlists
- `src/core/types/media.ts` (183 lines) - Media content, progress, playback sessions
- `src/core/types/files.ts` (109 lines) - Audio/ebook files and metadata
- `src/core/types/metadata.ts` (32 lines) - Authors and series
- `src/core/types/api.ts` (221 lines) - API request/response types
- `src/core/types/index.ts` (15 lines) - Type exports
- `src/core/api/baseClient.ts` (180 lines) - Base HTTP client with axios
- `src/core/api/client.ts` (241 lines) - Complete API client with 30+ methods
- `src/core/api/endpoints.ts` (142 lines) - Endpoint URL mappings
- `src/core/api/index.ts` (27 lines) - API exports

**API Methods Implemented:**
Authentication, User Management, Libraries, Items, Progress Tracking, Playback Sessions, Search, Series, Authors, Collections, Playlists (see `docs/IMPLEMENTATION_SUMMARY.md` for full list)

#### Stage 2: Authentication System ✅
**Files Created:**
- `src/core/auth/authService.ts` (205 lines) - Secure credential storage, login/logout
- `src/core/auth/authContext.tsx` (156 lines) - React context and useAuth hook
- `src/core/auth/index.ts` (8 lines) - Auth exports
- `src/features/auth/screens/LoginScreen.tsx` (275 lines) - Login UI
- `src/navigation/AppNavigator.tsx` (56 lines) - Auth flow navigation
- `src/shared/components/SplashScreen.tsx` - Session restore screen
- `src/features/library/screens/LibraryScreen.tsx` - Placeholder main screen

**Features Implemented:**
- Secure token storage using Expo SecureStore
- Server URL configuration and persistence
- Auto-login on app start with session restoration
- Token validation on restore
- Protected route navigation
- Login screen with form validation
- Error handling and user feedback

---

## Quick Start for AI Assistants

### Before Every Session: Read These Files First
1. **`docs/current-work.md`** - See what's in progress, current blockers, next steps
2. **`docs/architecture.md`** - Understand project structure and build stages
3. **Relevant feature doc** in `docs/features/` (if working on specific feature)

### Essential Rules
- ✅ **DO**: Keep files under 400 lines, use explicit imports, update docs after changes
- ❌ **DON'T**: Cross-feature imports, `any` types, files over 400 lines, hardcoded values

### Development Checklist
```bash
# Before starting work
npm run tsc       # Check types
npm run lint      # Check code quality

# After making changes
npm run format    # Format code
npm run tsc       # Verify types
# Update docs/current-work.md with what you did
```

---

## Codebase Structure

### Directory Tree
```
audiobookshelf-app/
├── src/
│   ├── config/              # Configuration and feature flags
│   │   ├── constants.ts     # Global constants (API URLs, cache times, etc.)
│   │   ├── features.ts      # Feature flags for gradual rollout
│   │   └── index.ts         # Config exports
│   │
│   ├── core/                # Foundation layer (NEVER imports from features)
│   │   ├── api/             # AudiobookShelf API client
│   │   │   ├── baseClient.ts # Base HTTP client with axios config
│   │   │   ├── client.ts    # Main API client with all methods
│   │   │   ├── endpoints.ts # API endpoint definitions
│   │   │   └── index.ts     # Public API exports
│   │   ├── auth/            # Authentication system
│   │   │   ├── authContext.tsx   # React context for auth state
│   │   │   ├── authService.ts    # Login, logout, token management
│   │   │   └── index.ts          # Auth exports
│   │   ├── storage/         # Local persistence
│   │   │   ├── database.ts  # Expo SQLite setup and migrations
│   │   │   ├── cache.ts     # Caching layer for offline support
│   │   │   └── index.ts     # Storage exports
│   │   ├── sync/            # Background sync service
│   │   │   ├── syncService.ts    # Progress sync, offline queue
│   │   │   └── index.ts          # Sync exports
│   │   └── types/           # TypeScript type definitions
│   │       ├── user.ts      # User, permissions, device info
│   │       ├── library.ts   # Library, items, collections, playlists
│   │       ├── media.ts     # Book/podcast media, progress, sessions
│   │       ├── files.ts     # Audio files, ebook files, metadata
│   │       ├── metadata.ts  # Authors, series
│   │       ├── api.ts       # API request/response types
│   │       └── index.ts     # Type exports
│   │
│   ├── features/            # Self-contained feature modules
│   │   ├── library/         # Main library browsing
│   │   │   ├── components/  # BookCard, LibraryGrid, FilterBar, etc.
│   │   │   ├── hooks/       # useLibrary, useFilters, etc.
│   │   │   ├── screens/     # LibraryScreen, FilterScreen
│   │   │   ├── services/    # Library business logic
│   │   │   └── index.ts     # Public API exports
│   │   ├── search/          # Fuzzy search with Fuse.js
│   │   ├── player/          # Audio playback (Expo AV)
│   │   ├── book-detail/     # Book information and recommendations
│   │   ├── series/          # Series pages with progress tracking
│   │   ├── author/          # Author pages with bibliography
│   │   ├── narrator/        # Narrator pages (similar to author)
│   │   ├── playlists/       # User-created playlists
│   │   └── recommendations/ # Recommendation engine
│   │
│   ├── shared/              # Reusable across all features
│   │   ├── components/      # UI primitives (Button, Card, List, etc.)
│   │   ├── hooks/           # Common hooks (useDebounce, useCache, etc.)
│   │   ├── utils/           # Helper functions (formatTime, etc.)
│   │   └── theme/           # Design system
│   │       ├── colors.ts    # Color palette
│   │       ├── typography.ts # Font styles and sizes
│   │       ├── spacing.ts   # Layout spacing scale
│   │       └── index.ts     # Theme exports
│   │
│   └── navigation/          # App navigation
│       ├── AppNavigator.tsx # Main navigation structure
│       ├── types.ts         # Navigation type definitions
│       └── index.ts         # Navigation exports
│
├── docs/                    # Project documentation
│   ├── architecture.md      # System design, build stages, principles
│   ├── claude-instructions.md # Detailed development guidelines
│   ├── decisions.md         # Architectural Decision Records (ADRs)
│   ├── api-reference.md     # AudiobookShelf API endpoints
│   ├── current-work.md      # Active work tracker (update after each session)
│   └── features/            # Feature-specific documentation
│       ├── library.md
│       ├── search.md
│       ├── player.md
│       └── recommendations.md
│
├── assets/                  # Image assets (icons, splash screens)
├── App.tsx                  # Root app component
├── index.ts                 # Entry point (Expo root registration)
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── .prettierrc              # Code formatting rules
├── app.json                 # Expo app configuration
└── README.md                # Project overview
```

### Layer Responsibilities

#### `src/config/` - Configuration
- **Purpose**: Centralized configuration and feature flags
- **Imports**: None (leaf module)
- **Examples**: API base URLs, cache durations, feature toggles

#### `src/core/` - Foundation
- **Purpose**: Shared infrastructure that features depend on
- **Imports**: Only from `config/` and external packages
- **Never imports from**: `features/`, `navigation/`
- **Examples**: API client, auth system, database, type definitions

#### `src/features/` - Business Logic
- **Purpose**: Self-contained feature modules
- **Imports**: From `core/`, `shared/`, `config/`, external packages
- **Never imports from**: Other features (no cross-feature dependencies)
- **Examples**: Library browsing, search, audio player

#### `src/shared/` - Reusable Components
- **Purpose**: UI components and utilities used across features
- **Imports**: From `core/`, `config/`, external packages
- **Never imports from**: `features/`
- **Examples**: Button, Card, useDebounce, formatDuration

#### `src/navigation/` - App Navigation
- **Purpose**: Top-level navigation structure
- **Imports**: From `features/` (screen exports), `core/`, `shared/`
- **Examples**: Stack navigator, tab navigator, route definitions

---

## Tech Stack & Dependencies

### Core Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| **React Native** | 0.81.5 | Cross-platform mobile framework |
| **Expo** | ~54.0.25 | Development tooling and native APIs |
| **TypeScript** | ~5.9.2 | Type-safe development |

### State Management
| Technology | Version | Purpose |
|------------|---------|---------|
| **Zustand** | ^5.0.8 | Global app state (auth, theme, settings) |
| **TanStack Query** | ^5.90.10 | Server state, caching, data fetching |
| **React Navigation** | ^7.1.21 | Navigation state and routing |

### Data & Storage
| Technology | Version | Purpose |
|------------|---------|---------|
| **Expo SQLite** | ^16.0.9 | Local persistent database |
| **Axios** | ^1.13.2 | HTTP client for API calls |
| **Fuse.js** | ^7.1.0 | Client-side fuzzy search |

### Native Features
| Technology | Version | Purpose |
|------------|---------|---------|
| **Expo AV** | ^16.0.7 | Audio playback and background audio |
| **Expo File System** | ^19.0.19 | File downloads and offline storage |

### Development Tools
| Technology | Version | Purpose |
|------------|---------|---------|
| **ESLint** | ^9.39.1 | Code linting |
| **Prettier** | ^3.6.2 | Code formatting |
| **TypeScript ESLint** | ^8.47.0 | TypeScript-specific linting |

### Code Formatting Configuration
```json
// .prettierrc
{
  "semi": true,              // Semicolons required
  "trailingComma": "es5",    // Trailing commas where valid in ES5
  "singleQuote": true,       // Use single quotes
  "printWidth": 100,         // Max line width 100 characters
  "tabWidth": 2              // 2 spaces for indentation
}
```

---

## Development Workflows

### Starting a New Feature

1. **Create feature directory structure**:
```bash
src/features/feature-name/
├── components/     # Feature-specific UI components
├── hooks/          # Custom hooks for this feature
├── screens/        # Full-screen components
├── services/       # Business logic and data manipulation
└── index.ts        # Public API exports (only export what's needed)
```

2. **Create feature documentation**:
```bash
# Create docs/features/feature-name.md
- Purpose and requirements
- API endpoints used
- Component hierarchy
- State management approach
```

3. **Update current-work.md**:
```markdown
## Current Work
- **Feature**: [Feature name]
- **Files**: src/features/feature-name/...
- **Status**: In progress
- **Next**: [Next steps]
```

### Modifying Existing Code

1. **Read the file first**: Always use Read tool before editing
2. **Check file size**: If >350 lines, consider splitting before adding more
3. **Maintain patterns**: Follow existing patterns in the file
4. **Update types**: If changing data structures, update `core/types/`
5. **Update docs**: Reflect changes in relevant documentation

### Adding API Endpoints

1. **Document in api-reference.md** first:
```markdown
### GET /api/items/:id
**Purpose**: Fetch book details
**Auth**: Required
**Response**: Book object with metadata
**Caching**: 5 minutes
```

2. **Add to core/api/endpoints.ts**:
```typescript
export const endpoints = {
  getBook: (id: string) => `/api/items/${id}`,
  // ...
};
```

3. **Implement in core/api/client.ts**:
```typescript
export async function getBook(id: string) {
  const response = await apiClient.get(endpoints.getBook(id));
  return response.data;
}
```

4. **Add types to appropriate file in core/types/**:
```typescript
// In core/types/library.ts (if it's a library-related type)
export interface Collection {
  id: string;
  name: string;
  description: string;
  books: string[];
  // ...
}
```

Note: Types are organized by category:
- **user.ts**: User, permissions, device info
- **library.ts**: Libraries, items, collections, playlists
- **media.ts**: Media content, progress, playback sessions
- **files.ts**: Audio/ebook files, metadata
- **metadata.ts**: Authors, series
- **api.ts**: API request/response types

### Completing a Session

1. **Update docs/current-work.md**:
   - Mark completed items ✅
   - List what's next ⏳
   - Document any decisions made 📝
   - Note blockers 🚫

2. **Format and lint**:
```bash
npm run format
npm run lint
npm run tsc
```

3. **Commit with descriptive message**:
```bash
git add .
git commit -m "feat(feature-name): Brief description

- Specific change 1
- Specific change 2

Files modified: list of files"
```

---

## Code Conventions

### File Naming
- **Components**: PascalCase - `BookCard.tsx`, `LibraryGrid.tsx`
- **Services/Utils**: camelCase - `authService.ts`, `formatTime.ts`
- **Hooks**: camelCase with `use` prefix - `useBookDetails.ts`, `useSearch.ts`
- **Types**: camelCase - `models.ts`, `api.ts`
- **Constants**: camelCase - `constants.ts`, `features.ts`

### Code Naming
- **Components**: PascalCase - `BookCard`, `LibraryScreen`
- **Functions**: camelCase - `fetchBookDetails`, `formatDuration`
- **Constants**: UPPER_SNAKE_CASE - `API_BASE_URL`, `DEFAULT_CACHE_TIME`
- **Types/Interfaces**: PascalCase - `Book`, `AuthState`, `ApiResponse`
- **Hooks**: camelCase with `use` prefix - `useBookDetails`, `useAuth`

### TypeScript Patterns

#### Type Definitions
```typescript
// Use interfaces for object shapes
interface Book {
  id: string;
  title: string;
  author: string;
}

// Use types for unions, primitives, or complex types
type BookStatus = 'reading' | 'completed' | 'not-started';
type BookId = string;

// NEVER use 'any' - use 'unknown' if type is truly unknown
function parseJson(json: string): unknown {
  return JSON.parse(json);
}
```

#### Import/Export Patterns
```typescript
// ✅ GOOD: Explicit named imports
import { Book, Author } from '@/core/types';
import { fetchBookDetails } from '@/core/api/client';

// ❌ BAD: Namespace imports
import * as types from '@/core/types';

// ✅ GOOD: Export only what's needed in index.ts
export { BookCard } from './components/BookCard';
export { useBookDetails } from './hooks/useBookDetails';
// Don't export internal utilities or components
```

### React Patterns

#### Component Structure
```typescript
/**
 * src/features/library/components/BookCard.tsx
 *
 * Displays a book card with cover, title, author, and progress.
 * Used in library grid and search results.
 */

import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Book } from '@/core/types';
import { theme } from '@/shared/theme';

interface BookCardProps {
  book: Book;
  onPress: (bookId: string) => void;
  showProgress?: boolean;
}

export function BookCard({ book, onPress, showProgress = true }: BookCardProps) {
  return (
    <Pressable onPress={() => onPress(book.id)} style={styles.container}>
      <Image source={{ uri: book.coverUrl }} style={styles.cover} />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {book.title}
        </Text>
        <Text style={styles.author} numberOfLines={1}>
          {book.author}
        </Text>
        {showProgress && book.progress > 0 && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${book.progress * 100}%` }]} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 150,
    marginBottom: theme.spacing.md,
  },
  cover: {
    width: 150,
    height: 200,
    borderRadius: theme.spacing.sm,
  },
  info: {
    marginTop: theme.spacing.sm,
  },
  title: {
    ...theme.typography.subtitle,
    color: theme.colors.text.primary,
  },
  author: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 2,
    marginTop: theme.spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
});
```

#### Custom Hooks Pattern
```typescript
/**
 * src/features/library/hooks/useBookDetails.ts
 *
 * Fetches and caches book details from the API.
 */

import { useQuery } from '@tanstack/react-query';
import { getBook } from '@/core/api/client';
import { Book } from '@/core/types';

export function useBookDetails(bookId: string) {
  return useQuery({
    queryKey: ['book', bookId],
    queryFn: () => getBook(bookId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!bookId, // Only run if bookId exists
  });
}

// Usage in component:
// const { data: book, isLoading, error } = useBookDetails(bookId);
```

#### Service Pattern
```typescript
/**
 * src/features/library/services/libraryService.ts
 *
 * Business logic for library management (filtering, sorting, etc.)
 */

import { Book } from '@/core/types';

export function sortBooks(books: Book[], sortBy: 'title' | 'author' | 'recent'): Book[] {
  switch (sortBy) {
    case 'title':
      return [...books].sort((a, b) => a.title.localeCompare(b.title));
    case 'author':
      return [...books].sort((a, b) => a.author.localeCompare(b.author));
    case 'recent':
      return [...books].sort((a, b) => b.addedAt - a.addedAt);
    default:
      return books;
  }
}

export function filterBooks(books: Book[], filters: LibraryFilters): Book[] {
  return books.filter((book) => {
    if (filters.genre && book.genre !== filters.genre) return false;
    if (filters.status && book.status !== filters.status) return false;
    return true;
  });
}
```

### Error Handling

#### Async Operations
```typescript
// ✅ GOOD: Always use try/catch with async/await
async function fetchBookDetails(bookId: string): Promise<Book> {
  try {
    const response = await apiClient.get(`/api/items/${bookId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch book details:', error);
    // Handle error appropriately (show toast, use fallback, etc.)
    throw error; // Re-throw if caller needs to handle
  }
}

// ❌ BAD: Using .then() instead of async/await
function fetchBookDetails(bookId: string): Promise<Book> {
  return apiClient.get(`/api/items/${bookId}`)
    .then(response => response.data)
    .catch(error => {
      console.error(error);
      throw error;
    });
}
```

#### Component Error Handling
```typescript
function BookDetailsScreen({ route }: BookDetailsScreenProps) {
  const { bookId } = route.params;
  const { data: book, isLoading, error } = useBookDetails(bookId);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <ErrorView
        message="Failed to load book details"
        onRetry={() => refetch()}
      />
    );
  }

  if (!book) {
    return <EmptyState message="Book not found" />;
  }

  return <BookDetailsView book={book} />;
}
```

### Comments

#### File Headers (Required)
```typescript
/**
 * src/core/api/client.ts
 *
 * AudiobookShelf API client - single source of truth for all server communication.
 * Handles authentication, request formatting, error handling, and response parsing.
 */
```

#### Inline Comments (When Needed)
```typescript
// ✅ GOOD: Explain WHY, not WHAT
// Use debounce to avoid excessive API calls while user is typing
const debouncedSearch = useDebounce(searchQuery, 300);

// Cache book covers aggressively since they rarely change
const coverCacheTime = 24 * 60 * 60 * 1000; // 24 hours

// ❌ BAD: Explaining WHAT the code does (code is self-explanatory)
// Set the book title to the title from the response
const title = response.data.title;
```

---

## Architecture Patterns

### Layered Architecture

```
┌─────────────────────────────────────────────────┐
│          Navigation (App Routing)               │
│  Imports: features (screens), core, shared      │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│         Features (Business Logic)               │
│  Imports: core, shared, config                  │
│  NO cross-feature imports                       │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│     Shared (Reusable Components & Utils)        │
│  Imports: core, config                          │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│       Core (Foundation Infrastructure)          │
│  Imports: config only                           │
│  NEVER imports from features or navigation      │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│          Config (Constants & Flags)             │
│  Imports: None (leaf module)                    │
└─────────────────────────────────────────────────┘
```

### State Management Strategy

```
┌──────────────────────────────────────────────────────────┐
│ Server State (TanStack Query)                            │
│ - Books, authors, series from AudiobookShelf API         │
│ - Automatic caching, refetching, optimistic updates      │
│ - Use for: Any data that comes from the server           │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Global App State (Zustand)                               │
│ - Authentication (user, token)                           │
│ - Theme (light/dark mode)                                │
│ - Settings (preferences)                                 │
│ - Use for: App-wide state that persists across screens   │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Local UI State (React useState/useReducer)               │
│ - Form inputs                                            │
│ - Modal visibility                                       │
│ - Accordion expand/collapse                             │
│ - Use for: Component-specific state                      │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Cached/Offline Data (Expo SQLite)                        │
│ - Downloaded books                                       │
│ - Offline playback data                                  │
│ - Search index                                           │
│ - Use for: Data needed when offline                      │
└──────────────────────────────────────────────────────────┘
```

### Data Flow Patterns

#### Fetching Data
```
User Action → Component → Custom Hook → API Service → Server
                ↓             ↓              ↓
            Loading UI    TanStack     HTTP Request
                          Query         (Axios)
                            ↓              ↓
                        Cache       Response Data
                            ↓              ↓
                    Update Component ← Parse & Store
```

#### Offline-First Flow
```
User Action → Check Network
                ↓
         ┌──────┴──────┐
      Online        Offline
         ↓              ↓
    API Call      Load from SQLite
         ↓              ↓
   Update Cache   Queue Sync Action
         ↓              ↓
    Show Data      Show Cached Data
         ↓              ↓
  Background Sync  Sync When Online
```

---

## Common Tasks

### Task: Add a New Feature

**Example: Adding a "Collections" feature**

1. **Create feature structure**:
```bash
mkdir -p src/features/collections/{components,hooks,screens,services}
touch src/features/collections/index.ts
```

2. **Define types in appropriate core/types/ file**:
```typescript
// In core/types/library.ts (collections are library-related)
export interface Collection {
  id: string;
  name: string;
  description: string;
  bookIds: string[];
  createdAt: number;
}
```

3. **Add API endpoint in core/api/client.ts**:
```typescript
export async function getCollections(): Promise<Collection[]> {
  try {
    const response = await apiClient.get('/api/collections');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch collections:', error);
    throw error;
  }
}
```

4. **Create hook in features/collections/hooks/useCollections.ts**:
```typescript
import { useQuery } from '@tanstack/react-query';
import { getCollections } from '@/core/api/client';

export function useCollections() {
  return useQuery({
    queryKey: ['collections'],
    queryFn: getCollections,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

5. **Create component in features/collections/components/CollectionCard.tsx**

6. **Create screen in features/collections/screens/CollectionsScreen.tsx**

7. **Export public API in features/collections/index.ts**:
```typescript
export { CollectionsScreen } from './screens/CollectionsScreen';
export { useCollections } from './hooks/useCollections';
```

8. **Add to navigation in src/navigation/AppNavigator.tsx**

9. **Document in docs/features/collections.md**

10. **Update docs/current-work.md**

### Task: Add a Shared Component

**Example: Adding a "LoadingSpinner" component**

1. **Create component in shared/components/LoadingSpinner.tsx**:
```typescript
/**
 * src/shared/components/LoadingSpinner.tsx
 *
 * Reusable loading spinner with optional text.
 */

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';

interface LoadingSpinnerProps {
  text?: string;
  size?: 'small' | 'large';
}

export function LoadingSpinner({ text, size = 'large' }: LoadingSpinnerProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={theme.colors.primary} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
  },
});
```

2. **Export in shared/components/index.ts**:
```typescript
export { LoadingSpinner } from './LoadingSpinner';
```

3. **Use in features**:
```typescript
import { LoadingSpinner } from '@/shared/components';

// In component:
if (isLoading) return <LoadingSpinner text="Loading books..." />;
```

### Task: Add an API Endpoint

**Example: Adding "Get Author Details" endpoint**

1. **Document in docs/api-reference.md**:
```markdown
### GET /api/authors/:id
**Purpose**: Fetch author details and bibliography
**Auth**: Required
**Parameters**:
- `id` (path): Author ID
**Response**: Author object with books array
**Caching**: 10 minutes
```

2. **Add endpoint in core/api/endpoints.ts**:
```typescript
export const endpoints = {
  // ... existing endpoints
  getAuthor: (id: string) => `/api/authors/${id}`,
};
```

3. **Implement in core/api/client.ts**:
```typescript
export async function getAuthor(id: string): Promise<Author> {
  try {
    const response = await apiClient.get(endpoints.getAuthor(id));
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch author ${id}:`, error);
    throw error;
  }
}
```

4. **Define type in core/types/metadata.ts** (if not exists):
```typescript
// In core/types/metadata.ts (authors are metadata)
export interface Author {
  id: string;
  name: string;
  description?: string;
  imagePath?: string;
  addedAt: number;
  updatedAt: number;
}
```

5. **Export in core/api/index.ts**:
```typescript
export { getAuthor } from './client';
```

### Task: Split a Large File

**When a file exceeds 350 lines, split it:**

**Example: Splitting a large service file**

Before:
```
src/features/library/services/libraryService.ts (450 lines)
```

After:
```
src/features/library/services/
├── index.ts (exports all services)
├── filterService.ts (filtering logic, 120 lines)
├── sortService.ts (sorting logic, 100 lines)
└── formatService.ts (formatting helpers, 80 lines)
```

**Steps**:
1. Identify logical boundaries (filtering, sorting, formatting)
2. Create separate files for each concern
3. Move related functions to appropriate files
4. Create index.ts to re-export everything
5. Update imports in feature files

### Task: Update Documentation After Session

**Always update docs/current-work.md**:

```markdown
# Current Work

**Last Updated**: 2025-11-23 14:30
**Session**: Implementing library feature

## ✅ Completed
- [x] Created library feature structure
- [x] Implemented LibraryScreen with grid/list toggle
- [x] Added BookCard component with progress bar
- [x] Created useLibrary hook with TanStack Query

## ⏳ In Progress
- [ ] Add filters (genre, status)
- [ ] Implement sorting (title, author, recent)

## 📝 Next Steps
1. Complete filter UI in FilterSheet component
2. Add sorting dropdown to LibraryScreen header
3. Test with various library sizes
4. Add loading and error states

## 🚫 Blockers
None

## 💡 Decisions Made
- Using FlatList with virtualization for performance
- Caching library data for 5 minutes
- Default view is grid, persisted in async storage

## 📂 Files Modified
- src/features/library/screens/LibraryScreen.tsx (new, 280 lines)
- src/features/library/components/BookCard.tsx (new, 120 lines)
- src/features/library/hooks/useLibrary.ts (new, 45 lines)
- src/features/library/index.ts (updated exports)
```

---

## Testing Strategy

### What to Test

#### Unit Tests (Priority: High)
```typescript
// Test business logic in services
describe('libraryService', () => {
  describe('sortBooks', () => {
    it('sorts books by title alphabetically', () => {
      const books = [
        { title: 'Zebra' },
        { title: 'Apple' },
      ];
      const sorted = sortBooks(books, 'title');
      expect(sorted[0].title).toBe('Apple');
    });
  });
});

// Test utility functions
describe('formatDuration', () => {
  it('formats seconds as HH:MM:SS', () => {
    expect(formatDuration(3661)).toBe('01:01:01');
  });
});
```

#### Integration Tests (Priority: Medium)
```typescript
// Test API client
describe('API Client', () => {
  it('fetches book details with authentication', async () => {
    const book = await getBook('book-id');
    expect(book).toHaveProperty('id');
    expect(book).toHaveProperty('title');
  });

  it('throws error when book not found', async () => {
    await expect(getBook('invalid-id')).rejects.toThrow();
  });
});
```

#### Component Tests (Priority: Low)
```typescript
// Test custom hooks
describe('useBookDetails', () => {
  it('fetches and caches book details', async () => {
    const { result } = renderHook(() => useBookDetails('book-id'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveProperty('title');
  });
});
```

### What NOT to Test (Yet)
- UI components (use manual testing for now)
- Navigation flows
- End-to-end user journeys
- Visual regression

### Testing Commands
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test libraryService.test.ts

# Generate coverage report
npm test -- --coverage
```

---

## Documentation Reference

### Essential Documentation Files

| File | Purpose | When to Read |
|------|---------|--------------|
| **docs/current-work.md** | Active work tracker | **Every session start** |
| **docs/IMPLEMENTATION_SUMMARY.md** | Stage 1 & 2 implementation details | When understanding what's been built |
| **docs/api-usage-examples.md** | API client usage examples | When using the API client |
| **docs/architecture.md** | System design and structure | When understanding architecture |
| **docs/claude-instructions.md** | Detailed dev guidelines | When writing code |
| **docs/api-reference.md** | API endpoint documentation | When adding API calls |
| **docs/decisions.md** | Architectural decisions | When making architecture choices |
| **docs/features/*.md** | Feature-specific docs | When working on that feature |

### Quick Reference Links

#### Architecture Decisions
- **ADR-001**: React Native + Expo (framework choice)
- **ADR-002**: Zustand + TanStack Query (state management)
- **ADR-003**: Feature-based architecture (code organization)
- **ADR-004**: Fuse.js (search implementation)

#### External Documentation
- [AudiobookShelf API](https://api.audiobookshelf.org/) - Server API reference
- [React Navigation](https://reactnavigation.org/) - Navigation library
- [TanStack Query](https://tanstack.com/query/latest) - Data fetching
- [Expo Documentation](https://docs.expo.dev/) - Expo APIs and guides
- [React Native](https://reactnative.dev/) - Framework docs

---

## AI-Specific Guidance

### Context Management (File Size Limit)

**Why 400 lines?**
- Fits comfortably in AI context window
- Easier to understand and modify in single session
- Forces good separation of concerns

**How to enforce:**
```bash
# Check file sizes before committing
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -n | tail -20
```

**When to split:**
- File approaches 350 lines → Start planning split
- File exceeds 400 lines → MUST split before adding more

### Optimal Workflow for Claude

1. **Session Start**:
   - Read `docs/current-work.md` first
   - Read relevant feature docs
   - Understand current goal

2. **During Development**:
   - Work on ONE feature at a time
   - Keep files under 400 lines
   - Use explicit imports
   - Add "why" comments for complex logic

3. **Before Committing**:
   - Format code: `npm run format`
   - Check types: `npm run tsc`
   - Lint code: `npm run lint`

4. **Session End**:
   - Update `docs/current-work.md`
   - Update feature docs if needed
   - Commit with descriptive message

### Common Pitfalls to Avoid

❌ **Don't**:
- Import from other features (only core, shared, config)
- Use `any` types (use `unknown` or define proper types)
- Create files over 400 lines
- Hardcode values (use config/)
- Skip error handling
- Forget loading/error states
- Make cross-cutting changes without plan

✅ **Do**:
- Keep features self-contained
- Use TypeScript everywhere
- Handle errors gracefully
- Show loading states
- Update documentation
- Ask questions when unsure

### Troubleshooting

#### "Can't find module '@/core/...'"
- Check tsconfig.json has path aliases configured
- Verify file exists at expected location
- Use explicit relative imports if needed

#### "File too large for context"
- Split file into smaller modules
- Extract utilities to shared/
- Separate business logic from UI

#### "Unclear where code should go"
- **Core**: Infrastructure used by multiple features
- **Shared**: Reusable UI and utilities
- **Feature**: Business logic specific to one feature
- **Config**: Constants and feature flags

---

## Quick Command Reference

```bash
# Development
npm start              # Start Expo dev server
npm run android        # Run on Android
npm run ios            # Run on iOS
npm run web            # Run in web browser

# Code Quality
npm run tsc            # TypeScript type check
npm run lint           # ESLint validation
npm run format         # Prettier formatting

# Debugging
npm start -- --clear   # Clear cache and restart
```

---

## Summary: Key Principles

1. **Feature-Based Architecture**: Self-contained features, no cross-feature imports
2. **File Size Discipline**: Maximum 400 lines per file
3. **TypeScript Everywhere**: No `any` types, explicit imports
4. **State Management**: Server state (TanStack Query), Global state (Zustand), Local state (useState)
5. **Error Handling**: Try/catch for async, loading/error states for UI
6. **Documentation**: Update docs/current-work.md after every session
7. **Code Quality**: Format, lint, type-check before committing

---

**This document is a living guide. Update it as the project evolves.**
