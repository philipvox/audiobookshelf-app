import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/core/auth';
import { Button, Card } from '@/shared/components';
import { Icon } from '@/shared/components/Icon';
import { theme } from '@/shared/theme';

interface SettingsRowProps {
  icon: string;
  label: string;
  value?: string;
}

function SettingsRow({ icon, label, value }: SettingsRowProps) {
  return (
    <View style={styles.settingsRow}>
      <View style={styles.settingsRowLeft}>
        <Icon name={icon} size={20} color={theme.colors.text.secondary} set="ionicons" />
        <Text style={styles.settingsLabel}>{label}</Text>
      </View>
      {value && <Text style={styles.settingsValue}>{value}</Text>}
    </View>
  );
}

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, serverUrl, logout, isLoading } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (err) {
              Alert.alert('Logout Failed', 'Please try again');
            }
          },
        },
      ]
    );
  };

  const initials = user?.username
    ? user.username
        .split(' ')
        .map((word) => word[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  const formatAccountType = (type?: string) => {
    if (!type) return 'Unknown';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background.primary} />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.username}>{user?.username || 'Unknown User'}</Text>
          <Text style={styles.accountType}>{formatAccountType(user?.type)}</Text>
        </View>

        <Card variant="elevated" padding={5} style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          <SettingsRow icon="person-outline" label="Username" value={user?.username} />
          {user?.email && (
            <SettingsRow icon="mail-outline" label="Email" value={user.email} />
          )}
          <SettingsRow icon="shield-checkmark-outline" label="Account Type" value={formatAccountType(user?.type)} />
        </Card>

        <Card variant="elevated" padding={5} style={styles.card}>
          <Text style={styles.cardTitle}>Server</Text>
          <SettingsRow icon="server-outline" label="Server URL" value={serverUrl || 'Not connected'} />
          <SettingsRow icon="checkmark-circle-outline" label="Status" value="Connected" />
        </Card>

        <Card variant="elevated" padding={5} style={styles.card}>
          <Text style={styles.cardTitle}>Settings</Text>
          <SettingsRow icon="color-palette-outline" label="Theme" value="Light" />
          <SettingsRow icon="speedometer-outline" label="Default Speed" value="1.0x" />
          <SettingsRow icon="time-outline" label="Sleep Timer" value="Off" />
        </Card>

        <Card variant="elevated" padding={5} style={styles.card}>
          <Text style={styles.cardTitle}>Storage</Text>
          <SettingsRow icon="cloud-download-outline" label="Downloads" value="0 books" />
          <SettingsRow icon="folder-outline" label="Cache Size" value="0 MB" />
        </Card>

        <View style={styles.logoutSection}>
          <Button
            title="Logout"
            onPress={handleLogout}
            variant="danger"
            size="large"
            fullWidth
            loading={isLoading}
          />
        </View>

        <View style={styles.versionSection}>
          <Text style={styles.versionText}>AudiobookShelf Mobile v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: theme.spacing[32] + 60,
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
  profileSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing[6],
    paddingHorizontal: theme.spacing[5],
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
    ...theme.elevation.medium,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.colors.text.inverse,
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[1],
  },
  accountType: {
    fontSize: 15,
    color: theme.colors.text.secondary,
  },
  card: {
    marginHorizontal: theme.spacing[5],
    marginBottom: theme.spacing[4],
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing[3],
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsLabel: {
    fontSize: 15,
    color: theme.colors.text.primary,
    marginLeft: theme.spacing[3],
  },
  settingsValue: {
    fontSize: 15,
    color: theme.colors.text.secondary,
    maxWidth: 180,
    textAlign: 'right',
  },
  logoutSection: {
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[4],
  },
  versionSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing[4],
  },
  versionText: {
    fontSize: 13,
    color: theme.colors.text.tertiary,
  },
});