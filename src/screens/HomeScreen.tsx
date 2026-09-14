import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet, FlatList, RefreshControl, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getHome, HomeContinueItem, MiniAnimeCard } from '../api/content';
import { colors, radius, fonts } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function titleOf(item: MiniAnimeCard) { return item.title || 'Unknown'; }

function AnimeCard({ item, width = 112 }: { item: MiniAnimeCard; width?: number }) {
  const navigation = useNavigation<any>();
  return (
    <Pressable style={[styles.card, { width }]} onPress={() => navigation.navigate('AnimeDetail', { id: item.id, title: item.title })}>
      <Image source={{ uri: item.image }} style={[styles.poster, { width, height: width * 1.43 }]} contentFit="cover" />
      <Text style={styles.cardTitle} numberOfLines={2}>{titleOf(item)}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{item.type || 'TV'}</Text>
        {item.score != null && <Text style={styles.score}>★ {item.score.toFixed(1)}</Text>}
      </View>
    </Pressable>
  );
}

function Section({ title, data, onSeeAll }: { title: string; data: MiniAnimeCard[]; onSeeAll?: () => void }) {
  if (!data.length) return null;
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {onSeeAll && <Pressable onPress={onSeeAll}><Text style={styles.seeAll}>See All</Text></Pressable>}
      </View>
      <FlatList
        horizontal
        data={data}
        keyExtractor={(item) => String(item.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rowContent}
        renderItem={({ item }) => <AnimeCard item={item} />}
      />
    </View>
  );
}

function ContinueCard({ item }: { item: HomeContinueItem }) {
  const navigation = useNavigation<any>();
  const pct = item.episodeDuration > 0 ? Math.min(1, item.watchTime / item.episodeDuration) : 0;
  return (
    <Pressable style={styles.continueCard} onPress={() => navigation.navigate('AnimeDetail', { id: item.animeId, title: item.title })}>
      <Image source={{ uri: item.epThumb ?? item.image }} style={styles.continueImage} contentFit="cover" />
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${pct * 100}%` }]} /></View>
      <Text style={styles.continueTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.continueEp}>Episode {item.episodeNum}{item.epTitle ? ` • ${item.epTitle}` : ''}</Text>
    </Pressable>
  );
}

function Hero({ items }: { items: MiniAnimeCard[] }) {
  const navigation = useNavigation<any>();
  const [index, setIndex] = useState(0);
  const anime = items[index % items.length];
  if (!anime) return null;
  return (
    <View style={styles.heroWrap}>
      <Pressable style={styles.hero} onPress={() => navigation.navigate('AnimeDetail', { id: anime.id, title: anime.title })}>
        <Image source={{ uri: anime.image }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        <View style={styles.heroShade} />
        <View style={styles.heroContent}>
          <View style={styles.heroCopy}>
            <View style={styles.badge}><Text style={styles.badgeText}>{(anime.type || 'TV').toUpperCase()}</Text>{anime.score != null && <Text style={styles.badgeScore}>★ {anime.score.toFixed(1)}</Text>}</View>
            <Text style={styles.heroTitle} numberOfLines={2}>{anime.title}</Text>
            <Text style={styles.heroSub}>{anime.episodes ? `${anime.episodes} episodes` : 'Anime'} • Discover your next favorite</Text>
            <View style={styles.watchButton}><Text style={styles.playIcon}>▶</Text><Text style={styles.watchText}>Watch Now</Text></View>
          </View>
          <Image source={{ uri: anime.image }} style={styles.heroPoster} contentFit="cover" />
        </View>
      </Pressable>
      <View style={styles.dots}>
        {items.slice(0, 5).map((_, i) => <Pressable key={i} onPress={() => setIndex(i)} style={[styles.dot, i === index ? styles.dotActive : styles.dotInactive]} />)}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [seasonal, setSeasonal] = useState<MiniAnimeCard[]>([]);
  const [top, setTop] = useState<MiniAnimeCard[]>([]);
  const [upcoming, setUpcoming] = useState<MiniAnimeCard[]>([]);
  const [watchNow, setWatchNow] = useState<MiniAnimeCard[]>([]);
  const [continueWatching, setContinueWatching] = useState<HomeContinueItem[]>([]);
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
    } catch {
      // Keep the already-rendered data during transient network failures.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const heroItems = useMemo(() => (seasonal.length ? seasonal : top).slice(0, 5), [seasonal, top]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.textPrimary} /></View>;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.textPrimary} />}
    >
      <View style={styles.header}>
        <View>
          <View style={styles.brandRow}><Text style={styles.brand}>AniVault</Text><View style={styles.brandBadge}><Text style={styles.brandBadgeText}>ANIME</Text></View></View>
          <Text style={styles.tagline}>Discover trending series & movies</Text>
        </View>
      </View>

      {heroItems.length > 0 && <Hero items={heroItems} />}

      {continueWatching.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Continue Watching</Text></View>
          <FlatList horizontal data={continueWatching} keyExtractor={(item) => `${item.animeId}-${item.episodeNum}`} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowContent} renderItem={({ item }) => <ContinueCard item={item} />} />
        </View>
      )}

      <Section title="This Season" data={seasonal} />
      <Section title="Watch Now" data={watchNow} onSeeAll={() => navigation.navigate('WatchNow')} />
      <Section title="Trending Now" data={top} />
      <Section title="Anticipated Upcoming" data={upcoming} />

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { paddingBottom: 20 },
  center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brand: { color: '#fff', fontFamily: fonts.display, fontSize: 24, letterSpacing: -0.5 },
  brandBadge: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  brandBadgeText: { color: 'rgba(255,255,255,0.9)', fontFamily: fonts.bodySemibold, fontSize: 8, letterSpacing: 1.2 },
  tagline: { color: 'rgba(255,255,255,0.45)', fontFamily: fonts.body, fontSize: 11, marginTop: 4 },
  heroWrap: { marginTop: 12, alignItems: 'center' },
  hero: { width: SCREEN_WIDTH - 32, height: 210, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: '#0f0f14' },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.58)' },
  heroContent: { flex: 1, flexDirection: 'row', padding: 20, alignItems: 'center' },
  heroCopy: { flex: 1, height: '100%', justifyContent: 'space-between', paddingVertical: 1 },
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 1 },
  badgeScore: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 9 },
  heroTitle: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 19, lineHeight: 24, marginTop: 10, letterSpacing: -0.4 },
  heroSub: { color: 'rgba(255,255,255,0.52)', fontFamily: fonts.body, fontSize: 10, marginTop: 5 },
  watchButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9 },
  playIcon: { color: '#000', fontSize: 12 },
  watchText: { color: '#000', fontFamily: fonts.bodyBold, fontSize: 11 },
  heroPoster: { width: 115, height: 168, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', marginLeft: 16 },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 14 },
  dot: { height: 4, borderRadius: 3 },
  dotActive: { width: 24, backgroundColor: '#fff' },
  dotInactive: { width: 6, backgroundColor: 'rgba(255,255,255,0.20)' },
  section: { marginTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  sectionTitle: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 18, letterSpacing: -0.2 },
  seeAll: { color: 'rgba(255,255,255,0.55)', fontFamily: fonts.bodyMedium, fontSize: 11 },
  rowContent: { paddingHorizontal: 20 },
  card: { marginRight: 12 },
  poster: { borderRadius: 10, backgroundColor: '#141414' },
  cardTitle: { color: 'rgba(255,255,255,0.88)', fontFamily: fonts.bodyMedium, fontSize: 11, lineHeight: 15, marginTop: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3 },
  meta: { color: 'rgba(255,255,255,0.38)', fontFamily: fonts.body, fontSize: 9 },
  score: { color: 'rgba(255,255,255,0.60)', fontFamily: fonts.bodyMedium, fontSize: 9 },
  continueCard: { width: 150, marginRight: 12 },
  continueImage: { width: 150, height: 96, borderRadius: 10, backgroundColor: '#141414' },
  progressTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 2, marginTop: 5 },
  progressFill: { height: 3, backgroundColor: '#fff', borderRadius: 2 },
  continueTitle: { color: '#fff', fontFamily: fonts.bodyMedium, fontSize: 11, marginTop: 6 },
  continueEp: { color: 'rgba(255,255,255,0.40)', fontFamily: fonts.body, fontSize: 9, marginTop: 2 },
  bottomSpace: { height: 16 },
});
