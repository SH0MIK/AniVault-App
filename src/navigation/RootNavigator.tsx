import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import MyListScreen from '../screens/MyListScreen';
import BrowseScreen from '../screens/BrowseScreen';
import HomeScreen from '../screens/HomeScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AnimeDetailScreen from '../screens/AnimeDetailScreen';
import WatchScreen from '../screens/WatchScreen';
import AccountSettingsScreen from '../screens/AccountSettingsScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import FollowListScreen from '../screens/FollowListScreen';
import WatchNowScreen from '../screens/WatchNowScreen';
import HistoryScreen from '../screens/HistoryScreen';
import DownloadsScreen from '../screens/DownloadsScreen';
import AnnouncementsScreen from '../screens/AnnouncementsScreen';
import CharacterScreen from '../screens/CharacterScreen';
import { colors } from '../theme';

export type RootStackParamList = {
  Tabs: undefined;
  AnimeDetail: { id: number; title?: string };
  Watch: { animeId: number; episodeNum: number; title?: string };
  AccountSettings: undefined;
  UserProfile: { username: string };
  FollowList: { userId: number; type: 'followers' | 'following'; username: string };
  WatchNow: undefined;
  History: undefined;
  Downloads: undefined;
  Announcements: undefined;
  Character: { id: number };
};

export type TabParamList = {
  Home: undefined;
  MyList: undefined;
  Browse: undefined;
  Chat: undefined;
  Notifications: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const navTheme = {
  dark: true,
  colors: {
    primary: colors.accent, background: colors.bgBase, card: colors.bgSurface,
    text: colors.textPrimary, border: colors.border, notification: colors.accent,
  },
} as const;

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.bgSurface, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.bgSurface },
        headerTintColor: colors.textPrimary,
        tabBarIcon: ({ color, size }) => {
          const map: Record<string, string> = { Home: 'home', MyList: 'list', Browse: 'search', Chat: 'chatbubbles', Notifications: 'notifications', Profile: 'person' };
          return <Ionicons name={(map[route.name] ?? 'ellipse') as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="MyList" component={MyListScreen} options={{ title: 'My List' }} />
      <Tab.Screen name="Browse" component={BrowseScreen} options={{ title: 'Browse', headerShown: false }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme as any}>
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.bgSurface }, headerTintColor: colors.textPrimary }}>
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="AnimeDetail"
          component={AnimeDetailScreen}
          options={({ route }) => ({ title: route.params?.title ?? 'Anime' })}
        />
        <Stack.Screen name="Watch" component={WatchScreen} options={{ title: 'Watching', headerShown: false }} />
        <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} options={{ title: 'Account Settings' }} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} options={({ route }) => ({ title: route.params?.username ?? 'Profile' })} />
        <Stack.Screen
          name="FollowList"
          component={FollowListScreen}
          options={({ route }) => ({ title: route.params?.type === 'followers' ? 'Followers' : 'Following' })}
        />
        <Stack.Screen name="WatchNow" component={WatchNowScreen} options={{ title: 'Watch Now' }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Watch History' }} />
        <Stack.Screen name="Downloads" component={DownloadsScreen} options={{ title: 'Downloads' }} />
        <Stack.Screen name="Announcements" component={AnnouncementsScreen} options={{ title: 'Announcements' }} />
        <Stack.Screen name="Character" component={CharacterScreen} options={{ title: 'Character' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
