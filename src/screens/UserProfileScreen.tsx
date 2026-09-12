import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { getUserProfile, toggleFollow, PublicProfile } from '../api/social';
import { colors, radius, fonts } from '../theme';

const STAT_LABELS: [keyof PublicProfile['stats'], string][] = [
  ['watching', 'Watching'], ['completed', 'Completed'], ['plan_to_watch', 'Plan to Watch'],
  ['on_hold', 'On Hold'], ['dropped', 'Dropped'],
];

export default function UserProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { username } = route.params as { username: string };

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followBusy, setFollowBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getUserProfile(username);
      setProfile(res);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onToggleFollow = async () => {
    if (!profile || followBusy) return;
    setFollowBusy(true);
    const prevFollowing = profile.isFollowing;
    setProfile({ ...profile, isFollowing: !prevFollowing, followerCount: profile.followerCount + (prevFollowing ? -1 : 1) });
    try {
      const res = await toggleFollow(profile.user.id);
      if (!res.success) throw new Error(res.message);
    } catch {
      setProfile((p) => (p ? { ...p, isFollowing: prevFollowing, followerCount: p.followerCount + (prevFollowing ? 1 : -1) } : p));
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading && !profile) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  }
  if (error || !profile) {
    return <View style={styles.center}><Text style={styles.error}>{error ?? 'User not found.'}</Text></View>;
  }

  const { user, stats, badges, favorites, followerCount, followingCount, isOwn, isFollowing, canViewFollowers, canViewFollowing } = profile;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image source={{ uri: user.avatarUrl ?? undefined }} style={styles.avatar} contentFit="cover" />
        <Text style={styles.username}>{user.username}</Text>
        {user.bio && <Text style={styles.bio}>{user.bio}</Text>}

        <View style={styles.followRow}>
          <Pressable disabled={!canViewFollowers} onPress={() => navigation.navigate('FollowList', { userId: user.id, type: 'followers', username: user.username })}>
            <Text style={styles.followCount}>{canViewFollowers ? followerCount : '—'} <Text style={styles.followLabel}>Followers</Text></Text>
          </Pressable>
          <Pressable disabled={!canViewFollowing} onPress={() => navigation.navigate('FollowList', { userId: user.id, type: 'following', username: user.username })}>
            <Text style={styles.followCount}>{canViewFollowing ? followingCount : '—'} <Text style={styles.followLabel}>Following</Text></Text>
          </Pressable>
        </View>

        {!isOwn && (
          <Pressable style={[styles.followBtn, isFollowing && styles.followBtnActive]} onPress={onToggleFollow} disabled={followBusy}>
            <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>{isFollowing ? 'Following' : 'Follow'}</Text>
          </Pressable>
        )}
      </View>

      {badges.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Badges</Text>
          <View style={styles.badgeRow}>
            {badges.map((b) => (
              <View key={b.id} style={[styles.badgeChip, { borderColor: b.color }]}>
                {b.imageUrl ? <Image source={{ uri: b.imageUrl }} style={styles.badgeImg} /> : <Text style={{ fontSize: 14 }}>{b.iconText}</Text>}
                <Text style={styles.badgeName}>{b.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stats</Text>
        <View style={styles.statsGrid}>
          {STAT_LABELS.map(([key, label]) => (
            <View key={key} style={styles.statBox}>
              <Text style={styles.statValue}>{stats[key]}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      {favorites === null ? (
        <View style={styles.section}><Text style={styles.privateText}>{user.username} has hidden their favorites.</Text></View>
      ) : favorites.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Favorites</Text>
          <FlatList
            horizontal
            data={favorites}
            keyExtractor={(f) => String(f.animeId)}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable style={styles.favCard} onPress={() => navigation.navigate('AnimeDetail', { id: item.animeId, title: item.title })}>
                <Image source={{ uri: item.image }} style={styles.favPoster} contentFit="cover" />
              </Pressable>
            )}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  center: { flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.accent, fontFamily: fonts.body },
  header: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.bgCard, borderWidth: 2, borderColor: colors.accent },
  username: { color: colors.textPrimary, fontSize: 20, fontFamily: fonts.display, marginTop: 12 },
  bio: { color: colors.textSecondary, fontSize: 13, marginTop: 6, textAlign: 'center', fontFamily: fonts.body },
  followRow: { flexDirection: 'row', gap: 24, marginTop: 14 },
  followCount: { color: colors.textPrimary, fontSize: 15, fontFamily: fonts.bodySemibold },
  followLabel: { color: colors.textMuted, fontSize: 12, fontFamily: fonts.body },
  followBtn: { marginTop: 16, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: 24, paddingVertical: 9 },
  followBtnActive: { backgroundColor: 'transparent' },
  followBtnText: { color: '#fff', fontFamily: fonts.bodySemibold, fontSize: 13 },
  followBtnTextActive: { color: colors.accent },
  section: { paddingHorizontal: 16, marginTop: 8, marginBottom: 16 },
  sectionTitle: { color: colors.textPrimary, fontSize: 15, fontFamily: fonts.displayMedium, marginBottom: 10 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.bgCard, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: 10, paddingVertical: 6 },
  badgeImg: { width: 16, height: 16 },
  badgeName: { color: colors.textSecondary, fontSize: 11, fontFamily: fonts.body },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox: { width: '30%', backgroundColor: colors.bgCard, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  statValue: { color: colors.accent, fontSize: 20, fontFamily: fonts.display },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 4, fontFamily: fonts.body },
  favCard: { marginRight: 10 },
  favPoster: { width: 90, height: 130, borderRadius: radius.sm, backgroundColor: colors.bgCard },
  privateText: { color: colors.textMuted, fontSize: 13, fontFamily: fonts.body, textAlign: 'center' },
});
