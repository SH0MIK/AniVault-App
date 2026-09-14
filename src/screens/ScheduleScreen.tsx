import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getHome, MiniAnimeCard } from '../api/content';
import { colors, radius, fonts } from '../theme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ScheduleScreen() {
  const navigation = useNavigation<any>();
  const [selected, setSelected] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
  const [items, setItems] = useState<MiniAnimeCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getHome().then(r => setItems(r.seasonal ?? [])).catch(() => {}).finally(() => setLoading(false)); }, []);

  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <View style={styles.header}><View><Text style={styles.title}>Schedule</Text><Text style={styles.subtitle}>Plan what to watch this week</Text></View><Ionicons name="calendar-outline" size={24} color={colors.textPrimary} /></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
      {DAYS.map((day, i) => <Pressable key={day} onPress={() => setSelected(i)} style={[styles.day, selected === i && styles.dayActive]}><Text style={[styles.dayText, selected === i && styles.dayTextActive]}>{day}</Text><Text style={[styles.dayNum, selected === i && styles.dayNumActive]}>{i + 1}</Text></Pressable>)}
    </ScrollView>
    <View style={styles.sectionHead}><Text style={styles.sectionTitle}>{DAYS[selected]} Releases</Text><Text style={styles.count}>{items.length} titles</Text></View>
    {loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 30 }} /> : items.map(item => <Pressable key={item.id} style={styles.card} onPress={() => navigation.navigate('AnimeDetail', { id: item.id, title: item.title })}>
      <Image source={{ uri: item.image }} style={styles.poster} contentFit="cover" />
      <View style={styles.info}><Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text><Text style={styles.meta}>{item.type} · {item.episodes || '?'} eps</Text><View style={styles.badge}><Text style={styles.badgeText}>Available on AniVault</Text></View></View><Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>)}
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase }, content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }, title: { color: colors.textPrimary, fontSize: 24, fontFamily: fonts.display }, subtitle: { color: colors.textMuted, fontSize: 11, marginTop: 3, fontFamily: fonts.body },
  days: { gap: 8, paddingBottom: 20 }, day: { width: 52, height: 62, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center' }, dayActive: { backgroundColor: colors.accent, borderColor: colors.accent }, dayText: { color: colors.textMuted, fontSize: 10, fontFamily: fonts.bodyMedium }, dayNum: { color: colors.textPrimary, fontSize: 18, marginTop: 4, fontFamily: fonts.display }, dayTextActive: { color: '#000' }, dayNumActive: { color: '#000' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }, sectionTitle: { color: colors.textPrimary, fontSize: 16, fontFamily: fonts.displayMedium }, count: { color: colors.textMuted, fontSize: 10, fontFamily: fonts.body },
  card: { flexDirection: 'row', alignItems: 'center', padding: 8, marginBottom: 9, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md }, poster: { width: 54, height: 78, borderRadius: radius.sm }, info: { flex: 1, paddingHorizontal: 11 }, cardTitle: { color: colors.textPrimary, fontSize: 13, fontFamily: fonts.bodyMedium }, meta: { color: colors.textMuted, fontSize: 10, marginTop: 4, fontFamily: fonts.body }, badge: { alignSelf: 'flex-start', marginTop: 7, backgroundColor: colors.bgHover, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 }, badgeText: { color: colors.textSecondary, fontSize: 8, fontFamily: fonts.bodyMedium },
});
