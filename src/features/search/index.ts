/**
 * src/features/search/index.ts
 */

// Screens
export { SearchScreen } from './screens/SearchScreen';

// Components
export { SearchBar } from './components/SearchBar';
export { BookSimpleRow } from './components/BookSimpleRow';
export { QuickBrowseGrid } from './components/QuickBrowseGrid';
export { SearchFilterSheet } from './components/SearchFilterSheet';
export type { SearchFilterState, AvailableFilters } from './components/SearchFilterSheet';
export type { QuickBrowseCategory } from './components/QuickBrowseGrid';
export type { BookSimpleRowProps } from './components/BookSimpleRow';

// Hooks
export { useSearch } from './hooks/useSearch';
export { useServerSearch } from './hooks/useServerSearch';
export { useAllLibraryItems } from './hooks/useAllLibraryItems';

// Services
export { searchService } from './services/searchService';