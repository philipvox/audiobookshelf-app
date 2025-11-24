# Progress Tracker

## Complete

### Stage 1-2: Foundation
- Project setup with Expo
- TypeScript config with path aliases
- API client with auth
- Type definitions
- Theme system (colors, spacing, typography)

### Stage 3: Core Features
- Login screen with server URL input
- Auth context and token storage
- Library grid view
- Book detail screen with chapters
- Cover image loading

### Stage 4: Player
- Audio playback with expo-av
- Play/pause, seek, skip 30s
- Progress tracking and sync
- Mini player (bottom bar)
- Full-screen player modal
- Background playback

### Stage 5: Search
- Search screen with input
- Fuzzy search using Fuse.js
- Results for books, series, authors
- Recent searches

### Stage 6: Navigation
- Bottom tab navigator
- 5 tabs: Library, Search, Series, Authors, Narrators

### Stage 7 (In Progress): Discovery
- ✅ Series list with search/sort
- ✅ Series detail with books
- ✅ Authors list with search/sort
- ✅ Author detail with books
- ✅ Narrators list with search/sort (extracted from library items)
- ✅ Narrator detail with books
- ✅ FilterSortBar component (bottom sheet)
- 🎯 Browse tab (top tabs for Series/Authors/Narrators)
- 🎯 Profile tab
- 🎯 Collections

## Architecture Decisions

**Expo AV for Audio:** Background audio support built-in, simple API
**Zustand for Player State:** Lightweight, less boilerplate than Redux
**TanStack Query for Server State:** Caching, refetching, loading states
**5-minute Sync Interval:** Balance between server load and accuracy
**Local Progress Cache (AsyncStorage):** Instant resume, works offline

## Known Limitations

- No offline downloads (requires network)
- No sleep timer
- No lock screen media controls
- No bookmarks/annotations
- Narrator extraction requires loading all library items

## Remaining Work

### Stage 8: Offline
- Download management
- Offline playback
- Background downloads

### Stage 9: Polish
- Animations
- Error boundaries
- Pull to refresh everywhere
- Skeleton loaders

### Stage 10: Advanced
- Playlists
- Sleep timer
- Playback speed presets
- Chapter marks
- Bookmarks
- Lock screen controls

## File Size Reference

Large files (near 400 line limit):
- PlayerScreen.tsx: ~380 lines
- audioService.ts: ~335 lines
- playerStore.ts: ~290 lines