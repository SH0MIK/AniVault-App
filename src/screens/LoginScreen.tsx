import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { colors, radius, fonts } from '../theme';

export default function LoginScreen() {
  const { login, register, loginWithOAuth } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    const result = mode === 'login'
      ? await login(username.trim(), password)
      : await register(username.trim(), email.trim(), password);
    setLoading(false);
    if (!result.success) setError(result.message ?? `${mode === 'login' ? 'Login' : 'Registration'} failed.`);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={styles.logo}><Ionicons name="play" size={22} color={colors.bgBase} /></View>
          <Text style={styles.kicker}>ANIME STREAMING</Text>
          <Text style={styles.title}>AniVault</Text>
          <Text style={styles.subtitle}>{mode === 'login' ? 'Welcome back to your vault.' : 'Create your personal anime vault.'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{mode === 'login' ? 'Sign in' : 'Create account'}</Text>
          <Text style={styles.cardSubtitle}>{mode === 'login' ? 'Continue where you left off.' : 'Track, save, and watch your anime.'}</Text>

          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={17} color={colors.textMuted} />
            <TextInput style={styles.input} placeholder={mode === 'login' ? 'Username or email' : 'Username'} placeholderTextColor={colors.textMuted} autoCapitalize="none" value={username} onChangeText={setUsername} />
          </View>
          {mode === 'register' && (
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={17} color={colors.textMuted} />
              <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.textMuted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
            </View>
          )}
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={17} color={colors.textMuted} />
            <TextInput style={styles.input} placeholder="Password" placeholderTextColor={colors.textMuted} secureTextEntry value={password} onChangeText={setPassword} />
          </View>

          {error && <View style={styles.errorBox}><Ionicons name="alert-circle-outline" size={16} color={colors.accent} /><Text style={styles.error}>{error}</Text></View>}

          <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={onSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.bgBase} /> : <><Text style={styles.buttonText}>{mode === 'login' ? 'Log in' : 'Sign up'}</Text><Ionicons name="arrow-forward" size={17} color={colors.bgBase} /></>}
          </Pressable>

          <Pressable style={styles.switchModeBtn} onPress={() => { setError(null); setMode(mode === 'login' ? 'register' : 'login'); }}>
            <Text style={styles.switchModeText}>{mode === 'login' ? "Don't have an account? " : 'Already have an account? '}<Text style={styles.switchModeStrong}>{mode === 'login' ? 'Sign up' : 'Log in'}</Text></Text>
          </Pressable>

          <View style={styles.dividerRow}><View style={styles.dividerLine} /><Text style={styles.dividerText}>OR CONTINUE WITH</Text><View style={styles.dividerLine} /></View>
          <View style={styles.oauthRow}>
            <Pressable style={styles.oauthBtn} onPress={() => loginWithOAuth('google')}><Ionicons name="logo-google" size={18} color={colors.textPrimary} /><Text style={styles.oauthBtnText}>Google</Text></Pressable>
            <Pressable style={styles.oauthBtn} onPress={() => loginWithOAuth('discord')}><Ionicons name="logo-discord" size={18} color={colors.textPrimary} /><Text style={styles.oauthBtnText}>Discord</Text></Pressable>
          </View>
        </View>
        <Text style={styles.footer}>YOUR ANIME. YOUR VAULT.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  content: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  brand: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  kicker: { color: colors.textMuted, fontSize: 9, letterSpacing: 2.2, fontFamily: fonts.bodySemibold, marginBottom: 4 },
  title: { color: colors.textPrimary, fontSize: 31, fontFamily: fonts.display, letterSpacing: 0.5 },
  subtitle: { color: colors.textMuted, fontSize: 12, fontFamily: fonts.body, marginTop: 5 },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 18 },
  cardTitle: { color: colors.textPrimary, fontSize: 21, fontFamily: fonts.bodySemibold },
  cardSubtitle: { color: colors.textMuted, fontSize: 12, fontFamily: fonts.body, marginTop: 4, marginBottom: 17 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, marginBottom: 10 },
  input: { flex: 1, color: colors.textPrimary, paddingHorizontal: 9, paddingVertical: 12, fontSize: 14, fontFamily: fonts.body },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: colors.accent, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.sm, padding: 9, marginBottom: 10 },
  error: { flex: 1, color: colors.accent, fontSize: 12, fontFamily: fonts.body },
  button: { minHeight: 48, backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 3 },
  pressed: { opacity: 0.78 },
  buttonText: { color: colors.bgBase, fontFamily: fonts.bodySemibold, fontSize: 15 },
  switchModeBtn: { alignItems: 'center', paddingVertical: 15 },
  switchModeText: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.body },
  switchModeStrong: { color: colors.textPrimary, fontFamily: fonts.bodySemibold },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 8, letterSpacing: 1, fontFamily: fonts.bodyMedium },
  oauthRow: { flexDirection: 'row', gap: 9 },
  oauthBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgSurface, borderRadius: radius.md, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  oauthBtnText: { color: colors.textPrimary, fontFamily: fonts.bodyMedium, fontSize: 12 },
  footer: { color: colors.textMuted, textAlign: 'center', fontSize: 8, letterSpacing: 2, fontFamily: fonts.bodyMedium, marginTop: 20 },
});
