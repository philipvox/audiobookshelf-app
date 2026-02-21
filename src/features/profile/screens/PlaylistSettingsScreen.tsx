/**
 * src/features/profile/screens/PlaylistSettingsScreen.tsx
 *
 * Homepage Settings screen for managing Library screen views.
 * - Toggle which views appear in dropdown
 * - Reorder visible views
 * - Set default view when opening Library screen
 *
 * All controls are unified in a single section per view item.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ListMusic,
  GripVertical,
  Circle,
  CheckCircle2,
  Info,
  Library,
  Clock,
  BookCheck,
  Heart,
} from 'lucide-react-native';
import { SCREEN_BOTTOM_PADDING } from '@/constants/layout';
import { scale } from '@/shared/theme';
import {
  secretLibraryColors as colors,
  secretLibraryFonts as fonts,
} from '@/shared/theme/secretLibrary';
import { haptics } from '@/core/native/haptics';
import { SettingsHeader } from '../components/SettingsHeader';
import {
  usePlaylists,
  usePlaylistSettingsStore,
  type DefaultViewType,
} from '@/features/playlists';

// =============================================================================
// TYPES
// =============================================================================

interface ViewItem {
  id: string;
  key: DefaultViewType;
  label: string;
  isBuiltIn: boolean;
  icon: 'library' | 'clock' | 'finished' | 'heart' | 'playlist';
}

// =============================================================================
// COMPONENTS
// =============================================================================

interface UnifiedViewRowProps {
  item: ViewItem;
  isVisible: boolean;
  isDefault: boolean;
  isDraggable: boolean;
  onToggleVisibility: () => void;
  onSetDefault: () => void;
  drag: () => void;
  isActive: boolean;
}

function UnifiedViewRow({
  item,
  isVisible,
  isDefault,
  isDraggable,
  onToggleVisibility,
  onSetDefault,
  drag,
  isActive,
}: UnifiedViewRowProps) {
  const handleToggle = useCallback(
    (newValue: boolean) => {
      haptics.selection();
      onToggleVisibility();
    },
    [onToggleVisibility]
  );

  const handleSetDefault = useCallback(() => {
    if (!isVisible) return; // Can't set as default if not visible
    haptics.selection();
    onSetDefault();
  }, [isVisible, onSetDefault]);

  // Get icon component
  const IconComponent = item.icon === 'library' ? Library
    : item.icon === 'clock' ? Clock
    : item.icon === 'finished' ? BookCheck
    : item.icon === 'heart' ? Heart
    : ListMusic;

  return (
    <View style={[
      styles.unifiedRow,
      !isVisible && styles.unifiedRowDisabled,
      isActive && styles.unifiedRowActive,
    ]}>
      {/* Drag Handle */}
      <TouchableOpacity
        style={[styles.dragHandle, !isDraggable && styles.dragHandleDisabled]}
        onLongPress={isDraggable ? drag : undefined}
        disabled={!isDraggable}
        delayLongPress={100}
      >
        <GripVertical
          size={scale(16)}
          color={isDraggable ? colors.gray : 'transparent'}
          strokeWidth={1.5}
        />
      </TouchableOpacity>

      {/* Left side: Icon + Label */}
      <View style={styles.rowLeft}>
        <View style={[styles.iconContainer, !isVisible && styles.iconContainerDisabled]}>
          <IconComponent
            size={scale(16)}
            color={isVisible ? colors.gray : colors.grayLine}
            strokeWidth={1.5}
          />
        </View>
        <Text
          style={[styles.rowLabel, !isVisible && styles.rowLabelDisabled]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
      </View>

      {/* Right side: Default radio + Toggle */}
      <View style={styles.rowControls}>
        {/* Default View Radio */}
        <TouchableOpacity
          style={styles.radioButton}
          onPress={handleSetDefault}
          disabled={!isVisible}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isDefault ? (
            <CheckCircle2
              size={scale(22)}
              color={colors.black}
              strokeWidth={1.5}
              fill={colors.black}
            />
          ) : (
            <Circle
              size={scale(22)}
              color={isVisible ? colors.grayLine : 'rgba(0,0,0,0.1)'}
              strokeWidth={1.5}
            />
          )}
        </TouchableOpacity>

        {/* Visibility Toggle */}
        <Switch
          value={isVisible}
          onValueChange={handleToggle}
          trackColor={{ false: 'rgba(0,0,0,0.1)', true: colors.black }}
          thumbColor={colors.white}
          ios_backgroundColor="rgba(0,0,0,0.1)"
          style={styles.toggle}
        />
      </View>
    </View>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PlaylistSettingsScreen() {
  const insets = useSafeAreaInsets();

  // Fetch playlists
  const { data: playlists = [], isLoading, error } = usePlaylists();

  // Store state
  const visiblePlaylistIds = usePlaylistSettingsStore((s) => s.visiblePlaylistIds);
  const playlistOrder = usePlaylistSettingsStore((s) => s.playlistOrder);
  const defaultView = usePlaylistSettingsStore((s) => s.defaultView);

  // Store actions
  const togglePlaylistVisibility = usePlaylistSettingsStore((s) => s.togglePlaylistVisibility);
  const movePlaylist = usePlaylistSettingsStore((s) => s.movePlaylist);
  const setDefaultView = usePlaylistSettingsStore((s) => s.setDefaultView);
  const syncWithAvailablePlaylists = usePlaylistSettingsStore((s) => s.syncWithAvailablePlaylists);

  // Sync store with available playlists when they load
  useEffect(() => {
    if (playlists.length > 0) {
      const availableIds = playlists.map(p => p.id);
      syncWithAvailablePlaylists(availableIds);
    }
  }, [playlists, syncWithAvailablePlaylists]);

  // Built-in views that are always available
  const builtInViews: ViewItem[] = useMemo(() => [
    { id: '__library', key: 'library', label: 'My Library', isBuiltIn: true, icon: 'library' },
    { id: '__mySeries', key: 'mySeries', label: 'My Series', isBuiltIn: true, icon: 'heart' },
    { id: '__lastPlayed', key: 'lastPlayed', label: 'Last Played', isBuiltIn: true, icon: 'clock' },
    { id: '__finished', key: 'finished', label: 'Finished', isBuiltIn: true, icon: 'finished' },
  ], []);

  // Convert playlists to ViewItems
  const playlistViews: ViewItem[] = useMemo(() => {
    return playlists
      .filter(p => !p.name.startsWith('__sl_'))
      .map(p => ({
        id: p.id,
        key: `playlist:${p.id}` as DefaultViewType,
        label: p.name,
        isBuiltIn: false,
        icon: 'playlist' as const,
      }));
  }, [playlists]);

  // All view items combined and ordered
  const allViewItems = useMemo(() => {
    // Start with built-in views
    const result: ViewItem[] = [...builtInViews];

    // Add playlists in the stored order
    const addedPlaylistIds = new Set<string>();

    // First add playlists in stored order
    for (const id of playlistOrder) {
      const playlist = playlistViews.find(p => p.id === id);
      if (playlist) {
        result.push(playlist);
        addedPlaylistIds.add(id);
      }
    }

    // Then add any remaining playlists not in order
    for (const playlist of playlistViews) {
      if (!addedPlaylistIds.has(playlist.id)) {
        result.push(playlist);
      }
    }

    return result;
  }, [builtInViews, playlistViews, playlistOrder]);

  // Get visible items for order calculation
  const visibleItems = useMemo(() => {
    return allViewItems.filter(item => {
      if (item.isBuiltIn) return true; // Built-in views are always "visible"
      return visiblePlaylistIds.includes(item.id);
    });
  }, [allViewItems, visiblePlaylistIds]);

  // Handlers
  const handleToggleVisibility = useCallback((item: ViewItem) => {
    if (item.isBuiltIn) return; // Can't toggle built-in views
    togglePlaylistVisibility(item.id);
  }, [togglePlaylistVisibility]);

  const handleSetDefault = useCallback((item: ViewItem) => {
    setDefaultView(item.key);
  }, [setDefaultView]);

  // Handle drag end - reorder the list
  const handleDragEnd = useCallback(({ data }: { data: ViewItem[] }) => {
    haptics.selection();
    // Extract the new order of playlist IDs (excluding built-in views)
    const newPlaylistOrder = data
      .filter(item => !item.isBuiltIn)
      .map(item => item.id);

    // Update the store with the new order
    usePlaylistSettingsStore.getState().setPlaylistOrder(newPlaylistOrder);
  }, []);

  // Check if item is visible
  const isItemVisible = useCallback((item: ViewItem): boolean => {
    if (item.isBuiltIn) return true;
    return visiblePlaylistIds.includes(item.id);
  }, [visiblePlaylistIds]);

  // Render item for DraggableFlatList
  const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<ViewItem>) => {
    return (
      <ScaleDecorator>
        <UnifiedViewRow
          item={item}
          isVisible={isItemVisible(item)}
          isDefault={defaultView === item.key}
          isDraggable={!item.isBuiltIn && isItemVisible(item)}
          onToggleVisibility={() => handleToggleVisibility(item)}
          onSetDefault={() => handleSetDefault(item)}
          drag={drag}
          isActive={isActive}
        />
      </ScaleDecorator>
    );
  }, [isItemVisible, defaultView, handleToggleVisibility, handleSetDefault]);

  const keyExtractor = useCallback((item: ViewItem) => item.id, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.grayLight} />
        <SettingsHeader title="Homepage Settings" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.black} />
          <Text style={styles.loadingText}>Loading views...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.grayLight} />
        <SettingsHeader title="Homepage Settings" />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Failed to load views</Text>
          <Text style={styles.emptySubtext}>Please check your connection and try again</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.grayLight} />
      <SettingsHeader title="Homepage Settings" />

      {/* Column Headers */}
      <View style={styles.headerRow}>
        <Text style={styles.headerLabel}>View</Text>
        <View style={styles.headerControls}>
          <Text style={[styles.headerText, styles.headerDefault]}>Default</Text>
          <Text style={[styles.headerText, styles.headerShow]}>Show</Text>
        </View>
      </View>

      {/* Draggable List */}
      <View style={styles.sectionCard}>
        <DraggableFlatList
          data={allViewItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          onDragEnd={handleDragEnd}
          contentContainerStyle={{ paddingBottom: SCREEN_BOTTOM_PADDING + insets.bottom }}
        />
      </View>

      {/* Info Note */}
      <View style={styles.infoSection}>
        <Info size={scale(16)} color={colors.gray} strokeWidth={1.5} />
        <Text style={styles.infoText}>
          <Text style={styles.infoBold}>Default:</Text> The view shown when opening Library.{'\n'}
          <Text style={styles.infoBold}>Drag:</Text> Long press and drag to reorder playlists.{'\n'}
          <Text style={styles.infoBold}>Show:</Text> Toggle visibility in the dropdown.
        </Text>
      </View>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grayLight,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(12),
    color: colors.gray,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyText: {
    fontFamily: fonts.playfair.regular,
    fontSize: scale(20),
    color: colors.black,
    textAlign: 'center',
    marginTop: 8,
  },
  emptySubtext: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(11),
    color: colors.gray,
    textAlign: 'center',
  },
  // Header Row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 4,
  },
  headerLabel: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(9),
    color: colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(8),
    color: colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  headerDefault: {
    width: scale(44),
  },
  headerShow: {
    width: scale(50),
    marginLeft: 12,
  },
  // Section Card
  sectionCard: {
    backgroundColor: colors.white,
  },
  // Unified Row
  unifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingLeft: 4,
    paddingRight: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    minHeight: scale(56),
    backgroundColor: colors.white,
  },
  unifiedRowDisabled: {
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  unifiedRowActive: {
    backgroundColor: colors.grayLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  dragHandle: {
    width: scale(32),
    height: scale(44),
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandleDisabled: {
    opacity: 0,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconContainer: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(6),
    backgroundColor: colors.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerDisabled: {
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  rowLabel: {
    fontFamily: fonts.playfair.regular,
    fontSize: scale(14),
    color: colors.black,
    marginLeft: 10,
    flex: 1,
  },
  rowLabelDisabled: {
    color: colors.grayLine,
  },
  rowControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioButton: {
    width: scale(32),
    height: scale(32),
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggle: {
    transform: [{ scale: 0.85 }],
  },
  // Info Section
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 4,
  },
  infoText: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(9),
    color: colors.gray,
    flex: 1,
    lineHeight: scale(16),
  },
  infoBold: {
    fontFamily: fonts.jetbrainsMono.medium,
    color: colors.black,
  },
});
