import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getEpisodeThumbnails, getPlayback, type EpisodeThumbnail, type PlaybackResult } from '../api/content';
import { getMalAnime, getMalEpisodes, type MalAnime, type MalEpisode } from '../api/mal';
import { fonts } from '../theme';

export default function WatchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width } = useWindowDimensions();
  const { animeId, episodeNum: initialEpisode, title: routeTitle } = route.params as { animeId: number; episodeNum: number; title?: string };
  const [anime, setAnime] = useState<MalAnime | null>(null);
  const [episodes, setEpisodes] = useState<MalEpisode[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [episode, setEpisode] = useState(Math.max(1, Number(initialEpisode) || 1));
  const [language, setLanguage] = useState<'sub' | 'dub'>('sub');
  const [loading, setLoading] = useState(true);
  const [playback, setPlayback] = useState<PlaybackResult | null>(null);
  const [playerLoading, setPlayerLoading] = useState(true);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getMalAnime(Number(animeId)),
      getMalEpisodes(Number(animeId)),
      getEpisodeThumbnails(Number(animeId)).catch(() => ({ success: false, overrides: [] as EpisodeThumbnail[] })),
    ]).then(([detail, eps, thumbs]) => {
      if (cancelled) return;
      setAnime(detail);
      setEpisodes(eps ?? []);
      const map: Record<number, string> = {};
      for (const item of thumbs.overrides ?? []) {
        const n = Number(item.episode_num);
        if (n > 0 && item.image_url) map[n] = item.image_url;
      }
      setThumbnails(map);
    }).catch(() => {
      if (!cancelled) setAnime({ id: Number(animeId), title: routeTitle || 'Watching', num_episodes: 1 });
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [animeId, routeTitle]);

  const malId = Number(anime?.id ?? animeId);
  const totalEpisodes = Math.max(1, anime?.num_episodes || episodes.length || episode);
  const title = anime?.title || routeTitle || 'Watching';
  const poster = anime?.main_picture?.large || anime?.main_picture?.medium;

  useEffect(() => {
    if (!malId) return;
    let cancelled = false;
    setPlayback(null); setPlayerLoading(true); setPlayerError(null);
    (async () => {
      try {
        const result = await getPlayback(malId, episode, language);
        if (cancelled) return;
        const playable = result.hlsProxyUrl || result.m3u8 || result.videoUrl || result.streamUrl || result.url || result.embedUrl;
        if (!playable) throw new Error('No playable stream was returned.');
        setPlayback(result);
      } catch (error: any) {
        if (cancelled) return;
        setPlayback(null); setPlayerError(error?.message || 'Could not resolve this episode.'); setPlayerLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [malId, episode, language, retryNonce]);

  const episodeRows = useMemo(() => {
    const max = Math.max(totalEpisodes, episodes.length, episode);
    const byNumber = new Map(episodes.map((item) => [Number(item.number), item]));
    return Array.from({ length: max }, (_, i) => ({ num: i + 1, data: byNumber.get(i + 1) }));
  }, [episodes, totalEpisodes, episode]);

  const directUrl = playback?.hlsProxyUrl || playback?.m3u8 || playback?.videoUrl || playback?.streamUrl || playback?.url || null;
  const isHls = Boolean(directUrl && (playback?.hlsProxyUrl || playback?.m3u8 || directUrl.includes('.m3u8')));
  const selectEpisode = (next: number) => { if (next >= 1 && next <= totalEpisodes) setEpisode(next); };

  const playerHtml = useMemo(() => {
    if (!directUrl && !playback?.embedUrl) return '';
    if (!directUrl && playback?.embedUrl) return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#000;overflow:hidden"><iframe src="${escapeHtml(playback.embedUrl)}" style="width:100vw;height:100vh;border:0" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen></iframe></body></html>`;
    const htmlUrl = escapeHtml(directUrl!);
    const jsUrl = JSON.stringify(directUrl);
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>html,body{margin:0;width:100%;height:100%;background:#000;overflow:hidden}video{width:100%;height:100%;background:#000;object-fit:contain}</style></head><body><video id="v" controls playsinline webkit-playsinline preload="auto"${isHls ? '' : ` src="${htmlUrl}"`}></video>${isHls ? '<script src="https://cdn.jsdelivr.net/npm/hls.js@1.6.2/dist/hls.min.js"></script>' : ''}<script>(function(){const v=document.getElementById('v'),src=${jsUrl};function post(m){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(m)}function ready(){post('READY')}function fail(e){post('ERROR:'+((e&&e.message)||'Playback failed'))}v.addEventListener('canplay',ready);v.addEventListener('playing',ready);v.addEventListener('error',()=>fail(v.error));${isHls ? `if(window.Hls&&Hls.isSupported()){const h=new Hls({enableWorker:true});h.on(Hls.Events.MANIFEST_PARSED,()=>{ready();v.play().catch(()=>{})});h.on(Hls.Events.ERROR,(e,d)=>{if(d&&d.fatal)fail(d)});h.loadSource(src);h.attachMedia(v)}else if(v.canPlayType('application/vnd.apple.mpegurl')){v.src=src;v.addEventListener('loadedmetadata',()=>{ready();v.play().catch(()=>{})})}else fail({message:'HLS is not supported on this device'})` : `v.addEventListener('loadedmetadata',ready)`}})();</script></body></html>`;
  }, [directUrl, playback?.embedUrl, isHls]);

  const onWebMessage = (event: WebViewMessageEvent) => {
    const message = event.nativeEvent.data || '';
    if (message === 'READY') setPlayerLoading(false);
    if (message.startsWith('ERROR:')) { setPlayerLoading(false); setPlayerError(message.slice(6) || 'Playback failed.'); }
  };

  const columns = width >= 600 ? 5 : 4;
  const gap = 8;
  const cardWidth = Math.max(54, Math.floor((width - 24 - gap * (columns - 1)) / columns));

  if (loading) return <View style={styles.center}><ActivityIndicator color="#fff" /><Text style={styles.loadingText}>Loading…</Text></View>;

  return <View style={styles.container}>
    <View style={styles.topBar}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={8}><Ionicons name="arrow-back" size={20} color="#fff" /></Pressable>
      <View style={styles.topInfo}><Text style={styles.topTitle} numberOfLines={1}>{title}</Text><Text style={styles.topSub}>EPISODE {episode} · {language === 'sub' ? 'SUB' : 'DUB'}</Text></View>
      <View style={styles.liveDot} />
    </View>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.playerShell}>
        {playerError ? <View style={styles.playerError}><Ionicons name="cloud-offline-outline" size={28} color="#fff" /><Text style={styles.errorTitle}>STREAM UNAVAILABLE</Text><Text style={styles.errorText} numberOfLines={2}>{playerError}</Text><Pressable onPress={() => setRetryNonce((n) => n + 1)} style={styles.retryButton}><Ionicons name="refresh" size={14} color="#000" /><Text style={styles.retryText}>RETRY</Text></Pressable></View> : playback ? <WebView key={`${episode}-${language}-${retryNonce}-${directUrl || playback.embedUrl}`} source={{ html: playerHtml, baseUrl: 'https://www.anivault.co/' }} style={styles.webview} javaScriptEnabled domStorageEnabled allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false} allowsFullscreenVideo mixedContentMode="always" originWhitelist={['http://*', 'https://*']} onMessage={onWebMessage} onError={() => { setPlayerLoading(false); setPlayerError('The video player failed to load.'); }} /> : null}
        {playerLoading && !playerError && <View style={styles.playerLoader} pointerEvents="none"><ActivityIndicator color="#fff" /><Text style={styles.playerLoaderText}>Loading stream…</Text></View>}
      </View>

      <View style={styles.episodeBar}>
        <Pressable disabled={episode <= 1} onPress={() => selectEpisode(episode - 1)} style={[styles.navButton, episode <= 1 && styles.disabled]}><Ionicons name="chevron-back" size={15} color="#fff" /><Text style={styles.navText}>PREV</Text></Pressable>
        <View style={styles.currentEpisode}><Text style={styles.currentLabel}>EP</Text><Text style={styles.currentNumber}>{episode}</Text></View>
        <Pressable disabled={episode >= totalEpisodes} onPress={() => selectEpisode(episode + 1)} style={[styles.navButton, episode >= totalEpisodes && styles.disabled]}><Text style={styles.navText}>NEXT</Text><Ionicons name="chevron-forward" size={15} color="#fff" /></Pressable>
        <Pressable onPress={() => selectEpisode(totalEpisodes)} style={styles.latest}><Text style={styles.navText}>LATEST</Text></Pressable>
      </View>

      <View style={styles.languageBox}>
        <Pressable onPress={() => setLanguage('sub')} style={[styles.languageButton, language === 'sub' && styles.languageSelected]}><Ionicons name="chatbubble-outline" size={13} color={language === 'sub' ? '#000' : '#888'} /><Text style={[styles.languageText, language === 'sub' && styles.languageSelectedText]}>SUBTITLED</Text></Pressable>
        <Pressable onPress={() => setLanguage('dub')} style={[styles.languageButton, language === 'dub' && styles.languageSelected]}><Ionicons name="volume-high-outline" size={13} color={language === 'dub' ? '#000' : '#888'} /><Text style={[styles.languageText, language === 'dub' && styles.languageSelectedText]}>DUBBED</Text></Pressable>
      </View>

      <View style={styles.infoRow}>
        {poster ? <Image source={{ uri: poster }} style={styles.miniPoster} contentFit="cover" /> : <View style={styles.miniPosterFallback} />}
        <View style={styles.infoCopy}><Text style={styles.infoTitle} numberOfLines={2}>{title}</Text><Text style={styles.infoMeta}>{anime?.media_type?.toUpperCase() || 'ANIME'} · {totalEpisodes} EPISODES{anime?.mean ? ` · ★ ${anime.mean.toFixed(1)}` : ''}</Text></View>
      </View>

      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>EPISODES</Text><View style={styles.sectionLine} /><Text style={styles.sectionCount}>{totalEpisodes}</Text></View>
      <View style={styles.episodeGrid}>
        {episodeRows.map(({ num, data }) => { const image = thumbnails[num] || poster; const selected = episode === num; return <Pressable key={num} onPress={() => selectEpisode(num)} style={[styles.episodeCard, { width: cardWidth }, selected && styles.episodeCardSelected]}>{image ? <Image source={{ uri: image }} style={styles.episodeImage} contentFit="cover" /> : <View style={styles.episodeImageFallback} />}<View style={styles.cardShade} /><View style={styles.epNumber}><Text style={styles.epNumberText}>{num}</Text></View>{selected && <View style={styles.playMark}><Ionicons name="play" size={9} color="#000" /></View>}{data?.title ? <Text style={styles.epTitle} numberOfLines={1}>{data.title}</Text> : null}</Pressable>; })}
      </View>
      {!!anime?.synopsis && <View style={styles.about}><Text style={styles.sectionTitle}>ABOUT THIS ANIME</Text><Text style={styles.synopsis}>{anime.synopsis}</Text></View>}
    </ScrollView>
  </View>;
}

function escapeHtml(value: string): string { return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' }, center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }, loadingText: { color: 'rgba(255,255,255,.55)', marginTop: 9, fontSize: 11, fontFamily: fonts.bodyMedium },
  topBar: { height: 58, backgroundColor: '#09090c', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,.08)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }, backButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.06)' }, topInfo: { flex: 1, marginLeft: 11 }, topTitle: { color: '#fff', fontSize: 13, fontWeight: '800', fontFamily: fonts.bodyBold }, topSub: { color: 'rgba(255,255,255,.42)', fontSize: 9, marginTop: 3, letterSpacing: .7, fontWeight: '700' }, liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff', marginRight: 4 },
  scroll: { flex: 1 }, content: { paddingBottom: 35 }, playerShell: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' }, webview: { flex: 1, backgroundColor: '#000' }, playerLoader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }, playerLoaderText: { color: 'rgba(255,255,255,.45)', fontSize: 10, marginTop: 8 }, playerError: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, backgroundColor: '#000' }, errorTitle: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: 8 }, errorText: { color: 'rgba(255,255,255,.48)', fontSize: 9, textAlign: 'center', marginTop: 6 }, retryButton: { height: 32, paddingHorizontal: 14, borderRadius: 7, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 13 }, retryText: { color: '#000', fontSize: 9, fontWeight: '900' },
  episodeBar: { paddingHorizontal: 12, paddingTop: 11, flexDirection: 'row', alignItems: 'center', gap: 6 }, navButton: { height: 34, paddingHorizontal: 10, borderRadius: 7, backgroundColor: '#101014', borderWidth: 1, borderColor: 'rgba(255,255,255,.07)', flexDirection: 'row', alignItems: 'center', gap: 3 }, navText: { color: '#fff', fontSize: 8, fontWeight: '900', letterSpacing: .5 }, disabled: { opacity: .28 }, currentEpisode: { height: 34, minWidth: 49, borderRadius: 7, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 3 }, currentLabel: { color: '#666', fontSize: 7, fontWeight: '900' }, currentNumber: { color: '#000', fontSize: 12, fontWeight: '900' }, latest: { height: 34, paddingHorizontal: 10, borderRadius: 7, backgroundColor: '#101014', borderWidth: 1, borderColor: 'rgba(255,255,255,.07)', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  languageBox: { margin: 8, height: 38, padding: 3, borderRadius: 9, backgroundColor: '#0b0b0f', flexDirection: 'row', borderWidth: 1, borderColor: 'rgba(255,255,255,.06)' }, languageButton: { flex: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 }, languageSelected: { backgroundColor: '#fff' }, languageText: { color: '#777', fontSize: 8, fontWeight: '900', letterSpacing: .5 }, languageSelectedText: { color: '#000' },
  infoRow: { marginHorizontal: 12, marginTop: 7, padding: 9, borderRadius: 10, backgroundColor: '#09090c', borderWidth: 1, borderColor: 'rgba(255,255,255,.06)', flexDirection: 'row' }, miniPoster: { width: 45, height: 62, borderRadius: 6, backgroundColor: '#141419' }, miniPosterFallback: { width: 45, height: 62, borderRadius: 6, backgroundColor: '#141419' }, infoCopy: { flex: 1, paddingLeft: 10, justifyContent: 'center' }, infoTitle: { color: '#fff', fontSize: 12, fontWeight: '800', lineHeight: 17 }, infoMeta: { color: 'rgba(255,255,255,.4)', fontSize: 8, marginTop: 7, letterSpacing: .4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginTop: 20, marginBottom: 10, gap: 8 }, sectionTitle: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: .8 }, sectionLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,.07)' }, sectionCount: { color: 'rgba(255,255,255,.38)', fontSize: 9, fontWeight: '800' }, episodeGrid: { paddingHorizontal: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, episodeCard: { aspectRatio: 1.48, borderRadius: 7, overflow: 'hidden', backgroundColor: '#111116', borderWidth: 1, borderColor: 'transparent' }, episodeCardSelected: { borderColor: '#fff', borderWidth: 1.5 }, episodeImage: { ...StyleSheet.absoluteFillObject }, episodeImageFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: '#17171d' }, cardShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,.35)' }, epNumber: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' }, epNumberText: { color: '#fff', fontSize: 14, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 5 }, playMark: { position: 'absolute', top: 5, right: 5, width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }, epTitle: { position: 'absolute', left: 5, right: 5, bottom: 4, color: '#fff', fontSize: 7, fontWeight: '700', textShadowColor: '#000', textShadowRadius: 3 }, about: { marginHorizontal: 12, marginTop: 22, paddingTop: 17, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.06)' }, synopsis: { color: 'rgba(255,255,255,.48)', fontSize: 10, lineHeight: 16, marginTop: 8 },
});
