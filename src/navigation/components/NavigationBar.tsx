/**
 * src/navigation/components/NavigationBar.tsx
 *
 * Re-exports FloatingTabBar as NavigationBar for backward compatibility.
 * Uses the Figma-based design with gradient, Search | Player | Home buttons.
 */

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/shared/theme';
import { FloatingTabBar } from './FloatingTabBar';

export { FloatingTabBar as NavigationBar };

// Tab bar height constant (iOS: 49pt, Android: 56dp, we use 52)
const TAB_BAR_HEIGHT = 52;

/** Total height of navigation bar (for content padding) */
export function useNavigationBarHeight(): number {
  const insets = useSafeAreaInsets();
  // Safe area already handles home indicator, just add minimal buffer
  const bottomPadding = Math.max(insets.bottom, spacing.md);
  return TAB_BAR_HEIGHT + bottomPadding;
}
