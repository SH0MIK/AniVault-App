import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, AppState, Image, Text } from 'react-native';
import { useFonts, Orbitron_600SemiBold, Orbitron_700Bold } from '@expo-google-fonts/orbitron';
import { Exo2_400Regular, Exo2_500Medium, Exo2_600SemiBold, Exo2_700Bold } from '@expo-google-fonts/exo-2';
import { AuthProvider, useAuth } from './auth/AuthContext';
import LoginScreen from './screens/LoginScreen';
import { initDb } from './db/schema';
import { fullSync } from './db/sync';
import RootNavigator from './navigation/RootNavigator';
import { colors, fonts } from './theme';

function StartupScreen() {
  return (
    <View style={styles.startup}>
      <Image source={require('../assets/icon.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.brand}>ANIVAULT</Text>
      <View style={styles.loaderRow}>
        <ActivityIndicator color={colors.accent} size="small" />
        <Text style={styles.loading}>LOADING</Text>
      </View>
    </View>
  );
}

function Root() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && user) fullSync(user.id).catch(() => {});
    });
    return () => sub.remove();
  }, [user?.id]);

  if (isLoading) return <StartupScreen />;
  return user ? <RootNavigator /> : <LoginScreen />;
}

export default function AppRoot() {
  useEffect(() => {
    try {
      initDb();
    } catch (error) {
      console.warn('AniVault database initialization failed:', error);
    }
  }, []);

  useFonts({
    Orbitron_600SemiBold, Orbitron_700Bold,
    Exo2_400Regular, Exo2_500Medium, Exo2_600SemiBold, Exo2_700Bold,
  });

  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  startup: {
    flex: 1,
    backgroundColor: colors.bgBase,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 24,
  },
  logo: { width: 82, height: 82, marginBottom: 18 },
  brand: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: 3.2,
  },
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 28,
  },
  loading: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 1.8,
  },
});
