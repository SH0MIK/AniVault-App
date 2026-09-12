import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getHome, HomeContinueItem, MiniAnimeCard } from '../api/content';
import AnimeCardRow from '../components/AnimeCardRow';
import { colors, radius, fonts } from '../theme';

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
      setSeasonal(res.seasonal);
      setTop(res.top);
      setUpcoming(res.upcoming);
      setWatchNow(res.watchNow);
      setContinueWatching(res.continueWatching);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />}
    >
      {continueWatching.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Continue Watching</Text>
          <FlatList
            horizontal
            data={continueWatching}
            keyExtractor={(item) => `${item.animeId}-${item.episodeNum}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12 }}
            renderItem={({ item }) => {
              const pct = item.episodeDuration > 0 ? Math.min(1, item.watchTime / item.episodeDuration) : 0;
              return (
                <Pressable style={styles.continueCard} onPress={() => navigation.navigate('AnimeDetail', { id: item.animeId, title: item.title })}>
                  <Image source={{ uri: item.epThumb ?? item.image }} style={styles.continuePoster} contentFit="cover" />
                  <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${pct * 100}%` }]} /></View>
                  <Text style={styles.continueTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.continueEp}>Episode {item.episodeNum}</Text>
                </Pressable>
              );
            }}
          />
        </View>
      )}

      <AnimeCardRow title="This Season" data={seasonal} />

      {watchNow.length > 0 && (
        <View style={styles.section}>
          <View style={styles.rowHeader}>
            <Text style={styles.sectionTitle}>Watch Now</Text>
            <Pressable onPress={() => navigation.navigate('WatchNow')}><Text style={styles.seeAll}>See All</Text></Pressable>
          </View>
          <FlatList
            horizontal
            data={watchNow}
            keyExtractor={(item) => String(item.id)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12 }}
            renderItem={({ item }) => (
              <Pressable style={styles.card} onPress={() => navigation.navigate('AnimeDetail', { id: item.id, title: item.title })}>
                <Image source={{ uri: item.image }} style={styles.poster} contentFit="cover" />
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              </Pressable>
            )}
          />
        </View>
      )}

      <AnimeCardRow title="Top Anime" data={top} />
      <AnimeCardRow title="Upcoming" data={upcoming} />

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  center: { flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center' },
  section: { marginTop: 16 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  sectionTitle: { color: colors.textPrimary, fontSize: 16, fontFamily: fonts.displayMedium, marginBottom: 10 },
  seeAll: { color: colors.accent, fontSize: 12, fontFamily: fonts.bodyMedium },
  continueCard: { width: 140, marginRight: 12 },
  continuePoster: { width: 140, height: 90, borderRadius: radius.sm, backgroundColor: colors.bgCard },
  progressTrack: { height: 3, backgroundColor: colors.bgHover, borderRadius: 2, marginTop: 4 },
  progressFill: { height: 3, backgroundColor: colors.accent, borderRadius: 2 },
  continueTitle: { color: colors.textPrimary, fontSize: 12, marginTop: 6, fontFamily: fonts.bodyMedium },
  continueEp: { color: colors.textMuted, fontSize: 11, fontFamily: fonts.body },
  card: { width: 110, marginRight: 10 },
  poster: { width: 110, height: 156, borderRadius: radius.sm, backgroundColor: colors.bgCard },
  cardTitle: { color: colors.textSecondary, fontSize: 11, marginTop: 4, fontFamily: fonts.body },
});
