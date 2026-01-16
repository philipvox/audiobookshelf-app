/**
 * src/shared/components/SkullLoadingSpinner.tsx
 *
 * Legacy skull loading spinner component.
 * Now wraps the unified Loading component for backward compatibility.
 *
 * @deprecated Use Loading component instead:
 *   import { Loading } from '@/shared/components';
 */

import React from 'react';
import { Loading } from './Loading';

interface SkullLoadingSpinnerProps {
  /** Optional loading text to display below the animation */
  text?: string;
  /** Size of the spinner (height in scaled pixels) */
  size?: number;
  /** Override color of the skull and flame */
  color?: string;
  /** If true, takes full screen height. If false, inline mode (default: true) */
  fullScreen?: boolean;
}

/**
 * @deprecated Use Loading component instead
 *
 * @example
 * // Old way (deprecated)
 * <SkullLoadingSpinner text="Loading..." />
 *
 * // New way
 * import { Loading } from '@/shared/components';
 * <Loading text="Loading..." />
 *
 * // For inline mode
 * <Loading mode="inline" />
 */
export function SkullLoadingSpinner({
  text,
  size = 80,
  color,
  fullScreen = true,
}: SkullLoadingSpinnerProps) {
  return (
    <Loading
      mode={fullScreen ? 'fullScreen' : 'inline'}
      text={text}
      size={size}
      color={color}
    />
  );
}

export default SkullLoadingSpinner;
