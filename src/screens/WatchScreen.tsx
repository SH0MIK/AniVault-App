import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getEpisodeThumbnails, getPlayback, type EpisodeThumbnail, type PlaybackResult } from '../api/content';
import { getMalAnime, getMalEpisodes, getMalEpisodeDetail, type MalAnime, type MalEpisode, type MalEpisodeDetail } from '../api/mal';
import { ANIVAULT_WEB_BASE } from '../api/client';
import { fonts } from '../theme';

const RANGE_SIZE = 50;

export default function WatchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
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
  const [autoPlay, setAutoPlay] = useState(false);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [selectedRangeIndex, setSelectedRangeIndex] = useState(0);
  const [episodeDetail, setEpisodeDetail] = useState<MalEpisodeDetail | null>(null);
  const [episodeDetailLoading, setEpisodeDetailLoading] = useState(false);

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
  const currentEpisodeData = useMemo(
    () => episodes.find((item) => Number(item.number) === episode),
    [episodes, episode],
  );
  const currentEpisodeDetail = episodeDetail?.number === episode ? episodeDetail : null;
  const currentEpisodeTitle = currentEpisodeData?.title || currentEpisodeDetail?.title;
  const currentEpisodeAired = currentEpisodeData?.aired || currentEpisodeDetail?.aired;
  const currentEpisodeSynopsis = currentEpisodeData?.synopsis || currentEpisodeDetail?.synopsis;
  const airedLabel = currentEpisodeAired ? String(currentEpisodeAired).slice(0, 10) : null;

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

  useEffect(() => {
    setSynopsisExpanded(false);
    setEpisodeDetail(null);
  }, [episode]);

  useEffect(() => {
    setSelectedRangeIndex(Math.floor((episode - 1) / RANGE_SIZE));
  }, [episode]);

  // The bulk episode list never carries synopsis, and can be missing title/aired
  // for very recently-aired episodes. Fetch the single-episode detail on demand
  // once the user actually wants to see it, instead of doing this for every row.
  useEffect(() => {
    if (!malId) return;
    const needsDetail = synopsisExpanded ? !currentEpisodeData?.synopsis : (!currentEpisodeData?.title || !currentEpisodeData?.aired);
    if (!needsDetail) return;
    if (episodeDetail?.number === episode || episodeDetailLoading) return;

    let cancelled = false;
    setEpisodeDetailLoading(true);
    getMalEpisodeDetail(malId, episode)
      .then((detail) => { if (!cancelled) setEpisodeDetail(detail); })
      .finally(() => { if (!cancelled) setEpisodeDetailLoading(false); });

    return () => { cancelled = true; };
  }, [synopsisExpanded, malId, episode, currentEpisodeData?.synopsis, currentEpisodeData?.title, currentEpisodeData?.aired, episodeDetail, episodeDetailLoading]);

  const episodeRows = useMemo(() => {
    const byNumber = new Map(episodes.map((item) => [Number(item.number), item]));
    return Array.from({ length: totalEpisodes }, (_, index) => ({
      num: index + 1,
      data: byNumber.get(index + 1),
    }));
  }, [episodes, totalEpisodes]);

  const ranges = useMemo(() => {
    const count = Math.max(1, Math.ceil(totalEpisodes / RANGE_SIZE));
    return Array.from({ length: count }, (_, i) => ({
      start: i * RANGE_SIZE + 1,
      end: Math.min((i + 1) * RANGE_SIZE, totalEpisodes),
    }));
  }, [totalEpisodes]);

  const activeRangeIndex = Math.min(selectedRangeIndex, ranges.length - 1);
  const visibleEpisodeRows = useMemo(() => {
    const r = ranges[activeRangeIndex] || ranges[0];
    return episodeRows.slice(r.start - 1, r.end);
  }, [episodeRows, ranges, activeRangeIndex]);

  const directUrl = playback?.hlsProxyUrl || playback?.m3u8 || playback?.videoUrl || playback?.streamUrl || playback?.url || null;
  const isHls = Boolean(directUrl && (playback?.hlsProxyUrl || playback?.m3u8 || directUrl.includes('.m3u8')));
  const selectEpisode = (next: number) => {
    if (next >= 1 && next <= totalEpisodes) setEpisode(next);
  };

  const onShare = async () => {
    try {
      await Share.share({
        message: `Watch ${title} - Episode ${episode} on AniVault\n${ANIVAULT_WEB_BASE}/pages/watch.php?id=${malId}&ep=${episode}`,
      });
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  };

  const onDownload = (num: number) => {
    if (num === episode && directUrl) {
      Linking.openURL(directUrl).catch(() => {
        Alert.alert('Download unavailable', 'Could not open a download link for this episode.');
      });
      return;
    }
    selectEpisode(num);
    Alert.alert('Preparing episode', `Loading episode ${num}. Tap download again once it starts playing.`);
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

    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>html,body{margin:0;width:100%;height:100%;background:#000;overflow:hidden}video{width:100%;height:100%;background:#000;object-fit:contain}</style></head><body><video id="v" controls playsinline webkit-playsinline preload="auto"${isHls ? '' : ` src="${htmlUrl}"`}></video>${hlsScript}<script>(function(){const v=document.getElementById('v'),src=${jsUrl};function post(m){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(m)}function ready(){post('READY')}function fail(e){post('ERROR:'+((e&&e.message)||'Playback failed'))}v.addEventListener('error',()=>fail(v.error));v.addEventListener('ended',()=>post('ENDED'));${setup}})();</script></body></html>`;
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
    if (message === 'ENDED' && autoPlay) {
      selectEpisode(episode + 1);
    }
  };

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

      <View style={styles.titleBlock}>
        <Text style={styles.mainTitle} numberOfLines={2}>{title}</Text>
        {!!currentEpisodeTitle && currentEpisodeTitle !== `Episode ${episode}` && (
          <Text style={styles.episodeTitleText} numberOfLines={2}>{currentEpisodeTitle}</Text>
        )}
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Episode {episode}{airedLabel ? ` • ${airedLabel}` : ''}</Text>
          <Pressable onPress={() => setSynopsisExpanded((v) => !v)} hitSlop={8}>
            <Text style={styles.moreLink}>{synopsisExpanded ? 'less' : '...more'}</Text>
          </Pressable>
        </View>
        {synopsisExpanded && (
          <Text style={styles.episodeSynopsis}>
            {episodeDetailLoading
              ? 'Loading synopsis…'
              : currentEpisodeSynopsis || anime?.synopsis || 'No synopsis available for this episode yet.'}
          </Text>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionRow}>
        <View style={styles.langGroup}>
          <Pressable onPress={() => setLanguage('sub')} style={[styles.langPill, language === 'sub' && styles.langPillActive]}>
            <Text style={[styles.langPillText, language === 'sub' && styles.langPillTextActive]}>SUB</Text>
          </Pressable>
          <Pressable onPress={() => setLanguage('dub')} style={[styles.langPill, language === 'dub' && styles.langPillActive]}>
            <Text style={[styles.langPillText, language === 'dub' && styles.langPillTextActive]}>DUB</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => setAutoPlay((v) => !v)} style={[styles.actionPill, autoPlay && styles.actionPillActive]}>
          <Ionicons name={autoPlay ? 'checkmark-circle' : 'ellipse-outline'} size={15} color={autoPlay ? '#000' : 'rgba(255,255,255,.75)'} />
          <Text style={[styles.actionPillText, autoPlay && styles.actionPillTextActive]}>AutoPlay</Text>
        </Pressable>

        <Pressable
          onPress={() => selectEpisode(episode + 1)}
          disabled={episode >= totalEpisodes}
          style={[styles.actionPill, episode >= totalEpisodes && styles.disabled]}
        >
          <Ionicons name="play" size={13} color="rgba(255,255,255,.75)" />
          <Text style={styles.actionPillText}>Next</Text>
        </Pressable>

        <Pressable onPress={onShare} style={styles.actionPill}>
          <Ionicons name="share-social-outline" size={14} color="rgba(255,255,255,.75)" />
          <Text style={styles.actionPillText}>Share</Text>
        </Pressable>

        <Pressable onPress={() => onDownload(episode)} style={styles.actionPill}>
          <Ionicons name="download-outline" size={15} color="rgba(255,255,255,.75)" />
          <Text style={styles.actionPillText}>Download</Text>
        </Pressable>
      </ScrollView>

      {ranges.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rangeRow}>
          {ranges.map((r, idx) => (
            <Pressable
              key={`${r.start}-${r.end}`}
              onPress={() => setSelectedRangeIndex(idx)}
              style={[styles.rangePill, idx === activeRangeIndex && styles.rangePillActive]}
            >
              <Text style={[styles.rangePillText, idx === activeRangeIndex && styles.rangePillTextActive]}>{r.start}-{r.end}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <View style={styles.episodeList}>
        {visibleEpisodeRows.map(({ num, data }) => {
          const image = thumbnails[num] || poster;
          const selected = episode === num;
          const detail = selected ? currentEpisodeDetail : null;
          const rowTitle = data?.title || detail?.title || `Episode ${num}`;
          const rowAired = data?.aired || detail?.aired;
          const aired = rowAired ? String(rowAired).slice(0, 10) : null;
          return (
            <Pressable
              key={num}
              onPress={() => selectEpisode(num)}
              style={[styles.episodeListRow, selected && styles.episodeListRowActive]}
            >
              <View style={styles.listThumbWrap}>
                {image ? <Image source={{ uri: image }} style={styles.listThumb} contentFit="cover" /> : <View style={styles.listThumbFallback} />}
                <View style={styles.listPlayMark}><Ionicons name="play" size={11} color="#fff" /></View>
              </View>
              <View style={styles.listCopy}>
                <Text style={styles.listTitle} numberOfLines={2}>{rowTitle}</Text>
                <View style={styles.listMetaRow}>
                  <View style={styles.listBadge}><Text style={styles.listBadgeText}>E{num}</Text></View>
                  {aired ? <Text style={styles.listDate}>{aired}</Text> : null}
                </View>
              </View>
              <Pressable onPress={() => onDownload(num)} hitSlop={10} style={styles.listDownload}>
                <Ionicons name="download-outline" size={18} color="rgba(255,255,255,.4)" />
              </Pressable>
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

  titleBlock: { paddingHorizontal: 16, paddingTop: 14 },
  mainTitle: { color: '#fff', fontSize: 21, lineHeight: 26, fontWeight: '800', fontFamily: fonts.bodyBold },
  episodeTitleText: { color: 'rgba(255,255,255,.7)', fontSize: 13, lineHeight: 18, marginTop: 4, fontFamily: fonts.bodyMedium },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  metaText: { color: 'rgba(255,255,255,.5)', fontSize: 12, fontFamily: fonts.body },
  moreLink: { color: 'rgba(255,255,255,.85)', fontSize: 12, fontWeight: '800', marginLeft: 6, fontFamily: fonts.bodySemibold },
  episodeSynopsis: { color: 'rgba(255,255,255,.55)', fontSize: 12, lineHeight: 18, marginTop: 10 },

  actionRow: { paddingHorizontal: 16, paddingTop: 14, alignItems: 'center', gap: 8 },
  langGroup: { flexDirection: 'row', backgroundColor: '#101014', borderRadius: 20, padding: 3, marginRight: 2 },
  langPill: { height: 32, paddingHorizontal: 16, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  langPillActive: { backgroundColor: '#fff' },
  langPillText: { color: 'rgba(255,255,255,.55)', fontSize: 11, fontWeight: '900', letterSpacing: .3 },
  langPillTextActive: { color: '#000' },
  actionPill: { height: 38, paddingHorizontal: 14, borderRadius: 19, backgroundColor: '#101014', borderWidth: 1, borderColor: 'rgba(255,255,255,.07)', flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionPillActive: { backgroundColor: '#fff', borderColor: '#fff' },
  actionPillText: { color: 'rgba(255,255,255,.75)', fontSize: 11, fontWeight: '800' },
  actionPillTextActive: { color: '#000' },
  disabled: { opacity: .35 },

  rangeRow: { paddingHorizontal: 16, paddingTop: 14, alignItems: 'center', gap: 8 },
  rangePill: { height: 34, paddingHorizontal: 16, borderRadius: 17, backgroundColor: '#101014', borderWidth: 1, borderColor: 'rgba(255,255,255,.07)', alignItems: 'center', justifyContent: 'center' },
  rangePillActive: { backgroundColor: 'transparent', borderColor: '#fff', borderWidth: 1.5 },
  rangePillText: { color: 'rgba(255,255,255,.6)', fontSize: 12, fontWeight: '800' },
  rangePillTextActive: { color: '#fff' },

  episodeList: { marginTop: 16 },
  episodeListRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,.06)' },
  episodeListRowActive: { backgroundColor: 'rgba(255,255,255,.05)' },
  listThumbWrap: { width: 100, height: 100, borderRadius: 9, overflow: 'hidden', backgroundColor: '#15151a', position: 'relative' },
  listThumb: { width: '100%', height: '100%' },
  listThumbFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: '#15151a' },
  listPlayMark: { position: 'absolute', left: 7, bottom: 7 },
  listCopy: { flex: 1 },
  listTitle: { color: '#fff', fontSize: 14, lineHeight: 19, fontWeight: '700', fontFamily: fonts.bodySemibold },
  listMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  listBadge: { height: 20, paddingHorizontal: 7, borderRadius: 5, backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center' },
  listBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  listDate: { color: 'rgba(255,255,255,.4)', fontSize: 11, fontFamily: fonts.body },
  listDownload: { paddingLeft: 4 },

  sectionTitle: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: .8 },
  about: { marginHorizontal: 16, marginTop: 22, paddingTop: 18, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.08)' },
  synopsis: { color: 'rgba(255,255,255,.5)', fontSize: 11, lineHeight: 18, marginTop: 10 },
});
