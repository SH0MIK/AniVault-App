import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
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
    <View style={styles.container}>
      <Text style={styles.title}>AniVault</Text>
      <TextInput
        style={styles.input}
        placeholder={mode === 'login' ? 'Username or email' : 'Username'}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      {mode === 'register' && (
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
      )}
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={styles.button} onPress={onSubmit} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>{mode === 'login' ? 'Log in' : 'Sign up'}</Text>}
      </Pressable>
      <Pressable
        style={styles.switchModeBtn}
        onPress={() => { setError(null); setMode(mode === 'login' ? 'register' : 'login'); }}
      >
        <Text style={styles.switchModeText}>
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
        </Text>
      </Pressable>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <Pressable style={styles.oauthBtn} onPress={() => loginWithOAuth('google')}>
        <Text style={styles.oauthBtnText}>Continue with Google</Text>
      </Pressable>
      <Pressable style={styles.oauthBtn} onPress={() => loginWithOAuth('discord')}>
        <Text style={styles.oauthBtnText}>Continue with Discord</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase, justifyContent: 'center', padding: 24 },
  title: { color: colors.textPrimary, fontSize: 34, fontFamily: fonts.display, marginBottom: 32, textAlign: 'center' },
  input: {
    backgroundColor: colors.bgCard, color: colors.textPrimary, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, fontSize: 15, fontFamily: fonts.body,
  },
  button: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontFamily: fonts.bodySemibold, fontSize: 16 },
  error: { color: colors.accent, marginBottom: 8, fontSize: 13, fontFamily: fonts.body },
  switchModeBtn: { marginTop: 18, alignItems: 'center' },
  switchModeText: { color: colors.textSecondary, fontSize: 13, fontFamily: fonts.body },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 12, fontFamily: fonts.body },
  oauthBtn: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', marginBottom: 10 },
  oauthBtnText: { color: colors.textPrimary, fontFamily: fonts.bodyMedium, fontSize: 14 },
});
