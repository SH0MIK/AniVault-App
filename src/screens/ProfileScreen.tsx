import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getMyProfile, ProfileBundle } from '../api/profile';
import { useAuth } from '../auth/AuthContext';
import { colors, radius, fonts } from '../theme';

const STAT_LABELS: [keyof ProfileBundle['stats'], string][] = [
  ['watching', 'Watching'], ['completed', 'Completed'], ['plan_to_watch', 'Plan to Watch'],
  ['on_hold', 'On Hold'], ['dropped', 'Dropped'],
];

export default function ProfileScreen() {
  const { logout } = useAuth();
  const navigation = useNavigation<any>();
  const [profile, setProfile] = useState<ProfileBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyProfile();
      setProfile(res);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading && !profile) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  }
  if (error || !profile) {
    return <View style={styles.center}><Text style={styles.error}>{error ?? 'Something went wrong.'}</Text></View>;
  }

  const { user, stats, badges, favorites, followerCount, followingCount } = profile;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image source={{ uri: user.avatarUrl ?? undefined }} style={styles.avatar} contentFit="cover" />
        <Text style={styles.username}>{user.username}</Text>
        {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
        <View style={styles.followRow}>
          <Pressable onPress={() => navigation.navigate('FollowList', { userId: user.id, type: 'followers', username: user.username })}>
            <Text style={styles.followCount}>{followerCount} <Text style={styles.followLabel}>Followers</Text></Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('FollowList', { userId: user.id, type: 'following', username: user.username })}>
            <Text style={styles.followCount}>{followingCount} <Text style={styles.followLabel}>Following</Text></Text>
          </Pressable>
        </View>
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
          <View style={styles.statBox}><Text style={styles.statValue}>{stats.total_episodes}</Text><Text style={styles.statLabel}>Episodes</Text></View>
          <View style={styles.statBox}><Text style={styles.statValue}>{stats.avg_score || '—'}</Text><Text style={styles.statLabel}>Avg Score</Text></View>
        </View>
      </View>

      {favorites.length > 0 && (
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

      <Pressable style={styles.actionBtn} onPress={() => navigation.navigate('Downloads')}>
        <Text style={styles.actionIcon}>↓</Text>
        <View style={styles.actionCopy}><Text style={styles.actionTitle}>Offline Downloads</Text><Text style={styles.actionSubtitle}>Watch downloaded episodes without internet</Text></View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
      <Pressable style={styles.actionBtn} onPress={() => navigation.navigate('History')}>
        <Text style={styles.actionIcon}>◷</Text><View style={styles.actionCopy}><Text style={styles.actionTitle}>Watch History</Text><Text style={styles.actionSubtitle}>Your recently watched episodes</Text></View><Text style={styles.chevron}>›</Text>
      </Pressable>
      <Pressable style={styles.actionBtn} onPress={() => navigation.navigate('Announcements')}>
        <Text style={styles.actionIcon}>!</Text><View style={styles.actionCopy}><Text style={styles.actionTitle}>Announcements</Text></View><Text style={styles.chevron}>›</Text>
      </Pressable>
      <Pressable style={styles.actionBtn} onPress={() => navigation.navigate('AccountSettings')}>
        <Text style={styles.actionIcon}>⚙</Text><View style={styles.actionCopy}><Text style={styles.actionTitle}>Account Settings</Text></View><Text style={styles.chevron}>›</Text>
      </Pressable>
      <Pressable style={[styles.actionBtn, styles.logoutBtn]} onPress={logout}>
        <Text style={styles.actionIcon}>↪</Text><View style={styles.actionCopy}><Text style={styles.actionTitle}>Log out</Text></View>
      </Pressable>
      <View style={{ height: 28 }} />
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
  actionBtn: { marginHorizontal: 16, marginTop: 8, minHeight: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.bgCard },
  actionIcon: { width: 28, color: colors.accent, fontSize: 21, textAlign: 'center', fontFamily: fonts.bodyBold },
  actionCopy: { flex: 1, marginLeft: 10 },
  actionTitle: { color: colors.textPrimary, fontSize: 13, fontFamily: fonts.bodySemibold },
  actionSubtitle: { color: colors.textMuted, fontSize: 10, marginTop: 3, fontFamily: fonts.body },
  chevron: { color: colors.textMuted, fontSize: 24, marginLeft: 8 },
  logoutBtn: { marginTop: 12, marginBottom: 4 },
});
