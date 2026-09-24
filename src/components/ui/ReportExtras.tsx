import React, { useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, radii } from '@/constants/theme';
import { Card } from './Atoms';
import { Input } from './Input';
import { Icon } from './Icon';

/* ---------- Photo (optional) ---------- */
export function PhotoInput({
  uri,
  onChange,
}: {
  uri: string | null;
  onChange: (uri: string | null, base64?: string | null) => void;
}) {
  const pick = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.3, allowsEditing: true, aspect: [4, 3], base64: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.3, allowsEditing: true, aspect: [4, 3], base64: true });
    if (!result.canceled && result.assets?.[0]?.uri) {
      onChange(result.assets[0].uri, result.assets[0].base64 || null);
    }
  };

  if (uri) {
    return (
      <Card style={styles.photoWrap}>
        <Image source={{ uri }} style={styles.photo} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <Pressable style={styles.smallBtn} onPress={() => pick(false)}>
            <Text style={styles.smallBtnText}>Replace</Text>
          </Pressable>
          <Pressable style={[styles.smallBtn, styles.smallBtnDanger]} onPress={() => onChange(null, null)}>
            <Text style={[styles.smallBtnText, { color: colors.red }]}>Remove</Text>
          </Pressable>
        </View>
      </Card>
    );
  }

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Pressable style={styles.addBtn} onPress={() => pick(true)}>
        <Icon name="camera" size={18} color={colors.inkSoft} />
        <Text style={styles.addBtnText}>Camera</Text>
      </Pressable>
      <Pressable style={styles.addBtn} onPress={() => pick(false)}>
        <Icon name="pin" size={18} color={colors.inkSoft} />
        <Text style={styles.addBtnText}>Gallery</Text>
      </Pressable>
    </View>
  );
}

/* ---------- Voice (optional) ---------- */
type VoiceState = 'idle' | 'recording';

export function VoiceInput({
  transcript,
  onChangeTranscript,
}: {
  transcript: string | null;
  onChangeTranscript: (t: string | null) => void;
}) {
  const [state, setState] = useState<VoiceState>('idle');
  const [editing, setEditing] = useState(false);
  const recognizerRef = React.useRef<any>(null);

  const toggleRecord = () => {
    if (state === 'idle') {
      setState('recording');

      if (typeof window !== 'undefined') {
        const SpeechRecognition =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (SpeechRecognition) {
          try {
            const rec = new SpeechRecognition();
            rec.continuous = true;
            rec.interimResults = true;
            rec.lang = 'en-IN';

            rec.onresult = (event: any) => {
              let full = '';
              for (let i = 0; i < event.results.length; i++) {
                full += event.results[i][0].transcript;
              }
              if (full.trim()) {
                onChangeTranscript(full.trim());
              }
            };

            rec.onerror = () => {
              setState('idle');
            };

            rec.onend = () => {
              setState('idle');
            };

            rec.start();
            recognizerRef.current = rec;
            return;
          } catch {}
        }
      }
    } else {
      setState('idle');
      if (recognizerRef.current) {
        try {
          recognizerRef.current.stop();
        } catch {}
        recognizerRef.current = null;
      }
      if (!transcript) {
        setEditing(true);
      }
    }
  };

  return (
    <View>
      <Pressable
        style={[styles.micBtn, state === 'recording' && styles.micBtnActive]}
        onPress={toggleRecord}
      >
        <Icon name="mic" size={18} color={state === 'recording' ? '#fff' : colors.red} />
        <Text style={[styles.micBtnText, state === 'recording' && { color: '#fff' }]}>
          {state === 'recording' ? 'Listening… Tap when done' : transcript ? 'Re-record Voice Note' : 'Tap to speak / record'}
        </Text>
      </Pressable>
      {transcript || editing ? (
        <Card style={{ padding: 12, marginTop: 10 }}>
          <Text style={styles.transcriptLabel}>VOICE TRANSCRIPT</Text>
          {editing ? (
            <Input
              multiline
              value={transcript || ''}
              placeholder="Speak or type emergency details here..."
              onChangeText={onChangeTranscript}
              style={{ marginTop: 6 }}
            />
          ) : (
            <Text style={styles.transcriptText}>{transcript}</Text>
          )}
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 8 }}>
            <Pressable onPress={() => setEditing((e) => !e)}>
              <Text style={styles.linkText}>{editing ? 'Done' : 'Edit transcript'}</Text>
            </Pressable>
            <Pressable onPress={() => { onChangeTranscript(null); setEditing(false); }}>
              <Text style={[styles.linkText, { color: colors.red }]}>Remove</Text>
            </Pressable>
          </View>
        </Card>
      ) : null}
    </View>
  );
}

/* ---------- Golden Hour ID + Trust Score ---------- */
export function IdentitySafetyCard({
  goldenHourId,
  trustScore,
}: {
  goldenHourId: string | null;
  trustScore: number | null;
}) {
  return (
    <Card style={{ padding: 16 }}>
      <Text style={styles.sectionEyebrow}>IDENTITY & SAFETY</Text>
      <View style={styles.idRow}>
        <Icon name="idCard" color={colors.red} />
        <View style={{ flex: 1 }}>
          <Text style={styles.idLabel}>Golden Hour ID</Text>
          <Text style={styles.idValue}>
            {goldenHourId ?? 'Will be assigned after secure login'}
          </Text>
        </View>
      </View>
      <View style={[styles.idRow, { marginTop: 12 }]}>
        <Icon name="check" color={colors.success} />
        <View style={{ flex: 1 }}>
          <Text style={styles.idLabel}>Trust Score</Text>
          <Text style={styles.idValue}>{trustScore != null ? `${trustScore} / 100` : 'Not calculated yet'}</Text>
        </View>
      </View>
      <Text style={styles.idExplainer}>
        Your Trust Score is calculated from verified emergency activity and confirmations.
      </Text>
    </Card>
  );
}

/* ---------- Multi-user (community) confirmation ---------- */
export function CommunityConfirmation({
  count,
  confirmed,
  onConfirm,
}: {
  count: number;
  confirmed: boolean;
  onConfirm: () => void;
}) {
  return (
    <Card style={{ padding: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Icon name="users" color={colors.blue} />
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionEyebrow}>COMMUNITY CONFIRMATION</Text>
          <Text style={styles.confirmCount}>
            {count > 0 ? `${count} people confirmed this incident` : 'No confirmations yet'}
          </Text>
        </View>
      </View>
      <Pressable
        style={[styles.confirmBtn, confirmed && styles.confirmBtnDone]}
        onPress={onConfirm}
        disabled={confirmed}
      >
        <Text style={[styles.confirmBtnText, confirmed && { color: colors.success }]}>
          {confirmed ? 'You confirmed this incident' : 'Confirm Incident'}
        </Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  addBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.line, borderStyle: 'dashed', borderRadius: radii.md, paddingVertical: 16, alignItems: 'center', gap: 6, backgroundColor: '#fff' },
  addBtnText: { fontSize: 11.5, fontWeight: '700', color: colors.inkSoft },
  photoWrap: { padding: 10 },
  photo: { width: '100%', height: 160, borderRadius: radii.md, backgroundColor: colors.grey },
  smallBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.line, borderRadius: radii.md, paddingVertical: 10, alignItems: 'center', backgroundColor: '#fff' },
  smallBtnDanger: { borderColor: '#F6C9C9' },
  smallBtnText: { fontSize: 12, fontWeight: '700', color: colors.ink },
  micBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: colors.red, borderRadius: radii.md, paddingVertical: 13, backgroundColor: '#fff' },
  micBtnActive: { backgroundColor: colors.red },
  micBtnText: { fontSize: 12.5, fontWeight: '700', color: colors.red },
  transcriptLabel: { fontSize: 9.5, fontWeight: '700', color: colors.inkFaint, letterSpacing: 0.5 },
  transcriptText: { fontSize: 12.5, color: colors.inkSoft, marginTop: 6, lineHeight: 18 },
  linkText: { fontSize: 11.5, fontWeight: '700', color: colors.blue },
  sectionEyebrow: { fontSize: 10.5, fontWeight: '700', color: colors.inkFaint, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  idLabel: { fontSize: 11, color: colors.inkFaint, fontWeight: '600' },
  idValue: { fontSize: 14, fontWeight: '700', color: colors.ink, marginTop: 2 },
  idExplainer: { fontSize: 10.5, color: colors.inkFaint, marginTop: 12, lineHeight: 15 },
  confirmCount: { fontSize: 12.5, fontWeight: '700', color: colors.ink, marginTop: 2 },
  confirmBtn: { marginTop: 12, borderWidth: 1.5, borderColor: colors.blue, borderRadius: radii.md, paddingVertical: 11, alignItems: 'center' },
  confirmBtnDone: { borderColor: colors.successBg, backgroundColor: colors.successBg },
  confirmBtnText: { fontSize: 12.5, fontWeight: '700', color: colors.blue },
});
