/**
 * App Navigator - with bottom tabs
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '@/core/auth';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { LibraryItemsScreen } from '@/features/library';
import { BookDetailScreen } from '@/features/book-detail';
import { SearchScreen } from '@/features/search';
import { MiniPlayer, PlayerScreen } from '@/features/player';
import { SplashScreen } from '@/shared/components/SplashScreen';
import { Icon } from '@/shared/components/Icon';
import { theme } from '@/shared/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Main tabs for authenticated users
 */
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.background.elevated,
          borderTopColor: theme.colors.border.light,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.colors.primary[500],
        tabBarInactiveTintColor: theme.colors.text.tertiary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="LibraryTab"
        component={LibraryItemsScreen}
        options={{
          tabBarLabel: 'Library',
          tabBarIcon: ({ color, size }) => (
            <Icon name="library" size={size} color={color} set="ionicons" />
          ),
        }}
      />
      
      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Search',
          tabBarIcon: ({ color, size }) => (
            <Icon name="search" size={size} color={color} set="ionicons" />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

/**
 * Main app navigator
 */
export function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          {!isAuthenticated ? (
            <Stack.Screen
              name="Login"
              component={LoginScreen}
            />
          ) : (
            <>
              <Stack.Screen
                name="Main"
                component={MainTabs}
              />
              <Stack.Screen
                name="BookDetail"
                component={BookDetailScreen}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>

      {isAuthenticated && (
        <View style={styles.miniPlayerContainer}>
          <MiniPlayer />
        </View>
      )}

      {isAuthenticated && <PlayerScreen />}
    </>
  );
}

const styles = StyleSheet.create({
  miniPlayerContainer: {
    position: 'absolute',
    bottom: 60, // Above tab bar
    left: 0,
    right: 0,
  },
});
