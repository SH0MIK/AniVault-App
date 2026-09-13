import React, { useState } from 'react';
import { Image } from 'expo-image';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '../theme';

const LOGO = 'https://www.anivault.co/assets/img/site-img/logo.png';
const NAV = [
  ['Home', 'Home', 'home-outline'],
  ['Browse', 'Browse', 'search-outline'],
  ['Seasonal', 'Seasonal', 'flame-outline'],
  ['Top Anime', 'TopAnime', 'trophy-outline'],
  ['Schedule', 'Schedule', 'calendar-outline'],
] as const;

const VAULT = [
  ['My List', 'MyList', 'list-outline'],
  ['Watch History', 'History', 'time-outline'],
  ['Watch Now', 'WatchNow', 'play-circle-outline'],
  ['My Profile', 'Profile', 'person-outline'],
] as const;

const COMMUNITY = [
  ['Community Chat', 'Chat', 'chatbubble-ellipses-outline'],
  ['Notifications', 'Notifications', 'notifications-outline'],
  ['Announcements', 'Announcements', 'megaphone-outline'],
  ['Settings', 'AccountSettings', 'settings-outline'],
] as const;

export function WebHeader({ navigation, routeName }: { navigation: any; routeName?: string }) {
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [q, setQ] = useState('');

  const go = (route: string) => {
    setMenu(false);
    navigation.navigate(route);
  };

  const submit = () => {
    const value = q.trim();
    if (!value) return;
    setSearch(false);
    setQ('');
    navigation.navigate('Browse', { q: value });
  };

  const openSearch = () => {
    setMenu(false);
    setSearch(true);
  };

  return <>
    <View style={styles.header}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => go('Home')} style={({ pressed }) => [styles.brand, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="AniVault home">
            <Image source={{ uri: LOGO }} style={styles.logo} contentFit="contain" />
          </Pressable>
          <View style={styles.actions}>
            <Pressable onPress={openSearch} style={({ pressed }) => [styles.iconButton, pressed && styles.iconPressed]} accessibilityRole="button" accessibilityLabel="Search anime">
              <Ionicons name="search-outline" size={20} color={colors.textPrimary} />
            </Pressable>
            <Pressable onPress={() => setMenu(true)} style={({ pressed }) => [styles.iconButton, pressed && styles.iconPressed]} accessibilityRole="button" accessibilityLabel="Open navigation menu">
              <Ionicons name="menu-outline" size={22} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>

    <Modal visible={search} transparent animationType="fade" onRequestClose={() => setSearch(false)} statusBarTranslucent>
      <View style={styles.modalShade}>
        <SafeAreaView style={styles.searchPanel}>
          <View style={styles.searchBox}>
            <Pressable onPress={() => setSearch(false)} style={styles.back} accessibilityRole="button" accessibilityLabel="Close search">
              <Ionicons name="arrow-back" size={21} color={colors.textPrimary} />
            </Pressable>
            <TextInput
              autoFocus
              value={q}
              onChangeText={setQ}
              onSubmitEditing={submit}
              placeholder="Search anime..."
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              returnKeyType="search"
              selectionColor={colors.accent}
            />
            <Pressable onPress={submit} style={({ pressed }) => [styles.searchGo, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Submit search">
              <Ionicons name="search" size={18} color="#fff" />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>

    <Modal visible={menu} transparent animationType="slide" onRequestClose={() => setMenu(false)} statusBarTranslucent>
      <View style={styles.drawerShade}>
        <SafeAreaView style={styles.drawer}>
          <View style={styles.drawerTop}>
            <Image source={{ uri: LOGO }} style={styles.drawerLogo} contentFit="contain" />
            <Pressable onPress={() => setMenu(false)} style={({ pressed }) => [styles.close, pressed && styles.iconPressed]} accessibilityRole="button" accessibilityLabel="Close navigation menu">
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </Pressable>
          </View>

          <Pressable onPress={openSearch} style={({ pressed }) => [styles.drawerSearch, pressed && styles.drawerSearchPressed]} accessibilityRole="button" accessibilityLabel="Search anime">
            <Ionicons name="search-outline" size={17} color={colors.textMuted} />
            <Text style={styles.drawerSearchText}>Search anime...</Text>
          </Pressable>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.drawerContent}>
            <Text style={styles.label}>NAVIGATE</Text>
            {NAV.map(([label, route, icon]) => {
              const active = routeName === route;
              return <Pressable key={route} onPress={() => go(route)} style={({ pressed }) => [styles.item, active && styles.itemActive, pressed && styles.itemPressed]} accessibilityRole="button">
                <View style={[styles.itemIcon, active && styles.itemIconActive]}>
                  <Ionicons name={icon as any} size={18} color={active ? colors.accent : colors.textSecondary} />
                </View>
                <Text style={[styles.itemText, active && styles.itemTextActive]}>{label}</Text>
                {active ? <View style={styles.activeDot} /> : null}
              </Pressable>;
            })}

            <View style={styles.divider} />
            <Text style={styles.label}>YOUR VAULT</Text>
            {VAULT.map(([label, route, icon]) => <Pressable key={route} onPress={() => go(route)} style={({ pressed }) => [styles.item, pressed && styles.itemPressed]} accessibilityRole="button">
              <View style={styles.itemIcon}>
                <Ionicons name={icon as any} size={18} color={colors.textSecondary} />
              </View>
              <Text style={styles.itemText}>{label}</Text>
            </Pressable>)}

            <View style={styles.divider} />
            <Text style={styles.label}>COMMUNITY</Text>
            {COMMUNITY.map(([label, route, icon]) => <Pressable key={route} onPress={() => go(route)} style={({ pressed }) => [styles.item, pressed && styles.itemPressed]} accessibilityRole="button">
              <View style={styles.itemIcon}>
                <Ionicons name={icon as any} size={18} color={colors.textSecondary} />
              </View>
              <Text style={styles.itemText}>{label}</Text>
            </Pressable>)}
            <View style={styles.drawerBottom}>
              <Text style={styles.drawerVersion}>ANIVAULT • 2026</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  </>;
}

export function WebSectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <View style={styles.section}>
    <View style={styles.sectionTitleWrap}>
      <View style={styles.sectionAccent} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <View style={styles.rule} />
    {action ? <Pressable onPress={onAction} style={({ pressed }) => [styles.sectionAction, pressed && styles.pressed]}>
      <Text style={styles.actionText}>{action}</Text>
      <Ionicons name="arrow-forward" size={12} color={colors.textSecondary} />
    </Pressable> : null}
  </View>;
}

export function WebAnimeCard({ title, image, score, type, episodes, status, onPress, width = 138 }: { title: string; image?: string | null; score?: number | null; type?: string; episodes?: number; status?: string | null; onPress?: () => void; width?: number }) {
  return <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.card, { width }, pressed && styles.cardPressed]}
    accessibilityRole="button"
    accessibilityLabel={title}
  >
    <View style={[styles.poster, { width, height: width * 1.43 }]}>
      {image ? <Image source={{ uri: image }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={120} /> : <View style={styles.fallback}><Text style={styles.fallbackText}>AV</Text></View>}
      <View style={styles.posterVignette} pointerEvents="none" />
      {score != null ? <View style={styles.score}>
        <Ionicons name="star" size={10} color={colors.gold} />
        <Text style={styles.scoreText}>{score.toFixed(1)}</Text>
      </View> : null}
      {status ? <View style={styles.status}>
        <Text style={styles.statusText}>{status}</Text>
      </View> : null}
      <View style={styles.add}>
        <Ionicons name="add" size={17} color="#fff" />
      </View>
    </View>
    <Text style={styles.title} numberOfLines={2}>{title}</Text>
    <Text style={styles.meta} numberOfLines={1}>{[type, episodes ? `${episodes} eps` : ''].filter(Boolean).join(' · ')}</Text>
  </Pressable>;
}

export function WebFooter() {
  return <View style={styles.footer}>
    <Image source={{ uri: LOGO }} style={styles.footerLogo} contentFit="contain" />
    <Text style={styles.footerTag}>Free & Ad-free anime streaming platform</Text>
    <View style={styles.footerRule} />
    <View style={styles.footerGrid}>
      <View style={styles.footerColumn}>
        <Text style={styles.footerHead}>Navigate</Text>
        <Text style={styles.footerLink}>Home</Text>
        <Text style={styles.footerLink}>Browse</Text>
        <Text style={styles.footerLink}>Seasonal</Text>
      </View>
      <View style={styles.footerColumn}>
        <Text style={styles.footerHead}>Your Vault</Text>
        <Text style={styles.footerLink}>My List</Text>
        <Text style={styles.footerLink}>Profile</Text>
        <Text style={styles.footerLink}>Watch History</Text>
      </View>
      <View style={styles.footerColumn}>
        <Text style={styles.footerHead}>Info</Text>
        <Text style={styles.footerLink}>Announcements</Text>
        <Text style={styles.footerLink}>Terms of Use</Text>
      </View>
    </View>
    <Text style={styles.copy}>© 2026 AniVault.</Text>
  </View>;
}

const styles = StyleSheet.create({
  header: { height: 64, backgroundColor: 'rgba(10,11,14,0.98)', borderBottomWidth: 1, borderBottomColor: colors.border },
  safe: { flex: 1 },
  headerRow: { flex: 1, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { width: 132, height: 40, justifyContent: 'center' },
  logo: { width: 118, height: 32 },
  actions: { flexDirection: 'row', gap: 8 },
  iconButton: { width: 38, height: 38, borderRadius: 9, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  iconPressed: { backgroundColor: colors.bgHover, borderColor: colors.borderAccent },
  modalShade: { flex: 1, backgroundColor: 'rgba(4,5,8,0.96)' },
  searchPanel: { paddingHorizontal: 12, paddingTop: 8 },
  searchBox: { height: 52, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.borderAccent, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', paddingRight: 5 },
  back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, color: colors.textPrimary, fontFamily: fonts.body, fontSize: 15, paddingVertical: 0 },
  searchGo: { width: 40, height: 40, borderRadius: 7, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  drawerShade: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)' },
  drawer: { flex: 1, backgroundColor: colors.bgBase, paddingHorizontal: 16 },
  drawerTop: { height: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  drawerLogo: { width: 122, height: 34 },
  close: { width: 38, height: 38, borderRadius: 9, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  drawerSearch: { height: 46, borderRadius: 9, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgSurface, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, marginBottom: 18 },
  drawerSearchPressed: { borderColor: colors.borderAccent, backgroundColor: colors.bgHover },
  drawerSearchText: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 },
  drawerContent: { paddingBottom: 18 },
  label: { color: colors.textMuted, fontFamily: fonts.displayMedium, fontSize: 9, letterSpacing: 1.6, marginBottom: 7, marginTop: 5 },
  item: { minHeight: 46, borderRadius: 8, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 10, position: 'relative' },
  itemActive: { backgroundColor: 'rgba(124,58,237,0.10)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.18)' },
  itemPressed: { opacity: 0.72 },
  itemIcon: { width: 32, height: 32, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  itemIconActive: { backgroundColor: 'rgba(124,58,237,0.12)' },
  itemText: { color: colors.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 14 },
  itemTextActive: { color: colors.textPrimary, fontFamily: fonts.bodySemibold },
  activeDot: { position: 'absolute', right: 10, width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 13 },
  drawerBottom: { paddingTop: 24, alignItems: 'center' },
  drawerVersion: { color: colors.textMuted, fontFamily: fonts.displayMedium, fontSize: 8, letterSpacing: 1.3 },
  section: { marginTop: 27, marginBottom: 13, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sectionAccent: { width: 3, height: 14, borderRadius: 2, backgroundColor: colors.accent },
  sectionTitle: { color: colors.accent, fontFamily: fonts.displayMedium, fontSize: 12, letterSpacing: 1.35, textTransform: 'uppercase' },
  rule: { flex: 1, height: 1, backgroundColor: colors.border },
  sectionAction: { flexDirection: 'row', gap: 4, alignItems: 'center', paddingVertical: 4 },
  actionText: { color: colors.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 10 },
  card: { marginRight: 12 },
  cardPressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  pressed: { opacity: 0.72 },
  poster: { overflow: 'hidden', borderRadius: 10, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fallbackText: { color: colors.accent, fontFamily: fonts.display, fontSize: 22 },
  posterVignette: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.07)' },
  score: { position: 'absolute', top: 8, left: 8, height: 23, backgroundColor: 'rgba(7,8,11,0.86)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', paddingHorizontal: 7, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 3 },
  scoreText: { color: colors.textPrimary, fontFamily: fonts.bodyBold, fontSize: 9.5 },
  status: { position: 'absolute', bottom: 8, left: 8, maxWidth: '68%', backgroundColor: 'rgba(124,58,237,0.92)', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  statusText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 8, textTransform: 'uppercase' },
  add: { position: 'absolute', right: 8, bottom: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.accent, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.textPrimary, fontFamily: fonts.bodySemibold, fontSize: 11.5, lineHeight: 15, marginTop: 8 },
  meta: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 9.5, marginTop: 3 },
  footer: { marginTop: 38, padding: 22, paddingBottom: 30, backgroundColor: colors.bgSurface, borderTopWidth: 1, borderTopColor: colors.border },
  footerLogo: { width: 115, height: 31 },
  footerTag: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 11, lineHeight: 16, marginTop: 8 },
  footerRule: { height: 1, backgroundColor: colors.border, marginTop: 20 },
  footerGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 20 },
  footerColumn: { flex: 1 },
  footerHead: { color: colors.textPrimary, fontFamily: fonts.displayMedium, fontSize: 10, marginBottom: 8 },
  footerLink: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 10, lineHeight: 15, marginBottom: 6 },
  copy: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 9, marginTop: 24 },
});
