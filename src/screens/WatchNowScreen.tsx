import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { getWatchNow, MiniAnimeCard } from '../api/content';
import { colors, radius, fonts } from '../theme';

export default function WatchNowScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<MiniAnimeCard[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (pageNum: number, append: boolean) => {
    setLoading(true);
    try {
      const res = await getWatchNow(pageNum);
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
      keyExtractor={(item) => String(item.id)}
      numColumns={3}
      contentContainerStyle={styles.grid}
      onEndReached={() => { if (!loading && page < totalPages) load(page + 1, true); }}
      onEndReachedThreshold={0.5}
      ListFooterComponent={loading ? <ActivityIndicator color={colors.accent} style={{ margin: 16 }} /> : null}
      renderItem={({ item }) => (
        <Pressable style={styles.card} onPress={() => navigation.navigate('AnimeDetail', { id: item.id, title: item.title })}>
          <Image source={{ uri: item.image }} style={styles.poster} contentFit="cover" />
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  grid: { paddingHorizontal: 8, paddingVertical: 8 },
  card: { flex: 1 / 3, margin: 4 },
  poster: { width: '100%', aspectRatio: 2 / 3, borderRadius: radius.sm, backgroundColor: colors.bgCard },
  cardTitle: { color: colors.textSecondary, fontSize: 11, marginTop: 4, fontFamily: fonts.body },
});
