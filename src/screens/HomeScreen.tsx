import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getHome, HomeContinueItem, MiniAnimeCard } from '../api/content';
import { AnimePosterCard, GlassCard, SectionTitle, SiteHeader } from '../components/AniVaultUI';
import { colors, fonts, radius } from '../theme';

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
      setSeasonal(res.seasonal ?? []); setTop(res.top ?? []); setUpcoming(res.upcoming ?? []);
      setWatchNow(res.watchNow ?? []); setContinueWatching(res.continueWatching ?? []);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.root}>
      <SiteHeader title="Home" onSearch={() => navigation.navigate('Browse')} onProfile={() => navigation.navigate('Profile')} />
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />} showsVerticalScrollIndicator={false}>
        {loading ? <View style={styles.loading}><Text style={styles.loadingText}>LOADING ANIVAULT...</Text></View> : (
          <>
            {continueWatching.length > 0 && <ContinueRow data={continueWatching} onPress={(item) => navigation.navigate('Watch', { animeId: item.animeId, episodeNum: item.episodeNum, title: item.title })} />}
            <PosterRow title="This Season" data={seasonal} onPress={(item) => navigation.navigate('AnimeDetail', { id: item.id, title: item.title })} />
            {watchNow.length > 0 && <PosterRow title="Watch Now" data={watchNow} action="See all" onAction={() => navigation.navigate('WatchNow')} onPress={(item) => navigation.navigate('AnimeDetail', { id: item.id, title: item.title })} />}
            <PosterRow title="Top Anime" data={top} onPress={(item) => navigation.navigate('AnimeDetail', { id: item.id, title: item.title })} />
            <PosterRow title="Upcoming" data={upcoming} onPress={(item) => navigation.navigate('AnimeDetail', { id: item.id, title: item.title })} />
            <View style={{ height: 34 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function PosterRow({ title, data, action, onAction, onPress }: { title: string; data: MiniAnimeCard[]; action?: string; onAction?: () => void; onPress: (item: MiniAnimeCard) => void }) {
  return <View><SectionTitle action={action} onAction={onAction}>{title}</SectionTitle><FlatList horizontal data={data} keyExtractor={(x) => String(x.id)} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} renderItem={({ item }) => <AnimePosterCard title={item.title} image={item.image} subtitle={item.score ? `★ ${item.score}` : item.type} onPress={() => onPress(item)} />} /></View>;
}

function ContinueRow({ data, onPress }: { data: HomeContinueItem[]; onPress: (item: HomeContinueItem) => void }) {
  return <View><SectionTitle>Continue Watching</SectionTitle><FlatList horizontal data={data} keyExtractor={(x) => `${x.animeId}-${x.episodeNum}`} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} renderItem={({ item }) => {
    const pct = item.episodeDuration > 0 ? Math.min(1, item.watchTime / item.episodeDuration) : 0;
    return <Pressable onPress={() => onPress(item)} style={styles.continueCard}>
      <GlassCard style={styles.continueInner}>
        <Image source={{ uri: item.epThumb ?? item.image }} style={styles.continueImage} contentFit="cover" />
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${pct * 100}%` }]} /></View>
        <Text style={styles.continueTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.continueEp}>Episode {item.episodeNum}{item.epTitle ? ` · ${item.epTitle}` : ''}</Text>
      </GlassCard>
    </Pressable>;
  }} /></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase },
  loading: { minHeight: 420, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.textMuted, fontFamily: fonts.displayMedium, fontSize: 11, letterSpacing: 1.4 },
  row: { paddingHorizontal: 16 },
  continueCard: { width: 210, marginRight: 12 },
  continueInner: { overflow: 'hidden' },
  continueImage: { width: '100%', height: 118, backgroundColor: colors.bgSurface },
  progressTrack: { height: 3, backgroundColor: colors.bgHover },
  progressFill: { height: 3, backgroundColor: colors.accent },
  continueTitle: { color: colors.textPrimary, fontFamily: fonts.bodyMedium, fontSize: 12, paddingHorizontal: 10, marginTop: 8 },
  continueEp: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 10, paddingHorizontal: 10, paddingBottom: 10, marginTop: 2 },
});
