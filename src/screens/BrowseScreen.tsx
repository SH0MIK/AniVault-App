import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { browse, BrowseItem, BrowseResult } from '../api/content';
import { colors, radius, fonts } from '../theme';

export default function BrowseScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [items, setItems] = useState<BrowseItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [genres, setGenres] = useState<BrowseResult['genres']>([]);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [status, setStatus] = useState('');

  const load = useCallback(async (q: string, pageNum: number, append: boolean, genreIds: number[], statusValue: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await browse({ q, page: pageNum, genres: genreIds, status: statusValue || undefined });
      setItems((prev) => (append ? [...prev, ...res.data] : res.data));
      setHasNext(!!res.pagination?.has_next_page);
      setPage(pageNum);
      if (res.genres?.length) setGenres(res.genres);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load anime.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load('', 1, false, [], ''); }, [load]);

  const runSearch = () => {
    const next = query.trim();
    setSubmittedQuery(next);
    load(next, 1, false, selectedGenres, status);
  };

  const clearSearch = () => {
    setQuery('');
    setSubmittedQuery('');
    load('', 1, false, selectedGenres, status);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load(submittedQuery, 1, false, selectedGenres, status);
    setRefreshing(false);
  };

  const onLoadMore = () => {
    if (!loading && hasNext) load(submittedQuery, page + 1, true, selectedGenres, status);
  };

  const onToggleGenre = (genreId: number) => {
    const next = selectedGenres.includes(genreId) ? selectedGenres.filter((g) => g !== genreId) : [...selectedGenres, genreId];
    setSelectedGenres(next);
    load(submittedQuery, 1, false, next, status);
  };

  const statuses = useMemo(() => [
    { value: '', label: 'All' },
    { value: 'airing', label: 'Airing' },
    { value: 'complete', label: 'Completed' },
    { value: 'upcoming', label: 'Upcoming' },
  ], []);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search anime..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={runSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={clearSearch} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.filterHeader}>
        <Text style={styles.heading}>{submittedQuery ? `Results for “${submittedQuery}”` : 'Browse Anime'}</Text>
        {loading && items.length > 0 && <ActivityIndicator color={colors.accent} size="small" />}
      </View>

      <FlatList
        horizontal
        data={statuses}
        keyExtractor={(s) => s.value || 'all'}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBar}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.filterChip, status === item.value && styles.filterChipActive]}
            onPress={() => { setStatus(item.value); load(submittedQuery, 1, false, selectedGenres, item.value); }}
          >
            <Text style={[styles.filterText, status === item.value && styles.filterTextActive]}>{item.label}</Text>
          </Pressable>
        )}
      />

      {genres.length > 0 && (
        <FlatList
          horizontal
          data={genres}
          keyExtractor={(g) => String(g.mal_id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
          renderItem={({ item }) => {
            const active = selectedGenres.includes(item.mal_id);
            return (
              <Pressable style={[styles.genreChip, active && styles.genreChipActive]} onPress={() => onToggleGenre(item.mal_id)}>
                <Text style={[styles.genreText, active && styles.filterTextActive]}>{item.name}</Text>
              </Pressable>
            );
          }}
        />
      )}

      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="cloud-offline-outline" size={18} color={colors.accent} />
          <Text style={styles.error}>{error}</Text>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        numColumns={3}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.column}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <Ionicons name="film-outline" size={42} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No anime found</Text>
            <Text style={styles.emptyText}>Try another title, genre, or filter.</Text>
          </View>
        ) : null}
        ListFooterComponent={loading && items.length === 0 ? <ActivityIndicator color={colors.accent} style={{ marginTop: 30 }} /> : loading ? <ActivityIndicator color={colors.accent} style={{ margin: 16 }} /> : null}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => navigation.navigate('AnimeDetail', { id: item.id, title: item.title })}>
            <View style={styles.posterWrap}>
              <Image source={{ uri: item.image }} style={styles.poster} contentFit="cover" transition={150} />
              {item.userStatus && <View style={styles.badge}><Text style={styles.badgeText}>{item.userStatus}</Text></View>}
              {item.score != null && <View style={styles.score}><Ionicons name="star" size={9} color="#fff" /><Text style={styles.scoreText}>{item.score.toFixed(1)}</Text></View>}
            </View>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.meta} numberOfLines={1}>{item.type || 'Anime'}{item.episodes ? ` • ${item.episodes} eps` : ''}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  topBar: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 },
  searchWrap: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12 },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 14, fontFamily: fonts.body, paddingVertical: 0 },
  filterHeader: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { color: colors.textPrimary, fontSize: 17, fontFamily: fonts.displayMedium },
  filterBar: { paddingHorizontal: 12, paddingVertical: 7, gap: 8 },
  filterChip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard, borderRadius: radius.lg, paddingHorizontal: 13, paddingVertical: 7, marginRight: 7 },
  filterChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterText: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.bodyMedium },
  filterTextActive: { color: '#fff' },
  genreChip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgSurface, borderRadius: radius.lg, paddingHorizontal: 12, paddingVertical: 6, marginRight: 7 },
  genreChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  genreText: { color: colors.textSecondary, fontSize: 11, fontFamily: fonts.bodyMedium },
  errorBox: { marginHorizontal: 12, marginVertical: 6, padding: 10, flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  error: { flex: 1, color: colors.textSecondary, fontSize: 12, fontFamily: fonts.body },
  grid: { paddingHorizontal: 8, paddingBottom: 28 },
  column: { gap: 0 },
  card: { width: '33.333%', paddingHorizontal: 4, marginBottom: 13 },
  posterWrap: { position: 'relative' },
  poster: { width: '100%', aspectRatio: 2 / 3, borderRadius: radius.sm, backgroundColor: colors.bgCard },
  cardTitle: { color: colors.textPrimary, fontSize: 11.5, lineHeight: 15, marginTop: 5, fontFamily: fonts.bodyMedium },
  meta: { color: colors.textMuted, fontSize: 9.5, marginTop: 2, fontFamily: fonts.body },
  badge: { position: 'absolute', top: 6, left: 6, backgroundColor: colors.accent, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 8.5, fontFamily: fonts.bodySemibold },
  score: { position: 'absolute', right: 6, bottom: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.78)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 3 },
  scoreText: { color: '#fff', fontSize: 8.5, fontFamily: fonts.bodySemibold },
  empty: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 30 },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontFamily: fonts.displayMedium, marginTop: 12 },
  emptyText: { color: colors.textMuted, fontSize: 12, fontFamily: fonts.body, marginTop: 5, textAlign: 'center' },
});