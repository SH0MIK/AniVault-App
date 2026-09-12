import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getSeasonal, DiscoveryCard } from '../api/content';
import { colors, radius, fonts } from '../theme';

export default function SeasonalScreen() {
  const navigation = useNavigation<any>();
  const [mode, setMode] = useState<'now' | 'upcoming'>('now');
  const [items, setItems] = useState<DiscoveryCard[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextMode: 'now' | 'upcoming', nextPage = 1, append = false) => {
    setLoading(true); setError(null);
    try {
      const res = await getSeasonal(nextMode, nextPage);
      setItems(prev => append ? [...prev, ...res.data] : res.data);
      setPage(nextPage); setHasNext(!!res.pagination?.has_next_page);
    } catch (e: any) { setError(e.message ?? 'Failed to load seasonal anime.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(mode); }, [mode, load]);

  const refresh = async () => { setRefreshing(true); await load(mode, 1); setRefreshing(false); };
  const more = () => { if (!loading && hasNext) load(mode, page + 1, true); };

  return <View style={styles.container}>
    <View style={styles.headingRow}>
      <View><Text style={styles.title}>Seasonal Anime</Text><Text style={styles.subtitle}>{mode === 'now' ? 'Airing this season' : 'Next season'}</Text></View>
      <Ionicons name="flower-outline" size={27} color={colors.accent} />
    </View>
    <View style={styles.tabs}>
      {([['now', 'Airing Now'], ['upcoming', 'Upcoming']] as const).map(([value, label]) => <Pressable key={value} onPress={() => setMode(value)} style={[styles.tab, mode === value && styles.tabActive]}><Text style={[styles.tabText, mode === value && styles.tabTextActive]}>{label}</Text></Pressable>)}
    </View>
    {error && <View style={styles.error}><Ionicons name="cloud-offline-outline" size={18} color={colors.accent}/><Text style={styles.errorText}>{error}</Text></View>}
    <FlatList data={items} numColumns={3} keyExtractor={x => String(x.id)} contentContainerStyle={styles.grid} columnWrapperStyle={styles.row}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent}/>} onEndReached={more} onEndReachedThreshold={0.55}
      ListEmptyComponent={!loading ? <View style={styles.empty}><Ionicons name="flower-outline" size={42} color={colors.textMuted}/><Text style={styles.emptyTitle}>Nothing here yet</Text><Text style={styles.emptyText}>Try refreshing in a moment.</Text></View> : null}
      ListFooterComponent={loading ? <ActivityIndicator color={colors.accent} style={{margin: 20}}/> : null}
      renderItem={({item}) => <Pressable style={styles.card} onPress={() => navigation.navigate('AnimeDetail', {id: item.id, title: item.title})}>
        <View><Image source={{uri: item.image}} style={styles.poster} contentFit="cover" transition={150}/>{item.score != null && <View style={styles.score}><Ionicons name="star" size={9} color={colors.gold}/><Text style={styles.scoreText}>{item.score.toFixed(1)}</Text></View>}{item.userStatus && <View style={styles.badge}><Text style={styles.badgeText}>{item.userStatus}</Text></View>}</View>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text><Text style={styles.meta} numberOfLines={1}>{item.type || 'Anime'}{item.episodes ? ` • ${item.episodes} eps` : ''}</Text>
      </Pressable>}/>
  </View>;
}
const styles=StyleSheet.create({container:{flex:1,backgroundColor:colors.bgBase},headingRow:{paddingHorizontal:14,paddingTop:16,paddingBottom:5,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},title:{color:colors.textPrimary,fontSize:20,fontFamily:fonts.displayMedium},subtitle:{color:colors.textMuted,fontSize:11,fontFamily:fonts.body,marginTop:4},tabs:{flexDirection:'row',paddingHorizontal:12,paddingVertical:9,gap:8},tab:{paddingHorizontal:14,paddingVertical:8,borderRadius:radius.lg,borderWidth:1,borderColor:colors.border,backgroundColor:colors.bgCard},tabActive:{backgroundColor:colors.accent,borderColor:colors.accent},tabText:{color:colors.textSecondary,fontSize:12,fontFamily:fonts.bodyMedium},tabTextActive:{color:'#fff'},grid:{paddingHorizontal:8,paddingBottom:28},row:{},card:{width:'33.333%',paddingHorizontal:4,marginBottom:14},poster:{width:'100%',aspectRatio:2/3,borderRadius:radius.sm,backgroundColor:colors.bgCard},cardTitle:{color:colors.textPrimary,fontSize:11.5,lineHeight:15,marginTop:5,fontFamily:fonts.bodyMedium},meta:{color:colors.textMuted,fontSize:9.5,marginTop:2,fontFamily:fonts.body},score:{position:'absolute',right:5,bottom:5,flexDirection:'row',gap:3,alignItems:'center',backgroundColor:'rgba(0,0,0,.8)',paddingHorizontal:5,paddingVertical:3,borderRadius:4},scoreText:{color:'#fff',fontSize:8.5,fontFamily:fonts.bodySemibold},badge:{position:'absolute',left:5,top:5,backgroundColor:colors.accent,paddingHorizontal:5,paddingVertical:2,borderRadius:4},badgeText:{color:'#fff',fontSize:8,fontFamily:fonts.bodySemibold},error:{margin:12,padding:10,flexDirection:'row',gap:8,alignItems:'center',backgroundColor:colors.bgCard,borderWidth:1,borderColor:colors.border,borderRadius:radius.md},errorText:{flex:1,color:colors.textSecondary,fontSize:12,fontFamily:fonts.body},empty:{alignItems:'center',paddingTop:70,paddingHorizontal:30},emptyTitle:{color:colors.textPrimary,fontSize:16,fontFamily:fonts.displayMedium,marginTop:12},emptyText:{color:colors.textMuted,fontSize:12,fontFamily:fonts.body,marginTop:5,textAlign:'center'}});
