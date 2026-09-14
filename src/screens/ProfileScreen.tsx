import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getMyProfile, ProfileBundle } from '../api/profile';
import { useAuth } from '../auth/AuthContext';
import { colors, radius, fonts } from '../theme';

const STAT_LABELS: [keyof ProfileBundle['stats'], string][] = [
  ['watching', 'Watching'],
  ['completed', 'Completed'],
  ['plan_to_watch', 'Plan to Watch'],
  ['on_hold', 'On Hold'],
  ['dropped', 'Dropped'],
];

function ActionRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]} onPress={onPress}>
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionChevron}>›</Text>
    </Pressable>
  );
}

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
      setProfile(await getMyProfile());
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>MY SPACE</Text>
        <Pressable style={styles.settingsButton} onPress={() => navigation.navigate('AccountSettings')}>
          <Text style={styles.settingsIcon}>⚙</Text>
        </Pressable>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.profileTop}>
          <Image source={{ uri: user.avatarUrl ?? undefined }} style={styles.avatar} contentFit="cover" />
          <View style={styles.identity}>
            <Text style={styles.username} numberOfLines={1}>{user.username}</Text>
            {user.bio ? <Text style={styles.bio} numberOfLines={2}>{user.bio}</Text> : null}
          </View>
        </View>

        <View style={styles.followRow}>
          <Pressable style={styles.followStat} onPress={() => navigation.navigate('FollowList', { userId: user.id, type: 'followers', username: user.username })}>
            <Text style={styles.followNumber}>{followerCount}</Text>
            <Text style={styles.followLabel}>Followers</Text>
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.followStat} onPress={() => navigation.navigate('FollowList', { userId: user.id, type: 'following', username: user.username })}>
            <Text style={styles.followNumber}>{followingCount}</Text>
            <Text style={styles.followLabel}>Following</Text>
          </Pressable>
        </View>
      </View>

      {badges.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BADGES</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeScroll}>
            {badges.map((b) => (
              <View key={b.id} style={[styles.badgeChip, { borderColor: b.color || colors.border }]}>
                {b.imageUrl ? <Image source={{ uri: b.imageUrl }} style={styles.badgeImg} /> : <Text style={styles.badgeIcon}>{b.iconText}</Text>}
                <Text style={styles.badgeName} numberOfLines={1}>{b.name}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>YOUR STATS</Text>
        <View style={styles.statsCard}>
          {STAT_LABELS.slice(0, 4).map(([key, label]) => (
            <View key={key} style={styles.statBox}>
              <Text style={styles.statValue}>{stats[key]}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.total_episodes}</Text>
            <Text style={styles.statLabel}>Episodes</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.avg_score || '—'}</Text>
            <Text style={styles.statLabel}>Avg Score</Text>
          </View>
        </View>
      </View>

      {favorites.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>FAVORITES</Text>
            <Text style={styles.countText}>{favorites.length}</Text>
          </View>
          <FlatList
            horizontal
            data={favorites}
            keyExtractor={(f) => String(f.animeId)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.favoriteList}
            renderItem={({ item }) => (
              <Pressable style={({ pressed }) => [styles.favCard, pressed && styles.pressed]} onPress={() => navigation.navigate('AnimeDetail', { id: item.animeId, title: item.title })}>
                <Image source={{ uri: item.image }} style={styles.favPoster} contentFit="cover" />
                <Text style={styles.favTitle} numberOfLines={2}>{item.title}</Text>
              </Pressable>
            )}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>LIBRARY</Text>
        <View style={styles.menuCard}>
          <ActionRow label="Watch History" onPress={() => navigation.navigate('History')} />
          <ActionRow label="Announcements" onPress={() => navigation.navigate('Announcements')} />
          <ActionRow label="Account Settings" onPress={() => navigation.navigate('AccountSettings')} />
        </View>
      </View>

      <Pressable style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]} onPress={logout}>
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 36 },
  center: { flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.accent, fontFamily: fonts.body },
  topBar: { height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  pageTitle: { color: colors.textPrimary, fontFamily: fonts.display, fontSize: 17, letterSpacing: 1.2 },
  settingsButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  settingsIcon: { color: colors.textSecondary, fontSize: 17 },
  profileCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16 },
  profileTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.bgHover, borderWidth: 2, borderColor: colors.accent },
  identity: { flex: 1, marginLeft: 14 },
  username: { color: colors.textPrimary, fontSize: 20, fontFamily: fonts.display },
  bio: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 6, fontFamily: fonts.body },
  followRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  followStat: { flex: 1, alignItems: 'center' },
  followNumber: { color: colors.textPrimary, fontSize: 16, fontFamily: fonts.displayMedium },
  followLabel: { color: colors.textMuted, fontSize: 10, marginTop: 3, fontFamily: fonts.body },
  divider: { width: 1, height: 28, backgroundColor: colors.border },
  section: { marginTop: 22 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.textPrimary, fontSize: 12, letterSpacing: 1, fontFamily: fonts.displayMedium, marginBottom: 10 },
  countText: { color: colors.textMuted, fontSize: 11, marginBottom: 10, fontFamily: fonts.body },
  badgeScroll: { gap: 8, paddingRight: 16 },
  badgeChip: { minWidth: 92, maxWidth: 130, height: 38, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 9 },
  badgeImg: { width: 18, height: 18, marginRight: 6 },
  badgeIcon: { fontSize: 14, marginRight: 6 },
  badgeName: { flex: 1, color: colors.textSecondary, fontSize: 10, fontFamily: fonts.body },
  statsCard: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  statBox: { width: '33.333%', minHeight: 76, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  statValue: { color: colors.textPrimary, fontSize: 18, fontFamily: fonts.display },
  statLabel: { color: colors.textMuted, fontSize: 9, marginTop: 4, textAlign: 'center', fontFamily: fonts.body },
  favoriteList: { paddingRight: 16 },
  favCard: { width: 94, marginRight: 10 },
  favPoster: { width: 94, height: 136, borderRadius: radius.sm, backgroundColor: colors.bgCard },
  favTitle: { color: colors.textSecondary, fontSize: 10, lineHeight: 14, marginTop: 6, fontFamily: fonts.body },
  menuCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  actionRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  actionLabel: { color: colors.textSecondary, fontSize: 13, fontFamily: fonts.bodyMedium },
  actionChevron: { color: colors.textMuted, fontSize: 24, fontWeight: '300' },
  logoutButton: { height: 48, marginTop: 18, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  logoutText: { color: colors.textSecondary, fontSize: 13, fontFamily: fonts.bodyMedium },
  pressed: { opacity: 0.65 },
});
