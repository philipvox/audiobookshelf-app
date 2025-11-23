/**
 * src/navigation/AppNavigator.tsx
 *
 * Main app navigation structure with authentication flow.
 * Shows splash screen, login screen, or main app based on auth state.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/core/auth';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { LibraryItemsScreen } from '@/features/library';
import { SplashScreen } from '@/shared/components/SplashScreen';

const Stack = createNativeStackNavigator();

export function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show splash screen while checking authentication
  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!isAuthenticated ? (
          // Auth flow - show login screen
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          // Main app flow - show library
          <Stack.Screen
            name="Library"
            component={LibraryItemsScreen}
            options={{
              title: 'My Library',
              headerShown: true,
              headerLargeTitle: true,
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
