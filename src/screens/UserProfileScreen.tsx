import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { getUserProfile, toggleFollow, PublicProfile } from '../api/social';
import { WebHeader, WebSectionHeader, WebFooter } from '../components/WebChrome';
import { colors, fonts, radius } from '../theme';

const STAT_LABELS: [keyof PublicProfile['stats'], string, string][] = [
  ['watching', 'Watching', 'play-circle-outline'],
  ['completed', 'Completed', 'checkmark-circle-outline'],
  ['plan_to_watch', 'Plan to Watch', 'bookmark-outline'],
  ['on_hold', 'On Hold', 'pause-circle-outline'],
  ['dropped', 'Dropped', 'close-circle-outline'],
];

export default function UserProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { username } = route.params as { username: string };
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followBusy, setFollowBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setProfile(await getUserProfile(username)); }
    catch (e: any) { setError(e?.message ?? 'Failed to load profile.'); }
    finally { setLoading(false); }
  }, [username]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onToggleFollow = async () => {
    if (!profile || followBusy) return;
    const wasFollowing = profile.isFollowing;
    setFollowBusy(true);
    setProfile({ ...profile, isFollowing: !wasFollowing, followerCount: profile.followerCount + (wasFollowing ? -1 : 1) });
    try { const result = await toggleFollow(profile.user.id); if (!result.success) throw new Error(result.message); }
    catch { setProfile(p => p ? { ...p, isFollowing: wasFollowing, followerCount: p.followerCount + (wasFollowing ? 1 : -1) } : p); }
    finally { setFollowBusy(false); }
  };

  if (loading && !profile) return <View style={styles.center}><ActivityIndicator color={colors.accent} size="small" /></View>;
  if (!profile) return <View style={styles.center}><Ionicons name="person-remove-outline" size={42} color={colors.textMuted}/><Text style={styles.errorTitle}>USER NOT FOUND</Text><Text style={styles.errorText}>{error ?? 'This profile is unavailable.'}</Text><Pressable onPress={load} style={styles.retry}><Text style={styles.retryText}>RETRY</Text></Pressable></View>;

  const { user, stats, badges, favorites, followerCount, followingCount, isOwn, isFollowing, canViewFollowers, canViewFollowing } = profile;
  return <View style={styles.root}>
    <WebHeader navigation={navigation} routeName="UserProfile" />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.profileHero}>
        <View style={styles.avatarRing}><Image source={{ uri: user.avatarUrl ?? undefined }} style={styles.avatar} contentFit="cover" /></View>
        <Text style={styles.username}>{user.username}</Text>
        {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : <Text style={styles.bioMuted}>No bio yet.</Text>}
        <View style={styles.followStats}>
          <Pressable disabled={!canViewFollowers} onPress={() => navigation.navigate('FollowList',{userId:user.id,type:'followers',username:user.username})} style={styles.followStat}><Text style={styles.followNumber}>{canViewFollowers ? followerCount : '—'}</Text><Text style={styles.followLabel}>FOLLOWERS</Text></Pressable>
          <View style={styles.statDivider}/>
          <Pressable disabled={!canViewFollowing} onPress={() => navigation.navigate('FollowList',{userId:user.id,type:'following',username:user.username})} style={styles.followStat}><Text style={styles.followNumber}>{canViewFollowing ? followingCount : '—'}</Text><Text style={styles.followLabel}>FOLLOWING</Text></Pressable>
        </View>
        {!isOwn && <Pressable onPress={onToggleFollow} disabled={followBusy} style={[styles.followButton,isFollowing&&styles.followingButton]}><Ionicons name={isFollowing?'checkmark':'person-add-outline'} size={15} color={isFollowing?colors.accent:'#fff'}/><Text style={[styles.followButtonText,isFollowing&&styles.followingText]}>{isFollowing?'Following':'Follow'}</Text></Pressable>}
      </View>

      {badges.length > 0 && <><WebSectionHeader title="Badges"/><View style={styles.badges}>{badges.map(b=><View key={b.id} style={[styles.badge,{borderColor:b.color||colors.borderAccent}]}>{b.imageUrl?<Image source={{uri:b.imageUrl}} style={styles.badgeImg}/>:<Text style={styles.badgeIcon}>{b.iconText}</Text>}<Text style={styles.badgeName}>{b.name}</Text></View>)}</View></>}

      <WebSectionHeader title="Library Stats"/><View style={styles.statsGrid}>{STAT_LABELS.map(([key,label,icon])=><View key={key} style={styles.statCard}><Ionicons name={icon as any} size={18} color={colors.accent}/><Text style={styles.statValue}>{stats[key]}</Text><Text style={styles.statLabel}>{label}</Text></View>)}</View>

      <WebSectionHeader title="Favorites"/>
      {favorites === null ? <View style={styles.privateBox}><Ionicons name="lock-closed-outline" size={18} color={colors.textMuted}/><Text style={styles.privateText}>Favorites are hidden by this user.</Text></View> : favorites.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.favRow}>{favorites.map(item=><Pressable key={item.animeId} onPress={()=>navigation.navigate('AnimeDetail',{id:item.animeId,title:item.title})} style={styles.favCard}><Image source={{uri:item.image}} style={styles.favPoster} contentFit="cover"/><View style={styles.favShade}/><Text style={styles.favTitle} numberOfLines={2}>{item.title}</Text></Pressable>)}</ScrollView> : <View style={styles.privateBox}><Ionicons name="heart-outline" size={18} color={colors.textMuted}/><Text style={styles.privateText}>No favorites yet.</Text></View>}
      <WebFooter/>
    </ScrollView>
  </View>;
}

const styles=StyleSheet.create({root:{flex:1,backgroundColor:colors.bgBase},content:{paddingBottom:0},center:{flex:1,backgroundColor:colors.bgBase,alignItems:'center',justifyContent:'center',padding:30},errorTitle:{color:colors.accent,fontFamily:fonts.displayMedium,fontSize:11,letterSpacing:1.3,marginTop:10},errorText:{color:colors.textMuted,fontFamily:fonts.body,fontSize:11,textAlign:'center',marginTop:5},retry:{marginTop:15,backgroundColor:colors.accent,paddingHorizontal:18,paddingVertical:9,borderRadius:radius.sm},retryText:{color:'#fff',fontFamily:fonts.bodyBold,fontSize:10},profileHero:{alignItems:'center',paddingHorizontal:20,paddingTop:25,paddingBottom:24,backgroundColor:colors.bgSurface,borderBottomWidth:1,borderBottomColor:colors.border},avatarRing:{width:96,height:96,borderRadius:48,borderWidth:2,borderColor:colors.accent,backgroundColor:colors.bgCard,padding:3},avatar:{width:'100%',height:'100%',borderRadius:45},username:{color:colors.textPrimary,fontFamily:fonts.display,fontSize:20,marginTop:12},bio:{color:colors.textSecondary,fontFamily:fonts.body,fontSize:11,textAlign:'center',marginTop:6,maxWidth:330,lineHeight:17},bioMuted:{color:colors.textMuted,fontFamily:fonts.body,fontSize:10,marginTop:6},followStats:{flexDirection:'row',alignItems:'center',marginTop:17},followStat:{minWidth:100,alignItems:'center'},followNumber:{color:colors.textPrimary,fontFamily:fonts.displayMedium,fontSize:16},followLabel:{color:colors.textMuted,fontFamily:fonts.displayMedium,fontSize:7,letterSpacing:1.2,marginTop:3},statDivider:{height:27,width:1,backgroundColor:colors.border},followButton:{marginTop:16,height:38,minWidth:116,paddingHorizontal:18,borderRadius:7,backgroundColor:colors.accent,flexDirection:'row',gap:7,alignItems:'center',justifyContent:'center'},followingButton:{backgroundColor:'transparent',borderWidth:1,borderColor:colors.borderAccent},followButtonText:{color:'#fff',fontFamily:fonts.bodySemibold,fontSize:11},followingText:{color:colors.accent},badges:{paddingHorizontal:15,flexDirection:'row',flexWrap:'wrap',gap:8},badge:{minHeight:35,paddingHorizontal:10,borderRadius:18,borderWidth:1,backgroundColor:colors.bgCard,flexDirection:'row',alignItems:'center',gap:6},badgeImg:{width:18,height:18},badgeIcon:{fontSize:14},badgeName:{color:colors.textSecondary,fontFamily:fonts.bodyMedium,fontSize:9},statsGrid:{paddingHorizontal:15,flexDirection:'row',flexWrap:'wrap',gap:8},statCard:{width:'31.9%',minHeight:88,borderRadius:8,borderWidth:1,borderColor:colors.border,backgroundColor:colors.bgCard,padding:10,justifyContent:'center'},statValue:{color:colors.textPrimary,fontFamily:fonts.display,fontSize:17,marginTop:7},statLabel:{color:colors.textMuted,fontFamily:fonts.body,fontSize:8,marginTop:3},favRow:{paddingHorizontal:15,gap:10},favCard:{width:104,height:150,borderRadius:8,overflow:'hidden',backgroundColor:colors.bgCard,borderWidth:1,borderColor:colors.border,position:'relative'},favPoster:{width:'100%',height:'100%'},favShade:{position:'absolute',left:0,right:0,bottom:0,height:58,backgroundColor:'rgba(0,0,0,.58)'},favTitle:{position:'absolute',left:7,right:7,bottom:7,color:'#fff',fontFamily:fonts.bodySemibold,fontSize:9,lineHeight:12},privateBox:{marginHorizontal:15,minHeight:60,borderRadius:8,borderWidth:1,borderColor:colors.border,backgroundColor:colors.bgSurface,alignItems:'center',justifyContent:'center',gap:6},privateText:{color:colors.textMuted,fontFamily:fonts.body,fontSize:10}});
