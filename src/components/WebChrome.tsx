import React, { useState } from 'react';
import { Image } from 'expo-image';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '../theme';

const LOGO = 'https://www.anivault.co/assets/img/site-img/logo.png';
const NAV = [
  ['Home', 'Home', 'home-outline'], ['Browse', 'Browse', 'search-outline'], ['Seasonal', 'Seasonal', 'flame-outline'],
  ['Top Anime', 'TopAnime', 'trophy-outline'], ['Schedule', 'Schedule', 'calendar-outline'],
];

export function WebHeader({ navigation, routeName }: { navigation: any; routeName?: string }) {
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [q, setQ] = useState('');
  const go = (route: string) => { setMenu(false); navigation.navigate(route); };
  const submit = () => { const value = q.trim(); if (!value) return; setSearch(false); setQ(''); navigation.navigate('Browse', { q: value }); };
  return <>
    <View style={styles.header}><SafeAreaView style={styles.safe}><View style={styles.headerRow}>
      <Pressable onPress={() => go('Home')} style={styles.brand}><Image source={{ uri: LOGO }} style={styles.logo} contentFit="contain" /></Pressable>
      <View style={styles.actions}>
        <Pressable onPress={() => setSearch(true)} style={styles.iconButton}><Ionicons name="search-outline" size={20} color={colors.textPrimary} /></Pressable>
        <Pressable onPress={() => setMenu(true)} style={styles.iconButton}><Ionicons name="menu-outline" size={22} color={colors.textPrimary} /></Pressable>
      </View>
    </View></SafeAreaView></View>
    <Modal visible={search} transparent animationType="fade" onRequestClose={() => setSearch(false)}>
      <View style={styles.modalShade}><SafeAreaView style={styles.searchPanel}><View style={styles.searchBox}>
        <Pressable onPress={() => setSearch(false)} style={styles.back}><Ionicons name="arrow-back" size={21} color={colors.textPrimary} /></Pressable>
        <TextInput autoFocus value={q} onChangeText={setQ} onSubmitEditing={submit} placeholder="Search anime..." placeholderTextColor={colors.textMuted} style={styles.input} returnKeyType="search" />
        <Pressable onPress={submit} style={styles.searchGo}><Ionicons name="search" size={18} color="#fff" /></Pressable>
      </View></SafeAreaView></View>
    </Modal>
    <Modal visible={menu} transparent animationType="slide" onRequestClose={() => setMenu(false)}>
      <View style={styles.drawerShade}><SafeAreaView style={styles.drawer}><View style={styles.drawerTop}><Image source={{ uri: LOGO }} style={styles.drawerLogo} contentFit="contain" /><Pressable onPress={() => setMenu(false)} style={styles.close}><Ionicons name="close" size={22} color={colors.textPrimary} /></Pressable></View>
        <Pressable onPress={() => { setMenu(false); setSearch(true); }} style={styles.drawerSearch}><Ionicons name="search-outline" size={17} color={colors.textMuted} /><Text style={styles.drawerSearchText}>Search anime...</Text></Pressable>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>NAVIGATE</Text>
          {NAV.map(([label, route, icon]) => <Pressable key={route} onPress={() => go(route)} style={[styles.item, routeName === route && styles.itemActive]}><Ionicons name={icon as any} size={18} color={routeName === route ? colors.accent : colors.textSecondary} /><Text style={[styles.itemText, routeName === route && styles.itemTextActive]}>{label}</Text></Pressable>)}
          <View style={styles.divider}/><Text style={styles.label}>YOUR VAULT</Text>
          {[
            ['My List','MyList','list-outline'], ['Watch History','History','time-outline'], ['Watch Now','WatchNow','play-circle-outline'], ['My Profile','Profile','person-outline'],
          ].map(([label, route, icon]) => <Pressable key={route} onPress={() => go(route)} style={styles.item}><Ionicons name={icon as any} size={18} color={colors.textSecondary} /><Text style={styles.itemText}>{label}</Text></Pressable>)}
          <View style={styles.divider}/>
          {[['Community Chat','Chat','chatbubble-ellipses-outline'],['Notifications','Notifications','notifications-outline'],['Announcements','Announcements','megaphone-outline'],['Settings','AccountSettings','settings-outline']].map(([label,route,icon]) => <Pressable key={route} onPress={() => go(route)} style={styles.item}><Ionicons name={icon as any} size={18} color={colors.textSecondary}/><Text style={styles.itemText}>{label}</Text></Pressable>)}
          <View style={{height:30}}/>
        </ScrollView>
      </SafeAreaView></View>
    </Modal>
  </>;
}

export function WebSectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text><View style={styles.rule}/>{action ? <Pressable onPress={onAction} style={styles.sectionAction}><Text style={styles.actionText}>{action}</Text><Ionicons name="arrow-forward" size={12} color={colors.textSecondary}/></Pressable> : null}</View>;
}

export function WebAnimeCard({ title, image, score, type, episodes, status, onPress, width = 138 }: { title: string; image?: string | null; score?: number | null; type?: string; episodes?: number; status?: string | null; onPress?: () => void; width?: number }) {
  return <Pressable onPress={onPress} style={({pressed}) => [styles.card,{width},pressed&&styles.pressed]}>
    <View style={[styles.poster,{width,height:width*1.43}]}>{image ? <Image source={{uri:image}} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={120}/> : <View style={styles.fallback}><Text style={styles.fallbackText}>AV</Text></View>}
      {score != null ? <View style={styles.score}><Ionicons name="star" size={10} color={colors.gold}/><Text style={styles.scoreText}>{score.toFixed(1)}</Text></View>:null}
      {status ? <View style={styles.status}><Text style={styles.statusText}>{status}</Text></View>:null}
      <View style={styles.cardShade}/><View style={styles.add}><Ionicons name="add" size={17} color="#fff"/></View>
    </View><Text style={styles.title} numberOfLines={2}>{title}</Text><Text style={styles.meta} numberOfLines={1}>{[type, episodes ? `${episodes} eps` : ''].filter(Boolean).join(' · ')}</Text>
  </Pressable>;
}

export function WebFooter() { return <View style={styles.footer}><Image source={{uri:LOGO}} style={styles.footerLogo} contentFit="contain"/><Text style={styles.footerTag}>Free & Ad-free anime streaming platform</Text><View style={styles.footerGrid}><View><Text style={styles.footerHead}>Navigate</Text><Text style={styles.footerLink}>Home</Text><Text style={styles.footerLink}>Browse</Text><Text style={styles.footerLink}>Seasonal</Text></View><View><Text style={styles.footerHead}>Your Vault</Text><Text style={styles.footerLink}>My List</Text><Text style={styles.footerLink}>Profile</Text><Text style={styles.footerLink}>Watch History</Text></View><View><Text style={styles.footerHead}>Info</Text><Text style={styles.footerLink}>Announcements</Text><Text style={styles.footerLink}>Terms of Use</Text><Text style={styles.footerLink}>Privacy Policy</Text></View></View><Text style={styles.copy}>© 2026 AniVault.</Text></View>; }

const styles=StyleSheet.create({
 header:{height:64,backgroundColor:'rgba(10,11,14,.98)',borderBottomWidth:1,borderBottomColor:colors.border},safe:{flex:1},headerRow:{flex:1,paddingHorizontal:15,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},brand:{width:128,height:38,justifyContent:'center'},logo:{width:118,height:32},actions:{flexDirection:'row',gap:8},iconButton:{width:38,height:38,borderRadius:8,backgroundColor:colors.bgSurface,borderWidth:1,borderColor:colors.border,alignItems:'center',justifyContent:'center'},modalShade:{flex:1,backgroundColor:'rgba(4,5,8,.94)'},searchPanel:{paddingHorizontal:12,paddingTop:8},searchBox:{height:52,backgroundColor:colors.bgSurface,borderWidth:1,borderColor:colors.border,borderRadius:10,flexDirection:'row',alignItems:'center'},back:{width:42,height:42,alignItems:'center',justifyContent:'center'},input:{flex:1,color:colors.textPrimary,fontFamily:fonts.body,fontSize:15},searchGo:{width:40,height:40,borderRadius:7,backgroundColor:colors.accent,alignItems:'center',justifyContent:'center',marginRight:5},drawerShade:{flex:1,backgroundColor:'rgba(0,0,0,.72)'},drawer:{flex:1,backgroundColor:colors.bgBase,paddingHorizontal:16},drawerTop:{height:70,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},drawerLogo:{width:122,height:34},close:{width:38,height:38,borderRadius:8,backgroundColor:colors.bgSurface,borderWidth:1,borderColor:colors.border,alignItems:'center',justifyContent:'center'},drawerSearch:{height:45,borderRadius:9,borderWidth:1,borderColor:colors.border,backgroundColor:colors.bgSurface,flexDirection:'row',alignItems:'center',gap:9,paddingHorizontal:12,marginBottom:18},drawerSearchText:{color:colors.textMuted,fontFamily:fonts.body,fontSize:13},label:{color:colors.textMuted,fontFamily:fonts.displayMedium,fontSize:9,letterSpacing:1.5,marginBottom:7,marginTop:5},item:{minHeight:45,borderRadius:7,paddingHorizontal:11,flexDirection:'row',alignItems:'center',gap:12},itemActive:{backgroundColor:colors.bgHover},itemText:{color:colors.textSecondary,fontFamily:fonts.bodyMedium,fontSize:14},itemTextActive:{color:colors.textPrimary},divider:{height:1,backgroundColor:colors.border,marginVertical:12},section:{marginTop:27,marginBottom:13,paddingHorizontal:15,flexDirection:'row',alignItems:'center',gap:10},sectionTitle:{color:colors.accent,fontFamily:fonts.displayMedium,fontSize:12,letterSpacing:1.35,textTransform:'uppercase'},rule:{flex:1,height:1,backgroundColor:colors.border},sectionAction:{flexDirection:'row',gap:4,alignItems:'center'},actionText:{color:colors.textSecondary,fontFamily:fonts.bodyMedium,fontSize:10},card:{marginRight:12},pressed:{opacity:.72},poster:{overflow:'hidden',borderRadius:9,backgroundColor:colors.bgCard,borderWidth:1,borderColor:colors.border},fallback:{flex:1,alignItems:'center',justifyContent:'center'},fallbackText:{color:colors.accent,fontFamily:fonts.display,fontSize:22},score:{position:'absolute',top:7,left:7,backgroundColor:'rgba(0,0,0,.78)',paddingHorizontal:6,paddingVertical:3,borderRadius:4,flexDirection:'row',gap:3},scoreText:{color:colors.textPrimary,fontFamily:fonts.bodyBold,fontSize:9},status:{position:'absolute',bottom:7,left:7,backgroundColor:colors.accent,paddingHorizontal:6,paddingVertical:3,borderRadius:4},statusText:{color:'#fff',fontFamily:fonts.bodyBold,fontSize:8,textTransform:'uppercase'},cardShade:{position:'absolute',left:0,right:0,bottom:0,height:48,backgroundColor:'rgba(0,0,0,.2)'},add:{position:'absolute',right:7,bottom:7,width:27,height:27,borderRadius:14,backgroundColor:colors.accent,alignItems:'center',justifyContent:'center'},title:{color:colors.textPrimary,fontFamily:fonts.bodySemibold,fontSize:11.5,lineHeight:15,marginTop:7},meta:{color:colors.textMuted,fontFamily:fonts.body,fontSize:9.5,marginTop:2},footer:{marginTop:38,padding:22,paddingBottom:30,backgroundColor:colors.bgSurface,borderTopWidth:1,borderTopColor:colors.border},footerLogo:{width:115,height:31},footerTag:{color:colors.textMuted,fontFamily:fonts.body,fontSize:11,marginTop:8},footerGrid:{flexDirection:'row',justifyContent:'space-between',marginTop:22},footerHead:{color:colors.textPrimary,fontFamily:fonts.displayMedium,fontSize:10,marginBottom:8},footerLink:{color:colors.textMuted,fontFamily:fonts.body,fontSize:10,marginBottom:6},copy:{color:colors.textMuted,fontFamily:fonts.body,fontSize:9,marginTop:24}
});
