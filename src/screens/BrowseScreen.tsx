import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
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
  const [grid, setGrid] = useState(true);

  const load = useCallback(async (q: string, pageNum: number, append: boolean, genreIds: number[]) => {
    setLoading(true); setError(null);
    try {
      const res = await browse({ q, page: pageNum, genres: genreIds });
      setItems(prev => append ? [...prev, ...res.data] : res.data);
      setHasNext(!!res.pagination?.has_next_page); setPage(pageNum);
      if (res.genres?.length) setGenres(res.genres);
    } catch (err: any) { setError(err.message ?? 'Failed to load.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load('', 1, false, []); }, [load]);
  const submit = () => load(query.trim(), 1, false, selectedGenres);
  const loadMore = () => { if (!loading && hasNext) load(query.trim(), page + 1, true, selectedGenres); };
  const toggleGenre = (id: number) => {
    const next = selectedGenres.includes(id) ? selectedGenres.filter(g => g !== id) : [...selectedGenres, id];
    setSelectedGenres(next); load(query.trim(), 1, false, next);
  };

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput style={styles.search} placeholder="Search anime..." placeholderTextColor={colors.textMuted} value={query} onChangeText={setQuery} onSubmitEditing={submit} returnKeyType="search" />
          {query.length > 0 && <Pressable onPress={() => { setQuery(''); load('', 1, false, selectedGenres); }}><Ionicons name="close-circle" size={18} color={colors.textMuted} /></Pressable>}
        </View>
        <Pressable style={styles.iconButton} onPress={() => setGrid(v => !v)}><Ionicons name={grid ? 'list-outline' : 'grid-outline'} size={20} color={colors.textPrimary} /></Pressable>
      </View>
      <View style={styles.headingRow}><View><Text style={styles.heading}>Explore</Text><Text style={styles.subheading}>{items.length ? `${items.length}${hasNext ? '+' : ''} titles` : 'Discover your next series'}</Text></View></View>
      {error && <Text style={styles.error}>{error}</Text>}
      {genres.length > 0 && <FlatList horizontal data={genres} keyExtractor={g => String(g.mal_id)} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreBar} renderItem={({ item }) => {
        const active = selectedGenres.includes(item.mal_id);
        return <Pressable style={[styles.genreChip, active && styles.genreChipActive]} onPress={() => toggleGenre(item.mal_id)}><Text style={[styles.genreText, active && styles.genreTextActive]}>{item.name}</Text></Pressable>;
      }} />}
      <FlatList
        data={items} keyExtractor={item => String(item.id)} numColumns={grid ? 3 : 1} key={grid ? 'grid' : 'list'}
        contentContainerStyle={styles.content} columnWrapperStyle={grid ? styles.row : undefined}
        onEndReached={loadMore} onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator color={colors.accent} style={{ margin: 18 }} /> : null}
        renderItem={({ item }) => grid ? (
          <Pressable style={styles.card} onPress={() => navigation.navigate('AnimeDetail', { id: item.id, title: item.title })}>
            <View><Image source={{ uri: item.image }} style={styles.poster} contentFit="cover" /><View style={styles.score}><Ionicons name="star" size={9} color="#000" /><Text style={styles.scoreText}>{item.score ?? '—'}</Text></View></View>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.cardMeta}>{item.type} · {item.episodes || '?'} eps</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.listCard} onPress={() => navigation.navigate('AnimeDetail', { id: item.id, title: item.title })}>
            <Image source={{ uri: item.image }} style={styles.listPoster} contentFit="cover" />
            <View style={styles.listInfo}><Text style={styles.listTitle} numberOfLines={2}>{item.title}</Text><Text style={styles.cardMeta}>{item.type} · {item.episodes || '?'} eps</Text>{item.score != null && <Text style={styles.listScore}>★ {item.score}</Text>}</View><Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  top: { flexDirection: 'row', padding: 14, gap: 8, alignItems: 'center' },
  searchWrap: { flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12 },
  search: { flex: 1, color: colors.textPrimary, fontFamily: fonts.body, fontSize: 14, paddingVertical: 0 },
  iconButton: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCard },
  headingRow: { paddingHorizontal: 16, marginBottom: 10 }, heading: { color: colors.textPrimary, fontSize: 23, fontFamily: fonts.display }, subheading: { color: colors.textMuted, fontSize: 11, marginTop: 3, fontFamily: fonts.body },
  error: { color: colors.accent, marginHorizontal: 16, marginBottom: 8, fontFamily: fonts.body },
  genreBar: { paddingHorizontal: 14, paddingBottom: 12 },
  genreChip: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 7, marginRight: 7 }, genreChipActive: { backgroundColor: colors.accent, borderColor: colors.accent }, genreText: { color: colors.textSecondary, fontSize: 11, fontFamily: fonts.bodyMedium }, genreTextActive: { color: '#000', fontFamily: fonts.bodyBold },
  content: { paddingHorizontal: 10, paddingBottom: 30 }, row: { gap: 8 },
  card: { width: '31.8%', marginBottom: 14 }, poster: { width: '100%', aspectRatio: 2 / 3, borderRadius: radius.sm, backgroundColor: colors.bgCard }, cardTitle: { color: colors.textPrimary, fontSize: 11, marginTop: 6, fontFamily: fonts.bodyMedium }, cardMeta: { color: colors.textMuted, fontSize: 9, marginTop: 2, fontFamily: fonts.body },
  score: { position: 'absolute', left: 5, top: 5, flexDirection: 'row', gap: 2, alignItems: 'center', backgroundColor: '#fff', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 3 }, scoreText: { color: '#000', fontSize: 9, fontFamily: fonts.bodyBold },
  listCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 7, marginBottom: 8 }, listPoster: { width: 62, height: 88, borderRadius: radius.sm }, listInfo: { flex: 1, paddingHorizontal: 11 }, listTitle: { color: colors.textPrimary, fontSize: 14, fontFamily: fonts.bodyMedium }, listScore: { color: colors.textSecondary, fontSize: 10, marginTop: 5, fontFamily: fonts.body },
});
