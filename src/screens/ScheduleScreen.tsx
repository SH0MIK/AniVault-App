import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getSchedule, ScheduleItem } from '../api/content';
import { colors, radius, fonts } from '../theme';

const DAYS = [
  { key: 'monday', label: 'Mon' }, { key: 'tuesday', label: 'Tue' }, { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' }, { key: 'friday', label: 'Fri' }, { key: 'saturday', label: 'Sat' }, { key: 'sunday', label: 'Sun' },
];

function mondayIndex(date = new Date()) { return (date.getDay() + 6) % 7; }
function weekDate(index: number) {
  const now = new Date();
  const monday = new Date(now); monday.setHours(0, 0, 0, 0); monday.setDate(now.getDate() - mondayIndex(now));
  monday.setDate(monday.getDate() + index);
  return monday.getDate();
}

export default function ScheduleScreen() {
  const navigation = useNavigation<any>();
  const [selected, setSelected] = useState(mondayIndex());
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedDay = DAYS[selected];
  const load = async (day: string) => {
    setLoading(true);
    try { const result = await getSchedule(day); setItems(result.data ?? []); }
    catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(selectedDay.key); }, [selected]);

  const sorted = useMemo(() => [...items].sort((a, b) => (a.broadcast.time ?? '99:99').localeCompare(b.broadcast.time ?? '99:99')), [items]);

  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <View style={styles.header}>
      <View><Text style={styles.title}>Schedule</Text><Text style={styles.subtitle}>Weekly airing schedule</Text></View>
      <View style={styles.iconWrap}><Ionicons name="calendar-outline" size={19} color={colors.textPrimary} /></View>
    </View>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
      {DAYS.map((day, i) => <Pressable key={day.key} onPress={() => setSelected(i)} style={[styles.day, selected === i && styles.dayActive]}>
        <Text style={[styles.dayText, selected === i && styles.dayTextActive]}>{day.label}</Text>
        <Text style={[styles.dayNum, selected === i && styles.dayNumActive]}>{weekDate(i)}</Text>
      </Pressable>)}
    </ScrollView>

    <View style={styles.sectionHead}><Text style={styles.sectionTitle}>{selectedDay.label} Releases</Text><Text style={styles.count}>{loading ? '—' : `${sorted.length} titles`}</Text></View>

    {loading ? <View style={styles.loading}><ActivityIndicator color={colors.accent} /><Text style={styles.loadingText}>Loading schedule…</Text></View> : sorted.length === 0 ? <View style={styles.empty}>
      <Ionicons name="calendar-clear-outline" size={30} color={colors.textMuted} /><Text style={styles.emptyTitle}>Nothing scheduled</Text><Text style={styles.emptyText}>No airing titles were found for this day.</Text>
    </View> : sorted.map(item => <Pressable key={item.id} style={styles.card} onPress={() => navigation.navigate('AnimeDetail', { id: item.id, title: item.title })}>
      <Image source={{ uri: item.image }} style={styles.poster} contentFit="cover" />
      <View style={styles.info}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.meta}>{item.type || 'Anime'} · {item.episodes || '?'} eps</Text>
        <View style={styles.row}><View style={styles.time}><Ionicons name="time-outline" size={11} color={colors.textPrimary} /><Text style={styles.timeText}>{item.broadcast.time || 'TBA'}</Text></View>{item.airedInfo?.aired ? <Text style={styles.ep}>Ep {item.airedInfo.aired}</Text> : null}</View>
      </View><Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>)}
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase }, content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  title: { color: colors.textPrimary, fontSize: 24, fontFamily: fonts.display }, subtitle: { color: colors.textMuted, fontSize: 11, marginTop: 3, fontFamily: fonts.body },
  iconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  days: { gap: 8, paddingBottom: 20 }, day: { width: 52, height: 62, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center' }, dayActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  dayText: { color: colors.textMuted, fontSize: 10, fontFamily: fonts.bodyMedium }, dayNum: { color: colors.textPrimary, fontSize: 18, marginTop: 4, fontFamily: fonts.display }, dayTextActive: { color: '#000' }, dayNumActive: { color: '#000' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }, sectionTitle: { color: colors.textPrimary, fontSize: 16, fontFamily: fonts.displayMedium }, count: { color: colors.textMuted, fontSize: 10, fontFamily: fonts.body },
  card: { flexDirection: 'row', alignItems: 'center', padding: 8, marginBottom: 9, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md }, poster: { width: 54, height: 78, borderRadius: radius.sm }, info: { flex: 1, paddingHorizontal: 11 }, cardTitle: { color: colors.textPrimary, fontSize: 13, fontFamily: fonts.bodyMedium }, meta: { color: colors.textMuted, fontSize: 10, marginTop: 4, fontFamily: fonts.body },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7 }, time: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.bgHover, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 }, timeText: { color: colors.textPrimary, fontSize: 9, fontFamily: fonts.bodyMedium }, ep: { color: colors.textMuted, fontSize: 9, fontFamily: fonts.body },
  loading: { alignItems: 'center', paddingVertical: 45, gap: 10 }, loadingText: { color: colors.textMuted, fontSize: 11, fontFamily: fonts.body }, empty: { alignItems: 'center', paddingVertical: 55, paddingHorizontal: 30 }, emptyTitle: { color: colors.textPrimary, fontSize: 15, marginTop: 12, fontFamily: fonts.displayMedium }, emptyText: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 5, fontFamily: fonts.body },
});
