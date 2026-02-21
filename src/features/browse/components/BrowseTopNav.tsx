/**
 * src/features/browse/components/BrowseTopNav.tsx
 *
 * Top navigation bar for the Browse screen.
 * Uses the standard TopNav component with mood pill and audience toggle.
 */

import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SlidersHorizontal, Tag } from 'lucide-react-native';
import { secretLibraryColors as staticColors, secretLibraryFonts } from '@/shared/theme/secretLibrary';
import { scale } from '@/shared/theme';
import { TopNav, TopNavCloseIcon, Icon } from '@/shared/components';
import {
  useActiveSession,
  useHasActiveSession,
  useMoodSessionStore,
} from '@/features/mood-discovery/stores/moodSessionStore';
import { MOODS } from '@/features/mood-discovery/types';
import { AudienceFilter, useContentFilterStore } from '../stores/contentFilterStore';

interface BrowseTopNavProps {
  onMoodPress?: () => void;
  onClose?: () => void;
  onLogoPress?: () => void;
  onLogoLongPress?: () => void;
  onKidsFilterPress?: () => void;
  onTagFilterPress?: () => void;
}

export function BrowseTopNav({ onMoodPress, onClose, onLogoPress, onLogoLongPress, onKidsFilterPress, onTagFilterPress }: BrowseTopNavProps) {
  // Mood session hooks
  const hasActiveSession = useHasActiveSession();
  const session = useActiveSession();
  const clearSession = useMoodSessionStore((state) => state.clearSession);

  // Content filter hooks
  const audience = useContentFilterStore((s) => s.audience);
  const selectedAges = useContentFilterStore((s) => s.selectedAges);
  const selectedRatings = useContentFilterStore((s) => s.selectedRatings);
  const selectedTags = useContentFilterStore((s) => s.selectedTags);
  const lengthRange = useContentFilterStore((s) => s.lengthRange);
  const setAudience = useContentFilterStore((s) => s.setAudience);

  // Get active mood config for display
  const activeMoodConfig = useMemo(() => {
    if (!session?.mood) return null;
    return MOODS.find((m) => m.id === session.mood) || null;
  }, [session?.mood]);

  const handleClearMood = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    clearSession();
  }, [clearSession]);

  // Audience toggle handler
  const handleAudienceChange = useCallback((newAudience: AudienceFilter) => {
    Haptics.selectionAsync();
    setAudience(newAudience);
  }, [setAudience]);

  // Get filter counts for display
  const ageFilterCount = useMemo(() => {
    return selectedAges.length + selectedRatings.length;
  }, [selectedAges, selectedRatings]);

  const tagFilterCount = selectedTags.length + (lengthRange ? 1 : 0);

  // Build pills array - mood pill only
  const pills = useMemo(() => {
    if (hasActiveSession && activeMoodConfig) {
      // Active mood: filled pill with label and X to cancel
      return [
        {
          key: 'mood',
          label: activeMoodConfig.label,
          icon: (
            <Icon
              name={activeMoodConfig.icon}
              size={12}
              color={staticColors.black}
              set={activeMoodConfig.iconSet as any}
            />
          ),
          active: true,
          onPress: handleClearMood, // Tap to cancel
          showClose: true, // Show X indicator
        },
      ];
    }
    // No active mood: outline white pill with filled icon
    return [
      {
        key: 'mood',
        label: 'Mood',
        icon: (
          <Icon
            name="Sparkles"
            size={12}
            color={staticColors.white}
          />
        ),
        active: false,
        outline: true, // White outline style
        onPress: onMoodPress,
      },
    ];
  }, [hasActiveSession, activeMoodConfig, onMoodPress, handleClearMood]);

  // Custom center content with audience toggle
  const centerContent = (
    <View style={styles.audienceToggle}>
      <Pressable
        style={[styles.audienceOption, audience === 'all' && styles.audienceOptionActive]}
        onPress={() => handleAudienceChange('all')}
      >
        <Text style={[styles.audienceText, audience === 'all' && styles.audienceTextActive]}>
          All
        </Text>
      </Pressable>
      <Pressable
        style={[styles.audienceOption, audience === 'kids' && styles.audienceOptionActive]}
        onPress={() => handleAudienceChange('kids')}
      >
        <Text style={[styles.audienceText, audience === 'kids' && styles.audienceTextActive]}>
          Kids
        </Text>
      </Pressable>
      <Pressable
        style={[styles.audienceOption, audience === 'adults' && styles.audienceOptionActive]}
        onPress={() => handleAudienceChange('adults')}
      >
        <Text style={[styles.audienceText, audience === 'adults' && styles.audienceTextActive]}>
          Adults
        </Text>
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: staticColors.black }]}>
      <TopNav
        variant="dark"
        showLogo={true}
        onLogoPress={onLogoPress}
        onLogoLongPress={onLogoLongPress}
        style={{ backgroundColor: 'transparent' }}
        includeSafeArea={false}
        pills={pills}
        centerContent={centerContent}
        circleButtons={[
          {
            key: 'close',
            icon: <TopNavCloseIcon color={staticColors.cream} size={14} />,
            onPress: onClose,
          },
        ]}
      />
      {/* Filter row - show below nav */}
      <View style={styles.filterRow}>
        {/* Tag filter - always available */}
        <Pressable style={styles.filterButton} onPress={onTagFilterPress}>
          <Tag size={14} color={staticColors.white} />
          {tagFilterCount > 0 && (
            <Text style={styles.filterCount}>{tagFilterCount}</Text>
          )}
          <Text style={styles.filterLabel}>Tags</Text>
        </Pressable>

        {/* Age filter - only when Kids is selected */}
        {audience === 'kids' && (
          <Pressable style={styles.filterButton} onPress={onKidsFilterPress}>
            <SlidersHorizontal size={14} color={staticColors.white} />
            {ageFilterCount > 0 && (
              <Text style={styles.filterCount}>{ageFilterCount}</Text>
            )}
            <Text style={styles.filterLabel}>Ages</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: staticColors.black,
  },
  audienceToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: scale(20),
    padding: 3,
  },
  audienceOption: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(6),
    borderRadius: scale(17),
  },
  audienceOptionActive: {
    backgroundColor: staticColors.white,
  },
  audienceText: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(10),
    color: staticColors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  audienceTextActive: {
    color: staticColors.black,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterCount: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(11),
    color: staticColors.white,
    fontWeight: '600',
  },
  filterLabel: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(10),
    color: staticColors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
