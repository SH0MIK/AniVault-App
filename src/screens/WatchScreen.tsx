import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, NativeModules, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getAnimeDetail, getEpisodes, EpisodeItem } from '../api/content';
import { resolveStream, NativeStream } from '../api/stream';
import { downloadEpisode, getDownload } from '../db/downloads';
import { colors, fonts, radius } from '../theme';
import { GlassCard, SectionTitle } from '../components/AniVaultUI';

const DISCORD_APP_ID = '1505538731791093820';

export default function WatchScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { animeId, episodeNum, title: routeTitle } = route.params as { animeId: number; episodeNum: number; title?: string };
  const video = useRef<Video>(null);
  const [anime, setAnime] = useState<any>(null);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [stream, setStream] = useState<NativeStream | null>(null);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audio, setAudio] = useState<'sub' | 'dub'>('sub');
  const [server, setServer] = useState('');

  const currentEpisode = useMemo(() => episodes.find((e) => Number(e.episode) === Number(episodeNum)), [episodes, episodeNum]);
  const displayTitle = anime?.title ?? routeTitle ?? 'AniVault';
  const remoteSource = stream?.m3u8 ?? stream?.mp4 ?? null;
  const source = localUri ?? remoteSource;
  const canDownload = !!stream?.mp4 && !localUri;

  const load = useCallback(async () => {
    setLoading(true); setError(null); setStream(null); setLocalUri(null);
    try {
      const cachedDownload = getDownload(animeId, episodeNum);
      if (cachedDownload) {
        setLocalUri(cachedDownload.local_uri);
      }
      const [detail, eps, resolved] = await Promise.all([
        getAnimeDetail(animeId),
        getEpisodes(animeId),
        resolveStream(animeId, episodeNum, audio, server),
      ]);
      setAnime(detail.anime); setEpisodes(eps.data ?? []); setStream(resolved);
      if (!server) setServer(resolved.server ?? resolved.servers?.[0]?.name ?? '');
    } catch (e: any) { setError(e?.message ?? 'Unable to resolve a playable source.'); }
    finally { setLoading(false); }
  }, [animeId, episodeNum, audio]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const rpc = NativeModules.AniVaultDiscordPresence;
    if (!rpc) return;
    try {
      rpc.start?.(DISCORD_APP_ID);
      rpc.update?.(JSON.stringify({ event: playing ? 'playing' : 'paused', title: displayTitle, episode: episodeNum, episodeTitle: currentEpisode?.title ?? '', image: anime?.image ?? '', currentTime: position / 1000, duration: duration / 1000, playing, url: `https://www.anivault.co/watch?id=${animeId}&ep=${episodeNum}` }));
    } catch {}
  }, [animeId, episodeNum, displayTitle, currentEpisode?.title, anime?.image, position, duration, playing]);

  useEffect(() => () => { try { NativeModules.AniVaultDiscordPresence?.clear?.(); NativeModules.AniVaultDiscordPresence?.close?.(); } catch {} }, []);

  const onStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setPlaying(status.isPlaying);
    setPosition(status.positionMillis);
    setDuration(status.durationMillis ?? 0);
  };

  const playEpisode = (ep: number) => navigation.replace('Watch', { animeId, episodeNum: ep, title: displayTitle });

  const startDownload = async () => {
    if (!stream?.mp4 || downloading || localUri) return;
    setDownloading(true); setDownloadProgress(0);
    try {
      const record = await downloadEpisode({ animeId, episodeNum, animeTitle: displayTitle, episodeTitle: currentEpisode?.title, image: anime?.image, sourceUri: stream.mp4, onProgress: setDownloadProgress });
      setLocalUri(record.local_uri);
    } catch (e: any) {
      setError(e?.message ?? 'Offline download failed.');
    } finally { setDownloading(false); }
  };

  return (
    <View style={styles.root}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>‹</Text></Pressable>
        <View style={styles.topTitle}><Text style={styles.brand}>ANIVAULT</Text><Text style={styles.episodeLabel}>EP {episodeNum}</Text></View>
        <Pressable onPress={() => navigation.navigate('AnimeDetail', { id: animeId, title: displayTitle })}><Text style={styles.info}>ⓘ</Text></Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.playerShell}>
          {source ? <Video ref={video} style={styles.video} source={{ uri: source }} useNativeControls resizeMode={ResizeMode.CONTAIN} shouldPlay onPlaybackStatusUpdate={onStatus} /> : (
            <View style={styles.playerEmpty}>{loading ? <ActivityIndicator color={colors.accent} size="large" /> : <><Text style={styles.errorTitle}>NO PLAYABLE SOURCE</Text><Text style={styles.errorText}>{error}</Text><Pressable onPress={load} style={styles.retry}><Text style={styles.retryText}>RETRY</Text></Pressable></>}</View>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.watchTitle}>{displayTitle}</Text>
          <Text style={styles.watchMeta}>Episode {episodeNum}{currentEpisode?.title ? ` · ${currentEpisode.title}` : ''}{localUri ? ' · OFFLINE' : ''}</Text>

          <View style={styles.actionRow}>
            {canDownload && <Pressable onPress={startDownload} disabled={downloading} style={styles.downloadBtn}>
              {downloading ? <Text style={styles.downloadText}>{Math.round(downloadProgress * 100)}%</Text> : <Text style={styles.downloadText}>↓ DOWNLOAD</Text>}
            </Pressable>}
            {localUri && <View style={styles.offlineBadge}><Text style={styles.offlineText}>✓ SAVED OFFLINE</Text></View>}
          </View>

          <View style={styles.modeRow}>
            <Text style={styles.modeLabel}>AUDIO</Text>
            {(['sub', 'dub'] as const).map((value) => <Pressable key={value} onPress={() => setAudio(value)} style={[styles.modeChip, audio === value && styles.modeChipActive]}><Text style={[styles.modeText, audio === value && styles.modeTextActive]}>{value.toUpperCase()}</Text></Pressable>)}
          </View>

          {stream?.servers && stream.servers.length > 0 && <>
            <SectionTitle>Servers</SectionTitle>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serverRow}>
              {stream.servers.map((item) => <Pressable key={`${item.name}-${item.type}`} onPress={async () => { try { setLoading(true); setLocalUri(null); const next = await resolveStream(animeId, episodeNum, audio, item.name); setStream(next); setServer(item.name); } catch (e: any) { setError(e?.message ?? 'Server failed.'); } finally { setLoading(false); } }} style={[styles.serverChip, server === item.name && styles.serverActive]}><Text style={[styles.serverText, server === item.name && styles.serverTextActive]}>{item.name}</Text></Pressable>)}
            </ScrollView>
          </>}

          <SectionTitle>Episodes</SectionTitle>
          <View style={styles.episodeGrid}>
            {episodes.map((ep) => { const n = Number(ep.episode); const active = n === Number(episodeNum); return <Pressable key={n} onPress={() => playEpisode(n)} style={[styles.epButton, active && styles.epButtonActive]}><Text style={[styles.epNumber, active && styles.epNumberActive]}>{n}</Text>{ep.title ? <Text style={styles.epTitle} numberOfLines={1}>{ep.title}</Text> : null}</Pressable>; })}
          </View>

          {anime?.synopsis ? <GlassCard style={styles.synopsis}><Text style={styles.synopsisLabel}>ABOUT</Text><Text style={styles.synopsisText}>{anime.synopsis}</Text></GlassCard> : null}
          <View style={{ height: 32 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase },
  topbar: { height: 58, paddingHorizontal: 14, backgroundColor: colors.bgSurface, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { color: colors.textPrimary, fontSize: 36, lineHeight: 38 },
  topTitle: { flex: 1, marginLeft: 10 },
  brand: { color: colors.accent, fontFamily: fonts.display, fontSize: 14, letterSpacing: 1.2 },
  episodeLabel: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: 10, marginTop: 1 },
  info: { color: colors.textSecondary, fontSize: 22 },
  playerShell: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  video: { width: '100%', height: '100%' },
  playerEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 25 },
  errorTitle: { color: colors.accent, fontFamily: fonts.displayMedium, fontSize: 12, letterSpacing: 1 },
  errorText: { color: colors.textMuted, fontFamily: fonts.body, textAlign: 'center', fontSize: 12, marginTop: 8 },
  retry: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 9, borderRadius: radius.sm, backgroundColor: colors.accent },
  retryText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 11 },
  body: { paddingHorizontal: 16 },
  watchTitle: { color: colors.textPrimary, fontFamily: fonts.displayMedium, fontSize: 18, marginTop: 18 },
  watchMeta: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: 12, marginTop: 4 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  downloadBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.accent },
  downloadText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 10 },
  offlineBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.accentDim, borderWidth: 1, borderColor: colors.borderAccent },
  offlineText: { color: colors.textPrimary, fontFamily: fonts.bodyBold, fontSize: 10 },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14 },
  modeLabel: { color: colors.textMuted, fontFamily: fonts.displayMedium, fontSize: 9, letterSpacing: 1 },
  modeChip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard },
  modeChipActive: { borderColor: colors.borderAccent, backgroundColor: colors.accentDim },
  modeText: { color: colors.textMuted, fontFamily: fonts.bodyBold, fontSize: 10 },
  modeTextActive: { color: '#fff' },
  serverRow: { paddingHorizontal: 2, gap: 8 },
  serverChip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  serverActive: { backgroundColor: colors.accentDim, borderColor: colors.borderAccent },
  serverText: { color: colors.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 11 },
  serverTextActive: { color: '#fff' },
  episodeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  epButton: { width: 72, minHeight: 42, paddingHorizontal: 7, paddingVertical: 7, borderRadius: radius.sm, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  epButtonActive: { backgroundColor: colors.accentDim, borderColor: colors.borderAccent },
  epNumber: { color: colors.textPrimary, fontFamily: fonts.bodyBold, fontSize: 12 },
  epNumberActive: { color: '#fff' },
  epTitle: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 8, marginTop: 2 },
  synopsis: { marginTop: 20, padding: 14 },
  synopsisLabel: { color: colors.accent, fontFamily: fonts.displayMedium, fontSize: 10, letterSpacing: 1.3, marginBottom: 7 },
  synopsisText: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: 12, lineHeight: 18 },
});
