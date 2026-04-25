import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api, formatErr } from '../../src/api';
import { theme, spacing, formatINR } from '../../src/theme';

export default function Book() {
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const router = useRouter();
  const [service, setService] = useState<any>(null);
  const [pros, setPros] = useState<any[]>([]);
  const [proId, setProId] = useState<string>('');
  const [dt, setDt] = useState<Date>(() => { const d = new Date(); d.setHours(d.getHours() + 1); d.setMinutes(0, 0, 0); return d; });
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [promo, setPromo] = useState('');
  const [discount, setDiscount] = useState(0);
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [advance, setAdvance] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [sRes, pRes] = await Promise.all([api.get('/services'), api.get('/professionals')]);
      const s = sRes.data.find((x: any) => x.id === serviceId);
      setService(s);
      setPros(pRes.data);
      const matching = pRes.data.filter((p: any) => Array.isArray(p.service_ids) && p.service_ids.includes(serviceId));
      if (matching.length) setProId(matching[0].id);
      else if (pRes.data.length) setProId(pRes.data[0].id);
    })();
  }, [serviceId]);

  const applyPromo = async () => {
    if (!promo.trim()) return;
    try {
      const { data } = await api.post('/promos/validate', { code: promo });
      const d = service.price * (data.discount_percent / 100);
      setDiscount(d);
      setAppliedPromo(data.code);
      Alert.alert('Promo Applied', `${data.discount_percent}% off — You save ${formatINR(d)}`);
    } catch (e) {
      Alert.alert('Invalid Promo', formatErr(e));
    }
  };

  const total = Math.max(0, (service?.price || 0) - discount);
  const advanceAmt = advance ? Math.round(total * 0.3) : 0;

  const confirm = async () => {
    if (!proId) return Alert.alert('Select Professional', 'Please choose a professional');
    setBusy(true);
    try {
      if (advanceAmt > 0) {
        await api.post('/payments/process', { amount: advanceAmt, method: 'card' });
      }
      const res = await api.post('/bookings', {
        service_id: serviceId,
        professional_id: proId,
        booking_datetime: dt.toISOString(),
        promo_code: appliedPromo,
        advance_amount: advanceAmt,
        payment_method: advanceAmt > 0 ? 'card' : 'pay_at_salon',
      });
      const notifs: any[] = res.data.notifications || [];
      const channels = notifs.map(n => n.channel.toUpperCase()).join(' & ') || 'in-app';
      Alert.alert(
        'Booking Confirmed!',
        `Your appointment is booked.${advanceAmt > 0 ? `\n\nAdvance ${formatINR(advanceAmt)} paid successfully.` : ''}\n\n📩 Confirmation sent via ${channels}.`,
        [{ text: 'View Bookings', onPress: () => router.replace('/(user)/bookings') }]);
    } catch (e) {
      Alert.alert('Booking failed', formatErr(e));
    } finally { setBusy(false); }
  };

  if (!service) return <View style={st.center}><ActivityIndicator color={theme.gold} /></View>;

  return (
    <SafeAreaView style={st.c} edges={['top']}>
      <View style={st.header}>
        <TouchableOpacity testID="book-back" onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/(user)/home'); }}>
          <Ionicons name="arrow-back" color={theme.gold} size={24} />
        </TouchableOpacity>
        <Text style={st.title}>Book Appointment</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <Image source={{ uri: service.image_url }} style={st.img} />
        <View>
          <Text style={st.svcCat}>{service.category.toUpperCase()}</Text>
          <Text style={st.svcName}>{service.name}</Text>
          <Text style={st.svcDesc}>{service.description}</Text>
          <Text style={st.svcPrice}>{formatINR(service.price)} · {service.duration_min} min</Text>
        </View>

        <View>
          <Text style={st.lbl}>SELECT PROFESSIONAL</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {pros.map(p => (
              <TouchableOpacity key={p.id} testID={`select-pro-${p.id}`}
                style={[st.proCard, proId === p.id && st.proSel]}
                onPress={() => setProId(p.id)}>
                <Image source={{ uri: p.image_url }} style={st.proImg} />
                <Text style={st.proName}>{p.name}</Text>
                <Text style={st.proSpec}>{p.specialty}</Text>
                <View style={st.proRate}>
                  <Ionicons name="star" color={theme.gold} size={11} />
                  <Text style={st.proRateTxt}>{p.rating?.toFixed(1)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View>
          <Text style={st.lbl}>DATE & TIME</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TouchableOpacity testID="pick-date" style={st.dateBtn} onPress={() => setShowDate(true)}>
              <Ionicons name="calendar-outline" color={theme.gold} size={18} />
              <Text style={st.dateTxt}>{dt.toLocaleDateString()}</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="pick-time" style={st.dateBtn} onPress={() => setShowTime(true)}>
              <Ionicons name="time-outline" color={theme.gold} size={18} />
              <Text style={st.dateTxt}>{dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </TouchableOpacity>
          </View>
          {showDate && (
            <DateTimePicker value={dt} mode="date" minimumDate={new Date()}
              onChange={(_, d) => { setShowDate(Platform.OS === 'ios'); if (d) { const n = new Date(dt); n.setFullYear(d.getFullYear(), d.getMonth(), d.getDate()); setDt(n); } }} />
          )}
          {showTime && (
            <DateTimePicker value={dt} mode="time"
              onChange={(_, d) => { setShowTime(Platform.OS === 'ios'); if (d) { const n = new Date(dt); n.setHours(d.getHours(), d.getMinutes()); setDt(n); } }} />
          )}
        </View>

        <View>
          <Text style={st.lbl}>PROMO CODE</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TextInput testID="promo-input" style={[st.input, { flex: 1 }]} placeholder="Enter code" placeholderTextColor={theme.textSecondary}
              value={promo} onChangeText={setPromo} autoCapitalize="characters" />
            <TouchableOpacity testID="apply-promo" style={st.applyBtn} onPress={applyPromo}>
              <Text style={st.applyTxt}>APPLY</Text>
            </TouchableOpacity>
          </View>
          {appliedPromo && <Text style={{ color: theme.success, marginTop: 6 }}>✓ {appliedPromo} applied — saving {formatINR(discount)}</Text>}
        </View>

        <TouchableOpacity testID="toggle-advance" style={st.toggleRow} onPress={() => setAdvance(!advance)}>
          <Ionicons name={advance ? 'checkbox' : 'square-outline'} color={theme.gold} size={22} />
          <View style={{ flex: 1 }}>
            <Text style={st.toggleTxt}>Pay 30% advance now</Text>
            <Text style={st.toggleSub}>Smooth checkout · Secure your slot</Text>
          </View>
        </TouchableOpacity>

        <View style={st.summary}>
          <View style={st.sumRow}><Text style={st.sumL}>Subtotal</Text><Text style={st.sumV}>{formatINR(service.price)}</Text></View>
          {discount > 0 && <View style={st.sumRow}><Text style={st.sumL}>Discount</Text><Text style={[st.sumV, { color: theme.success }]}>-{formatINR(discount)}</Text></View>}
          <View style={st.divider} />
          <View style={st.sumRow}><Text style={[st.sumL, { fontSize: 16 }]}>Total</Text><Text style={st.totalV}>{formatINR(total)}</Text></View>
          {advance && <View style={st.sumRow}><Text style={st.sumL}>Pay now (30%)</Text><Text style={[st.sumV, { color: theme.gold }]}>{formatINR(advanceAmt)}</Text></View>}
        </View>

        <TouchableOpacity testID="confirm-booking" style={st.confirm} onPress={confirm} disabled={busy}>
          <Text style={st.confirmTxt}>{busy ? 'PROCESSING...' : advance ? `PAY ${formatINR(advanceAmt)} & BOOK` : 'CONFIRM BOOKING'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  c: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: theme.borderLight },
  title: { color: theme.text, fontSize: 18, fontWeight: '500' },
  img: { width: '100%', height: 200, borderRadius: 4 },
  svcCat: { color: theme.gold, fontSize: 11, letterSpacing: 1.5 },
  svcName: { color: theme.text, fontSize: 24, fontWeight: '300', marginTop: 4 },
  svcDesc: { color: theme.textSecondary, marginTop: 6 },
  svcPrice: { color: theme.gold, fontSize: 18, fontWeight: '600', marginTop: 8 },
  lbl: { color: theme.gold, fontSize: 11, letterSpacing: 1.5, marginBottom: spacing.sm },
  proCard: { width: 120, padding: spacing.sm, backgroundColor: theme.surface, borderRadius: 4, alignItems: 'center', borderWidth: 1, borderColor: theme.borderLight },
  proSel: { borderColor: theme.gold, backgroundColor: theme.surfaceElevated },
  proImg: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: theme.gold },
  proName: { color: theme.text, fontSize: 13, fontWeight: '600', marginTop: 6 },
  proSpec: { color: theme.textSecondary, fontSize: 10, marginTop: 2, textAlign: 'center' },
  proRate: { flexDirection: 'row', gap: 3, marginTop: 4, alignItems: 'center' },
  proRateTxt: { color: theme.gold, fontSize: 11 },
  dateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.surface, padding: 14, borderRadius: 4, borderWidth: 1, borderColor: theme.border },
  dateTxt: { color: theme.text, fontSize: 14 },
  input: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, color: theme.text, padding: 14, borderRadius: 4, fontSize: 15 },
  applyBtn: { backgroundColor: theme.gold, paddingHorizontal: 20, justifyContent: 'center', borderRadius: 4 },
  applyTxt: { color: theme.textInverse, fontWeight: '700', letterSpacing: 1 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: theme.surface, padding: spacing.md, borderRadius: 4, borderWidth: 1, borderColor: theme.borderLight },
  toggleTxt: { color: theme.text, fontSize: 15 },
  toggleSub: { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
  summary: { backgroundColor: theme.surface, padding: spacing.md, borderRadius: 4, gap: 6, borderWidth: 1, borderColor: theme.gold },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sumL: { color: theme.textSecondary, fontSize: 14 },
  sumV: { color: theme.text, fontSize: 14 },
  totalV: { color: theme.gold, fontSize: 22, fontWeight: '700' },
  divider: { height: 1, backgroundColor: theme.borderLight, marginVertical: 4 },
  confirm: { backgroundColor: theme.gold, paddingVertical: 18, alignItems: 'center', borderRadius: 4, marginBottom: 40 },
  confirmTxt: { color: theme.textInverse, fontWeight: '700', letterSpacing: 2 },
});
