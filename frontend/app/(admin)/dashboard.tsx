import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth';
import { theme, spacing, formatINR } from '../../src/theme';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get('/admin/dashboard');
      setData(r.data);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const doLogout = async () => { await logout(); router.replace('/login'); };

  if (loading) return <View style={st.center}><ActivityIndicator color={theme.gold} /></View>;

  return (
    <SafeAreaView style={st.c} edges={['top']}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.gold} />}>
        <View style={st.header}>
          <View>
            <Text style={st.greet}>Admin Console</Text>
            <Text style={st.name}>{user?.name}</Text>
          </View>
          <TouchableOpacity testID="admin-logout" onPress={doLogout}>
            <Ionicons name="log-out-outline" color={theme.gold} size={24} />
          </TouchableOpacity>
        </View>

        <LinearGradient colors={['#1f1700', '#0A0A0A']} style={st.heroCard}>
          <Text style={st.heroLbl}>TODAY'S REVENUE</Text>
          <Text style={st.heroVal}>{formatINR(data.today_revenue)}</Text>
          <View style={st.targetBar}>
            <View style={[st.targetFill, { width: `${Math.min(100, data.target_percent)}%` }]} />
          </View>
          <Text style={st.heroSub}>Target: {formatINR(data.today_target)} · {data.target_percent}% achieved</Text>
        </LinearGradient>

        <View style={st.statsRow}>
          <View style={st.stat}>
            <Ionicons name="calendar" color={theme.gold} size={20} />
            <Text style={st.statV}>{data.total_bookings}</Text>
            <Text style={st.statL}>Bookings</Text>
          </View>
          <View style={st.stat}>
            <Ionicons name="people" color={theme.gold} size={20} />
            <Text style={st.statV}>{data.total_professionals}</Text>
            <Text style={st.statL}>Staff</Text>
          </View>
        </View>

        <View style={st.section}>
          <Text style={st.sectionTitle}>STAFF TARGETS · TODAY</Text>
          {data.per_professional.length === 0 ? (
            <Text style={st.emptyTxt}>Add professionals first</Text>
          ) : data.per_professional.map((p: any) => (
            <View key={p.professional_id} style={st.proRow} testID={`target-${p.professional_id}`}>
              <View style={{ flex: 1 }}>
                <Text style={st.proName}>{p.name}</Text>
                <View style={st.bar}>
                  <View style={[st.barFill, { width: `${Math.min(100, p.percent)}%` }]} />
                </View>
                <Text style={st.proMeta}>{formatINR(p.amount)} / {formatINR(p.target)}</Text>
              </View>
              <Text style={[st.percent, p.percent >= 100 ? { color: theme.success } : { color: theme.gold }]}>{p.percent}%</Text>
            </View>
          ))}
        </View>

        <View style={st.section}>
          <Text style={st.sectionTitle}>RECENT BOOKINGS</Text>
          {data.recent_bookings.length === 0 ? (
            <Text style={st.emptyTxt}>No bookings yet</Text>
          ) : data.recent_bookings.map((b: any) => (
            <View key={b.id} style={st.bookRow}>
              <View style={{ flex: 1 }}>
                <Text style={st.bookSvc}>{b.service_name}</Text>
                <Text style={st.bookMeta}>{b.user_name} → {b.professional_name}</Text>
              </View>
              <Text style={st.bookPrice}>{formatINR(b.total)}</Text>
            </View>
          ))}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  c: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  greet: { color: theme.gold, letterSpacing: 2, fontSize: 11 },
  name: { color: theme.text, fontSize: 22, fontWeight: '300', marginTop: 2 },
  heroCard: { marginHorizontal: spacing.lg, padding: spacing.lg, borderRadius: 4, borderWidth: 1, borderColor: theme.gold },
  heroLbl: { color: theme.gold, letterSpacing: 2, fontSize: 11 },
  heroVal: { color: theme.text, fontSize: 40, fontWeight: '300', marginTop: 8 },
  targetBar: { height: 6, backgroundColor: theme.surfaceElevated, borderRadius: 3, marginTop: spacing.md, overflow: 'hidden' },
  targetFill: { height: '100%', backgroundColor: theme.gold },
  heroSub: { color: theme.textSecondary, marginTop: 8, fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, marginTop: spacing.md },
  stat: { flex: 1, backgroundColor: theme.surface, padding: spacing.md, borderRadius: 4, alignItems: 'center', borderWidth: 1, borderColor: theme.borderLight, gap: 6 },
  statV: { color: theme.text, fontSize: 24, fontWeight: '300' },
  statL: { color: theme.textSecondary, fontSize: 11, letterSpacing: 1 },
  section: { marginTop: spacing.xl },
  sectionTitle: { color: theme.gold, fontSize: 11, letterSpacing: 2, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  emptyTxt: { color: theme.textSecondary, paddingHorizontal: spacing.lg, fontStyle: 'italic' },
  proRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.lg, marginBottom: spacing.md, backgroundColor: theme.surface, padding: spacing.md, borderRadius: 4 },
  proName: { color: theme.text, fontSize: 14, fontWeight: '500' },
  bar: { height: 4, backgroundColor: theme.surfaceElevated, marginTop: 6, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: theme.gold },
  proMeta: { color: theme.textSecondary, fontSize: 11, marginTop: 4 },
  percent: { fontSize: 18, fontWeight: '700' },
  bookRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.lg, marginBottom: spacing.sm, backgroundColor: theme.surface, padding: spacing.md, borderRadius: 4 },
  bookSvc: { color: theme.text, fontSize: 14 },
  bookMeta: { color: theme.textSecondary, fontSize: 11, marginTop: 2 },
  bookPrice: { color: theme.gold, fontSize: 16, fontWeight: '600' },
});
