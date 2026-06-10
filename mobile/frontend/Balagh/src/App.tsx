import React, { Component, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, View, Text } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { linking } from './navigation/linking';
import { RootNavigator } from './navigation/RootNavigator';
import OfflineBanner from './presentation/components/OfflineBanner';
import store, { StorageKeys, hydrateStorage } from './core/storage';
import { applyRTL } from './core/strings';
import { useLangStore } from './domain/stores/lang';
import type { AppLanguage } from './core/types';

// Set the public Mapbox token. Replace with your token from account.mapbox.com.
// This is the PUBLIC token (pk.*), not the secret download token.
// Keep the secret download token in ~/.gradle/gradle.properties (Android)
// and ~/.netrc (iOS) — never commit it to git.
// Token loaded from gitignored src/core/mapboxToken.ts — see mapboxToken.example.ts
import { MAPBOX_PUBLIC_TOKEN } from './core/mapboxToken';
MapboxGL.setAccessToken(MAPBOX_PUBLIC_TOKEN);

// ── Error Boundary ────────────────────────────────────────────────────────────

class AppErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    // eslint-disable-next-line no-console
    console.error('[Balagh] Uncaught render error:', error);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <View style={boundaryStyles.container}>
          <Text style={boundaryStyles.title}>بلاغ</Text>
          <Text style={boundaryStyles.body}>حدث خطأ. أعد تشغيل التطبيق.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const boundaryStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: 'bold',
  },
  body: {
    color: '#475569',
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

// ── Storage hydration gate ──────────────────────────────────────────────────
// AsyncStorage is async, so we load the cache once before rendering the tree.
// This is a single multiGet — fast. Until it resolves we show a blank splash.
// (I18nManager.forceRTL is persisted natively by Android across restarts, so
// the layout direction is already correct from the previous session.)

function useHydrated(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    hydrateStorage().finally(() => {
      try {
        const lang = store.getString(StorageKeys.LANGUAGE) as AppLanguage | undefined;
        if (lang === 'ar' || lang === 'he' || lang === 'en') {
          useLangStore.getState().setLang(lang);
          applyRTL(lang);
        }
      } catch {
        // non-fatal — proceed with defaults
      }
      setReady(true);
    });
  }, []);
  return ready;
}

// ── App ───────────────────────────────────────────────────────────────────────

const AppInner = (): React.ReactElement => (
  <NavigationContainer linking={linking}>
    <RootNavigator />
    {/* Global connectivity banner — sits above every screen (§14 Phase 6). */}
    <OfflineBanner />
  </NavigationContainer>
);

const App = (): React.ReactElement => {
  const hydrated = useHydrated();

  if (!hydrated) {
    return <View style={styles.splash} />;
  }

  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <AppInner />
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
};

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: '#F8FAFC' },
});

export default App;
