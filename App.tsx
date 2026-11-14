import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, NativeModules, StatusBar, StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

const SITE_URL = 'https://www.anivault.co';
const DISCORD_APPLICATION_ID = '1505538731791093820';
const { AniVaultDiscordPresence } = NativeModules;

const PRESENCE_SCRIPT = `
(() => {
  if (window.__anivaultPresenceBridge) return;
  window.__anivaultPresenceBridge = true;
  const state = { video: null, image: '', banner: '', artLoading: false, artLoadedFor: '', active: false, lastUrl: '' };
  const isWatchPage = () => location.pathname.replace(/\\/$/, '') === '/watch';
  const post = (payload) => { try { window.ReactNativeWebView?.postMessage(JSON.stringify(payload)); } catch (_) {} };
  const clear = () => { if (!state.active) return; state.active = false; post({ event: 'clear' }); };

  const send = (event) => {
    if (!isWatchPage()) { clear(); return; }
    const video = state.video;
    if (!video && event !== 'pagehide') return;
    state.active = true;
    state.lastUrl = location.href;
    try {
      const url = new URL(location.href);
      const episode = Number(url.searchParams.get('ep')) || 0;
      if (!episode) { clear(); return; }
      const meta = (name) => document.querySelector('meta[property="' + name + '"], meta[name="' + name + '"]')?.getAttribute('content') || '';
      const cssUrl = (value) => { const match = String(value || '').match(/url\\((['"]?)(.*?)\\1\\)/i); return match ? match[2] : ''; };
      const ambient = document.querySelector('.av-ambient-img');
      const poster = cssUrl(ambient?.style?.backgroundImage || '') || meta('og:image');
      const title = (meta('og:title') || document.title).replace(/^Ep\\s+\\d+\\s+[—-]\\s*/i, '').replace(/\\s*\\|\\s*AniVault.*$/i, '').trim() || 'Anime';
      const episodeTitle = document.querySelector('.wp-ep-title, [data-episode-title]')?.textContent?.trim() || '';
      const currentTime = video && Number.isFinite(video.currentTime) ? Math.max(0, video.currentTime) : 0;
      const duration = video && Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
      const playing = !!video && !video.paused && !video.ended && !video.seeking;
      post({ event, title, episode, episodeTitle, url: location.href, image: state.image || poster, banner: state.banner, currentTime, duration, playing, at: Date.now() });
    } catch (_) {}
  };

  const loadArt = async () => {
    try {
      const animeId = new URL(location.href).searchParams.get('anime') || '';
      if (!animeId || state.artLoading || state.artLoadedFor === animeId) return;
      state.artLoading = true;
      const response = await fetch('/anime?id=' + encodeURIComponent(animeId), { credentials: 'same-origin', cache: 'force-cache' });
      if (response.ok) {
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const poster = doc.querySelector('.ih-thumb img')?.getAttribute('src') || '';
        const banner = cssUrl(doc.querySelector('.ih-bg')?.getAttribute('style') || '');
        if (!state.image && poster) state.image = new URL(poster, location.href).href;
        if (banner) state.banner = new URL(banner, location.href).href;
      }
      state.artLoadedFor = animeId;
    } catch (_) {
    } finally { state.artLoading = false; }
    send('art-ready');
  };

  const attach = () => {
    if (!isWatchPage()) { state.video = null; clear(); return; }
    const next = document.getElementById('sp-video') || document.querySelector('video');
    if (!(next instanceof HTMLVideoElement)) { loadArt(); return; }
    if (next === state.video) {
      if (state.lastUrl !== location.href) send('route-change');
      loadArt();
      return;
    }
    state.video = next;
    ['play','playing','pause','waiting','stalled','seeked','loadedmetadata','durationchange','ended'].forEach((name) => next.addEventListener(name, () => send(name), { passive: true }));
    send('ready');
    loadArt();
  };

  window.__anivaultPresenceSend = send;
  const originalPushState = history.pushState;
  history.pushState = function () { const result = originalPushState.apply(this, arguments); setTimeout(attach, 0); return result; };
  window.addEventListener('popstate', attach);
  window.addEventListener('pagehide', () => post({ event: 'pagehide' }), { capture: true });
  attach();
  new MutationObserver(attach).observe(document.documentElement, { childList: true, subtree: true });
})();
true;
`;

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
  }, []);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload.event === 'clear' || payload.event === 'pagehide' || payload.event === 'ended') {
        AniVaultDiscordPresence?.clear?.();
        clearHeartbeat();
        return;
      }
      if (!payload.episode) return;
      AniVaultDiscordPresence?.start?.(DISCORD_APPLICATION_ID);
      AniVaultDiscordPresence?.update?.(JSON.stringify(payload));
      if (!heartbeatRef.current) {
        heartbeatRef.current = setInterval(() => {
          webViewRef.current?.injectJavaScript('window.__anivaultPresenceSend?.("heartbeat"); true;');
        }, 10000);
      }
    } catch (_) {}
  }, [clearHeartbeat]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webViewRef.current) { webViewRef.current.goBack(); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [canGoBack]);

  useEffect(() => () => {
    clearHeartbeat();
    try { AniVaultDiscordPresence?.clear?.(); AniVaultDiscordPresence?.close?.(); } catch (_) {}
  }, [clearHeartbeat]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#08090c" />
      {loading && <View style={styles.loading}><ActivityIndicator size="large" color="#E8453C" /></View>}
      <WebView
        ref={webViewRef}
        source={{ uri: SITE_URL }}
        style={styles.webview}
        originWhitelist={['https://*', 'http://*']}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo
        setSupportMultipleWindows={false}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => setLoading(false)}
        onNavigationStateChange={(navigation) => setCanGoBack(navigation.canGoBack)}
        onMessage={handleMessage}
        injectedJavaScript={PRESENCE_SCRIPT}
        injectedJavaScriptBeforeContentLoaded={PRESENCE_SCRIPT}
        pullToRefreshEnabled
        allowsBackForwardNavigationGestures
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#08090c' },
  webview: { flex: 1, backgroundColor: '#08090c' },
  loading: { ...StyleSheet.absoluteFillObject, zIndex: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: '#08090c' },
});
