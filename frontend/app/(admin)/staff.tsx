import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api, formatErr } from '../../src/api';
import { theme, spacing, formatINR } from '../../src/theme';

export default function Staff() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({ name: '', specialty: '', bio: '', image_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600', daily_target: '5000', rating: '4.5' });

  const load = useCallback(async () => {
    const r = await api.get('/professionals');
    setItems(r.data); setRefreshing(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.name || !form.specialty) return Alert.alert('Required', 'Name and specialty');
    try {
      await api.post('/professionals', { ...form, daily_target: parseFloat(form.daily_target), rating: parseFloat(form.rating), service_ids: [] });
      setOpen(false); setForm({ name: '', specialty: '', bio: '', image_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600', daily_target: '5000', rating: '4.5' });
      load();
    } catch (e) { Alert.alert('Error', formatErr(e)); }
  };

  const remove = (id: string) => Alert.alert('Delete?', 'This cannot be undone', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await api.delete(`/professionals/${id}`); load(); } },
  ]);

  const rate = (id: string) => {
    Alert.prompt?.('Rate Professional', 'Enter rating 1-5', async (txt) => {
      const v = parseFloat(txt);
      if (v >= 1 && v <= 5) { await api.post(`/professionals/${id}/rate`, { rating: v }); load(); }
    });
  };

  return (
    <SafeAreaView style={st.c} edges={['top']}>
      <View style={st.header}>
        <Text style={st.title}>Staff</Text>
        <TouchableOpacity testID="add-staff" style={st.addBtn} onPress={() => setOpen(true)}>
          <Ionicons name="add" color={theme.textInverse} size={20} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.gold} />}>
        {items.map(p => (
          <View key={p.id} style={st.card} testID={`staff-${p.id}`}>
            <Image source={{ uri: p.image_url }} style={st.img} />
            <View style={{ flex: 1 }}>
              <Text style={st.name}>{p.name}</Text>
              <Text style={st.spec}>{p.specialty}</Text>
              <View style={st.meta}>
                <Ionicons name="star" color={theme.gold} size={12} />
                <Text style={st.rate}>{p.rating?.toFixed(1)} ({p.rating_count || 0})</Text>
                <Text style={st.target}>· Target {formatINR(p.daily_target)}</Text>
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <TouchableOpacity testID={`rate-${p.id}`} onPress={() => rate(p.id)}><Ionicons name="star-outline" color={theme.gold} size={20} /></TouchableOpacity>
              <TouchableOpacity testID={`delete-staff-${p.id}`} onPress={() => remove(p.id)}><Ionicons name="trash-outline" color={theme.error} size={20} /></TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={st.modal}>
          <ScrollView contentContainerStyle={st.sheet} keyboardShouldPersistTaps="handled">
            <Text style={st.sheetTitle}>Add Professional</Text>
            <TextInput style={st.input} placeholder="Name" placeholderTextColor={theme.textSecondary} value={form.name} onChangeText={v => setForm({ ...form, name: v })} />
            <TextInput style={st.input} placeholder="Specialty (e.g., Master Stylist)" placeholderTextColor={theme.textSecondary} value={form.specialty} onChangeText={v => setForm({ ...form, specialty: v })} />
            <TextInput style={st.input} placeholder="Bio" placeholderTextColor={theme.textSecondary} value={form.bio} onChangeText={v => setForm({ ...form, bio: v })} />
            <TextInput style={st.input} placeholder="Image URL" placeholderTextColor={theme.textSecondary} value={form.image_url} onChangeText={v => setForm({ ...form, image_url: v })} />
            <TextInput style={st.input} placeholder="Daily target (₹)" placeholderTextColor={theme.textSecondary} value={form.daily_target} onChangeText={v => setForm({ ...form, daily_target: v })} keyboardType="numeric" />
            <TextInput style={st.input} placeholder="Initial rating (1-5)" placeholderTextColor={theme.textSecondary} value={form.rating} onChangeText={v => setForm({ ...form, rating: v })} keyboardType="numeric" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={[st.btn, st.cancel]} onPress={() => setOpen(false)}><Text style={st.cancelTxt}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity testID="create-staff" style={[st.btn, st.save]} onPress={create}><Text style={st.saveTxt}>SAVE</Text></TouchableOpacity>
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
  card: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', backgroundColor: theme.surface, padding: spacing.md, marginBottom: spacing.md, borderRadius: 4, borderWidth: 1, borderColor: theme.borderLight },
  img: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: theme.gold },
  name: { color: theme.text, fontSize: 16, fontWeight: '500' },
  spec: { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  rate: { color: theme.gold, fontSize: 12 },
  target: { color: theme.textSecondary, fontSize: 11 },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.surface, padding: spacing.lg, gap: spacing.sm, borderTopWidth: 1, borderColor: theme.gold, paddingBottom: 40 },
  sheetTitle: { color: theme.text, fontSize: 22, fontWeight: '300', marginBottom: spacing.sm },
  input: { backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border, color: theme.text, padding: 14, borderRadius: 4 },
  btn: { flex: 1, paddingVertical: 16, alignItems: 'center', borderRadius: 4, marginTop: spacing.sm },
  cancel: { borderWidth: 1, borderColor: theme.border },
  cancelTxt: { color: theme.textSecondary },
  save: { backgroundColor: theme.gold },
  saveTxt: { color: theme.textInverse, fontWeight: '700', letterSpacing: 1 },
});
