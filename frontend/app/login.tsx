import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/auth';
import { theme, spacing } from '../src/theme';
import { formatErr } from '../src/api';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!identifier || !password) return Alert.alert('Missing', 'Please fill all fields');
    setBusy(true);
    try {
      const u = await login(identifier.trim(), password);
      router.replace(u.role === 'admin' ? '/(admin)/dashboard' : '/(user)/home');
    } catch (e) {
      Alert.alert('Login failed', formatErr(e));
    } finally {
      setBusy(false);
    }
  };

  const fillAdmin = () => { setIdentifier('admin@salon.com'); setPassword('admin123'); };

  return (
    <KeyboardAvoidingView style={s.c} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={['#1A1A1A', '#0A0A0A']} style={s.hero}>
          <Text style={s.brand}>COLOURS</Text>
          <Text style={s.tag}>HAIR · SKIN · MAKEUP · ACADEMY</Text>
        </LinearGradient>
        <View style={s.form}>
          <Text style={s.title}>Welcome Back</Text>
          <Text style={s.sub}>Sign in with your mobile number</Text>
          <TextInput
            testID="login-identifier-input"
            style={s.input} placeholder="Mobile number" placeholderTextColor={theme.textSecondary}
            value={identifier} onChangeText={setIdentifier} keyboardType="phone-pad" autoCapitalize="none" />
          <TextInput
            testID="login-password-input"
            style={s.input} placeholder="Password" placeholderTextColor={theme.textSecondary}
            value={password} onChangeText={setPassword} secureTextEntry />
          <TouchableOpacity testID="login-submit-button" style={s.btn} onPress={submit} disabled={busy}>
            <Text style={s.btnText}>{busy ? 'Signing in...' : 'SIGN IN'}</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="login-go-register" onPress={() => router.push('/register')}>
            <Text style={s.link}>New here? <Text style={{ color: theme.gold }}>Create Account</Text></Text>
          </TouchableOpacity>
          <TouchableOpacity testID="login-admin-fill" onPress={fillAdmin} style={s.adminHint}>
            <Ionicons name="shield-checkmark-outline" color={theme.goldMuted} size={14} />
            <Text style={s.adminHintText}>Admin demo: admin@salon.com / admin123</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: theme.bg },
  scroll: { flexGrow: 1 },
  hero: { paddingTop: 80, paddingBottom: 60, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.border },
  brand: { fontSize: 48, color: theme.gold, fontWeight: '200', letterSpacing: 8 },
  tag: { color: theme.textSecondary, marginTop: 8, letterSpacing: 3, fontSize: 11 },
  form: { padding: spacing.lg, gap: spacing.md },
  title: { color: theme.text, fontSize: 28, fontWeight: '300', marginTop: spacing.lg },
  sub: { color: theme.textSecondary, marginBottom: spacing.md },
  input: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, color: theme.text, padding: 16, borderRadius: 4, fontSize: 16 },
  btn: { backgroundColor: theme.gold, paddingVertical: 18, alignItems: 'center', marginTop: spacing.sm },
  btnText: { color: theme.textInverse, fontWeight: '700', letterSpacing: 2 },
  link: { color: theme.textSecondary, textAlign: 'center', marginTop: spacing.md },
  adminHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.md, opacity: 0.7 },
  adminHintText: { color: theme.goldMuted, fontSize: 11, letterSpacing: 0.5 },
});
