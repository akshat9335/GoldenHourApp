import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet } from 'react-native';
import { colors, radii, shadow } from '@/constants/theme';
import {
  subscribeMessages, sendMessage, type ChatMessage,
} from '@/services/teleconsultation';

interface Props {
  consultationId: string;
  selfId: string;
  selfRole: 'patient' | 'doctor';
}

export const ChatPanel = ({ consultationId, selfId, selfRole }: Props) => {
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const unsub = subscribeMessages(consultationId, setMsgs);
    return unsub;
  }, [consultationId]);

  const onSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setDraft('');
    await sendMessage(consultationId, {
      senderId: selfId, senderRole: selfRole, message: trimmed,
    });
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Consultation Chat</Text>
      <FlatList
        data={msgs}
        keyExtractor={(m) => m.id}
        style={styles.list}
        contentContainerStyle={{ padding: 8 }}
        renderItem={({ item }) => {
          const own = item.senderId === selfId;
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
        />
        <Pressable onPress={onSend} style={styles.sendBtn}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.card, borderRadius: radii.lg, ...shadow.card, overflow: 'hidden' },
  title: { padding: 12, fontWeight: '700', color: colors.ink, borderBottomWidth: 1, borderColor: colors.line },
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
