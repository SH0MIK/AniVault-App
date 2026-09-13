import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getWebHome, HomeHeroItem, WebHomeCard } from '../api/home';
import { WebAnimeCard, WebFooter, WebHeader, WebSectionHeader } from '../components/WebChrome';
import { colors, fonts, radius } from '../theme';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [seasonal, setSeasonal] = useState<WebHomeCard[]>([]);
  const [top, setTop] = useState<WebHomeCard[]>([]);
  const [upcoming, setUpcoming] = useState<WebHomeCard[]>([]);
  const [watchNow, setWatchNow] = useState<WebHomeCard[]>([]);
  const [continueWatching, setContinueWatching] = useState<any[]>([]);
  const [heroItems, setHeroItems] = useState<HomeHeroItem[]>([]);
  const [genres, setGenres] = useState<{ mal_id: number; name: string }[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await getWebHome();
      setHeroItems(res.hero ?? []);
      setGenres(res.genres ?? []);
      setSeasonal(res.seasonal ?? []);
      setTop(res.top ?? []);
      setUpcoming(res.upcoming ?? []);
      setWatchNow(res.watchNow ?? []);
      setContinueWatching(res.continueWatching ?? []);
      setHeroIndex(0);
    } catch (e: any) {
      setError(e?.message || 'Unable to load AniVault.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (heroItems.length < 2) return;
    const timer = setInterval(() => setHeroIndex((v) => (v + 1) % heroItems.length), 6500);
    return () => clearInterval(timer);
  }, [heroItems.length]);

  const hero = heroItems[heroIndex];

  return (
    <View style={styles.root}>
      <WebHeader navigation={navigation} routeName="Home" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />}
      >
        {!loading && hero ? <Hero item={hero} index={heroIndex} total={heroItems.length} onDetails={() => navigation.navigate('AnimeDetail', { id: hero.id, title: hero.title })} onIndex={setHeroIndex} /> : loading ? <View style={styles.heroSkeleton}><Text style={styles.loadingText}>LOADING ANIVAULT...</Text></View> : <View style={styles.heroSkeleton}><Ionicons name="cloud-offline-outline" size={30} color={colors.textMuted} /><Text style={styles.offlineTitle}>ANIVAULT OFFLINE</Text><Text style={styles.offlineText}>{error || 'Connect once to load the homepage.'}</Text><Pressable onPress={load} style={styles.retry}><Text style={styles.retryText}>RETRY</Text></Pressable></View>}

        {!loading && genres.length > 0 ? <FlatList horizontal data={genres} keyExtractor={(item) => String(item.mal_id)} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreBar} renderItem={({ item }) => <Pressable onPress={() => navigation.navigate('Browse', { genre: item.mal_id })} style={styles.genrePill}><Text style={styles.genreText}>{item.name}</Text></Pressable>} /> : null}
        {!loading && continueWatching.length > 0 ? <ContinueWatching data={continueWatching} onPress={(item) => navigation.navigate('Watch', { animeId: item.animeId, episodeNum: item.episodeNum, title: item.title })} onHistory={() => navigation.navigate('History')} /> : null}
        {!loading && watchNow.length > 0 ? <PosterSection title="Watch Now" action="View All" onAction={() => navigation.navigate('WatchNow')} data={watchNow} navigation={navigation} /> : null}
        {!loading ? <PosterSection title="Trending Now" action="View All" onAction={() => navigation.navigate('Seasonal')} data={seasonal} navigation={navigation} /> : null}
        {!loading ? <PosterSection title="Most Popular" action="View Full Rankings" onAction={() => navigation.navigate('TopAnime')} data={top} navigation={navigation} /> : null}
        {!loading && upcoming.length > 0 ? <PosterSection title="Coming Soon" data={upcoming} navigation={navigation} /> : null}
        {!loading && top.length > 0 ? <TopTen data={top} navigation={navigation} /> : null}
        <WebFooter />
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

function Hero({ item, index, total, onDetails, onIndex }: { item: HomeHeroItem; index: number; total: number; onDetails: () => void; onIndex: (index: number) => void }) {
  return <View style={styles.hero}>
    <Image source={{ uri: item.banner || item.image }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
    <View style={styles.heroDim} /><View style={styles.heroBottom} />
    <View style={styles.heroContent}>
      <Text style={styles.heroEyebrow}>ANIVAULT SPOTLIGHT</Text>
      {item.logo ? <Image source={{ uri: item.logo }} style={styles.heroLogo} contentFit="contain" /> : <Text style={styles.heroTitle} numberOfLines={2}>{item.title}</Text>}
      {item.logo ? <Text style={styles.heroFallbackTitle} numberOfLines={1}>{item.title}</Text> : null}
      {item.synopsis ? <Text style={styles.heroDescription} numberOfLines={3}>{item.synopsis}</Text> : null}
      <View style={styles.heroGenres}>{item.genres.map((g) => <View key={g} style={styles.heroGenre}><Text style={styles.heroGenreText}>{g}</Text></View>)}</View>
      <View style={styles.heroStats}>{item.score != null ? <View style={styles.heroStat}><Ionicons name="star" size={13} color={colors.gold} /><Text style={styles.heroStatText}>{item.score.toFixed(1)}</Text></View> : null}{item.episodes ? <Text style={styles.heroMeta}>▣ {item.episodes} eps</Text> : null}{item.type ? <Text style={styles.heroMeta}>▣ {item.type}</Text> : null}</View>
      <View style={styles.heroButtons}><Pressable style={styles.heroPrimary} onPress={onDetails}><Ionicons name="play" size={14} color="#fff" /><Text style={styles.heroPrimaryText}>VIEW DETAILS</Text></Pressable><Pressable style={styles.heroGhost} onPress={onDetails}><Ionicons name="add" size={16} color={colors.textPrimary} /><Text style={styles.heroGhostText}>ADD TO LIST</Text></Pressable></View>
    </View>
    {total > 1 ? <View style={styles.dots}>{Array.from({ length: total }).map((_, i) => <Pressable key={i} onPress={() => onIndex(i)} style={[styles.dot, i === index && styles.dotActive]} />)}</View> : null}
  </View>;
}

function ContinueWatching({ data, onPress, onHistory }: { data: any[]; onPress: (item: any) => void; onHistory: () => void }) {
  return <View><WebSectionHeader title="Continue Watching" action="View Full History" onAction={onHistory} /><View style={styles.continueList}>{data.slice(0, 8).map((item) => {
    const pct = item.episodeDuration > 0 ? Math.min(1, item.watchTime / item.episodeDuration) : 0;
    const left = item.episodeDuration > item.watchTime ? Math.max(0, Math.round((item.episodeDuration - item.watchTime) / 60)) : 0;
    return <Pressable key={`${item.animeId}-${item.episodeNum}`} onPress={() => onPress(item)} style={styles.continueCard}><View style={styles.continueThumb}><Image source={{ uri: item.epThumb || item.image }} style={StyleSheet.absoluteFillObject} contentFit="cover" /><View style={styles.continueShade} />{left > 0 ? <Text style={styles.timeLeft}>{left >= 60 ? `${Math.floor(left / 60)}h ${left % 60}m left` : `${left}m left`}</Text> : null}<View style={styles.episodeBadge}><Text style={styles.episodeBadgeText}>Ep {item.episodeNum}</Text></View><View style={styles.playCircle}><Ionicons name="play" size={17} color="#fff" /></View>{pct > 0 ? <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${pct * 100}%` }]} /></View> : null}</View><View style={styles.continueInfo}><Text style={styles.continueAnime} numberOfLines={1}>{item.title}</Text><Text style={styles.continueTitle} numberOfLines={1}>E{item.episodeNum} – {item.epTitle || `Episode ${item.episodeNum}`}</Text></View></Pressable>;
  })}</View></View>;
}

function PosterSection({ title, action, onAction, data, navigation }: { title: string; action?: string; onAction?: () => void; data: WebHomeCard[]; navigation: any }) {
  return <View><WebSectionHeader title={title} action={action} onAction={onAction} /><FlatList horizontal data={data} keyExtractor={(item) => String(item.id)} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterRow} renderItem={({ item }) => <WebAnimeCard title={item.title} image={item.image} score={item.score} type={item.type} episodes={item.episodes} status={item.userStatus} onPress={() => navigation.navigate('AnimeDetail', { id: item.id, title: item.title })} />} /></View>;
}

function TopTen({ data, navigation }: { data: WebHomeCard[]; navigation: any }) {
  return <View><WebSectionHeader title="Top 10 Ranked" action="View Full Rankings" onAction={() => navigation.navigate('TopAnime')} /><View style={styles.topList}>{data.slice(0, 10).map((item, index) => <Pressable key={item.id} onPress={() => navigation.navigate('AnimeDetail', { id: item.id, title: item.title })} style={styles.topItem}><Text style={styles.rank}>#{index + 1}</Text><Image source={{ uri: item.image }} style={styles.topThumb} contentFit="cover" /><View style={styles.topInfo}><Text style={styles.topTitle} numberOfLines={1}>{item.title}</Text><Text style={styles.topMeta}>{item.score != null ? `★ ${item.score.toFixed(1)}` : ''}{item.type ? ` · ${item.type}` : ''}</Text></View><Ionicons name="chevron-forward" size={16} color={colors.textMuted} /></Pressable>)}</View></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase },
  hero: { height: 500, overflow: 'hidden', backgroundColor: colors.bgCard },
  heroDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,.18)' },
  heroBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 310, backgroundColor: 'rgba(10,11,14,.94)' },
  heroContent: { position: 'absolute', left: 18, right: 18, bottom: 63 },
  heroEyebrow: { color: colors.accent, fontFamily: fonts.displayMedium, fontSize: 9, letterSpacing: 1.8, marginBottom: 8 },
  heroLogo: { width: 245, height: 68, alignSelf: 'flex-start', marginBottom: 3 },
  heroTitle: { color: colors.textPrimary, fontFamily: fonts.display, fontSize: 25, lineHeight: 31 },
  heroFallbackTitle: { color: colors.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 11, marginTop: -1, marginBottom: 4 },
  heroDescription: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, marginTop: 5 },
  heroGenres: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 },
  heroGenre: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4, backgroundColor: 'rgba(255,255,255,.06)', borderWidth: 1, borderColor: colors.border },
  heroGenreText: { color: colors.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 8 },
  heroStats: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 9 },
  heroStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroStatText: { color: colors.gold, fontFamily: fonts.bodyBold, fontSize: 12 },
  heroMeta: { color: colors.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 10 },
  heroButtons: { flexDirection: 'row', gap: 8, marginTop: 14 },
  heroPrimary: { minHeight: 39, paddingHorizontal: 13, borderRadius: radius.sm, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroPrimaryText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: .7 },
  heroGhost: { minHeight: 39, paddingHorizontal: 13, borderRadius: radius.sm, backgroundColor: 'rgba(255,255,255,.06)', borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroGhostText: { color: colors.textPrimary, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: .7 },
  dots: { position: 'absolute', bottom: 22, left: 18, flexDirection: 'row', gap: 6 },
  dot: { width: 18, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,.18)' },
  dotActive: { backgroundColor: colors.accent },
  heroSkeleton: { height: 500, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgSurface, padding: 24 },
  loadingText: { color: colors.textMuted, fontFamily: fonts.displayMedium, fontSize: 10, letterSpacing: 1.4 },
  offlineTitle: { color: colors.textPrimary, fontFamily: fonts.displayMedium, fontSize: 12, marginTop: 10 },
  offlineText: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 11, textAlign: 'center', marginTop: 7 },
  retry: { marginTop: 14, backgroundColor: colors.accent, borderRadius: 7, paddingHorizontal: 15, paddingVertical: 9 },
  retryText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: .8 },
  genreBar: { paddingHorizontal: 16, gap: 7, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  genrePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border },
  genreText: { color: colors.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 9 },
  continueList: { paddingHorizontal: 16 },
  continueCard: { marginBottom: 16 },
  continueThumb: { width: '100%', aspectRatio: 16 / 8.8, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  continueShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,.18)' },
  episodeBadge: { position: 'absolute', right: 8, bottom: 9, backgroundColor: 'rgba(0,0,0,.76)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
  episodeBadgeText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 8 },
  timeLeft: { position: 'absolute', left: 8, bottom: 9, color: '#fff', backgroundColor: 'rgba(0,0,0,.76)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4, fontFamily: fonts.bodyBold, fontSize: 8 },
  playCircle: { position: 'absolute', left: '50%', top: '50%', marginLeft: -22, marginTop: -22, width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: 'rgba(255,255,255,.75)', backgroundColor: 'rgba(255,255,255,.18)', alignItems: 'center', justifyContent: 'center', paddingLeft: 2 },
  progressTrack: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, backgroundColor: 'rgba(255,255,255,.14)' },
  progressFill: { height: 4, backgroundColor: colors.accent },
  continueInfo: { paddingHorizontal: 2, paddingTop: 7 },
  continueAnime: { color: colors.textMuted, fontFamily: fonts.bodyBold, fontSize: 9, textTransform: 'uppercase', letterSpacing: .8 },
  continueTitle: { color: colors.textPrimary, fontFamily: fonts.bodyBold, fontSize: 13, marginTop: 2 },
  posterRow: { paddingHorizontal: 16 },
  topList: { paddingHorizontal: 16 },
  topItem: { minHeight: 72, marginBottom: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank: { width: 30, color: colors.accent, fontFamily: fonts.displayMedium, fontSize: 11, textAlign: 'center' },
  topThumb: { width: 42, height: 58, borderRadius: 5, backgroundColor: colors.bgCard },
  topInfo: { flex: 1 },
  topTitle: { color: colors.textPrimary, fontFamily: fonts.bodySemibold, fontSize: 12 },
  topMeta: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 9, marginTop: 3 },
});
