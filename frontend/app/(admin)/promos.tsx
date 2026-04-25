import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api, formatErr } from '../../src/api';
import { theme, spacing } from '../../src/theme';

export default function Promos() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({ code: '', discount_percent: '10', description: '' });

  const load = useCallback(async () => { const r = await api.get('/admin/promos'); setItems(r.data); setRefreshing(false); }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.code) return Alert.alert('Required', 'Enter promo code');
    try {
      await api.post('/promos', { code: form.code.toUpperCase(), discount_percent: parseFloat(form.discount_percent), description: form.description, active: true });
      setOpen(false); setForm({ code: '', discount_percent: '10', description: '' });
      load();
    } catch (e) { Alert.alert('Error', formatErr(e)); }
  };

  const remove = (id: string) => Alert.alert('Delete?', '', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await api.delete(`/promos/${id}`); load(); } },
  ]);

  return (
    <SafeAreaView style={st.c} edges={['top']}>
      <View style={st.header}>
        <Text style={st.title}>Promo Codes</Text>
        <TouchableOpacity testID="add-promo" style={st.addBtn} onPress={() => setOpen(true)}>
          <Ionicons name="add" color={theme.textInverse} size={20} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.gold} />}>
        {items.length === 0 ? <Text style={st.empty}>No promo codes. Add one to boost sales!</Text> : items.map(p => (
          <View key={p.id} style={st.card} testID={`promo-${p.id}`}>
            <Ionicons name="pricetag" color={theme.gold} size={28} />
            <View style={{ flex: 1 }}>
              <Text style={st.code}>{p.code}</Text>
              <Text style={st.disc}>{p.discount_percent}% off</Text>
              <Text style={st.desc}>{p.description}</Text>
            </View>
            <TouchableOpacity testID={`del-promo-${p.id}`} onPress={() => remove(p.id)}><Ionicons name="trash-outline" color={theme.error} size={20} /></TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={st.modal}>
          <ScrollView contentContainerStyle={st.sheet} keyboardShouldPersistTaps="handled">
            <Text style={st.sheetTitle}>New Promo Code</Text>
            <TextInput style={st.input} placeholder="Code (e.g., SUMMER25)" placeholderTextColor={theme.textSecondary} autoCapitalize="characters" value={form.code} onChangeText={v => setForm({ ...form, code: v })} />
            <TextInput style={st.input} placeholder="Discount %" placeholderTextColor={theme.textSecondary} value={form.discount_percent} onChangeText={v => setForm({ ...form, discount_percent: v })} keyboardType="numeric" />
            <TextInput style={st.input} placeholder="Description" placeholderTextColor={theme.textSecondary} value={form.description} onChangeText={v => setForm({ ...form, description: v })} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity style={[st.btn, st.cancel]} onPress={() => setOpen(false)}><Text style={st.cancelTxt}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity testID="create-promo" style={[st.btn, st.save]} onPress={create}><Text style={st.saveTxt}>CREATE</Text></TouchableOpacity>
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
  addBtn: { backgroundColor: theme.gold, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  empty: { color: theme.textSecondary, textAlign: 'center', marginTop: 40 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: theme.surface, padding: spacing.md, marginBottom: spacing.md, borderRadius: 4, borderWidth: 1, borderColor: theme.gold },
  code: { color: theme.text, fontSize: 18, fontWeight: '600', letterSpacing: 1 },
  disc: { color: theme.gold, fontSize: 14, marginTop: 2 },
  desc: { color: theme.textSecondary, fontSize: 11, marginTop: 2 },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.surface, padding: spacing.lg, gap: 8, paddingBottom: 40, borderTopWidth: 1, borderColor: theme.gold },
  sheetTitle: { color: theme.text, fontSize: 22, fontWeight: '300', marginBottom: spacing.sm },
  input: { backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border, color: theme.text, padding: 14, borderRadius: 4 },
  btn: { flex: 1, paddingVertical: 16, alignItems: 'center', borderRadius: 4 },
  cancel: { borderWidth: 1, borderColor: theme.border },
  cancelTxt: { color: theme.textSecondary },
  save: { backgroundColor: theme.gold },
  saveTxt: { color: theme.textInverse, fontWeight: '700', letterSpacing: 1 },
});
