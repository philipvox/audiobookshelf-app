/**
 * src/features/browse/components/BrowseTopNav.tsx
 *
 * Top navigation bar for the Browse screen.
 * Uses the standard TopNav component with mood indicator pill.
 */

import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { secretLibraryColors as staticColors, secretLibraryFonts } from '@/shared/theme/secretLibrary';
import { TopNav, TopNavCloseIcon, SmileIcon, Icon } from '@/shared/components';
import { scale, useSecretLibraryColors } from '@/shared/theme';
import {
  useActiveSession,
  useHasActiveSession,
  useMoodSessionStore,
} from '@/features/mood-discovery/stores/moodSessionStore';
import { MOODS } from '@/features/mood-discovery/types';

interface BrowseTopNavProps {
  onMoodPress?: () => void;
  onClose?: () => void;
  onLogoPress?: () => void;
  onLogoLongPress?: () => void;
}

export function BrowseTopNav({ onMoodPress, onClose, onLogoPress, onLogoLongPress }: BrowseTopNavProps) {
  // Theme-aware colors
  const colors = useSecretLibraryColors();

  // Mood session hooks
  const hasActiveSession = useHasActiveSession();
  const session = useActiveSession();
  const clearSession = useMoodSessionStore((state) => state.clearSession);

  // Get active mood config for display
  const activeMoodConfig = useMemo(() => {
    if (!session?.mood) return null;
    return MOODS.find((m) => m.id === session.mood) || null;
  }, [session?.mood]);

  const handleClearMood = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    clearSession();
  }, [clearSession]);

  return (
    <View style={[styles.container, { backgroundColor: staticColors.black }]}>
      <TopNav
        variant="dark"
        showLogo={true}
        onLogoPress={onLogoPress}
        onLogoLongPress={onLogoLongPress}
        style={{ backgroundColor: 'transparent' }}
        includeSafeArea={false}
        circleButtons={[
          {
            key: 'mood',
            icon: <SmileIcon color={staticColors.cream} size={14} />,
            onPress: onMoodPress,
          },
          {
            key: 'close',
            icon: <TopNavCloseIcon color={staticColors.cream} size={14} />,
            onPress: onClose,
          },
        ]}
      />

      {/* Title row - with mood indicator on right when active */}
      <View style={styles.titleRow}>
        {hasActiveSession && activeMoodConfig && (
          <View style={styles.moodIndicator}>
            <Pressable onPress={onMoodPress} style={styles.moodPill}>
              <Icon
                name={activeMoodConfig.icon}
                size={14}
                color={staticColors.white}
                set={activeMoodConfig.iconSet as any}
              />
              <Text style={[styles.moodLabel, { color: staticColors.white }]}>{activeMoodConfig.label}</Text>
            </Pressable>
            <Pressable onPress={handleClearMood} style={styles.clearButton} hitSlop={8}>
              <Icon name="X" size={12} color={staticColors.gray} />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: staticColors.black,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  browseTitle: {
    fontFamily: secretLibraryFonts.playfair.regular,
    fontSize: scale(32),
    fontWeight: '400',
    color: staticColors.cream,
  },
  moodIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  moodLabel: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(10),
    color: staticColors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
