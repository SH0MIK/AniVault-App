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
  const { animeId, episodeNum: initialEpisode, title: routeTitle } = route.params as {
    animeId: number;
    episodeNum: number;
    title?: string;
  };

  const [anime, setAnime] = useState<MalAnime | null>(null);
  const [episodes, setEpisodes] = useState<MalEpisode[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [thumbnailTotal, setThumbnailTotal] = useState(0);
  const [episode, setEpisode] = useState(Math.max(1, Number(initialEpisode) || 1));
  const [language, setLanguage] = useState<'sub' | 'dub'>('sub');
  const [loading, setLoading] = useState(true);
  const [playback, setPlayback] = useState<PlaybackResult | null>(null);
  const [playerLoading, setPlayerLoading] = useState(true);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const id = Number(animeId);

    setLoading(true);
    setAnime(null);
    setEpisodes([]);
    setThumbnails({});
    setThumbnailTotal(0);

    (async () => {
      const [detailResult, episodesResult, thumbsResult] = await Promise.allSettled([
        getMalAnime(id),
        getMalEpisodes(id),
        getEpisodeThumbnails(id),
      ]);

      if (cancelled) return;

      const detail = detailResult.status === 'fulfilled' ? detailResult.value : null;
      const eps = episodesResult.status === 'fulfilled' ? episodesResult.value : [];
      const thumbs = thumbsResult.status === 'fulfilled'
        ? thumbsResult.value
        : { success: false, overrides: [] as EpisodeThumbnail[], total_eps: 0 };

      setAnime(detail || {
        id,
        title: routeTitle || 'Watching',
        media_type: 'TV',
        num_episodes: 0,
      });
      setEpisodes(eps);

      const map: Record<number, string> = {};
      for (const item of thumbs.overrides ?? []) {
        const n = Number(item.episode_num);
        if (n > 0 && item.image_url) map[n] = item.image_url;
      }
      setThumbnails(map);
      setThumbnailTotal(Number(thumbs.total_eps) || 0);
      setLoading(false);
    })().catch(() => {
      if (cancelled) return;
      setAnime({
        id,
        title: routeTitle || 'Watching',
        media_type: 'TV',
        num_episodes: 0,
      });
      setEpisodes([]);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [animeId, routeTitle]);

  const malId = Number(anime?.id ?? animeId);
  const episodeMax = episodes.reduce((max, item) => Math.max(max, Number(item.number) || 0), 0);
  const totalEpisodes = Math.max(
    1,
    Number(anime?.num_episodes) || 0,
    episodeMax,
    thumbnailTotal,
    episode,
  );
  const title = anime?.title || routeTitle || 'Watching';
  const firstThumbnail = thumbnails[1] || Object.values(thumbnails)[0];
  const poster = anime?.main_picture?.large || anime?.main_picture?.medium || firstThumbnail;

  useEffect(() => {
    if (!malId) return;
    let cancelled = false;

    setPlayback(null);
    setPlayerLoading(true);
    setPlayerError(null);

    (async () => {
      try {
        const result = await getPlayback(malId, episode, language);
        if (cancelled) return;
        const playable = result.hlsProxyUrl || result.m3u8 || result.videoUrl || result.streamUrl || result.url || result.embedUrl;
        if (!playable) throw new Error('No playable stream was returned.');
        setPlayback(result);
      } catch (error: any) {
        if (cancelled) return;
        setPlayback(null);
        setPlayerLoading(false);
        setPlayerError(error?.message || 'Could not resolve this episode.');
      }
    })();

    return () => { cancelled = true; };
  }, [malId, episode, language, retryNonce]);

  const episodeRows = useMemo(() => {
    const byNumber = new Map(episodes.map((item) => [Number(item.number), item]));
    return Array.from({ length: totalEpisodes }, (_, index) => ({
      num: index + 1,
      data: byNumber.get(index + 1),
    }));
  }, [episodes, totalEpisodes]);

  const directUrl = playback?.hlsProxyUrl || playback?.m3u8 || playback?.videoUrl || playback?.streamUrl || playback?.url || null;
  const isHls = Boolean(directUrl && (playback?.hlsProxyUrl || playback?.m3u8 || directUrl.includes('.m3u8')));
  const selectEpisode = (next: number) => {
    if (next >= 1 && next <= totalEpisodes) setEpisode(next);
  };

  const playerHtml = useMemo(() => {
    if (!directUrl && !playback?.embedUrl) return '';

    if (!directUrl && playback?.embedUrl) {
      return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#000;overflow:hidden"><iframe src="${escapeHtml(playback.embedUrl)}" style="width:100vw;height:100vh;border:0" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen></iframe></body></html>`;
    }

    const htmlUrl = escapeHtml(directUrl!);
    const jsUrl = JSON.stringify(directUrl);
    const hlsScript = isHls ? '<script src="https://cdn.jsdelivr.net/npm/hls.js@1.6.2/dist/hls.min.js"></script>' : '';
    const setup = isHls
      ? `if(window.Hls&&Hls.isSupported()){const h=new Hls({enableWorker:true,lowLatencyMode:false});h.on(Hls.Events.MANIFEST_PARSED,()=>{ready();v.play().catch(()=>{})});h.on(Hls.Events.ERROR,(e,d)=>{if(d&&d.fatal)fail(d)});h.loadSource(src);h.attachMedia(v)}else if(v.canPlayType('application/vnd.apple.mpegurl')){v.src=src;v.addEventListener('loadedmetadata',()=>{ready();v.play().catch(()=>{})})}else fail({message:'HLS is not supported on this device'})`
      : `v.addEventListener('loadedmetadata',ready);v.addEventListener('canplay',ready)`;

    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>html,body{margin:0;width:100%;height:100%;background:#000;overflow:hidden}video{width:100%;height:100%;background:#000;object-fit:contain}</style></head><body><video id="v" controls playsinline webkit-playsinline preload="auto"${isHls ? '' : ` src="${htmlUrl}"`}></video>${hlsScript}<script>(function(){const v=document.getElementById('v'),src=${jsUrl};function post(m){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(m)}function ready(){post('READY')}function fail(e){post('ERROR:'+((e&&e.message)||'Playback failed'))}v.addEventListener('error',()=>fail(v.error));${setup}})();</script></body></html>`;
  }, [directUrl, playback?.embedUrl, isHls]);

  const onWebMessage = (event: WebViewMessageEvent) => {
    const message = event.nativeEvent.data || '';
    if (message === 'READY') {
      setPlayerLoading(false);
      setPlayerError(null);
    }
    if (message.startsWith('ERROR:')) {
      setPlayerLoading(false);
      setPlayerError(message.slice(6) || 'Playback failed.');
    }
  };

  const columns = width >= 700 ? 5 : 4;
  const horizontalPadding = 16;
  const gap = 8;
  const cardWidth = Math.floor((width - horizontalPadding * 2 - gap * (columns - 1)) / columns);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#fff" /><Text style={styles.loadingText}>Loading…</Text></View>;
  }

  return <View style={styles.container}>
    <View style={styles.topBar}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={8}>
        <Ionicons name="arrow-back" size={23} color="#fff" />
      </Pressable>
      <View style={styles.topInfo}>
        <Text style={styles.topTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.topSub}>EPISODE {episode} · {language === 'sub' ? 'SUB' : 'DUB'}</Text>
      </View>
      <View style={styles.liveDot} />
    </View>

    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.playerShell}>
        {playerError ? (
          <View style={styles.playerError}>
            <Ionicons name="cloud-offline-outline" size={28} color="#fff" />
            <Text style={styles.errorTitle}>STREAM UNAVAILABLE</Text>
            <Text style={styles.errorText} numberOfLines={2}>{playerError}</Text>
            <Pressable onPress={() => setRetryNonce((n) => n + 1)} style={styles.retryButton}>
              <Ionicons name="refresh" size={14} color="#000" />
              <Text style={styles.retryText}>RETRY</Text>
            </Pressable>
          </View>
        ) : playback ? (
          <WebView
            key={`${episode}-${language}-${retryNonce}-${directUrl || playback.embedUrl}`}
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
            onLoadEnd={() => setPlayerLoading(false)}
            onError={() => {
              setPlayerLoading(false);
              setPlayerError('The video player failed to load.');
            }}
            onHttpError={() => setPlayerLoading(false)}
          />
        ) : null}
        {playerLoading && !playerError && (
          <View style={styles.playerLoader} pointerEvents="none">
            <ActivityIndicator color="#fff" />
            <Text style={styles.playerLoaderText}>Loading stream…</Text>
          </View>
        )}
      </View>

      <View style={styles.episodeBar}>
        <Pressable disabled={episode <= 1} onPress={() => selectEpisode(episode - 1)} style={[styles.navButton, episode <= 1 && styles.disabled]}>
          <Ionicons name="chevron-back" size={15} color="#fff" />
          <Text style={styles.navText}>PREV</Text>
        </Pressable>
        <View style={styles.currentEpisode}>
          <Text style={styles.currentLabel}>EP</Text>
          <Text style={styles.currentNumber}>{episode}</Text>
        </View>
        <Pressable disabled={episode >= totalEpisodes} onPress={() => selectEpisode(episode + 1)} style={[styles.navButton, episode >= totalEpisodes && styles.disabled]}>
          <Text style={styles.navText}>NEXT</Text>
          <Ionicons name="chevron-forward" size={15} color="#fff" />
        </Pressable>
        <Pressable onPress={() => selectEpisode(totalEpisodes)} style={styles.latest}>
          <Text style={styles.navText}>LATEST</Text>
        </Pressable>
      </View>

      <View style={styles.languageBox}>
        <Pressable onPress={() => setLanguage('sub')} style={[styles.languageButton, language === 'sub' && styles.languageSelected]}>
          <Ionicons name="chatbubble-outline" size={15} color={language === 'sub' ? '#000' : '#888'} />
          <Text style={[styles.languageText, language === 'sub' && styles.languageSelectedText]}>SUBTITLED</Text>
        </Pressable>
        <Pressable onPress={() => setLanguage('dub')} style={[styles.languageButton, language === 'dub' && styles.languageSelected]}>
          <Ionicons name="volume-high-outline" size={15} color={language === 'dub' ? '#000' : '#888'} />
          <Text style={[styles.languageText, language === 'dub' && styles.languageSelectedText]}>DUBBED</Text>
        </Pressable>
      </View>

      <View style={styles.infoRow}>
        {poster ? <Image source={{ uri: poster }} style={styles.miniPoster} contentFit="cover" /> : <View style={styles.miniPosterFallback} />}
        <View style={styles.infoCopy}>
          <Text style={styles.infoTitle} numberOfLines={2}>{title}</Text>
          <Text style={styles.infoMeta}>{anime?.media_type?.toUpperCase() || 'ANIME'} · {totalEpisodes} EPISODES{anime?.mean ? ` · ★ ${anime.mean.toFixed(1)}` : ''}</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>EPISODES</Text>
        <View style={styles.sectionLine} />
        <Text style={styles.sectionCount}>{totalEpisodes}</Text>
      </View>

      <View style={styles.episodeGrid}>
        {episodeRows.map(({ num, data }) => {
          const image = thumbnails[num] || poster;
          const selected = episode === num;
          return (
            <Pressable key={num} onPress={() => selectEpisode(num)} style={[styles.episodeCard, { width: cardWidth }, selected && styles.episodeCardSelected]}>
              {image ? <Image source={{ uri: image }} style={styles.episodeImage} contentFit="cover" /> : <View style={styles.episodeImageFallback} />}
              <View style={styles.cardShade} />
              <View style={styles.epNumber}><Text style={styles.epNumberText}>{num}</Text></View>
              {selected && <View style={styles.playMark}><Ionicons name="play" size={9} color="#000" /></View>}
              {data?.title ? <Text style={styles.epTitle} numberOfLines={1}>{data.title}</Text> : null}
            </Pressable>
          );
        })}
      </View>

      {!!anime?.synopsis && (
        <View style={styles.about}>
          <Text style={styles.sectionTitle}>ABOUT THIS ANIME</Text>
          <Text style={styles.synopsis}>{anime.synopsis}</Text>
        </View>
      )}
    </ScrollView>
  </View>;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: 'rgba(255,255,255,.55)', marginTop: 9, fontSize: 11, fontFamily: fonts.bodyMedium },
  topBar: { height: 58, backgroundColor: '#09090c', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,.08)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  backButton: { width: 38, height: 38, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.06)' },
  topInfo: { flex: 1, marginLeft: 11 },
  topTitle: { color: '#fff', fontSize: 14, fontWeight: '800', fontFamily: fonts.bodyBold },
  topSub: { color: 'rgba(255,255,255,.42)', fontSize: 9, marginTop: 3, letterSpacing: .7, fontWeight: '700' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff', marginRight: 4 },
  scroll: { flex: 1 },
  content: { paddingBottom: 36 },
  playerShell: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  webview: { flex: 1, backgroundColor: '#000' },
  playerLoader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  playerLoaderText: { color: 'rgba(255,255,255,.45)', fontSize: 10, marginTop: 8 },
  playerError: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, backgroundColor: '#000' },
  errorTitle: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: 8 },
  errorText: { color: 'rgba(255,255,255,.48)', fontSize: 9, textAlign: 'center', marginTop: 6 },
  retryButton: { height: 32, paddingHorizontal: 14, borderRadius: 7, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', marginTop: 13 },
  retryText: { color: '#000', fontSize: 9, fontWeight: '900', marginLeft: 6 },
  episodeBar: { paddingHorizontal: 16, paddingTop: 11, flexDirection: 'row', alignItems: 'center' },
  navButton: { height: 34, minWidth: 88, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#101014', borderWidth: 1, borderColor: 'rgba(255,255,255,.07)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  navText: { color: '#fff', fontSize: 8, fontWeight: '900', letterSpacing: .5 },
  disabled: { opacity: .28 },
  currentEpisode: { height: 34, minWidth: 58, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginHorizontal: 6 },
  currentLabel: { color: '#777', fontSize: 8, fontWeight: '800', marginRight: 4 },
  currentNumber: { color: '#000', fontSize: 14, fontWeight: '900' },
  latest: { height: 34, minWidth: 98, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#101014', borderWidth: 1, borderColor: 'rgba(255,255,255,.07)', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  languageBox: { marginHorizontal: 16, marginTop: 14, height: 70, padding: 5, borderRadius: 16, backgroundColor: '#0a0a0e', borderWidth: 1, borderColor: 'rgba(255,255,255,.08)', flexDirection: 'row' },
  languageButton: { flex: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  languageSelected: { backgroundColor: '#fff' },
  languageText: { color: '#777', fontSize: 10, fontWeight: '900', marginLeft: 8, letterSpacing: .3 },
  languageSelectedText: { color: '#000' },
  infoRow: { marginHorizontal: 16, marginTop: 30, minHeight: 120, borderRadius: 17, backgroundColor: '#08080b', borderWidth: 1, borderColor: 'rgba(255,255,255,.09)', padding: 16, flexDirection: 'row', alignItems: 'center' },
  miniPoster: { width: 86, height: 86, borderRadius: 10, backgroundColor: '#15151a' },
  miniPosterFallback: { width: 86, height: 86, borderRadius: 10, backgroundColor: '#15151a' },
  infoCopy: { flex: 1, marginLeft: 16 },
  infoTitle: { color: '#fff', fontSize: 16, lineHeight: 22, fontWeight: '800', fontFamily: fonts.bodyBold },
  infoMeta: { color: 'rgba(255,255,255,.38)', fontSize: 9, marginTop: 10, letterSpacing: .7, fontWeight: '700' },
  sectionHeader: { marginHorizontal: 16, marginTop: 28, flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: .8 },
  sectionLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,.1)', marginHorizontal: 10 },
  sectionCount: { color: 'rgba(255,255,255,.35)', fontSize: 11, fontWeight: '800' },
  episodeGrid: { marginHorizontal: 16, marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  episodeCard: { height: 78, marginRight: 8, marginBottom: 10, borderRadius: 9, overflow: 'hidden', backgroundColor: '#101014', borderWidth: 1, borderColor: 'rgba(255,255,255,.06)' },
  episodeCardSelected: { borderColor: 'rgba(255,255,255,.75)' },
  episodeImage: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  episodeImageFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: '#15151a' },
  cardShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,.32)' },
  epNumber: { position: 'absolute', left: 7, top: 7, minWidth: 23, height: 20, paddingHorizontal: 5, borderRadius: 5, backgroundColor: 'rgba(0,0,0,.7)', alignItems: 'center', justifyContent: 'center' },
  epNumberText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  playMark: { position: 'absolute', right: 7, top: 7, width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  epTitle: { position: 'absolute', left: 7, right: 7, bottom: 6, color: '#fff', fontSize: 8, fontWeight: '800' },
  about: { marginHorizontal: 16, marginTop: 25, paddingTop: 18, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.08)' },
  synopsis: { color: 'rgba(255,255,255,.5)', fontSize: 11, lineHeight: 18, marginTop: 10 },
});
