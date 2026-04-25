import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api, formatErr } from '../../src/api';
import { theme, spacing, formatINR } from '../../src/theme';

export default function Revenue() {
  const today = new Date().toISOString().slice(0, 10);
  const [items, setItems] = useState<any[]>([]);
  const [pros, setPros] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({ professional_id: '', date: today, amount: '', notes: '' });

  const load = useCallback(async () => {
    const [r, p] = await Promise.all([api.get('/admin/revenue'), api.get('/professionals')]);
    setItems(r.data); setPros(p.data); setRefreshing(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.professional_id || !form.amount) return Alert.alert('Required', 'Pick staff and enter amount');
    try {
      await api.post('/admin/revenue', { ...form, amount: parseFloat(form.amount) });
      setOpen(false); setForm({ professional_id: '', date: today, amount: '', notes: '' });
      load();
    } catch (e) { Alert.alert('Error', formatErr(e)); }
  };

  const remove = (id: string) => Alert.alert('Delete?', '', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await api.delete(`/admin/revenue/${id}`); load(); } },
  ]);

  const total = items.reduce((s, r) => s + r.amount, 0);

  return (
    <SafeAreaView style={st.c} edges={['top']}>
      <View style={st.header}>
        <View>
          <Text style={st.title}>Revenue</Text>
          <Text style={st.sub}>Total logged: <Text style={{ color: theme.gold }}>{formatINR(total)}</Text></Text>
        </View>
        <TouchableOpacity testID="add-revenue" style={st.addBtn} onPress={() => setOpen(true)}>
          <Ionicons name="add" color={theme.textInverse} size={20} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.gold} />}>
        {items.length === 0 ? <Text style={st.empty}>No entries yet. Tap + to log daily revenue.</Text> : items.map(r => {
          const pct = r.target ? Math.round((r.amount / r.target) * 100) : 0;
          return (
            <View key={r.id} style={st.card} testID={`rev-${r.id}`}>
              <View style={st.row}>
                <Text style={st.proName}>{r.professional_name}</Text>
                <Text style={st.amt}>{formatINR(r.amount)}</Text>
              </View>
              <Text style={st.date}>{r.date}</Text>
              <View style={st.bar}><View style={[st.barFill, { width: `${Math.min(100, pct)}%`, backgroundColor: pct >= 100 ? theme.success : theme.gold }]} /></View>
              <View style={st.row}>
                <Text style={st.metaTxt}>Target {formatINR(r.target)} · {pct}%</Text>
                <TouchableOpacity testID={`del-rev-${r.id}`} onPress={() => remove(r.id)}><Ionicons name="trash-outline" color={theme.error} size={16} /></TouchableOpacity>
              </View>
              {r.notes ? <Text style={st.notes}>“{r.notes}”</Text> : null}
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={st.modal}>
          <ScrollView style={st.sheet}>
            <Text style={st.sheetTitle}>Log Daily Revenue</Text>
            <Text style={st.lbl}>Professional</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {pros.map(p => (
                <TouchableOpacity key={p.id} onPress={() => setForm({ ...form, professional_id: p.id })} style={[st.chip, form.professional_id === p.id && st.chipActive]}>
                  <Text style={[st.chipTxt, form.professional_id === p.id && { color: theme.textInverse }]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={st.input} placeholder="Date (YYYY-MM-DD)" placeholderTextColor={theme.textSecondary} value={form.date} onChangeText={v => setForm({ ...form, date: v })} />
            <TextInput style={st.input} placeholder="Amount (₹)" placeholderTextColor={theme.textSecondary} value={form.amount} onChangeText={v => setForm({ ...form, amount: v })} keyboardType="numeric" />
            <TextInput style={st.input} placeholder="Notes (optional)" placeholderTextColor={theme.textSecondary} value={form.notes} onChangeText={v => setForm({ ...form, notes: v })} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity style={[st.btn, st.cancel]} onPress={() => setOpen(false)}><Text style={st.cancelTxt}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity testID="create-revenue" style={[st.btn, st.save]} onPress={submit}><Text style={st.saveTxt}>LOG</Text></TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  c: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  title: { color: theme.text, fontSize: 28, fontWeight: '300' },
  sub: { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
  addBtn: { backgroundColor: theme.gold, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  empty: { color: theme.textSecondary, textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: theme.surface, padding: spacing.md, marginBottom: spacing.md, borderRadius: 4, borderWidth: 1, borderColor: theme.borderLight },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  proName: { color: theme.text, fontSize: 15, fontWeight: '500' },
  amt: { color: theme.gold, fontSize: 18, fontWeight: '700' },
  date: { color: theme.textSecondary, fontSize: 11, marginTop: 4 },
  bar: { height: 4, backgroundColor: theme.surfaceElevated, borderRadius: 2, marginVertical: 8, overflow: 'hidden' },
  barFill: { height: '100%' },
  metaTxt: { color: theme.textSecondary, fontSize: 11 },
  notes: { color: theme.textSecondary, fontSize: 12, fontStyle: 'italic', marginTop: 6 },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '85%', backgroundColor: theme.surface, padding: spacing.lg, borderTopWidth: 1, borderColor: theme.gold },
  sheetTitle: { color: theme.text, fontSize: 22, fontWeight: '300', marginBottom: spacing.md },
  lbl: { color: theme.gold, fontSize: 11, letterSpacing: 1.5, marginBottom: 6 },
  input: { backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border, color: theme.text, padding: 14, borderRadius: 4, marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: theme.gold, borderRadius: 16 },
  chipActive: { backgroundColor: theme.gold },
  chipTxt: { color: theme.gold, fontSize: 12 },
  btn: { flex: 1, paddingVertical: 16, alignItems: 'center', borderRadius: 4 },
  cancel: { borderWidth: 1, borderColor: theme.border },
  cancelTxt: { color: theme.textSecondary },
  save: { backgroundColor: theme.gold },
  saveTxt: { color: theme.textInverse, fontWeight: '700', letterSpacing: 1 },
});
