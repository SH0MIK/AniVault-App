import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getCharacter, CharacterDetail } from '../api/content';
import { colors, radius, fonts } from '../theme';

export default function CharacterScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params as { id: number };

  const [character, setCharacter] = useState<CharacterDetail | null>(null);
  const [animeography, setAnimeography] = useState<{ animeId: number; title: string; image: string; role: string }[]>([]);
  const [voices, setVoices] = useState<{ name: string; image: string; language: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCharacter(id).then((res) => {
      setCharacter(res.character);
      setAnimeography(res.animeography);
      setVoices(res.voices);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading || !character) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image source={{ uri: character.image }} style={styles.avatar} contentFit="cover" />
        <Text style={styles.name}>{character.name}</Text>
        {character.nameKanji && <Text style={styles.nameKanji}>{character.nameKanji}</Text>}
        {character.nicknames.length > 0 && <Text style={styles.nicknames}>{character.nicknames.join(', ')}</Text>}
        <Text style={styles.favorites}>♥ {character.favorites.toLocaleString()} favorites</Text>
      </View>

      {character.about && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.about}>{character.about}</Text>
        </View>
      )}

      {animeography.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appears In</Text>
          <FlatList
            horizontal
            data={animeography}
            keyExtractor={(a, i) => `${a.animeId}-${i}`}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable style={styles.animeCard} onPress={() => item.animeId && navigation.navigate('AnimeDetail', { id: item.animeId, title: item.title })}>
                <Image source={{ uri: item.image }} style={styles.animePoster} contentFit="cover" />
                <Text style={styles.animeTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.animeRole}>{item.role}</Text>
              </Pressable>
            )}
          />
        </View>
      )}

      {voices.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voice Actors</Text>
          <FlatList
            horizontal
            data={voices}
            keyExtractor={(v, i) => `${v.name}-${i}`}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.voiceCard}>
                <Image source={{ uri: item.image }} style={styles.voiceAvatar} contentFit="cover" />
                <Text style={styles.voiceName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.voiceLang}>{item.language}</Text>
              </View>
            )}
          />
        </View>
      )}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  center: { flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center' },
  header: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  avatar: { width: 120, height: 160, borderRadius: radius.md, backgroundColor: colors.bgCard },
  name: { color: colors.textPrimary, fontSize: 20, fontFamily: fonts.display, marginTop: 12, textAlign: 'center' },
  nameKanji: { color: colors.textMuted, fontSize: 13, marginTop: 2, fontFamily: fonts.body },
  nicknames: { color: colors.textSecondary, fontSize: 12, marginTop: 4, fontFamily: fonts.body, textAlign: 'center' },
  favorites: { color: colors.accent, fontSize: 12, marginTop: 8, fontFamily: fonts.bodyMedium },
  section: { paddingHorizontal: 16, marginTop: 8, marginBottom: 16 },
  sectionTitle: { color: colors.textPrimary, fontSize: 15, fontFamily: fonts.displayMedium, marginBottom: 10 },
  about: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, fontFamily: fonts.body },
  animeCard: { width: 100, marginRight: 10 },
  animePoster: { width: 100, height: 140, borderRadius: radius.sm, backgroundColor: colors.bgCard },
  animeTitle: { color: colors.textSecondary, fontSize: 11, marginTop: 4, fontFamily: fonts.body },
  animeRole: { color: colors.textMuted, fontSize: 10, fontFamily: fonts.body },
  voiceCard: { width: 80, marginRight: 10, alignItems: 'center' },
  voiceAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.bgCard },
  voiceName: { color: colors.textSecondary, fontSize: 10, marginTop: 4, textAlign: 'center', fontFamily: fonts.body },
  voiceLang: { color: colors.textMuted, fontSize: 9, fontFamily: fonts.body },
});
