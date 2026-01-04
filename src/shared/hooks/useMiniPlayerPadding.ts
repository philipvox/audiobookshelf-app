/**
 * src/shared/hooks/useMiniPlayerPadding.ts
 *
 * Hook to get bottom padding when mini player is visible.
 * Use this in screen contentContainerStyle for proper scroll padding.
 */

import { usePlayerStore } from '@/features/player';
import { GLOBAL_MINI_PLAYER_HEIGHT } from '@/navigation/components/GlobalMiniPlayer';
import { BOTTOM_NAV_HEIGHT } from '@/constants/layout';

/**
 * Returns the extra bottom padding needed when mini player is showing.
 * Add this to your screen's contentContainerStyle paddingBottom.
 *
 * @example
 * const miniPlayerPadding = useMiniPlayerPadding();
 * <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + miniPlayerPadding }}>
 */
export function useMiniPlayerPadding(): number {
  const currentBook = usePlayerStore((s) => s.currentBook);
  const isPlayerVisible = usePlayerStore((s) => s.isPlayerVisible);

  // Mini player shows when there's a book loaded and full player is not visible
  const isMiniPlayerVisible = !!currentBook && !isPlayerVisible;

  return isMiniPlayerVisible ? GLOBAL_MINI_PLAYER_HEIGHT : 0;
}

/**
 * Returns total bottom padding for screen content including nav bar and mini player.
 * Convenience hook that combines nav bar height + mini player padding + safe area.
 *
 * @example
 * const bottomPadding = useScreenBottomPadding(insets.bottom);
 * <ScrollView contentContainerStyle={{ paddingBottom: bottomPadding }}>
 */
export function useScreenBottomPadding(safeAreaBottom: number = 0): number {
  const miniPlayerPadding = useMiniPlayerPadding();
  return BOTTOM_NAV_HEIGHT + miniPlayerPadding + safeAreaBottom + 16;
}
