import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { browse, BrowseItem, BrowseResult } from '../api/content';
import { colors, radius, fonts } from '../theme';

export default function BrowseScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<BrowseItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [genres, setGenres] = useState<BrowseResult['genres']>([]);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);

  const load = useCallback(async (q: string, pageNum: number, append: boolean, genreIds: number[]) => {
    setLoading(true);
    setError(null);
    try {
      const res = await browse({ q, page: pageNum, genres: genreIds });
      setItems((prev) => (append ? [...prev, ...res.data] : res.data));
      setHasNext(!!res.pagination?.has_next_page);
      setPage(pageNum);
      if (res.genres?.length) setGenres(res.genres);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load('', 1, false, []);
  }, [load]);

  const onSubmitSearch = () => load(query.trim(), 1, false, selectedGenres);
  const onLoadMore = () => {
    if (!loading && hasNext) load(query.trim(), page + 1, true, selectedGenres);
  };
  const onToggleGenre = (genreId: number) => {
    const next = selectedGenres.includes(genreId) ? selectedGenres.filter((g) => g !== genreId) : [...selectedGenres, genreId];
    setSelectedGenres(next);
    load(query.trim(), 1, false, next);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search anime..."
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={onSubmitSearch}
        returnKeyType="search"
      />
      {error && <Text style={styles.error}>{error}</Text>}
      {genres.length > 0 && (
        <FlatList
          horizontal
          data={genres}
          keyExtractor={(g) => String(g.mal_id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.genreBar}
          renderItem={({ item }) => {
            const active = selectedGenres.includes(item.mal_id);
            return (
              <Pressable style={[styles.genreChip, active && styles.genreChipActive]} onPress={() => onToggleGenre(item.mal_id)}>
                <Text style={[styles.genreChipText, active && styles.genreChipTextActive]}>{item.name}</Text>
              </Pressable>
            );
          }}
        />
      )}
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        numColumns={3}
        contentContainerStyle={styles.grid}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator color={colors.accent} style={{ margin: 16 }} /> : null}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('AnimeDetail', { id: item.id, title: item.title })}
          >
            <Image source={{ uri: item.image }} style={styles.poster} contentFit="cover" />
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            {item.userStatus && <View style={styles.badge}><Text style={styles.badgeText}>{item.userStatus}</Text></View>}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  search: {
    backgroundColor: colors.bgCard, color: colors.textPrimary, margin: 12, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontFamily: fonts.body,
  },
  grid: { paddingHorizontal: 8, paddingBottom: 24 },
  card: { flex: 1 / 3, margin: 4 },
  poster: { width: '100%', aspectRatio: 2 / 3, borderRadius: radius.sm, backgroundColor: colors.bgCard },
  cardTitle: { color: colors.textSecondary, fontSize: 11, marginTop: 4, fontFamily: fonts.body },
  badge: { position: 'absolute', top: 6, left: 6, backgroundColor: colors.accent, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 9, fontFamily: fonts.bodySemibold },
  error: { color: colors.accent, marginHorizontal: 12, marginBottom: 8, fontFamily: fonts.body },
  genreBar: { paddingHorizontal: 12, paddingBottom: 10, gap: 8, flexDirection: 'row' },
  genreChip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard, borderRadius: radius.lg, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
  genreChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  genreChipText: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.bodyMedium },
  genreChipTextActive: { color: '#fff' },
});
