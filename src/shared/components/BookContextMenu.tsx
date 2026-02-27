/**
 * src/shared/components/BookContextMenu.tsx
 *
 * Bottom sheet context menu for book cards.
 * Triggered on long-press to show quick actions.
 *
 * Layout:
 * ┌─────────────────────────────────────┐
 * │  ─── (handle bar)                   │
 * │  [Cover] Title          [X close]   │
 * │          Author                     │
 * │  ─── (divider) ────────────────     │
 * │  List items (Library, Playlist)     │
 * │  ─── (divider) ────────────────     │
 * │  [▶ Play] [⊕ Queue] [↓ DL] [📖]   │
 * │   Play     Queue    Download Details│
 * └─────────────────────────────────────┘
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Download,
  Play,
  ListPlus,
  BookOpen,
  X,
  Check,
  Trash2,
  Library,
  ListMusic,
  Plus,
  ChevronLeft,
  type LucideIcon,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCoverUrl } from '@/core/cache';
import { useDownloadStatus, useDownloads } from '@/core/hooks/useDownloads';
import { useQueueStore, useIsInQueue } from '@/features/queue/stores/queueStore';
import { useProgressStore, useIsInLibrary } from '@/core/stores/progressStore';
import { usePlayerStore } from '@/features/player/stores';
import { usePlaylists } from '@/features/playlists/hooks/usePlaylists';
import { playlistsApi } from '@/core/api/endpoints/playlists';
import { useLibraryCache } from '@/core/cache';
import { useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/shared/hooks/useToast';
import { scale, spacing, radius, useTheme, colors, type ThemeColors } from '@/shared/theme';
import type { LibraryItem, Playlist } from '@/core/types';

// Helper to extract semantic colors
function getSemanticColors(c: ThemeColors) {
  return {
    error: '#E8A020',  // Bright golden orange (matches app accent tone)
    accent: '#E8A020',  // Bright golden orange
  };
}

// SCREEN_HEIGHT now read reactively via useWindowDimensions inside the component

interface BookContextMenuProps {
  book: LibraryItem | null;
  visible: boolean;
  onClose: () => void;
  onViewDetails?: (book: LibraryItem) => void;
  playlistId?: string;
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
  const getColor = () => {
    if (disabled) return colors.text.tertiary;
    switch (variant) {
      case 'accent': return semanticColors.accent;
      case 'danger': return semanticColors.error;
      default: return colors.text.primary;
    }
  };

  const color = getColor();

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
        <Icon size={scale(20)} color={color} strokeWidth={2} />
      </View>
      <View style={styles.menuItemContent}>
        <Text style={[styles.menuItemLabel, { color }]}>{label}</Text>
        {sublabel && <Text style={[styles.menuItemSublabel, { color: colors.text.tertiary }]}>{sublabel}</Text>}
      </View>
    </TouchableOpacity>
  );
}

// =============================================================================
// QUICK ACTION BUTTON (circular icon button with label)
// =============================================================================

interface QuickActionProps {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  active?: boolean;
  variant?: 'default' | 'accent' | 'danger';
  colors: ThemeColors;
  semanticColors: { error: string; accent: string };
}

function QuickAction({ icon: Icon, label, onPress, active, variant = 'default', colors, semanticColors }: QuickActionProps) {
  const getColor = () => {
    if (active) return semanticColors.accent;
    switch (variant) {
      case 'accent': return semanticColors.accent;
      case 'danger': return semanticColors.error;
      default: return colors.text.primary;
    }
  };

  const color = getColor();
  const bgColor = active ? `${semanticColors.accent}20` : colors.background.elevated;

  return (
    <TouchableOpacity
      style={styles.quickAction}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.7}
    >
      <View style={[styles.quickActionCircle, { backgroundColor: bgColor }]}>
        <Icon size={scale(22)} color={color} strokeWidth={2} />
      </View>
      <Text style={[styles.quickActionLabel, { color: colors.text.secondary }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// =============================================================================
// PLAYLIST PICKER SUB-VIEW
// =============================================================================

function PlaylistPicker({
  book,
  onBack,
  onDone,
  themeColors,
  semanticColors,
}: {
  book: LibraryItem;
  onBack: () => void;
  onDone: (playlistName?: string, playlistId?: string) => void;
  themeColors: ThemeColors;
  semanticColors: { error: string; accent: string };
}) {
  const { data: playlists, isLoading } = usePlaylists();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const libraryId = useLibraryCache((s) => s.currentLibraryId);

  // Filter out special __sl_ playlists
  const filteredPlaylists = (playlists || []).filter(p => !p.name.startsWith('__sl_'));

  const handleAddToPlaylist = useCallback(async (playlist: Playlist) => {
    try {
      await playlistsApi.batchAdd(playlist.id, [book.id]);
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onDone(playlist.name, playlist.id);
    } catch {
      Alert.alert('Error', 'Failed to add to playlist');
    }
  }, [book.id, queryClient, onDone]);

  const handleCreatePlaylist = useCallback(async () => {
    if (!newName.trim() || !libraryId) return;
    setSubmitting(true);
    try {
      const playlist = await playlistsApi.create({
        libraryId,
        name: newName.trim(),
        items: [{ libraryItemId: book.id }],
      });
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onDone(newName.trim(), playlist.id);
    } catch {
      Alert.alert('Error', 'Failed to create playlist');
    } finally {
      setSubmitting(false);
    }
  }, [newName, libraryId, book.id, queryClient, onDone]);

  const renderPlaylistItem = useCallback(({ item }: { item: Playlist }) => {
    const itemCount = item.items?.length || 0;
    const alreadyAdded = item.items?.some((pi) => pi.libraryItemId === book.id);
    return (
      <TouchableOpacity
        style={styles.playlistRow}
        onPress={() => !alreadyAdded && handleAddToPlaylist(item)}
        disabled={alreadyAdded}
        activeOpacity={0.7}
      >
        <View style={[styles.playlistIcon, { backgroundColor: themeColors.background.elevated }]}>
          <ListMusic size={scale(18)} color={themeColors.text.secondary} strokeWidth={2} />
        </View>
        <View style={styles.playlistInfo}>
          <Text style={[styles.playlistName, { color: themeColors.text.primary }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.playlistCount, { color: themeColors.text.tertiary }]}>
            {itemCount} {itemCount === 1 ? 'book' : 'books'}
          </Text>
        </View>
        {alreadyAdded && (
          <Check size={scale(18)} color={semanticColors.accent} strokeWidth={2} />
        )}
      </TouchableOpacity>
    );
  }, [book.id, handleAddToPlaylist, themeColors, semanticColors]);

  return (
    <View>
      {/* Back header */}
      <View style={styles.playlistHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={scale(22)} color={themeColors.text.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[styles.playlistTitle, { color: themeColors.text.primary }]}>Add to Playlist</Text>
        <View style={{ width: scale(22) }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={themeColors.text.secondary} />
        </View>
      ) : (
        <FlatList
          data={filteredPlaylists}
          keyExtractor={(item) => item.id}
          renderItem={renderPlaylistItem}
          style={styles.playlistList}
          scrollEnabled={false}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: themeColors.text.tertiary }]}>No playlists yet</Text>
          }
        />
      )}

      {/* Create new playlist */}
      {creating ? (
        <View style={styles.createRow}>
          <TextInput
            style={[styles.createInput, { color: themeColors.text.primary, borderColor: themeColors.border.default }]}
            placeholder="Playlist name"
            placeholderTextColor={themeColors.text.tertiary}
            value={newName}
            onChangeText={setNewName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreatePlaylist}
          />
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: semanticColors.accent }]}
            onPress={handleCreatePlaylist}
            disabled={!newName.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={themeColors.background.primary} />
            ) : (
              <Check size={scale(18)} color={themeColors.background.primary} strokeWidth={3} />
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setCreating(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.menuItemIcon, { backgroundColor: themeColors.background.elevated }]}>
            <Plus size={scale(20)} color={themeColors.text.primary} strokeWidth={2} />
          </View>
          <View style={styles.menuItemContent}>
            <Text style={[styles.menuItemLabel, { color: themeColors.text.primary }]}>Create New Playlist</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function BookContextMenu({
  book,
  visible,
  onClose,
  onViewDetails,
  playlistId,
}: BookContextMenuProps) {
  const { colors } = useTheme();
  const semanticColors = getSemanticColors(colors);
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Toast store for undo toasts
  const addToast = useToastStore((s) => s.addToast);

  // Sub-view state
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);

  // Book state hooks
  const { isDownloaded, isDownloading } = useDownloadStatus(book?.id || '');
  const isInQueue = useIsInQueue(book?.id || '');
  const isInLibrary = useIsInLibrary(book?.id || '');
  const coverUrl = useCoverUrl(book?.id || '');

  // Actions
  const { queueDownload, cancelDownload, deleteDownload } = useDownloads();
  const addToQueue = useQueueStore((s) => s.addToQueue);
  const removeFromQueue = useQueueStore((s) => s.removeFromQueue);
  const addToLibrary = useProgressStore((s) => s.addToLibrary);
  const removeFromLibrary = useProgressStore((s) => s.removeFromLibrary);
  const loadBook = usePlayerStore((s) => s.loadBook);
  const queryClient = useQueryClient();

  // Reset sub-view when menu closes
  useEffect(() => {
    if (!visible) {
      // Delay reset so animation finishes first
      const t = setTimeout(() => setShowPlaylistPicker(false), 250);
      return () => clearTimeout(t);
    }
  }, [visible]);

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
          toValue: screenHeight,
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

  // ─── Quick Actions ─────────────────────────────────────────────────

  const handlePlay = useCallback(() => {
    if (book) {
      loadBook(book, { autoPlay: true, showPlayer: true });
      onClose();
    }
  }, [book, loadBook, onClose]);

  const handleQueueToggle = useCallback(() => {
    if (!book) return;
    if (isInQueue) {
      removeFromQueue(book.id);
      addToast({
        type: 'success',
        message: 'Removed from Queue',
        duration: 10000,
        onUndo: () => addToQueue(book),
      });
    } else {
      addToQueue(book);
      addToast({
        type: 'success',
        message: 'Added to Queue',
        duration: 10000,
        onUndo: () => removeFromQueue(book.id),
      });
    }
    onClose();
  }, [book, isInQueue, addToQueue, removeFromQueue, onClose, addToast]);

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

  const handleViewDetails = useCallback(() => {
    if (book && onViewDetails) {
      onViewDetails(book);
      onClose();
    }
  }, [book, onViewDetails, onClose]);

  // ─── List Item Actions ─────────────────────────────────────────────

  const handleLibraryToggle = useCallback(() => {
    if (!book) return;
    if (isInLibrary) {
      removeFromLibrary(book.id);
      addToast({
        type: 'success',
        message: 'Removed from Library',
        duration: 10000,
        onUndo: () => addToLibrary(book.id),
      });
    } else {
      addToLibrary(book.id);
      addToast({
        type: 'success',
        message: 'Added to Library',
        duration: 10000,
        onUndo: () => removeFromLibrary(book.id),
      });
    }
    onClose();
  }, [book, isInLibrary, addToLibrary, removeFromLibrary, onClose, addToast]);

  const handleRemoveFromPlaylist = useCallback(async () => {
    if (!book || !playlistId) return;
    try {
      await playlistsApi.batchRemove(playlistId, [book.id]);
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const bookId = book.id;
      addToast({
        type: 'success',
        message: 'Removed from Playlist',
        duration: 10000,
        onUndo: async () => {
          await playlistsApi.batchAdd(playlistId, [bookId]);
          queryClient.invalidateQueries({ queryKey: ['playlists'] });
        },
      });
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to remove from playlist');
    }
  }, [book, playlistId, queryClient, onClose, addToast]);

  const handlePlaylistDone = useCallback((playlistName?: string, addedPlaylistId?: string) => {
    if (book && playlistName && addedPlaylistId) {
      const bookId = book.id;
      addToast({
        type: 'success',
        message: `Added to ${playlistName}`,
        duration: 10000,
        onUndo: async () => {
          await playlistsApi.batchRemove(addedPlaylistId, [bookId]);
          queryClient.invalidateQueries({ queryKey: ['playlists'] });
        },
      });
    }
    onClose();
  }, [book, onClose, addToast, queryClient]);

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

              {showPlaylistPicker ? (
                <PlaylistPicker
                  book={book}
                  onBack={() => setShowPlaylistPicker(false)}
                  onDone={handlePlaylistDone}
                  themeColors={colors}
                  semanticColors={semanticColors}
                />
              ) : (
                <>
                  {/* List items */}
                  <View style={styles.listSection}>
                    {/* Playlist context: Remove from Playlist */}
                    {playlistId && (
                      <MenuItem
                        icon={Trash2}
                        label="Remove from Playlist"
                        sublabel="Remove this book from the playlist"
                        onPress={handleRemoveFromPlaylist}
                        variant="danger"
                        colors={colors}
                        semanticColors={semanticColors}
                      />
                    )}

                    {/* Add to Playlist */}
                    <MenuItem
                      icon={ListMusic}
                      label="Add to Playlist"
                      sublabel="Organize your listening"
                      onPress={() => setShowPlaylistPicker(true)}
                      colors={colors}
                      semanticColors={semanticColors}
                    />

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
                  </View>

                  {/* Divider */}
                  <View style={[styles.divider, { backgroundColor: colors.border.default }]} />

                  {/* Quick action row: Queue, Library, Details, Play */}
                  <View style={styles.quickActionRow}>
                    <QuickAction
                      icon={isInQueue ? Check : ListPlus}
                      label={isInQueue ? 'Queued' : 'Queue'}
                      onPress={handleQueueToggle}
                      active={isInQueue}
                      colors={colors}
                      semanticColors={semanticColors}
                    />
                    <QuickAction
                      icon={isInLibrary ? Check : Library}
                      label={isInLibrary ? 'Saved' : 'Library'}
                      onPress={handleLibraryToggle}
                      active={isInLibrary}
                      colors={colors}
                      semanticColors={semanticColors}
                    />
                    {onViewDetails && (
                      <QuickAction
                        icon={BookOpen}
                        label="Details"
                        onPress={handleViewDetails}
                        colors={colors}
                        semanticColors={semanticColors}
                      />
                    )}
                    <QuickAction
                      icon={Play}
                      label="Play"
                      onPress={handlePlay}
                      variant="accent"
                      colors={colors}
                      semanticColors={semanticColors}
                    />
                  </View>
                </>
              )}
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

  // List section (Library, Playlist items)
  listSection: {
    paddingVertical: spacing.xs,
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

  // Divider
  divider: {
    height: 1,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },

  // Quick action row (4 circular icon buttons)
  quickActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  quickAction: {
    alignItems: 'center',
    width: scale(68),
  },
  quickActionCircle: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(6),
  },
  quickActionLabel: {
    fontSize: scale(11),
    textAlign: 'center',
  },

  // Playlist picker styles
  playlistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  playlistTitle: {
    fontSize: scale(16),
    fontWeight: '600',
  },
  playlistList: {
    maxHeight: scale(250),
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(12),
  },
  playlistIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: scale(15),
    fontWeight: '500',
    marginBottom: scale(2),
  },
  playlistCount: {
    fontSize: scale(12),
  },
  emptyText: {
    fontSize: scale(14),
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  createInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: scale(10),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: scale(15),
    minHeight: scale(44),
  },
  createButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BookContextMenu;
