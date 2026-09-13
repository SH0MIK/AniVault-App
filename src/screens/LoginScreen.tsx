import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { colors, radius, fonts } from '../theme';

const LOGO = 'https://www.anivault.co/assets/img/site-img/logo.png';

export default function LoginScreen() {
  const { login, register, loginWithOAuth } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const switchMode = () => {
    setError(null);
    setMode(mode === 'login' ? 'register' : 'login');
  };

  const onSubmit = async () => {
    const user = username.trim();
    const mail = email.trim();
    if (!user || !password || (mode === 'register' && !mail)) {
      setError(mode === 'register' ? 'Please fill in all fields.' : 'Please enter your username and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = mode === 'login'
        ? await login(user, password)
        : await register(user, mail, password);
      if (!result.success) setError(result.message ?? `${mode === 'login' ? 'Login' : 'Registration'} failed.`);
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.topGlow} />
        <View style={styles.brandBlock}>
          <Image source={{ uri: LOGO }} style={styles.logo} contentFit="contain" />
          <View style={styles.brandRule} />
          <Text style={styles.kicker}>{mode === 'login' ? 'WELCOME BACK' : 'JOIN THE VAULT'}</Text>
          <Text style={styles.heading}>{mode === 'login' ? 'Sign in to AniVault' : 'Create your account'}</Text>
          <Text style={styles.subtitle}>
            {mode === 'login'
              ? 'Continue your anime journey and keep your vault in sync.'
              : 'Build your personal anime vault and keep track of everything you watch.'}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardAccent} />
          <Text style={styles.formTitle}>{mode === 'login' ? 'LOGIN' : 'SIGN UP'}</Text>
          <Text style={styles.formHint}>{mode === 'login' ? 'Enter your AniVault credentials.' : 'It only takes a moment to get started.'}</Text>

          <Text style={styles.label}>{mode === 'login' ? 'USERNAME OR EMAIL' : 'USERNAME'}</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder={mode === 'login' ? 'Username or email' : 'Choose a username'}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType={mode === 'login' ? 'username' : 'username'}
              value={username}
              onChangeText={setUsername}
              returnKeyType={mode === 'register' ? 'next' : 'next'}
            />
          </View>

          {mode === 'register' && <>
            <Text style={styles.label}>EMAIL</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                value={email}
                onChangeText={setEmail}
                returnKeyType="next"
              />
            </View>
          </>}

          <Text style={styles.label}>PASSWORD</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Your password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={onSubmit}
              returnKeyType="go"
            />
            <Pressable onPress={() => setShowPassword(v => !v)} hitSlop={8} style={styles.eye}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.textMuted} />
            </Pressable>
          </View>

          {error && <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={17} color="#ff6b81" />
            <Text style={styles.error}>{error}</Text>
          </View>}

          <Pressable onPress={onSubmit} disabled={loading} style={({ pressed }) => [styles.primary, pressed && styles.pressed, loading && styles.disabled]}>
            {loading ? <ActivityIndicator color="#fff" /> : <>
              <Text style={styles.primaryText}>{mode === 'login' ? 'LOG IN' : 'CREATE ACCOUNT'}</Text>
              <Ionicons name="arrow-forward" size={17} color="#fff" />
            </>}
          </Pressable>

          <Pressable onPress={switchMode} style={styles.switch}>
            <Text style={styles.switchMuted}>{mode === 'login' ? "Don't have an account? " : 'Already have an account? '}</Text>
            <Text style={styles.switchAccent}>{mode === 'login' ? 'Sign up' : 'Log in'}</Text>
          </Pressable>

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>OR CONTINUE WITH</Text>
            <View style={styles.orLine} />
          </View>

          <View style={styles.socialRow}>
            <Pressable onPress={() => loginWithOAuth('google')} style={({ pressed }) => [styles.social, pressed && styles.pressed]}>
              <Text style={styles.googleG}>G</Text>
              <Text style={styles.socialText}>Google</Text>
            </Pressable>
            <Pressable onPress={() => loginWithOAuth('discord')} style={({ pressed }) => [styles.social, pressed && styles.pressed]}>
              <Ionicons name="logo-discord" size={18} color={colors.textPrimary} />
              <Text style={styles.socialText}>Discord</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.bottomNote}>
          <Ionicons name="shield-checkmark-outline" size={15} color={colors.textMuted} />
          <Text style={styles.bottomText}>Your account is securely connected to AniVault.</Text>
        </View>
        <Text style={styles.copyright}>© 2026 AniVault.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase },
  content: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 38, paddingBottom: 28, alignItems: 'center' },
  topGlow: { position: 'absolute', top: -100, width: 280, height: 260, borderRadius: 140, backgroundColor: 'rgba(124,58,237,0.10)' },
  brandBlock: { width: '100%', maxWidth: 460, alignItems: 'center', marginBottom: 22 },
  logo: { width: 154, height: 43 },
  brandRule: { width: 44, height: 2, backgroundColor: colors.accent, marginTop: 15, marginBottom: 13, borderRadius: 2 },
  kicker: { color: colors.accent, fontFamily: fonts.displayMedium, fontSize: 9, letterSpacing: 2, marginBottom: 7 },
  heading: { color: colors.textPrimary, fontFamily: fonts.display, fontSize: 22, textAlign: 'center' },
  subtitle: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 19, textAlign: 'center', marginTop: 8, maxWidth: 340 },
  card: { width: '100%', maxWidth: 460, backgroundColor: colors.bgSurface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 18, overflow: 'hidden' },
  cardAccent: { position: 'absolute', left: 0, right: 0, top: 0, height: 2, backgroundColor: colors.accent },
  formTitle: { color: colors.textPrimary, fontFamily: fonts.displayMedium, fontSize: 13, letterSpacing: 1.6 },
  formHint: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 11, marginTop: 4, marginBottom: 20 },
  label: { color: colors.textSecondary, fontFamily: fonts.displayMedium, fontSize: 8.5, letterSpacing: 1.25, marginBottom: 7, marginTop: 3 },
  inputWrap: { minHeight: 48, backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, marginBottom: 15 },
  input: { flex: 1, color: colors.textPrimary, fontFamily: fonts.body, fontSize: 14, paddingHorizontal: 10, paddingVertical: 11 },
  eye: { width: 28, height: 34, alignItems: 'center', justifyContent: 'center' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,107,129,0.08)', borderWidth: 1, borderColor: 'rgba(255,107,129,0.18)', borderRadius: 8, paddingHorizontal: 11, paddingVertical: 9, marginBottom: 13 },
  error: { flex: 1, color: '#ff8a9b', fontFamily: fonts.body, fontSize: 11.5, lineHeight: 16 },
  primary: { height: 48, backgroundColor: colors.accent, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 2 },
  primaryText: { color: '#fff', fontFamily: fonts.displayMedium, fontSize: 11, letterSpacing: 1 },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.55 },
  switch: { flexDirection: 'row', justifyContent: 'center', marginTop: 17 },
  switchMuted: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 11.5 },
  switchAccent: { color: colors.accent, fontFamily: fonts.bodySemibold, fontSize: 11.5 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 19 },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { color: colors.textMuted, fontFamily: fonts.displayMedium, fontSize: 7.5, letterSpacing: 1 },
  socialRow: { flexDirection: 'row', gap: 10 },
  social: { flex: 1, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  socialText: { color: colors.textPrimary, fontFamily: fonts.bodyMedium, fontSize: 12 },
  googleG: { color: colors.textPrimary, fontFamily: fonts.bodyBold, fontSize: 16 },
  bottomNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 22 },
  bottomText: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 9.5 },
  copyright: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 9, marginTop: 13 },
});
