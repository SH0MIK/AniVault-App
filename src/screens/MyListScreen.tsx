// Fully offline: everything here reads straight from SQLite (listRepo /
// watchRepo), so this screen renders instantly with no loading spinner even
// with no connection — a pull-to-refresh is the only thing that touches
// the network, via fullSync.
import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl, SectionList } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getLocalList, LocalAnimeListEntry } from '../db/listRepo';
import { getRecentlyWatched, LocalWatchProgress } from '../db/watchRepo';
import { fullSync, isOnline } from '../db/sync';
import { useAuth } from '../auth/AuthContext';
import { colors, radius, fonts } from '../theme';

const STATUS_LABELS: Record<string, string> = {
  watching: 'Watching', completed: 'Completed', plan_to_watch: 'Plan to Watch', on_hold: 'On Hold', dropped: 'Dropped',
};
const STATUS_ORDER = ['watching', 'plan_to_watch', 'on_hold', 'completed', 'dropped'];

export default function MyListScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [continueWatching, setContinueWatching] = useState<LocalWatchProgress[]>([]);
  const [list, setList] = useState<LocalAnimeListEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);

  const reloadFromLocal = useCallback(() => {
    if (!user) return;
    setContinueWatching(getRecentlyWatched(user.id, 10));
    setList(getLocalList(user.id));
  }, [user]);

  // Local data reloads every time the tab regains focus (e.g. coming back
  // from marking an episode watched) — this is instant, no network.
  useFocusEffect(reloadFromLocal);

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    const online = await isOnline();
    setOffline(!online);
    if (online) {
      await fullSync(user.id).catch(() => {});
      reloadFromLocal();
    }
    setRefreshing(false);
  }, [user, reloadFromLocal]);

  const sections = STATUS_ORDER
    .map((status) => ({ title: STATUS_LABELS[status], data: list.filter((e) => e.status === status) }))
    .filter((s) => s.data.length > 0);

  return (
    <SectionList
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      ListHeaderComponent={
        <>
          {offline && (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineText}>Offline — showing your last synced list</Text>
            </View>
          )}
          {continueWatching.length > 0 && (
            <View style={styles.continueSection}>
              <Text style={styles.sectionHeader}>Continue Watching</Text>
              <FlatList
                horizontal
                data={continueWatching}
                keyExtractor={(item) => `${item.anime_id}-${item.episode_num}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 12 }}
                renderItem={({ item }) => {
                  const pct = item.episode_duration > 0 ? Math.min(1, item.watch_time / item.episode_duration) : 0;
                  return (
                    <Pressable
                      style={styles.continueCard}
                      onPress={() => navigation.navigate('AnimeDetail', { id: item.anime_id, title: item.anime_title ?? undefined })}
                    >
                      <Image source={{ uri: item.anime_image ?? undefined }} style={styles.continuePoster} contentFit="cover" />
                      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${pct * 100}%` }]} /></View>
                      <Text style={styles.continueTitle} numberOfLines={1}>{item.anime_title}</Text>
                      <Text style={styles.continueEp}>Episode {item.episode_num}</Text>
                    </Pressable>
                  );
                }}
              />
            </View>
          )}
        </>
      }
      sections={sections}
      keyExtractor={(item) => String(item.anime_id)}
      renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
      renderItem={({ item }) => (
        <Pressable
          style={styles.listRow}
          onPress={() => navigation.navigate('AnimeDetail', { id: item.anime_id, title: item.anime_title ?? undefined })}
        >
          <Image source={{ uri: item.anime_image ?? undefined }} style={styles.listPoster} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <Text style={styles.listTitle} numberOfLines={1}>{item.anime_title}</Text>
            <Text style={styles.listMeta}>
              {item.episodes_watched}{item.anime_episodes ? `/${item.anime_episodes}` : ''} episodes
              {item.score ? ` · ★ ${item.score}` : ''}
            </Text>
          </View>
        </Pressable>
      )}
      ListEmptyComponent={
        continueWatching.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Your list is empty. Browse to add something.</Text>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  offlineBanner: { backgroundColor: colors.bgSurface, paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.borderAccent },
  offlineText: { color: colors.gold, fontSize: 12, textAlign: 'center', fontFamily: fonts.body },
  continueSection: { paddingTop: 12 },
  sectionHeader: { color: colors.textPrimary, fontSize: 16, fontFamily: fonts.displayMedium, paddingHorizontal: 16, marginBottom: 8, marginTop: 8 },
  continueCard: { width: 140, marginRight: 12 },
  continuePoster: { width: 140, height: 90, borderRadius: radius.sm, backgroundColor: colors.bgCard },
  progressTrack: { height: 3, backgroundColor: colors.bgHover, borderRadius: 2, marginTop: 4 },
  progressFill: { height: 3, backgroundColor: colors.accent, borderRadius: 2 },
  continueTitle: { color: colors.textPrimary, fontSize: 12, marginTop: 6, fontFamily: fonts.bodyMedium },
  continueEp: { color: colors.textMuted, fontSize: 11, fontFamily: fonts.body },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 12 },
  listPoster: { width: 46, height: 64, borderRadius: radius.sm, backgroundColor: colors.bgCard },
  listTitle: { color: colors.textPrimary, fontSize: 14, fontFamily: fonts.bodyMedium },
  listMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2, fontFamily: fonts.body },
  emptyState: { padding: 32, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 13, textAlign: 'center', fontFamily: fonts.body },
});
