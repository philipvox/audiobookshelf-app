# AudiobookShelf Mobile App

React Native/Expo app for AudiobookShelf server.

## Current Status (Stage 7 Complete)

**Complete:**
- ✅ Auth (login, token storage, context)
- ✅ Library browsing with grid view
- ✅ Book detail with chapters
- ✅ Audio player (play/pause, seek, progress sync)
- ✅ Mini player with full-screen modal
- ✅ Search with fuzzy matching
- ✅ Series list/detail screens
- ✅ Authors list/detail screens
- ✅ Narrators list/detail screens (extracted from metadata)
- ✅ Collections list/detail screens
- ✅ Browse tab (top tabs: Series | Authors | Narrators | Collections)
- ✅ Profile tab (user info, server URL, logout)
- ✅ 4 bottom tabs: Library, Search, Browse, Profile

**Next (Stage 8):**
- 🎯 Offline downloads
- 🎯 Background download manager
- 🎯 Local storage with expo-file-system

## Tech Stack

- React Native + Expo SDK 54
- TypeScript
- React Navigation (bottom tabs + stack + top tabs)
- TanStack Query (data fetching/caching)
- Zustand (player state)
- expo-av (audio playback)

## Project Structure
```
src/
├── core/           # Foundation (api, auth, types, storage)
├── features/       # Feature modules (each self-contained)
│   ├── auth/
│   ├── authors/
│   ├── book-detail/
│   ├── browse/       # NEW: Top tabs for Series/Authors/Narrators/Collections
│   ├── collections/  # NEW: User collections
│   ├── library/
│   ├── narrators/    # NEW: Extracted from library items
│   ├── player/
│   ├── profile/      # NEW: User profile and settings
│   ├── search/
│   └── series/
├── navigation/     # AppNavigator, routes
└── shared/         # Reusable components, theme, utils
```

## Navigation Structure

```
Stack Navigator (root)
├── Login (unauthenticated)
└── Main (authenticated)
    ├── Bottom Tab Navigator (4 tabs)
    │   ├── LibraryTab → LibraryItemsScreen
    │   ├── SearchTab → SearchScreen
    │   ├── BrowseTab → BrowseScreen
    │   │   └── Top Tab Navigator
    │   │       ├── Series → SeriesListContent
    │   │       ├── Authors → AuthorsListContent
    │   │       ├── Narrators → NarratorsListContent
    │   │       └── Collections → CollectionsListContent
    │   └── ProfileTab → ProfileScreen
    ├── BookDetail (modal)
    ├── SeriesDetail (modal)
    ├── AuthorDetail (modal)
    ├── NarratorDetail (modal)
    ├── CollectionDetail (modal)
    └── PlayerScreen (fullscreen modal)
```

## Key Patterns

**Feature structure:**
```
features/{name}/
├── components/    # UI components
├── hooks/         # Data fetching hooks
├── screens/       # Screen components
├── services/      # Adapters, business logic
└── index.ts       # Public exports
```

**Data fetching:** TanStack Query with staleTime caching
**State:** Zustand for player, React Query for server state
**Navigation:** Type-safe with stack and tab navigators

## Rules

- Max 400 lines per file
- No cross-feature imports (use shared/)
- TypeScript strict mode
- Export via index.ts barrel files

## Commands
```bash
npm install        # Install dependencies (includes new top-tabs packages)
npm start          # Start Expo dev server
npm run ios        # Run on iOS simulator
npm run android    # Run on Android emulator
```

## New Dependencies (Stage 7)
```bash
npm install @react-navigation/material-top-tabs react-native-tab-view react-native-pager-view
```