import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import BrowseScreen from '../screens/BrowseScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AnimeDetailScreen from '../screens/AnimeDetailScreen';
import WatchScreen from '../screens/WatchScreen';
import AccountSettingsScreen from '../screens/AccountSettingsScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import FollowListScreen from '../screens/FollowListScreen';
import WatchNowScreen from '../screens/WatchNowScreen';
import HistoryScreen from '../screens/HistoryScreen';
import AnnouncementsScreen from '../screens/AnnouncementsScreen';
import CharacterScreen from '../screens/CharacterScreen';
import { fonts } from '../theme';

export type RootStackParamList = {
  Tabs: undefined; AnimeDetail: { id: number; title?: string }; Watch: { animeId: number; episodeNum: number; title?: string }; AccountSettings: undefined;
  UserProfile: { username: string }; FollowList: { userId: number; type: 'followers' | 'following'; username: string }; WatchNow: undefined; History: undefined; Announcements: undefined; Character: { id: number };
};
export type TabParamList = { Home: undefined; Search: undefined; Schedule: undefined; MySpace: undefined };

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();
const navTheme = { dark: true, colors: { primary: '#fff', background: '#000', card: '#08080c', text: '#fff', border: 'rgba(255,255,255,0.08)', notification: '#fff' } } as const;

function ScheduleTab() { const navigation = useNavigation<any>(); return <WatchNowScreen navigation={navigation} route={{} as any} />; }
function MySpaceTab() { return <ProfileScreen />; }
function TabIcon({ name, label, focused }: { name: keyof typeof Ionicons.glyphMap; label: string; focused: boolean }) {
  return <View style={styles.tabItem}><Ionicons name={name} size={17} color={focused ? '#fff' : 'rgba(255,255,255,0.42)'} /><Text style={[styles.tabLabel, { color: focused ? '#fff' : 'rgba(255,255,255,0.40)', fontFamily: focused ? fonts.bodyBold : fonts.bodyMedium }]}>{label}</Text></View>;
}
function Tabs() {
  return <Tab.Navigator screenOptions={({ route }) => ({ headerShown: false, tabBarShowLabel: false, tabBarStyle: styles.tabBar, tabBarItemStyle: styles.tabBarItem, tabBarIcon: ({ focused }) => {
    const map: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string }> = { Home: { icon: 'home', label: 'Home' }, Search: { icon: 'search', label: 'Search' }, Schedule: { icon: 'calendar-outline', label: 'Schedule' }, MySpace: { icon: 'person-outline', label: 'My Space' } };
    const item = map[route.name]; return <TabIcon name={item.icon} label={item.label} focused={focused} />;
  })}>
    <Tab.Screen name="Home" component={HomeScreen} /><Tab.Screen name="Search" component={BrowseScreen} /><Tab.Screen name="Schedule" component={ScheduleTab} /><Tab.Screen name="MySpace" component={MySpaceTab} />
  </Tab.Navigator>;
}
export default function RootNavigator() {
  return <NavigationContainer theme={navTheme as any}><Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#000' }, headerTintColor: '#fff', headerTitleStyle: { fontFamily: fonts.bodyBold } }}>
    <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
    <Stack.Screen name="AnimeDetail" component={AnimeDetailScreen} options={({ route }) => ({ title: route.params?.title ?? 'Anime' })} />
    <Stack.Screen name="Watch" component={WatchScreen} options={{ title: 'Watching', headerShown: false }} />
    <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} options={{ title: 'Account Settings' }} />
    <Stack.Screen name="UserProfile" component={UserProfileScreen} options={({ route }) => ({ title: route.params?.username ?? 'Profile' })} />
    <Stack.Screen name="FollowList" component={FollowListScreen} options={({ route }) => ({ title: route.params?.type === 'followers' ? 'Followers' : 'Following' })} />
    <Stack.Screen name="WatchNow" component={WatchNowScreen} options={{ title: 'Watch Now' }} /><Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Watch History' }} />
    <Stack.Screen name="Announcements" component={AnnouncementsScreen} options={{ title: 'Announcements' }} /><Stack.Screen name="Character" component={CharacterScreen} options={{ title: 'Character' }} />
  </Stack.Navigator></NavigationContainer>;
}
const styles = StyleSheet.create({ tabBar: { height: 58, backgroundColor: '#08080c', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', elevation: 0, paddingTop: 4, paddingBottom: 4 }, tabBarItem: { justifyContent: 'center' }, tabItem: { alignItems: 'center', justifyContent: 'center', gap: 2 }, tabLabel: { fontSize: 8, letterSpacing: 0.05 } });
