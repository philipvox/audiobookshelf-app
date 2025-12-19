/**
 * Icon component wrapper for consistent icon usage
 * Uses Lucide icons as the primary icon set
 */

import React from 'react';
import * as LucideIcons from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '@/shared/theme';

interface IconProps {
  name: keyof typeof LucideIcons;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 24, color = colors.textPrimary, strokeWidth = 2 }: IconProps) {
  const IconComponent = LucideIcons[name] as LucideIcon;

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in Lucide icons`);
    return null;
  }

  return <IconComponent size={size} color={color} strokeWidth={strokeWidth} />;
}

export { LucideIcons };
export type { LucideIcon };