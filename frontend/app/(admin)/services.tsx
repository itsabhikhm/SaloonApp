import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api, formatErr } from '../../src/api';
import { theme, spacing, formatINR } from '../../src/theme';

const CATS = ['Hair', 'Skin', 'Makeup', 'Academy'];

export default function Services() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'Hair', price: '', duration_min: '60', description: '', image_url: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800' });

  const load = useCallback(async () => { const r = await api.get('/services'); setItems(r.data); setRefreshing(false); }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.name || !form.price) return Alert.alert('Required', 'Name and price');
    try {
      await api.post('/services', { ...form, price: parseFloat(form.price), duration_min: parseInt(form.duration_min) });
      setOpen(false); setForm({ name: '', category: 'Hair', price: '', duration_min: '60', description: '', image_url: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800' });
      load();
    } catch (e) { Alert.alert('Error', formatErr(e)); }
  };

  const remove = (id: string) => Alert.alert('Delete?', '', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await api.delete(`/services/${id}`); load(); } },
  ]);

  return (
    <SafeAreaView style={st.c} edges={['top']}>
      <View style={st.header}>
        <Text style={st.title}>Services</Text>
        <TouchableOpacity testID="add-service" style={st.addBtn} onPress={() => setOpen(true)}>
          <Ionicons name="add" color={theme.textInverse} size={20} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.gold} />}>
        {items.map(s => (
          <View key={s.id} style={st.card} testID={`service-${s.id}`}>
            <Image source={{ uri: s.image_url }} style={st.img} />
            <View style={{ flex: 1 }}>
              <Text style={st.cat}>{s.category.toUpperCase()}</Text>
              <Text style={st.name}>{s.name}</Text>
              <Text style={st.meta}>{formatINR(s.price)} · {s.duration_min} min</Text>
            </View>
            <TouchableOpacity testID={`del-svc-${s.id}`} onPress={() => remove(s.id)}><Ionicons name="trash-outline" color={theme.error} size={20} /></TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={st.modal}>
          <ScrollView style={st.sheet} keyboardShouldPersistTaps="handled">
            <Text style={st.sheetTitle}>Add Service</Text>
            <TextInput style={st.input} placeholder="Service name" placeholderTextColor={theme.textSecondary} value={form.name} onChangeText={v => setForm({ ...form, name: v })} />
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginVertical: 8 }}>
              {CATS.map(c => (
                <TouchableOpacity key={c} onPress={() => setForm({ ...form, category: c })} style={[st.chip, form.category === c && st.chipActive]}>
                  <Text style={[st.chipTxt, form.category === c && { color: theme.textInverse }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={st.input} placeholder="Price (₹)" placeholderTextColor={theme.textSecondary} value={form.price} onChangeText={v => setForm({ ...form, price: v })} keyboardType="numeric" />
            <TextInput style={st.input} placeholder="Duration (min)" placeholderTextColor={theme.textSecondary} value={form.duration_min} onChangeText={v => setForm({ ...form, duration_min: v })} keyboardType="numeric" />
            <TextInput style={st.input} placeholder="Description" placeholderTextColor={theme.textSecondary} value={form.description} onChangeText={v => setForm({ ...form, description: v })} multiline />
            <TextInput style={st.input} placeholder="Image URL" placeholderTextColor={theme.textSecondary} value={form.image_url} onChangeText={v => setForm({ ...form, image_url: v })} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity style={[st.btn, st.cancel]} onPress={() => setOpen(false)}><Text style={st.cancelTxt}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity testID="create-service" style={[st.btn, st.save]} onPress={create}><Text style={st.saveTxt}>SAVE</Text></TouchableOpacity>
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
  img: { width: 60, height: 60, borderRadius: 4 },
  cat: { color: theme.gold, fontSize: 10, letterSpacing: 1 },
  name: { color: theme.text, fontSize: 15, fontWeight: '500', marginTop: 2 },
  meta: { color: theme.textSecondary, fontSize: 12, marginTop: 4 },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '85%', backgroundColor: theme.surface, padding: spacing.lg, borderTopWidth: 1, borderColor: theme.gold },
  sheetTitle: { color: theme.text, fontSize: 22, fontWeight: '300', marginBottom: spacing.md },
  input: { backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border, color: theme.text, padding: 14, borderRadius: 4, marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: theme.gold, borderRadius: 20 },
  chipActive: { backgroundColor: theme.gold },
  chipTxt: { color: theme.gold, fontSize: 12 },
  btn: { flex: 1, paddingVertical: 16, alignItems: 'center', borderRadius: 4 },
  cancel: { borderWidth: 1, borderColor: theme.border },
  cancelTxt: { color: theme.textSecondary },
  save: { backgroundColor: theme.gold },
  saveTxt: { color: theme.textInverse, fontWeight: '700', letterSpacing: 1 },
});
