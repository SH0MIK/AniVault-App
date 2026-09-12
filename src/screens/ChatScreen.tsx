import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  getChatMessages, pollChatMessages, sendChatMessage, deleteChatMessage, reactToChatMessage,
  pingTyping, pingActive, getPresence, unescapeHtml, CHAT_REACTION_EMOJIS, ChatMessage,
} from '../api/chat';
import { colors, radius, fonts } from '../theme';

const POLL_INTERVAL_MS = 3000;
const PRESENCE_INTERVAL_MS = 8000;

export default function ChatScreen() {
  const navigation = useNavigation<any>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [online, setOnline] = useState(0);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [reactingId, setReactingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const latestIdRef = useRef(0);
  const listRef = useRef<FlatList>(null);
  const isFocused = useRef(true);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getChatMessages();
      setMessages(res.messages);
      latestIdRef.current = res.latest_id;
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    isFocused.current = true;
    loadInitial();
    pingActive().catch(() => {});
    return () => { isFocused.current = false; };
  }, [loadInitial]));

  // Poll for new messages + presence while this screen is focused. A
  // plain interval rather than a persistent connection, matching the
  // website's own polling-based chat implementation exactly.
  useEffect(() => {
    const pollTimer = setInterval(async () => {
      if (!isFocused.current) return;
      try {
        const res = await pollChatMessages(latestIdRef.current);
        if (res.messages.length > 0) {
          setMessages((prev) => [...prev, ...res.messages]);
          latestIdRef.current = res.latest_id;
        }
      } catch { /* transient network error — retried next tick */ }
    }, POLL_INTERVAL_MS);

    const presenceTimer = setInterval(async () => {
      if (!isFocused.current) return;
      try {
        const res = await getPresence();
        setOnline(res.online);
        setTypingUsers(res.typing);
        pingActive().catch(() => {});
      } catch { /* ignore */ }
    }, PRESENCE_INTERVAL_MS);

    return () => { clearInterval(pollTimer); clearInterval(presenceTimer); };
  }, []);

  const onChangeText = (v: string) => {
    setText(v);
    if (v.trim()) pingTyping().catch(() => {});
  };

  const onSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    const wasReplyTo = replyTo;
    setReplyTo(null);
    try {
      const res = await sendChatMessage(trimmed, wasReplyTo?.id);
      if (res.success && res.message) {
        setMessages((prev) => [...prev, res.message!]);
        latestIdRef.current = res.message.id;
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
      }
    } catch { /* message stays lost from input on failure — acceptable for chat */ }
  };

  const onReact = async (messageId: number, emoji: string) => {
    setReactingId(messageId);
    try {
      const res = await reactToChatMessage(messageId, emoji);
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions: res.reactions } : m)));
    } finally {
      setReactingId(null);
    }
  };

  const onDelete = (id: number) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    deleteChatMessage(id).catch(() => {});
  };

  if (loading && messages.length === 0) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <View style={styles.presenceBar}>
        <Text style={styles.presenceText}>{online} online</Text>
        {typingUsers.length > 0 && <Text style={styles.typingText}>{typingUsers.join(', ')} typing…</Text>}
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ padding: 12 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => (
          <View style={[styles.msgRow, item.mine && styles.msgRowMine]}>
            <Pressable onPress={() => navigation.navigate('UserProfile', { username: item.username })}>
              <Image source={{ uri: item.avatar_url ?? undefined }} style={styles.avatar} contentFit="cover" />
            </Pressable>
            <View style={[styles.bubble, item.mine && styles.bubbleMine]}>
              <View style={styles.bubbleHeader}>
                <Text style={styles.username}>{unescapeHtml(item.username)}</Text>
                {item.avatar_badge && <View style={styles.badgePill}><Text style={styles.badgePillText}>{item.avatar_badge}</Text></View>}
                <Text style={styles.time}>{item.time}</Text>
              </View>
              {item.reply_to && (
                <View style={styles.replyPreview}>
                  <Text style={styles.replyText} numberOfLines={1}>
                    {item.reply_to.username ? `${unescapeHtml(item.reply_to.username)}: ${unescapeHtml(item.reply_to.message ?? '')}` : 'Message deleted'}
                  </Text>
                </View>
              )}
              <Text style={styles.messageText}>{unescapeHtml(item.message)}</Text>

              {item.reactions.length > 0 && (
                <View style={styles.reactionRow}>
                  {item.reactions.map((r) => (
                    <Pressable key={r.emoji} style={[styles.reactionChip, r.mine && styles.reactionChipMine]} onPress={() => onReact(item.id, r.emoji)}>
                      <Text style={styles.reactionText}>{r.emoji} {r.count}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <View style={styles.actionsRow}>
                {CHAT_REACTION_EMOJIS.slice(0, 3).map((emoji) => (
                  <Pressable key={emoji} onPress={() => onReact(item.id, emoji)} disabled={reactingId === item.id} hitSlop={4}>
                    <Text style={styles.actionEmoji}>{emoji}</Text>
                  </Pressable>
                ))}
                <Pressable onPress={() => setReplyTo(item)} hitSlop={4}><Text style={styles.actionText}>Reply</Text></Pressable>
                {item.can_delete && <Pressable onPress={() => onDelete(item.id)} hitSlop={4}><Text style={styles.actionText}>Delete</Text></Pressable>}
              </View>
            </View>
          </View>
        )}
      />

      {replyTo && (
        <View style={styles.replyingBar}>
          <Text style={styles.replyingText} numberOfLines={1}>Replying to {unescapeHtml(replyTo.username)}: {unescapeHtml(replyTo.message)}</Text>
          <Pressable onPress={() => setReplyTo(null)}><Text style={styles.replyingCancel}>✕</Text></Pressable>
        </View>
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={onChangeText}
          placeholder="Message..."
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={500}
        />
        <Pressable style={styles.sendBtn} onPress={onSend} disabled={!text.trim()}>
          <Text style={styles.sendBtnText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  center: { flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center' },
  presenceBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  presenceText: { color: colors.teal, fontSize: 11, fontFamily: fonts.body },
  typingText: { color: colors.textMuted, fontSize: 11, fontFamily: fonts.body, fontStyle: 'italic' },
  msgRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  msgRowMine: { flexDirection: 'row-reverse' },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.bgCard },
  bubble: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: 10, maxWidth: '78%' },
  bubbleMine: { backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.borderAccent },
  bubbleHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  username: { color: colors.textPrimary, fontSize: 12, fontFamily: fonts.bodySemibold },
  badgePill: { backgroundColor: colors.accent, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  badgePillText: { color: '#fff', fontSize: 8, fontFamily: fonts.bodyBold },
  time: { color: colors.textMuted, fontSize: 10, fontFamily: fonts.body, marginLeft: 'auto' },
  replyPreview: { borderLeftWidth: 2, borderLeftColor: colors.accent, paddingLeft: 6, marginTop: 4, marginBottom: 2 },
  replyText: { color: colors.textMuted, fontSize: 11, fontFamily: fonts.body },
  messageText: { color: colors.textSecondary, fontSize: 13, marginTop: 3, fontFamily: fonts.body },
  reactionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  reactionChip: { backgroundColor: colors.bgHover, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  reactionChipMine: { borderWidth: 1, borderColor: colors.accent },
  reactionText: { fontSize: 11, color: colors.textSecondary },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  actionEmoji: { fontSize: 13 },
  actionText: { color: colors.textMuted, fontSize: 11, fontFamily: fonts.body },
  replyingBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSurface, paddingHorizontal: 12, paddingVertical: 6, gap: 8 },
  replyingText: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.body, flex: 1 },
  replyingCancel: { color: colors.textMuted, fontSize: 14 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: colors.border },
  input: {
    flex: 1, backgroundColor: colors.bgCard, color: colors.textPrimary, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, fontFamily: fonts.body, maxHeight: 100,
  },
  sendBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 10 },
  sendBtnText: { color: '#fff', fontFamily: fonts.bodySemibold, fontSize: 13 },
});
