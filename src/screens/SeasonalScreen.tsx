import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getSeasonal, DiscoveryCard } from '../api/content';
import { WebAnimeCard, WebFooter, WebHeader, WebSectionHeader } from '../components/WebChrome';
import { colors, fonts, radius } from '../theme';

export default function SeasonalScreen() {
  const navigation = useNavigation<any>();
  const { width: screenWidth } = useWindowDimensions();
  const [mode, setMode] = useState<'now' | 'upcoming'>('now');
  const [items, setItems] = useState<DiscoveryCard[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardWidth = Math.max(96, Math.floor((screenWidth - 24 - 16) / 3));

  const load = useCallback(async (m: 'now' | 'upcoming', p = 1, append = false) => {
    setLoading(true);
    setError(null);
    try {
      const r = await getSeasonal(m, p);
      setItems(v => append ? [...v, ...r.data] : r.data);
      setPage(p);
      setHasNext(!!r.pagination?.has_next_page);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load seasonal anime.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(mode); }, [mode, load]);

  const refresh = async () => {
    setRefreshing(true);
    await load(mode);
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <WebHeader navigation={navigation} routeName="Seasonal" />
      <FlatList
        data={items}
        numColumns={3}
        keyExtractor={x => String(x.id)}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              <View style={styles.heroCopy}>
                <Text style={styles.kicker}>DISCOVER</Text>
                <Text style={styles.title}>Seasonal Anime</Text>
                <Text style={styles.subtitle}>{mode === 'now' ? 'Airing this season' : 'Coming next season'}</Text>
              </View>
              <View style={styles.heroIcon}><Ionicons name="flame-outline" size={26} color={colors.accent} /></View>
            </View>
            <View style={styles.tabs}>
              {([['now', 'Airing Now'], ['upcoming', 'Upcoming']] as const).map(([v, l]) => (
                <Pressable key={v} onPress={() => setMode(v)} style={({ pressed }) => [styles.tab, mode === v && styles.tabActive, pressed && styles.pressed]}>
                  <Text style={[styles.tabText, mode === v && styles.tabTextActive]}>{l}</Text>
                </Pressable>
              ))}
            </View>
            <WebSectionHeader title={mode === 'now' ? 'Airing This Season' : 'Coming Soon'} action={loading && items.length ? 'Loading…' : undefined} />
            {error ? <View style={styles.error}><Ionicons name="cloud-offline-outline" size={17} color={colors.accent} /><Text style={styles.errorText}>{error}</Text></View> : null}
          </View>
        }
        onEndReached={() => { if (!loading && hasNext) load(mode, page + 1, true); }}
        onEndReachedThreshold={0.55}
        ListEmptyComponent={!loading ? <View style={styles.empty}><Ionicons name="film-outline" size={40} color={colors.textMuted} /><Text style={styles.emptyTitle}>Nothing here yet</Text><Text style={styles.emptyText}>Try refreshing in a moment.</Text></View> : null}
        ListFooterComponent={<>{loading ? <ActivityIndicator color={colors.accent} style={{ margin: 18 }} /> : null}<WebFooter /></>}
        renderItem={({ item }) => (
          <View style={[styles.card, { width: cardWidth }]}>
            <WebAnimeCard title={item.title} image={item.image} score={item.score} type={item.type} episodes={item.episodes} status={item.userStatus} width={cardWidth} onPress={() => navigation.navigate('AnimeDetail', { id: item.id, title: item.title })} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  hero: { minHeight: 104, paddingHorizontal: 17, paddingTop: 17, paddingBottom: 12, backgroundColor: colors.bgSurface, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroCopy: { flex: 1 },
  kicker: { color: colors.accent, fontFamily: fonts.displayMedium, fontSize: 8, letterSpacing: 1.8 },
  title: { color: colors.textPrimary, fontFamily: fonts.display, fontSize: 21, marginTop: 5 },
  subtitle: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 11, marginTop: 4 },
  heroIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.borderAccent, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, gap: 7, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgSurface },
  tabActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  pressed: { opacity: 0.72 },
  tabText: { color: colors.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 10.5 },
  tabTextActive: { color: '#fff' },
  grid: { paddingHorizontal: 12, paddingBottom: 0 },
  row: { justifyContent: 'flex-start', gap: 8, marginBottom: 0 },
  card: { paddingHorizontal: 0, marginRight: 0, marginBottom: 16 },
  error: { margin: 12, padding: 10, borderWidth: 1, borderColor: colors.borderAccent, borderRadius: 8, backgroundColor: colors.bgSurface, flexDirection: 'row', gap: 8, alignItems: 'center' },
  errorText: { flex: 1, color: colors.textSecondary, fontFamily: fonts.body, fontSize: 11 },
  empty: { alignItems: 'center', paddingTop: 65, paddingHorizontal: 30 },
  emptyTitle: { color: colors.textPrimary, fontFamily: fonts.displayMedium, fontSize: 15, marginTop: 12 },
  emptyText: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 11, textAlign: 'center', marginTop: 5 },
});
