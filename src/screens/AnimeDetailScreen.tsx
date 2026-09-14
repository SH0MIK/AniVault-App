import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet, FlatList, TextInput, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getAnimeDetail, getEpisodes, toggleFavorite, getAnimeCharacters, AnimeDetail, EpisodeItem } from '../api/content';
import { addOrUpdateLocal, getLocalEntry, removeLocal } from '../db/listRepo';
import { useAuth } from '../auth/AuthContext';
import { colors, radius, fonts } from '../theme';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STATUSES = [
  { key: 'watching', label: 'Watching' }, { key: 'completed', label: 'Completed' },
  { key: 'plan_to_watch', label: 'Plan to Watch' }, { key: 'on_hold', label: 'On Hold' }, { key: 'dropped', label: 'Dropped' },
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
        setAnime(detailRes.anime); setIsFavorite(!!detailRes.isFavorite); setEpisodes(epRes.data ?? []);
        getAnimeCharacters(id).then((res) => setCast(res.data)).catch(() => {});
      } finally { setLoading(false); }
    })();
    refreshLocalStatus();
  }, [id, refreshLocalStatus]);

  const setStatus = (status: string) => {
    if (!user || !anime) return;
    const existing = getLocalEntry(user.id, anime.id);
    addOrUpdateLocal(user.id, { anime_id: anime.id, anime_title: anime.title, anime_image: anime.image, status, episodes_watched: existing?.episodes_watched ?? 0, score: existing?.score ?? null, review: existing?.review ?? null });
    refreshLocalStatus();
  };

  const onSaveReview = () => {
    if (!user || !anime || !localStatus) return;
    setSavingReview(true);
    const existing = getLocalEntry(user.id, anime.id);
    const parsed = myScore.trim() ? Math.max(1, Math.min(10, parseInt(myScore, 10) || 0)) : null;
    addOrUpdateLocal(user.id, { anime_id: anime.id, anime_title: anime.title, anime_image: anime.image, status: localStatus, episodes_watched: existing?.episodes_watched ?? 0, score: parsed, review: myReview.trim() || null });
    setSavingReview(false); refreshLocalStatus();
  };

  const removeFromList = () => { if (!user || !anime) return; removeLocal(user.id, anime.id); setLocalStatus(null); };

  const onToggleFavorite = async () => {
    if (!anime || favBusy) return;
    setFavBusy(true); const prev = isFavorite; setIsFavorite(!prev);
    try { setIsFavorite((await toggleFavorite(anime.id, anime.title, anime.image)).favorited); }
    catch { setIsFavorite(prev); } finally { setFavBusy(false); }
  };

  if (loading || !anime) return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  const firstEpisode = episodes[0]?.episode ?? 1;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.heroWrap}>
        <Image source={{ uri: anime.image }} style={styles.hero} contentFit="cover" />
        <View style={styles.heroShade} />
        <View style={styles.heroTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}><Ionicons name="chevron-back" size={23} color="#fff" /></Pressable>
          <Pressable onPress={onToggleFavorite} style={styles.iconButton}><Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={22} color="#fff" /></Pressable>
        </View>
      </View>

      <View style={styles.posterInfo}>
        <Image source={{ uri: anime.image }} style={styles.poster} contentFit="cover" />
        <View style={styles.identity}>
          <Text style={styles.title}>{anime.title}</Text>
          {!!anime.titleJapanese && <Text style={styles.jpTitle} numberOfLines={1}>{anime.titleJapanese}</Text>}
          <View style={styles.quickRow}>
            {anime.score != null && <View style={styles.scoreBadge}><Ionicons name="star" size={11} color="#000" /><Text style={styles.scoreText}>{anime.score}</Text></View>}
            <Text style={styles.quickText}>{anime.type}</Text><Text style={styles.dot}>•</Text>
            <Text style={styles.quickText}>{anime.isAiring && anime.airedSoFar != null ? `Ep ${anime.airedSoFar}/${anime.totalEpisodes || '?'}` : `${anime.totalEpisodes} eps`}</Text>
          </View>
        </View>
      </View>

      <Pressable style={styles.watchButton} onPress={() => navigation.navigate('Watch', { animeId: anime.id, episodeNum: firstEpisode, title: anime.title })}>
        <Ionicons name="play" size={17} color="#000" /><Text style={styles.watchText}>Watch Now</Text>
      </Pressable>

      <View style={styles.glassCard}>
        <View style={styles.statLine}>
          <View><Text style={styles.statLabel}>STATUS</Text><Text style={styles.statValue}>{anime.isAiring ? 'Airing' : 'Finished'}</Text></View>
          <View><Text style={styles.statLabel}>EPISODES</Text><Text style={styles.statValue}>{anime.totalEpisodes || '?'}</Text></View>
          <View><Text style={styles.statLabel}>FORMAT</Text><Text style={styles.statValue}>{anime.type || 'TV'}</Text></View>
        </View>
      </View>

      <SectionTitle title="Overview" />
      <Text style={styles.synopsis}>{anime.synopsis || 'No synopsis available.'}</Text>
      {anime.genres.length > 0 && <><SectionTitle title="Genres" /><View style={styles.genreRow}>{anime.genres.map(g => <View key={g.id} style={styles.genreChip}><Text style={styles.genreText}>{g.name}</Text></View>)}</View></>}

      <SectionTitle title={localStatus ? 'Your List' : 'Add to List'} />
      <View style={styles.statusRow}>{STATUSES.map(s => <Pressable key={s.key} style={[styles.statusChip, localStatus === s.key && styles.statusActive]} onPress={() => setStatus(s.key)}><Text style={[styles.statusText, localStatus === s.key && styles.statusTextActive]}>{s.label}</Text></Pressable>)}</View>
      {localStatus && <>
        <View style={styles.reviewCard}>
          <TextInput style={styles.scoreInput} value={myScore} onChangeText={setMyScore} keyboardType="number-pad" maxLength={2} placeholder="1-10" placeholderTextColor={colors.textMuted} />
          <TextInput style={styles.reviewInput} value={myReview} onChangeText={setMyReview} placeholder="Add a personal note..." placeholderTextColor={colors.textMuted} multiline />
        </View>
        <View style={styles.reviewActions}><Pressable style={styles.saveButton} onPress={onSaveReview} disabled={savingReview}>{savingReview ? <ActivityIndicator color="#000" /> : <Text style={styles.saveText}>Save changes</Text>}</Pressable><Pressable onPress={removeFromList}><Text style={styles.removeText}>Remove</Text></Pressable></View>
      </>}

      {cast.length > 0 && <><SectionTitle title="Characters" /><FlatList horizontal data={cast} keyExtractor={(item, i) => `${item.id}-${i}`} showsHorizontalScrollIndicator={false} renderItem={({ item }) => <Pressable style={styles.castCard} onPress={() => item.id && navigation.navigate('Character', { id: item.id })}><Image source={{ uri: item.image }} style={styles.castImage} contentFit="cover" /><Text style={styles.castName} numberOfLines={2}>{item.name}</Text><Text style={styles.castRole} numberOfLines={1}>{item.role}</Text></Pressable>} /></>}

      <SectionTitle title={`Episodes ${episodes.length ? `(${episodes.length})` : ''}`} />
      <View style={styles.episodeCard}>{episodes.map((item, index) => { const number = item.episode ?? index + 1; return <Pressable key={String(item.mal_id ?? number)} style={styles.episodeRow} onPress={() => navigation.navigate('Watch', { animeId: anime.id, episodeNum: number, title: anime.title })}><View style={styles.episodeNumber}><Text style={styles.episodeNumText}>{number}</Text></View><View style={styles.episodeCopy}><Text style={styles.episodeTitle} numberOfLines={1}>{(item.title as string) || `Episode ${number}`}</Text><Text style={styles.episodeMeta}>{item.title ? `Episode ${number}` : 'Watch episode'}</Text></View><Ionicons name="play-circle-outline" size={23} color={colors.textMuted} /></Pressable>; })}</View>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function SectionTitle({ title }: { title: string }) { return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text><View style={styles.sectionLine} /></View>; }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase }, content: { paddingBottom: 20 }, center: { flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center' },
  heroWrap: { height: Math.min(SCREEN_WIDTH * 0.92, 390), backgroundColor: colors.bgCard, overflow: 'hidden' }, hero: { ...StyleSheet.absoluteFillObject }, heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.48)' },
  heroTop: { position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' }, iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.52)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  posterInfo: { flexDirection: 'row', marginTop: -74, paddingHorizontal: 16, position: 'relative', alignItems: 'flex-end' }, poster: { width: 104, height: 148, borderRadius: radius.md, backgroundColor: colors.bgCard, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)' }, identity: { flex: 1, paddingLeft: 12, paddingBottom: 5 }, title: { color: '#fff', fontSize: 20, lineHeight: 24, fontFamily: fonts.bodyBold }, jpTitle: { color: colors.textMuted, fontSize: 11, marginTop: 4, fontFamily: fonts.body }, quickRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8 }, quickText: { color: colors.textSecondary, fontSize: 11, fontFamily: fonts.body }, dot: { color: colors.textMuted }, scoreBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fff', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 }, scoreText: { color: '#000', fontSize: 10, fontFamily: fonts.bodyBold },
  watchButton: { marginHorizontal: 16, marginTop: 16, height: 46, backgroundColor: '#fff', borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 }, watchText: { color: '#000', fontSize: 14, fontFamily: fonts.bodyBold },
  glassCard: { margin: 16, marginBottom: 2, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 15 }, statLine: { flexDirection: 'row', justifyContent: 'space-between' }, statLabel: { color: colors.textMuted, fontSize: 8, letterSpacing: 1, fontFamily: fonts.bodyBold }, statValue: { color: colors.textPrimary, fontSize: 13, marginTop: 4, fontFamily: fonts.bodySemibold },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 22, marginBottom: 10 }, sectionTitle: { color: colors.textPrimary, fontSize: 16, fontFamily: fonts.bodyBold }, sectionLine: { flex: 1, height: 1, backgroundColor: colors.border }, synopsis: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, marginHorizontal: 16 },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginHorizontal: 16 }, genreChip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6 }, genreText: { color: colors.textSecondary, fontSize: 11, fontFamily: fonts.body },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginHorizontal: 16 }, statusChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.bgCard, paddingHorizontal: 10, paddingVertical: 8 }, statusActive: { backgroundColor: '#fff', borderColor: '#fff' }, statusText: { color: colors.textSecondary, fontSize: 11, fontFamily: fonts.body }, statusTextActive: { color: '#000', fontFamily: fonts.bodyBold },
  reviewCard: { marginHorizontal: 16, marginTop: 10, flexDirection: 'row', gap: 8 }, scoreInput: { width: 55, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 8, color: '#fff', textAlign: 'center', fontFamily: fonts.body }, reviewInput: { flex: 1, minHeight: 44, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 8, color: '#fff', paddingHorizontal: 12, paddingVertical: 9, fontFamily: fonts.body, fontSize: 12 }, reviewActions: { marginHorizontal: 16, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 15 }, saveButton: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8 }, saveText: { color: '#000', fontSize: 12, fontFamily: fonts.bodyBold }, removeText: { color: colors.textMuted, fontSize: 12, textDecorationLine: 'underline', fontFamily: fonts.body },
  castCard: { width: 88, marginLeft: 16 }, castImage: { width: 88, height: 112, borderRadius: 9, backgroundColor: colors.bgCard }, castName: { color: colors.textSecondary, fontSize: 10, marginTop: 6, fontFamily: fonts.bodySemibold }, castRole: { color: colors.textMuted, fontSize: 9, marginTop: 2, fontFamily: fonts.body },
  episodeCard: { marginHorizontal: 16, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.bgCard }, episodeRow: { minHeight: 65, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 11 }, episodeNumber: { width: 34, height: 34, borderRadius: 8, backgroundColor: colors.bgHover, alignItems: 'center', justifyContent: 'center' }, episodeNumText: { color: colors.textPrimary, fontSize: 12, fontFamily: fonts.bodyBold }, episodeCopy: { flex: 1 }, episodeTitle: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.bodySemibold }, episodeMeta: { color: colors.textMuted, fontSize: 9, marginTop: 3, fontFamily: fonts.body },
});
