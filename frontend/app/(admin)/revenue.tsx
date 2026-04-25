import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, RefreshControl, Platform, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, formatErr } from '../../src/api';
import { theme, spacing, formatINR } from '../../src/theme';

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Revenue() {
  const today = new Date().toISOString().slice(0, 10);
  const nowHHMM = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const [items, setItems] = useState<any[]>([]);
  const [pros, setPros] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const monthStart = today.slice(0, 8) + '01';
  const [filter, setFilter] = useState({ from: monthStart, to: today });
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [form, setForm] = useState({ professional_id: '', date: today, time: nowHHMM(), amount: '', notes: '' });

  const load = useCallback(async () => {
    const [r, p] = await Promise.all([api.get('/admin/revenue'), api.get('/professionals')]);
    setItems(r.data); setPros(p.data); setRefreshing(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (busy) return;
    if (!form.professional_id || !form.amount) return Alert.alert('Required', 'Pick staff and enter amount');
    setBusy(true);
    Keyboard.dismiss();
    try {
      await api.post('/admin/revenue', { ...form, amount: parseFloat(form.amount) });
      setOpen(false);
      setForm({ professional_id: '', date: today, time: nowHHMM(), amount: '', notes: '' });
      load();
    } catch (e) { Alert.alert('Error', formatErr(e)); }
    finally { setBusy(false); }
  };

  const remove = (id: string) => Alert.alert('Delete?', '', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await api.delete(`/admin/revenue/${id}`); load(); } },
  ]);

  const total = items.reduce((s, r) => s + r.amount, 0);

  const buildHtml = () => {
    const rows = items.map(r => {
      const pct = r.target ? Math.round((r.amount / r.target) * 100) : 0;
      return `<tr><td>${r.date}</td><td>${r.time || '-'}</td><td>${r.professional_name}</td><td style="text-align:right">₹${Math.round(r.amount).toLocaleString('en-IN')}</td><td style="text-align:right">₹${Math.round(r.target).toLocaleString('en-IN')}</td><td style="text-align:right">${pct}%</td><td>${(r.notes || '').replace(/</g, '&lt;')}</td></tr>`;
    }).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><title>Colours Revenue</title>
      <style>
        body{font-family:Helvetica,Arial,sans-serif;color:#222;padding:24px}
        h1{color:#8C7326;margin:0 0 4px;font-weight:300;letter-spacing:2px}
        .sub{color:#666;font-size:12px;margin-bottom:18px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th{background:#0A0A0A;color:#D4AF37;padding:10px;text-align:left;letter-spacing:1px;font-size:11px}
        td{padding:10px;border-bottom:1px solid #eee}
        tr:nth-child(even) td{background:#fafafa}
        .total{font-weight:700;color:#8C7326;font-size:16px;margin-top:18px;text-align:right}
      </style></head><body>
      <h1>COLOURS — Revenue Report</h1>
      <div class="sub">Generated ${new Date().toLocaleString()}</div>
      <table><thead><tr><th>Date</th><th>Time</th><th>Professional</th><th>Amount</th><th>Target</th><th>%</th><th>Notes</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="7" style="text-align:center;color:#888;padding:24px">No entries</td></tr>'}</tbody></table>
      <div class="total">Total: ₹${Math.round(total).toLocaleString('en-IN')}</div>
      </body></html>`;
  };

  const exportShare = async (kind: 'csv' | 'pdf') => {
    if (exporting) return;
    setExporting(true);
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Share unavailable', 'Sharing is not supported on this device.');
        return;
      }
      let fileUri: string;
      let mime: string;
      if (kind === 'csv') {
        const token = await AsyncStorage.getItem('token');
        const res = await fetch(`${BASE}/api/admin/revenue/export.csv`, { headers: { Authorization: `Bearer ${token}` } });
        const csv = await res.text();
        fileUri = FileSystem.cacheDirectory + 'colours-revenue.csv';
        await FileSystem.writeAsStringAsync(fileUri, csv);
        mime = 'text/csv';
      } else {
        const { uri } = await Print.printToFileAsync({ html: buildHtml() });
        fileUri = uri;
        mime = 'application/pdf';
      }
      await Sharing.shareAsync(fileUri, { mimeType: mime, dialogTitle: 'Share revenue report', UTI: kind === 'pdf' ? 'com.adobe.pdf' : 'public.comma-separated-values-text' });
    } catch (e: any) {
      Alert.alert('Export failed', e?.message || 'Could not export');
    } finally { setExporting(false); }
  };

  const askExport = () => setExportOpen(true);

  return (
    <SafeAreaView style={st.c} edges={['top']}>
      <View style={st.header}>
        <View>
          <Text style={st.title}>Revenue</Text>
          <Text style={st.sub}>Total logged: <Text style={{ color: theme.gold }}>{formatINR(total)}</Text></Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity testID="export-revenue" style={st.iconBtn} onPress={askExport} disabled={exporting}>
            <Ionicons name="share-outline" color={theme.gold} size={20} />
          </TouchableOpacity>
          <TouchableOpacity testID="add-revenue" style={st.addBtn} onPress={() => setOpen(true)}>
            <Ionicons name="add" color={theme.textInverse} size={20} />
          </TouchableOpacity>
        </View>
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
              <Text style={st.date}>{r.date}{r.time ? ` · ${r.time}` : ''}</Text>
              <View style={st.bar}><View style={[st.barFill, { width: `${Math.min(100, pct)}%`, backgroundColor: pct >= 100 ? theme.success : theme.gold }]} /></View>
              <View style={st.row}>
                <Text style={st.metaTxt}>Target {formatINR(r.target)} · {pct}%</Text>
                <TouchableOpacity testID={`del-rev-${r.id}`} onPress={() => remove(r.id)}><Ionicons name="trash-outline" color={theme.error} size={16} /></TouchableOpacity>
              </View>
              {r.notes ? <Text style={st.notes}>"{r.notes}"</Text> : null}
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={exportOpen} transparent animationType="slide" onRequestClose={() => setExportOpen(false)}>
        <View style={st.modal}>
          <View style={st.sheet}>
            <Text style={st.sheetTitle}>Export Revenue</Text>
            <Text style={st.lbl}>QUICK RANGE</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              <TouchableOpacity testID="preset-today" style={st.chip} onPress={() => setRangePreset('today')}><Text style={st.chipTxt}>Today</Text></TouchableOpacity>
              <TouchableOpacity testID="preset-week" style={st.chip} onPress={() => setRangePreset('week')}><Text style={st.chipTxt}>Last 7d</Text></TouchableOpacity>
              <TouchableOpacity testID="preset-month" style={st.chip} onPress={() => setRangePreset('month')}><Text style={st.chipTxt}>This month</Text></TouchableOpacity>
              <TouchableOpacity testID="preset-all" style={st.chip} onPress={() => setRangePreset('all')}><Text style={st.chipTxt}>All time</Text></TouchableOpacity>
            </View>
            <Text style={st.lbl}>CUSTOM RANGE</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput style={[st.input, { flex: 1 }]} placeholder="From YYYY-MM-DD" placeholderTextColor={theme.textSecondary} value={filter.from} onChangeText={v => setFilter({ ...filter, from: v })} />
              <TextInput style={[st.input, { flex: 1 }]} placeholder="To YYYY-MM-DD" placeholderTextColor={theme.textSecondary} value={filter.to} onChangeText={v => setFilter({ ...filter, to: v })} />
            </View>
            <Text style={st.lbl}>FORMAT</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <TouchableOpacity testID="export-csv" style={[st.btn, st.save, { flex: 1 }, exporting && { opacity: 0.6 }]} onPress={() => exportShare('csv')} disabled={exporting}>
                <Text style={st.saveTxt}>EXCEL (CSV)</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="export-pdf" style={[st.btn, { flex: 1, backgroundColor: theme.surfaceElevated, borderWidth: 1, borderColor: theme.gold }, exporting && { opacity: 0.6 }]} onPress={() => exportShare('pdf')} disabled={exporting}>
                <Text style={[st.saveTxt, { color: theme.gold }]}>PDF</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: 11, textAlign: 'center', marginTop: 4 }}>
              {Platform.OS === 'web' ? 'Downloads on web · Share via Mail/WhatsApp on mobile' : 'Share sheet opens with Mail, WhatsApp, Drive & more'}
            </Text>
            <TouchableOpacity style={[st.btn, st.cancel, { marginTop: 8 }]} onPress={() => setExportOpen(false)} disabled={exporting}>
              <Text style={st.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={st.modal}>
          <ScrollView style={st.sheet} keyboardShouldPersistTaps="handled">
            <Text style={st.sheetTitle}>Log Daily Revenue</Text>
            <Text style={st.lbl}>Professional</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {pros.map(p => (
                <TouchableOpacity key={p.id} onPress={() => setForm({ ...form, professional_id: p.id })} style={[st.chip, form.professional_id === p.id && st.chipActive]}>
                  <Text style={[st.chipTxt, form.professional_id === p.id && { color: theme.textInverse }]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput style={[st.input, { flex: 2 }]} placeholder="Date (YYYY-MM-DD)" placeholderTextColor={theme.textSecondary} value={form.date} onChangeText={v => setForm({ ...form, date: v })} />
              <TextInput style={[st.input, { flex: 1 }]} placeholder="HH:MM" placeholderTextColor={theme.textSecondary} value={form.time} onChangeText={v => setForm({ ...form, time: v })} />
            </View>
            <TextInput style={st.input} placeholder="Amount (₹)" placeholderTextColor={theme.textSecondary} value={form.amount} onChangeText={v => setForm({ ...form, amount: v })} keyboardType="numeric" />
            <TextInput style={st.input} placeholder="Notes (optional)" placeholderTextColor={theme.textSecondary} value={form.notes} onChangeText={v => setForm({ ...form, notes: v })} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity style={[st.btn, st.cancel]} onPress={() => setOpen(false)} disabled={busy}><Text style={st.cancelTxt}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity testID="create-revenue" style={[st.btn, st.save, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}><Text style={st.saveTxt}>{busy ? 'SAVING...' : 'LOG'}</Text></TouchableOpacity>
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
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.gold },
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
