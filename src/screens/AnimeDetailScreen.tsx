import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAnimeDetail, getEpisodes, getAnimeCharacters, toggleFavorite, AnimeDetail, EpisodeItem } from '../api/content';
import { addOrUpdateLocal, getLocalEntry, removeLocal } from '../db/listRepo';
import { useAuth } from '../auth/AuthContext';
import { colors, fonts, radius } from '../theme';
import { WebSectionHeader } from '../components/WebChrome';

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
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [detailRes, epRes] = await Promise.all([getAnimeDetail(id), getEpisodes(id)]);
        if (!alive) return;
        setAnime(detailRes.anime);
        setIsFavorite(!!detailRes.isFavorite);
        setEpisodes(epRes.data ?? []);
        getAnimeCharacters(id).then((res) => { if (alive) setCast(res.data ?? []); }).catch(() => {});
      } catch {
        if (alive) setAnime(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    refreshLocalStatus();
    return () => { alive = false; };
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

  const saveReview = () => {
    if (!user || !anime || !localStatus) return;
    const existing = getLocalEntry(user.id, anime.id);
    const n = Number.parseInt(myScore.trim(), 10);
    const score = myScore.trim() ? (Number.isFinite(n) ? Math.max(1, Math.min(10, n)) : null) : null;
    addOrUpdateLocal(user.id, {
      anime_id: anime.id,
      anime_title: anime.title,
      anime_image: anime.image,
      status: localStatus,
      episodes_watched: existing?.episodes_watched ?? 0,
      score,
      review: myReview.trim() || null,
    });
    refreshLocalStatus();
  };

  const onFavorite = async () => {
    if (!anime || favBusy) return;
    const old = isFavorite;
    setFavBusy(true);
    setIsFavorite(!old);
    try {
      const result = await toggleFavorite(anime.id, anime.title, anime.image);
      setIsFavorite(!!result.favorited);
    } catch {
      setIsFavorite(old);
    } finally {
      setFavBusy(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View>;
  if (!anime) return <View style={styles.center}><Text style={styles.errorTitle}>ANIME NOT FOUND</Text><Text style={styles.errorText}>This title could not be loaded.</Text><Pressable style={styles.retry} onPress={() => navigation.goBack()}><Text style={styles.retryText}>GO BACK</Text></Pressable></View>;

  const watched = getLocalEntry(user?.id ?? -1, anime.id)?.episodes_watched ?? 0;
  const visibleEpisodes = showAllEpisodes ? episodes : episodes.slice(0, 24);
  const airedText = anime.isAiring && anime.airedSoFar != null ? `Ep ${anime.airedSoFar}/${anime.totalEpisodes || '?'}` : `${anime.totalEpisodes || 0} eps`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.webHero}>
        <Image source={{ uri: anime.image }} style={StyleSheet.absoluteFillObject} contentFit="cover" blurRadius={1} />
        <View style={styles.backdropTint} />
        <View style={styles.backdropBottom} />
        <View style={styles.heroInner}>
          <View style={styles.posterWrap}>
            <Image source={{ uri: anime.image }} style={styles.poster} contentFit="cover" />
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.plainTitle} numberOfLines={1}>{anime.title}</Text>
            <Text style={styles.heroTitle} numberOfLines={2}>{anime.title}</Text>
            {anime.titleJapanese ? <Text style={styles.jpTitle} numberOfLines={1}>{anime.titleJapanese}</Text> : null}
            <View style={styles.metaRow}>
              {anime.score != null ? <Meta icon="star" text={anime.score.toFixed(1)} gold /> : null}
              <Meta icon="tv-outline" text={anime.type || 'TV'} />
              <Meta icon="list-outline" text={airedText} />
              <Meta icon={anime.isAiring ? 'radio-outline' : 'checkmark-circle-outline'} text={anime.status || '—'} active={anime.isAiring} />
              <Meta icon="closed-captioning-outline" text="Sub" />
              {anime.dubbedLangs.length > 0 ? <Meta icon="mic-outline" text="Dub" /> : null}
            </View>
            <View style={styles.genreRow}>
              {anime.genres.slice(0, 6).map((g) => <View key={g.id} style={styles.genreTag}><Text style={styles.genreText}>{g.name}</Text></View>)}
            </View>
            <View style={styles.ctaRow}>
              <Pressable style={styles.playButton} onPress={() => navigation.navigate('Watch', { animeId: anime.id, episodeNum: 1, title: anime.title })}><Ionicons name="play" size={15} color="#fff" /><Text style={styles.playText}>PLAY EPISODE 1</Text></Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => user && setStatus(localStatus || 'plan_to_watch')}><Ionicons name={localStatus ? 'create-outline' : 'heart-outline'} size={15} color={colors.textPrimary} /><Text style={styles.secondaryText}>{localStatus ? 'EDIT IN LIST' : 'ADD TO LIST'}</Text></Pressable>
              <Pressable style={[styles.iconButton, isFavorite && styles.iconButtonActive]} onPress={onFavorite} disabled={favBusy}><Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={18} color={isFavorite ? colors.accent : colors.textPrimary} /></Pressable>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {watched > 0 ? <Pressable style={styles.continue} onPress={() => navigation.navigate('Watch', { animeId: anime.id, episodeNum: watched, title: anime.title })}>
          <View style={styles.continuePlay}><Ionicons name="play" size={14} color="#fff" /></View>
          <View style={{ flex: 1 }}><Text style={styles.continueEyebrow}>CONTINUE WATCHING</Text><Text style={styles.continueTitle}>Episode {watched}</Text></View>
          <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} />
        </Pressable> : null}

        <WebSectionHeader title="Synopsis" />
        <Text style={styles.description}>{anime.synopsis || 'No synopsis available.'}</Text>

        <View style={styles.infoGrid}>
          <Info label="TYPE" value={anime.type || '—'} />
          <Info label="STATUS" value={anime.status || '—'} />
          <Info label="EPISODES" value={airedText} />
          <Info label="SCORE" value={anime.score != null ? `${anime.score.toFixed(1)} / 10` : '—'} />
        </View>

        {user ? <>
          <WebSectionHeader title="Your Vault" />
          <View style={styles.statusRow}>
            {STATUSES.map((s) => <Pressable key={s.key} onPress={() => setStatus(s.key)} style={[styles.status, localStatus === s.key && styles.statusActive]}><Text style={[styles.statusText, localStatus === s.key && styles.statusTextActive]}>{s.label}</Text></Pressable>)}
          </View>
          {localStatus ? <View style={styles.reviewBox}>
            <Text style={styles.reviewLabel}>YOUR SCORE & NOTES</Text>
            <View style={styles.reviewInputs}><TextInput value={myScore} onChangeText={setMyScore} keyboardType="number-pad" maxLength={2} placeholder="1–10" placeholderTextColor={colors.textMuted} style={styles.scoreInput} /><TextInput value={myReview} onChangeText={setMyReview} placeholder="Personal notes / review" placeholderTextColor={colors.textMuted} multiline style={styles.reviewInput} /></View>
            <View style={styles.reviewActions}><Pressable onPress={saveReview} style={styles.saveButton}><Text style={styles.saveText}>SAVE</Text></Pressable><Pressable onPress={() => { removeLocal(user.id, anime.id); setLocalStatus(null); }}><Text style={styles.removeText}>REMOVE FROM LIST</Text></Pressable></View>
          </View> : null}
        </> : null}

        <WebSectionHeader title={`Episodes${episodes.length ? ` · ${episodes.length}` : ''}`} action={episodes.length > 24 ? (showAllEpisodes ? 'Show Less' : 'Show All') : undefined} onAction={() => setShowAllEpisodes((v) => !v)} />
        <View style={styles.episodeGrid}>
          {visibleEpisodes.map((ep, index) => {
            const n = Number(ep.episode ?? ep.mal_id ?? index + 1);
            const done = n <= watched;
            return <Pressable key={`${n}-${index}`} style={[styles.episode, done && styles.episodeDone]} onPress={() => navigation.navigate('Watch', { animeId: anime.id, episodeNum: n, title: anime.title })}>
              <View style={[styles.epNumber, done && styles.epNumberDone]}><Text style={styles.epNumberText}>{n}</Text></View>
              <View style={{ flex: 1 }}><Text style={styles.epTitle} numberOfLines={1}>{ep.title || `Episode ${n}`}</Text><Text style={styles.epMeta}>{done ? 'Watched' : `Episode ${n}`}</Text></View>
              <Ionicons name="play" size={12} color={done ? colors.accent : colors.textMuted} />
            </Pressable>;
          })}
        </View>

        {cast.length > 0 ? <>
          <WebSectionHeader title="Characters" />
          <FlatList horizontal data={cast} keyExtractor={(x, i) => `${x.id}-${i}`} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.castRow} renderItem={({ item }) => <Pressable style={styles.castCard} onPress={() => item.id && navigation.navigate('Character', { id: item.id })}>
            <Image source={{ uri: item.image }} style={styles.castImage} contentFit="cover" /><Text style={styles.castName} numberOfLines={2}>{item.name}</Text><Text style={styles.castRole} numberOfLines={1}>{item.role}</Text>
          </Pressable>} />
        </> : null}

        {anime.dubbedLangs.length > 0 ? <View style={styles.dub}><Ionicons name="mic-outline" size={18} color={colors.accent} /><View style={{ flex: 1 }}><Text style={styles.reviewLabel}>DUB AVAILABLE</Text><Text style={styles.dubText}>{anime.dubbedLangs.join(' · ')}</Text></View></View> : null}
        <View style={{ height: 30 }} />
      </View>
    </ScrollView>
  );
}

function Meta({ icon, text, gold, active }: { icon: any; text: string; gold?: boolean; active?: boolean }) { return <View style={styles.meta}><Ionicons name={icon} size={12} color={gold ? colors.gold : active ? colors.accent : colors.textSecondary} /><Text style={[styles.metaText, gold && { color: colors.gold }, active && { color: colors.accent }]} numberOfLines={1}>{text}</Text></View>; }
function Info({ label, value }: { label: string; value: string }) { return <View style={styles.info}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue} numberOfLines={1}>{value}</Text></View>; }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase }, content: { paddingBottom: 20 }, center: { flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center', padding: 30 }, errorTitle: { color: colors.textPrimary, fontFamily: fonts.display, fontSize: 14, letterSpacing: 1 }, errorText: { color: colors.textMuted, fontFamily: fonts.body, marginTop: 7 }, retry: { marginTop: 18, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 7, backgroundColor: colors.accent }, retryText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 10 },
  webHero: { minHeight: 390, overflow: 'hidden', backgroundColor: colors.bgCard, position: 'relative' }, backdropTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,11,14,.62)' }, backdropBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 190, backgroundColor: 'rgba(10,11,14,.88)' }, heroInner: { flex: 1, padding: 16, paddingTop: 28, flexDirection: 'row', alignItems: 'flex-end', gap: 15 }, posterWrap: { width: 118, aspectRatio: .67, borderRadius: 9, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,.12)', backgroundColor: colors.bgCard }, poster: { width: '100%', height: '100%' }, heroInfo: { flex: 1, paddingBottom: 4 }, plainTitle: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: 9, marginBottom: 3 }, heroTitle: { color: colors.textPrimary, fontFamily: fonts.display, fontSize: 19, lineHeight: 24 }, jpTitle: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 10, marginTop: 3 }, metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 9 }, meta: { flexDirection: 'row', alignItems: 'center', gap: 3 }, metaText: { color: colors.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 9 }, genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }, genreTag: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, backgroundColor: 'rgba(255,255,255,.07)', borderWidth: 1, borderColor: colors.border }, genreText: { color: colors.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 8 }, ctaRow: { flexDirection: 'row', gap: 6, marginTop: 12, alignItems: 'center' }, playButton: { minHeight: 36, paddingHorizontal: 10, borderRadius: 6, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', gap: 5 }, playText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 8.5, letterSpacing: .35 }, secondaryButton: { minHeight: 36, paddingHorizontal: 9, borderRadius: 6, backgroundColor: 'rgba(255,255,255,.08)', borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 }, secondaryText: { color: colors.textPrimary, fontFamily: fonts.bodyBold, fontSize: 8 }, iconButton: { width: 36, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.07)', borderWidth: 1, borderColor: colors.border }, iconButtonActive: { borderColor: colors.borderAccent, backgroundColor: 'rgba(124,58,237,.13)' },
  body: { paddingHorizontal: 16 }, continue: { marginTop: 15, padding: 11, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderAccent, backgroundColor: colors.bgSurface, flexDirection: 'row', alignItems: 'center', gap: 10 }, continuePlay: { width: 31, height: 31, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingLeft: 1 }, continueEyebrow: { color: colors.accent, fontFamily: fonts.displayMedium, fontSize: 7.5, letterSpacing: 1 }, continueTitle: { color: colors.textPrimary, fontFamily: fonts.bodyMedium, fontSize: 11, marginTop: 2 }, description: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 20 }, infoGrid: { marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, info: { flexGrow: 1, flexBasis: '47%', padding: 10, borderRadius: 7, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border }, infoLabel: { color: colors.textMuted, fontFamily: fonts.displayMedium, fontSize: 7.5, letterSpacing: 1 }, infoValue: { color: colors.textPrimary, fontFamily: fonts.bodyMedium, fontSize: 11, marginTop: 4 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, status: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgSurface }, statusActive: { backgroundColor: colors.accent, borderColor: colors.accent }, statusText: { color: colors.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 10 }, statusTextActive: { color: '#fff', fontFamily: fonts.bodyBold }, reviewBox: { marginTop: 10, padding: 12, borderRadius: 9, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border }, reviewLabel: { color: colors.textMuted, fontFamily: fonts.displayMedium, fontSize: 8, letterSpacing: 1 }, reviewInputs: { flexDirection: 'row', gap: 7, marginTop: 9 }, scoreInput: { width: 58, minHeight: 42, color: colors.textPrimary, backgroundColor: colors.bgCard, borderRadius: 6, borderWidth: 1, borderColor: colors.border, textAlign: 'center', fontFamily: fonts.bodyBold }, reviewInput: { flex: 1, minHeight: 42, maxHeight: 85, color: colors.textPrimary, backgroundColor: colors.bgCard, borderRadius: 6, borderWidth: 1, borderColor: colors.border, padding: 9, fontFamily: fonts.body, fontSize: 11 }, reviewActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 }, saveButton: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 5, backgroundColor: colors.accent }, saveText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 9 }, removeText: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: 8 },
  episodeGrid: { gap: 6 }, episode: { minHeight: 54, borderRadius: 7, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 9 }, episodeDone: { borderColor: 'rgba(124,58,237,.28)' }, epNumber: { width: 34, height: 34, borderRadius: 6, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, epNumberDone: { backgroundColor: colors.accentDim, borderColor: colors.borderAccent }, epNumberText: { color: colors.textPrimary, fontFamily: fonts.displayMedium, fontSize: 10 }, epTitle: { color: colors.textPrimary, fontFamily: fonts.bodyMedium, fontSize: 10.5 }, epMeta: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 8.5, marginTop: 3 }, castRow: { paddingRight: 8, gap: 9 }, castCard: { width: 94 }, castImage: { width: 94, height: 116, borderRadius: 7, backgroundColor: colors.bgCard }, castName: { color: colors.textPrimary, fontFamily: fonts.bodySemibold, fontSize: 10, marginTop: 6 }, castRole: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 8.5, marginTop: 2 }, dub: { marginTop: 17, padding: 12, borderRadius: 9, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 }, dubText: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: 10, marginTop: 3 }
});