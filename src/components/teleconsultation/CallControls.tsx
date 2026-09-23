import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, radii, shadow } from '@/constants/theme';

interface Props {
  micOn: boolean;
  camOn: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onEnd: () => void;
  onEscalate?: () => void;
  isDoctor: boolean;
}

export const CallControls = ({
  micOn, camOn, onToggleMic, onToggleCam, onEnd, onEscalate, isDoctor,
}: Props) => {
  const btn = (active: boolean, label: string, onPress: () => void, danger = false) => (
    <Pressable
      onPress={onPress}
      style={[styles.btn, active && styles.btnOn, danger && styles.btnDanger]}
    >
      <Text style={[styles.btnText, danger && { color: '#fff' }]}>
        {label}
      </Text>
    </Pressable>
  );
  return (
    <View style={styles.row}>
      {btn(micOn, micOn ? '🎙️ Mic' : '🚫 Mic', onToggleMic)}
      {btn(camOn, camOn ? '📷 Cam' : '🚫 Cam', onToggleCam)}
      {isDoctor && onEscalate ? btn(false, '🚨 Escalate', onEscalate) : null}
      {btn(false, 'End', onEnd, true)}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-around', padding: 12, backgroundColor: colors.card, borderRadius: radii.lg, ...shadow.card },
  btn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: radii.md,
    backgroundColor: colors.grey,
  },
  btnOn: { backgroundColor: colors.successBg },
  btnDanger: { backgroundColor: colors.red },
  btnText: { color: colors.ink, fontWeight: '600' },
});
