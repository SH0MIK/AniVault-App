import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getNotifications, markRead, markAllRead, deleteNotification, NotificationItem } from '../api/notifications';
import { colors, radius, fonts } from '../theme';

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getNotifications();
      setItems(res.notifications ?? []);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onPressItem = async (item: NotificationItem) => {
    if (!item.is_read) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)));
      markRead(item.id).catch(() => {});
    }
    // Notification links point at real website paths (e.g. /anime?id=123) —
    // parse out an anime id where present since that's the one destination
    // this app has a native screen for; anything else (profile pages, review
    // threads) doesn't have a native equivalent yet, so there's nowhere to
    // route those on-tap right now.
    const match = item.link.match(/[?&]id=(\d+)/);
    if (match) {
      navigation.navigate('AnimeDetail', { id: parseInt(match[1], 10) });
    }
  };

  const onDelete = (id: number) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    deleteNotification(id).catch(() => {});
  };

  const unreadCount = items.filter((n) => !n.is_read).length;

  if (loading && items.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={items}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        unreadCount > 0 ? (
          <Pressable style={styles.markAllBtn} onPress={() => { markAllRead().catch(() => {}); setItems((prev) => prev.map((n) => ({ ...n, is_read: true }))); }}>
            <Text style={styles.markAllText}>Mark all as read</Text>
          </Pressable>
        ) : null
      }
      renderItem={({ item }) => (
        <Pressable style={[styles.row, !item.is_read && styles.rowUnread]} onPress={() => onPressItem(item)} onLongPress={() => onDelete(item.id)}>
          {item.actor_avatar ? (
            <Pressable onPress={() => item.actor_name && navigation.navigate('UserProfile', { username: item.actor_name })} hitSlop={4}>
              <Image source={{ uri: item.actor_avatar }} style={styles.avatar} contentFit="cover" />
            </Pressable>
          ) : (
            <View style={[styles.iconDot, { backgroundColor: item.color || colors.accent }]} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.text}>{item.text}</Text>
            <Text style={styles.time}>{item.time}</Text>
          </View>
          {!item.is_read && <View style={styles.unreadDot} />}
        </Pressable>
      )}
      ListEmptyComponent={
        error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <View style={styles.emptyState}><Text style={styles.emptyText}>No notifications yet.</Text></View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  center: { flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center' },
  markAllBtn: { paddingHorizontal: 16, paddingVertical: 10, alignItems: 'flex-end' },
  markAllText: { color: colors.accent, fontSize: 12, fontFamily: fonts.bodyMedium },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowUnread: { backgroundColor: colors.bgSurface },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.bgCard },
  iconDot: { width: 38, height: 38, borderRadius: 19 },
  text: { color: colors.textPrimary, fontSize: 13, fontFamily: fonts.body },
  time: { color: colors.textMuted, fontSize: 11, marginTop: 3, fontFamily: fonts.body },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  emptyState: { padding: 32, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 13, fontFamily: fonts.body },
  error: { color: colors.accent, padding: 16, textAlign: 'center', fontFamily: fonts.body },
});
