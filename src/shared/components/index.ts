/**
 * Public API exports for shared components
 *
 * Only re-exports that are actually imported from '@/shared/components'
 * elsewhere in the codebase. Components not listed here can still be
 * imported directly from their own file (e.g. '@/shared/components/BookCard').
 */

// =============================================================================
// LOADING
// =============================================================================
export { Loading } from './Loading';
export type { LoadingProps, LoadingMode } from './Loading';

// Custom pull-to-refresh with skull animation
export { SkullRefreshControl } from './SkullRefreshControl';
export type { SkullRefreshControlProps } from './SkullRefreshControl';

// Screen loading overlay (initial load)
export { ScreenLoadingOverlay } from './ScreenLoadingOverlay';

// Global loading overlay (triggered from buttons before navigation)
export { GlobalLoadingOverlay } from './GlobalLoadingOverlay';

// =============================================================================
// FEEDBACK & STATES
// =============================================================================
export { ErrorView } from './ErrorView';
export type { ErrorType } from './ErrorView';
export { EmptyState } from './EmptyState';
export type { EmptyStateIcon } from './EmptyState';

// =============================================================================
// ICONS (only the AppIcons actually imported from this barrel)
// =============================================================================
export {
  HeartIcon as HeartIconSvg,
  UserIcon,
  MicIcon,
  BookIcon,
} from './AppIcons';

// =============================================================================
// SKELETON LOADING
// =============================================================================
export {
  SkeletonBox,
  BookCardSkeleton,
  SectionSkeleton,
  AuthorRowSkeleton,
  SearchResultsSkeleton,
} from './Skeleton';

// =============================================================================
// INTERACTIVE BUTTONS
// =============================================================================
export { SeriesHeartButton } from './SeriesHeartButton';
export type { SeriesHeartButtonProps } from './SeriesHeartButton';

// =============================================================================
// NAVIGATION
// =============================================================================
export { AlphabetScrubber } from './AlphabetScrubber';

// =============================================================================
// PROGRESS INDICATORS
// =============================================================================
export { SeriesProgressBadge } from './SeriesProgressBadge';

// =============================================================================
// NETWORK STATUS
// =============================================================================
export { NetworkStatusBar } from './NetworkStatusBar';

// =============================================================================
// SNACKBAR / TOAST
// =============================================================================
export { Snackbar, useSnackbar } from './Snackbar';
export type { SnackbarProps } from './Snackbar';

// =============================================================================
// CONTEXT MENUS
// =============================================================================
export { BookContextMenuProvider, useBookContextMenu } from './BookContextMenuProvider';

// =============================================================================
// GLOBAL TOAST
// =============================================================================
export { ToastContainer } from './ToastContainer';

// =============================================================================
// TOP NAVIGATION
// =============================================================================
export {
  TopNav,
  SearchIcon as TopNavSearchIcon,
  CloseIcon as TopNavCloseIcon,
  BackIcon as TopNavBackIcon,
  ShareIcon as TopNavShareIcon,
} from './TopNav';
export type { TopNavProps, TopNavPill, TopNavCircleButton, TopNavVariant, TopNavSearchConfig } from './TopNav';

// =============================================================================
// COLLAPSIBLE SECTIONS
// =============================================================================
export { CollapsibleSection } from './CollapsibleSection';
export type { CollapsibleSectionProps } from './CollapsibleSection';

// =============================================================================
// NOTICE MODALS
// =============================================================================
export { LocalStorageNoticeModal } from './LocalStorageNoticeModal';

// =============================================================================
// COACH MARKS (First-run onboarding overlay)
// =============================================================================
export { CoachMarksOverlay } from './CoachMarksOverlay';
