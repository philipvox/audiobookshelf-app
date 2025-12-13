/**
 * src/constants/layout.ts
 *
 * Layout constants for consistent spacing across the app.
 */

import { Platform, Dimensions } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const hp = (percentage: number) => (percentage / 100) * SCREEN_HEIGHT;

// Top navigation is an overlay with gradient, so screens only need
// a small buffer below safe area insets (not the full nav height)
export const TOP_NAV_HEIGHT = 8;

// Bottom navigation bar height (FloatingTabBar)
export const BOTTOM_NAV_HEIGHT = 86;

// Mini player height when visible
export const MINI_PLAYER_HEIGHT = hp(8); // ~64px

// Combined bottom spacing needed for screens
// Nav bar + mini player + extra padding for comfortable scrolling
export const BOTTOM_TAB_HEIGHT = BOTTOM_NAV_HEIGHT + 16; // Just nav bar + padding
export const BOTTOM_PLAYER_OFFSET = MINI_PLAYER_HEIGHT + 12; // Mini player when visible

// Total bottom padding for scroll content (nav + mini player + padding)
// Use this in contentContainerStyle: { paddingBottom: SCREEN_BOTTOM_PADDING + insets.bottom }
export const SCREEN_BOTTOM_PADDING = BOTTOM_NAV_HEIGHT + MINI_PLAYER_HEIGHT + 24;

// Combined header offset for screens (just a small buffer since nav is overlay)
// This is used as padding-top for scroll content
export const SCREEN_TOP_OFFSET = TOP_NAV_HEIGHT + 8;
