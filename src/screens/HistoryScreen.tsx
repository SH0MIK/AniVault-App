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
    try { const res = await getHistory(pageNum); setItems(prev => append ? [...prev, ...res.data] : res.data); setTotalPages(res.totalPages); setPage(pageNum); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(1, false); }, [load]);
  return (
    <FlatList style={styles.container} data={items} keyExtractor={(item, i) => `${item.animeId}-${item.episodeNum}-${i}`} contentContainerStyle={styles.list}
      onEndReached={() => { if (!loading && page < totalPages) load(page + 1, true); }} onEndReachedThreshold={0.5}
      ListHeaderComponent={<View style={styles.header}><Text style={styles.kicker}>MY SPACE</Text><Text style={styles.heading}>Watch History</Text><Text style={styles.subheading}>Pick up where you left off.</Text></View>}
      ListFooterComponent={loading ? <ActivityIndicator color={colors.accent} style={{ margin: 18 }} /> : null}
      ListEmptyComponent={!loading ? <View style={styles.empty}><View style={styles.emptyIcon}><Text style={styles.emptyIconText}>▶</Text></View><Text style={styles.emptyTitle}>Nothing here yet</Text><Text style={styles.emptyText}>Episodes you watch will appear here.</Text></View> : null}
      renderItem={({ item }) => (
        <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={() => navigation.navigate('AnimeDetail', { id: item.animeId, title: item.title })}>
          <Image source={{ uri: item.epThumb ?? item.image }} style={styles.thumb} contentFit="cover" />
          <View style={styles.info}><Text style={styles.title} numberOfLines={1}>{item.title}</Text><View style={styles.metaRow}><Text style={styles.episode}>EP {item.episodeNum}</Text><Text style={styles.time}>{new Date(item.watchedAt).toLocaleDateString()}</Text></View><View style={styles.progress}><View style={styles.progressFill} /></View></View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      )}
    />
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase }, list: { padding: 16, paddingBottom: 30 },
  header: { marginBottom: 16 }, kicker: { color: colors.textMuted, fontSize: 9, letterSpacing: 2, fontFamily: fonts.bodySemibold }, heading: { color: colors.textPrimary, fontSize: 25, fontFamily: fonts.bodySemibold, marginTop: 4 }, subheading: { color: colors.textMuted, fontSize: 12, fontFamily: fonts.body, marginTop: 3 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 9, marginBottom: 9, gap: 11, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md }, pressed: { opacity: 0.72 },
  thumb: { width: 108, height: 64, borderRadius: radius.sm, backgroundColor: colors.bgSurface }, info: { flex: 1, minWidth: 0 }, title: { color: colors.textPrimary, fontSize: 13, fontFamily: fonts.bodyMedium }, metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 }, episode: { color: colors.textSecondary, fontSize: 10, fontFamily: fonts.bodySemibold }, time: { color: colors.textMuted, fontSize: 10, fontFamily: fonts.body }, progress: { height: 2, backgroundColor: colors.bgHover, marginTop: 9, borderRadius: 2, overflow: 'hidden' }, progressFill: { width: '42%', height: 2, backgroundColor: colors.accent }, chevron: { color: colors.textMuted, fontSize: 24, fontWeight: '300' },
  empty: { alignItems: 'center', paddingVertical: 70 }, emptyIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }, emptyIconText: { color: colors.textMuted, fontSize: 16 }, emptyTitle: { color: colors.textPrimary, fontSize: 15, fontFamily: fonts.bodySemibold }, emptyText: { color: colors.textMuted, fontSize: 12, fontFamily: fonts.body, marginTop: 4 },
});
