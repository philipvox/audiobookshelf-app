/**
 * src/shared/components/EmptyState.tsx
 *
 * Empty state display with optional action.
 * NN/g: Clear guidance on what to do next.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import {
  colors,
  spacing,
  radius,
  layout,
  typography,
  scale,
} from '@/shared/theme';

// Built-in icon components
const BookIcon = ({ size = 64, color = colors.textMuted }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 19.5A2.5 2.5 0 016.5 17H20"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const SearchIcon = ({ size = 64, color = colors.textMuted }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth={1.5} />
    <Path d="M21 21l-4.35-4.35" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

const HeartIcon = ({ size = 64, color = colors.textMuted }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const DownloadIcon = ({ size = 64, color = colors.textMuted }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M7 10l5 5 5-5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 15V3" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ListIcon = ({ size = 64, color = colors.textMuted }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth={1.5} />
    <Rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth={1.5} />
    <Rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth={1.5} />
    <Rect x="14" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth={1.5} />
  </Svg>
);

const UserIcon = ({ size = 64, color = colors.textMuted }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={1.5} />
    <Path
      d="M4 20c0-3.314 3.134-6 7-6h2c3.866 0 7 2.686 7 6"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </Svg>
);

const MicIcon = ({ size = 64, color = colors.textMuted }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="9" y="2" width="6" height="11" rx="3" stroke={color} strokeWidth={1.5} />
    <Path d="M5 10a7 7 0 0014 0" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Path d="M12 17v4M8 21h8" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

const LibraryIcon = ({ size = 64, color = colors.textMuted }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="4" y="4" width="4" height="16" rx="1" stroke={color} strokeWidth={1.5} />
    <Rect x="10" y="4" width="4" height="16" rx="1" stroke={color} strokeWidth={1.5} />
    <Rect x="16" y="4" width="4" height="16" rx="1" stroke={color} strokeWidth={1.5} />
  </Svg>
);

const CelebrateIcon = ({ size = 64, color = colors.textMuted }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5.8 11.3L2 22l10.7-3.8" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M4 3v.01M22 8v.01M18 2v.01M15 3v.01M20 14v.01" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M8.5 8.5l-1-1M6.5 12.5l-1-1M12.5 6.5l-1-1" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Path d="M9 6a6 6 0 019 9" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

const CollectionIcon = ({ size = 64, color = colors.textMuted }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth={1.5} />
    <Path d="M3 9h18M9 21V9" stroke={color} strokeWidth={1.5} />
  </Svg>
);

export type EmptyStateIcon =
  | 'book'
  | 'search'
  | 'heart'
  | 'download'
  | 'list'
  | 'user'
  | 'mic'
  | 'library'
  | 'celebrate'
  | 'collection';

const ICONS: Record<EmptyStateIcon, React.FC<{ size?: number; color?: string }>> = {
  book: BookIcon,
  search: SearchIcon,
  heart: HeartIcon,
  download: DownloadIcon,
  list: ListIcon,
  user: UserIcon,
  mic: MicIcon,
  library: LibraryIcon,
  celebrate: CelebrateIcon,
  collection: CollectionIcon,
};

// Emoji to icon mapping for backward compatibility
const EMOJI_TO_ICON: Record<string, EmptyStateIcon> = {
  '📚': 'library',
  '📖': 'book',
  '🔍': 'search',
  '👤': 'user',
  '🎙️': 'mic',
  '❤️': 'heart',
  '🎉': 'celebrate',
  '📁': 'collection',
};

interface EmptyStateProps {
  /** Main message/title */
  title: string;
  /** Built-in icon name, emoji (auto-mapped), or custom React node */
  icon?: EmptyStateIcon | string | React.ReactNode;
  /** Optional description below the title */
  description?: string;
  /** Action button title */
  actionTitle?: string;
  /** Action button callback */
  onAction?: () => void;
  /** Secondary action title */
  secondaryActionTitle?: string;
  /** Secondary action callback */
  onSecondaryAction?: () => void;
  /** Whether to take full screen height */
  fullScreen?: boolean;
  /** Custom container style */
  style?: ViewStyle;
}

/**
 * Display an empty state with icon, message, and optional actions.
 * NN/g: Always provide clear next steps for users.
 */
export function EmptyState({
  title,
  icon = 'book',
  description,
  actionTitle,
  onAction,
  secondaryActionTitle,
  onSecondaryAction,
  fullScreen = true,
  style,
}: EmptyStateProps) {
  const renderIcon = () => {
    if (typeof icon === 'string') {
      // Check if it's a valid icon name
      if (icon in ICONS) {
        const IconComponent = ICONS[icon as EmptyStateIcon];
        return <IconComponent size={scale(64)} />;
      }
      // Check if it's an emoji that can be mapped
      if (icon in EMOJI_TO_ICON) {
        const mappedIcon = EMOJI_TO_ICON[icon];
        const IconComponent = ICONS[mappedIcon];
        return <IconComponent size={scale(64)} />;
      }
      // Fallback for any unrecognized string (including unknown emojis)
      return <BookIcon size={scale(64)} />;
    }
    if (React.isValidElement(icon)) {
      return icon;
    }
    return <BookIcon size={scale(64)} />;
  };

  return (
    <View style={[styles.container, fullScreen && styles.fullScreen, style]}>
      <View style={styles.iconContainer}>
        {renderIcon()}
      </View>

      <Text style={styles.title}>{title}</Text>

      {description && (
        <Text style={styles.description}>{description}</Text>
      )}

      {(actionTitle && onAction) && (
        <Pressable style={styles.actionButton} onPress={onAction}>
          <Text style={styles.actionButtonText}>{actionTitle}</Text>
        </Pressable>
      )}

      {(secondaryActionTitle && onSecondaryAction) && (
        <Pressable style={styles.secondaryButton} onPress={onSecondaryAction}>
          <Text style={styles.secondaryButtonText}>{secondaryActionTitle}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: colors.backgroundTertiary,
  },
  iconContainer: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.displaySmall,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.bodyMedium,
    color: colors.textTertiary,
    textAlign: 'center',
    maxWidth: scale(280),
    marginBottom: spacing.xxl,
  },
  // NN/g: 44px minimum touch targets
  actionButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['3xl'],
    borderRadius: radius.card,
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  actionButtonText: {
    ...typography.labelLarge,
    fontWeight: '600',
    color: colors.backgroundPrimary,
  },
  secondaryButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...typography.bodyMedium,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});
