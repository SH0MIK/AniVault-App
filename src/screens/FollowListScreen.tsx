import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { getFollowList, FollowListUser } from '../api/social';
import { colors, radius, fonts } from '../theme';

export default function FollowListScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { userId, type } = route.params as { userId: number; type: 'followers' | 'following'; username: string };

  const [users, setUsers] = useState<FollowListUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (offset: number, append: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getFollowList(userId, type, offset);
      setUsers((prev) => (append ? [...prev, ...res.users] : res.users));
      setHasMore(res.has_more);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, [userId, type]);

  useFocusEffect(useCallback(() => { load(0, false); }, [load]));

  if (loading && users.length === 0) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  }

  return (
    <FlatList
      style={styles.container}
      data={users}
      keyExtractor={(u) => String(u.id)}
      onEndReached={() => { if (hasMore && !loading) load(users.length, true); }}
      onEndReachedThreshold={0.5}
      renderItem={({ item }) => (
        <Pressable style={styles.row} onPress={() => navigation.navigate('UserProfile', { username: item.username })}>
          <Image source={{ uri: item.avatar_url ?? undefined }} style={styles.avatar} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <Text style={styles.username}>{item.username}</Text>
            {item.bio && <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text>}
          </View>
        </Pressable>
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{error ?? (type === 'followers' ? 'No followers yet.' : 'Not following anyone yet.')}</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  center: { flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.bgCard },
  username: { color: colors.textPrimary, fontSize: 14, fontFamily: fonts.bodyMedium },
  bio: { color: colors.textMuted, fontSize: 12, marginTop: 2, fontFamily: fonts.body },
  emptyState: { padding: 32, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 13, fontFamily: fonts.body },
});
