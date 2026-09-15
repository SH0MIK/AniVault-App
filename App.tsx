import React, { Suspense } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

// Keep the entry module deliberately tiny. Heavy/native modules are loaded
// only after React has mounted a real view, so a native-module startup error
// can never leave Android permanently displaying the native splash image.
const AppRoot = React.lazy(() => import('./src/AppRoot'));

class BootstrapErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.errorScreen}>
          <Text style={styles.title}>AniVault couldn't start</Text>
          <Text style={styles.message}>{this.state.error.message || 'Unknown startup error'}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function BootstrapFallback() {
  return (
    <View style={styles.fallback}>
      <ActivityIndicator size="small" color="#fff" />
      <Text style={styles.loading}>STARTING ANIVAULT…</Text>
    </View>
  );
}

export default function App() {
  return (
    <BootstrapErrorBoundary>
      <Suspense fallback={<BootstrapFallback />}>
        <AppRoot />
      </Suspense>
    </BootstrapErrorBoundary>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  loading: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    letterSpacing: 1.8,
  },
  errorScreen: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
