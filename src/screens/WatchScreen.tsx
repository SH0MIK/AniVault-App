import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, NativeModules, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { getAnimeDetail, getEpisodes, EpisodeItem } from '../api/content';
import { resolveStream, NativeStream } from '../api/stream';
import { getProgress, saveProgress } from '../db/historyRepo';
import { useAuth } from '../auth/AuthContext';
import { colors, fonts, radius } from '../theme';

const DISCORD_APP_ID = '1505538731791093820';
const AUTO_HIDE_MS = 3200;

const fmt = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};

export default function WatchScreen() {
  const { user } = useAuth();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { animeId, episodeNum, title: routeTitle } = route.params as { animeId: number; episodeNum: number; title?: string };
  const video = useRef<Video>(null);
  const lastSaved = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [anime, setAnime] = useState<any>(null);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [stream, setStream] = useState<NativeStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [resumeAt, setResumeAt] = useState(0);
  const [audio, setAudio] = useState<'sub' | 'dub'>('sub');
  const [server, setServer] = useState('');
  const [controls, setControls] = useState(true);
  const [volume, setVolume] = useState(1);

  const currentEpisode = useMemo(() => episodes.find((e) => Number(e.episode) === Number(episodeNum)), [episodes, episodeNum]);
  const displayTitle = anime?.title ?? routeTitle ?? 'AniVault';
  const source = stream?.m3u8 ?? stream?.mp4 ?? null;

  const showControls = useCallback(() => {
    setControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (playing) hideTimer.current = setTimeout(() => setControls(false), AUTO_HIDE_MS);
  }, [playing]);

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);
  useEffect(() => { if (playing) showControls(); }, [playing, showControls]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStream(null);
    lastSaved.current = 0;
    try {
      const saved = user ? getProgress(user.id, animeId, episodeNum)?.watch_time ?? 0 : 0;
      setResumeAt(saved);
      const [detail, eps, resolved] = await Promise.all([
        getAnimeDetail(animeId),
        getEpisodes(animeId),
        resolveStream(animeId, episodeNum, audio, server),
      ]);
      setAnime(detail.anime);
      setEpisodes(eps.data ?? []);
      setStream(resolved);
      if (!server) setServer(resolved.server ?? resolved.servers?.[0]?.name ?? '');
    } catch (e: any) {
      setError(e?.message ?? 'Unable to resolve a playable source.');
    } finally {
      setLoading(false);
    }
  }, [animeId, episodeNum, audio, server, user?.id]);

  useEffect(() => { load(); }, [load]);

  const persistProgress = useCallback((time: number, total: number) => {
    if (!user || !anime || time < 1) return;
    if (Math.abs(time - lastSaved.current) < 10 && time < total - 5) return;
    lastSaved.current = time;
    saveProgress(user.id, {
      anime_id: animeId,
      anime_title: displayTitle,
      anime_image: anime.image ?? null,
      episode_num: episodeNum,
      ep_title: currentEpisode?.title ?? null,
      ep_thumb: null,
      watch_time: time,
      episode_duration: total,
    });
  }, [user?.id, anime, animeId, episodeNum, displayTitle, currentEpisode?.title]);

  useEffect(() => () => persistProgress(position / 1000, duration / 1000), [persistProgress, position, duration]);

  useEffect(() => {
    const rpc = NativeModules.AniVaultDiscordPresence;
    if (!rpc) return;
    try {
      rpc.start?.(DISCORD_APP_ID);
      rpc.update?.(JSON.stringify({
        event: playing ? 'playing' : 'paused',
        title: displayTitle,
        episode: episodeNum,
        episodeTitle: currentEpisode?.title ?? '',
        image: anime?.image ?? '',
        currentTime: position / 1000,
        duration: duration / 1000,
        playing,
        url: `https://www.anivault.co/watch?id=${animeId}&ep=${episodeNum}`,
      }));
    } catch {}
  }, [animeId, episodeNum, displayTitle, currentEpisode?.title, anime?.image, position, duration, playing]);

  useEffect(() => () => {
    try { NativeModules.AniVaultDiscordPresence?.clear?.(); NativeModules.AniVaultDiscordPresence?.close?.(); } catch {}
  }, []);

  const onStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    const nextPosition = status.positionMillis;
    const nextDuration = status.durationMillis ?? 0;
    setPlaying(status.isPlaying);
    setPosition(nextPosition);
    setDuration(nextDuration);
    setVolume(status.volume ?? volume);
    persistProgress(nextPosition / 1000, nextDuration / 1000);
    if (resumeAt > 0 && nextPosition < 1500) {
      video.current?.setPositionAsync(resumeAt * 1000).catch(() => {});
      setResumeAt(0);
    }
  };

  const togglePlay = async () => {
    if (!video.current) return;
    showControls();
    if (playing) await video.current.pauseAsync(); else await video.current.playAsync();
  };

  const seek = async (deltaSeconds: number) => {
    if (!video.current) return;
    showControls();
    const currentSeconds = position / 1000;
    const durationSeconds = duration / 1000;
    const nextSeconds = Math.max(0, Math.min(durationSeconds || Number.MAX_SAFE_INTEGER, currentSeconds + deltaSeconds));
    await video.current.setPositionAsync(nextSeconds * 1000);
  };

  const seekToPercent = async (percent: number) => {
    if (!video.current || !duration) return;
    const next = Math.max(0, Math.min(1, percent)) * duration;
    await video.current.setPositionAsync(next);
    showControls();
  };

  const toggleMute = async () => {
    const next = volume > 0 ? 0 : 1;
    setVolume(next);
    await video.current?.setVolumeAsync(next);
  };

  const cycleVolume = async () => {
    const next = volume >= 1 ? 0.5 : volume >= 0.5 ? 0.2 : 1;
    setVolume(next);
    await video.current?.setVolumeAsync(next);
    showControls();
  };

  const jumpEpisode = (ep: number) => navigation.replace('Watch', { animeId, episodeNum: ep, title: displayTitle });

  const selectAudio = (value: 'sub' | 'dub') => {
    if (value === audio) return;
    setAudio(value);
    setControls(true);
  };

  const selectServer = async (name: string) => {
    if (name === server) return;
    try {
      const wasPlaying = playing;
      const savedTime = position;
      setLoading(true);
      const next = await resolveStream(animeId, episodeNum, audio, name);
      setStream(next);
      setServer(name);
      setPosition(savedTime);
      setControls(true);
      if (!wasPlaying) await video.current?.pauseAsync().catch(() => {});
    } catch (e: any) {
      setError(e?.message ?? 'Server failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.topIcon} hitSlop={8}><Ionicons name="chevron-back" size={24} color="#fff" /></Pressable>
        <View style={styles.topCenter}><Text style={styles.topAnime} numberOfLines={1}>{displayTitle}</Text><Text style={styles.topEpisode}>EPISODE {episodeNum}</Text></View>
        <Pressable onPress={() => navigation.navigate('AnimeDetail', { id: animeId, title: displayTitle })} style={styles.topIcon} hitSlop={8}><Ionicons name="information-circle-outline" size={23} color="#fff" /></Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.player}>
          {source ? (
            <Pressable style={styles.playerPress} onPress={() => { if (controls) setControls(false); else showControls(); }}>
              <Video
                ref={video}
                style={StyleSheet.absoluteFillObject}
                source={{ uri: source }}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                volume={volume}
                onPlaybackStatusUpdate={onStatus}
              />
              {controls ? (
                <View style={styles.playerUi} pointerEvents="box-none">
                  <View style={styles.playerScrimTop} pointerEvents="none" />

                  <View style={styles.mobileTopPill}>
                    <Pressable style={styles.glassButton} onPress={cycleVolume}><Ionicons name={volume === 0 ? 'volume-mute-outline' : 'volume-high-outline'} size={17} color="#fff" /></Pressable>
                    <Pressable style={styles.glassButton} onPress={() => setAudio(audio === 'sub' ? 'dub' : 'sub')}><Ionicons name="text-outline" size={17} color="#fff" /></Pressable>
                    <Pressable style={styles.glassButton} onPress={() => navigation.navigate('AnimeDetail', { id: animeId, title: displayTitle })}><Ionicons name="settings-outline" size={17} color="#fff" /></Pressable>
                  </View>

                  <View style={styles.centerControls} pointerEvents="box-none">
                    <Pressable onPress={() => seek(-10)} style={styles.centerSide}><Ionicons name="play-back" size={21} color="#fff" /><Text style={styles.seekLabel}>10</Text></Pressable>
                    <Pressable onPress={togglePlay} style={styles.mainPlay}><Ionicons name={playing ? 'pause' : 'play'} size={28} color="#fff" /></Pressable>
                    <Pressable onPress={() => seek(10)} style={styles.centerSide}><Ionicons name="play-forward" size={21} color="#fff" /><Text style={styles.seekLabel}>10</Text></Pressable>
                  </View>

                  <View style={styles.playerBottom} pointerEvents="box-none">
                    <Pressable
                      style={styles.seekContainer}
                      onPress={(e) => seekToPercent(e.nativeEvent.locationX / Math.max(1, e.nativeEvent.pageX ? e.nativeEvent.pageX : 1))}
                    >
                      <View style={styles.seekTrack}><View style={[styles.seekPlayed, { width: `${duration ? Math.min(100, (position / duration) * 100) : 0}%` }]} /></View>
                    </Pressable>
                    <View style={styles.controlRow}>
                      <View style={styles.leftPill}>
                        <Pressable onPress={togglePlay} style={styles.smallControl}><Ionicons name={playing ? 'pause' : 'play'} size={17} color="#fff" /></Pressable>
                        <Pressable onPress={toggleMute} style={styles.smallControl}><Ionicons name={volume === 0 ? 'volume-mute' : 'volume-high'} size={17} color="#fff" /></Pressable>
                        <Text style={styles.time}>{fmt(position / 1000)} / {fmt(duration / 1000)}</Text>
                      </View>
                      <View style={{ flex: 1 }} />
                      <View style={styles.rightPill}>
                        <Pressable onPress={() => selectAudio(audio === 'sub' ? 'dub' : 'sub')} style={styles.smallControl}><Ionicons name="text-outline" size={17} color="#fff" /></Pressable>
                        <Pressable onPress={() => navigation.navigate('AnimeDetail', { id: animeId, title: displayTitle })} style={styles.smallControl}><Ionicons name="settings-outline" size={17} color="#fff" /></Pressable>
                        <Pressable onPress={() => video.current?.presentFullscreenPlayer()} style={styles.smallControl}><Ionicons name="expand-outline" size={18} color="#fff" /></Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              ) : null}
            </Pressable>
          ) : (
            <View style={styles.playerEmpty}>
              {loading ? <ActivityIndicator color={colors.accent} size="large" /> : <>
                <Ionicons name="alert-circle-outline" size={36} color={colors.accent} />
                <Text style={styles.errorTitle}>NO PLAYABLE SOURCE</Text>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable onPress={load} style={styles.retry}><Text style={styles.retryText}>RETRY</Text></Pressable>
              </>}
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.watchTitle}>{displayTitle}</Text>
          <Text style={styles.watchMeta}>Episode {episodeNum}{currentEpisode?.title ? ` · ${currentEpisode.title}` : ''}</Text>

          <View style={styles.modeRow}>
            <Text style={styles.modeLabel}>AUDIO</Text>
            {(['sub', 'dub'] as const).map((value) => <Pressable key={value} onPress={() => selectAudio(value)} style={[styles.modeChip, audio === value && styles.modeChipActive]}><Text style={[styles.modeText, audio === value && styles.modeTextActive]}>{value.toUpperCase()}</Text></Pressable>)}
          </View>

          {stream?.servers?.length ? <View>
            <Text style={styles.sectionLabel}>SERVERS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serverRow}>
              {stream.servers.map((item) => <Pressable key={`${item.name}-${item.type}`} onPress={() => selectServer(item.name)} style={[styles.serverChip, server === item.name && styles.serverActive]}><Text style={[styles.serverText, server === item.name && styles.serverTextActive]}>{item.name}</Text></Pressable>)}
            </ScrollView>
          </View> : null}

          <View style={styles.episodeHeader}><Text style={styles.sectionLabel}>EPISODES</Text><Text style={styles.episodeCount}>{episodes.length} EPISODES</Text></View>
          <View style={styles.episodeGrid}>
            {episodes.map((ep) => {
              const n = Number(ep.episode);
              const active = n === Number(episodeNum);
              return <Pressable key={n} onPress={() => jumpEpisode(n)} style={[styles.epButton, active && styles.epButtonActive]}><Text style={[styles.epNumber, active && styles.epNumberActive]}>{n}</Text>{ep.title ? <Text style={[styles.epTitle, active && styles.epTitleActive]} numberOfLines={1}>{ep.title}</Text> : null}</Pressable>;
            })}
          </View>

          {anime?.synopsis ? <View style={styles.about}><Text style={styles.sectionLabel}>ABOUT</Text><Text style={styles.aboutText}>{anime.synopsis}</Text></View> : null}
          <View style={{ height: 32 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase },
  topbar: { height: 58, paddingHorizontal: 10, backgroundColor: '#0b0c10', borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center' },
  topIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  topAnime: { color: '#fff', fontFamily: fonts.bodySemibold, fontSize: 13 },
  topEpisode: { color: colors.textMuted, fontFamily: fonts.displayMedium, fontSize: 8, letterSpacing: 1, marginTop: 2 },
  player: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  playerPress: { flex: 1 },
  playerUi: { ...StyleSheet.absoluteFillObject },
  playerScrimTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 82, backgroundColor: 'rgba(0,0,0,.38)' },
  mobileTopPill: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', gap: 2, padding: 3, borderRadius: 18, backgroundColor: 'rgba(0,0,0,.58)', borderWidth: 1, borderColor: 'rgba(255,255,255,.14)' },
  glassButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  centerControls: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 25 },
  centerSide: { width: 48, height: 58, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  seekLabel: { position: 'absolute', top: 28, color: 'rgba(255,255,255,.82)', fontFamily: fonts.bodyBold, fontSize: 7 },
  mainPlay: { width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(0,0,0,.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,.62)', alignItems: 'center', justifyContent: 'center', paddingLeft: 2 },
  playerBottom: { position: 'absolute', left: 10, right: 10, bottom: 7 },
  seekContainer: { height: 18, justifyContent: 'center' },
  seekTrack: { height: 3, backgroundColor: 'rgba(255,255,255,.28)', borderRadius: 3, overflow: 'hidden' },
  seekPlayed: { height: 3, backgroundColor: '#fff' },
  controlRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center' },
  leftPill: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, backgroundColor: 'rgba(0,0,0,.66)', borderWidth: 1, borderColor: 'rgba(255,255,255,.13)', paddingHorizontal: 4 },
  rightPill: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, backgroundColor: 'rgba(0,0,0,.66)', borderWidth: 1, borderColor: 'rgba(255,255,255,.13)', paddingHorizontal: 4 },
  smallControl: { width: 31, height: 31, alignItems: 'center', justifyContent: 'center' },
  time: { color: 'rgba(255,255,255,.88)', fontFamily: fonts.bodyMedium, fontSize: 9, marginHorizontal: 4 },
  playerEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 25 },
  errorTitle: { color: colors.accent, fontFamily: fonts.displayMedium, fontSize: 11, letterSpacing: 1.2, marginTop: 10 },
  errorText: { color: colors.textMuted, fontFamily: fonts.body, textAlign: 'center', fontSize: 11, marginTop: 7 },
  retry: { marginTop: 15, paddingHorizontal: 20, paddingVertical: 9, borderRadius: radius.sm, backgroundColor: colors.accent },
  retryText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: .5 },
  body: { paddingHorizontal: 16 },
  watchTitle: { color: colors.textPrimary, fontFamily: fonts.displayMedium, fontSize: 18, marginTop: 17 },
  watchMeta: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: 11, marginTop: 4 },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14 },
  modeLabel: { color: colors.textMuted, fontFamily: fonts.displayMedium, fontSize: 8, letterSpacing: 1.1, marginRight: 2 },
  modeChip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 7, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard },
  modeChipActive: { borderColor: colors.borderAccent, backgroundColor: colors.accentDim },
  modeText: { color: colors.textMuted, fontFamily: fonts.bodyBold, fontSize: 9 },
  modeTextActive: { color: '#fff' },
  sectionLabel: { color: colors.accent, fontFamily: fonts.displayMedium, fontSize: 10, letterSpacing: 1.4, marginTop: 21, marginBottom: 9 },
  serverRow: { gap: 8 },
  serverChip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 7, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  serverActive: { backgroundColor: colors.accentDim, borderColor: colors.borderAccent },
  serverText: { color: colors.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 10 },
  serverTextActive: { color: '#fff' },
  episodeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  episodeCount: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: 9, marginTop: 21 },
  episodeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  epButton: { width: 74, minHeight: 40, paddingHorizontal: 7, paddingVertical: 7, borderRadius: 7, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  epButtonActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  epNumber: { color: colors.textPrimary, fontFamily: fonts.bodyBold, fontSize: 11 },
  epNumberActive: { color: '#fff' },
  epTitle: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 7, marginTop: 2 },
  epTitleActive: { color: 'rgba(255,255,255,.8)' },
  about: { marginTop: 20, padding: 14, borderRadius: radius.md, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border },
  aboutText: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: 12, lineHeight: 18 },
});