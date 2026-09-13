import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getNotifications, markRead, markAllRead, deleteNotification, NotificationItem } from '../api/notifications';
import { isOnline } from '../db/sync';
import { colors, radius, fonts } from '../theme';

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getNotifications();
      setItems(res.notifications ?? []);
      setOffline(false);
    } catch {
      // getNotifications already falls back to the local cache when available.
      // Keep the current list if both network and cache are unavailable.
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const online = await isOnline();
    setOffline(!online);
    await load();
    setRefreshing(false);
  }, [load]);

  const onPressItem = async (item: NotificationItem) => {
    if (!item.is_read && !offline) {
      setItems((prev) => prev.map((n) => n.id === item.id ? { ...n, is_read: true } : n));
      markRead(item.id).catch(() => {});
    }
    const match = item.link.match(/[?&]id=(\d+)/);
    if (match) navigation.navigate('AnimeDetail', { id: parseInt(match[1], 10) });
  };

  const markEverythingRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    if (!offline) markAllRead().catch(() => {});
  };

  const onDelete = (id: number) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    if (!offline) deleteNotification(id).catch(() => {});
  };

  const unreadCount = items.filter((n) => !n.is_read).length;

  return (
    <FlatList
      style={styles.container}
      data={items}
      keyExtractor={(item) => String(item.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
      ListHeaderComponent={
        <>
          {offline && <View style={styles.offlineBanner}><Text style={styles.offlineText}>Offline — showing cached notifications</Text></View>}
          {unreadCount > 0 && <Pressable style={styles.markAllBtn} onPress={markEverythingRead}><Text style={styles.markAllText}>Mark all as read</Text></Pressable>}
        </>
      }
      renderItem={({ item }) => (
        <Pressable style={[styles.row, !item.is_read && styles.rowUnread]} onPress={() => onPressItem(item)} onLongPress={() => onDelete(item.id)}>
          {item.actor_avatar ? (
            <Pressable onPress={() => item.actor_name && navigation.navigate('UserProfile', { username: item.actor_name })} hitSlop={4}>
              <Image source={{ uri: item.actor_avatar }} style={styles.avatar} contentFit="cover" />
            </Pressable>
          ) : <View style={[styles.iconDot, { backgroundColor: item.color || colors.accent }]} />}
          <View style={{ flex: 1 }}><Text style={styles.text}>{item.text}</Text><Text style={styles.time}>{item.time}</Text></View>
          {!item.is_read && <View style={styles.unreadDot} />}
        </Pressable>
      )}
      ListEmptyComponent={<View style={styles.emptyState}><Text style={styles.emptyTitle}>No notifications</Text><Text style={styles.emptyText}>{offline ? 'No cached notifications are available yet.' : 'You are all caught up.'}</Text></View>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  offlineBanner: { backgroundColor: colors.bgSurface, paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.borderAccent },
  offlineText: { color: colors.gold, fontSize: 12, textAlign: 'center', fontFamily: fonts.body },
  markAllBtn: { paddingHorizontal: 16, paddingVertical: 10, alignItems: 'flex-end' },
  markAllText: { color: colors.accent, fontSize: 12, fontFamily: fonts.bodyMedium },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowUnread: { backgroundColor: colors.bgSurface },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.bgCard },
  iconDot: { width: 38, height: 38, borderRadius: 19 },
  text: { color: colors.textPrimary, fontSize: 13, fontFamily: fonts.body },
  time: { color: colors.textMuted, fontSize: 11, marginTop: 3, fontFamily: fonts.body },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontFamily: fonts.displayMedium },
  emptyText: { color: colors.textMuted, fontSize: 12, marginTop: 6, textAlign: 'center', fontFamily: fonts.body },
});
