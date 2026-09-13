import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getSeasonal, DiscoveryCard } from '../api/content';
import { WebAnimeCard, WebSectionHeader } from '../components/WebChrome';
import { colors, fonts, radius } from '../theme';

export default function SeasonalScreen() {
  const navigation = useNavigation<any>();
  const { width: screenWidth } = useWindowDimensions();
  const [mode, setMode] = useState<'now' | 'upcoming'>('now');
  const [items, setItems] = useState<DiscoveryCard[]>([]);
  const [page, setPage] = useState(1); const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState<string | null>(null);
  const cardWidth = Math.floor((screenWidth - 24 - 24) / 3);
  const load = useCallback(async (m: 'now' | 'upcoming', p = 1, append = false) => { setLoading(true); setError(null); try { const r = await getSeasonal(m, p); setItems(v => append ? [...v, ...r.data] : r.data); setPage(p); setHasNext(!!r.pagination?.has_next_page); } catch (e: any) { setError(e.message ?? 'Failed to load seasonal anime.'); } finally { setLoading(false); } }, []);
  useEffect(() => { load(mode); }, [mode, load]);
  const refresh = async () => { setRefreshing(true); await load(mode); setRefreshing(false); };
  return <View style={styles.container}>
    <View style={styles.hero}><Text style={styles.kicker}>DISCOVER</Text><Text style={styles.title}>Seasonal Anime</Text><Text style={styles.subtitle}>{mode === 'now' ? 'Airing this season' : 'Coming next season'}</Text><Ionicons name="flame-outline" size={30} color={colors.accent} style={styles.heroIcon}/></View>
    <View style={styles.tabs}>{[['now','Airing Now'],['upcoming','Upcoming']].map(([v,l]) => <Pressable key={v} onPress={() => setMode(v as any)} style={[styles.tab, mode === v && styles.tabActive]}><Text style={[styles.tabText, mode === v && styles.tabTextActive]}>{l}</Text></Pressable>)}</View>
    <WebSectionHeader title={mode === 'now' ? 'Airing This Season' : 'Coming Soon'} />
    {error ? <View style={styles.error}><Ionicons name="cloud-offline-outline" size={17} color={colors.accent}/><Text style={styles.errorText}>{error}</Text></View> : null}
    <FlatList data={items} numColumns={3} keyExtractor={x => String(x.id)} contentContainerStyle={styles.grid} columnWrapperStyle={styles.row}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent}/>} onEndReached={() => { if (!loading && hasNext) load(mode, page + 1, true); }} onEndReachedThreshold={0.55}
      ListEmptyComponent={!loading ? <View style={styles.empty}><Ionicons name="film-outline" size={40} color={colors.textMuted}/><Text style={styles.emptyTitle}>Nothing here yet</Text><Text style={styles.emptyText}>Try refreshing in a moment.</Text></View> : null}
      ListFooterComponent={loading ? <ActivityIndicator color={colors.accent} style={{ margin: 20 }} /> : null}
      renderItem={({ item }) => <View style={styles.card}><WebAnimeCard title={item.title} image={item.image} score={item.score} type={item.type} episodes={item.episodes} status={item.userStatus} width={cardWidth} onPress={() => navigation.navigate('AnimeDetail', { id: item.id, title: item.title })}/></View>}/>
  </View>;
}
const styles=StyleSheet.create({container:{flex:1,backgroundColor:colors.bgBase},hero:{paddingHorizontal:16,paddingTop:18,paddingBottom:7,position:'relative'},kicker:{color:colors.accent,fontFamily:fonts.displayMedium,fontSize:8,letterSpacing:1.8},title:{color:colors.textPrimary,fontFamily:fonts.display,fontSize:21,marginTop:5},subtitle:{color:colors.textMuted,fontFamily:fonts.body,fontSize:11,marginTop:4},heroIcon:{position:'absolute',right:17,top:22},tabs:{flexDirection:'row',paddingHorizontal:14,paddingVertical:9,gap:7,borderBottomWidth:1,borderBottomColor:colors.border},tab:{paddingHorizontal:13,paddingVertical:7,borderRadius:radius.lg,borderWidth:1,borderColor:colors.border,backgroundColor:colors.bgSurface},tabActive:{backgroundColor:colors.accent,borderColor:colors.accent},tabText:{color:colors.textSecondary,fontFamily:fonts.bodyMedium,fontSize:10.5},tabTextActive:{color:'#fff'},grid:{paddingHorizontal:12,paddingBottom:30},row:{justifyContent:'flex-start'},card:{width:'33.333%',paddingHorizontal:4,marginBottom:16},error:{margin:12,padding:10,borderWidth:1,borderColor:colors.borderAccent,borderRadius:8,backgroundColor:colors.bgSurface,flexDirection:'row',gap:8,alignItems:'center'},errorText:{flex:1,color:colors.textSecondary,fontFamily:fonts.body,fontSize:11},empty:{alignItems:'center',paddingTop:65,paddingHorizontal:30},emptyTitle:{color:colors.textPrimary,fontFamily:fonts.displayMedium,fontSize:15,marginTop:12},emptyText:{color:colors.textMuted,fontFamily:fonts.body,fontSize:11,textAlign:'center',marginTop:5}});