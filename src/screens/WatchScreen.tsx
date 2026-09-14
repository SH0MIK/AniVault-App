import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  FlatList,
  Share,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAnimeDetail, getEpisodes, AnimeDetail, EpisodeItem } from '../api/content';
import { colors, radius, fonts } from '../theme';

const SITE_URL = 'https://www.anivault.co';
const PAGE_SIZE = 50;

type WatchParams = {
  animeId: number;
  episodeNum: number;
  title?: string;
};

function getEpisodeNumber(ep: EpisodeItem, index: number) {
  return Number(ep.episode ?? index + 1);
}

function getEpisodeTitle(ep: EpisodeItem, number: number) {
  return typeof ep.title === 'string' && ep.title.trim() ? ep.title : `Episode ${number}`;
}

export default function WatchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { animeId, episodeNum } = route.params as WatchParams;
  const { width } = useWindowDimensions();

  const [anime, setAnime] = useState<AnimeDetail | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState(episodeNum);
  const [loading, setLoading] = useState(true);
  const [playerLoading, setPlayerLoading] = useState(true);
  const [autoplay, setAutoplay] = useState(false);
  const [language, setLanguage] = useState<'SUB' | 'DUB'>('SUB');
  const [range, setRange] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [detail, epResult] = await Promise.all([
          getAnimeDetail(animeId),
          getEpisodes(animeId),
        ]);
        if (!alive) return;
        setAnime(detail.anime);
        setEpisodes(epResult.data ?? []);
      } catch {
        if (alive) setEpisodes([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [animeId]);

  useEffect(() => {
    const index = episodes.findIndex((ep, i) => getEpisodeNumber(ep, i) === currentEpisode);
    if (index >= 0) setRange(Math.floor(index / PAGE_SIZE));
  }, [episodes, currentEpisode]);

  const currentIndex = episodes.findIndex((ep, i) => getEpisodeNumber(ep, i) === currentEpisode);
  const currentEp = currentIndex >= 0 ? episodes[currentIndex] : undefined;
  const currentTitle = getEpisodeTitle(currentEp ?? {}, currentEpisode);
  const ranges = Math.max(1, Math.ceil(episodes.length / PAGE_SIZE));
  const visibleEpisodes = useMemo(
    () => episodes.slice(range * PAGE_SIZE, range * PAGE_SIZE + PAGE_SIZE),
    [episodes, range],
  );

  const playerUrl = useMemo(
    () => `${SITE_URL}/watch?anime=${encodeURIComponent(animeId)}&ep=${encodeURIComponent(currentEpisode)}`,
    [animeId, currentEpisode],
  );

  const chooseEpisode = (number: number) => {
    setPlayerLoading(true);
    setCurrentEpisode(number);
  };

  const nextEpisode = () => {
    const next = episodes[currentIndex + 1];
    if (next) chooseEpisode(getEpisodeNumber(next, currentIndex + 1));
  };

  const shareEpisode = async () => {
    await Share.share({
      title: anime?.title ?? 'AniVault',
      message: `${anime?.title ?? 'Anime'} — Episode ${currentEpisode}\n${SITE_URL}/watch?anime=${animeId}&ep=${currentEpisode}`,
    });
  };

  if (loading || !anime) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Native app player shell. Only the actual playback surface is loaded
            in the WebView; all surrounding watch-page UI is rebuilt natively. */}
        <View style={[styles.player, { height: Math.max(210, width * 0.5625) }]}>
          {playerLoading && (
            <View style={styles.playerLoading}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
          <WebView
            key={playerUrl}
            source={{ uri: playerUrl }}
            style={styles.playerWebView}
            onLoadEnd={() => setPlayerLoading(false)}
            onError={() => setPlayerLoading(false)}
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            setSupportMultipleWindows={false}
            allowsFullscreenVideo
            injectedJavaScript={`
              (function () {
                var css = document.createElement('style');
                css.innerHTML = 'body{margin:0!important;background:#000!important;overflow:hidden!important} body>*{display:none!important} video,iframe{display:block!important;width:100%!important;height:100%!important;position:absolute!important;inset:0!important;background:#000!important}';
                document.head.appendChild(css);
                true;
              })();
            `}
          />
          <Pressable style={styles.skipIntro} onPress={() => {}}>
            <Ionicons name="play-skip-forward" size={15} color="#fff" />
            <Text style={styles.skipText}>Skip Intro</Text>
          </Pressable>
        </View>

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>{currentTitle}</Text>
          <Text style={styles.meta}>
            Episode {currentEpisode}{anime.isAiring && anime.airedSoFar != null ? ` • ${anime.airedSoFar} aired` : ''}
          </Text>

          <View style={styles.controlRow}>
            <View style={styles.languageToggle}>
              <Pressable onPress={() => setLanguage('SUB')} style={[styles.langButton, language === 'SUB' && styles.langActive]}>
                <Text style={[styles.langText, language === 'SUB' && styles.langTextActive]}>SUB</Text>
              </Pressable>
              <Pressable onPress={() => setLanguage('DUB')} style={[styles.langButton, language === 'DUB' && styles.langActive]}>
                <Text style={[styles.langText, language === 'DUB' && styles.langTextActive]}>DUB</Text>
              </Pressable>
            </View>

            <Pressable style={styles.actionButton} onPress={() => setAutoplay(v => !v)}>
              <Ionicons name={autoplay ? 'checkmark-circle' : 'ellipse-outline'} size={17} color="#fff" />
              <Text style={styles.actionText}>Autoplay</Text>
            </Pressable>

            <Pressable style={[styles.actionButton, !episodes[currentIndex + 1] && styles.disabled]} onPress={nextEpisode} disabled={!episodes[currentIndex + 1]}>
              <Ionicons name="play" size={15} color="#fff" />
              <Text style={styles.actionText}>Next</Text>
            </Pressable>

            <Pressable style={styles.actionButton} onPress={shareEpisode}>
              <Ionicons name="share-social" size={17} color="#fff" />
              <Text style={styles.actionText}>Share</Text>
            </Pressable>

            <Pressable style={styles.actionButton} onPress={() => {}}>
              <Ionicons name="download-outline" size={18} color="#fff" />
              <Text style={styles.actionText}>Download</Text>
            </Pressable>
          </View>

          <View style={styles.episodeHeader}>
            <Text style={styles.episodeHeading}>{anime.title}</Text>
          </View>

          {ranges > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rangeRow}>
              {Array.from({ length: ranges }, (_, i) => {
                const start = i * PAGE_SIZE + 1;
                const end = Math.min((i + 1) * PAGE_SIZE, episodes.length);
                return (
                  <Pressable key={i} onPress={() => setRange(i)} style={[styles.rangeButton, range === i && styles.rangeActive]}>
                    <Text style={[styles.rangeText, range === i && styles.rangeTextActive]}>{start}-{end}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        <FlatList
          data={visibleEpisodes}
          scrollEnabled={false}
          keyExtractor={(ep, i) => `${getEpisodeNumber(ep, range * PAGE_SIZE + i)}-${i}`}
          contentContainerStyle={styles.episodeList}
          renderItem={({ item, index }) => {
            const absoluteIndex = range * PAGE_SIZE + index;
            const number = getEpisodeNumber(item, absoluteIndex);
            const selected = number === currentEpisode;
            return (
              <Pressable
                onPress={() => chooseEpisode(number)}
                style={[styles.episodeRow, selected && styles.episodeSelected]}
              >
                <View style={[styles.thumb, selected && styles.thumbSelected]}>
                  <Text style={styles.thumbNumber}>{number}</Text>
                  {selected && <Ionicons name="play" size={17} color="#fff" style={styles.thumbPlay} />}
                </View>
                <View style={styles.episodeTextWrap}>
                  <Text style={[styles.episodeTitle, selected && styles.episodeTitleSelected]} numberOfLines={2}>
                    {getEpisodeTitle(item, number)}
                  </Text>
                  <Text style={styles.episodeSub}>E{number}</Text>
                </View>
                <Ionicons name="download-outline" size={25} color={colors.textMuted} />
              </Pressable>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>No episodes available.</Text>}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050507' },
  content: { paddingBottom: 30 },
  center: { flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center' },
  player: { width: '100%', backgroundColor: '#000', position: 'relative', overflow: 'hidden' },
  playerWebView: { flex: 1, backgroundColor: '#000' },
  playerLoading: { ...StyleSheet.absoluteFillObject, zIndex: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  skipIntro: { position: 'absolute', right: 12, bottom: 12, zIndex: 4, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, backgroundColor: 'rgba(30,30,35,.78)' },
  skipText: { color: '#fff', fontFamily: fonts.bodySemibold, fontSize: 13 },
  info: { paddingHorizontal: 16, paddingTop: 16 },
  title: { color: colors.textPrimary, fontFamily: fonts.display, fontSize: 22, lineHeight: 29 },
  meta: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: 13, marginTop: 7 },
  controlRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  languageToggle: { flexDirection: 'row', backgroundColor: colors.bgSurface, borderRadius: 24, padding: 3 },
  langButton: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  langActive: { backgroundColor: '#fff' },
  langText: { color: colors.textSecondary, fontFamily: fonts.bodyBold, fontSize: 13 },
  langTextActive: { color: '#15151a' },
  actionButton: { minHeight: 40, paddingHorizontal: 13, borderRadius: 22, backgroundColor: colors.bgSurface, flexDirection: 'row', alignItems: 'center', gap: 7 },
  actionText: { color: '#fff', fontFamily: fonts.bodySemibold, fontSize: 12 },
  disabled: { opacity: 0.4 },
  episodeHeader: { marginTop: 22 },
  episodeHeading: { color: colors.textPrimary, fontFamily: fonts.display, fontSize: 18 },
  rangeRow: { gap: 10, paddingTop: 12, paddingBottom: 5 },
  rangeButton: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 22, backgroundColor: colors.bgSurface },
  rangeActive: { borderWidth: 1, borderColor: '#fff', backgroundColor: '#16161b' },
  rangeText: { color: colors.textSecondary, fontFamily: fonts.bodySemibold, fontSize: 12 },
  rangeTextActive: { color: '#fff' },
  episodeList: { paddingTop: 10 },
  episodeRow: { minHeight: 86, marginHorizontal: 12, paddingHorizontal: 4, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,.055)', flexDirection: 'row', alignItems: 'center', gap: 12 },
  episodeSelected: { backgroundColor: 'rgba(124,58,237,.09)', borderRadius: radius.md },
  thumb: { width: 102, height: 60, borderRadius: 7, backgroundColor: '#27272d', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  thumbSelected: { backgroundColor: colors.accent },
  thumbNumber: { color: 'rgba(255,255,255,.92)', fontFamily: fonts.display, fontSize: 27 },
  thumbPlay: { position: 'absolute', left: 8, bottom: 7 },
  episodeTextWrap: { flex: 1, minWidth: 0 },
  episodeTitle: { color: colors.textPrimary, fontFamily: fonts.bodySemibold, fontSize: 14, lineHeight: 19 },
  episodeTitleSelected: { color: '#fff' },
  episodeSub: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 11, marginTop: 4 },
  empty: { color: colors.textMuted, textAlign: 'center', padding: 30, fontFamily: fonts.body },
});
