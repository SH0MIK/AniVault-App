import React, { useMemo, useRef, useState } from 'react';
import { NativeModules, View, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useRoute } from '@react-navigation/native';
import { getToken } from '../api/client';
import { colors } from '../theme';

const SITE_URL = 'https://www.anivault.co';
const DISCORD_APPLICATION_ID = '1505538731791093820';
const { AniVaultDiscordPresence } = NativeModules;

const PRESENCE_SCRIPT = `
(() => {
  if (window.__anivaultPresenceBridge) return;
  window.__anivaultPresenceBridge = true;

  const state = { video: null, image: '', banner: '', artLoading: false, artLoadedFor: '' };
  const send = (event) => {
    const v = state.video;
    if (!v && event !== 'pagehide') return;
    try {
      const u = new URL(location.href);
      const episode = Number(u.searchParams.get('ep')) || 0;
      if (!episode) return;
      const meta = (name) => document.querySelector('meta[property="' + name + '"], meta[name="' + name + '"]')?.getAttribute('content') || '';
      const cssUrl = (value) => { const m = String(value || '').match(/url\\((['\"]?)(.*?)\\1\\)/i); return m ? m[2] : ''; };
      const ambient = document.querySelector('.av-ambient-img');
      const poster = cssUrl(ambient?.style?.backgroundImage || '') || meta('og:image');
      const title = (meta('og:title') || document.title)
        .replace(/^Ep\\s+\\d+\\s+[—-]\\s*/i, '')
        .replace(/\\s*\\|\\s*AniVault.*$/i, '').trim() || 'Anime';
      const episodeTitle = document.querySelector('.wp-ep-title, [data-episode-title]')?.textContent?.trim() || '';
      const currentTime = v && Number.isFinite(v.currentTime) ? Math.max(0, v.currentTime) : 0;
      const duration = v && Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
      const playing = !!v && !v.paused && !v.ended && !v.seeking;
      window.ReactNativeWebView?.postMessage(JSON.stringify({
        event, title, episode, episodeTitle, url: location.href,
        image: state.image || poster, banner: state.banner,
        currentTime, duration, playing, at: Date.now()
      }));
    } catch (_) {}
  };

  const loadArt = async () => {
    try {
      const animeId = new URL(location.href).searchParams.get('anime') || '';
      if (!animeId || state.artLoading || state.artLoadedFor === animeId) return;
      state.artLoading = true;
      const encoded = encodeURIComponent(animeId);
      const res = await fetch('/anime?id=' + encoded, { credentials: 'same-origin', cache: 'force-cache' });
      if (res.ok) {
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const p = doc.querySelector('.ih-thumb img')?.getAttribute('src') || '';
        const b = cssUrl(doc.querySelector('.ih-bg')?.getAttribute('style') || '');
        if (!state.image && p) state.image = new URL(p, location.href).href;
        if (b) state.banner = new URL(b, location.href).href;
      }
      state.artLoadedFor = animeId;
    } catch (_) {} finally {
      state.artLoading = false;
    }
    send('art-ready');
  };

  const attach = () => {
    const next = document.getElementById('sp-video') || document.querySelector('video');
    if (!(next instanceof HTMLVideoElement) || next === state.video) return;
    state.video = next;
    ['play','playing','pause','waiting','stalled','seeked','loadedmetadata','durationchange','ended'].forEach((e) =>
      next.addEventListener(e, () => send(e), { passive: true })
    );
    send('ready');
    loadArt();
  };

  window.__anivaultPresenceSend = send;
  attach();
  new MutationObserver(attach).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('pagehide', () => send('pagehide'), { capture: true });
})();
true;
`;

export default function WatchScreen() {
  const route = useRoute<any>();
  const { animeId, episodeNum } = route.params as { animeId: number; episodeNum: number };
  const [handoffUrl, setHandoffUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const heartbeat = useRef<ReturnType<typeof setInterval> | null>(null);

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

  React.useEffect(() => () => {
    if (heartbeat.current) clearInterval(heartbeat.current);
    try { AniVaultDiscordPresence?.clear?.(); AniVaultDiscordPresence?.close?.(); } catch (_) {}
  }, []);

  const handlePresence = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload.event === 'pagehide' || payload.event === 'ended') {
        AniVaultDiscordPresence?.clear?.();
        return;
      }
      AniVaultDiscordPresence?.start?.(DISCORD_APPLICATION_ID);
      AniVaultDiscordPresence?.update?.(JSON.stringify(payload));

      if (!heartbeat.current) {
        heartbeat.current = setInterval(() => {
          // The WebView recalculates currentTime, duration and play state.
          // Ask it for a fresh snapshot rather than replaying stale data.
          // eslint-disable-next-line no-undef
          webViewRef.current?.injectJavaScript('window.__anivaultPresenceSend?.("heartbeat"); true;');
        }, 10000);
      }
    } catch (_) {}
  };

  const webViewRef = useRef<WebView>(null);

  if (!handoffUrl) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.overlay}><ActivityIndicator color={colors.accent} /></View>
      )}
      <WebView
        ref={webViewRef}
        source={{ uri: handoffUrl }}
        style={styles.webview}
        onLoadEnd={() => setLoading(false)}
        onMessage={handlePresence}
        injectedJavaScript={PRESENCE_SCRIPT}
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
