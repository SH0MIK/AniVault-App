import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getAnimeDetail, getEpisodes, getEpisodeThumbnails, getPlayback, type AnimeDetail, type EpisodeItem, type EpisodeThumbnail, type PlaybackResult } from '../api/content';
import { colors, fonts } from '../theme';

export default function WatchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { animeId, episodeNum: initialEpisode, title: routeTitle } = route.params as { animeId: number; episodeNum: number; title?: string };

  const [anime, setAnime] = useState<AnimeDetail | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [episode, setEpisode] = useState(Math.max(1, Number(initialEpisode) || 1));
  const [language, setLanguage] = useState<'sub' | 'dub'>('sub');
  const [loading, setLoading] = useState(true);
  const [playback, setPlayback] = useState<PlaybackResult | null>(null);
  const [playerLoading, setPlayerLoading] = useState(true);
  const [playerError, setPlayerError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [detail, eps, thumbs] = await Promise.all([
          getAnimeDetail(animeId),
          getEpisodes(animeId),
          getEpisodeThumbnails(animeId).catch(() => ({ success: false, overrides: [] as EpisodeThumbnail[] })),
        ]);
        if (cancelled) return;
        setAnime(detail.anime);
        setEpisodes(eps.data ?? []);
        const map: Record<number, string> = {};
        for (const item of thumbs.overrides ?? []) {
          if (item.image_url) map[Number(item.episode_num)] = item.image_url;
        }
        setThumbnails(map);
      } catch {
        // Keep the player shell usable even if optional metadata fails.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [animeId]);

  const totalEpisodes = Math.max(1, anime?.totalEpisodes || episodes.length || 1);
  const malId = anime?.id ?? animeId;

  useEffect(() => {
    if (!anime) return;
    let cancelled = false;
    setPlayback(null);
    setPlayerLoading(true);
    setPlayerError(null);
    (async () => {
      try {
        const result = await getPlayback(malId, episode, language);
        if (cancelled) return;
        const playable = result.hlsProxyUrl || result.m3u8 || result.videoUrl || result.streamUrl || result.url || result.embedUrl;
        if (!playable) throw new Error('The scraper did not return a playable stream.');
        setPlayback(result);
      } catch (error: any) {
        if (cancelled) return;
        setPlayback(null);
        setPlayerError(error?.message || 'Could not resolve this episode.');
        setPlayerLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [anime, malId, episode, language]);

  const episodeRows = useMemo(() => {
    const max = Math.max(totalEpisodes, episodes.length, episode);
    return Array.from({ length: max }, (_, index) => {
      const num = index + 1;
      const data = episodes.find((item) => Number(item.episode ?? item.mal_id) === num);
      return { num, data };
    });
  }, [episodes, totalEpisodes, episode]);

  const title = anime?.title || routeTitle || 'Watching';
  const directUrl = playback?.hlsProxyUrl || playback?.m3u8 || playback?.videoUrl || playback?.streamUrl || playback?.url || null;
  const isHls = Boolean(directUrl && (playback?.hlsProxyUrl || playback?.m3u8 || directUrl.includes('.m3u8')));

  const selectEpisode = (next: number) => {
    if (next < 1 || next > totalEpisodes) return;
    setEpisode(next);
  };

  const playerHtml = useMemo(() => {
    if (!directUrl && !playback?.embedUrl) return '';
    if (!directUrl && playback?.embedUrl) {
      const iframeUrl = escapeHtml(playback.embedUrl);
      return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"></head><body style="margin:0;background:#000;overflow:hidden"><iframe src="${iframeUrl}" style="width:100vw;height:100vh;border:0" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen></iframe></body></html>`;
    }

    // IMPORTANT: URLs are HTML-escaped only when inserted into an HTML
    // attribute. For JavaScript strings (especially HLS URLs with query
    // parameters), use JSON.stringify so '&' is not turned into '&amp;'.
    const htmlUrl = escapeHtml(directUrl!);
    const jsUrl = JSON.stringify(directUrl);
    const hls = isHls;

    return `<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>html,body{margin:0;width:100%;height:100%;background:#000;overflow:hidden}video{width:100%;height:100%;background:#000;object-fit:contain}</style></head>
<body><video id="v" controls playsinline webkit-playsinline preload="auto"${hls ? '' : ` src="${htmlUrl}"`}></video>
${hls ? '<script src="https://cdn.jsdelivr.net/npm/hls.js@1.6.2/dist/hls.min.js"></script>' : ''}
<script>
(function(){
 const v=document.getElementById('v');
 const src=${jsUrl};
 function post(message){if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(message);}}
 function ready(){post('READY');}
 function fail(e){post('ERROR:'+((e&&e.message)||'Playback failed'));}
 v.addEventListener('canplay',ready); v.addEventListener('playing',ready); v.addEventListener('error',()=>fail(v.error));
 ${hls ? `if(window.Hls&&Hls.isSupported()){
   const h=new Hls({enableWorker:true});
   h.on(Hls.Events.MANIFEST_PARSED,()=>{ready();v.play().catch(()=>{});});
   h.on(Hls.Events.ERROR,(e,d)=>{if(d&&d.fatal){fail(d);}});
   h.loadSource(src); h.attachMedia(v);
 }else if(v.canPlayType('application/vnd.apple.mpegurl')){
   v.src=src; v.addEventListener('loadedmetadata',()=>{ready();v.play().catch(()=>{});});
 }else{fail({message:'HLS is not supported on this device'});}` : `v.addEventListener('loadedmetadata',ready);`}
})();
</script></body></html>`;
  }, [directUrl, playback?.embedUrl, isHls]);

  const onWebMessage = (event: WebViewMessageEvent) => {
    const message = event.nativeEvent.data || '';
    if (message === 'READY') setPlayerLoading(false);
    if (message.startsWith('ERROR:')) {
      setPlayerLoading(false);
      setPlayerError(message.slice(6) || 'Playback failed.');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.loadingText}>Loading player…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={21} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.subtitle}>Episode {episode} • {language.toUpperCase()}</Text>
        </View>
        <View style={styles.watchBadge}><Text style={styles.watchBadgeText}>WATCH</Text></View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.playerShell}>
          {playerError ? (
            <View style={styles.playerError}>
              <Ionicons name="alert-circle-outline" size={24} color="#fff" />
              <Text style={styles.playerErrorTitle}>STREAM UNAVAILABLE</Text>
              <Text style={styles.playerErrorText}>{playerError}</Text>
              <Pressable onPress={() => { setEpisode((value) => value); }} style={styles.retryButton}>
                <Ionicons name="refresh" size={14} color="#000" />
                <Text style={styles.retryText}>RETRY</Text>
              </Pressable>
            </View>
          ) : playback ? (
            <WebView
              key={`${episode}-${language}-${directUrl || playback.embedUrl}`}
              source={{ html: playerHtml, baseUrl: 'https://www.anivault.co/' }}
              style={styles.webview}
              javaScriptEnabled
              domStorageEnabled
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              allowsFullscreenVideo
              mixedContentMode="always"
              originWhitelist={['http://*', 'https://*']}
              onMessage={onWebMessage}
              onError={() => { setPlayerLoading(false); setPlayerError('The video player failed to load.'); }}
            />
          ) : null}

          {playerLoading && !playerError && (
            <View style={styles.playerLoader} pointerEvents="none">
              <ActivityIndicator color="#fff" />
              <Text style={styles.playerLoaderText}>Resolving stream…</Text>
            </View>
          )}
        </View>

        <View style={styles.controlRow}>
          <Pressable disabled={episode <= 1} onPress={() => selectEpisode(episode - 1)} style={[styles.control, episode <= 1 && styles.disabled]}>
            <Ionicons name="chevron-back" size={14} color="#fff" />
            <Text style={styles.controlText}>PREV</Text>
          </Pressable>
          <Pressable disabled={episode >= totalEpisodes} onPress={() => selectEpisode(episode + 1)} style={[styles.control, episode >= totalEpisodes && styles.disabled]}>
            <Text style={styles.controlText}>NEXT</Text>
            <Ionicons name="chevron-forward" size={14} color="#fff" />
          </Pressable>
          <Pressable onPress={() => selectEpisode(totalEpisodes)} style={[styles.control, episode === totalEpisodes && styles.activeControl]}>
            <Text style={styles.controlText}>LATEST</Text>
          </Pressable>
        </View>

        <View style={styles.languageRow}>
          <Pressable onPress={() => { if (language !== 'sub') setLanguage('sub'); }} style={[styles.languageButton, language === 'sub' && styles.languageActive]}>
            <Text style={[styles.languageText, language === 'sub' && styles.languageActiveText]}>SUBTITLED</Text>
          </Pressable>
          <Pressable onPress={() => { if (language !== 'dub') setLanguage('dub'); }} style={[styles.languageButton, language === 'dub' && styles.languageActive]}>
            <Text style={[styles.languageText, language === 'dub' && styles.languageActiveText]}>DUBBED</Text>
          </Pressable>
        </View>

        {totalEpisodes > 1 && (
          <View style={styles.episodeSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>EPISODES</Text>
              <View style={styles.countBadge}><Text style={styles.countText}>{totalEpisodes}</Text></View>
            </View>
            <View style={styles.episodeGrid}>
              {episodeRows.map(({ num, data }) => {
                const image = thumbnails[num] || anime?.image;
                const selected = episode === num;
                return (
                  <Pressable key={num} onPress={() => selectEpisode(num)} style={[styles.episodeCard, selected && styles.episodeSelected]}>
                    {image ? <Image source={{ uri: image }} style={styles.episodeImage} contentFit="cover" /> : <View style={styles.episodeImageFallback} />}
                    <View style={styles.episodeShade} />
                    <View style={styles.episodeNumber}><Text style={styles.episodeNumberText}>{num}</Text></View>
                    {selected && <View style={styles.selectedMark}><Ionicons name="play" size={10} color="#000" /></View>}
                    {data?.title ? <Text style={styles.episodeName} numberOfLines={1}>{data.title}</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  center: { flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, color: colors.textSecondary, fontSize: 11, fontFamily: fonts.bodyMedium },
  header: { height: 58, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: '#0c0c10', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  iconButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCard },
  headerText: { flex: 1, marginLeft: 11 },
  title: { color: colors.textPrimary, fontSize: 13, fontWeight: '700', fontFamily: fonts.bodyBold },
  subtitle: { color: colors.textMuted, fontSize: 10, marginTop: 2, fontFamily: fonts.bodyMedium },
  watchBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7, backgroundColor: colors.bgCard, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  watchBadgeText: { color: colors.textSecondary, fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 28 },
  playerShell: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  webview: { flex: 1, backgroundColor: '#000' },
  playerLoader: { ...StyleSheet.absoluteFillObject, zIndex: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  playerLoaderText: { marginTop: 9, color: 'rgba(255,255,255,0.55)', fontSize: 10 },
  playerError: { ...StyleSheet.absoluteFillObject, zIndex: 4, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, backgroundColor: '#000' },
  playerErrorTitle: { marginTop: 7, color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  playerErrorText: { marginTop: 6, color: 'rgba(255,255,255,0.55)', fontSize: 9, textAlign: 'center' },
  retryButton: { marginTop: 12, paddingHorizontal: 13, height: 30, borderRadius: 7, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 5 },
  retryText: { color: '#000', fontSize: 9, fontWeight: '900' },
  controlRow: { flexDirection: 'row', gap: 7, paddingHorizontal: 14, paddingTop: 12 },
  control: { height: 34, paddingHorizontal: 11, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.07)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  activeControl: { backgroundColor: 'rgba(255,255,255,0.13)' },
  disabled: { opacity: 0.35 },
  controlText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  languageRow: { height: 34, marginHorizontal: 14, marginTop: 8, padding: 2, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', flexDirection: 'row' },
  languageButton: { flex: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  languageActive: { backgroundColor: '#fff' },
  languageText: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  languageActiveText: { color: '#000' },
  episodeSection: { paddingHorizontal: 14, paddingTop: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 9 },
  sectionTitle: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.7 },
  countBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)' },
  countText: { color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  episodeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  episodeCard: { width: '15.85%', aspectRatio: 1, minWidth: 48, borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'transparent' },
  episodeSelected: { borderColor: '#fff', borderWidth: 1.5 },
  episodeImage: { ...StyleSheet.absoluteFillObject },
  episodeImageFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: '#18181d' },
  episodeShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  episodeNumber: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  episodeNumberText: { color: '#fff', fontSize: 13, fontWeight: '800', textShadowColor: '#000', textShadowRadius: 4 },
  selectedMark: { position: 'absolute', right: 5, top: 5, width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  episodeName: { position: 'absolute', left: 5, right: 5, bottom: 4, color: '#fff', fontSize: 7, fontWeight: '600' },
});
