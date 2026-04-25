import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/api';
import { theme, spacing, formatINR } from '../../src/theme';

export default function AdminBookings() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const r = await api.get('/admin/bookings'); setItems(r.data); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={st.c} edges={['top']}>
      <View style={st.header}><Text style={st.title}>All Bookings</Text></View>
      {loading ? <ActivityIndicator color={theme.gold} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.gold} />}>
          {items.length === 0 ? <Text style={st.empty}>No bookings yet</Text> : items.map(b => (
            <View key={b.id} style={st.card}>
              <View style={st.row}><Text style={st.svc}>{b.service_name}</Text><Text style={st.price}>{formatINR(b.total)}</Text></View>
              <Text style={st.meta}>👤 {b.user_name}  •  💼 {b.professional_name}</Text>
              <Text style={st.meta}>📅 {new Date(b.booking_datetime).toLocaleString()}</Text>
              {b.advance_paid > 0 && <Text style={st.paid}>✓ Advance {formatINR(b.advance_paid)} paid</Text>}
              {b.promo_code && <Text style={st.promo}>Promo: {b.promo_code} (-{formatINR(b.discount)})</Text>}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  c: { flex: 1, backgroundColor: theme.bg },
  header: { padding: spacing.lg },
  title: { color: theme.text, fontSize: 28, fontWeight: '300' },
  empty: { color: theme.textSecondary, textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: theme.surface, padding: spacing.md, marginBottom: spacing.md, borderRadius: 4, borderWidth: 1, borderColor: theme.borderLight },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  svc: { color: theme.text, fontSize: 16, fontWeight: '500', flex: 1 },
  price: { color: theme.gold, fontSize: 18, fontWeight: '700' },
  meta: { color: theme.textSecondary, fontSize: 12, marginTop: 6 },
  paid: { color: theme.gold, fontSize: 12, marginTop: 6 },
  promo: { color: theme.success, fontSize: 12, marginTop: 4 },
});
