import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
import SeasonalScreen from '../screens/SeasonalScreen';
import TopAnimeScreen from '../screens/TopAnimeScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import { colors } from '../theme';

export type RootStackParamList = {
  Home: undefined;
  MyList: undefined;
  Browse: { q?: string } | undefined;
  Chat: undefined;
  Notifications: undefined;
  Profile: undefined;
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
  Seasonal: undefined;
  TopAnime: undefined;
  Schedule: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const navTheme = { dark: true, colors: { primary: colors.accent, background: colors.bgBase, card: colors.bgSurface, text: colors.textPrimary, border: colors.border, notification: colors.accent } } as const;

export default function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme as any}>
      <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgBase }, animation: 'fade' }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="MyList" component={MyListScreen} />
        <Stack.Screen name="Browse" component={BrowseScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="AnimeDetail" component={AnimeDetailScreen} />
        <Stack.Screen name="Watch" component={WatchScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} />
        <Stack.Screen name="FollowList" component={FollowListScreen} />
        <Stack.Screen name="WatchNow" component={WatchNowScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="Downloads" component={DownloadsScreen} />
        <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
        <Stack.Screen name="Character" component={CharacterScreen} />
        <Stack.Screen name="Seasonal" component={SeasonalScreen} />
        <Stack.Screen name="TopAnime" component={TopAnimeScreen} />
        <Stack.Screen name="Schedule" component={ScheduleScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
