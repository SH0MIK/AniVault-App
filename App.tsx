import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, AppState } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Orbitron_600SemiBold, Orbitron_700Bold } from '@expo-google-fonts/orbitron';
import { Exo2_400Regular, Exo2_500Medium, Exo2_600SemiBold, Exo2_700Bold } from '@expo-google-fonts/exo-2';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import { initDb } from './src/db/schema';
import { fullSync } from './src/db/sync';
import RootNavigator from './src/navigation/RootNavigator';
import { colors } from './src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

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

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  return user ? <RootNavigator /> : <LoginScreen />;
}

export default function App() {
  const dbReady = useRef(false);
  if (!dbReady.current) {
    initDb();
    dbReady.current = true;
  }

  // Site uses Orbitron for headings and Exo 2 for body text — loaded here
  // once and referenced by family name everywhere via src/theme.ts.
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
  center: { flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center' },
});
