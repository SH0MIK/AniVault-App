// Playback itself stays a WebView pointed at the real, already-working watch
// page — porting the full provider-probing/HLS-switching engine to native
// RN is its own separate project. The "offline" story for THIS screen is
// necessarily online-only (you're streaming a remote video either way);
// the offline SQLite layer covers browsing your list and status changes
// made natively, not playback through this embedded page.
import React, { useMemo, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute } from '@react-navigation/native';
import { getToken } from '../api/client';
import { colors } from '../theme';

const SITE_URL = 'https://www.anivault.co';

export default function WatchScreen() {
  const route = useRoute<any>();
  const { animeId, episodeNum } = route.params as { animeId: number; episodeNum: number };
  const [handoffUrl, setHandoffUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const redirectPath = useMemo(() => `/watch?id=${animeId}&ep=${episodeNum}`, [animeId, episodeNum]);

  React.useEffect(() => {
    (async () => {
      const token = await getToken();
      const url = token
        ? `${SITE_URL}/mobile-handoff?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(redirectPath)}`
        : `${SITE_URL}${redirectPath}`;
      setHandoffUrl(url);
    })();
  }, [redirectPath]);

  if (!handoffUrl) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}
      <WebView
        source={{ uri: handoffUrl }}
        style={styles.webview}
        onLoadEnd={() => setLoading(false)}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
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
