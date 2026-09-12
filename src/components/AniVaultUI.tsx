import React from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '../theme';

export function SiteHeader({ title = 'AniVault', onSearch, onProfile }: { title?: string; onSearch?: () => void; onProfile?: () => void }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerBrand}>
        <Text style={styles.logo}>ANIVAULT</Text>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      <View style={styles.headerActions}>
        {onSearch && <Pressable onPress={onSearch} style={styles.iconButton}><Text style={styles.icon}>⌕</Text></Pressable>}
        {onProfile && <Pressable onPress={onProfile} style={styles.iconButton}><Text style={styles.icon}>◉</Text></Pressable>}
      </View>
    </View>
  );
}

export function SectionTitle({ children, action, onAction }: { children: React.ReactNode; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.titleLine} />
      <Text style={styles.sectionTitle}>{children}</Text>
      <View style={styles.sectionRule} />
      {action && <Pressable onPress={onAction}><Text style={styles.action}>{action}</Text></Pressable>}
    </View>
  );
}

export function AnimePosterCard({ title, image, subtitle, onPress, width = 118 }: { title: string; image?: string | null; subtitle?: string; onPress?: () => void; width?: number }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, { width }, pressed && styles.cardPressed]}>
      <View style={[styles.posterWrap, { width, height: width * 1.43 }]}>
        {image ? <Image source={{ uri: image }} style={styles.poster} contentFit="cover" transition={180} /> : <View style={styles.posterFallback}><Text style={styles.posterFallbackText}>AV</Text></View>}
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
      {subtitle ? <Text style={styles.cardSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
    </Pressable>
  );
}

export function GlassCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.glass, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  header: { minHeight: 62, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, backgroundColor: colors.bgSurface, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerBrand: { flexDirection: 'row', alignItems: 'baseline', gap: 9 },
  logo: { color: colors.accent, fontFamily: fonts.display, fontSize: 17, letterSpacing: 1.4 },
  headerTitle: { color: colors.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 13 },
  headerActions: { flexDirection: 'row', gap: 7 },
  iconButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  icon: { color: colors.textPrimary, fontSize: 22 },
  sectionHeader: { paddingHorizontal: 16, marginTop: 22, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleLine: { width: 3, height: 18, borderRadius: 2, backgroundColor: colors.accent },
  sectionTitle: { color: colors.accent, fontFamily: fonts.displayMedium, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase' },
  sectionRule: { flex: 1, height: 1, backgroundColor: colors.border },
  action: { color: colors.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 11 },
  card: { marginRight: 12 },
  cardPressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  posterWrap: { overflow: 'hidden', borderRadius: radius.md, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  poster: { width: '100%', height: '100%' },
  posterFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCard },
  posterFallbackText: { color: colors.accent, fontFamily: fonts.display, fontSize: 22 },
  cardTitle: { color: colors.textPrimary, fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 16, marginTop: 7 },
  cardSubtitle: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 10, marginTop: 2 },
  glass: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
});
