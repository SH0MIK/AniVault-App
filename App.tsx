import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, AppState, Image, Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Orbitron_600SemiBold, Orbitron_700Bold } from '@expo-google-fonts/orbitron';
import { Exo2_400Regular, Exo2_500Medium, Exo2_600SemiBold, Exo2_700Bold } from '@expo-google-fonts/exo-2';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import { initDb } from './src/db/schema';
import { fullSync } from './src/db/sync';
import RootNavigator from './src/navigation/RootNavigator';
import { colors, fonts } from './src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

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

  // Re-sync whenever the app comes back to the foreground — catches the
  // "closed the app on the subway with no signal, opened it back up with
  // wifi" case without the person having to do anything.
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
  const dbReady = useRef(false);
  if (!dbReady.current) {
    initDb();
    dbReady.current = true;
  }

  // Keep the existing bundled fonts for compatibility, while the UI theme
  // controls their use consistently across the redesigned screens.
  const [fontsLoaded] = useFonts({
    Orbitron_600SemiBold, Orbitron_700Bold,
    Exo2_400Regular, Exo2_500Medium, Exo2_600SemiBold, Exo2_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

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
