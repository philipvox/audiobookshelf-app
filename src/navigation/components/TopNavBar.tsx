// File: src/navigation/components/TopNavBar.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '@/shared/components/Icon';
import { useAuth } from '@/core/auth';
import { theme } from '@/shared/theme';

export function TopNavBar() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();

  const handleSearchPress = () => {
    navigation.navigate('SearchTab' as never);
  };

  const handleProfilePress = () => {
    navigation.navigate('ProfileTab' as never);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Profile avatar - left */}
      <TouchableOpacity 
        style={styles.avatarButton}
        onPress={handleProfilePress}
        activeOpacity={0.8}
      >
        {user?.username ? (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {user.username.charAt(0).toUpperCase()}
            </Text>
          </View>
        ) : (
          <Icon name="person-circle" size={36} color={theme.colors.text.tertiary} set="ionicons" />
        )}
      </TouchableOpacity>

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Search pill - right */}
      <TouchableOpacity 
        style={styles.searchPill}
        onPress={handleSearchPress}
        activeOpacity={0.8}
      >
        <Icon name="search" size={18} color={theme.colors.text.tertiary} set="ionicons" />
        <Text style={styles.searchText}>Search</Text>
      </TouchableOpacity>

      {/* Notification icon - far right */}
      <TouchableOpacity 
        style={styles.notificationButton}
        activeOpacity={0.8}
      >
        <Icon name="notifications-outline" size={22} color={theme.colors.text.primary} set="ionicons" />
        {/* Red dot indicator */}
        <View style={styles.notificationDot} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[2],
    backgroundColor: theme.colors.background.primary,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary[600],
  },
  spacer: {
    flex: 1,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  searchText: {
    fontSize: 15,
    color: theme.colors.text.tertiary,
  },
  notificationButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing[2],
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53935',
  },
});