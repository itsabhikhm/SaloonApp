import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { theme, spacing, formatINR } from '../../src/theme';

export default function Bookings() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/bookings');
      setItems(data);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={st.c} edges={['top']}>
      <View style={st.header}>
        <Text style={st.title}>My Bookings</Text>
      </View>
      {loading ? (
        <View style={st.center}><ActivityIndicator color={theme.gold} /></View>
      ) : items.length === 0 ? (
        <View style={st.center}>
          <Ionicons name="calendar-outline" size={48} color={theme.goldMuted} />
          <Text style={st.empty}>No bookings yet</Text>
          <Text style={st.emptySub}>Book your first luxury experience</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.gold} />}>
          {items.map(b => (
            <View key={b.id} style={st.card} testID={`booking-${b.id}`}>
              <View style={st.row}>
                <Text style={st.svc}>{b.service_name}</Text>
                <View style={[st.badge, b.status === 'confirmed' && st.badgeOk]}>
                  <Text style={st.badgeTxt}>{b.status?.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={st.pro}>with {b.professional_name}</Text>
              <View style={st.divider} />
              <View style={st.row}>
                <View style={st.metaRow}>
                  <Ionicons name="calendar-outline" size={14} color={theme.gold} />
                  <Text style={st.meta}>{new Date(b.booking_datetime).toLocaleString()}</Text>
                </View>
              </View>
              <View style={st.row}>
                <Text style={st.priceLabel}>Total</Text>
                <Text style={st.price}>{formatINR(b.total)}</Text>
              </View>
              {b.discount > 0 && (
                <Text style={st.discount}>You saved {formatINR(b.discount)} with {b.promo_code}</Text>
              )}
              {b.advance_paid > 0 && (
                <Text style={st.paid}>✓ Advance paid: {formatINR(b.advance_paid)}</Text>
              )}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  empty: { color: theme.text, fontSize: 16, marginTop: spacing.md },
  emptySub: { color: theme.textSecondary, fontSize: 13 },
  card: { backgroundColor: theme.surface, padding: spacing.md, marginBottom: spacing.md, borderRadius: 4, borderWidth: 1, borderColor: theme.borderLight },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  svc: { color: theme.text, fontSize: 17, fontWeight: '500', flex: 1 },
  pro: { color: theme.gold, fontSize: 13, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, backgroundColor: theme.surfaceElevated },
  badgeOk: { backgroundColor: theme.success + '30' },
  badgeTxt: { color: theme.text, fontSize: 10, letterSpacing: 1 },
  divider: { height: 1, backgroundColor: theme.borderLight, marginVertical: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { color: theme.textSecondary, fontSize: 13 },
  priceLabel: { color: theme.textSecondary, fontSize: 13 },
  price: { color: theme.gold, fontSize: 20, fontWeight: '700' },
  discount: { color: theme.success, fontSize: 12, marginTop: 4 },
  paid: { color: theme.gold, fontSize: 12, marginTop: 4 },
});
