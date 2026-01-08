/**
 * src/features/recommendations/screens/PreferencesScreen.tsx
 * 
 * View and edit preferences from Profile
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { usePreferencesStore } from '../stores/preferencesStore';
import { Icon } from '@/shared/components/Icon';
import { spacing, radius, accentColors, useThemeColors } from '@/shared/theme';

export function PreferencesScreen() {
  const themeColors = useThemeColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const preferences = usePreferencesStore();

  const handleEditPreferences = () => {
    navigation.navigate('PreferencesOnboarding');
  };

  const handleResetPreferences = () => {
    preferences.resetPreferences();
  };

  const lengthLabels = {
    short: 'Quick listens (under 8 hours)',
    medium: 'Medium (8-20 hours)',
    long: 'Epic journeys (20+ hours)',
    any: 'No preference',
  };

  const seriesLabel = preferences.prefersSeries === null 
    ? 'No preference' 
    : preferences.prefersSeries 
      ? 'Prefers series' 
      : 'Prefers standalones';

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="ArrowLeft" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>Reading Preferences</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!preferences.hasCompletedOnboarding ? (
          <View style={styles.emptyState}>
            <Icon name="Sparkles" size={48} color={accentColors.gold} />
            <Text style={[styles.emptyTitle, { color: themeColors.text }]}>Set up your preferences</Text>
            <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
              Answer a few questions to get personalized recommendations
            </Text>
            <TouchableOpacity style={styles.setupButton} onPress={handleEditPreferences}>
              <Text style={styles.setupButtonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Moods */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: themeColors.textTertiary }]}>Reading Moods</Text>
              <View style={styles.tagsRow}>
                {preferences.moods.length > 0 ? (
                  preferences.moods.map(mood => (
                    <View key={mood} style={[styles.tag, { backgroundColor: 'rgba(243, 182, 12, 0.15)' }]}>
                      <Text style={[styles.tagText, { color: accentColors.gold }]}>{mood}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={[styles.emptyText, { color: themeColors.textTertiary }]}>None selected</Text>
                )}
              </View>
            </View>

            {/* Genres */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: themeColors.textTertiary }]}>Favorite Genres</Text>
              <View style={styles.tagsRow}>
                {preferences.favoriteGenres.length > 0 ? (
                  preferences.favoriteGenres.map(genre => (
                    <View key={genre} style={[styles.tag, { backgroundColor: 'rgba(243, 182, 12, 0.15)' }]}>
                      <Text style={[styles.tagText, { color: accentColors.gold }]}>{genre}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={[styles.emptyText, { color: themeColors.textTertiary }]}>None selected</Text>
                )}
              </View>
            </View>

            {/* Length */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: themeColors.textTertiary }]}>Preferred Length</Text>
              <Text style={[styles.valueText, { color: themeColors.text }]}>{lengthLabels[preferences.preferredLength]}</Text>
            </View>

            {/* Series */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: themeColors.textTertiary }]}>Series Preference</Text>
              <Text style={[styles.valueText, { color: themeColors.text }]}>{seriesLabel}</Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.editButton, { backgroundColor: 'rgba(243, 182, 12, 0.15)' }]} onPress={handleEditPreferences}>
                <Icon name="Plus" size={20} color={accentColors.gold} />
                <Text style={[styles.editButtonText, { color: accentColors.gold }]}>Edit Preferences</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.resetButton} onPress={handleResetPreferences}>
                <Icon name="RefreshCw" size={20} color={themeColors.textTertiary} />
                <Text style={[styles.resetButtonText, { color: themeColors.textTertiary }]}>Reset All</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor set via themeColors in JSX
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    // color set via themeColors in JSX
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    marginTop: spacing.md,
    fontSize: 20,
    fontWeight: '700',
    // color set via themeColors in JSX
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 15,
    // color set via themeColors in JSX
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  setupButton: {
    backgroundColor: accentColors.gold,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  setupButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    // color set via themeColors in JSX
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    // backgroundColor set via themeColors in JSX
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.xl,
  },
  tagText: {
    fontSize: 14,
    // color set via accentColors in JSX
    fontWeight: '500',
  },
  valueText: {
    fontSize: 16,
    // color set via themeColors in JSX
  },
  emptyText: {
    fontSize: 14,
    // color set via themeColors in JSX
    fontStyle: 'italic',
  },
  actions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor set via themeColors in JSX
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
    // color set via accentColors in JSX
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  resetButtonText: {
    fontSize: 14,
    // color set via themeColors in JSX
  },
});