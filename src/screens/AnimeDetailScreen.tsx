import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet, FlatList, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getAnimeDetail, getEpisodes, toggleFavorite, getAnimeCharacters, AnimeDetail, EpisodeItem } from '../api/content';
import { addOrUpdateLocal, getLocalEntry, removeLocal } from '../db/listRepo';
import { useAuth } from '../auth/AuthContext';
import { colors, radius, fonts } from '../theme';
import { Ionicons } from '@expo/vector-icons';
const STATUSES = [
  { key: 'watching', label: 'Watching' },
  { key: 'completed', label: 'Completed' },
  { key: 'plan_to_watch', label: 'Plan to Watch' },
  { key: 'on_hold', label: 'On Hold' },
  { key: 'dropped', label: 'Dropped' },
];

export default function AnimeDetailScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params as { id: number; title?: string };

  const [anime, setAnime] = useState<AnimeDetail | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [cast, setCast] = useState<{ id: number; name: string; image: string; role: string }[]>([]);
  const [localStatus, setLocalStatus] = useState<string | null>(null);
  const [myScore, setMyScore] = useState('');
  const [myReview, setMyReview] = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favBusy, setFavBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshLocalStatus = useCallback(() => {
    if (!user) return;
    const entry = getLocalEntry(user.id, id);
    setLocalStatus(entry?.status ?? null);
    setMyScore(entry?.score != null ? String(entry.score) : '');
    setMyReview(entry?.review ?? '');
  }, [user, id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [detailRes, epRes] = await Promise.all([getAnimeDetail(id), getEpisodes(id)]);
        setAnime(detailRes.anime);
        setIsFavorite(!!detailRes.isFavorite);
        setEpisodes(epRes.data ?? []);
        getAnimeCharacters(id).then((res) => setCast(res.data)).catch(() => {});
      } finally {
        setLoading(false);
      }
    })();
    refreshLocalStatus();
  }, [id, refreshLocalStatus]);

  const setStatus = (status: string) => {
    if (!user || !anime) return;
    const existing = getLocalEntry(user.id, anime.id);
    addOrUpdateLocal(user.id, {
      anime_id: anime.id,
      anime_title: anime.title,
      anime_image: anime.image,
      status,
      episodes_watched: existing?.episodes_watched ?? 0,
      score: existing?.score ?? null,
      review: existing?.review ?? null,
    });
    refreshLocalStatus();
  };

  const onSaveReview = () => {
    if (!user || !anime || !localStatus) return;
    setSavingReview(true);
    const existing = getLocalEntry(user.id, anime.id);
    const parsedScore = myScore.trim() ? Math.max(1, Math.min(10, parseInt(myScore, 10) || 0)) : null;
    addOrUpdateLocal(user.id, {
      anime_id: anime.id,
      anime_title: anime.title,
      anime_image: anime.image,
      status: localStatus,
      episodes_watched: existing?.episodes_watched ?? 0,
      score: parsedScore,
      review: myReview.trim() || null,
    });
    setSavingReview(false);
    refreshLocalStatus();
  };

  const removeFromList = () => {
    if (!user || !anime) return;
    removeLocal(user.id, anime.id);
    setLocalStatus(null);
  };

  const onToggleFavorite = async () => {
    if (!anime || favBusy) return;
    setFavBusy(true);
    const prev = isFavorite;
    setIsFavorite(!prev); // optimistic
    try {
      const res = await toggleFavorite(anime.id, anime.title, anime.image);
      setIsFavorite(res.favorited);
    } catch {
      setIsFavorite(prev); // revert on failure
    } finally {
      setFavBusy(false);
    }
  };

  if (loading || !anime) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Image source={{ uri: anime.image }} style={styles.hero} contentFit="cover" />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { flex: 1 }]}>{anime.title}</Text>
          <Pressable onPress={onToggleFavorite} hitSlop={10} style={styles.favBtn}>
            <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={24} color={isFavorite ? colors.accent : colors.textMuted} />
          </Pressable>
        </View>
        {anime.titleJapanese && <Text style={styles.subtitle}>{anime.titleJapanese}</Text>}

        <View style={styles.metaRow}>
          {anime.score != null && <Text style={styles.metaItem}>★ {anime.score}</Text>}
          <Text style={styles.metaItem}>{anime.type}</Text>
          <Text style={styles.metaItem}>
            {anime.isAiring && anime.airedSoFar != null
              ? `Ep ${anime.airedSoFar}/${anime.totalEpisodes || '?'}`
              : `${anime.totalEpisodes} eps`}
          </Text>
          {anime.dubbedLangs.length > 0 && <Text style={styles.metaItem}>Dub: {anime.dubbedLangs.join(', ')}</Text>}
        </View>

        <View style={styles.genreRow}>
          {anime.genres.map((g) => (
            <View key={g.id} style={styles.genreChip}><Text style={styles.genreText}>{g.name}</Text></View>
          ))}
        </View>

        <Text style={styles.synopsis}>{anime.synopsis}</Text>

        <Text style={styles.sectionTitle}>{localStatus ? 'Edit in List' : 'Add to List'}</Text>
        <View style={styles.statusRow}>
          {STATUSES.map((s) => (
            <Pressable
              key={s.key}
              style={[styles.statusChip, localStatus === s.key && styles.statusChipActive]}
              onPress={() => setStatus(s.key)}
            >
              <Text style={[styles.statusChipText, localStatus === s.key && styles.statusChipTextActive]}>{s.label}</Text>
            </Pressable>
          ))}
        </View>
        {localStatus && (
          <Pressable style={styles.removeBtn} onPress={removeFromList}>
            <Text style={styles.removeBtnText}>Remove from list</Text>
          </Pressable>
        )}

        {localStatus && (
          <>
            <Text style={styles.sectionTitle}>Your Score &amp; Notes</Text>
            <View style={styles.scoreRow}>
              <TextInput
                style={styles.scoreInput}
                value={myScore}
                onChangeText={setMyScore}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="1-10"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={myReview}
                onChangeText={setMyReview}
                placeholder="Personal notes / review (optional)"
                placeholderTextColor={colors.textMuted}
                multiline
              />
            </View>
            <Pressable style={styles.saveReviewBtn} onPress={onSaveReview} disabled={savingReview}>
              {savingReview ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveReviewText}>Save</Text>}
            </Pressable>
          </>
        )}

        {cast.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Cast</Text>
            <FlatList
              horizontal
              data={cast}
              keyExtractor={(item, i) => `${item.id}-${i}`}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable style={styles.castCard} onPress={() => item.id && navigation.navigate('Character', { id: item.id })}>
                  <Image source={{ uri: item.image }} style={styles.castAvatar} contentFit="cover" />
                  <Text style={styles.castName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.castRole}>{item.role}</Text>
                </Pressable>
              )}
            />
          </>
        )}

        <Text style={styles.sectionTitle}>Episodes</Text>
      </View>

      <FlatList
        data={episodes}
        scrollEnabled={false}
        keyExtractor={(ep, i) => String(ep.mal_id ?? ep.episode ?? i)}
        renderItem={({ item, index }) => (
          <Pressable
            style={styles.episodeRow}
            onPress={() => navigation.navigate('Watch', { animeId: anime.id, episodeNum: item.episode ?? index + 1, title: anime.title })}
          >
            <Text style={styles.episodeNum}>{item.episode ?? index + 1}</Text>
            <Text style={styles.episodeTitle} numberOfLines={1}>{(item.title as string) || `Episode ${item.episode ?? index + 1}`}</Text>
          </Pressable>
        )}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  center: { flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center' },
  hero: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.bgCard },
  body: { padding: 16 },
  title: { color: colors.textPrimary, fontSize: 22, fontFamily: fonts.display },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  favBtn: { paddingTop: 2 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2, fontFamily: fonts.body },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  metaItem: { color: colors.textSecondary, fontSize: 13, fontFamily: fonts.body },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  genreChip: { backgroundColor: colors.bgCard, borderRadius: radius.lg, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.border },
  genreText: { color: colors.textSecondary, fontSize: 11, fontFamily: fonts.body },
  synopsis: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 14, fontFamily: fonts.body },
  sectionTitle: { color: colors.textPrimary, fontSize: 16, fontFamily: fonts.bodySemibold, marginTop: 20, marginBottom: 8 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.bgSurface },
  statusChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  statusChipText: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.body },
  statusChipTextActive: { color: '#fff', fontFamily: fonts.bodySemibold },
  removeBtn: { marginTop: 10, alignSelf: 'flex-start' },
  removeBtnText: { color: colors.textMuted, fontSize: 12, textDecorationLine: 'underline', fontFamily: fonts.body },
  scoreRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  scoreInput: {
    width: 56, backgroundColor: colors.bgCard, color: colors.textPrimary, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, fontFamily: fonts.body, textAlign: 'center',
  },
  input: {
    backgroundColor: colors.bgCard, color: colors.textPrimary, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, fontFamily: fonts.body, minHeight: 40,
  },
  saveReviewBtn: { backgroundColor: colors.accent, borderRadius: radius.sm, paddingVertical: 9, alignItems: 'center', marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 20 },
  saveReviewText: { color: '#fff', fontFamily: fonts.bodySemibold, fontSize: 13 },
  castCard: { width: 80, marginRight: 10, alignItems: 'center' },
  castAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.bgCard },
  castName: { color: colors.textSecondary, fontSize: 10, marginTop: 4, textAlign: 'center', fontFamily: fonts.body },
  castRole: { color: colors.textMuted, fontSize: 9, fontFamily: fonts.body },
  episodeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  episodeNum: { color: colors.accent, fontFamily: fonts.bodyBold, width: 32 },
  episodeTitle: { color: colors.textSecondary, fontSize: 13, flex: 1, fontFamily: fonts.body },
});
