/**
 * src/shared/components/LoadingSpinner.tsx
 *
 * Legacy loading spinner component.
 * Now wraps the unified Loading component for backward compatibility.
 *
 * @deprecated Use Loading component instead:
 *   import { Loading } from '@/shared/components';
 */

import React from 'react';
import { Loading } from './Loading';

interface LoadingSpinnerProps {
  text?: string;
  size?: 'small' | 'large';
  color?: string;
  /** @deprecated variant prop is ignored - all loading uses unified style */
  variant?: 'default' | 'skull';
}

/**
 * @deprecated Use Loading component instead
 *
 * @example
 * // Old way (deprecated)
 * <LoadingSpinner text="Loading..." />
 *
 * // New way
 * import { Loading } from '@/shared/components';
 * <Loading text="Loading..." />
 */
export function LoadingSpinner({
  text,
  size = 'large',
  color,
}: LoadingSpinnerProps) {
  return (
    <Loading
      mode="fullScreen"
      text={text}
      size={size === 'large' ? 80 : 48}
      color={color}
    />
  );
}

export default LoadingSpinner;
