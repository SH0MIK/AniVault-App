import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getHistory, HistoryItem } from '../api/content';
import { getRecentlyWatched, LocalWatchProgress, mergeRemoteHistory } from '../db/watchRepo';
import { isOnline } from '../db/sync';
import { useAuth } from '../auth/AuthContext';
import { colors, radius, fonts } from '../theme';

function localToHistory(item: LocalWatchProgress): HistoryItem {
  return {
    animeId: item.anime_id,
    title: item.anime_title ?? 'Unknown anime',
    image: item.anime_image ?? '',
    episodeNum: item.episode_num,
    epTitle: item.ep_title,
    epThumb: item.ep_thumb,
    watchedAt: item.watched_at ?? new Date(0).toISOString(),
    watchTime: item.watch_time,
    episodeDuration: item.episode_duration,
  };
}

function remoteToLocal(userId: number, item: HistoryItem): LocalWatchProgress {
  return {
    user_id: userId,
    anime_id: item.animeId,
    anime_title: item.title,
    anime_image: item.image,
    episode_num: item.episodeNum,
    ep_title: item.epTitle,
    ep_thumb: item.epThumb,
    watch_time: item.watchTime,
    episode_duration: item.episodeDuration,
    watched_at: item.watchedAt,
  };
}

export default function HistoryScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);

  const reloadLocal = useCallback(() => {
    if (!user) return;
    setItems(getRecentlyWatched(user.id, 50).map(localToHistory));
  }, [user]);

  useFocusEffect(useCallback(() => {
    reloadLocal();
  }, [reloadLocal]));

  const refresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    const online = await isOnline();
    setOffline(!online);
    if (online) {
      try {
        // Pull the first server page into SQLite, but never replace newer
        // local progress. The local DB remains the UI source of truth.
        const res = await getHistory(1);
        mergeRemoteHistory(user.id, res.data.map((item) => remoteToLocal(user.id, item)));
        reloadLocal();
      } catch {
        // Keep the already-rendered local history.
      }
    }
    setRefreshing(false);
  }, [user, reloadLocal]);

  return (
    <FlatList
      style={styles.container}
      data={items}
      keyExtractor={(item) => `${item.animeId}-${item.episodeNum}-${item.watchedAt}`}
      contentContainerStyle={{ paddingVertical: 8, flexGrow: items.length ? 0 : 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
      ListHeaderComponent={offline ? <View style={styles.offlineBanner}><Text style={styles.offlineText}>Offline — showing locally saved history</Text></View> : null}
      ListEmptyComponent={<View style={styles.emptyState}><Text style={styles.emptyTitle}>No watch history yet</Text><Text style={styles.emptyText}>Episodes you watch will appear here and remain available offline.</Text></View>}
      renderItem={({ item }) => (
        <Pressable style={styles.row} onPress={() => navigation.navigate('Watch', { id: item.animeId, episode: item.episodeNum, title: item.title })}>
          <Image source={{ uri: item.epThumb ?? item.image }} style={styles.thumb} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.meta}>Episode {item.episodeNum}{item.epTitle ? ` · ${item.epTitle}` : ''}</Text>
            <Text style={styles.time}>{new Date(item.watchedAt).toLocaleDateString()}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  offlineBanner: { backgroundColor: colors.bgSurface, paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.borderAccent },
  offlineText: { color: colors.gold, fontSize: 12, textAlign: 'center', fontFamily: fonts.body },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 9, gap: 12 },
  thumb: { width: 104, height: 60, borderRadius: radius.sm, backgroundColor: colors.bgCard },
  title: { color: colors.textPrimary, fontSize: 13, fontFamily: fonts.bodyMedium },
  meta: { color: colors.textSecondary, fontSize: 12, marginTop: 3, fontFamily: fonts.body },
  time: { color: colors.textMuted, fontSize: 11, marginTop: 3, fontFamily: fonts.body },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontFamily: fonts.displayMedium },
  emptyText: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 8, fontFamily: fonts.body },
});
