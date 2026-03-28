/**
 * src/shared/components/SpinePickerSheet.tsx
 *
 * Inline content for the spine picker — renders inside the BookContextMenu modal.
 * Shows available community spine images for a book with the current selection highlighted.
 * Includes a (+) card to add a custom spine from the phone's gallery.
 * Custom spines are stored locally. Optionally submitted to community for review.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { ChevronLeft, Check, Plus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { scale } from '@/shared/theme';
import { secretLibraryColors, secretLibraryFonts as fonts } from '@/shared/theme/secretLibrary';
import { useSpineCacheStore } from '@/features/home/stores/spineCache';
import { useLibraryCache } from '@/core/cache/libraryCache';

const COMMUNITY_SPINE_URL = 'https://spines.mysecretlibrary.com';
const SPINE_DISPLAY_HEIGHT = scale(280);
const LOCAL_SPINES_DIR = `${FileSystem.documentDirectory}custom-spines/`;

interface SpineOption {
  id: string;
  url: string;
  width: number;
  height: number;
  votes: number;
  isCurrent: boolean;
  isLocal?: boolean;
}

interface SpinePickerContentProps {
  bookId: string | undefined;
  bookTitle: string;
  onBack: () => void;
}

/** Ensure the local spines directory exists */
async function ensureSpineDir() {
  const info = await FileSystem.getInfoAsync(LOCAL_SPINES_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(LOCAL_SPINES_DIR, { intermediates: true });
  }
}

/** Submit a spine image to the community server for review */
async function submitToCommunity(
  localUri: string,
  bookId: string,
  bookTitle: string,
  bookAuthor: string,
  asin?: string,
  isbn?: string,
): Promise<string | null> {
  try {
    const formData = new FormData();
    const filename = localUri.split('/').pop() || 'spine.png';
    const ext = filename.split('.').pop()?.toLowerCase() || 'png';
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
      : ext === 'webp' ? 'image/webp' : 'image/png';

    formData.append('spine', {
      uri: localUri,
      name: filename,
      type: mimeType,
    } as any);
    formData.append('title', bookTitle);
    formData.append('author', bookAuthor);
    if (asin) formData.append('asin', asin);
    if (isbn) formData.append('isbn', isbn);

    const res = await fetch(`${COMMUNITY_SPINE_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.spine_id || data.spineId || data.id || null;
  } catch {
    return null;
  }
}

export function SpinePickerContent({ bookId, bookTitle, onBack }: SpinePickerContentProps) {
  const [loading, setLoading] = useState(true);
  const [spines, setSpines] = useState<SpineOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  const setSpineOverride = useSpineCacheStore((s) => s.setSpineOverride);
  const clearSpineOverride = useSpineCacheStore((s) => s.clearSpineOverride);
  const spineOverrides = useSpineCacheStore((s) => s.spineOverrides);
  const promptCommunitySubmit = useSpineCacheStore((s) => s.promptCommunitySubmit);
  const addPendingSubmission = useSpineCacheStore((s) => s.addPendingSubmission);

  // Fetch available spines from community server
  useEffect(() => {
    if (!bookId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const communityBookId = useSpineCacheStore.getState().communityBookMap[bookId];
        const items = useLibraryCache.getState().items;
        const localItem = items.find((i: any) => i.id === bookId);
        const metadata = localItem?.media?.metadata as any;
        const asin = metadata?.asin;
        const isbn = metadata?.isbn;

        const lookupId = communityBookId || asin || isbn || bookId;
        const res = await fetch(
          `${COMMUNITY_SPINE_URL}/api/book/${encodeURIComponent(lookupId)}/spines`
        );

        if (cancelled) return;

        const currentOverride = spineOverrides[bookId];
        const options: SpineOption[] = [];

        // Check if there's a local custom spine
        await ensureSpineDir();
        const localPath = `${LOCAL_SPINES_DIR}${bookId}.png`;
        const localInfo = await FileSystem.getInfoAsync(localPath);
        if (localInfo.exists) {
          options.push({
            id: 'local',
            url: localPath,
            width: 150,
            height: 1200,
            votes: 0,
            isCurrent: currentOverride === localPath,
            isLocal: true,
          });
        }

        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;

          for (let idx = 0; idx < (data.spines || []).length; idx++) {
            const s = data.spines[idx];
            const fullUrl = `${COMMUNITY_SPINE_URL}${s.url}`;
            const isCurrent = currentOverride
              ? currentOverride.includes(s.id)
              : !localInfo.exists && idx === 0;

            options.push({
              id: s.id,
              url: fullUrl,
              width: s.width || 150,
              height: s.height || 1200,
              votes: s.votes || 0,
              isCurrent,
            });
          }
        }

        // If nothing is marked current and we have options, mark the first
        if (options.length > 0 && !options.some((o) => o.isCurrent)) {
          options[0].isCurrent = true;
        }

        setSpines(options);
      } catch {
        if (!cancelled) setError('Failed to load spines');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [bookId]);

  const handleSelect = useCallback(
    (spine: SpineOption) => {
      if (!bookId) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      setSpines((prev) =>
        prev.map((s) => ({ ...s, isCurrent: s.id === spine.id }))
      );

      // If selecting the first community spine (default), clear override
      const firstCommunity = spines.find((s) => !s.isLocal);
      if (firstCommunity && spine.id === firstCommunity.id) {
        clearSpineOverride(bookId);
      } else {
        setSpineOverride(bookId, spine.url);
      }
    },
    [bookId, spines, setSpineOverride, clearSpineOverride]
  );

  const handleLongPressLocal = useCallback(
    (spine: SpineOption) => {
      if (!bookId || !spine.isLocal) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      Alert.alert(
        'Remove Local Spine?',
        'This will delete your custom spine image for this book.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                await FileSystem.deleteAsync(spine.url, { idempotent: true });
              } catch {}
              clearSpineOverride(bookId);
              setSpines((prev) => {
                const without = prev.filter((s) => !s.isLocal);
                // Mark first remaining as current
                if (without.length > 0 && !without.some((s) => s.isCurrent)) {
                  without[0].isCurrent = true;
                }
                return without;
              });
            },
          },
        ],
      );
    },
    [bookId, clearSpineOverride]
  );

  const handleAddCustom = useCallback(async () => {
    if (!bookId) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Save to local spines directory
    await ensureSpineDir();
    const destPath = `${LOCAL_SPINES_DIR}${bookId}.png`;
    await FileSystem.copyAsync({ from: asset.uri, to: destPath });

    // Set as the override for this book
    setSpineOverride(bookId, destPath);

    // Add to spine list and mark as current
    setSpines((prev) => {
      const withoutLocal = prev.map((s) => ({ ...s, isCurrent: false }));
      const existingLocal = withoutLocal.findIndex((s) => s.isLocal);
      const localEntry: SpineOption = {
        id: 'local',
        url: destPath,
        width: asset.width || 150,
        height: asset.height || 1200,
        votes: 0,
        isCurrent: true,
        isLocal: true,
      };
      if (existingLocal >= 0) {
        withoutLocal[existingLocal] = localEntry;
      } else {
        withoutLocal.unshift(localEntry);
      }
      return withoutLocal;
    });

    // Prompt to submit to community
    if (promptCommunitySubmit) {
      const items = useLibraryCache.getState().items;
      const localItem = items.find((i: any) => i.id === bookId);
      const metadata = localItem?.media?.metadata as any;
      const author = metadata?.authorName || metadata?.authors?.[0]?.name || '';
      const asin = metadata?.asin;
      const isbn = metadata?.isbn;

      Alert.alert(
        'Share with Community?',
        'Submit this spine to Secret Spines for other users to enjoy? It will be reviewed before appearing publicly.',
        [
          { text: 'Skip', style: 'cancel' },
          {
            text: 'Submit',
            onPress: async () => {
              const spineId = await submitToCommunity(destPath, bookId, bookTitle, author, asin, isbn);
              if (spineId) {
                addPendingSubmission(spineId, bookTitle);
                Alert.alert('Submitted!', 'Your spine has been submitted for review. You\'ll be notified when it\'s approved.');
              } else {
                Alert.alert('Upload Failed', 'Could not reach the community server. Your spine is still saved locally.');
              }
            },
          },
        ],
      );
    }
  }, [bookId, bookTitle, setSpineOverride, promptCommunitySubmit, addPendingSubmission]);

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <TouchableOpacity onPress={onBack} style={styles.backRow}>
        <ChevronLeft size={scale(18)} color="rgba(255,255,255,0.5)" />
        <Text style={styles.backLabel}>Choose Spine</Text>
      </TouchableOpacity>

      <Text style={styles.bookTitle} numberOfLines={1}>{bookTitle}</Text>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={secretLibraryColors.gold} />
          <Text style={styles.statusText}>Loading spines...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.statusText, { color: secretLibraryColors.coral }]}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {spines.map((spine) => {
            const aspect = spine.width / spine.height;
            const displayWidth = SPINE_DISPLAY_HEIGHT * aspect;

            return (
              <TouchableOpacity
                key={spine.id}
                onPress={() => handleSelect(spine)}
                onLongPress={spine.isLocal ? () => handleLongPressLocal(spine) : undefined}
                delayLongPress={500}
                style={[
                  styles.spineCard,
                  spine.isCurrent && styles.spineCardActive,
                ]}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: spine.url }}
                  style={{
                    width: Math.max(displayWidth, scale(35)),
                    height: SPINE_DISPLAY_HEIGHT,
                  }}
                  contentFit="contain"
                />
                {spine.isCurrent && (
                  <View style={styles.checkBadge}>
                    <Check size={scale(12)} color="#000" strokeWidth={3} />
                  </View>
                )}
                {spine.isLocal && (
                  <Text style={styles.localLabel}>LOCAL</Text>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Add custom spine button */}
          <TouchableOpacity
            onPress={handleAddCustom}
            style={styles.addCard}
            activeOpacity={0.7}
          >
            <View style={styles.addOutline}>
              <Plus size={scale(24)} color="rgba(255,255,255,0.3)" />
            </View>
            <Text style={styles.addLabel}>Add{'\n'}Spine</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: scale(420),
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginBottom: scale(4),
  },
  backLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: scale(12),
    fontFamily: fonts.jetbrainsMono.regular,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bookTitle: {
    color: '#fff',
    fontSize: scale(15),
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: scale(16),
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(40),
  },
  statusText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: scale(12),
    marginTop: scale(8),
    textAlign: 'center',
  },
  scrollContent: {
    paddingVertical: scale(8),
    alignItems: 'flex-end',
    gap: scale(12),
  },
  spineCard: {
    alignItems: 'center',
    borderRadius: scale(4),
    padding: scale(6),
    borderWidth: 2,
    borderColor: 'transparent',
  },
  spineCardActive: {
    borderColor: secretLibraryColors.gold,
    backgroundColor: 'rgba(243,182,12,0.08)',
  },
  checkBadge: {
    position: 'absolute',
    top: scale(2),
    right: scale(2),
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    backgroundColor: secretLibraryColors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  localLabel: {
    position: 'absolute',
    bottom: scale(8),
    fontSize: scale(8),
    fontFamily: fonts.jetbrainsMono.regular,
    color: secretLibraryColors.gold,
    letterSpacing: 0.5,
  },
  addCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(6),
    gap: scale(8),
  },
  addOutline: {
    width: scale(50),
    height: SPINE_DISPLAY_HEIGHT,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    borderStyle: 'dashed',
    borderRadius: scale(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: scale(9),
    fontFamily: fonts.jetbrainsMono.regular,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
