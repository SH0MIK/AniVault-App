import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, Alert, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { checkUsername, updateUsername, updateEmail, updateSettings, deleteAccount, getListSyncStatus, listSyncAction, getListSyncConnectUrl, ListSyncStatus } from '../api/settings';
import { useAuth } from '../auth/AuthContext';
import { colors, radius, fonts } from '../theme';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

export default function AccountSettingsScreen() {
  const { user, logout } = useAuth();

  const [username, setUsername] = useState(user?.username ?? '');
  const [usernameStatus, setUsernameStatus] = useState<string | null>(null);
  const [email, setEmail] = useState(user?.email ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [syncStatus, setSyncStatus] = useState<ListSyncStatus | null>(null);

  const loadSyncStatus = useCallback(() => {
    getListSyncStatus().then(setSyncStatus).catch(() => {});
  }, []);
  useFocusEffect(loadSyncStatus);

  const flash = (text: string, ok: boolean) => setMessage({ text, ok });

  const onCheckUsername = async () => {
    if (!username.trim() || username.trim() === user?.username) return setUsernameStatus(null);
    try {
      const res = await checkUsername(username.trim());
      setUsernameStatus(res.available ? 'Available' : (res.message ?? 'Not available'));
    } catch {
      setUsernameStatus(null);
    }
  };

  const onSaveUsername = async () => {
    setSaving('username');
    try {
      const res = await updateUsername(username.trim());
      flash(res.message ?? (res.success ? 'Username updated.' : 'Failed to update username.'), res.success);
    } catch (err: any) {
      flash(err.message ?? 'Failed to update username.', false);
    } finally {
      setSaving(null);
    }
  };

  const onSaveEmail = async () => {
    setSaving('email');
    try {
      const res = await updateEmail(email.trim());
      flash(res.message ?? (res.success ? 'Email updated.' : 'Failed to update email.'), res.success);
    } catch (err: any) {
      flash(err.message ?? 'Failed to update email.', false);
    } finally {
      setSaving(null);
    }
  };

  const onSaveBio = async () => {
    setSaving('bio');
    try {
      const res = await updateSettings({ bio });
      flash(res.message ?? (res.success ? 'Bio updated.' : 'Failed to update bio.'), res.success);
    } catch (err: any) {
      flash(err.message ?? 'Failed to update bio.', false);
    } finally {
      setSaving(null);
    }
  };

  const onSavePassword = async () => {
    if (!newPassword) return;
    setSaving('password');
    try {
      const res = await updateSettings({ new_password: newPassword });
      flash(res.message ?? (res.success ? 'Password updated.' : 'Failed to update password.'), res.success);
      if (res.success) setNewPassword('');
    } catch (err: any) {
      flash(err.message ?? 'Failed to update password.', false);
    } finally {
      setSaving(null);
    }
  };

  const onConnect = async (provider: 'mal' | 'anilist') => {
    const url = await getListSyncConnectUrl(provider);
    Linking.openURL(url).catch(() => flash('Could not open browser.', false));
  };

  const onSyncAction = async (action: 'mal_sync_now' | 'mal_disconnect' | 'anilist_sync_now' | 'anilist_disconnect') => {
    setSaving(action);
    try {
      const res = await listSyncAction(action);
      flash(res.message, res.success);
      loadSyncStatus();
    } catch (err: any) {
      flash(err.message ?? 'Action failed.', false);
    } finally {
      setSaving(null);
    }
  };

  const onDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This deactivates your account immediately and logs you out. This cannot be undone from the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              const res = await deleteAccount();
              if (res.success) { await logout(); } else { flash(res.message ?? 'Failed to delete account.', false); }
            } catch (err: any) {
              flash(err.message ?? 'Failed to delete account.', false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {message && (
        <View style={[styles.banner, { borderColor: message.ok ? colors.teal : colors.accent }]}>
          <Text style={[styles.bannerText, { color: message.ok ? colors.teal : colors.accent }]}>{message.text}</Text>
        </View>
      )}

      <Field label="Username">
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={(v) => { setUsername(v); setUsernameStatus(null); }}
          onEndEditing={onCheckUsername}
          autoCapitalize="none"
          placeholderTextColor={colors.textMuted}
        />
        {usernameStatus && <Text style={styles.hint}>{usernameStatus}</Text>}
        <Pressable style={styles.saveBtn} onPress={onSaveUsername} disabled={saving === 'username'}>
          {saving === 'username' ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Username</Text>}
        </Pressable>
      </Field>

      <Field label="Email">
        <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholderTextColor={colors.textMuted} />
        <Pressable style={styles.saveBtn} onPress={onSaveEmail} disabled={saving === 'email'}>
          {saving === 'email' ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Email</Text>}
        </Pressable>
      </Field>

      <Field label="Bio">
        <TextInput style={[styles.input, styles.textArea]} value={bio} onChangeText={setBio} multiline maxLength={500} placeholderTextColor={colors.textMuted} />
        <Pressable style={styles.saveBtn} onPress={onSaveBio} disabled={saving === 'bio'}>
          {saving === 'bio' ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Bio</Text>}
        </Pressable>
      </Field>

      <Field label="New Password">
        <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="Leave blank to keep current password" placeholderTextColor={colors.textMuted} />
        <Pressable style={styles.saveBtn} onPress={onSavePassword} disabled={saving === 'password' || !newPassword}>
          {saving === 'password' ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Update Password</Text>}
        </Pressable>
      </Field>

      <Field label="MyAnimeList Sync">
        {syncStatus?.mal.connected ? (
          <>
            <Text style={styles.hint}>Connected as {syncStatus.mal.username ?? '—'}</Text>
            <View style={styles.rowBtns}>
              <Pressable style={styles.smallBtn} onPress={() => onSyncAction('mal_sync_now')} disabled={saving === 'mal_sync_now'}>
                {saving === 'mal_sync_now' ? <ActivityIndicator color={colors.textPrimary} /> : <Text style={styles.smallBtnText}>Sync Now</Text>}
              </Pressable>
              <Pressable style={styles.smallBtn} onPress={() => onSyncAction('mal_disconnect')} disabled={saving === 'mal_disconnect'}>
                <Text style={styles.smallBtnText}>Disconnect</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Pressable style={styles.smallBtn} onPress={() => onConnect('mal')}>
            <Text style={styles.smallBtnText}>Connect MyAnimeList</Text>
          </Pressable>
        )}
      </Field>

      <Field label="AniList Sync">
        {syncStatus?.anilist.connected ? (
          <>
            <Text style={styles.hint}>Connected as {syncStatus.anilist.username ?? '—'}</Text>
            <View style={styles.rowBtns}>
              <Pressable style={styles.smallBtn} onPress={() => onSyncAction('anilist_sync_now')} disabled={saving === 'anilist_sync_now'}>
                {saving === 'anilist_sync_now' ? <ActivityIndicator color={colors.textPrimary} /> : <Text style={styles.smallBtnText}>Sync Now</Text>}
              </Pressable>
              <Pressable style={styles.smallBtn} onPress={() => onSyncAction('anilist_disconnect')} disabled={saving === 'anilist_disconnect'}>
                <Text style={styles.smallBtnText}>Disconnect</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Pressable style={styles.smallBtn} onPress={() => onConnect('anilist')}>
            <Text style={styles.smallBtnText}>Connect AniList</Text>
          </Pressable>
        )}
      </Field>

      <Pressable style={styles.deleteBtn} onPress={onDeleteAccount}>
        <Text style={styles.deleteBtnText}>Delete Account</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  banner: { borderWidth: 1, borderRadius: radius.md, padding: 10, marginBottom: 16 },
  bannerText: { fontSize: 13, fontFamily: fonts.body },
  field: { marginBottom: 22 },
  fieldLabel: { color: colors.textSecondary, fontSize: 13, fontFamily: fonts.bodyMedium, marginBottom: 6 },
  input: {
    backgroundColor: colors.bgCard, color: colors.textPrimary, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: fonts.body,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  hint: { color: colors.textMuted, fontSize: 11, marginTop: 4, fontFamily: fonts.body },
  saveBtn: { backgroundColor: colors.accent, borderRadius: radius.sm, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontFamily: fonts.bodySemibold, fontSize: 13 },
  rowBtns: { flexDirection: 'row', gap: 8, marginTop: 6 },
  smallBtn: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard, borderRadius: radius.sm, paddingVertical: 9, paddingHorizontal: 14, alignItems: 'center' },
  smallBtnText: { color: colors.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 12 },
  deleteBtn: { borderWidth: 1, borderColor: colors.accent, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', marginTop: 12, marginBottom: 40 },
  deleteBtnText: { color: colors.accent, fontFamily: fonts.bodyMedium, fontSize: 14 },
});
