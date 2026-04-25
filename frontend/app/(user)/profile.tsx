import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/auth';
import { theme, spacing } from '../../src/theme';

export default function Profile() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const doLogout = async () => {
    // Confirm via Alert; if user accepts, clear token and force navigation to login.
    const proceed = () => {
      logout().finally(() => {
        try { router.replace('/login'); } catch {}
      });
    };
    if (typeof window !== 'undefined' && typeof (globalThis as any).confirm === 'function') {
      // Web fallback (Alert.alert is not interactive on RN-Web)
      if ((globalThis as any).confirm('Sign out of Colours?')) proceed();
      return;
    }
    Alert.alert('Sign out of Colours?', 'You will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: proceed },
    ]);
  };

  return (
    <SafeAreaView style={st.c} edges={['top']}>
      <View style={st.header}>
        <Text style={st.title}>Profile</Text>
      </View>
      <View style={st.avatar}>
        <Ionicons name="person" size={48} color={theme.gold} />
      </View>
      <Text style={st.name}>{user?.name}</Text>
      {user?.phone ? <Text style={st.email}>📱 {user.phone}</Text> : null}
      {user?.email ? <Text style={st.email}>✉️ {user.email}</Text> : null}

      <View style={st.menu}>
        <TouchableOpacity style={st.row} testID="profile-bookings" onPress={() => router.push('/(user)/bookings')}>
          <Ionicons name="calendar-outline" color={theme.gold} size={20} />
          <Text style={st.rowTxt}>My Bookings</Text>
          <Ionicons name="chevron-forward" color={theme.textSecondary} size={18} />
        </TouchableOpacity>
        <TouchableOpacity style={st.row} testID="profile-home" onPress={() => router.push('/(user)/home')}>
          <Ionicons name="sparkles-outline" color={theme.gold} size={20} />
          <Text style={st.rowTxt}>Discover Services</Text>
          <Ionicons name="chevron-forward" color={theme.textSecondary} size={18} />
        </TouchableOpacity>
        <TouchableOpacity style={[st.row, st.logout]} testID="profile-logout" onPress={doLogout}>
          <Ionicons name="log-out-outline" color={theme.error} size={20} />
          <Text style={[st.rowTxt, { color: theme.error }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  c: { flex: 1, backgroundColor: theme.bg },
  header: { padding: spacing.lg },
  title: { color: theme.text, fontSize: 28, fontWeight: '300' },
  avatar: { alignSelf: 'center', width: 100, height: 100, borderRadius: 50, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: theme.gold, marginTop: spacing.lg },
  name: { color: theme.text, fontSize: 22, textAlign: 'center', marginTop: spacing.md },
  email: { color: theme.textSecondary, textAlign: 'center', marginTop: 4 },
  menu: { marginTop: spacing.xl, marginHorizontal: spacing.lg, gap: 1 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, padding: spacing.md, gap: spacing.md, borderRadius: 4 },
  rowTxt: { flex: 1, color: theme.text, fontSize: 15 },
  logout: { marginTop: spacing.lg },
});
