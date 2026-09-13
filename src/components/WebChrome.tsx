import React, { useState } from 'react';
import { Image } from 'expo-image';
import { Modal, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '../theme';

const SITE_LOGO = 'https://www.anivault.co/assets/img/site-img/logo.png';

const LINKS = [
  { label: 'Home', route: 'Home', icon: 'home-outline' },
  { label: 'Browse', route: 'Browse', icon: 'search-outline' },
  { label: 'Seasonal', route: 'Seasonal', icon: 'flame-outline' },
  { label: 'Top Anime', route: 'TopAnime', icon: 'trophy-outline' },
  { label: 'Schedule', route: 'Schedule', icon: 'calendar-outline' },
  { label: 'Watch Now', route: 'WatchNow', icon: 'play-circle-outline' },
];

export function WebHeader({ navigation, routeName }: { navigation: any; routeName?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const go = (route: string) => {
    setMenuOpen(false);
    navigation.navigate(route);
  };

  const submitSearch = () => {
    const q = query.trim();
    if (!q) return;
    setSearchOpen(false);
    setQuery('');
    navigation.navigate('Browse', { q });
  };

  return (
    <>
      <View style={styles.header}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.row}>
            <Pressable onPress={() => go('Home')} style={styles.logoButton} accessibilityLabel="AniVault Home">
              <Image source={{ uri: SITE_LOGO }} style={styles.logo} contentFit="contain" />
            </Pressable>
            <View style={styles.actions}>
              <Pressable onPress={() => setSearchOpen(true)} style={styles.actionButton} accessibilityLabel="Search anime">
                <Ionicons name="search-outline" size={20} color={colors.textPrimary} />
              </Pressable>
              <Pressable onPress={() => setMenuOpen(true)} style={styles.actionButton} accessibilityLabel="Open menu">
                <Ionicons name="menu-outline" size={23} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <Modal visible={searchOpen} transparent animationType="fade" onRequestClose={() => setSearchOpen(false)}>
        <View style={styles.overlay}>
          <SafeAreaView style={styles.searchSheet}>
            <View style={styles.searchRow}>
              <Pressable onPress={() => setSearchOpen(false)} style={styles.searchBack}>
                <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
              </Pressable>
              <TextInput
                autoFocus
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={submitSearch}
                placeholder="Search anime..."
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                returnKeyType="search"
              />
              <Pressable onPress={submitSearch} style={styles.searchSubmit}>
                <Ionicons name="search" size={20} color="#fff" />
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal visible={menuOpen} transparent animationType="slide" onRequestClose={() => setMenuOpen(false)}>
        <View style={styles.menuOverlay}>
          <SafeAreaView style={styles.menuSheet}>
            <View style={styles.menuHeader}>
              <Image source={{ uri: SITE_LOGO }} style={styles.menuLogo} contentFit="contain" />
              <Pressable onPress={() => setMenuOpen(false)} style={styles.closeButton}>
                <Ionicons name="close" size={23} color={colors.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.menuSearch}>
              <Ionicons name="search-outline" size={18} color={colors.textMuted} />
              <Pressable style={{ flex: 1 }} onPress={() => { setMenuOpen(false); setSearchOpen(true); }}>
                <Text style={styles.menuSearchText}>Search anime...</Text>
              </Pressable>
            </View>

            <Text style={styles.menuLabel}>NAVIGATE</Text>
            {LINKS.map((item) => (
              <Pressable key={item.route} onPress={() => go(item.route)} style={[styles.menuItem, routeName === item.route && styles.menuItemActive]}>
                <Ionicons name={item.icon as any} size={19} color={routeName === item.route ? colors.accent : colors.textSecondary} />
                <Text style={[styles.menuItemText, routeName === item.route && styles.menuItemTextActive]}>{item.label}</Text>
              </Pressable>
            ))}

            <View style={styles.divider} />
            <Text style={styles.menuLabel}>YOUR VAULT</Text>
            <Pressable onPress={() => go('MyList')} style={styles.menuItem}>
              <Ionicons name="list-outline" size={19} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>My List</Text>
            </Pressable>
            <Pressable onPress={() => go('History')} style={styles.menuItem}>
              <Ionicons name="time-outline" size={19} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>Watch History</Text>
            </Pressable>
            <Pressable onPress={() => go('Downloads')} style={styles.menuItem}>
              <Ionicons name="download-outline" size={19} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>Downloads</Text>
            </Pressable>
            <Pressable onPress={() => go('Profile')} style={styles.menuItem}>
              <Ionicons name="person-outline" size={19} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>My Profile</Text>
            </Pressable>

            <View style={styles.divider} />
            <Pressable onPress={() => go('Chat')} style={styles.menuItem}>
              <Ionicons name="chatbubble-ellipses-outline" size={19} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>Community Chat</Text>
            </Pressable>
            <Pressable onPress={() => go('Notifications')} style={styles.menuItem}>
              <Ionicons name="notifications-outline" size={19} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>Notifications</Text>
            </Pressable>
            <Pressable onPress={() => go('Announcements')} style={styles.menuItem}>
              <Ionicons name="megaphone-outline" size={19} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>Announcements</Text>
            </Pressable>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

export function WebSectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.rule} />
      {action ? <Pressable onPress={onAction} style={styles.sectionAction}><Text style={styles.sectionActionText}>{action}</Text><Ionicons name="arrow-forward" size={13} color={colors.textSecondary} /></Pressable> : null}
    </View>
  );
}

export function WebAnimeCard({ title, image, score, type, episodes, status, onPress, width = 138 }: {
  title: string; image?: string | null; score?: number | null; type?: string; episodes?: number; status?: string | null; onPress?: () => void; width?: number;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.animeCard, { width }, pressed && styles.cardPressed]}>
      <View style={[styles.poster, { width, height: width * 1.43 }]}>
        {image ? <Image source={{ uri: image }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={140} /> : <View style={styles.posterFallback}><Text style={styles.fallbackText}>AV</Text></View>}
        {score != null ? <View style={styles.score}><Ionicons name="star" size={10} color={colors.gold} /><Text style={styles.scoreText}>{score.toFixed(1)}</Text></View> : null}
        {status ? <View style={styles.status}><Text style={styles.statusText}>{status}</Text></View> : null}
        <View style={styles.cardShade} />
        <View style={styles.addCircle}><Ionicons name="add" size={17} color="#fff" /></View>
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
      <View style={styles.metaRow}>
        {type ? <Text style={styles.metaText}>{type}</Text> : null}
        {episodes ? <Text style={styles.metaText}>· {episodes} eps</Text> : null}
      </View>
    </Pressable>
  );
}

export function WebFooter() {
  return (
    <View style={styles.footer}>
      <View style={styles.footerLogoRow}>
        <Image source={{ uri: SITE_LOGO }} style={styles.footerLogo} contentFit="contain" />
        <Text style={styles.footerTag}>Free & Ad-free anime streaming platform</Text>
      </View>
      <View style={styles.footerCols}>
        <View style={styles.footerCol}><Text style={styles.footerHead}>Navigate</Text><Text style={styles.footerLink}>Home</Text><Text style={styles.footerLink}>Browse</Text><Text style={styles.footerLink}>Seasonal</Text></View>
        <View style={styles.footerCol}><Text style={styles.footerHead}>Your Vault</Text><Text style={styles.footerLink}>My List</Text><Text style={styles.footerLink}>Profile</Text><Text style={styles.footerLink}>Downloads</Text></View>
        <View style={styles.footerCol}><Text style={styles.footerHead}>Info</Text><Text style={styles.footerLink}>Announcements</Text><Text style={styles.footerLink}>Terms of Use</Text><Text style={styles.footerLink}>Privacy Policy</Text></View>
      </View>
      <Text style={styles.copyright}>© 2026 AniVault. All rights reserved.</Text>
      <Text style={styles.made}>Made with ♥ for anime fans</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { height: 64, backgroundColor: 'rgba(10,11,14,0.96)', borderBottomWidth: 1, borderBottomColor: colors.border, zIndex: 20 },
  safe: { flex: 1 },
  row: { flex: 1, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoButton: { width: 126, height: 34, justifyContent: 'center' },
  logo: { width: 118, height: 32 },
  actions: { flexDirection: 'row', gap: 8 },
  actionButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(10,11,14,.94)' },
  searchSheet: { paddingHorizontal: 12, paddingTop: 8 },
  searchRow: { height: 52, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 7 },
  searchBack: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  searchInput: { flex: 1, color: colors.textPrimary, fontFamily: fonts.body, fontSize: 15, paddingHorizontal: 6 },
  searchSubmit: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(5,6,9,.76)' },
  menuSheet: { flex: 1, backgroundColor: colors.bgBase, paddingHorizontal: 16, paddingBottom: 24 },
  menuHeader: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  menuLogo: { width: 125, height: 34 },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  menuSearch: { height: 46, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, marginBottom: 20 },
  menuSearchText: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 },
  menuLabel: { color: colors.textMuted, fontFamily: fonts.displayMedium, fontSize: 9, letterSpacing: 1.6, marginTop: 6, marginBottom: 7 },
  menuItem: { minHeight: 47, paddingHorizontal: 12, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuItemActive: { backgroundColor: colors.bgHover },
  menuItemText: { color: colors.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 14 },
  menuItemTextActive: { color: colors.textPrimary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  sectionHeader: { marginTop: 26, marginBottom: 13, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { color: colors.accent, fontFamily: fonts.displayMedium, fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase' },
  rule: { flex: 1, height: 1, backgroundColor: colors.border },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionActionText: { color: colors.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 10 },
  animeCard: { marginRight: 13 },
  cardPressed: { opacity: .72 },
  poster: { overflow: 'hidden', borderRadius: radius.md, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  posterFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fallbackText: { color: colors.accent, fontFamily: fonts.display, fontSize: 22 },
  score: { position: 'absolute', top: 7, left: 7, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, backgroundColor: 'rgba(0,0,0,.74)' },
  scoreText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 10 },
  status: { position: 'absolute', left: 7, bottom: 7, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, backgroundColor: 'rgba(124,58,237,.86)' },
  statusText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 8, textTransform: 'uppercase' },
  cardShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 45, backgroundColor: 'rgba(0,0,0,.28)' },
  addCircle: { position: 'absolute', right: 7, bottom: 7, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: colors.textPrimary, fontFamily: fonts.bodySemibold, fontSize: 12, lineHeight: 16, marginTop: 7 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  metaText: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 9 },
  footer: { marginTop: 38, paddingHorizontal: 18, paddingTop: 28, paddingBottom: 28, backgroundColor: colors.bgSurface, borderTopWidth: 1, borderTopColor: colors.border },
  footerLogoRow: { marginBottom: 24 },
  footerLogo: { width: 120, height: 34 },
  footerTag: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 11, marginTop: 5 },
  footerCols: { flexDirection: 'row', gap: 26 },
  footerCol: { flex: 1 },
  footerHead: { color: colors.textPrimary, fontFamily: fonts.displayMedium, fontSize: 10, letterSpacing: 1, marginBottom: 8 },
  footerLink: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: 10, marginBottom: 5 },
  copyright: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 9, marginTop: 25 },
  made: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 9, marginTop: 4 },
});
