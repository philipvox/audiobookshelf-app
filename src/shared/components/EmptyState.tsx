/**
 * src/shared/components/EmptyState.tsx
 *
 * Empty state display with optional action.
 * NN/g: Clear guidance on what to do next.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, ViewStyle } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

// Built-in icon components
const BookIcon = ({ size = 64, color = 'rgba(255,255,255,0.3)' }: { size?: number; color?: string }) => (
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

const SearchIcon = ({ size = 64, color = 'rgba(255,255,255,0.3)' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth={1.5} />
    <Path d="M21 21l-4.35-4.35" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

const HeartIcon = ({ size = 64, color = 'rgba(255,255,255,0.3)' }: { size?: number; color?: string }) => (
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

const DownloadIcon = ({ size = 64, color = 'rgba(255,255,255,0.3)' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M7 10l5 5 5-5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 15V3" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ListIcon = ({ size = 64, color = 'rgba(255,255,255,0.3)' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth={1.5} />
    <Rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth={1.5} />
    <Rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth={1.5} />
    <Rect x="14" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth={1.5} />
  </Svg>
);

export type EmptyStateIcon = 'book' | 'search' | 'heart' | 'download' | 'list';

const ICONS: Record<EmptyStateIcon, React.FC<{ size?: number; color?: string }>> = {
  book: BookIcon,
  search: SearchIcon,
  heart: HeartIcon,
  download: DownloadIcon,
  list: ListIcon,
};

interface EmptyStateProps {
  /** Main message/title */
  title: string;
  /** Built-in icon name or custom React node */
  icon?: EmptyStateIcon | React.ReactNode;
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
    if (typeof icon === 'string' && icon in ICONS) {
      const IconComponent = ICONS[icon as EmptyStateIcon];
      return <IconComponent size={scale(64)} />;
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
    padding: scale(24),
  },
  fullScreen: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  iconContainer: {
    marginBottom: scale(20),
  },
  title: {
    fontSize: scale(18),
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: scale(8),
  },
  description: {
    fontSize: scale(14),
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    lineHeight: scale(20),
    maxWidth: scale(280),
    marginBottom: scale(24),
  },
  // NN/g: 44px minimum touch targets
  actionButton: {
    backgroundColor: '#F4B60C',
    paddingVertical: scale(14),
    paddingHorizontal: scale(28),
    borderRadius: scale(12),
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  actionButtonText: {
    fontSize: scale(15),
    fontWeight: '600',
    color: '#000000',
  },
  secondaryButton: {
    paddingVertical: scale(12),
    paddingHorizontal: scale(24),
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: scale(14),
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
