import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/auth';
import { theme } from '../src/theme';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (user.role === 'admin') router.replace('/(admin)/dashboard');
    else router.replace('/(user)/home');
  }, [user, loading]);

  return (
    <View style={styles.c}>
      <Text style={styles.brand}>COLOURS</Text>
      <Text style={styles.tag}>Hair · Skin · Makeup · Academy</Text>
      <ActivityIndicator color={theme.gold} style={{ marginTop: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 42, color: theme.gold, fontWeight: '300', letterSpacing: 6 },
  tag: { color: theme.textSecondary, marginTop: 8, letterSpacing: 4, fontSize: 12 },
});
