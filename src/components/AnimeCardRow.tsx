import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { MiniAnimeCard } from '../api/content';
import { colors, radius, fonts } from '../theme';

export default function AnimeCardRow({ title, data }: { title: string; data: MiniAnimeCard[] }) {
  const navigation = useNavigation<any>();
  if (data.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <FlatList
        horizontal
        data={data}
        keyExtractor={(item) => String(item.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12 }}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => navigation.navigate('AnimeDetail', { id: item.id, title: item.title })}>
            <Image source={{ uri: item.image }} style={styles.poster} contentFit="cover" />
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 16 },
  sectionTitle: { color: colors.textPrimary, fontSize: 16, fontFamily: fonts.displayMedium, paddingHorizontal: 16, marginBottom: 10 },
  card: { width: 110, marginRight: 10 },
  poster: { width: 110, height: 156, borderRadius: radius.sm, backgroundColor: colors.bgCard },
  cardTitle: { color: colors.textSecondary, fontSize: 11, marginTop: 4, fontFamily: fonts.body },
});
