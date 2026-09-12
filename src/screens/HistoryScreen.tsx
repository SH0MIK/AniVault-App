import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { getHistory, HistoryItem } from '../api/content';
import { colors, radius, fonts } from '../theme';

export default function HistoryScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (pageNum: number, append: boolean) => {
    setLoading(true);
    try {
      const res = await getHistory(pageNum);
      setItems((prev) => (append ? [...prev, ...res.data] : res.data));
      setTotalPages(res.totalPages);
      setPage(pageNum);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1, false); }, [load]);

  return (
    <FlatList
      style={styles.container}
      data={items}
      keyExtractor={(item, i) => `${item.animeId}-${item.episodeNum}-${i}`}
      contentContainerStyle={{ paddingVertical: 8 }}
      onEndReached={() => { if (!loading && page < totalPages) load(page + 1, true); }}
      onEndReachedThreshold={0.5}
      ListFooterComponent={loading ? <ActivityIndicator color={colors.accent} style={{ margin: 16 }} /> : null}
      ListEmptyComponent={!loading ? <View style={styles.emptyState}><Text style={styles.emptyText}>No watch history yet.</Text></View> : null}
      renderItem={({ item }) => (
        <Pressable style={styles.row} onPress={() => navigation.navigate('AnimeDetail', { id: item.animeId, title: item.title })}>
          <Image source={{ uri: item.epThumb ?? item.image }} style={styles.thumb} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.meta}>Episode {item.episodeNum}</Text>
            <Text style={styles.time}>{new Date(item.watchedAt).toLocaleDateString()}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 12 },
  thumb: { width: 100, height: 60, borderRadius: radius.sm, backgroundColor: colors.bgCard },
  title: { color: colors.textPrimary, fontSize: 13, fontFamily: fonts.bodyMedium },
  meta: { color: colors.textSecondary, fontSize: 12, marginTop: 2, fontFamily: fonts.body },
  time: { color: colors.textMuted, fontSize: 11, marginTop: 2, fontFamily: fonts.body },
  emptyState: { padding: 32, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 13, fontFamily: fonts.body },
});
