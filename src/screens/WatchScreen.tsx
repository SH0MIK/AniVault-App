import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getAnimeDetail, getEpisodes, getEpisodeThumbnails, getPlayback, type AnimeDetail, type EpisodeItem, type EpisodeThumbnail, type PlaybackResult } from '../api/content';
import { ANIVAULT_WEB_BASE } from '../api/client';
import { fonts } from '../theme';

const RANGE_SIZE = 50;

function episodeNumber(item: EpisodeItem, fallback: number): number {
  const value = Number(item.episode ?? item.mal_id ?? fallback);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const raw = String(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  return raw.length > 10 ? raw.slice(0, 10) : raw;
}

export default function WatchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { animeId, episodeNum: initialEpisode, title: routeTitle } = route.params as { animeId: number; episodeNum: number; title?: string };

  const [anime, setAnime] = useState<AnimeDetail | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
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

  useEffect(() => {
    let cancelled = false;
    const id = Number(animeId);
    setLoading(true);
    setAnime(null);
    setEpisodes([]);
    setThumbnails({});
    setThumbnailTotal(0);

    (async () => {
      try {
        const detailPromise = getAnimeDetail(id);
        const thumbsPromise = getEpisodeThumbnails(id).catch(() => ({ success: false, overrides: [] as EpisodeThumbnail[], total_eps: 0 }));
        const detail = await detailPromise;
        if (cancelled) return;
        setAnime(detail.anime);

        // The watch page uses the exact same AniVault episode endpoint as AnimeDetailScreen.
        const collected: EpisodeItem[] = [];
        let page = 1;
        while (page <= 20) {
          const response = await getEpisodes(id, page);
          if (cancelled) return;
          const batch = response.data ?? [];
          collected.push(...batch);
          const pagination = response.pagination ?? {};
          if (!pagination.has_next_page && !pagination.next_page && !(pagination.current_page && pagination.last_page && pagination.current_page < pagination.last_page)) break;
          if (!batch.length) break;
          page += 1;
        }
        setEpisodes(collected);

        const thumbs = await thumbsPromise;
        if (cancelled) return;
        const map: Record<number, string> = {};
        for (const item of thumbs.overrides ?? []) {
          const n = Number(item.episode_num);
          if (n > 0 && item.image_url) map[n] = item.image_url;
        }
        setThumbnails(map);
        setThumbnailTotal(Number(thumbs.total_eps) || 0);
      } catch {
        if (cancelled) return;
        setAnime({ id, title: routeTitle || 'Watching', titleJapanese: null, image: '', synopsis: '', score: null, status: '', type: 'TV', genres: [], totalEpisodes: 0, airedSoFar: null, isAiring: false, dubbedLangs: [], related: [] });
        setEpisodes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [animeId, routeTitle]);

  const id = Number(anime?.id ?? animeId);
  const episodeNumbers = episodes.map((item, index) => episodeNumber(item, index + 1)).filter((n) => n > 0);
  const episodeMax = episodeNumbers.length ? Math.max(...episodeNumbers) : 0;
  const totalEpisodes = Math.max(1, Number(anime?.totalEpisodes) || 0, episodeMax, thumbnailTotal, episode);
  const title = anime?.title || routeTitle || 'Watching';
  const poster = anime?.image || thumbnails[1] || Object.values(thumbnails)[0] || undefined;

  const episodeMap = useMemo(() => {
    const map = new Map<number, EpisodeItem>();
    episodes.forEach((item, index) => map.set(episodeNumber(item, index + 1), item));
    return map;
  }, [episodes]);
  const currentEpisodeData = episodeMap.get(episode);
  const currentTitle = currentEpisodeData?.title || `Episode ${episode}`;
  const currentSynopsis = typeof currentEpisodeData?.synopsis === 'string' ? currentEpisodeData.synopsis : '';
  const currentAired = formatDate(currentEpisodeData?.aired);

  useEffect(() => {
    let cancelled = false;
    setSynopsisExpanded(false);
    setSelectedRangeIndex(Math.floor((episode - 1) / RANGE_SIZE));
    if (!id) return;
    setPlayback(null);
    setPlayerLoading(true);
    setPlayerError(null);
    (async () => {
      try {
        const result = await getPlayback(id, episode, language);
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
  }, [id, episode, language, retryNonce]);

  const episodeRows = useMemo(() => Array.from({ length: totalEpisodes }, (_, index) => ({ num: index + 1, data: episodeMap.get(index + 1) })), [totalEpisodes, episodeMap]);
  const ranges = useMemo(() => Array.from({ length: Math.max(1, Math.ceil(totalEpisodes / RANGE_SIZE)) }, (_, i) => ({ start: i * RANGE_SIZE + 1, end: Math.min((i + 1) * RANGE_SIZE, totalEpisodes) })), [totalEpisodes]);
  const activeRangeIndex = Math.min(selectedRangeIndex, ranges.length - 1);
  const visibleEpisodes = episodeRows.slice(ranges[activeRangeIndex].start - 1, ranges[activeRangeIndex].end);

  const directUrl = playback?.hlsProxyUrl || playback?.m3u8 || playback?.videoUrl || playback?.streamUrl || playback?.url || null;
  const isHls = Boolean(directUrl && (playback?.hlsProxyUrl || playback?.m3u8 || directUrl.includes('.m3u8')));
  const selectEpisode = (next: number) => { if (next >= 1 && next <= totalEpisodes) setEpisode(next); };

  const onShare = async () => {
    try { await Share.share({ message: `Watch ${title} - Episode ${episode} on AniVault\n${ANIVAULT_WEB_BASE}/pages/watch.php?id=${id}&ep=${episode}` }); } catch {}
  };
  const onDownload = (num: number) => {
    if (num === episode && directUrl) {
      Linking.openURL(directUrl).catch(() => Alert.alert('Download unavailable', 'Could not open a download link for this episode.'));
      return;
    }
    selectEpisode(num);
    Alert.alert('Preparing episode', `Loading episode ${num}. Tap download again once it starts playing.`);
  };

  const playerHtml = useMemo(() => {
    if (!directUrl && !playback?.embedUrl) return '';
    if (!directUrl && playback?.embedUrl) return `<!doctype html><html><body style="margin:0;background:#000;overflow:hidden"><iframe src="${escapeHtml(playback.embedUrl)}" style="width:100vw;height:100vh;border:0" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen></iframe></body></html>`;
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
    if (message === 'READY') { setPlayerLoading(false); setPlayerError(null); }
    if (message.startsWith('ERROR:')) { setPlayerLoading(false); setPlayerError(message.slice(6) || 'Playback failed.'); }
    if (message === 'ENDED' && autoPlay) selectEpisode(episode + 1);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#fff" /><Text style={styles.loadingText}>Loading…</Text></View>;

  return <View style={styles.container}>
    <View style={styles.topBar}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={8}><Ionicons name="arrow-back" size={23} color="#fff" /></Pressable>
      <View style={styles.topInfo}><Text style={styles.topTitle} numberOfLines={1}>{title}</Text><Text style={styles.topSub}>EPISODE {episode} · {language === 'sub' ? 'SUB' : 'DUB'}</Text></View>
      <View style={styles.liveDot} />
    </View>

    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.playerShell}>
        {playerError ? <View style={styles.playerError}><Ionicons name="cloud-offline-outline" size={28} color="#fff" /><Text style={styles.errorTitle}>STREAM UNAVAILABLE</Text><Text style={styles.errorText} numberOfLines={2}>{playerError}</Text><Pressable onPress={() => setRetryNonce((n) => n + 1)} style={styles.retryButton}><Ionicons name="refresh" size={14} color="#000" /><Text style={styles.retryText}>RETRY</Text></Pressable></View> : playback ? <WebView key={`${episode}-${language}-${retryNonce}-${directUrl || playback.embedUrl}`} source={{ html: playerHtml, baseUrl: 'https://www.anivault.co/' }} style={styles.webview} javaScriptEnabled domStorageEnabled allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false} allowsFullscreenVideo mixedContentMode="always" originWhitelist={['http://*', 'https://*']} onMessage={onWebMessage} onLoadEnd={() => setPlayerLoading(false)} onError={() => { setPlayerLoading(false); setPlayerError('The video player failed to load.'); }} /> : null}
        {playerLoading && !playerError && <View style={styles.playerLoader} pointerEvents="none"><ActivityIndicator color="#fff" /><Text style={styles.playerLoaderText}>Loading stream…</Text></View>}
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.episodeTitleText} numberOfLines={2}>{currentTitle}</Text>
        <Text style={styles.mainTitle} numberOfLines={1}>{title}</Text>
        <View style={styles.metaRow}><Text style={styles.metaText}>E{episode}{currentAired ? ` • ${currentAired}` : ''}</Text><Pressable onPress={() => setSynopsisExpanded((v) => !v)} hitSlop={8}><Text style={styles.moreLink}>{synopsisExpanded ? 'less' : '...more'}</Text></Pressable></View>
        {synopsisExpanded && <Text style={styles.episodeSynopsis}>{currentSynopsis || anime?.synopsis || 'No synopsis available for this episode.'}</Text>}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionRow}>
        <View style={styles.langGroup}><Pressable onPress={() => setLanguage('sub')} style={[styles.langPill, language === 'sub' && styles.langPillActive]}><Text style={[styles.langPillText, language === 'sub' && styles.langPillTextActive]}>SUB</Text></Pressable><Pressable onPress={() => setLanguage('dub')} style={[styles.langPill, language === 'dub' && styles.langPillActive]}><Text style={[styles.langPillText, language === 'dub' && styles.langPillTextActive]}>DUB</Text></Pressable></View>
        <Pressable onPress={() => setAutoPlay((v) => !v)} style={[styles.actionPill, autoPlay && styles.actionPillActive]}><Ionicons name={autoPlay ? 'checkmark-circle' : 'ellipse-outline'} size={15} color={autoPlay ? '#000' : 'rgba(255,255,255,.75)'} /><Text style={[styles.actionPillText, autoPlay && styles.actionPillTextActive]}>AutoPlay</Text></Pressable>
        <Pressable onPress={() => selectEpisode(episode + 1)} disabled={episode >= totalEpisodes} style={[styles.actionPill, episode >= totalEpisodes && styles.disabled]}><Ionicons name="play" size={13} color="rgba(255,255,255,.75)" /><Text style={styles.actionPillText}>Next</Text></Pressable>
        <Pressable onPress={onShare} style={styles.actionPill}><Ionicons name="share-social-outline" size={14} color="rgba(255,255,255,.75)" /><Text style={styles.actionPillText}>Share</Text></Pressable>
        <Pressable onPress={() => onDownload(episode)} style={styles.actionPill}><Ionicons name="download-outline" size={15} color="rgba(255,255,255,.75)" /><Text style={styles.actionPillText}>Download</Text></Pressable>
      </ScrollView>

      {ranges.length > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rangeRow}>{ranges.map((r, idx) => <Pressable key={`${r.start}-${r.end}`} onPress={() => setSelectedRangeIndex(idx)} style={[styles.rangePill, idx === activeRangeIndex && styles.rangePillActive]}><Text style={[styles.rangePillText, idx === activeRangeIndex && styles.rangePillTextActive]}>{r.start}-{r.end}</Text></Pressable>)}</ScrollView>}

      <View style={styles.episodeList}>
        {visibleEpisodes.map(({ num, data }) => {
          const image = thumbnails[num] || poster;
          const selected = episode === num;
          const rowTitle = data?.title || `Episode ${num}`;
          const rowAired = formatDate(data?.aired);
          const rowSynopsis = typeof data?.synopsis === 'string' ? data.synopsis : '';
          return <Pressable key={num} onPress={() => selectEpisode(num)} style={[styles.episodeListRow, selected && styles.episodeListRowActive]}>
            <View style={styles.listThumbWrap}>{image ? <Image source={{ uri: image }} style={styles.listThumb} contentFit="cover" transition={120} /> : <View style={styles.listThumbFallback} />}<View style={styles.listPlayMark}><Ionicons name="play" size={11} color="#fff" /></View><View style={styles.imageEpisodeBadge}><Text style={styles.imageEpisodeText}>E{num}</Text></View></View>
            <View style={styles.listCopy}><Text style={styles.listTitle} numberOfLines={1}>{rowTitle}</Text><View style={styles.listMetaRow}><View style={styles.listBadge}><Text style={styles.listBadgeText}>E{num}</Text></View>{rowAired ? <Text style={styles.listDate}>{rowAired}</Text> : null}</View>{rowSynopsis ? <Text style={styles.listSynopsis} numberOfLines={1}>{rowSynopsis}</Text> : null}</View>
            <Pressable onPress={() => onDownload(num)} hitSlop={10} style={styles.listDownload}><Ionicons name="download-outline" size={18} color="rgba(255,255,255,.4)" /></Pressable>
          </Pressable>;
        })}
      </View>

      {!!anime?.synopsis && <View style={styles.about}><Text style={styles.sectionTitle}>ABOUT THIS ANIME</Text><Text style={styles.synopsis}>{anime.synopsis}</Text></View>}
    </ScrollView>
  </View>;
}

function escapeHtml(value: string): string { return value.replace(/&/g, '&amp;').replace(/\"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: 'rgba(255,255,255,.55)', marginTop: 9, fontSize: 11, fontFamily: fonts.bodyMedium },
  topBar: { height: 58, backgroundColor: '#09090c', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,.08)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  backButton: { width: 38, height: 38, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.06)' },
  topInfo: { flex: 1, marginLeft: 11 }, topTitle: { color: '#fff', fontSize: 14, fontWeight: '800', fontFamily: fonts.bodyBold }, topSub: { color: 'rgba(255,255,255,.42)', fontSize: 9, marginTop: 3, letterSpacing: .7, fontWeight: '700' }, liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff', marginRight: 4 },
  scroll: { flex: 1 }, content: { paddingBottom: 36 }, playerShell: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' }, webview: { flex: 1, backgroundColor: '#000' }, playerLoader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }, playerLoaderText: { color: 'rgba(255,255,255,.45)', fontSize: 10, marginTop: 8 }, playerError: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, backgroundColor: '#000' }, errorTitle: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: 8 }, errorText: { color: 'rgba(255,255,255,.48)', fontSize: 9, textAlign: 'center', marginTop: 6 }, retryButton: { height: 32, paddingHorizontal: 14, borderRadius: 7, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', marginTop: 13 }, retryText: { color: '#000', fontSize: 9, fontWeight: '900', marginLeft: 6 },
  titleBlock: { paddingHorizontal: 16, paddingTop: 13 }, episodeTitleText: { color: '#fff', fontSize: 18, lineHeight: 23, fontWeight: '800', fontFamily: fonts.bodyBold }, mainTitle: { color: 'rgba(255,255,255,.58)', fontSize: 12, lineHeight: 16, marginTop: 2, fontFamily: fonts.bodyMedium }, metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 }, metaText: { color: 'rgba(255,255,255,.5)', fontSize: 11, fontFamily: fonts.body }, moreLink: { color: 'rgba(255,255,255,.85)', fontSize: 11, fontWeight: '800', marginLeft: 6, fontFamily: fonts.bodySemibold }, episodeSynopsis: { color: 'rgba(255,255,255,.55)', fontSize: 12, lineHeight: 18, marginTop: 10 },
  actionRow: { paddingHorizontal: 16, paddingTop: 14, alignItems: 'center', gap: 8 }, langGroup: { flexDirection: 'row', backgroundColor: '#101014', borderRadius: 20, padding: 3, marginRight: 2 }, langPill: { height: 32, paddingHorizontal: 16, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, langPillActive: { backgroundColor: '#fff' }, langPillText: { color: 'rgba(255,255,255,.55)', fontSize: 11, fontWeight: '900', letterSpacing: .3 }, langPillTextActive: { color: '#000' }, actionPill: { height: 38, paddingHorizontal: 14, borderRadius: 19, backgroundColor: '#101014', borderWidth: 1, borderColor: 'rgba(255,255,255,.07)', flexDirection: 'row', alignItems: 'center', gap: 6 }, actionPillActive: { backgroundColor: '#fff', borderColor: '#fff' }, actionPillText: { color: 'rgba(255,255,255,.75)', fontSize: 11, fontWeight: '800' }, actionPillTextActive: { color: '#000' }, disabled: { opacity: .35 },
  rangeRow: { paddingHorizontal: 16, paddingTop: 14, alignItems: 'center', gap: 8 }, rangePill: { height: 34, paddingHorizontal: 16, borderRadius: 17, backgroundColor: '#101014', borderWidth: 1, borderColor: 'rgba(255,255,255,.07)', alignItems: 'center', justifyContent: 'center' }, rangePillActive: { backgroundColor: 'transparent', borderColor: '#fff', borderWidth: 1.5 }, rangePillText: { color: 'rgba(255,255,255,.6)', fontSize: 12, fontWeight: '800' }, rangePillTextActive: { color: '#fff' },
  episodeList: { marginTop: 16 }, episodeListRow: { minHeight: 82, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,.06)' }, episodeListRowActive: { backgroundColor: 'rgba(255,255,255,.05)' }, listThumbWrap: { width: 88, height: 52, borderRadius: 7, overflow: 'hidden', backgroundColor: '#15151a', position: 'relative' }, listThumb: { width: '100%', height: '100%' }, listThumbFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: '#15151a' }, listPlayMark: { position: 'absolute', left: 6, bottom: 5 }, imageEpisodeBadge: { position: 'absolute', top: 5, left: 5, height: 19, paddingHorizontal: 6, borderRadius: 5, backgroundColor: 'rgba(0,0,0,.75)', alignItems: 'center', justifyContent: 'center' }, imageEpisodeText: { color: '#fff', fontSize: 9, fontWeight: '900' }, listCopy: { flex: 1, minWidth: 0 }, listTitle: { color: '#fff', fontSize: 12, lineHeight: 16, fontWeight: '700', fontFamily: fonts.bodySemibold }, listMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 7 }, listBadge: { height: 19, paddingHorizontal: 6, borderRadius: 5, backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center' }, listBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' }, listDate: { color: 'rgba(255,255,255,.4)', fontSize: 10, fontFamily: fonts.body }, listSynopsis: { color: 'rgba(255,255,255,.4)', fontSize: 9, lineHeight: 13, marginTop: 5 }, listDownload: { paddingLeft: 4 }, sectionTitle: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: .8 }, about: { marginHorizontal: 16, marginTop: 22, paddingTop: 18, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.08)' }, synopsis: { color: 'rgba(255,255,255,.5)', fontSize: 11, lineHeight: 18, marginTop: 10 },
});