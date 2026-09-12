import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { getAnnouncements, Announcement } from '../api/content';
import { colors, radius, fonts } from '../theme';

export default function AnnouncementsScreen() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnnouncements().then((res) => setItems(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;

  return (
    <FlatList
      style={styles.container}
      data={items}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ padding: 16 }}
      ListEmptyComponent={<View style={styles.emptyState}><Text style={styles.emptyText}>No announcements yet.</Text></View>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          {item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.image} contentFit="cover" />}
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.content}>{item.content}</Text>
          <Text style={styles.time}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  center: { flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  image: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.sm, marginBottom: 10, backgroundColor: colors.bgSurface },
  title: { color: colors.textPrimary, fontSize: 15, fontFamily: fonts.bodySemibold, marginBottom: 6 },
  content: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, fontFamily: fonts.body },
  time: { color: colors.textMuted, fontSize: 11, marginTop: 8, fontFamily: fonts.body },
  emptyState: { padding: 32, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 13, fontFamily: fonts.body },
});
