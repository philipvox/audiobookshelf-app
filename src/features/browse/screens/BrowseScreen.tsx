import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SeriesListContent } from '../components/SeriesListContent';
import { AuthorsListContent } from '../components/AuthorsListContent';
import { NarratorsListContent } from '../components/NarratorsListContent';
import { CollectionsListContent } from '../components/CollectionsListContent';
import { theme } from '@/shared/theme';

const TopTab = createMaterialTopTabNavigator();

export function BrowseScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background.primary} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Browse</Text>
      </View>

      <TopTab.Navigator
        screenOptions={{
          tabBarActiveTintColor: theme.colors.primary[500],
          tabBarInactiveTintColor: theme.colors.text.tertiary,
          tabBarIndicatorStyle: {
            backgroundColor: theme.colors.primary[500],
            height: 3,
            borderRadius: 1.5,
          },
          tabBarStyle: {
            backgroundColor: theme.colors.background.primary,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border.light,
          },
          tabBarLabelStyle: {
            fontSize: 14,
            fontWeight: '600',
            textTransform: 'none',
          },
          tabBarPressColor: theme.colors.overlay.light,
        }}
      >
        <TopTab.Screen name="Series" component={SeriesListContent} />
        <TopTab.Screen name="Authors" component={AuthorsListContent} />
        <TopTab.Screen name="Narrators" component={NarratorsListContent} />
        <TopTab.Screen name="Collections" component={CollectionsListContent} />
      </TopTab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[3],
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: theme.colors.text.primary,
    letterSpacing: -0.5,
  },
});