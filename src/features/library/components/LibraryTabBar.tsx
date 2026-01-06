/**
 * src/features/library/components/LibraryTabBar.tsx
 *
 * Tab bar component for MyLibraryScreen.
 * Uses home-style large text tabs.
 */

import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { scale, spacing } from '@/shared/theme';
import { useThemeColors } from '@/shared/theme/themeStore';
import { TabType, TAB_ORDER, TAB_LABELS } from '../types';

interface LibraryTabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const LibraryTabBar = React.memo(function LibraryTabBar({
  activeTab,
  onTabChange,
}: LibraryTabBarProps) {
  const themeColors = useThemeColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabBar}
      style={styles.tabBarContainer}
    >
      {TAB_ORDER.map((tabId) => {
        const isActive = activeTab === tabId;
        return (
          <TouchableOpacity
            key={tabId}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onTabChange(tabId);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            style={styles.textTab}
          >
            <Text style={[
              styles.textTabLabel,
              { color: isActive ? themeColors.text : themeColors.textTertiary },
            ]}>
              {TAB_LABELS[tabId]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  tabBarContainer: {
    marginBottom: spacing.sm,
    flexGrow: 0,
    flexShrink: 0,
  },
  tabBar: {
    paddingHorizontal: spacing.xl,
    gap: scale(14),
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  textTab: {
    paddingVertical: scale(2),
  },
  textTabLabel: {
    fontSize: scale(26),
    fontWeight: '400',
  },
});

export default LibraryTabBar;
