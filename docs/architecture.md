# Architecture

## Directory Structure
```
src/
├── config/
│   ├── constants.ts      # API URLs, timeouts
│   └── features.ts       # Feature flags
├── core/
│   ├── api/
│   │   ├── baseClient.ts # HTTP client with auth
│   │   ├── client.ts     # API methods
│   │   └── endpoints.ts  # URL definitions
│   ├── auth/
│   │   ├── authContext.tsx
│   │   └── authService.ts
│   ├── storage/
│   │   ├── cache.ts
│   │   └── database.ts
│   └── types/
│       ├── api.ts        # Request/response types
│       ├── library.ts    # LibraryItem, Collection
│       ├── media.ts      # MediaProgress, PlaybackSession
│       ├── metadata.ts   # Author, Series
│       └── user.ts
├── features/
│   ├── author/
│   ├── book-detail/
│   ├── library/
│   ├── narrator/
│   ├── player/
│   ├── search/
│   └── series/
├── navigation/
│   └── AppNavigator.tsx
└── shared/
    ├── components/       # Button, Card, Icon, etc.
    └── theme/            # colors, spacing, typography
```

## Navigation Structure
```
Stack Navigator (root)
├── Login (unauthenticated)
└── Main (authenticated)
    ├── Tab Navigator
    │   ├── LibraryTab → LibraryItemsScreen
    │   ├── SearchTab → SearchScreen
    │   ├── SeriesTab → SeriesListScreen
    │   ├── AuthorsTab → AuthorListScreen
    │   └── NarratorsTab → NarratorListScreen
    ├── BookDetail (modal)
    ├── SeriesDetail (modal)
    ├── AuthorDetail (modal)
    ├── NarratorDetail (modal)
    └── PlayerScreen (fullscreen modal)
```

## Data Flow

1. **API Client** (`core/api/client.ts`) - singleton, handles auth headers
2. **React Query** - caching, refetching, loading states
3. **Custom Hooks** - `useLibraryItems`, `useSeries`, etc.
4. **Screens** - consume hooks, render UI

## Player Architecture

- **playerStore** (Zustand) - current track, position, isPlaying
- **audioService** - expo-av wrapper, playback control
- **progressService** - sync progress to server
- **MiniPlayer** - always visible when playing
- **PlayerScreen** - fullscreen modal

## Key Types
```ts
interface LibraryItem {
  id: string;
  libraryId: string;
  media: { metadata: BookMetadata; audioFiles: AudioFile[] };
}

interface BookMetadata {
  title: string;
  authorName: string;
  narratorName: string;
  seriesName: string;
  genres: string[];
}
```