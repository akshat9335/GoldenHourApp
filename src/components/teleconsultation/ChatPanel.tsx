import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet } from 'react-native';
import { colors, radii, shadow } from '@/constants/theme';
import {
  subscribeMessages, sendMessage, clearMessages, type ChatMessage,
} from '@/services/teleconsultation';

interface Props {
  consultationId: string;
  selfId: string;
  selfRole: 'patient' | 'doctor';
}

export const ChatPanel = ({ consultationId, selfId, selfRole }: Props) => {
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const unsub = subscribeMessages(consultationId, setMsgs);
    return unsub;
  }, [consultationId]);

  const onSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed || isSending) return;
    setIsSending(true);
    setDraft('');
    try {
      await sendMessage(consultationId, {
        senderId: selfId, senderRole: selfRole, message: trimmed,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleClear = () => {
    clearMessages(consultationId).catch(() => {});
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Consultation Chat</Text>
        <Pressable onPress={handleClear} style={styles.clearBtn} hitSlop={8}>
          <Text style={styles.clearText}>Clear / Fresh Chat</Text>
        </Pressable>
      </View>
      <FlatList
        data={msgs}
        keyExtractor={(m) => m.id}
        style={styles.list}
        contentContainerStyle={{ padding: 8 }}
        renderItem={({ item }) => {
          const own = item.senderId === selfId || item.senderRole === selfRole;
          return (
            <View style={[styles.bubble, own ? styles.bubbleOwn : styles.bubbleOther]}>
              <Text style={[styles.bubbleText, own && { color: '#fff' }]}>
                {item.message}
              </Text>
              <Text style={[styles.bubbleMeta, own && { color: '#fff' }]}>
                {item.senderRole}{' '}·{' '}{new Date(item.createdAt).toLocaleTimeString()}
              </Text>
            </View>
          );
        }}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type a message…"
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={onSend}
        />
        <Pressable onPress={onSend} style={[styles.sendBtn, isSending && { opacity: 0.6 }]} disabled={isSending}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.card, borderRadius: radii.lg, ...shadow.card, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.line },
  title: { fontWeight: '700', color: colors.ink, fontSize: 13.5 },
  clearBtn: { backgroundColor: '#f3f4f6', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  clearText: { fontSize: 11, color: colors.inkFaint, fontWeight: '600' },
  list: { flex: 1 },
  bubble: { maxWidth: '80%', padding: 10, borderRadius: radii.md, marginVertical: 4 },
  bubbleOwn: { alignSelf: 'flex-end', backgroundColor: colors.blue },
  bubbleOther: { alignSelf: 'flex-start', backgroundColor: colors.grey },
  bubbleText: { color: colors.ink },
  bubbleMeta: { fontSize: 10, color: colors.inkFaint, marginTop: 4 },
  inputRow: { flexDirection: 'row', padding: 8, borderTopWidth: 1, borderColor: colors.line },
  input: { flex: 1, backgroundColor: colors.bg, borderRadius: radii.md, paddingHorizontal: 12, paddingVertical: 8, color: colors.ink },
  sendBtn: { backgroundColor: colors.blue, paddingHorizontal: 16, justifyContent: 'center', borderRadius: radii.md, marginLeft: 8 },
});
