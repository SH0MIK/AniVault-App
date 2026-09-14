// The mobile watch screen intentionally uses the production AniVault watch page
// inside a WebView. This keeps the app's watch UI consistent with the website
// design instead of maintaining a second native implementation.
import React, { useMemo, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute } from '@react-navigation/native';
import { getToken } from '../api/client';
import { colors } from '../theme';

const SITE_URL = 'https://www.anivault.co';

type WatchParams = { animeId: number; episodeNum: number };

export default function WatchScreen() {
  const route = useRoute<any>();
  const { animeId, episodeNum } = route.params as WatchParams;
  const [handoffUrl, setHandoffUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // The production route uses `anime`, not `id`. This is important because
  // the production page already contains the full responsive watch UI:
  // player, episode list, episode metadata, controls and navigation.
  const redirectPath = useMemo(
    () => `/watch?anime=${encodeURIComponent(animeId)}&ep=${encodeURIComponent(episodeNum)}`,
    [animeId, episodeNum],
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const url = token
          ? `${SITE_URL}/mobile-handoff?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(redirectPath)}`
          : `${SITE_URL}${redirectPath}`;
        if (!cancelled) setHandoffUrl(url);
      } catch {
        if (!cancelled) setHandoffUrl(`${SITE_URL}${redirectPath}`);
      }
    })();
    return () => { cancelled = true; };
  }, [redirectPath]);

  if (!handoffUrl) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View pointerEvents="none" style={styles.overlay}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      )}
      <WebView
        source={{ uri: handoffUrl }}
        style={styles.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => setLoading(false)}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        originWhitelist={['http://*', 'https://*']}
        setSupportMultipleWindows={false}
        allowsFullscreenVideo
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  webview: { flex: 1, backgroundColor: colors.bgBase },
  center: { flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 1, backgroundColor: colors.bgBase },
});
