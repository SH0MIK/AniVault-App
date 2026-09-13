import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { deleteDownload, listDownloads, DownloadRecord } from '../db/downloads';
import { colors, fonts, radius } from '../theme';

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function DownloadsScreen() {
  const navigation = useNavigation<any>();
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);

  const refresh = useCallback(() => setDownloads(listDownloads()), []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const totalBytes = useMemo(() => downloads.reduce((sum, item) => sum + (item.bytes ?? 0), 0), [downloads]);

  const remove = (item: DownloadRecord) => {
    Alert.alert(
      'Delete download?',
      `${item.anime_title ?? 'Anime'} — Episode ${item.episode_num} will be removed from this device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => { await deleteDownload(item.anime_id, item.episode_num); refresh(); } },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>ANIVAULT</Text>
          <Text style={styles.title}>Downloads</Text>
        </View>
        <View style={styles.storage}>
          <Text style={styles.storageValue}>{formatBytes(totalBytes)}</Text>
          <Text style={styles.storageLabel}>{downloads.length} {downloads.length === 1 ? 'episode' : 'episodes'}</Text>
        </View>
      </View>

      <FlatList
        data={downloads}
        keyExtractor={(item) => `${item.anime_id}-${item.episode_num}`}
        contentContainerStyle={downloads.length ? styles.list : styles.emptyList}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('Watch', { animeId: item.anime_id, episodeNum: item.episode_num, title: item.anime_title })}
            onLongPress={() => remove(item)}
          >
            <Image source={{ uri: item.image }} style={styles.thumb} contentFit="cover" transition={150} />
            <View style={styles.info}>
              <Text style={styles.animeTitle} numberOfLines={1}>{item.anime_title ?? 'Unknown anime'}</Text>
              <Text style={styles.episode} numberOfLines={1}>Episode {item.episode_num}{item.episode_title ? ` · ${item.episode_title}` : ''}</Text>
              <View style={styles.metaRow}>
                <View style={styles.offlinePill}><Text style={styles.offlineText}>OFFLINE</Text></View>
                <Text style={styles.size}>{formatBytes(item.bytes ?? 0)}</Text>
              </View>
            </View>
            <Pressable hitSlop={10} style={styles.deleteButton} onPress={() => remove(item)}>
              <Text style={styles.deleteText}>×</Text>
            </Pressable>
          </Pressable>
        )}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>↓</Text>
            <Text style={styles.emptyTitle}>No offline episodes</Text>
            <Text style={styles.emptyText}>Download a direct MP4 from the watch screen and it will appear here for offline playback.</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14 },
  kicker: { color: colors.accent, fontSize: 9, letterSpacing: 2, fontFamily: fonts.displayMedium },
  title: { color: colors.textPrimary, fontSize: 23, marginTop: 3, fontFamily: fonts.display },
  storage: { alignItems: 'flex-end', paddingBottom: 2 },
  storageValue: { color: colors.textPrimary, fontSize: 13, fontFamily: fonts.bodySemibold },
  storageLabel: { color: colors.textMuted, fontSize: 10, marginTop: 2, fontFamily: fonts.body },
  list: { paddingHorizontal: 16, paddingBottom: 28 },
  emptyList: { flexGrow: 1, paddingHorizontal: 28 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 9, marginBottom: 10 },
  thumb: { width: 108, height: 64, borderRadius: radius.sm, backgroundColor: colors.bgSurface },
  info: { flex: 1, minWidth: 0, paddingHorizontal: 11 },
  animeTitle: { color: colors.textPrimary, fontSize: 13, fontFamily: fonts.bodySemibold },
  episode: { color: colors.textSecondary, fontSize: 11, marginTop: 4, fontFamily: fonts.body },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 7, gap: 7 },
  offlinePill: { borderWidth: 1, borderColor: colors.borderAccent, backgroundColor: colors.accentGlow, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  offlineText: { color: colors.accent, fontSize: 8, letterSpacing: 0.8, fontFamily: fonts.bodyBold },
  size: { color: colors.textMuted, fontSize: 10, fontFamily: fonts.body },
  deleteButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: colors.textMuted, fontSize: 23, lineHeight: 24 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 70 },
  emptyIcon: { color: colors.accent, fontSize: 42, fontFamily: fonts.display },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, marginTop: 12, fontFamily: fonts.displayMedium },
  emptyText: { color: colors.textMuted, fontSize: 12, lineHeight: 19, textAlign: 'center', marginTop: 8, fontFamily: fonts.body },
});
