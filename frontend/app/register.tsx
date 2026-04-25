import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/auth';
import { theme, spacing } from '../src/theme';
import { formatErr } from '../src/api';

export default function Register() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name || !email || !password) return Alert.alert('Missing', 'Please fill name, email and password');
    setBusy(true);
    try {
      await register(name.trim(), email.trim(), password, phone);
      router.replace('/(user)/home');
    } catch (e) {
      Alert.alert('Registration failed', formatErr(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.c} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <TouchableOpacity testID="register-back" onPress={() => router.back()}>
            <Text style={s.back}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={s.form}>
          <Text style={s.title}>Create Account</Text>
          <Text style={s.sub}>Join the Colours family</Text>
          <TextInput testID="register-name-input" style={s.input} placeholder="Full Name" placeholderTextColor={theme.textSecondary} value={name} onChangeText={setName} />
          <TextInput testID="register-email-input" style={s.input} placeholder="Email" placeholderTextColor={theme.textSecondary} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextInput testID="register-phone-input" style={s.input} placeholder="Phone (optional)" placeholderTextColor={theme.textSecondary} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <TextInput testID="register-password-input" style={s.input} placeholder="Password" placeholderTextColor={theme.textSecondary} value={password} onChangeText={setPassword} secureTextEntry />
          <TouchableOpacity testID="register-submit-button" style={s.btn} onPress={submit} disabled={busy}>
            <Text style={s.btnText}>{busy ? 'Creating...' : 'CREATE ACCOUNT'}</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="register-go-login" onPress={() => router.push('/login')}>
            <Text style={s.link}>Already have an account? <Text style={{ color: theme.gold }}>Sign In</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: theme.bg },
  scroll: { flexGrow: 1, paddingTop: 60 },
  header: { paddingHorizontal: spacing.lg },
  back: { color: theme.gold, fontSize: 16 },
  form: { padding: spacing.lg, gap: spacing.md },
  title: { color: theme.text, fontSize: 32, fontWeight: '300' },
  sub: { color: theme.textSecondary, marginBottom: spacing.md },
  input: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, color: theme.text, padding: 16, borderRadius: 4, fontSize: 16 },
  btn: { backgroundColor: theme.gold, paddingVertical: 18, alignItems: 'center', marginTop: spacing.sm },
  btnText: { color: theme.textInverse, fontWeight: '700', letterSpacing: 2 },
  link: { color: theme.textSecondary, textAlign: 'center', marginTop: spacing.md },
});
