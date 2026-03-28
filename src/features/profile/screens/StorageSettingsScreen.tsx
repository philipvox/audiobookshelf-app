/**
 * src/features/profile/screens/StorageSettingsScreen.tsx
 *
 * Secret Library Storage Settings
 * Downloads, cache, WiFi-only, auto-download.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Folder,
  Download,
  Wifi,
  Library,
  RefreshCw,
  Trash2,
  Info,
} from 'lucide-react-native';
import { useMyLibraryStore } from '@/shared/stores/myLibraryStore';
import { useDownloads } from '@/core/hooks/useDownloads';
import { downloadManager } from '@/core/services/downloadManager';
import { useLibraryCache } from '@/core/cache';
import { networkMonitor } from '@/core/services/networkMonitor';
import { SCREEN_BOTTOM_PADDING } from '@/constants/layout';
import { scale, useSecretLibraryColors } from '@/shared/theme';
import { secretLibraryFonts as fonts } from '@/shared/theme/secretLibrary';
import { SettingsHeader } from '../components/SettingsHeader';
import { SettingsRow } from '../components/SettingsRow';
import { SectionHeader } from '../components/SectionHeader';
import { logger } from '@/shared/utils/logger';
import { formatBytes } from '@/shared/utils/format';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function StorageSettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const colors = useSecretLibraryColors();

  // Downloads data
  const { downloads } = useDownloads();
  const completedDownloads = downloads.filter((d) => d.status === 'complete');
  const downloadCount = completedDownloads.length;
  const totalStorage = completedDownloads.reduce((sum, d) => sum + (d.totalBytes || 0), 0);

  // Library cache
  const { refreshCache, clearCache } = useLibraryCache();
  const [isRefreshingCache, setIsRefreshingCache] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [isClearingDownloads, setIsClearingDownloads] = useState(false);

  // Network settings
  const [wifiOnlyEnabled, setWifiOnlyEnabled] = useState(networkMonitor.isWifiOnlyEnabled());
  const [autoDownloadSeriesEnabled, setAutoDownloadSeriesEnabled] = useState(
    networkMonitor.isAutoDownloadSeriesEnabled()
  );

  const handleWifiOnlyToggle = useCallback(async (enabled: boolean) => {
    setWifiOnlyEnabled(enabled);
    await networkMonitor.setWifiOnlyEnabled(enabled);
  }, []);

  const handleAutoDownloadSeriesToggle = useCallback(async (enabled: boolean) => {
    setAutoDownloadSeriesEnabled(enabled);
    await networkMonitor.setAutoDownloadSeriesEnabled(enabled);
  }, []);



  const handleRefreshCache = useCallback(async () => {
    if (isRefreshingCache) return;

    setIsRefreshingCache(true);
    try {
      await refreshCache();
      Alert.alert('Success', 'Library cache refreshed successfully.');
    } catch {
      Alert.alert('Error', 'Failed to refresh library cache.');
    } finally {
      setIsRefreshingCache(false);
    }
  }, [isRefreshingCache, refreshCache]);

  const handleClearCache = useCallback(() => {
    if (isClearingCache) return;

    Alert.alert(
      'Clear Cache',
      'This will clear all cached library data. Your downloads and listening progress are not affected. The cache will be rebuilt when you return to the library.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            setIsClearingCache(true);
            try {
              // Clear library cache (SQLite and in-memory)
              await clearCache();
              Alert.alert('Success', 'Cache cleared successfully.');
            } catch (error) {
              logger.error('[StorageSettings] Failed to clear cache:', error);
              Alert.alert('Error', 'Failed to clear cache. Please try again.');
            } finally {
              setIsClearingCache(false);
            }
          },
        },
      ]
    );
  }, [isClearingCache, clearCache]);

  const handleManageDownloads = useCallback(() => {
    navigation.navigate('Downloads');
  }, [navigation]);

  const handleClearAllDownloads = useCallback(() => {
    if (downloadCount === 0) {
      Alert.alert('No Downloads', 'There are no downloaded books to clear.');
      return;
    }

    if (isClearingDownloads) return;

    Alert.alert(
      'Clear All Downloads',
      `This will remove all ${downloadCount} downloaded book${downloadCount !== 1 ? 's' : ''} and free up ${formatBytes(totalStorage)}. Are you sure?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setIsClearingDownloads(true);
            try {
              await downloadManager.clearAllDownloads();
              Alert.alert('Success', 'All downloads have been cleared.');
            } catch (error) {
              logger.error('[StorageSettings] Failed to clear downloads:', error);
              Alert.alert('Error', 'Failed to clear downloads. Please try again.');
            } finally {
              setIsClearingDownloads(false);
            }
          },
        },
      ]
    );
  }, [downloadCount, totalStorage, isClearingDownloads]);

  const libraryCount = useMyLibraryStore((s) => s.libraryIds.length);
  const clearAllLibrary = useMyLibraryStore((s) => s.clearAll);

  const handleClearLibrary = useCallback(() => {
    if (libraryCount === 0) {
      Alert.alert('Empty', 'Your library is already empty.');
      return;
    }
    Alert.alert(
      'Clear My Library',
      `This will remove all ${libraryCount} books from your library. Your downloads and listening progress will not be affected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            clearAllLibrary();
            Alert.alert('Done', 'Your library has been cleared.');
          },
        },
      ]
    );
  }, [libraryCount, clearAllLibrary]);

  return (
    <View style={[styles.container, { backgroundColor: colors.grayLight }]}>
      <StatusBar barStyle={colors.isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.grayLight} />
      <SettingsHeader title="Storage" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: SCREEN_BOTTOM_PADDING + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Storage Overview */}
        <View style={[styles.storageOverview, { backgroundColor: colors.white }]}>
          <View style={[styles.storageIcon, { backgroundColor: colors.grayLight }]}>
            <Folder size={scale(24)} color={colors.black} strokeWidth={1.5} />
          </View>
          <View style={styles.storageInfo}>
            <Text style={[styles.storageValue, { color: colors.black }]}>{formatBytes(totalStorage)}</Text>
            <Text style={[styles.storageLabel, { color: colors.gray }]}>
              {downloadCount} downloaded book{downloadCount !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Downloads Section */}
        <View style={styles.section}>
          <SectionHeader title="Downloads" />
          <View style={[styles.sectionCard, { backgroundColor: colors.white }]}>
            <SettingsRow
              Icon={Download}
              label="Manage Downloads"
              value={`${downloadCount} book${downloadCount !== 1 ? 's' : ''}`}
              onPress={handleManageDownloads}
            />
            <SettingsRow
              Icon={Wifi}
              label="WiFi Only"
              switchValue={wifiOnlyEnabled}
              onSwitchChange={handleWifiOnlyToggle}
              description="Pause downloads when not on WiFi"
            />
            <SettingsRow
              Icon={Library}
              label="Auto-Download Series"
              switchValue={autoDownloadSeriesEnabled}
              onSwitchChange={handleAutoDownloadSeriesToggle}
              description="Queue next book at 80% progress"
            />
          </View>
        </View>

        {/* Cache Section */}
        <View style={styles.section}>
          <SectionHeader title="Library Cache" />
          <View style={[styles.sectionCard, { backgroundColor: colors.white }]}>
            <SettingsRow
              Icon={RefreshCw}
              label="Refresh Library Cache"
              value={isRefreshingCache ? 'Refreshing...' : undefined}
              onPress={handleRefreshCache}
              description="Re-sync books and series from server"
            />
            <SettingsRow
              Icon={Trash2}
              label="Clear Cache"
              value={isClearingCache ? 'Clearing...' : undefined}
              onPress={isClearingCache ? undefined : handleClearCache}
              description="Remove cached library data"
              danger
            />
          </View>
        </View>

        {/* Danger Zone Section */}
        <View style={styles.section}>
          <SectionHeader title="Danger Zone" />
          <View style={[styles.sectionCard, { backgroundColor: colors.white }]}>
            <SettingsRow
              Icon={Trash2}
              label="Clear My Library"
              onPress={handleClearLibrary}
              description={`Remove all ${libraryCount} books from your library`}
              danger
            />
            <SettingsRow
              Icon={Trash2}
              label="Clear All Downloads"
              onPress={isClearingDownloads ? undefined : handleClearAllDownloads}
              value={isClearingDownloads ? 'Clearing...' : undefined}
              description={`Free up ${formatBytes(totalStorage)}`}
              danger
            />
          </View>
        </View>

        {/* Info Note */}
        <View style={styles.infoSection}>
          <Info size={scale(16)} color={colors.gray} strokeWidth={1.5} />
          <Text style={[styles.infoText, { color: colors.gray }]}>
            Downloads are stored locally on your device. Clearing downloads will not affect your
            listening progress, which is synced with the server.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  // Storage Overview
  storageOverview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginBottom: 28,
  },
  storageIcon: {
    width: scale(48),
    height: scale(48),
    justifyContent: 'center',
    alignItems: 'center',
  },
  storageInfo: {
    marginLeft: 16,
  },
  storageValue: {
    fontFamily: fonts.playfair.regular,
    fontSize: scale(28),
  },
  storageLabel: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(10),
    marginTop: 2,
  },
  // Sections
  section: {
    marginBottom: 28,
  },
  sectionCard: {
  },
  // Info Section
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
  },
  infoText: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(9),
    flex: 1,
    lineHeight: scale(16),
  },
});
