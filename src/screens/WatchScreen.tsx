// Playback uses AniVault's real watch page inside a WebView. The important
// detail is that the website route is /watch?anime=...&ep=..., not /watch?id=...
// (the latter falls back to the normal site page). Mobile auth is handed off
// first when a session token exists, preserving the site's provider/HLS logic.
import React, { useMemo, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Pressable } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getToken } from '../api/client';
import { colors } from '../theme';

const SITE_URL = 'https://www.anivault.co';

export default function WatchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { animeId, episodeNum } = route.params as { animeId: number; episodeNum: number };
  const [handoffUrl, setHandoffUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const redirectPath = useMemo(
    () => `/watch?anime=${encodeURIComponent(String(animeId))}&ep=${encodeURIComponent(String(episodeNum))}`,
    [animeId, episodeNum],
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getToken();
      const url = token
        ? `${SITE_URL}/mobile-handoff?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(redirectPath)}`
        : `${SITE_URL}${redirectPath}`;
      if (!cancelled) setHandoffUrl(url);
    })();
    return () => { cancelled = true; };
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
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.brand}>ANIVAULT</Text>
          <Text style={styles.episode}>Episode {episodeNum}</Text>
        </View>
        <View style={styles.badge}><Text style={styles.badgeText}>WATCH</Text></View>
      </View>

      <View style={styles.playerFrame}>
        {loading && (
          <View style={styles.overlay} pointerEvents="none">
            <View style={styles.loaderCard}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.loadingText}>Loading player…</Text>
            </View>
          </View>
        )}
        <WebView
          source={{ uri: handoffUrl }}
          style={styles.webview}
          onLoadEnd={() => setLoading(false)}
          onError={() => setLoading(false)}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          setSupportMultipleWindows={false}
          originWhitelist={['http://*', 'https://*']}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  header: { height: 58, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSurface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  backButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCard, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  backIcon: { color: colors.textPrimary, fontSize: 30, lineHeight: 31, marginTop: -3 },
  headerCopy: { flex: 1, marginLeft: 12 }, brand: { color: colors.textPrimary, fontSize: 11, fontWeight: '800', letterSpacing: 1.7 }, episode: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7, backgroundColor: colors.bgCard, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, badgeText: { color: colors.textSecondary, fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  playerFrame: { flex: 1, backgroundColor: '#000' }, webview: { flex: 1, backgroundColor: '#000' }, center: { flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 1, backgroundColor: '#000' },
  loaderCard: { minWidth: 132, paddingHorizontal: 18, paddingVertical: 16, alignItems: 'center', borderRadius: 14, backgroundColor: colors.bgCard, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  loadingText: { color: colors.textSecondary, fontSize: 11, marginTop: 9 },
});
