import React from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '../theme';

const LOGO = 'https://www.anivault.co/assets/img/site-img/logo.png';

export function SiteHeader({ title = '', onSearch, onProfile }: { title?: string; onSearch?: () => void; onProfile?: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.brand} onPress={onProfile} accessibilityLabel="AniVault">
        <Image source={{ uri: LOGO }} style={styles.logo} contentFit="contain" />
        {title ? <Text style={styles.headerTitle}>{title}</Text> : null}
      </Pressable>
      <View style={styles.headerActions}>
        {onSearch ? <Pressable onPress={onSearch} style={styles.headerButton}><Ionicons name="search-outline" size={20} color={colors.textPrimary} /></Pressable> : null}
        {onProfile ? <Pressable onPress={onProfile} style={styles.headerButton}><Ionicons name="person-outline" size={19} color={colors.textPrimary} /></Pressable> : null}
      </View>
    </View>
  );
}

export function SectionTitle({ children, action, onAction }: { children: React.ReactNode; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{children}</Text>
      <View style={styles.rule} />
      {action ? <Pressable onPress={onAction} style={styles.action}><Text style={styles.actionText}>{action}</Text><Ionicons name="arrow-forward" size={13} color={colors.textSecondary} /></Pressable> : null}
    </View>
  );
}

export function AnimePosterCard({ title, image, subtitle, score, status, onPress, width = 128 }: { title: string; image?: string | null; subtitle?: string; score?: number | null; status?: string | null; onPress?: () => void; width?: number }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, { width }, pressed && styles.pressed]}>
      <View style={[styles.poster, { width, height: width * 1.43 }]}>
        {image ? <Image source={{ uri: image }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={140} /> : <View style={styles.fallback}><Text style={styles.fallbackText}>AV</Text></View>}
        <View style={styles.posterShade} />
        {score != null ? <View style={styles.score}><Ionicons name="star" size={10} color={colors.gold} /><Text style={styles.scoreText}>{score.toFixed(1)}</Text></View> : null}
        {status ? <View style={styles.status}><Text style={styles.statusText}>{status}</Text></View> : null}
        <View style={styles.add}><Ionicons name="add" size={17} color="#fff" /></View>
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
      {subtitle ? <Text style={styles.cardMeta} numberOfLines={1}>{subtitle}</Text> : null}
    </Pressable>
  );
}

export function GlassCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.glass, style]}>{children}</View>;
}

export const webStyles = styles;

const styles = StyleSheet.create({
  header: { height: 64, backgroundColor: 'rgba(10,11,14,0.97)', borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { height: 42, flexDirection: 'row', alignItems: 'center', gap: 9 },
  logo: { width: 116, height: 32 },
  headerTitle: { color: colors.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 12 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerButton: { width: 38, height: 38, borderRadius: 8, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { paddingHorizontal: 15, marginTop: 27, marginBottom: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { color: colors.accent, fontFamily: fonts.displayMedium, fontSize: 12, letterSpacing: 1.35, textTransform: 'uppercase' },
  rule: { flex: 1, height: 1, backgroundColor: colors.border },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { color: colors.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 10 },
  card: { marginRight: 12 },
  pressed: { opacity: 0.7 },
  poster: { overflow: 'hidden', borderRadius: 9, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  posterShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 48, backgroundColor: 'rgba(0,0,0,.22)' },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCard },
  fallbackText: { color: colors.accent, fontFamily: fonts.display, fontSize: 22 },
  score: { position: 'absolute', top: 7, left: 7, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, backgroundColor: 'rgba(0,0,0,.76)', borderRadius: 4 },
  scoreText: { color: colors.textPrimary, fontFamily: fonts.bodyBold, fontSize: 9 },
  status: { position: 'absolute', left: 7, bottom: 7, paddingHorizontal: 6, paddingVertical: 3, backgroundColor: colors.accent, borderRadius: 4 },
  statusText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 8, textTransform: 'uppercase' },
  add: { position: 'absolute', right: 7, bottom: 7, width: 27, height: 27, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: colors.textPrimary, fontFamily: fonts.bodySemibold, fontSize: 11.5, lineHeight: 15, marginTop: 7 },
  cardMeta: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 9.5, marginTop: 2 },
  glass: { backgroundColor: 'rgba(22,26,34,.94)', borderWidth: 1, borderColor: colors.border, borderRadius: 10 },
});
