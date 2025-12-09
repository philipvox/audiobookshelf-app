# Analysis Findings

## Summary

| Area | Count |
|------|-------|
| Unused exports | 837 total entries |
| Circular dependencies | 1 cycle (types) |
| Largest feature | player (15,082 lines, 40 components) |
| Second largest | home (5,589 lines, 22 components) |

## Feature Sizes (lines of code)
1. player: 15,082 lines, 40 components
2. home: 5,589 lines, 22 components
3. library: 3,060 lines, 10 components
4. search: 2,461 lines, 4 components
5. book-detail: 2,230 lines, 8 components
6. stats: 1,664 lines, 2 components
7. queue: 1,165 lines, 4 components
8. discover: 1,101 lines, 4 components
9. downloads: 1,023 lines, 2 components
10. recommendations: 1,021 lines, 2 components

## Circular Dependencies
- `core/types/library.ts > core/types/media.ts > core/types/metadata.ts`

## Duplicate Hooks to Consolidate
- [x] useSeries + useLibrarySeries → useLibrarySeries is NOT used anywhere
- [x] useAuthors + useLibraryAuthors → useLibraryAuthors is NOT used anywhere

## Unused Player Components (confirmed)
- [x] PlayerDisplay.tsx - Not imported anywhere
- [x] PlayerButton.tsx - Not imported anywhere
- [x] CassetteTape.tsx - Not imported anywhere
- [x] GlassPanel.tsx - Only imported by PlayerDisplay (which is unused)
- [x] audioScrubber.tsx - Not imported anywhere
- [x] PlayerControls.tsx - Not imported anywhere (PlaybackControls is used instead)

## PlaybackControls Usage
- PlaybackControls from home/components used by PlayerModule.tsx
- PlaybackControls from player/components - need to check

## Features Status
- home: USED in navigation (HomeTab)
- recommendations: USED in navigation (Preferences, PreferencesOnboarding screens)
- playlists: EMPTY (0 lines) - candidate for removal

## Duplicate File Names
- FloatingPlayerNav.tsx (2 copies)
- PlaybackControls.tsx (2 copies)
- SeriesCard.tsx (2 copies)
- SeriesListScreen.tsx (2 copies)
