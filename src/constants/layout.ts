/**
 * src/constants/layout.ts
 *
 * Layout constants for consistent spacing across the app.
 */

import { Dimensions } from 'react-native';
import { scale } from '@/shared/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const _hp = (percentage: number) => (percentage / 100) * SCREEN_HEIGHT;

// Top navigation is an overlay with gradient, so screens only need
// a small buffer below safe area insets (not the full nav height)
export const TOP_NAV_HEIGHT = 8;

// Bottom navigation height — FloatingTabBar removed, TopNav handles navigation
export const BOTTOM_NAV_HEIGHT = 0;

// Mini player height when visible (matches GlobalMiniPlayer's GLOBAL_MINI_PLAYER_HEIGHT)
export const MINI_PLAYER_HEIGHT = scale(110);

// Combined bottom spacing needed for screens
export const BOTTOM_TAB_HEIGHT = 8; // Just padding (no bottom nav)
export const BOTTOM_PLAYER_OFFSET = MINI_PLAYER_HEIGHT + 8; // Mini player when visible

// Total bottom padding for scroll content (mini player + padding)
// Use this in contentContainerStyle: { paddingBottom: SCREEN_BOTTOM_PADDING + insets.bottom }
export const SCREEN_BOTTOM_PADDING = MINI_PLAYER_HEIGHT + 50;

// Combined header offset for screens (just a small buffer since nav is overlay)
// This is used as padding-top for scroll content
export const SCREEN_TOP_OFFSET = TOP_NAV_HEIGHT + 8;
