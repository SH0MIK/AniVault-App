import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getHome, HomeContinueItem, MiniAnimeCard } from '../api/content';
import { WebAnimeCard, WebFooter, WebSectionHeader } from '../components/WebChrome';
import { colors, fonts, radius } from '../theme';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [seasonal, setSeasonal] = useState<MiniAnimeCard[]>([]);
  const [top, setTop] = useState<MiniAnimeCard[]>([]);
  const [upcoming, setUpcoming] = useState<MiniAnimeCard[]>([]);
  const [watchNow, setWatchNow] = useState<MiniAnimeCard[]>([]);
  const [continueWatching, setContinueWatching] = useState<HomeContinueItem[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getHome();
      setSeasonal(res.seasonal ?? []);
      setTop(res.top ?? []);
      setUpcoming(res.upcoming ?? []);
      setWatchNow(res.watchNow ?? []);
      setContinueWatching(res.continueWatching ?? []);
      setHeroIndex(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (seasonal.length < 2) return;
    const timer = setInterval(() => setHeroIndex((v) => (v + 1) % Math.min(seasonal.length, 6)), 6500);
    return () => clearInterval(timer);
  }, [seasonal.length]);

  const hero = seasonal[heroIndex];

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />}
      >
        {!loading && hero ? (
          <View style={styles.hero}>
            <Image source={{ uri: hero.image }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
            <View style={styles.heroDim} />
            <View style={styles.heroBottom} />
            <View style={styles.heroContent}>
              <Text style={styles.heroEyebrow}>TRENDING NOW</Text>
              <Text style={styles.heroTitle} numberOfLines={2}>{hero.title}</Text>
              <View style={styles.heroStats}>
                {hero.score != null ? <View style={styles.heroStat}><Ionicons name="star" size={13} color={colors.gold} /><Text style={styles.heroStatText}>{hero.score.toFixed(1)}</Text></View> : null}
                {hero.type ? <Text style={styles.heroMeta}>{hero.type}</Text> : null}
                {hero.episodes ? <Text style={styles.heroMeta}>· {hero.episodes} eps</Text> : null}
              </View>
              <Text style={styles.heroDescription}>Discover the latest anime and keep your place in your AniVault.</Text>
              <View style={styles.heroButtons}>
                <Pressable style={styles.heroPrimary} onPress={() => navigation.navigate('AnimeDetail', { id: hero.id, title: hero.title })}>
                  <Ionicons name="play" size={14} color="#fff" /><Text style={styles.heroPrimaryText}>VIEW DETAILS</Text>
                </Pressable>
                <Pressable style={styles.heroGhost} onPress={() => navigation.navigate('AnimeDetail', { id: hero.id, title: hero.title })}>
                  <Ionicons name="add" size={16} color={colors.textPrimary} /><Text style={styles.heroGhostText}>ADD TO LIST</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.dots}>
              {seasonal.slice(0, 6).map((_, i) => <View key={i} style={[styles.dot, i === heroIndex && styles.dotActive]} />)}
            </View>
          </View>
        ) : (
          <View style={styles.heroSkeleton}><Text style={styles.loadingText}>LOADING ANIVAULT...</Text></View>
        )}

        {!loading && continueWatching.length > 0 ? <ContinueWatching data={continueWatching} onPress={(item) => navigation.navigate('Watch', { animeId: item.animeId, episodeNum: item.episodeNum, title: item.title })} /> : null}

        {!loading && watchNow.length > 0 ? (
          <PosterSection title="Watch Now" action="View All" onAction={() => navigation.navigate('WatchNow')} data={watchNow} navigation={navigation} />
        ) : null}
        <PosterSection title="Trending Now" action="View All" onAction={() => navigation.navigate('Seasonal')} data={seasonal} navigation={navigation} />
        <PosterSection title="Most Popular" action="View Full Rankings" onAction={() => navigation.navigate('TopAnime')} data={top} navigation={navigation} />
        {upcoming.length > 0 ? <PosterSection title="Coming Soon" data={upcoming} navigation={navigation} /> : null}

        {!loading && top.length > 0 ? <TopTen data={top} navigation={navigation} /> : null}

        {!loading ? <WebFooter /> : null}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

function ContinueWatching({ data, onPress }: { data: HomeContinueItem[]; onPress: (item: HomeContinueItem) => void }) {
  return (
    <View>
      <WebSectionHeader title="Continue Watching" action="View Full History" />
      <View style={styles.continueList}>
        {data.slice(0, 8).map((item) => {
          const pct = item.episodeDuration > 0 ? Math.min(1, item.watchTime / item.episodeDuration) : 0;
          const left = item.episodeDuration > item.watchTime ? Math.max(0, Math.round((item.episodeDuration - item.watchTime) / 60)) : 0;
          return (
            <Pressable key={`${item.animeId}-${item.episodeNum}`} onPress={() => onPress(item)} style={styles.continueCard}>
              <View style={styles.continueThumb}>
                <Image source={{ uri: item.epThumb ?? item.image }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                <View style={styles.continueShade} />
                <View style={styles.episodeBadge}><Text style={styles.episodeBadgeText}>EP {item.episodeNum}</Text></View>
                {left > 0 ? <Text style={styles.timeLeft}>{left >= 60 ? `${Math.floor(left / 60)}h ${left % 60}m left` : `${left}m left`}</Text> : null}
                <View style={styles.playCircle}><Ionicons name="play" size={17} color="#fff" /></View>
                {pct > 0 ? <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${pct * 100}%` }]} /></View> : null}
              </View>
              <View style={styles.continueInfo}>
                <Text style={styles.continueAnime} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.continueTitle} numberOfLines={1}>E{item.episodeNum} – {item.epTitle || `Episode ${item.episodeNum}`}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function PosterSection({ title, action, onAction, data, navigation }: { title: string; action?: string; onAction?: () => void; data: MiniAnimeCard[]; navigation: any }) {
  return (
    <View>
      <WebSectionHeader title={title} action={action} onAction={onAction} />
      <FlatList
        horizontal
        data={data}
        keyExtractor={(item) => String(item.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.posterRow}
        renderItem={({ item }) => <WebAnimeCard title={item.title} image={item.image} score={item.score} type={item.type} episodes={item.episodes} onPress={() => navigation.navigate('AnimeDetail', { id: item.id, title: item.title })} />}
      />
    </View>
  );
}

function TopTen({ data, navigation }: { data: MiniAnimeCard[]; navigation: any }) {
  return (
    <View>
      <WebSectionHeader title="Top 10 Ranked" action="View Full Rankings" onAction={() => navigation.navigate('TopAnime')} />
      <View style={styles.topList}>
        {data.slice(0, 10).map((item, index) => (
          <Pressable key={item.id} onPress={() => navigation.navigate('AnimeDetail', { id: item.id, title: item.title })} style={styles.topItem}>
            <Text style={styles.rank}>#{index + 1}</Text>
            <Image source={{ uri: item.image }} style={styles.topThumb} contentFit="cover" />
            <View style={styles.topInfo}><Text style={styles.topTitle} numberOfLines={1}>{item.title}</Text><Text style={styles.topMeta}>{item.score != null ? `★ ${item.score.toFixed(1)}` : ''}{item.type ? ` · ${item.type}` : ''}</Text></View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase },
  hero: { height: 455, marginBottom: 3, overflow: 'hidden', backgroundColor: colors.bgCard },
  heroDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,.25)' },
  heroBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 280, backgroundColor: 'rgba(10,11,14,.94)' },
  heroContent: { position: 'absolute', left: 18, right: 18, bottom: 58 },
  heroEyebrow: { color: colors.accent, fontFamily: fonts.displayMedium, fontSize: 9, letterSpacing: 1.8, marginBottom: 7 },
  heroTitle: { color: colors.textPrimary, fontFamily: fonts.display, fontSize: 25, lineHeight: 31 },
  heroStats: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 9 },
  heroStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroStatText: { color: colors.gold, fontFamily: fonts.bodyBold, fontSize: 12 },
  heroMeta: { color: colors.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 11 },
  heroDescription: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, marginTop: 8, maxWidth: 360 },
  heroButtons: { flexDirection: 'row', gap: 8, marginTop: 15 },
  heroPrimary: { minHeight: 39, paddingHorizontal: 13, borderRadius: radius.sm, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroPrimaryText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: .7 },
  heroGhost: { minHeight: 39, paddingHorizontal: 13, borderRadius: radius.sm, backgroundColor: 'rgba(255,255,255,.06)', borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroGhostText: { color: colors.textPrimary, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: .7 },
  dots: { position: 'absolute', bottom: 21, left: 18, flexDirection: 'row', gap: 6 },
  dot: { width: 18, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,.18)' },
  dotActive: { backgroundColor: colors.accent },
  heroSkeleton: { height: 455, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgSurface },
  loadingText: { color: colors.textMuted, fontFamily: fonts.displayMedium, fontSize: 10, letterSpacing: 1.4 },
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
