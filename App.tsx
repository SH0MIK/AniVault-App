import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, AppState, Image, Text } from 'react-native';
import { useFonts, Orbitron_600SemiBold, Orbitron_700Bold } from '@expo-google-fonts/orbitron';
import { Exo2_400Regular, Exo2_500Medium, Exo2_600SemiBold, Exo2_700Bold } from '@expo-google-fonts/exo-2';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import { initDb } from './src/db/schema';
import { fullSync } from './src/db/sync';
import RootNavigator from './src/navigation/RootNavigator';
import { colors, fonts } from './src/theme';

function StartupScreen() {
  return (
    <View style={styles.startup}>
      <Image source={require('./assets/icon.png')} style={styles.logo} resizeMode="contain" />
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

export default function App() {
  // Initialize the local database after the first render instead of during
  // render. A synchronous SQLite error must never prevent React from
  // mounting and leave the Android splash screen visible indefinitely.
  useEffect(() => {
    try {
      initDb();
    } catch (error) {
      console.warn('AniVault database initialization failed:', error);
    }
  }, []);

  // Fonts are optional visual enhancements. The app must render even if a
  // bundled font cannot initialize.
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
  logo: {
    width: 82,
    height: 82,
    marginBottom: 18,
  },
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
