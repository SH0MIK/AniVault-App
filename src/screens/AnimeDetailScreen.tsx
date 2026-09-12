import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet, FlatList, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getAnimeDetail, getEpisodes, toggleFavorite, getAnimeCharacters, AnimeDetail, EpisodeItem } from '../api/content';
import { addOrUpdateLocal, getLocalEntry, removeLocal } from '../db/listRepo';
import { useAuth } from '../auth/AuthContext';
import { colors, radius, fonts } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard, SectionTitle } from '../components/AniVaultUI';

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
  const [showAllEpisodes, setShowAllEpisodes] = useState(false);

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
        getAnimeCharacters(id).then((res) => setCast(res.data ?? [])).catch(() => {});
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
    const rawScore = parseInt(myScore.trim(), 10);
    const parsedScore = myScore.trim() ? (Number.isFinite(rawScore) ? Math.max(1, Math.min(10, rawScore)) : null) : null;
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
    const previous = isFavorite;
    setIsFavorite(!previous);
    try {
      const res = await toggleFavorite(anime.id, anime.title, anime.image);
      setIsFavorite(res.favorited);
    } catch {
      setIsFavorite(previous);
    } finally {
      setFavBusy(false);
    }
  };

  if (loading || !anime) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  const visibleEpisodes = showAllEpisodes ? episodes : episodes.slice(0, 24);
  const watched = getLocalEntry(user?.id ?? -1, anime.id)?.episodes_watched ?? 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.heroWrap}>
        <Image source={{ uri: anime.image }} style={styles.hero} contentFit="cover" transition={150} />
        <View style={styles.heroShade} />
        <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>ANIVAULT</Text></View>
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{anime.title}</Text>
            {anime.titleJapanese ? <Text style={styles.subtitle}>{anime.titleJapanese}</Text> : null}
          </View>
          <Pressable onPress={onToggleFavorite} disabled={favBusy} style={styles.favBtn}>
            <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={23} color={isFavorite ? colors.accent : colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.metaRow}>
          {anime.score != null && <View style={styles.scorePill}><Text style={styles.scoreStar}>★</Text><Text style={styles.scoreText}>{anime.score}</Text></View>}
          <Text style={styles.metaItem}>{anime.type}</Text>
          <Text style={styles.metaItem}>{anime.isAiring && anime.airedSoFar != null ? `EP ${anime.airedSoFar}/${anime.totalEpisodes || '?'}` : `${anime.totalEpisodes} EPS`}</Text>
          {anime.status ? <Text style={styles.metaItem}>{anime.status}</Text> : null}
        </View>

        <View style={styles.genreRow}>
          {anime.genres.map((g) => <View key={g.id} style={styles.genreChip}><Text style={styles.genreText}>{g.name}</Text></View>)}
        </View>

        {watched > 0 && (
          <Pressable style={styles.resumeCard} onPress={() => navigation.navigate('Watch', { animeId: anime.id, episodeNum: watched, title: anime.title })}>
            <View style={styles.resumeIcon}><Ionicons name="play" size={15} color="#fff" /></View>
            <View style={{ flex: 1 }}><Text style={styles.resumeLabel}>CONTINUE WATCHING</Text><Text style={styles.resumeText}>Episode {watched}</Text></View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        )}

        <SectionTitle>Synopsis</SectionTitle>
        <Text style={styles.synopsis}>{anime.synopsis || 'No synopsis available.'}</Text>

        <SectionTitle>My List</SectionTitle>
        <View style={styles.statusRow}>
          {STATUSES.map((s) => <Pressable key={s.key} style={[styles.statusChip, localStatus === s.key && styles.statusChipActive]} onPress={() => setStatus(s.key)}><Text style={[styles.statusChipText, localStatus === s.key && styles.statusChipTextActive]}>{s.label}</Text></Pressable>)}
        </View>
        {localStatus ? <Pressable style={styles.removeBtn} onPress={removeFromList}><Ionicons name="trash-outline" size={14} color={colors.textMuted} /><Text style={styles.removeBtnText}>Remove from list</Text></Pressable> : null}

        {localStatus && (
          <GlassCard style={styles.reviewCard}>
            <Text style={styles.cardLabel}>YOUR SCORE & NOTES</Text>
            <View style={styles.scoreRow}>
              <TextInput style={styles.scoreInput} value={myScore} onChangeText={setMyScore} keyboardType="number-pad" maxLength={2} placeholder="1-10" placeholderTextColor={colors.textMuted} />
              <TextInput style={styles.input} value={myReview} onChangeText={setMyReview} placeholder="Personal notes / review" placeholderTextColor={colors.textMuted} multiline />
            </View>
            <Pressable style={styles.saveBtn} onPress={onSaveReview} disabled={savingReview}>{savingReview ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>SAVE</Text>}</Pressable>
          </GlassCard>
        )}

        <View style={styles.episodeHeader}>
          <SectionTitle>Episodes</SectionTitle>
          <Text style={styles.episodeCount}>{episodes.length} episodes</Text>
        </View>
        <View style={styles.episodeGrid}>
          {visibleEpisodes.map((ep, index) => {
            const n = Number(ep.episode ?? ep.mal_id ?? index + 1);
            const isWatched = n <= watched;
            return (
              <Pressable key={`${n}-${index}`} style={[styles.episodeCard, isWatched && styles.episodeWatched]} onPress={() => navigation.navigate('Watch', { animeId: anime.id, episodeNum: n, title: anime.title })}>
                <View style={[styles.epNumberBox, isWatched && styles.epNumberBoxWatched]}><Text style={styles.epNumber}>{n}</Text></View>
                <View style={styles.epInfo}><Text style={styles.epTitle} numberOfLines={1}>{ep.title || `Episode ${n}`}</Text><Text style={styles.epMeta}>{isWatched ? 'Watched' : `S1 · EP ${n}`}</Text></View>
                <Ionicons name="play-circle-outline" size={20} color={isWatched ? colors.accent : colors.textMuted} />
              </Pressable>
            );
          })}
        </View>
        {episodes.length > 24 && <Pressable style={styles.moreBtn} onPress={() => setShowAllEpisodes((v) => !v)}><Text style={styles.moreText}>{showAllEpisodes ? 'SHOW LESS' : `SHOW ALL ${episodes.length} EPISODES`}</Text><Ionicons name={showAllEpisodes ? 'chevron-up' : 'chevron-down'} size={15} color={colors.accent} /></Pressable>}

        {cast.length > 0 && (
          <>
            <SectionTitle>Characters</SectionTitle>
            <FlatList horizontal data={cast} keyExtractor={(item, i) => `${item.id}-${i}`} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.castList} renderItem={({ item }) => (
              <Pressable style={styles.castCard} onPress={() => item.id && navigation.navigate('Character', { id: item.id })}>
                <Image source={{ uri: item.image }} style={styles.castAvatar} contentFit="cover" />
                <Text style={styles.castName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.castRole}>{item.role}</Text>
              </Pressable>
            )} />
          </>
        )}

        {anime.dubbedLangs.length > 0 && <GlassCard style={styles.dubCard}><Ionicons name="volume-high-outline" size={18} color={colors.accent} /><View style={{ flex: 1 }}><Text style={styles.cardLabel}>DUB AVAILABLE</Text><Text style={styles.dubText}>{anime.dubbedLangs.join(' · ')}</Text></View></GlassCard>}
        <View style={{ height: 36 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  content: { paddingBottom: 20 },
  center: { flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center' },
  heroWrap: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.bgCard, position: 'relative' },
  hero: { width: '100%', height: '100%' },
  heroShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%', backgroundColor: 'rgba(10,11,14,.48)' },
  heroBadge: { position: 'absolute', left: 15, bottom: 13, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 6, backgroundColor: 'rgba(10,11,14,.72)', borderWidth: 1, borderColor: colors.border },
  heroBadgeText: { color: colors.accent, fontFamily: fonts.display, fontSize: 9, letterSpacing: 1.1 },
  body: { paddingHorizontal: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 17 },
  titleBlock: { flex: 1, paddingRight: 8 },
  title: { color: colors.textPrimary, fontFamily: fonts.display, fontSize: 21, lineHeight: 27 },
  subtitle: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 12, marginTop: 3 },
  favBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 9, marginTop: 11 },
  scorePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.accentDim },
  scoreStar: { color: colors.accent, fontSize: 12 },
  scoreText: { color: colors.textPrimary, fontFamily: fonts.bodyBold, fontSize: 11 },
  metaItem: { color: colors.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 11 },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 11 },
  genreChip: { backgroundColor: colors.bgCard, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: colors.border },
  genreText: { color: colors.textSecondary, fontSize: 10, fontFamily: fonts.bodyMedium },
  resumeCard: { marginTop: 15, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11, borderRadius: radius.md, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.borderAccent },
  resumeIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  resumeLabel: { color: colors.accent, fontFamily: fonts.displayMedium, fontSize: 8, letterSpacing: .8 },
  resumeText: { color: colors.textPrimary, fontFamily: fonts.bodyMedium, fontSize: 12, marginTop: 2 },
  synopsis: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, fontFamily: fonts.body },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  statusChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: colors.bgSurface },
  statusChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  statusChipText: { color: colors.textSecondary, fontSize: 11, fontFamily: fonts.bodyMedium },
  statusChipTextActive: { color: '#fff', fontFamily: fonts.bodyBold },
  removeBtn: { marginTop: 9, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5 },
  removeBtnText: { color: colors.textMuted, fontSize: 11, textDecorationLine: 'underline', fontFamily: fonts.body },
  reviewCard: { marginTop: 15, padding: 13 },
  cardLabel: { color: colors.accent, fontFamily: fonts.displayMedium, fontSize: 9, letterSpacing: 1, marginBottom: 8 },
  scoreRow: { flexDirection: 'row', gap: 7, alignItems: 'flex-start' },
  scoreInput: { width: 54, backgroundColor: colors.bgCard, color: colors.textPrimary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 9, fontSize: 13, fontFamily: fonts.body, textAlign: 'center' },
  input: { flex: 1, backgroundColor: colors.bgCard, color: colors.textPrimary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, fontFamily: fonts.body, minHeight: 40 },
  saveBtn: { marginTop: 8, alignSelf: 'flex-end', backgroundColor: colors.accent, borderRadius: radius.sm, paddingHorizontal: 17, paddingVertical: 8 },
  saveText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: .5 },
  episodeHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  episodeCount: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 10, marginBottom: 10 },
  episodeGrid: { gap: 7 },
  episodeCard: { minHeight: 53, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border },
  episodeWatched: { borderColor: colors.borderAccent, backgroundColor: colors.bgCard },
  epNumberBox: { width: 36, height: 36, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCard },
  epNumberBoxWatched: { backgroundColor: colors.accentDim },
  epNumber: { color: colors.textPrimary, fontFamily: fonts.bodyBold, fontSize: 12 },
  epInfo: { flex: 1 },
  epTitle: { color: colors.textPrimary, fontFamily: fonts.bodyMedium, fontSize: 11 },
  epMeta: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 9, marginTop: 3 },
  moreBtn: { marginTop: 10, minHeight: 38, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgSurface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  moreText: { color: colors.accent, fontFamily: fonts.displayMedium, fontSize: 9, letterSpacing: .7 },
  castList: { paddingRight: 8 },
  castCard: { width: 82, marginRight: 10, alignItems: 'center' },
  castAvatar: { width: 66, height: 66, borderRadius: 33, backgroundColor: colors.bgCard },
  castName: { color: colors.textSecondary, fontSize: 10, marginTop: 5, textAlign: 'center', fontFamily: fonts.bodyMedium },
  castRole: { color: colors.textMuted, fontSize: 9, fontFamily: fonts.body, marginTop: 1 },
  dubCard: { marginTop: 20, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dubText: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: 11 },
});
