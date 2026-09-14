import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getAnimeDetail, getEpisodes, getEpisodeThumbnails, type AnimeDetail, type EpisodeItem, type EpisodeThumbnail } from '../api/content';
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
  const [playerLoading, setPlayerLoading] = useState(true);

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
        // Keep the player usable even if optional episode metadata fails.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [animeId]);

  const totalEpisodes = Math.max(
    1,
    anime?.totalEpisodes || episodes.length || 1,
  );

  const malId = anime?.id ?? animeId;
  const playerUrl = useMemo(
    () => `https://www.anivault.co/#/stream/mal/${encodeURIComponent(String(malId))}/${encodeURIComponent(String(episode))}/${language}`,
    [malId, episode, language],
  );

  const episodeRows = useMemo(() => {
    const max = Math.max(totalEpisodes, episodes.length, episode);
    return Array.from({ length: max }, (_, index) => {
      const num = index + 1;
      const data = episodes.find((item) => Number(item.episode ?? item.mal_id) === num);
      return { num, data };
    });
  }, [episodes, totalEpisodes, episode]);

  const title = anime?.title || routeTitle || 'Watching';

  const selectEpisode = (next: number) => {
    if (next < 1 || next > totalEpisodes) return;
    setPlayerLoading(true);
    setEpisode(next);
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
          {playerLoading && (
            <View style={styles.playerLoader} pointerEvents="none">
              <ActivityIndicator color="#fff" />
              <Text style={styles.playerLoaderText}>Loading player…</Text>
            </View>
          )}
          <WebView
            key={`${episode}-${language}`}
            source={{ uri: playerUrl }}
            style={styles.webview}
            onLoadEnd={() => setPlayerLoading(false)}
            onError={() => setPlayerLoading(false)}
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            setSupportMultipleWindows={false}
            originWhitelist={['http://*', 'https://*']}
          />
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
          <Pressable onPress={() => { if (language !== 'sub') { setPlayerLoading(true); setLanguage('sub'); } }} style={[styles.languageButton, language === 'sub' && styles.languageActive]}>
            <Text style={[styles.languageText, language === 'sub' && styles.languageActiveText]}>SUBTITLED</Text>
          </Pressable>
          <Pressable onPress={() => { if (language !== 'dub') { setPlayerLoading(true); setLanguage('dub'); } }} style={[styles.languageButton, language === 'dub' && styles.languageActive]}>
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
  playerLoader: { ...StyleSheet.absoluteFillObject, zIndex: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  playerLoaderText: { marginTop: 9, color: 'rgba(255,255,255,0.55)', fontSize: 10 },
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
