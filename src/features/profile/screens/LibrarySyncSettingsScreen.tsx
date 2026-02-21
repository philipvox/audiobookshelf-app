/**
 * src/features/profile/screens/LibrarySyncSettingsScreen.tsx
 *
 * Settings screen for linking My Library to an ABS playlist
 * for cross-device sync (per-user).
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Unlink,
  Plus,
  RefreshCw,
  BookOpen,
} from 'lucide-react-native';
import { playlistsApi } from '@/core/api/endpoints/playlists';
import { useLibrarySyncStore } from '@/shared/stores/librarySyncStore';
import { useMyLibraryStore } from '@/shared/stores/myLibraryStore';
import { useDefaultLibrary } from '@/features/library';
import { librarySyncService } from '@/core/services/librarySyncService';
import { SCREEN_BOTTOM_PADDING } from '@/constants/layout';
import { scale } from '@/shared/theme';
import {
  secretLibraryColors as colors,
  secretLibraryFonts as fonts,
} from '@/shared/theme/secretLibrary';
import { SettingsHeader } from '../components/SettingsHeader';

export function LibrarySyncSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { library } = useDefaultLibrary();
  const libraryPlaylistId = useLibrarySyncStore(s => s.libraryPlaylistId);
  const lastSyncAt = useLibrarySyncStore(s => s.lastSyncAt);
  const libraryIds = useMyLibraryStore(s => s.libraryIds);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const isLinked = !!libraryPlaylistId;

  const handleCreateAndLink = useCallback(async () => {
    if (!library?.id) return;
    setIsCreating(true);
    try {
      const libraryIds = useMyLibraryStore.getState().libraryIds;
      const newPlaylist = await playlistsApi.create({
        libraryId: library.id,
        name: '__sl_my_library',
        items: libraryIds.map(id => ({ libraryItemId: id })),
      });
      useLibrarySyncStore.getState().setLibraryPlaylistId(newPlaylist.id);

      // Also set up series playlist
      librarySyncService.getOrCreateSeriesPlaylist(library.id);

      // Trigger initial sync
      setIsSyncing(true);
      librarySyncService.fullSync().finally(() => setIsSyncing(false));
    } catch (err: any) {
      console.error('[LibrarySync] Create playlist failed:', err);
      Alert.alert('Error', `Failed to create playlist: ${err?.message || err}`);
    } finally {
      setIsCreating(false);
    }
  }, [library?.id]);

  const handleUnlink = useCallback(() => {
    Alert.alert(
      'Unlink Sync',
      'Your local library data will be kept, but it will no longer sync across devices.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: () => {
            const syncStore = useLibrarySyncStore.getState();
            syncStore.setLibraryPlaylistId(null);
            syncStore.setSeriesPlaylistId(null);
          },
        },
      ]
    );
  }, []);

  const handleSyncNow = useCallback(async () => {
    setIsSyncing(true);
    try {
      await librarySyncService.fullSync();
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const handleResetAndPull = useCallback(() => {
    Alert.alert(
      'Reset & Pull from Server',
      'This will replace your local library with the server playlist. All local-only books and tombstones will be cleared.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setIsSyncing(true);
            try {
              const count = await librarySyncService.resetAndPull();
              Alert.alert('Done', `Pulled ${count} books from server.`);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to reset and pull.');
            } finally {
              setIsSyncing(false);
            }
          },
        },
      ]
    );
  }, []);


  const formatLastSync = () => {
    if (!lastSyncAt) return 'Never';
    const diff = Date.now() - lastSyncAt;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(lastSyncAt).toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <SettingsHeader title="Library Sync" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: SCREEN_BOTTOM_PADDING + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status */}
        <View style={styles.statusCard}>
          <BookOpen size={scale(24)} color={colors.black} strokeWidth={1.5} />
          <View style={styles.statusContent}>
            <Text style={styles.statusLabel}>
              {isLinked ? 'Syncing' : 'Not linked'}
            </Text>
            <Text style={styles.statusValue}>
              {isLinked ? 'My Library (per-user playlist)' : 'Set up sync to share My Library across your devices'}
            </Text>
            {isLinked && (
              <Text style={styles.statusMeta}>
                {libraryIds.length} books · Last sync: {formatLastSync()}
              </Text>
            )}
          </View>
        </View>

        {/* Actions when linked */}
        {isLinked && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSyncNow}
              disabled={isSyncing}
            >
              <RefreshCw size={scale(16)} color={colors.black} strokeWidth={1.5} />
              <Text style={styles.actionLabel}>
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </Text>
              {isSyncing && <ActivityIndicator size="small" color={colors.black} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleUnlink}
            >
              <Unlink size={scale(16)} color={colors.black} strokeWidth={1.5} />
              <Text style={styles.actionLabel}>Unlink Sync</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleResetAndPull}
              disabled={isSyncing}
            >
              <RefreshCw size={scale(16)} color="#CC3333" strokeWidth={1.5} />
              <Text style={[styles.actionLabel, { color: '#CC3333' }]}>
                Reset & Pull from Server
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Enable sync when not linked */}
        {!isLinked && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.collectionRow}
              onPress={handleCreateAndLink}
              disabled={isCreating}
            >
              <Plus size={scale(18)} color={colors.black} strokeWidth={1.5} />
              <View style={styles.collectionInfo}>
                <Text style={styles.collectionName}>
                  {isCreating ? 'Setting up...' : 'Enable Library Sync'}
                </Text>
                <Text style={styles.collectionMeta}>
                  Sync your {libraryIds.length} books across devices
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            Library Sync backs your My Library with a per-user playlist on your ABS server.
            Each user has their own library — changes merge automatically across your devices.
            Books are only removed if you explicitly remove them.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.grayLight,
    marginTop: 16,
    gap: 12,
  },
  statusContent: {
    flex: 1,
  },
  statusLabel: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(9),
    color: colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusValue: {
    fontFamily: fonts.playfair.regular,
    fontSize: scale(15),
    color: colors.black,
    marginTop: 2,
  },
  statusMeta: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(9),
    color: colors.gray,
    marginTop: 4,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(9),
    color: colors.gray,
    letterSpacing: 1,
    marginBottom: 12,
    paddingLeft: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayLight,
    gap: 12,
  },
  actionLabel: {
    fontFamily: fonts.playfair.regular,
    fontSize: scale(15),
    color: colors.black,
    flex: 1,
  },
  collectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayLight,
    gap: 12,
  },
  collectionInfo: {
    flex: 1,
  },
  collectionName: {
    fontFamily: fonts.playfair.regular,
    fontSize: scale(15),
    color: colors.black,
  },
  collectionMeta: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(9),
    color: colors.gray,
    marginTop: 2,
  },
  loader: {
    paddingVertical: 20,
  },
  emptyText: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(10),
    color: colors.gray,
    textAlign: 'center',
    paddingVertical: 20,
  },
  infoSection: {
    marginTop: 32,
    paddingHorizontal: 4,
  },
  infoText: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(9),
    color: colors.gray,
    lineHeight: scale(16),
  },
});
