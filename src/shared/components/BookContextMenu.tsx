/**
 * src/shared/components/BookContextMenu.tsx
 *
 * Bottom sheet context menu for book cards.
 * Triggered on long-press to show quick actions.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Download,
  Play,
  ListPlus,
  Bookmark,
  BookOpen,
  X,
  Check,
  Trash2,
  type LucideIcon,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCoverUrl } from '@/core/cache';
import { useDownloadStatus, useDownloads } from '@/core/hooks/useDownloads';
import { useQueueStore, useIsInQueue } from '@/features/queue/stores/queueStore';
import { useWishlistStore, useIsOnWishlist } from '@/features/wishlist';
import { scale, spacing, radius, accentColors, useTheme, colors, type ThemeColors } from '@/shared/theme';
import type { LibraryItem } from '@/core/types';

// Helper to extract semantic colors
function getSemanticColors(c: ThemeColors) {
  return {
    error: c.semantic.error,
    accent: colors.accent.primary,
  };
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BookContextMenuProps {
  book: LibraryItem | null;
  visible: boolean;
  onClose: () => void;
  onViewDetails?: (book: LibraryItem) => void;
  onPlay?: (book: LibraryItem) => void;
}

interface MenuItemProps {
  icon: LucideIcon;
  label: string;
  sublabel?: string;
  onPress: () => void;
  variant?: 'default' | 'accent' | 'danger';
  disabled?: boolean;
  colors: ThemeColors;
  semanticColors: { error: string; accent: string };
}

function MenuItem({ icon: Icon, label, sublabel, onPress, variant = 'default', disabled, colors, semanticColors }: MenuItemProps) {
  const getIconColor = () => {
    if (disabled) return colors.text.tertiary;
    switch (variant) {
      case 'accent':
        return semanticColors.accent;
      case 'danger':
        return semanticColors.error;
      default:
        return colors.text.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.text.tertiary;
    switch (variant) {
      case 'accent':
        return semanticColors.accent;
      case 'danger':
        return semanticColors.error;
      default:
        return colors.text.primary;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.menuItem, disabled && styles.menuItemDisabled]}
      onPress={() => {
        if (!disabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={[styles.menuItemIcon, { backgroundColor: colors.background.elevated }]}>
        <Icon size={scale(20)} color={getIconColor()} strokeWidth={2} />
      </View>
      <View style={styles.menuItemContent}>
        <Text style={[styles.menuItemLabel, { color: getTextColor() }]}>{label}</Text>
        {sublabel && <Text style={[styles.menuItemSublabel, { color: colors.text.tertiary }]}>{sublabel}</Text>}
      </View>
    </TouchableOpacity>
  );
}

export function BookContextMenu({
  book,
  visible,
  onClose,
  onViewDetails,
  onPlay,
}: BookContextMenuProps) {
  const { colors } = useTheme();
  const semanticColors = getSemanticColors(colors);
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Book state hooks
  const { isDownloaded, isDownloading } = useDownloadStatus(book?.id || '');
  const isInQueue = useIsInQueue(book?.id || '');
  const isOnWishlist = useIsOnWishlist(book?.id || '');
  const coverUrl = useCoverUrl(book?.id || '');

  // Actions
  const { queueDownload, cancelDownload, deleteDownload } = useDownloads();
  const addToQueue = useQueueStore((s) => s.addToQueue);
  const removeFromQueue = useQueueStore((s) => s.removeFromQueue);
  const addFromLibraryItem = useWishlistStore((s) => s.addFromLibraryItem);
  const removeItem = useWishlistStore((s) => s.removeItem);
  const getWishlistItemByLibraryId = useWishlistStore((s) => s.getWishlistItemByLibraryId);

  // Animate in/out
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  const handleDownload = useCallback(() => {
    if (book) {
      queueDownload(book);
      onClose();
    }
  }, [book, queueDownload, onClose]);

  const handleCancelDownload = useCallback(() => {
    if (book) {
      cancelDownload(book.id);
      onClose();
    }
  }, [book, cancelDownload, onClose]);

  const handleDeleteDownload = useCallback(() => {
    if (book) {
      deleteDownload(book.id);
      onClose();
    }
  }, [book, deleteDownload, onClose]);

  const handleQueueToggle = useCallback(() => {
    if (!book) return;
    if (isInQueue) {
      removeFromQueue(book.id);
    } else {
      addToQueue(book);
    }
    onClose();
  }, [book, isInQueue, addToQueue, removeFromQueue, onClose]);

  const handleWishlistToggle = useCallback(() => {
    if (!book) return;
    if (isOnWishlist) {
      const wishlistItem = getWishlistItemByLibraryId(book.id);
      if (wishlistItem) {
        removeItem(wishlistItem.id);
      }
    } else {
      addFromLibraryItem(book.id);
    }
    onClose();
  }, [book, isOnWishlist, addFromLibraryItem, removeItem, getWishlistItemByLibraryId, onClose]);

  const handleViewDetails = useCallback(() => {
    if (book && onViewDetails) {
      onViewDetails(book);
      onClose();
    }
  }, [book, onViewDetails, onClose]);

  const handlePlay = useCallback(() => {
    if (book && onPlay) {
      onPlay(book);
      onClose();
    }
  }, [book, onPlay, onClose]);

  if (!book) return null;

  const metadata = book.media?.metadata as any;
  const title = metadata?.title || 'Untitled';
  const author = metadata?.authorName || metadata?.authors?.[0]?.name || 'Unknown Author';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.sheet,
                { paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.background.elevated },
                { transform: [{ translateY: slideAnim }] },
              ]}
            >
              {/* Handle bar */}
              <View style={[styles.handleBar, { backgroundColor: colors.border.default }]} />

              {/* Book header */}
              <View style={[styles.header, { borderBottomColor: colors.border.default }]}>
                <Image source={coverUrl} style={[styles.cover, { backgroundColor: colors.background.primary }]} contentFit="cover" />
                <View style={styles.headerInfo}>
                  <Text style={[styles.title, { color: colors.text.primary }]} numberOfLines={2}>{title}</Text>
                  <Text style={[styles.author, { color: colors.text.secondary }]} numberOfLines={1}>{author}</Text>
                </View>
                <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.background.secondary }]} onPress={handleClose}>
                  <X size={scale(20)} color={colors.text.secondary} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              {/* Menu items */}
              <View style={styles.menuItems}>
                {/* Play - only if downloaded */}
                {isDownloaded && onPlay && (
                  <MenuItem
                    icon={Play}
                    label="Play"
                    sublabel="Start listening now"
                    onPress={handlePlay}
                    variant="accent"
                    colors={colors}
                    semanticColors={semanticColors}
                  />
                )}

                {/* Download/Cancel/Delete */}
                {!isDownloaded && !isDownloading && (
                  <MenuItem
                    icon={Download}
                    label="Download"
                    sublabel="Save for offline listening"
                    onPress={handleDownload}
                    colors={colors}
                    semanticColors={semanticColors}
                  />
                )}
                {isDownloading && (
                  <MenuItem
                    icon={X}
                    label="Cancel Download"
                    sublabel="Stop the current download"
                    onPress={handleCancelDownload}
                    variant="danger"
                    colors={colors}
                    semanticColors={semanticColors}
                  />
                )}
                {isDownloaded && (
                  <MenuItem
                    icon={Trash2}
                    label="Delete Download"
                    sublabel="Remove from device"
                    onPress={handleDeleteDownload}
                    variant="danger"
                    colors={colors}
                    semanticColors={semanticColors}
                  />
                )}

                {/* Queue - only if downloaded */}
                {isDownloaded && (
                  <MenuItem
                    icon={isInQueue ? Check : ListPlus}
                    label={isInQueue ? 'Remove from Queue' : 'Add to Queue'}
                    sublabel={isInQueue ? 'Already in your queue' : 'Listen to this next'}
                    onPress={handleQueueToggle}
                    variant={isInQueue ? 'accent' : 'default'}
                    colors={colors}
                    semanticColors={semanticColors}
                  />
                )}

                {/* Wishlist */}
                <MenuItem
                  icon={Bookmark}
                  label={isOnWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
                  sublabel={isOnWishlist ? 'Already saved' : 'Save for later'}
                  onPress={handleWishlistToggle}
                  variant={isOnWishlist ? 'accent' : 'default'}
                  colors={colors}
                  semanticColors={semanticColors}
                />

                {/* View Details */}
                {onViewDetails && (
                  <MenuItem
                    icon={BookOpen}
                    label="View Details"
                    sublabel="See full book information"
                    onPress={handleViewDetails}
                    colors={colors}
                    semanticColors={semanticColors}
                  />
                )}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  handleBar: {
    width: scale(36),
    height: scale(4),
    borderRadius: scale(2),
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    marginBottom: spacing.sm,
  },
  cover: {
    width: scale(50),
    height: scale(50),
    borderRadius: radius.sm,
  },
  headerInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: scale(15),
    fontWeight: '600',
    marginBottom: scale(2),
  },
  author: {
    fontSize: scale(13),
  },
  closeButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItems: {
    paddingVertical: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(14),
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: scale(15),
    fontWeight: '500',
    marginBottom: scale(2),
  },
  menuItemSublabel: {
    fontSize: scale(12),
  },
});

export default BookContextMenu;
