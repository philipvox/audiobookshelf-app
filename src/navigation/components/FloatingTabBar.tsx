// File: src/navigation/components/FloatingTabBar.tsx
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { usePlayerStore } from '@/features/player';
import { Icon } from '@/shared/components/Icon';
import { theme } from '@/shared/theme';

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  LibraryTab: { active: 'flame', inactive: 'flame-outline' },
  BrowseTab: { active: 'home', inactive: 'home-outline' },
  ProfileTab: { active: 'bookmark', inactive: 'bookmark-outline' },
};

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { currentBook } = usePlayerStore();
  const hasPlayer = !!currentBook;

  // Filter to only show 3 tabs (exclude SearchTab - it's in top bar now)
  const visibleRoutes = state.routes.filter(r => r.name !== 'SearchTab');

  return (
    <View style={[
      styles.container, 
      { bottom: insets.bottom > 0 ? insets.bottom : 16 },
      hasPlayer && styles.containerWithPlayer,
    ]}>
      <View style={styles.pill}>
        {visibleRoutes.map((route, index) => {
          const originalIndex = state.routes.findIndex(r => r.key === route.key);
          const isFocused = state.index === originalIndex;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const icons = TAB_ICONS[route.name] || { active: 'ellipse', inactive: 'ellipse-outline' };
          const iconName = isFocused ? icons.active : icons.inactive;

          return (
            <React.Fragment key={route.key}>
              {/* Divider line before non-first items */}
              {index > 0 && <View style={styles.divider} />}
              
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                onPress={onPress}
                style={styles.tab}
                activeOpacity={0.7}
              >
                {/* Selection indicator notch */}
                {isFocused && <View style={styles.indicator} />}
                
                <Icon
                  name={iconName}
                  size={24}
                  color={isFocused ? theme.colors.text.primary : theme.colors.text.tertiary}
                  set="ionicons"
                />
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  containerWithPlayer: {
    right:10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 6,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 30 },
    shadowOpacity: 0.35,
    shadowRadius: 54,
    elevation: 12,
  },
  tab: {
    width: 52,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: theme.colors.neutral[200],
    opacity: 0.5,
  },
  indicator: {
    position: 'absolute',
    top: -2,
    width: 20,
    height: 4,
    backgroundColor: theme.colors.text.primary,
    borderRadius: 2,
  },
});