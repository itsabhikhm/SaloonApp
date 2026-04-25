import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth';
import { theme, spacing, formatINR } from '../../src/theme';

const HERO = 'https://images.pexels.com/photos/7195812/pexels-photo-7195812.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940';
const CATEGORIES = [
  { name: 'Hair', icon: 'cut-outline' },
  { name: 'Skin', icon: 'happy-outline' },
  { name: 'Makeup', icon: 'color-palette-outline' },
  { name: 'Academy', icon: 'school-outline' },
];

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [pros, setPros] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cat, setCat] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, p, pr] = await Promise.all([
        api.get('/services'),
        api.get('/professionals'),
        api.get('/promos'),
      ]);
      setServices(s.data); setPros(p.data); setPromos(pr.data);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = cat ? services.filter(s => s.category === cat) : services;

  if (loading) return <View style={st.center}><ActivityIndicator color={theme.gold} /></View>;

  return (
    <SafeAreaView style={st.c} edges={['top']}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.gold} />}>
        <View style={st.header}>
          <View>
            <Text style={st.hello}>Hello,</Text>
            <Text style={st.name}>{user?.name || 'Guest'}</Text>
          </View>
          <View style={st.brandTag}>
            <Text style={st.brandTxt}>COLOURS</Text>
          </View>
        </View>

        {/* Hero */}
        <View style={st.heroWrap}>
          <Image source={{ uri: HERO }} style={st.heroImg} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={st.heroGrad}>
            <Text style={st.heroTitle}>Indulge in{'\n'}luxury</Text>
            <Text style={st.heroSub}>Book your signature experience</Text>
          </LinearGradient>
        </View>

        {/* Promos */}
        {promos.length > 0 && (
          <View style={st.section}>
            <Text style={st.sectionTitle}>OFFERS FOR YOU</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
              {promos.map(p => (
                <View key={p.id} style={st.promoCard} testID={`promo-card-${p.code}`}>
                  <Ionicons name="pricetag" color={theme.gold} size={18} />
                  <Text style={st.promoCode}>{p.code}</Text>
                  <Text style={st.promoDisc}>{p.discount_percent}% OFF</Text>
                  <Text style={st.promoDesc}>{p.description}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Categories */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>CATEGORIES</Text>
          <View style={st.catGrid}>
            <TouchableOpacity testID="cat-all" onPress={() => setCat(null)} style={[st.catChip, !cat && st.catChipActive]}>
              <Text style={[st.catTxt, !cat && st.catTxtActive]}>All</Text>
            </TouchableOpacity>
            {CATEGORIES.map(c => (
              <TouchableOpacity key={c.name} testID={`cat-${c.name}`} onPress={() => setCat(c.name)} style={[st.catChip, cat === c.name && st.catChipActive]}>
                <Ionicons name={c.icon as any} color={cat === c.name ? theme.textInverse : theme.gold} size={14} />
                <Text style={[st.catTxt, cat === c.name && st.catTxtActive]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Services */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>SIGNATURE SERVICES</Text>
          {filtered.map(s => (
            <TouchableOpacity key={s.id} testID={`service-${s.id}`} style={st.svcCard} onPress={() => router.push(`/book/${s.id}`)}>
              <Image source={{ uri: s.image_url }} style={st.svcImg} />
              <View style={st.svcInfo}>
                <Text style={st.svcCat}>{s.category.toUpperCase()}</Text>
                <Text style={st.svcName}>{s.name}</Text>
                <Text style={st.svcDesc} numberOfLines={2}>{s.description}</Text>
                <View style={st.svcFooter}>
                  <Text style={st.svcPrice}>{formatINR(s.price)}</Text>
                  <Text style={st.svcDur}>{s.duration_min} min</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Top Professionals */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>TOP PROFESSIONALS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
            {pros.map(p => (
              <View key={p.id} style={st.proCard} testID={`pro-card-${p.id}`}>
                <Image source={{ uri: p.image_url }} style={st.proImg} />
                <Text style={st.proName}>{p.name}</Text>
                <Text style={st.proSpec}>{p.specialty}</Text>
                <View style={st.proRate}>
                  <Ionicons name="star" color={theme.gold} size={12} />
                  <Text style={st.proRateTxt}>{p.rating?.toFixed(1)}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
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
  hello: { color: theme.textSecondary, fontSize: 14 },
  name: { color: theme.text, fontSize: 22, fontWeight: '300', marginTop: 2 },
  brandTag: { borderWidth: 1, borderColor: theme.gold, paddingVertical: 6, paddingHorizontal: 14 },
  brandTxt: { color: theme.gold, letterSpacing: 3, fontSize: 12, fontWeight: '600' },
  heroWrap: { marginHorizontal: spacing.lg, height: 220, borderRadius: 4, overflow: 'hidden' },
  heroImg: { width: '100%', height: '100%' },
  heroGrad: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: spacing.lg },
  heroTitle: { color: theme.text, fontSize: 32, fontWeight: '300', lineHeight: 38 },
  heroSub: { color: theme.goldLight, marginTop: 6, letterSpacing: 1 },
  section: { marginTop: spacing.xl },
  sectionTitle: { color: theme.gold, fontSize: 11, letterSpacing: 2, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  promoCard: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.gold, padding: spacing.md, width: 220, borderRadius: 4 },
  promoCode: { color: theme.text, fontSize: 18, fontWeight: '600', marginTop: 6, letterSpacing: 1 },
  promoDisc: { color: theme.gold, fontSize: 22, fontWeight: '700', marginTop: 4 },
  promoDesc: { color: theme.textSecondary, fontSize: 12, marginTop: 4 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: spacing.lg },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: theme.gold, borderRadius: 20 },
  catChipActive: { backgroundColor: theme.gold },
  catTxt: { color: theme.gold, fontSize: 13 },
  catTxtActive: { color: theme.textInverse, fontWeight: '600' },
  svcCard: { flexDirection: 'row', backgroundColor: theme.surface, marginHorizontal: spacing.lg, marginBottom: spacing.md, borderRadius: 4, overflow: 'hidden', borderWidth: 1, borderColor: theme.borderLight },
  svcImg: { width: 110, height: 110 },
  svcInfo: { flex: 1, padding: spacing.md, justifyContent: 'space-between' },
  svcCat: { color: theme.gold, fontSize: 10, letterSpacing: 1.5 },
  svcName: { color: theme.text, fontSize: 16, fontWeight: '500', marginTop: 2 },
  svcDesc: { color: theme.textSecondary, fontSize: 12, marginTop: 4 },
  svcFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 6 },
  svcPrice: { color: theme.gold, fontSize: 18, fontWeight: '700' },
  svcDur: { color: theme.textSecondary, fontSize: 11 },
  proCard: { width: 140, backgroundColor: theme.surface, padding: spacing.md, borderRadius: 4, alignItems: 'center', borderWidth: 1, borderColor: theme.borderLight },
  proImg: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: theme.gold },
  proName: { color: theme.text, fontSize: 14, fontWeight: '600', marginTop: 8 },
  proSpec: { color: theme.textSecondary, fontSize: 11, marginTop: 2, textAlign: 'center' },
  proRate: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  proRateTxt: { color: theme.gold, fontSize: 12, fontWeight: '600' },
});
